import {
  DEFAULT_REGISTRATION_PAGE_SIZE,
  MAX_REGISTRATION_PAGE_SIZE,
} from "./constants.js";

/**
 * Chuẩn hóa nhãn học kỳ (VD: HK1 -> "Học kỳ 1").
 * @param {string} value - Nhãn học kỳ cần chuẩn hóa.
 * @returns {string|null} Nhãn đã chuẩn hóa hoặc null.
 */
export const normalizeSemesterLabel = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  switch (trimmed.toUpperCase()) {
    case "HK1":
      return "Học kỳ 1";
    case "HK2":
      return "Học kỳ 2";
    case "HK3":
      return "Học kỳ 3";
    default:
      return trimmed;
  }
};

/**
 * Chuẩn hóa nhãn năm học từ string hoặc object.
 * @param {string|Object} value - Nhãn hoặc record năm học.
 * @returns {string|null} Nhãn đã chuẩn hóa hoặc null.
 */
export const normalizeAcademicYearLabel = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value?.ten === "string" && value.ten.trim()) {
    return value.ten.trim();
  }
  if (typeof value?.nienKhoa === "string" && value.nienKhoa.trim()) {
    return value.nienKhoa.trim();
  }
  if (typeof value?.ma === "string" && value.ma.trim()) {
    return value.ma.trim();
  }

  return null;
};

export const toDate = (value) => (value ? new Date(value) : null);

export const formatDateRange = (start, end) => {
  if (!start && !end) return null;
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (!start) {
    const endDate = toDate(end);
    return `${timeFormatter.format(endDate)}, ${dateFormatter.format(endDate)}`;
  }

  const startDate = toDate(start);
  if (!end) {
    return `${timeFormatter.format(startDate)}, ${dateFormatter.format(startDate)}`;
  }

  const endDate = toDate(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const datePart = dateFormatter.format(startDate);
  const startTime = timeFormatter.format(startDate);
  const endTime = timeFormatter.format(endDate);
  return sameDay
    ? `${startTime} - ${endTime}, ${datePart}`
    : `${startTime}, ${datePart} - ${endTime}, ${dateFormatter.format(endDate)}`;
};

export const normalizePageNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const normalizePageSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0)
    return DEFAULT_REGISTRATION_PAGE_SIZE;
  return Math.min(parsed, MAX_REGISTRATION_PAGE_SIZE);
};

export const buildRegistrationSearchCondition = (searchTerm) => {
  if (!searchTerm) return undefined;
  return {
    OR: [
      { nguoiDung: { hoTen: { contains: searchTerm, mode: "insensitive" } } },
      { nguoiDung: { email: { contains: searchTerm, mode: "insensitive" } } },
      { nguoiDung: { maSV: { contains: searchTerm, mode: "insensitive" } } },
      { hoatDong: { tieuDe: { contains: searchTerm, mode: "insensitive" } } },
    ],
  };
};

export const assertAdmin = (req) => {
  if (req.user?.role !== "ADMIN") {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
};
