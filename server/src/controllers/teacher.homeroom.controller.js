import prisma from "../prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

// Lấy danh sách lớp chủ nhiệm của giảng viên (năm học hiện tại)
export const getMyClasses = asyncHandler(async (req, res) => {
  const teacherId = req.user.id;

  const assignments = await prisma.phanCong.findMany({
    where: {
      giangVienId: teacherId,
      loaiPhanCong: "CHU_NHIEM",
      namHoc: {
        isActive: true,
      },
    },
    select: {
      lopHoc: {
        select: {
          id: true,
          maLop: true,
          tenLop: true,
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
          _count: {
            select: {
              sinhVien: true,
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
    orderBy: {
      lopHoc: {
        maLop: "asc",
      },
    },
  });

  const classes = assignments.map((assignment) => ({
    ...assignment.lopHoc,
    studentCount: assignment.lopHoc._count.sinhVien,
    nienKhoa: assignment.namHoc.nienKhoa,
  }));

  // Lấy số lượng hoạt động đã tạo bởi giảng viên
  const activityCount = await prisma.hoatDong.count({
    where: {
      nguoiTaoId: teacherId,
    },
  });

  res.json({
    classes,
    activityCount,
  });
});

// Get danh sách sinh viên trong 1 lớp
export const getClassStudents = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const teacherId = req.user.id;

  // Kiểm tra giảng viên có quyền truy cập lớp này không
  const assignment = await prisma.phanCong.findFirst({
    where: {
      giangVienId: teacherId,
      lopHocId: classId,
      loaiPhanCong: "CHU_NHIEM",
      namHoc: {
        isActive: true,
      },
    },
  });

  if (!assignment) {
    return res
      .status(403)
      .json({ error: "Bạn không có quyền truy cập lớp này" });
  }

  // Lấy thông tin lớp
  const classInfo = await prisma.lopHoc.findUnique({
    where: { id: classId },
    select: {
      maLop: true,
      tenLop: true,
      nganhHoc: {
        select: {
          tenNganh: true,
          khoa: {
            select: {
              tenKhoa: true,
            },
          },
        },
      },
    },
  });

  // Lấy danh sách sinh viên trong lớp
  const students = await prisma.nguoiDung.findMany({
    where: {
      lopHocId: classId,
      vaiTro: "SINHVIEN",
    },
    select: {
      id: true,
      maSV: true,
      hoTen: true,
      email: true,
      ngaySinh: true,
      gioiTinh: true,
      soDT: true,
      avatarUrl: true,
    },
    orderBy: {
      hoTen: "asc",
    },
  });

  res.json({
    classInfo,
    students,
  });
});

// Lấy điểm số và hoạt động của sinh viên
export const getStudentScores = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const teacherId = req.user.id;

  // Lấy thông tin sinh viên và kiểm tra giảng viên có quyền truy cập không
  const student = await prisma.nguoiDung.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      maSV: true,
      hoTen: true,
      email: true,
      lopHocId: true,
      lopHoc: {
        select: {
          maLop: true,
          tenLop: true,
        },
      },
    },
  });

  if (!student) {
    return res.status(404).json({ error: "Không tìm thấy sinh viên" });
  }

  // Kiểm tra giảng viên có quyền truy cập lớp của sinh viên không
  const assignment = await prisma.phanCong.findFirst({
    where: {
      giangVienId: teacherId,
      lopHocId: student.lopHocId,
      loaiPhanCong: "CHU_NHIEM",
      namHoc: {
        isActive: true,
      },
    },
  });

  if (!assignment) {
    return res
      .status(403)
      .json({ error: "Bạn không có quyền xem thông tin sinh viên này" });
  }

  // Lấy thông tin hoạt động và điểm số của sinh viên
  const registrations = await prisma.dangKyHoatDong.findMany({
    where: {
      nguoiDungId: studentId,
      hoatDong: {
        namHocRef: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      trangThai: true,
      diemDanhLuc: true,
      dangKyLuc: true,
      hoatDong: {
        select: {
          id: true,
          tieuDe: true,
          nhomDiem: true,
          diemCong: true,
          batDauLuc: true,
          diaDiem: true,
        },
      },
    },
    orderBy: {
      dangKyLuc: "desc",
    },
  });

  // Chuyển đổi dữ liệu theo định dạng frontend mong đợi
  const activities = registrations.map((reg) => {
    let status = "PENDING";
    if (reg.trangThai === "DA_THAM_GIA") status = "APPROVED";
    else if (reg.trangThai === "VANG_MAT" || reg.trangThai === "DA_HUY")
      status = "REJECTED";
    else if (reg.trangThai === "DANG_KY" || reg.trangThai === "CHO_DUYET")
      status = "PENDING";

    return {
      id: reg.id,
      trangThai: status,
      diemDanh: !!reg.diemDanhLuc || reg.trangThai === "DA_THAM_GIA",
      createdAt: reg.dangKyLuc,
      hoatDong: {
        id: reg.hoatDong.id,
        ten: reg.hoatDong.tieuDe,
        loai: reg.hoatDong.nhomDiem,
        diem: reg.hoatDong.diemCong,
        ngayToChuc: reg.hoatDong.batDauLuc,
        diaDiem: reg.hoatDong.diaDiem,
      },
    };
  });

  // Tính tổng điểm số
  const totalScore = activities
    .filter((a) => a.trangThai === "APPROVED")
    .reduce((sum, a) => sum + (a.hoatDong.diem || 0), 0);

  res.json({
    student: {
      id: student.id,
      maSV: student.maSV,
      hoTen: student.hoTen,
      email: student.email,
      lopHoc: student.lopHoc,
    },
    activities,
    totalScore,
  });
});

