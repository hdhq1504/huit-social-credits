import prisma from "../prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

// Kiểm tra quyền Admin
const assertAdmin = (req) => {
  if (req.user?.role !== "ADMIN") {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
};

const BACKUP_COLLECTIONS = [
  { key: "users", model: "nguoiDung" },
  { key: "schoolYears", model: "namHoc" },
  { key: "semesters", model: "hocKy" },
  { key: "activities", model: "hoatDong" },
  { key: "registrations", model: "dangKyHoatDong" },
  { key: "checkIns", model: "diemDanhNguoiDung" },
  { key: "feedbacks", model: "phanHoiHoatDong" },
  { key: "notifications", model: "thongBao" },
  { key: "assignments", model: "phanCong" },
  { key: "faceProfiles", model: "faceProfile" },
];

// Chuẩn hóa dữ liệu bản ghi
const sanitizeRecords = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
};

/**
 * Tạo bản sao lưu dữ liệu hệ thống (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const createBackup = asyncHandler(async (req, res) => {
  assertAdmin(req);

  const results = await prisma.$transaction(
    BACKUP_COLLECTIONS.map((collection) => prisma[collection.model].findMany()),
  );

  const data = BACKUP_COLLECTIONS.reduce((acc, collection, index) => {
    acc[collection.key] = results[index] || [];
    return acc;
  }, {});

  const counts = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.length : 0,
    ]),
  );

  const metadata = {
    createdAt: new Date().toISOString(),
    version: "1.0",
    generatedBy: req.user?.sub || null,
    counts,
  };

  res.json({ metadata, data });
});

/**
 * Khôi phục dữ liệu từ bản sao lưu (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const restoreBackup = asyncHandler(async (req, res) => {
  assertAdmin(req);

  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const rawData =
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? payload.data
      : payload;

  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return res.status(400).json({ error: "Dữ liệu backup không hợp lệ." });
  }

  const normalized = BACKUP_COLLECTIONS.reduce((acc, collection) => {
    acc[collection.key] = sanitizeRecords(rawData[collection.key]);
    return acc;
  }, {});

  // Tăng timeout cho transaction vì restore có thể mất nhiều thời gian
  await prisma.$transaction(
    async (tx) => {
      // Xóa các bảng có foreign key trước (theo thứ tự phụ thuộc)
      await tx.thongBao.deleteMany();
      await tx.diemDanhNguoiDung.deleteMany();
      await tx.phanHoiHoatDong.deleteMany();
      await tx.dangKyHoatDong.deleteMany();
      await tx.hoatDong.deleteMany();
      await tx.hocKy.deleteMany();
      await tx.phanCong.deleteMany();
      await tx.faceProfile.deleteMany();
      await tx.namHoc.deleteMany();
      await tx.nguoiDung.deleteMany();

      if (normalized.users.length) {
        await tx.nguoiDung.createMany({ data: normalized.users });
      }
      if (normalized.schoolYears.length) {
        await tx.namHoc.createMany({ data: normalized.schoolYears });
      }
      if (normalized.semesters.length) {
        await tx.hocKy.createMany({ data: normalized.semesters });
      }
      if (normalized.activities.length) {
        await tx.hoatDong.createMany({ data: normalized.activities });
      }
      if (normalized.registrations.length) {
        await tx.dangKyHoatDong.createMany({ data: normalized.registrations });
      }
      if (normalized.checkIns.length) {
        await tx.diemDanhNguoiDung.createMany({ data: normalized.checkIns });
      }
      if (normalized.feedbacks.length) {
        await tx.phanHoiHoatDong.createMany({ data: normalized.feedbacks });
      }
      if (normalized.notifications.length) {
        await tx.thongBao.createMany({ data: normalized.notifications });
      }
      if (normalized.assignments.length) {
        await tx.phanCong.createMany({ data: normalized.assignments });
      }
      if (normalized.faceProfiles.length) {
        await tx.faceProfile.createMany({ data: normalized.faceProfiles });
      }
    },
    {
      maxWait: 10000, // Thời gian chờ tối đa để bắt đầu transaction (10s)
      timeout: 60000, // Thời gian tối đa cho transaction (60s)
    },
  );

  const counts = Object.fromEntries(
    Object.entries(normalized).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.length : 0,
    ]),
  );

  res.json({
    message: "Khôi phục dữ liệu thành công.",
    summary: {
      restoredAt: new Date().toISOString(),
      counts,
    },
  });
});

export default {
  createBackup,
  restoreBackup,
};
