import prisma from "../../prisma.js";
import { notifyUser } from "../../utils/notification.service.js";
import { summarizeFaceProfile } from "../../utils/face.js";
import {
  ACTIVITY_INCLUDE,
  ACTIVE_REG_STATUSES,
  ADMIN_REGISTRATION_INCLUDE,
  ADMIN_STATUS_MAP,
  assertAdmin,
  buildActivityResponse,
  buildRegistrationSearchCondition,
  formatDateRange,
  mapActivity,
  mapActivitySummaryForRegistration,
  mapRegistration,
  normalizePageNumber,
  normalizePageSize,
  REGISTRATION_INCLUDE,
  REGISTRATION_STATUSES,
  sanitizeOptionalText,
  sanitizeStatusFilter,
} from "../../utils/activity.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

/**
 * Lấy danh sách đăng ký của một hoạt động (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const listActivityRegistrationsAdmin = asyncHandler(async (req, res) => {
  assertAdmin(req);

  const { id: activityId } = req.params;

  const activity = await prisma.hoatDong.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      tieuDe: true,
      diemCong: true,
      nhomDiem: true,
      batDauLuc: true,
      ketThucLuc: true,
      diaDiem: true,
      phuongThucDiemDanh: true,
    },
  });

  if (!activity) {
    return res.status(404).json({ error: "Hoạt động không tồn tại" });
  }

  const registrations = await prisma.dangKyHoatDong.findMany({
    where: { hoatDongId: activityId },
    include: ADMIN_REGISTRATION_INCLUDE,
    orderBy: [{ dangKyLuc: "asc" }],
  });

  const activitySummary = mapActivitySummaryForRegistration(activity);

  res.json({
    activity: activitySummary,
    registrations: registrations.map((registration) => ({
      ...mapRegistration(registration, activity),
      activity: activitySummary,
    })),
  });
});

/**
 * Lấy danh sách tất cả đăng ký với bộ lọc (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const listRegistrationsAdmin = asyncHandler(async (req, res) => {
  assertAdmin(req);

  const { status, faculty, className, activityId, search, page, pageSize } =
    req.query || {};

  const normalizedStatusKey =
    typeof status === "string" && status !== "all"
      ? status.toLowerCase()
      : undefined;
  const normalizedStatus = normalizedStatusKey
    ? ADMIN_STATUS_MAP[normalizedStatusKey]
    : undefined;
  const normalizedFaculty = sanitizeOptionalText(faculty, 100);
  const normalizedClassName = sanitizeOptionalText(className, 100);
  const normalizedActivityId =
    typeof activityId === "string" && activityId.trim()
      ? activityId.trim()
      : undefined;
  const searchTerm = sanitizeOptionalText(search, 100);

  const currentPage = normalizePageNumber(page);
  const take = normalizePageSize(pageSize);
  const skip = (currentPage - 1) * take;

  const conditions = [];

  if (normalizedStatus) {
    conditions.push({ trangThai: normalizedStatus });
  }

  if (normalizedActivityId) {
    conditions.push({ hoatDongId: normalizedActivityId });
  }

  if (normalizedFaculty) {
    conditions.push({
      nguoiDung: {
        OR: [
          { khoa: { maKhoa: normalizedFaculty } },
          { lopHoc: { nganhHoc: { khoa: { maKhoa: normalizedFaculty } } } },
        ],
      },
    });
  }

  if (normalizedClassName) {
    conditions.push({ nguoiDung: { lopHoc: { maLop: normalizedClassName } } });
  }

  const searchCondition = buildRegistrationSearchCondition(searchTerm);
  if (searchCondition) {
    conditions.push(searchCondition);
  }

  const where = conditions.length ? { AND: conditions } : {};

  const [registrations, total] = await Promise.all([
    prisma.dangKyHoatDong.findMany({
      where,
      include: {
        ...ADMIN_REGISTRATION_INCLUDE,
        hoatDong: ADMIN_REGISTRATION_INCLUDE.hoatDong,
        nguoiDung: ADMIN_REGISTRATION_INCLUDE.nguoiDung,
      },
      orderBy: [{ dangKyLuc: "desc" }],
      skip,
      take,
    }),
    prisma.dangKyHoatDong.count({ where }),
  ]);

  const [statsGrouped, facultiesRaw, classesRaw, activitiesRaw] =
    await Promise.all([
      prisma.dangKyHoatDong.groupBy({
        by: ["trangThai"],
        _count: { id: true },
      }),
      prisma.khoa.findMany({
        where: { isActive: true },
        select: { maKhoa: true, tenKhoa: true },
        orderBy: { tenKhoa: "asc" },
      }),
      prisma.lopHoc.findMany({
        where: { sinhVien: { some: { dangKy: { some: {} } } } },
        select: { maLop: true },
        orderBy: { maLop: "asc" },
      }),
      prisma.hoatDong.findMany({
        where: { dangKy: { some: {} } },
        select: { id: true, tieuDe: true },
      }),
    ]);

  // Chuyển đổi groupBy thành stats object
  const statsMap = new Map(
    statsGrouped.map((item) => [item.trangThai, item._count.id]),
  );
  const pendingCount = statsMap.get("DANG_KY") ?? 0;
  const approvedCount = statsMap.get("DA_THAM_GIA") ?? 0;
  const rejectedCount = statsMap.get("VANG_MAT") ?? 0;
  const totalAll = statsGrouped.reduce((sum, item) => sum + item._count.id, 0);

  const sortAlpha = (a, b) => a.localeCompare(b, "vi", { sensitivity: "base" });

  const faculties = facultiesRaw
    .map((item) => ({
      label: sanitizeOptionalText(item.tenKhoa, 255) || item.maKhoa,
      value: sanitizeOptionalText(item.maKhoa, 100),
    }))
    .filter((item) => item.value);

  const classes = classesRaw
    .map((item) => sanitizeOptionalText(item.maLop, 100))
    .filter(Boolean);

  const activities = activitiesRaw
    .map((item) => ({
      id: item.id,
      title: sanitizeOptionalText(item.tieuDe, 255) || "Hoạt động",
    }))
    .sort((a, b) => sortAlpha(a.title, b.title));

  res.json({
    registrations: registrations.map((registration) => ({
      ...mapRegistration(registration, registration.hoatDong),
      activity: mapActivitySummaryForRegistration(registration.hoatDong),
    })),
    pagination: {
      page: currentPage,
      pageSize: take,
      total,
      pageCount: Math.ceil(total / take) || 0,
    },
    stats: {
      total: totalAll,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    filterOptions: {
      faculties,
      classes,
      activities,
    },
  });
});

/**
 * Lấy chi tiết một đăng ký (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getRegistrationDetailAdmin = asyncHandler(async (req, res) => {
  assertAdmin(req);

  const { id } = req.params;

  const registration = await prisma.dangKyHoatDong.findUnique({
    where: { id },
    include: {
      ...ADMIN_REGISTRATION_INCLUDE,
      hoatDong: ADMIN_REGISTRATION_INCLUDE.hoatDong,
      nguoiDung: ADMIN_REGISTRATION_INCLUDE.nguoiDung,
    },
  });

  if (!registration) {
    return res.status(404).json({ error: "Đăng ký không tồn tại" });
  }

  // Đếm số lượng đăng ký active riêng
  const participantCount = await prisma.dangKyHoatDong.count({
    where: {
      hoatDongId: registration.hoatDongId,
      trangThai: { in: ACTIVE_REG_STATUSES },
    },
  });

  res.json({
    registration: {
      ...mapRegistration(registration, registration.hoatDong),
      activity: mapActivitySummaryForRegistration(registration.hoatDong, {
        participantCount,
      }),
    },
  });
});

/**
 * Duyệt hoặc từ chối minh chứng điểm danh (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const decideRegistrationAttendance = asyncHandler(async (req, res) => {
  assertAdmin(req);

  const { id } = req.params;
  const { decision, note } = req.body || {};

  const normalizedDecision =
    typeof decision === "string" ? decision.trim().toUpperCase() : "";
  if (!["APPROVE", "REJECT"].includes(normalizedDecision)) {
    return res.status(400).json({ error: "Quyết định không hợp lệ" });
  }

  const reason = sanitizeOptionalText(note, 500);

  const registration = await prisma.dangKyHoatDong.findUnique({
    where: { id },
    include: {
      ...ADMIN_REGISTRATION_INCLUDE,
      hoatDong: ADMIN_REGISTRATION_INCLUDE.hoatDong,
      nguoiDung: ADMIN_REGISTRATION_INCLUDE.nguoiDung,
    },
  });

  if (!registration) {
    return res.status(404).json({ error: "Đăng ký không tồn tại" });
  }

  const isApproval = normalizedDecision === "APPROVE";
  const targetStatus = isApproval ? "DA_THAM_GIA" : "VANG_MAT";
  const now = new Date();

  const updateData = {
    trangThai: targetStatus,
    diemDanhBoiId: req.user?.sub || registration.diemDanhBoiId || null,
  };

  if (isApproval) {
    updateData.duyetLuc = registration.duyetLuc ?? now;
    if (!registration.diemDanhLuc) {
      updateData.diemDanhLuc = now;
    }
  } else {
    updateData.duyetLuc = null;
  }

  if (reason !== null) {
    updateData.diemDanhGhiChu = reason;
  }

  const attendanceUpdateData = {
    trangThai: targetStatus,
  };

  if (reason && !isApproval) {
    attendanceUpdateData.ghiChu = reason;
  }

  await prisma.$transaction([
    prisma.dangKyHoatDong.update({
      where: { id: registration.id },
      data: updateData,
    }),
    prisma.diemDanhNguoiDung.updateMany({
      where: { dangKyId: registration.id },
      data: attendanceUpdateData,
    }),
  ]);

  const updated = await prisma.dangKyHoatDong.findUnique({
    where: { id },
    include: {
      ...ADMIN_REGISTRATION_INCLUDE,
      hoatDong: ADMIN_REGISTRATION_INCLUDE.hoatDong,
      nguoiDung: ADMIN_REGISTRATION_INCLUDE.nguoiDung,
    },
  });

  const activity = updated?.hoatDong;
  const user = updated?.nguoiDung;

  if (activity && user) {
    const baseTitle = activity.tieuDe || "hoạt động";
    const notificationMessage = isApproval
      ? `Minh chứng điểm danh cho hoạt động "${baseTitle}" đã được duyệt.`
      : `Minh chứng điểm danh cho hoạt động "${baseTitle}" đã bị từ chối.`;
    const notificationTitle = isApproval
      ? "Minh chứng điểm danh được duyệt"
      : "Minh chứng điểm danh bị từ chối";
    const notificationType = isApproval ? "success" : "danger";
    const notificationAction = isApproval
      ? "ATTENDANCE_APPROVED"
      : "ATTENDANCE_REJECTED";
    const emailSubject = isApproval
      ? `[HUIT Social Credits] Minh chứng được duyệt - "${baseTitle}"`
      : `[HUIT Social Credits] Minh chứng bị từ chối - "${baseTitle}"`;

    const emailMessageLines = [
      notificationMessage,
      `Điểm cộng: ${activity.diemCong ?? 0}`,
      reason ? `Ghi chú từ quản trị viên: ${reason}` : null,
    ].filter(Boolean);

    await notifyUser({
      userId: updated.nguoiDungId,
      user: {
        id: user.id,
        email: user.email,
        hoTen: user.hoTen,
      },
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      data: {
        activityId: activity.id,
        registrationId: updated.id,
        action: notificationAction,
      },
      emailSubject,
      emailMessageLines,
    });
  }

  res.json({
    message: isApproval
      ? "Đã duyệt minh chứng điểm danh"
      : "Đã từ chối minh chứng điểm danh",
    registration: {
      ...mapRegistration(updated, updated?.hoatDong),
      activity: mapActivitySummaryForRegistration(updated?.hoatDong),
    },
  });
});

/**
 * Đăng ký tham gia hoạt động.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const registerForActivity = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const { id: activityId } = req.params;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.nguoiDung.findUnique({
    where: { id: userId },
    select: { id: true, email: true, hoTen: true },
  });
  if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

  const activity = await prisma.hoatDong.findUnique({
    where: { id: activityId, isPublished: true },
  });
  if (!activity)
    return res.status(404).json({ error: "Hoạt động không tồn tại" });

  const now = new Date();

  if (activity.hanDangKy && now > new Date(activity.hanDangKy)) {
    return res.status(400).json({ error: "Đã quá hạn đăng ký hoạt động" });
  }

  if (activity.batDauLuc && now > new Date(activity.batDauLuc)) {
    return res
      .status(400)
      .json({ error: "Không thể đăng ký sau khi hoạt động đã bắt đầu" });
  }

  const userActiveRegistrations = await prisma.dangKyHoatDong.findMany({
    where: {
      nguoiDungId: userId,
      trangThai: { in: ACTIVE_REG_STATUSES },
      hoatDongId: { not: activityId },
    },
    include: {
      hoatDong: {
        select: {
          id: true,
          tieuDe: true,
          batDauLuc: true,
          ketThucLuc: true,
        },
      },
    },
  });
  const hasConflict = userActiveRegistrations.some((reg) => {
    const regStart = reg.hoatDong?.batDauLuc
      ? new Date(reg.hoatDong.batDauLuc)
      : null;
    const regEnd = reg.hoatDong?.ketThucLuc
      ? new Date(reg.hoatDong.ketThucLuc)
      : null;
    const actStart = activity.batDauLuc ? new Date(activity.batDauLuc) : null;
    const actEnd = activity.ketThucLuc ? new Date(activity.ketThucLuc) : null;
    if (!regStart || !regEnd || !actStart || !actEnd) return false;
    return actStart < regEnd && actEnd > regStart;
  });
  if (hasConflict) {
    return res.status(409).json({
      error: "Hoạt động này trùng thời gian với hoạt động khác bạn đã đăng ký",
    });
  }
  // Sử dụng transaction để tránh race condition khi nhiều user đăng ký đồng thời
  try {
    await prisma.$transaction(async (tx) => {
      // Kiểm tra số lượng đăng ký hiện tại trong transaction
      const activeCount = await tx.dangKyHoatDong.count({
        where: {
          hoatDongId: activityId,
          trangThai: { in: ACTIVE_REG_STATUSES },
        },
      });

      if (
        typeof activity.sucChuaToiDa === "number" &&
        activity.sucChuaToiDa > 0 &&
        activeCount >= activity.sucChuaToiDa
      ) {
        throw new Error("CAPACITY_EXCEEDED");
      }

      const existing = await tx.dangKyHoatDong.findUnique({
        where: {
          nguoiDungId_hoatDongId: {
            nguoiDungId: userId,
            hoatDongId: activityId,
          },
        },
      });

      if (existing && existing.trangThai !== "DA_HUY") {
        throw new Error("ALREADY_REGISTERED");
      }

      if (existing) {
        await tx.dangKyHoatDong.update({
          where: { id: existing.id },
          data: {
            trangThai: "DANG_KY",
            ghiChu: req.body?.note ?? existing.ghiChu,
            lyDoHuy: null,
            dangKyLuc: new Date(),
            diemDanhLuc: null,
            diemDanhBoiId: null,
            diemDanhGhiChu: null,
          },
        });
      } else {
        await tx.dangKyHoatDong.create({
          data: {
            nguoiDungId: userId,
            hoatDongId: activityId,
            ghiChu: req.body?.note ?? null,
          },
        });
      }
    });
  } catch (error) {
    if (error.message === "CAPACITY_EXCEEDED") {
      return res.status(409).json({ error: "Hoạt động đã đủ số lượng" });
    }
    if (error.message === "ALREADY_REGISTERED") {
      return res.status(409).json({ error: "Bạn đã đăng ký hoạt động này" });
    }
    throw error;
  }

  const updated = await buildActivityResponse(activityId, userId);

  const scheduleLabel = formatDateRange(
    activity.batDauLuc,
    activity.ketThucLuc,
  );
  const detailLines = [
    scheduleLabel ? `Thời gian: ${scheduleLabel}` : null,
    activity.diaDiem ? `Địa điểm: ${activity.diaDiem}` : null,
  ];

  await notifyUser({
    userId,
    user,
    title: "Đăng ký hoạt động thành công",
    message: `Bạn đã đăng ký hoạt động "${activity.tieuDe}" thành công.`,
    type: "success",
    data: { activityId, action: "REGISTERED" },
    emailSubject: `[HUIT Social Credits] Xác nhận đăng ký hoạt động "${activity.tieuDe}"`,
    emailMessageLines: [
      `Bạn đã đăng ký hoạt động "${activity.tieuDe}" thành công.`,
      ...detailLines,
    ],
  });

  res.status(201).json({
    message: "Đăng ký hoạt động thành công",
    activity: updated,
  });
});

/**
 * Hủy đăng ký hoạt động.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const cancelActivityRegistration = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const { id: activityId } = req.params;
  const { reason, note } = req.body || {};

  const user = await prisma.nguoiDung.findUnique({
    where: { id: userId },
    select: { id: true, email: true, hoTen: true },
  });
  if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

  const existing = await prisma.dangKyHoatDong.findUnique({
    where: {
      nguoiDungId_hoatDongId: { nguoiDungId: userId, hoatDongId: activityId },
    },
    include: { hoatDong: true },
  });

  if (!existing || existing.trangThai === "DA_HUY") {
    return res
      .status(404)
      .json({ error: "Bạn chưa đăng ký hoạt động này hoặc đã hủy trước đó" });
  }

  const activity = existing.hoatDong;

  await prisma.dangKyHoatDong.update({
    where: { id: existing.id },
    data: {
      trangThai: "DA_HUY",
      lyDoHuy: reason ?? null,
      ghiChu: note ?? existing.ghiChu,
    },
  });

  const updated = await buildActivityResponse(activityId, userId);

  if (activity) {
    const scheduleLabel = formatDateRange(
      activity.batDauLuc,
      activity.ketThucLuc,
    );
    const detailLines = [
      scheduleLabel ? `Thời gian: ${scheduleLabel}` : null,
      activity.diaDiem ? `Địa điểm: ${activity.diaDiem}` : null,
      reason ? `Lý do hủy: ${String(reason).trim()}` : null,
    ];

    await notifyUser({
      userId,
      user,
      title: "Bạn đã hủy đăng ký hoạt động",
      message: `Bạn đã hủy đăng ký hoạt động "${activity.tieuDe}".`,
      type: "warning",
      data: { activityId, action: "CANCELED" },
      emailSubject: `[HUIT Social Credits] Xác nhận hủy đăng ký hoạt động "${activity.tieuDe}"`,
      emailMessageLines: [
        `Bạn đã hủy đăng ký hoạt động "${activity.tieuDe}".`,
        ...detailLines,
      ],
    });
  }

  res.json({
    message: "Hủy đăng ký thành công",
    activity: updated,
  });
});

/**
 * Lấy danh sách hoạt động của tôi.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const listMyActivities = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { status, feedbackStatus } = req.query || {};
  const normalizedStatus = status
    ? sanitizeStatusFilter(status, REGISTRATION_STATUSES)
    : undefined;
  const normalizedFeedback =
    feedbackStatus && feedbackStatus !== "ALL"
      ? feedbackStatus === "NONE"
      : undefined;

  const registrations = await prisma.dangKyHoatDong.findMany({
    where: {
      nguoiDungId: userId,
      ...(normalizedStatus ? { trangThai: normalizedStatus } : {}),
    },
    include: {
      ...REGISTRATION_INCLUDE,
      hoatDong: {
        include: ACTIVITY_INCLUDE,
      },
    },
    orderBy: [{ dangKyLuc: "desc" }],
  });

  const now = new Date();
  const absentRegistrationIds = registrations
    .filter((registration) => {
      if (registration.trangThai !== "DANG_KY") return false;
      const end = registration.hoatDong?.ketThucLuc
        ? new Date(registration.hoatDong.ketThucLuc)
        : null;
      if (!end || now <= end) return false;
      const history = registration.lichSuDiemDanh ?? [];
      const hasCheckin = history.some((entry) => entry.loai === "CHECKIN");
      const hasCheckout = history.some((entry) => entry.loai === "CHECKOUT");
      return !hasCheckin && !hasCheckout;
    })
    .map((registration) => registration.id);

  if (absentRegistrationIds.length) {
    await prisma.dangKyHoatDong.updateMany({
      where: { id: { in: absentRegistrationIds } },
      data: { trangThai: "VANG_MAT" },
    });
    // Cập nhật trạng thái immutably trong mảng registrations
    const absentSet = new Set(absentRegistrationIds);
    for (let i = 0; i < registrations.length; i++) {
      if (absentSet.has(registrations[i].id)) {
        registrations[i] = { ...registrations[i], trangThai: "VANG_MAT" };
      }
    }
  }

  const filtered = normalizedFeedback
    ? registrations.filter((registration) => {
        if (normalizedFeedback === "NONE") return !registration.phanHoi;
        return registration.phanHoi?.trangThai === normalizedFeedback;
      })
    : registrations;

  const faceProfile = await prisma.faceProfile.findUnique({
    where: { nguoiDungId: userId },
  });
  const faceEnrollmentSummary = summarizeFaceProfile(faceProfile);

  res.json({
    registrations: filtered.map((registration) => ({
      ...mapRegistration(registration, registration.hoatDong),
      activity: mapActivity(registration.hoatDong, registration, {
        faceEnrollment: faceEnrollmentSummary,
      }),
    })),
  });
});
