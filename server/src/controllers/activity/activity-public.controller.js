import prisma from "../../prisma.js";
import { isValidPointGroup } from "../../utils/points.js";
import { summarizeFaceProfile } from "../../utils/face.js";
import {
  ACTIVITY_INCLUDE,
  REGISTRATION_INCLUDE,
  mapActivity,
  buildActivityResponse,
  sanitizeOptionalText,
} from "../../utils/activity/index.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const listActivities = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.sub;
  const userRole = req.user?.role;

  const { limit, sort, search, pointGroup } = req.query || {};
  const take = limit ? parseInt(limit, 10) : undefined;
  let orderBy = [{ batDauLuc: "asc" }, { tieuDe: "asc" }];

  if (sort === "createdAt:desc") {
    orderBy = [{ createdAt: "desc" }];
  } else if (sort === "updatedAt:desc") {
    orderBy = [{ updatedAt: "desc" }];
  }

  const searchTerm = sanitizeOptionalText(search, 100);
  const normalizedPointGroup = isValidPointGroup(pointGroup)
    ? pointGroup
    : undefined;

  // Xây dựng điều kiện lọc cơ bản với tìm kiếm và nhóm điểm
  const baseFilters = {
    ...(normalizedPointGroup ? { nhomDiem: normalizedPointGroup } : {}),
    ...(searchTerm
      ? {
          OR: [
            { tieuDe: { contains: searchTerm, mode: "insensitive" } },
            { diaDiem: { contains: searchTerm, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Áp dụng lọc theo vai trò người dùng
  let where;
  if (userRole === "ADMIN") {
    // Admin có thể xem tất cả hoạt động
    where = baseFilters;
  } else if (userRole === "GIANGVIEN") {
    // Giảng viên chỉ xem hoạt động do mình tạo (bao gồm cả đang chờ duyệt)
    where = {
      ...baseFilters,
      nguoiTaoId: currentUserId,
    };
  } else {
    // Sinh viên và người dùng công khai chỉ xem hoạt động đã công bố và được duyệt
    where = {
      ...baseFilters,
      isPublished: true,
      trangThaiDuyet: "DA_DUYET",
    };
  }

  const activities = await prisma.hoatDong.findMany({
    where,
    orderBy,
    take,
    include: ACTIVITY_INCLUDE,
  });

  let registrationMap = new Map();
  let faceProfileSummary = null;
  if (currentUserId && activities.length) {
    const [registrations, faceProfile] = await Promise.all([
      prisma.dangKyHoatDong.findMany({
        where: {
          nguoiDungId: currentUserId,
          hoatDongId: { in: activities.map((activity) => activity.id) },
        },
        include: REGISTRATION_INCLUDE,
      }),
      userRole !== "ADMIN"
        ? prisma.faceProfile.findUnique({
            where: { nguoiDungId: currentUserId },
          })
        : Promise.resolve(null),
    ]);
    registrationMap = new Map(
      registrations.map((registration) => [
        registration.hoatDongId,
        registration,
      ]),
    );
    faceProfileSummary = summarizeFaceProfile(faceProfile);
  }

  res.json({
    activities: activities.map((activity) =>
      mapActivity(activity, registrationMap.get(activity.id), {
        faceEnrollment: faceProfileSummary,
      }),
    ),
  });
});

export const getActivity = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.sub;
  const activity = await buildActivityResponse(req.params.id, currentUserId);
  if (!activity)
    return res.status(404).json({ error: "Hoạt động không tồn tại" });
  res.json({ activity });
});
