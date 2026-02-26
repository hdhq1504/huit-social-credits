import sanitizeHtml from "sanitize-html";
import prisma from "../prisma.js";
import { env } from "../env.js";
import {
  getPointGroupLabel,
  normalizePointGroup,
  isValidPointGroup,
} from "./points.js";
import { deriveSemesterInfo } from "./academic.js";
import {
  getAttendanceMethodLabel,
  getDefaultAttendanceMethod,
  mapAttendanceMethodToApi,
} from "./attendance.js";
import { summarizeFaceProfile } from "./face.js";
import { uploadBase64Image, isSupabaseConfigured } from "./supabaseStorage.js";
import {
  sanitizeStorageMetadata,
  sanitizeStorageList,
  mapStorageForResponse,
  mapStorageListForResponse,
} from "./storageMapper.js";

/**
 * Chuẩn hóa nhãn học kỳ (VD: HK1 -> "Học kỳ 1").
 * @private
 * @param {string} value - Nhãn học kỳ cần chuẩn hóa.
 * @returns {string|null} Nhãn đã chuẩn hóa hoặc null.
 */
const normalizeSemesterLabel = (value) => {
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
 * @private
 * @param {string|Object} value - Nhãn hoặc record năm học.
 * @returns {string|null} Nhãn đã chuẩn hóa hoặc null.
 */
const normalizeAcademicYearLabel = (value) => {
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

const ACTIVE_REG_STATUSES = [
  "DANG_KY",
  "DANG_THAM_GIA",
  "DA_THAM_GIA",
  "CHO_DUYET",
];
const REGISTRATION_STATUSES = [
  "DANG_KY",
  "DA_HUY",
  "DA_THAM_GIA",
  "VANG_MAT",
  "CHO_DUYET",
];
const FEEDBACK_STATUSES = ["CHO_DUYET", "DA_DUYET", "BI_TU_CHOI"];
const FEEDBACK_STATUS_LABELS = {
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đã duyệt",
  BI_TU_CHOI: "Bị từ chối",
};

/**
 * Tạo Set từ danh sách tên bucket (lọc rỗng).
 * @private
 * @param {...string} values - Danh sách tên bucket.
 * @returns {Set<string>} Set chứa các bucket hợp lệ.
 */
const buildBucketSet = (...values) =>
  new Set(
    values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  );

const ACTIVITY_BUCKET_SET = buildBucketSet(env.SUPABASE_ACTIVITY_BUCKET);
const ATTENDANCE_BUCKET_SET = buildBucketSet(env.SUPABASE_ATTENDANCE_BUCKET);
const FEEDBACK_BUCKET_SET = buildBucketSet(env.SUPABASE_FEEDBACK_BUCKET);

const sanitizeActivityCoverMetadata = (value) =>
  sanitizeStorageMetadata(value, {
    allowedBuckets: ACTIVITY_BUCKET_SET,
    fallbackBucket: env.SUPABASE_ACTIVITY_BUCKET,
  });

const mapActivityCover = (value) =>
  mapStorageForResponse(value, {
    fallbackBucket: env.SUPABASE_ACTIVITY_BUCKET,
  });

const mapAttendanceEvidence = (value) =>
  mapStorageForResponse(value, {
    fallbackBucket: env.SUPABASE_ATTENDANCE_BUCKET,
  });

const sanitizeAttendanceEvidenceMetadata = (value) =>
  sanitizeStorageMetadata(value, {
    allowedBuckets: ATTENDANCE_BUCKET_SET,
    fallbackBucket: env.SUPABASE_ATTENDANCE_BUCKET,
  });

const mapFeedbackAttachments = (value) =>
  mapStorageListForResponse(value, {
    fallbackBucket: env.SUPABASE_FEEDBACK_BUCKET,
  });

const sanitizeFeedbackAttachmentList = (value) =>
  sanitizeStorageList(value, {
    allowedBuckets: FEEDBACK_BUCKET_SET,
    fallbackBucket: env.SUPABASE_FEEDBACK_BUCKET,
    limit: 10,
  });

const USER_PUBLIC_FIELDS = {
  id: true,
  hoTen: true,
  email: true,
  avatarUrl: true,
  maSV: true,
  lopHoc: {
    select: {
      maLop: true,
      nganhHoc: {
        select: {
          khoa: {
            select: {
              maKhoa: true,
              tenKhoa: true,
            },
          },
        },
      },
    },
  },
  khoa: {
    select: {
      maKhoa: true,
      tenKhoa: true,
    },
  },
};

const ACTIVITY_INCLUDE = {
  dangKy: {
    where: { trangThai: { in: ACTIVE_REG_STATUSES } },
    include: {
      nguoiDung: {
        select: USER_PUBLIC_FIELDS,
      },
    },
    orderBy: { dangKyLuc: "asc" },
  },
  phanHoi: {
    include: {
      nguoiDung: {
        select: {
          id: true,
          hoTen: true,
          email: true,
          avatarUrl: true,
          maSV: true,
          lopHoc: {
            select: {
              maLop: true,
              nganhHoc: {
                select: {
                  khoa: {
                    select: {
                      maKhoa: true,
                      tenKhoa: true,
                    },
                  },
                },
              },
            },
          },
          khoa: {
            select: {
              maKhoa: true,
              tenKhoa: true,
            },
          },
        },
      },
    },
    orderBy: { taoLuc: "desc" },
  },
  hocKyRef: {
    include: {
      namHoc: true,
    },
  },
  namHocRef: true,
};

const REGISTRATION_INCLUDE = {
  phanHoi: true,
  diemDanhBoi: {
    select: {
      id: true,
      hoTen: true,
      email: true,
    },
  },
  lichSuDiemDanh: {
    orderBy: { taoLuc: "asc" },
  },
};

const ADMIN_STUDENT_FIELDS = {
  id: true,
  hoTen: true,
  email: true,
  avatarUrl: true,
  maSV: true,
  soDT: true,
  lopHoc: {
    select: {
      maLop: true,
      nganhHoc: {
        select: {
          khoa: {
            select: {
              maKhoa: true,
              tenKhoa: true,
            },
          },
        },
      },
    },
  },
  khoa: {
    select: {
      maKhoa: true,
      tenKhoa: true,
    },
  },
};

const ADMIN_REGISTRATION_INCLUDE = {
  ...REGISTRATION_INCLUDE,
  nguoiDung: {
    select: ADMIN_STUDENT_FIELDS,
  },
  hoatDong: {
    select: {
      id: true,
      tieuDe: true,
      diemCong: true,
      nhomDiem: true,
      batDauLuc: true,
      ketThucLuc: true,
      diaDiem: true,
      phuongThucDiemDanh: true,
      sucChuaToiDa: true, // Số lượng tối đa cho phép tham gia
    },
  },
};

const REGISTRATION_STATUS_LABELS = {
  DANG_KY: "Chờ duyệt",
  DA_THAM_GIA: "Đã duyệt",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
  CHO_DUYET: "Chờ duyệt điểm danh",
};

const ATTENDANCE_STATUS_LABELS = {
  DANG_KY: "Đang xử lý",
  DANG_THAM_GIA: "Đúng giờ",
  DA_THAM_GIA: "Đúng giờ",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
  CHO_DUYET: "Chờ duyệt",
};

const FACE_MATCH_LABELS = {
  APPROVED: "Khớp khuôn mặt",
  REVIEW: "Cần kiểm tra",
};

const summarizeFaceHistoryRaw = (entries = []) => {
  const relevant = entries.filter(
    (entry) => entry && (entry.loai === "CHECKIN" || entry.loai === "CHECKOUT"),
  );
  const statuses = relevant.map((entry) => entry.faceMatch ?? null);
  const approvedCount = statuses.filter(
    (status) => status === "APPROVED",
  ).length;
  const reviewCount = statuses.filter((status) => status === "REVIEW").length;
  const missingCount = statuses.filter((status) => status === null).length;
  const hasCheckin = relevant.some((entry) => entry.loai === "CHECKIN");
  const hasCheckout = relevant.some((entry) => entry.loai === "CHECKOUT");
  const requiresReview =
    reviewCount > 0 || missingCount > 0 || (hasCheckout && approvedCount === 1);

  return {
    approvedCount,
    reviewCount,
    missingCount,
    hasCheckin,
    hasCheckout,
    requiresReview,
  };
};

const summarizeFaceHistoryMapped = (entries = []) => {
  const relevant = entries.filter(
    (entry) =>
      entry && (entry.phase === "checkin" || entry.phase === "checkout"),
  );
  const statuses = relevant.map((entry) => entry.faceMatch ?? null);
  const approvedCount = statuses.filter(
    (status) => status === "APPROVED",
  ).length;
  const reviewCount = statuses.filter((status) => status === "REVIEW").length;
  const missingCount = statuses.filter((status) => status === null).length;
  const hasCheckin = relevant.some((entry) => entry.phase === "checkin");
  const hasCheckout = relevant.some((entry) => entry.phase === "checkout");
  const requiresReview = reviewCount > 0 || missingCount > 0;

  return {
    approvedCount,
    reviewCount,
    missingCount,
    hasCheckin,
    hasCheckout,
    requiresReview,
  };
};

const DEFAULT_REGISTRATION_PAGE_SIZE = 10;
const MAX_REGISTRATION_PAGE_SIZE = 50;

const ADMIN_STATUS_MAP = {
  pending: "DANG_KY",
  approved: "DA_THAM_GIA",
  rejected: "VANG_MAT",
  canceled: "DA_HUY",
};

const normalizePageNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizePageSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0)
    return DEFAULT_REGISTRATION_PAGE_SIZE;
  return Math.min(parsed, MAX_REGISTRATION_PAGE_SIZE);
};

