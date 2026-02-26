import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import { asyncHandler } from "../middlewares/asyncHandler.js";

/**
 * Tách tên thành phần tên và họ + tên đệm.
 * @param {string} fullName - Họ tên đầy đủ.
 * @returns {{ firstName: string, rest: string }}
 */
const parseName = (fullName) => {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", rest: "" };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", rest: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], rest: "" };
  }
  const firstName = parts[parts.length - 1]; // Chữ cuối cùng là tên
  const rest = parts.slice(0, -1).join(" "); // Phần còn lại là họ + tên đệm
  return { firstName, rest };
};

/**
 * So sánh tên: ưu tiên theo tên, nếu trùng thì theo họ + tên đệm.
 * @param {string} nameA - Họ tên A.
 * @param {string} nameB - Họ tên B.
 * @returns {number} Kết quả so sánh (-1, 0, 1).
 */
const compareNames = (nameA, nameB) => {
  const a = parseName(nameA);
  const b = parseName(nameB);

  // So sánh theo tên (chữ cuối) trước
  const firstNameCompare = a.firstName.localeCompare(b.firstName, "vi");
  if (firstNameCompare !== 0) {
    return firstNameCompare;
  }

  // Nếu tên giống nhau, so sánh theo họ + tên đệm
  return a.rest.localeCompare(b.rest, "vi");
};

