import prisma from "../prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

/**
 * Lấy danh sách giảng viên (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getTeachers = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 10, search, status } = req.query;
  const skip = (page - 1) * pageSize;

  const where = {
    vaiTro: "GIANGVIEN",
    ...(search && {
      OR: [
        { hoTen: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { maCB: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status !== undefined &&
      status !== "all" && {
        isActive: status === "active",
      }),
  };

  const [teachers, total] = await Promise.all([
    prisma.nguoiDung.findMany({
      where,
      select: {
        id: true,
        maCB: true,
        hoTen: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        avatarUrl: true,
        phanCong: {
          where: {
            loaiPhanCong: "CHU_NHIEM",
            namHoc: {
              isActive: true,
            },
          },
          select: {
            lopHoc: {
              select: {
                id: true,
                tenLop: true,
                maLop: true,
                namNhapHoc: true,
                nganhHoc: {
                  select: {
                    id: true,
                    tenNganh: true,
                    khoa: {
                      select: {
                        id: true,
                        tenKhoa: true,
                      },
                    },
                  },
                },
              },
            },
            namHoc: {
              select: {
                nienKhoa: true,
              },
            },
          },
        },
      },
      skip: Number(skip),
      take: Number(pageSize),
      orderBy: { hoTen: "asc" },
    }),
    prisma.nguoiDung.count({ where }),
  ]);

  // Chuyển đổi dữ liệu giảng viên theo định dạng frontend mong đợi
  const mappedTeachers = teachers.map((teacher) => ({
    id: teacher.id,
    staffCode: teacher.maCB,
    fullName: teacher.hoTen,
    email: teacher.email,
    isActive: teacher.isActive,
    lastLoginAt: teacher.lastLoginAt,
    avatarUrl: teacher.avatarUrl,
    department: teacher.phanCong?.[0]?.lopHoc?.nganhHoc?.khoa?.tenKhoa || null,
    homeroomClasses: teacher.phanCong?.map((pc) => pc.lopHoc) || [],
  }));

  res.json({
    teachers: mappedTeachers,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * Phân công chủ nhiệm cho giảng viên.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const assignHomeroom = asyncHandler(async (req, res) => {
  const { teacherId, classIds } = req.body; // classIds là mảng các chuỗi

  if (!teacherId || !Array.isArray(classIds)) {
    return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
  }

  // Kiểm tra giảng viên tồn tại và có vai trò GIANGVIEN
  const teacher = await prisma.nguoiDung.findUnique({
    where: { id: teacherId },
  });

  if (!teacher || teacher.vaiTro !== "GIANGVIEN") {
    return res.status(400).json({ error: "Giảng viên không hợp lệ" });
  }

  // Lấy năm học hiện tại
  const currentNamHoc = await prisma.namHoc.findFirst({
    where: { isActive: true },
  });

  if (!currentNamHoc) {
    return res.status(400).json({ error: "Không tìm thấy năm học hiện tại" });
  }

  // Xóa các phân công hiện tại cho các lớp này trong năm hiện tại
  await prisma.phanCong.deleteMany({
    where: {
      lopHocId: { in: classIds },
      namHocId: currentNamHoc.id,
      loaiPhanCong: "CHU_NHIEM",
    },
  });

  // Tạo các phân công mới
  await prisma.phanCong.createMany({
    data: classIds.map((lopHocId) => ({
      giangVienId: teacherId,
      lopHocId,
      namHocId: currentNamHoc.id,
      loaiPhanCong: "CHU_NHIEM",
    })),
  });

  res.json({ message: "Phân công chủ nhiệm thành công" });
});

/**
 * Lấy danh sách lớp học khả dụng cho phân công.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getAvailableClasses = asyncHandler(async (req, res) => {
  // Trả về tất cả lớp với thông tin giảng viên chủ nhiệm hiện tại
  const classes = await prisma.lopHoc.findMany({
    select: {
      id: true,
      tenLop: true,
      maLop: true,
      nganhHoc: {
        select: {
          tenNganh: true,
          khoa: {
            select: { tenKhoa: true },
          },
        },
      },
      phanCong: {
        where: {
          loaiPhanCong: "CHU_NHIEM",
          namHoc: {
            isActive: true,
          },
        },
        select: {
          giangVien: {
            select: { hoTen: true },
          },
        },
      },
    },
    orderBy: { tenLop: "asc" },
  });

  // Chuyển đổi để bao gồm giangVienChuNhiem cho tương thích với frontend
  const mappedClasses = classes.map((cls) => ({
    ...cls,
    giangVienChuNhiem: cls.phanCong?.[0]?.giangVien || null,
  }));

  res.json(mappedClasses);
});