const toDate = (value) => (value ? new Date(value) : null);

const formatDateRange = (start, end) => {
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

const mapStudentProfile = (user, { includeContact = false } = {}) => {
  if (!user) return null;
  const base = {
    id: user.id,
    name:
      sanitizeOptionalText(user.hoTen) ||
      sanitizeOptionalText(user.email) ||
      "Người dùng",
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    studentCode: user.maSV ?? null,
    faculty:
      user.khoa?.tenKhoa ||
      user.lopHoc?.nganhHoc?.khoa?.tenKhoa ||
      user.khoa?.maKhoa ||
      user.lopHoc?.nganhHoc?.khoa?.maKhoa ||
      null,
    className: user.lopHoc?.maLop || null,
  };

  if (includeContact) {
    base.phone = user.soDT ?? null;
  }

  return base;
};

const mapParticipants = (registrations = []) =>
  registrations
    .filter((reg) => reg.nguoiDung)
    .map((reg) => {
      const student = mapStudentProfile(reg.nguoiDung);
      if (student?.avatarUrl) {
        return { id: student.id, name: student.name, src: student.avatarUrl };
      }
      return { id: student?.id, name: student?.name ?? "Người dùng" };
    });

const normalizeAttachments = (value) => {
  const attachments = mapFeedbackAttachments(value);
  return attachments.map((item, index) => ({
    id: item.path ? `${index}-${item.path}` : String(index),
    name: item.fileName || `Minh chứng ${index + 1}`,
    url: item.url,
    size: item.size,
    mimeType: item.mimeType,
    uploadedAt: item.uploadedAt,
    bucket: item.bucket,
    path: item.path,
    storage: item,
  }));
};

const MAX_ATTENDANCE_EVIDENCE_SIZE = 5_000_000;

const sanitizeOptionalText = (value, maxLength = 500) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const sanitizeStringArray = (value, maxLength = 500) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeOptionalText(item, maxLength))
    .filter((item) => typeof item === "string" && item.length > 0);
};

