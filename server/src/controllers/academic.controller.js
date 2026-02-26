import prisma from "../prisma.js";
import { mapAcademicYearRecord, mapSemesterRecord } from "../utils/academic.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

/**
 * Lấy danh sách năm học và học kỳ (đã format).
 * @param {Object} _req - Express request object.
 * @param {Object} res - Express response object.
 */
export const listSemesters = asyncHandler(async (_req, res) => {
  const academicYears = await prisma.namHoc.findMany({
    include: {
      hocKy: {
        orderBy: [{ thuTu: "asc" }, { batDau: "asc" }],
      },
    },
    orderBy: [{ batDau: "desc" }],
  });

  const years = academicYears.map(mapAcademicYearRecord).filter(Boolean);
  const semesters = years.flatMap((year) =>
    year.semesters.map((semester) => ({
      ...semester,
      academicYearLabel: year.label,
      academicYearId: year.id,
      academicYearCode: year.code,
      academicYearRange: {
        startDate: year.startDate,
        endDate: year.endDate,
      },
    })),
  );

  res.json({ academicYears: years, semesters });
});

/**
 * Lấy danh sách năm học (đã format).
 * @param {Object} _req - Express request object.
 * @param {Object} res - Express response object.
 */
export const listAcademicYears = asyncHandler(async (_req, res) => {
  const academicYears = await prisma.namHoc.findMany({
    include: {
      hocKy: {
        orderBy: [{ thuTu: "asc" }, { batDau: "asc" }],
      },
    },
    orderBy: [{ batDau: "desc" }],
  });

  res.json({
    academicYears: academicYears.map(mapAcademicYearRecord).filter(Boolean),
  });
});