// Helper functions cho các hoạt động Địa chỉ đỏ
const normalizeText = (value) => {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
};

const containsRedAddressKeyword = (activity) => {
  if (!activity) return false;
  const sources = [activity.tieuDe, activity.moTa];
  return sources.some((source) => {
    const normalized = normalizeText(source);
    return normalized.includes("dia chi do");
  });
};

// Xuất danh sách điểm của lớp
export const exportClassScores = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const teacherId = req.user.id;
  const XLSX = (await import("xlsx")).default;

  // Kiểm tra quyền truy cập
  const assignment = await prisma.phanCong.findFirst({
    where: {
      giangVienId: teacherId,
      lopHocId: classId,
      loaiPhanCong: "CHU_NHIEM",
      namHoc: {
        isActive: true,
      },
    },
  });

  if (!assignment) {
    return res
      .status(403)
      .json({ error: "Bạn không có quyền truy cập lớp này" });
  }

  // Lấy thông tin lớp
  const classInfo = await prisma.lopHoc.findUnique({
    where: { id: classId },
    select: { maLop: true, tenLop: true },
  });

  // Lấy danh sách sinh viên và hoạt động đã tham gia trong năm học hiện tại
  const students = await prisma.nguoiDung.findMany({
    where: {
      lopHocId: classId,
      vaiTro: "SINHVIEN",
    },
    select: {
      id: true,
      maSV: true,
      hoTen: true,
      ngaySinh: true,
      gioiTinh: true,
      soDT: true,
      dangKy: {
        where: {
          trangThai: "DA_THAM_GIA",
          hoatDong: {
            namHocRef: {
              isActive: true,
            },
          },
        },
        select: {
          hoatDong: {
            select: {
              id: true,
              tieuDe: true,
              moTa: true,
              diemCong: true,
              nhomDiem: true,
            },
          },
        },
      },
    },
    orderBy: {
      hoTen: "asc",
    },
  });

  // Xử lý dữ liệu
  const data = students.map((student, index) => {
    let totalPoints = 0;
    let group1Points = 0;
    let group23Points = 0;
    let hasRedAddress = false;

    student.dangKy.forEach((reg) => {
      const activity = reg.hoatDong;
      const points = activity.diemCong || 0;
      totalPoints += points;

      if (activity.nhomDiem === "NHOM_1") {
        group1Points += points;
        if (!hasRedAddress && containsRedAddressKeyword(activity)) {
          hasRedAddress = true;
        }
      } else if (
        activity.nhomDiem === "NHOM_2" ||
        activity.nhomDiem === "NHOM_3"
      ) {
        group23Points += points;
      }
    });

    const isGroup1Qualified = group1Points >= 50 && hasRedAddress;
    const isGroup23Qualified = group23Points >= 120;
    const isQualified = isGroup1Qualified && isGroup23Qualified;

    return {
      stt: index + 1,
      maSV: student.maSV,
      hoTen: student.hoTen,
      ngaySinh: student.ngaySinh
        ? new Date(student.ngaySinh).toLocaleDateString("vi-VN")
        : "",
      gioiTinh: student.gioiTinh,
      soDT: student.soDT || "",
      totalPoints,
      group1Points,
      group23Points,
      hasRedAddress: hasRedAddress ? "Có" : "Không",
      result: isQualified ? "Đạt" : "Chưa đạt",
    };
  });

  // Tạo file Excel
  const wb = XLSX.utils.book_new();

  // Phần tiêu đề
  const wsData = [
    [`DANH SÁCH ĐIỂM RÈN LUYỆN LỚP ${classInfo.maLop} - ${classInfo.tenLop}`],
    [],
    [
      "STT",
      "MSSV",
      "Họ và tên",
      "Ngày sinh",
      "Giới tính",
      "Số điện thoại",
      "Tổng điểm",
      "Điểm Nhóm 1",
      "Điểm Nhóm 2,3",
      "Tham gia Địa chỉ đỏ",
      "Kết quả đánh giá",
    ],
  ];

  // Các dòng dữ liệu
  data.forEach((item) => {
    wsData.push([
      item.stt,
      item.maSV,
      item.hoTen,
      item.ngaySinh,
      item.gioiTinh,
      item.soDT,
      item.totalPoints,
      item.group1Points,
      item.group23Points,
      item.hasRedAddress,
      item.result,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Độ rộng cột
  ws["!cols"] = [
    { wch: 5 }, // STT
    { wch: 15 }, // MSSV
    { wch: 25 }, // Ho ten
    { wch: 12 }, // Ngay sinh
    { wch: 10 }, // Gioi tinh
    { wch: 15 }, // SDT
    { wch: 10 }, // Tong diem
    { wch: 12 }, // Diem Nhom 1
    { wch: 15 }, // Diem Nhom 2,3
    { wch: 20 }, // Dia chi do
    { wch: 15 }, // Ket qua
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Diem Ren Luyen");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=DiemRenLuyen_${classInfo.maLop}.xlsx`,
  );
  res.send(buffer);
});