const assertAdmin = (req) => {
  if (req.user?.role !== "ADMIN") {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
};

const buildRegistrationSearchCondition = (searchTerm) => {
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

const RICH_TEXT_ALLOWED_TAGS = Array.from(
  new Set([
    ...sanitizeHtml.defaults.allowedTags,
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "img",
    "figure",
    "figcaption",
    "span",
    "p",
  ]),
);

const RICH_TEXT_ALLOWED_ATTRIBUTES = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ["href", "name", "target", "rel", "class"],
  img: ["src", "alt", "title", "width", "height", "style", "class"],
  span: ["style", "class"],
  p: ["style", "class"],
  div: ["style", "class"],
  ol: ["class"],
  ul: ["class"],
  li: ["class"],
  h1: ["class"],
  h2: ["class"],
  h3: ["class"],
  h4: ["class"],
  h5: ["class"],
  h6: ["class"],
};

const sanitizeRichText = (value, maxLength = 20_000) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const limited =
    trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
  return sanitizeHtml(limited, {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: RICH_TEXT_ALLOWED_ATTRIBUTES,
    allowedSchemesByTag: {
      img: ["data", "http", "https"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
};

const sanitizePoints = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
};

const sanitizeCapacity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
};

const sanitizeAttendanceEvidence = (value) => {
  if (!value || typeof value !== "object") {
    return { data: null, mimeType: null, fileName: null, metadata: null };
  }

  const metadata = sanitizeAttendanceEvidenceMetadata(value);
  if (metadata) {
    return {
      data: null,
      mimeType: metadata.mimeType ?? null,
      filename: metadata.fileName ?? null,
      metadata,
    };
  }

  const rawData =
    typeof value.data === "string"
      ? value.data
      : typeof value.dataUrl === "string"
        ? value.dataUrl
        : null;
  const data = rawData?.trim();

  if (
    !data ||
    data.length > MAX_ATTENDANCE_EVIDENCE_SIZE ||
    !data.startsWith("data:")
  ) {
    return { data: null, mimeType: null, fileName: null, metadata: null };
  }

  const mimeType =
    typeof value.mimeType === "string" ? value.mimeType.slice(0, 100) : null;
  const fileName =
    typeof value.fileName === "string" ? value.fileName.slice(0, 255) : null;

  return { data, mimeType, fileName, metadata: null };
};

const mapAttendanceEntry = (entry) => {
  if (!entry) return null;
  const attachmentMeta = mapAttendanceEvidence(entry.anhDinhKem);
  return {
    id: entry.id,
    status: entry.trangThai,
    statusLabel: ATTENDANCE_STATUS_LABELS[entry.trangThai] || entry.trangThai,
    phase: entry.loai === "CHECKOUT" ? "checkout" : "checkin",
    note: entry.ghiChu ?? null,
    capturedAt: entry.taoLuc?.toISOString() ?? null,
    attachment: attachmentMeta,
    attachmentUrl: attachmentMeta?.url ?? null,
    attachmentMimeType: attachmentMeta?.mimeType ?? null,
    attachmentFileName: attachmentMeta?.fileName ?? null,
    faceMatch: entry.faceMatch ?? null,
    faceMatchLabel: entry.faceMatch
      ? FACE_MATCH_LABELS[entry.faceMatch] || entry.faceMatch
      : null,
    faceScore: entry.faceScore ?? null,
    faceMeta: entry.faceMeta ?? null,
  };
};

const mapFeedback = (feedback) => {
  if (!feedback) return null;
  return {
    id: feedback.id,
    status: feedback.trangThai,
    statusLabel:
      FEEDBACK_STATUS_LABELS[feedback.trangThai] || feedback.trangThai,
    content: feedback.noiDung,
    attachments: normalizeAttachments(feedback.minhChung),
    rejectedReason: feedback.lydoTuChoi ?? null,
    submittedAt: feedback.taoLuc?.toISOString() ?? null,
    updatedAt: feedback.capNhatLuc?.toISOString() ?? null,
  };
};

const computeCheckoutAvailableAt = (activity) => {
  if (!activity) return null;
  const end = toDate(activity.ketThucLuc);
  if (!end) return null;
  const threshold = new Date(end.getTime() - 10 * 60 * 1000);
  return threshold.toISOString();
};

const computeFeedbackWindow = (activity, registration) => {
  const baseTime = registration?.duyetLuc
    ? new Date(registration.duyetLuc)
    : registration?.diemDanhLuc
      ? new Date(registration.diemDanhLuc)
      : toDate(activity?.ketThucLuc) ||
        toDate(activity?.batDauLuc) ||
        new Date();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // const start = new Date(baseTime.getTime() + ONE_DAY_MS);
  const start = new Date(baseTime.getTime()); // TEST: Mở ngay lập tức
  const end = new Date(start.getTime() + 3 * ONE_DAY_MS);
  return { start, end };
};

const mapRegistration = (registration, activity) => {
  if (!registration) return null;
  const attendanceHistory = (registration.lichSuDiemDanh ?? [])
    .map((entry) => mapAttendanceEntry(entry))
    .filter(Boolean);
  const hasCheckin = attendanceHistory.some(
    (entry) => entry.phase === "checkin",
  );
  const hasCheckout = attendanceHistory.some(
    (entry) => entry.phase === "checkout",
  );
  const checkoutAvailableAt = computeCheckoutAvailableAt(activity);
  const feedbackWindow = computeFeedbackWindow(activity, registration);
  const faceSummary = summarizeFaceHistoryMapped(attendanceHistory);
  return {
    id: registration.id,
    activityId: registration.hoatDongId,
    userId: registration.nguoiDungId,
    status: registration.trangThai,
    statusLabel:
      REGISTRATION_STATUS_LABELS[registration.trangThai] ||
      registration.trangThai,
    note: registration.ghiChu ?? null,
    cancelReason: registration.lyDoHuy ?? null,
    registeredAt: registration.dangKyLuc?.toISOString() ?? null,
    approvedAt: registration.duyetLuc?.toISOString() ?? null,
    updatedAt: registration.updatedAt?.toISOString() ?? null,
    checkInAt: registration.diemDanhLuc?.toISOString() ?? null,
    checkInNote: registration.diemDanhGhiChu ?? null,
    checkInBy: registration.diemDanhBoi
      ? {
          id: registration.diemDanhBoi.id,
          name:
            registration.diemDanhBoi.hoTen ??
            registration.diemDanhBoi.email ??
            "Người dùng",
        }
      : null,
    attendanceHistory,
    attendanceSummary: {
      hasCheckin,
      hasCheckout,
      nextPhase: !hasCheckin ? "checkin" : !hasCheckout ? "checkout" : null,
      checkoutAvailableAt,
      feedbackWindow: {
        start: feedbackWindow.start.toISOString(),
        end: feedbackWindow.end.toISOString(),
      },
      face: faceSummary,
    },
    feedback: mapFeedback(registration.phanHoi),
    student: mapStudentProfile(registration.nguoiDung, {
      includeContact: true,
    }),
  };
};

/**
 * Xử lý ảnh bìa hoạt động (upload, xóa, giữ nguyên).
 * @param {Object} params - Tham số đầu vào.
 * @param {string} params.activityId - ID hoạt động.
 * @param {Object} params.payload - Dữ liệu ảnh mới (hoặc null để xóa).
 * @param {Object} params.existing - Metadata ảnh hiện tại.
 * @returns {Promise<Object>} Metadata mới và danh sách file cần xóa.
 */
const processActivityCover = async ({ activityId, payload, existing }) => {
  if (payload === undefined) {
    return { metadata: existing ?? null, removed: [] };
  }

  const sanitizedExisting = existing
    ? sanitizeActivityCoverMetadata(existing)
    : null;
  const removalCandidates =
    sanitizedExisting && sanitizedExisting.path
      ? [
          {
            bucket: sanitizedExisting.bucket || env.SUPABASE_ACTIVITY_BUCKET,
            path: sanitizedExisting.path,
          },
        ]
      : [];

  if (payload === null) {
    return {
      metadata: null,
      removed: removalCandidates,
    };
  }

  if (
    payload &&
    typeof payload === "object" &&
    typeof payload.dataUrl === "string"
  ) {
    if (!isSupabaseConfigured()) {
      const error = new Error("Dịch vụ lưu trữ chưa được cấu hình");
      error.code = "SUPABASE_NOT_CONFIGURED";
      throw error;
    }
    const uploadResult = await uploadBase64Image({
      dataUrl: payload.dataUrl,
      bucket: env.SUPABASE_ACTIVITY_BUCKET,
      pathPrefix: `activities/${activityId}`,
      fileName: payload.fileName,
    });
    return {
      metadata: {
        ...uploadResult,
        mimeType: payload.mimeType ?? uploadResult.mimeType,
        fileName: payload.fileName ?? uploadResult.fileName,
      },
      removed: removalCandidates,
    };
  }

  const sanitized = sanitizeActivityCoverMetadata(payload);
  if (!sanitized) {
    return {
      metadata: null,
      removed: removalCandidates,
    };
  }

  if (
    sanitizedExisting &&
    sanitizedExisting.bucket === sanitized.bucket &&
    sanitizedExisting.path === sanitized.path
  ) {
    return {
      metadata: { ...sanitizedExisting, ...sanitized },
      removed: [],
    };
  }

  return {
    metadata: sanitized,
    removed: removalCandidates,
  };
};

/**
 * Xác định trạng thái hiển thị của hoạt động đối với người dùng.
 * @param {Object} activity - Dữ liệu hoạt động.
 * @param {Object} registration - Dữ liệu đăng ký của user (nếu có).
 * @returns {string} Trạng thái (guest, registered, check_in, check_out, ...).
 */
const determineState = (activity, registration) => {
  const start = toDate(activity?.batDauLuc);
  const end = toDate(activity?.ketThucLuc);
  const now = new Date();

  if (!registration) {
    if (end && end < now) return "ended";
    return "guest";
  }

  switch (registration.trangThai) {
    case "DANG_KY": {
      const history = registration.lichSuDiemDanh ?? [];
      const hasCheckin = history.some((entry) => entry.loai === "CHECKIN");
      const hasCheckout = history.some((entry) => entry.loai === "CHECKOUT");
      if (end && end < now) return "ended";
      if (start && start <= now && (!end || end >= now)) {
        if (!hasCheckin) return "check_in";
        if (!hasCheckout) return "check_out";
        return "attendance_open";
      }
      if (start && start > now) return "attendance_closed";
      return "registered";
    }
    case "DANG_THAM_GIA": {
      // Đang tham gia - đã checkin nhưng chưa checkout
      const history = registration.lichSuDiemDanh ?? [];
      const hasCheckout = history.some((entry) => entry.loai === "CHECKOUT");
      if (end && end < now) return "ended";
      if (start && start <= now && (!end || end >= now)) {
        if (!hasCheckout) return "check_out";
        return "attendance_open";
      }
      return "check_out";
    }
    case "DA_HUY":
      return "canceled";
    case "VANG_MAT":
      return "absent";
    case "CHO_DUYET": {
      const feedback = registration.phanHoi;
      if (!feedback) {
        const history = registration.lichSuDiemDanh || [];
        const hasFaceIssue = history.some(
          (entry) => entry.faceMatch === "REVIEW",
        );

        if (!hasFaceIssue) {
          return "attendance_review";
        }

        const { start, end } = computeFeedbackWindow(activity, registration);
        if (now < start) {
          return "attendance_review";
        }
        if (now > end) {
          return "feedback_closed";
        }
        return "feedback_pending";
      }
      switch (feedback.trangThai) {
        case "DA_DUYET":
          return "feedback_accepted";
        case "BI_TU_CHOI":
          return "feedback_denied";
        default:
          return "feedback_reviewing";
      }
    }
    case "DA_THAM_GIA": {
      const feedback = registration.phanHoi;
      if (!feedback) {
        return "completed";
      }
      switch (feedback.trangThai) {
        case "DA_DUYET":
          return "feedback_accepted";
        case "BI_TU_CHOI":
          return "feedback_denied";
        default:
          return "feedback_reviewing";
      }
    }
    default:
      return "guest";
  }
};

/**
 * Map dữ liệu hoạt động sang format API.
 * @param {Object} activity - Dữ liệu hoạt động từ DB.
 * @param {Object} registration - Dữ liệu đăng ký của user (nếu có).
 * @param {Object} options - Các tùy chọn map thêm.
 * @returns {Object|null} Object hoạt động đã format.
 */
const mapActivity = (activity, registration, options = {}) => {
  if (!activity) return null;

  const start = toDate(activity.batDauLuc);
  const end = toDate(activity.ketThucLuc);
  const activeRegistrations = activity.dangKy ?? [];
  const participants = mapParticipants(activeRegistrations).slice(0, 5);
  const registeredCount = activeRegistrations.length;
  const pointGroup = normalizePointGroup(activity.nhomDiem);
  const pointGroupLabel = getPointGroupLabel(pointGroup);
  const semesterRef = activity.hocKyRef ?? null;
  const academicYearRef = semesterRef?.namHoc ?? activity.namHocRef ?? null;
  const defaultAttendanceMethod = getDefaultAttendanceMethod();
  const attendanceSource =
    activity.phuongThucDiemDanh || defaultAttendanceMethod;
  const attendanceMethod =
    mapAttendanceMethodToApi(attendanceSource) ||
    mapAttendanceMethodToApi(defaultAttendanceMethod);
  const attendanceMethodLabel =
    getAttendanceMethodLabel(attendanceMethod) ||
    getAttendanceMethodLabel(mapAttendanceMethodToApi(defaultAttendanceMethod));
  const faceEnrollment =
    options.faceEnrollment ?? summarizeFaceProfile(options.faceProfile ?? null);
  const storedSemester = normalizeSemesterLabel(semesterRef?.ten);
  const storedAcademicYear = normalizeAcademicYearLabel(academicYearRef);
  const fallbackSemesterInfo = deriveSemesterInfo(
    activity.batDauLuc ?? activity.ketThucLuc,
  );
  const semesterLabel = storedSemester ?? fallbackSemesterInfo.semester ?? null;
  const academicYearLabel =
    storedAcademicYear ?? fallbackSemesterInfo.academicYear ?? null;
  const semesterDisplay =
    semesterLabel && academicYearLabel
      ? `${semesterLabel} - ${academicYearLabel}`
      : semesterLabel || academicYearLabel || null;
  const capacityLabel =
    typeof activity.sucChuaToiDa === "number" && activity.sucChuaToiDa > 0
      ? `${Math.min(registeredCount, activity.sucChuaToiDa)}/${activity.sucChuaToiDa}`
      : `${registeredCount}`;
  const coverMeta = mapActivityCover(activity.hinhAnh);

  const participantRegistrations = activeRegistrations.map((item) => ({
    id: item.id,
    status: item.trangThai,
    statusLabel: REGISTRATION_STATUS_LABELS[item.trangThai] || item.trangThai,
    registeredAt: item.dangKyLuc?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    checkInAt: item.diemDanhLuc?.toISOString() ?? null,
    student: mapStudentProfile(item.nguoiDung, { includeContact: true }),
  }));

  const feedbackLogs = Array.isArray(activity.phanHoi)
    ? activity.phanHoi.map((feedbackItem) => ({
        ...mapFeedback(feedbackItem),
        student: mapStudentProfile(feedbackItem.nguoiDung),
      }))
    : [];

  return {
    id: activity.id,
    code: null,
    title: activity.tieuDe,
    description: activity.moTa,
    requirements: Array.isArray(activity.yeuCau) ? activity.yeuCau : [],
    guidelines: Array.isArray(activity.huongDan) ? activity.huongDan : [],
    points: activity.diemCong,
    startTime: start?.toISOString() ?? null,
    endTime: end?.toISOString() ?? null,
    dateTime: formatDateRange(start, end),
    createdAt: activity.createdAt?.toISOString() ?? null,
    location: activity.diaDiem,
    participants,
    participantRegistrations,
    feedbackLogs,
    participantsCount: registeredCount,
    capacity: capacityLabel,
    maxCapacity: activity.sucChuaToiDa,
    coverImage:
      coverMeta?.url ??
      (typeof activity.hinhAnh === "string" ? activity.hinhAnh : null),
    coverImageMeta: coverMeta,
    pointGroup,
    pointGroupLabel,
    isFeatured: activity.isFeatured,
    isPublished: activity.isPublished,
    approvalStatus: activity.trangThaiDuyet,
    semester: semesterLabel,
    academicYear: academicYearLabel,
    semesterDisplay,
    semesterId: semesterRef?.id ?? null,
    academicYearId: academicYearRef?.id ?? null,
    semesterStartDate: semesterRef?.batDau?.toISOString() ?? null,
    semesterEndDate: semesterRef?.ketThuc?.toISOString() ?? null,
    academicYearStartDate: academicYearRef?.batDau?.toISOString() ?? null,
    academicYearEndDate: academicYearRef?.ketThuc?.toISOString() ?? null,
    attendanceMethod,
    attendanceMethodLabel,
    registrationDeadline: activity.hanDangKy?.toISOString() ?? null,
    cancellationDeadline: activity.hanHuyDangKy?.toISOString() ?? null,
    requiresFaceEnrollment: attendanceMethod === "photo",
    faceEnrollment,
    state: determineState(activity, registration),
    registration: mapRegistration(registration, activity),
  };
};

const buildActivityResponse = async (activityId, userId) => {
  const [activity, registration, faceProfile] = await Promise.all([
    prisma.hoatDong.findUnique({
      where: { id: activityId },
      include: ACTIVITY_INCLUDE,
    }),
    userId
      ? prisma.dangKyHoatDong.findUnique({
          where: {
            nguoiDungId_hoatDongId: {
              nguoiDungId: userId,
              hoatDongId: activityId,
            },
          },
          include: REGISTRATION_INCLUDE,
        })
      : null,
    userId
      ? prisma.faceProfile.findUnique({ where: { nguoiDungId: userId } })
      : null,
  ]);

  if (!activity) return null;
  const faceEnrollment = summarizeFaceProfile(faceProfile);
  return mapActivity(activity, registration, { faceEnrollment });
};

/**
 * Map activity summary cho registration detail.
 * @param {Object} activity - Activity object từ database.
 * @param {Object} [options] - Options bổ sung.
 * @param {number} [options.participantCount] - Số lượng đã đăng ký (tính trước nếu cần).
 * @returns {Object|null} Activity summary object.
 */
const mapActivitySummaryForRegistration = (activity, options = {}) => {
  if (!activity) return null;
  const defaultAttendanceMethod = getDefaultAttendanceMethod();
  const attendanceSource =
    activity.phuongThucDiemDanh || defaultAttendanceMethod;
  const attendanceMethod =
    mapAttendanceMethodToApi(attendanceSource) ||
    mapAttendanceMethodToApi(defaultAttendanceMethod);
  const attendanceMethodLabel =
    getAttendanceMethodLabel(attendanceMethod) ||
    getAttendanceMethodLabel(mapAttendanceMethodToApi(defaultAttendanceMethod));

  // Số lượng tối đa được phép tham gia
  const maxParticipants = activity.sucChuaToiDa ?? null;

  // Số lượng đã đăng ký (từ options hoặc từ activity._count nếu có)
  const participantCount =
    options.participantCount ??
    activity._count?.dangKy ??
    activity.participantCount ??
    null;

  return {
    id: activity.id,
    title: activity.tieuDe,
    points: activity.diemCong ?? 0,
    pointGroup: normalizePointGroup(activity.nhomDiem),
    pointGroupLabel: getPointGroupLabel(activity.nhomDiem),
    startTime: activity.batDauLuc?.toISOString() ?? null,
    endTime: activity.ketThucLuc?.toISOString() ?? null,
    location: activity.diaDiem ?? null,
    attendanceMethod,
    attendanceMethodLabel,
    maxParticipants,
    participantCount,
  };
};

const sanitizeStatusFilter = (value, allowed) =>
  allowed.includes(value) ? value : undefined;

export {
  ACTIVE_REG_STATUSES,
  REGISTRATION_STATUSES,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  ACTIVITY_INCLUDE,
  REGISTRATION_INCLUDE,
  ADMIN_REGISTRATION_INCLUDE,
  REGISTRATION_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  FACE_MATCH_LABELS,
  DEFAULT_REGISTRATION_PAGE_SIZE,
  MAX_REGISTRATION_PAGE_SIZE,
  ADMIN_STATUS_MAP,
  normalizePageNumber,
  normalizePageSize,
  sanitizeOptionalText,
  sanitizeStringArray,
  sanitizeRichText,
  sanitizePoints,
  sanitizeCapacity,
  toDate,
  sanitizeAttendanceEvidence,
  sanitizeFeedbackAttachmentList,
  buildRegistrationSearchCondition,
  formatDateRange,
  mapAttendanceEntry,
  mapFeedback,
  computeCheckoutAvailableAt,
  computeFeedbackWindow,
  mapRegistration,
  processActivityCover,
  determineState,
  mapActivity,
  buildActivityResponse,
  mapActivitySummaryForRegistration,
  sanitizeStatusFilter,
  summarizeFaceHistoryRaw,
  summarizeFaceHistoryMapped,
  mapParticipants,
  mapStudentProfile,
  normalizeAttachments,
  assertAdmin,
  ACTIVITY_BUCKET_SET,
  ATTENDANCE_BUCKET_SET,
  FEEDBACK_BUCKET_SET,
  sanitizeActivityCoverMetadata,
  mapActivityCover,
  mapAttendanceEvidence,
  sanitizeAttendanceEvidenceMetadata,
  mapFeedbackAttachments,
  USER_PUBLIC_FIELDS,
};