/**
 * Xác định học kỳ dựa trên ngày tháng.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const resolveAcademicPeriod = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const target = date ? new Date(date) : null;
  if (!target || Number.isNaN(target.getTime())) {
    return res.status(400).json({ error: "Tham số 'date' không hợp lệ" });
  }

  const semester = await prisma.hocKy.findFirst({
    where: {
      isActive: true,
      batDau: { lte: target },
      ketThuc: { gte: target },
    },
    include: { namHoc: true },
    orderBy: [{ batDau: "desc" }, { thuTu: "asc" }],
  });

  if (!semester) {
    return res.json({ semester: null, academicYear: null });
  }

  const mappedSemester = mapSemesterRecord(semester);
  res.json({ semester: mappedSemester });
});

// Admin CRUD operations for NamHoc

/**
 * Lấy danh sách năm học (Admin CRUD).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getNamHocs = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const skip = (page - 1) * pageSize;

  const [namHocs, total] = await Promise.all([
    prisma.namHoc.findMany({
      select: {
        id: true,
        ma: true,
        nienKhoa: true,
        ten: true,
        batDau: true,
        ketThuc: true,
        isActive: true,
        _count: {
          select: {
            hocKy: true,
          },
        },
      },
      skip: Number(skip),
      take: Number(pageSize),
      orderBy: { batDau: "desc" },
    }),
    prisma.namHoc.count(),
  ]);

  res.json({
    namHocs,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * Tạo năm học mới.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const createNamHoc = asyncHandler(async (req, res) => {
  const { ma, nienKhoa, ten, batDau, ketThuc } = req.body;

  if (!ma || !nienKhoa || !batDau || !ketThuc) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  const existing = await prisma.namHoc.findUnique({ where: { ma } });
  if (existing) {
    return res.status(400).json({ error: "Mã năm học đã tồn tại" });
  }

  const namHoc = await prisma.namHoc.create({
    data: {
      ma,
      nienKhoa,
      ten,
      batDau: new Date(batDau),
      ketThuc: new Date(ketThuc),
      isActive: false,
    },
  });

  res.status(201).json({ message: "Tạo năm học thành công", namHoc });
});

/**
 * Cập nhật năm học.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const updateNamHoc = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ma, nienKhoa, ten, batDau, ketThuc } = req.body;

  // Lấy thông tin năm học cũ và các học kỳ
  const oldNamHoc = await prisma.namHoc.findUnique({
    where: { id },
    include: { hocKy: { orderBy: { thuTu: "asc" } } },
  });

  if (!oldNamHoc) {
    return res.status(404).json({ error: "Không tìm thấy năm học" });
  }

  const newBatDau = batDau ? new Date(batDau) : null;
  const newKetThuc = ketThuc ? new Date(ketThuc) : null;
  const hasDateChange = newBatDau || newKetThuc;

  // Cập nhật năm học
  const namHoc = await prisma.namHoc.update({
    where: { id },
    data: {
      ...(ma && { ma }),
      ...(nienKhoa && { nienKhoa }),
      ...(ten !== undefined && { ten }),
      ...(newBatDau && { batDau: newBatDau }),
      ...(newKetThuc && { ketThuc: newKetThuc }),
    },
  });

  // Cập nhật thời gian các học kỳ nếu thời gian năm học thay đổi
  if (hasDateChange && oldNamHoc.hocKy.length > 0) {
    const oldStart = oldNamHoc.batDau.getTime();
    const oldEnd = oldNamHoc.ketThuc.getTime();
    const oldDuration = oldEnd - oldStart;

    const actualNewStart = newBatDau ? newBatDau.getTime() : oldStart;
    const actualNewEnd = newKetThuc ? newKetThuc.getTime() : oldEnd;
    const newDuration = actualNewEnd - actualNewStart;

    if (oldDuration > 0 && newDuration > 0) {
      const semesterUpdates = oldNamHoc.hocKy.map((hocKy) => {
        // Tính vị trí tương đối của học kỳ trong năm học cũ
        const startRatio = (hocKy.batDau.getTime() - oldStart) / oldDuration;
        const endRatio = (hocKy.ketThuc.getTime() - oldStart) / oldDuration;

        // Tính thời gian mới dựa trên tỷ lệ
        const newHocKyStart = new Date(
          actualNewStart + startRatio * newDuration,
        );
        const newHocKyEnd = new Date(actualNewStart + endRatio * newDuration);

        return prisma.hocKy.update({
          where: { id: hocKy.id },
          data: {
            batDau: newHocKyStart,
            ketThuc: newHocKyEnd,
          },
        });
      });

      await Promise.all(semesterUpdates);
    }
  }

  res.json({ message: "Cập nhật năm học thành công", namHoc });
});

/**
 * Xóa năm học.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const deleteNamHoc = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignmentCount = await prisma.phanCong.count({
    where: { namHocId: id },
  });

  if (assignmentCount > 0) {
    return res.status(400).json({
      error: "Không thể xóa năm học đã có phân công giảng viên",
    });
  }

  await prisma.namHoc.delete({ where: { id } });

  res.json({ message: "Xóa năm học thành công" });
});

/**
 * Kích hoạt năm học.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const activateNamHoc = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.namHoc.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const namHoc = await prisma.namHoc.update({
    where: { id },
    data: { isActive: true },
  });

  res.json({ message: "Kích hoạt năm học thành công", namHoc });
});

/**
 * Lấy danh sách học kỳ của một năm học.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getHocKys = asyncHandler(async (req, res) => {
  const { namHocId } = req.params;

  const hocKys = await prisma.hocKy.findMany({
    where: { namHocId },
    orderBy: { thuTu: "asc" },
  });

  res.json(hocKys);
});

/**
 * Tạo học kỳ mới.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const createHocKy = asyncHandler(async (req, res) => {
  const { namHocId } = req.params;
  const { ma, ten, thuTu, moTa, batDau, ketThuc } = req.body;

  if (!ma || !ten || !batDau || !ketThuc) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  const hocKy = await prisma.hocKy.create({
    data: {
      ma,
      ten,
      thuTu,
      moTa,
      batDau: new Date(batDau),
      ketThuc: new Date(ketThuc),
      namHocId,
    },
  });

  res.status(201).json({ message: "Tạo học kỳ thành công", hocKy });
});

/**
 * Cập nhật học kỳ.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const updateHocKy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ma, ten, thuTu, moTa, batDau, ketThuc } = req.body;

  const hocKy = await prisma.hocKy.update({
    where: { id },
    data: {
      ...(ma && { ma }),
      ...(ten && { ten }),
      ...(thuTu !== undefined && { thuTu }),
      ...(moTa !== undefined && { moTa }),
      ...(batDau && { batDau: new Date(batDau) }),
      ...(ketThuc && { ketThuc: new Date(ketThuc) }),
    },
  });

  res.json({ message: "Cập nhật học kỳ thành công", hocKy });
});

/**
 * Xóa học kỳ.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const deleteHocKy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.hocKy.delete({ where: { id } });

  res.json({ message: "Xóa học kỳ thành công" });
});

export default {
  listSemesters,
  listAcademicYears,
  resolveAcademicPeriod,
  getNamHocs,
  createNamHoc,
  updateNamHoc,
  deleteNamHoc,
  activateNamHoc,
  getHocKys,
  createHocKy,
  updateHocKy,
  deleteHocKy,
};