/**
 * Lấy danh sách sinh viên (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getStudents = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 10, search, khoaId, lopId, status } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const where = {
    vaiTro: "SINHVIEN",
    ...(search && {
      OR: [
        { hoTen: { contains: search, mode: "insensitive" } },
        { maSV: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status !== undefined &&
      status !== "all" && {
        isActive: status === "active",
      }),
  };

  // Lọc theo khoa
  if (khoaId) {
    where.lopHoc = {
      nganhHoc: {
        khoaId: khoaId,
      },
    };
  }

  // Lọc theo lớp
  if (lopId) {
    where.lopHocId = lopId;
  }

  // Sử dụng Promise.all để chạy song song queries
  const [students, total] = await Promise.all([
    prisma.nguoiDung.findMany({
      where,
      select: {
        id: true,
        maSV: true,
        hoTen: true,
        email: true,
        ngaySinh: true,
        gioiTinh: true,
        soDT: true,
        isActive: true,
        lastLoginAt: true,
        avatarUrl: true,
        lopHoc: {
          select: {
            id: true,
            tenLop: true,
            maLop: true,
            nganhHoc: {
              select: {
                id: true,
                tenNganh: true,
                khoa: {
                  select: {
                    id: true,
                    tenKhoa: true,
                    maKhoa: true,
                  },
                },
              },
            },
          },
        },
      },
      // Sắp xếp ở database level: Khoa -> Lớp -> Mã SV
      // Note: Prisma không hỗ trợ sort theo tên Việt Nam (chữ cuối) ở DB level
      // nên dùng maSV thay thế để đảm bảo thứ tự nhất quán
      orderBy: [
        { lopHoc: { nganhHoc: { khoa: { tenKhoa: "asc" } } } },
        { lopHoc: { tenLop: "asc" } },
        { maSV: "asc" },
      ],
      skip,
      take,
    }),
    prisma.nguoiDung.count({ where }),
  ]);

  const mappedStudents = students.map((student) => ({
    id: student.id,
    studentCode: student.maSV,
    fullName: student.hoTen,
    email: student.email,
    dateOfBirth: student.ngaySinh,
    gender: student.gioiTinh,
    phoneNumber: student.soDT,
    isActive: student.isActive,
    lastLoginAt: student.lastLoginAt,
    avatarUrl: student.avatarUrl,
    classCode: student.lopHoc?.maLop || null,
    className: student.lopHoc?.tenLop || null,
    department: student.lopHoc?.nganhHoc?.khoa?.tenKhoa || null,
    departmentCode: student.lopHoc?.nganhHoc?.khoa?.maKhoa || null,
    departmentId: student.lopHoc?.nganhHoc?.khoa?.id || null,
  }));

  res.json({
    students: mappedStudents,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * Tạo sinh viên mới (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const createStudent = asyncHandler(async (req, res) => {
  const { maSV, hoTen, email, password, lopHocId, ngaySinh, gioiTinh, soDT } =
    req.body;

  const existingUser = await prisma.nguoiDung.findFirst({
    where: {
      OR: [{ email }, { maSV }],
    },
  });

  if (existingUser) {
    return res.status(400).json({ error: "Email hoặc Mã SV đã tồn tại" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newStudent = await prisma.nguoiDung.create({
    data: {
      maSV,
      hoTen,
      email,
      matKhau: hashedPassword,
      vaiTro: "SINHVIEN",
      lopHocId,
      ngaySinh: ngaySinh ? new Date(ngaySinh) : null,
      gioiTinh,
      soDT,
    },
  });

  res
    .status(201)
    .json({ message: "Tạo sinh viên thành công", data: newStudent });
});

/**
 * Cập nhật thông tin sinh viên (Admin).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { maSV, hoTen, email, lopHocId, ngaySinh, gioiTinh, soDT, isActive } =
    req.body;

  const student = await prisma.nguoiDung.findUnique({ where: { id } });
  if (!student)
    return res.status(404).json({ error: "Không tìm thấy sinh viên" });

  // Kiểm tra ràng buộc duy nhất nếu thay đổi email/maSV
  if ((email && email !== student.email) || (maSV && maSV !== student.maSV)) {
    const existing = await prisma.nguoiDung.findFirst({
      where: {
        OR: [
          email ? { email, id: { not: id } } : {},
          maSV ? { maSV, id: { not: id } } : {},
        ],
      },
    });
    if (existing)
      return res
        .status(400)
        .json({ error: "Email hoặc Mã SV đã được sử dụng" });
  }

  const updatedStudent = await prisma.nguoiDung.update({
    where: { id },
    data: {
      maSV,
      hoTen,
      email,
      lopHocId,
      ngaySinh: ngaySinh ? new Date(ngaySinh) : undefined,
      gioiTinh,
      soDT,
      isActive,
    },
  });

  res.json({ message: "Cập nhật thành công", data: updatedStudent });
});

/**
 * Xóa sinh viên (Soft delete).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Xóa mềm
  await prisma.nguoiDung.update({
    where: { id },
    data: { isActive: false },
  });
  res.json({ message: "Đã xóa sinh viên (soft delete)" });
});

/**
 * Lấy danh sách lớp theo khoa.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getClassesByFaculty = asyncHandler(async (req, res) => {
  const { khoaId } = req.params;
  const classes = await prisma.lopHoc.findMany({
    where: {
      nganhHoc: {
        khoaId: khoaId,
      },
    },
    select: { id: true, tenLop: true, maLop: true },
    orderBy: { tenLop: "asc" },
  });
  res.json(classes);
});

/**
 * Lấy danh sách ngành học theo khoa.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getMajorsByFaculty = asyncHandler(async (req, res) => {
  const { khoaId } = req.params;
  const majors = await prisma.nganhHoc.findMany({
    where: {
      khoaId: khoaId,
      isActive: true,
    },
    select: {
      id: true,
      tenNganh: true,
      maNganh: true,
    },
    orderBy: { tenNganh: "asc" },
  });
  res.json(majors);
});

/**
 * Lấy danh sách lớp theo ngành học.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getClassesByMajor = asyncHandler(async (req, res) => {
  const { nganhHocId } = req.params;
  const classes = await prisma.lopHoc.findMany({
    where: { nganhHocId: nganhHocId },
    select: {
      id: true,
      tenLop: true,
      maLop: true,
    },
    orderBy: { tenLop: "asc" },
  });
  res.json(classes);
});

/**
 * Lấy danh sách khoa.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getFaculties = asyncHandler(async (req, res) => {
  const faculties = await prisma.khoa.findMany({
    where: { isActive: true },
    select: { id: true, tenKhoa: true, maKhoa: true },
    orderBy: { tenKhoa: "asc" },
  });
  res.json(faculties);
});
