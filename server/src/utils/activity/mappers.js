import prisma from "../../prisma.js";
import { getPointGroupLabel, normalizePointGroup } from "../points.js";
import { deriveSemesterInfo } from "../academic.js";
import {
  getAttendanceMethodLabel,
  getDefaultAttendanceMethod,
  mapAttendanceMethodToApi,
} from "../attendance.js";
import { summarizeFaceProfile } from "../face.js";
import {
  ACTIVITY_INCLUDE,
  REGISTRATION_INCLUDE,
  REGISTRATION_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  FEEDBACK_STATUS_LABELS,
  FACE_MATCH_LABELS,
} from "./constants.js";
import {
  toDate,
  formatDateRange,
  normalizeSemesterLabel,
  normalizeAcademicYearLabel,
} from "./helpers.js";
import { sanitizeOptionalText } from "./sanitizers.js";
import {
  mapActivityCover,
  mapAttendanceEvidence,
  mapFeedbackAttachments,
} from "./storage.js";

// ─── Student profile ───

export const mapStudentProfile = (user, { includeContact = false } = {}) => {
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

export const mapParticipants = (registrations = []) =>
  registrations
    .filter((reg) => reg.nguoiDung)
    .map((reg) => {
      const student = mapStudentProfile(reg.nguoiDung);
      if (student?.avatarUrl) {
        return { id: student.id, name: student.name, src: student.avatarUrl };
      }
      return { id: student?.id, name: student?.name ?? "Người dùng" };
    });

// ─── Attachments ───

export const normalizeAttachments = (value) => {
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

// ─── Face history ───

export const summarizeFaceHistoryRaw = (entries = []) => {
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

export const summarizeFaceHistoryMapped = (entries = []) => {
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

// ─── Attendance ───

export const mapAttendanceEntry = (entry) => {
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

// ─── Feedback ───

export const mapFeedback = (feedback) => {
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

// ─── Checkout / Feedback window ───

export const computeCheckoutAvailableAt = (activity) => {
  if (!activity) return null;
  const end = toDate(activity.ketThucLuc);
  if (!end) return null;
  const threshold = new Date(end.getTime() - 10 * 60 * 1000);
  return threshold.toISOString();
};

export const computeFeedbackWindow = (activity, registration) => {
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

// ─── Registration ───

export const mapRegistration = (registration, activity) => {
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

// ─── State determination ───

/**
 * Xác định trạng thái hiển thị của hoạt động đối với người dùng.
 * @param {Object} activity - Dữ liệu hoạt động.
 * @param {Object} registration - Dữ liệu đăng ký của user (nếu có).
 * @returns {string} Trạng thái (guest, registered, check_in, check_out, ...).
 */
export const determineState = (activity, registration) => {
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

// ─── Activity mapping ───

/**
 * Map dữ liệu hoạt động sang format API.
 * @param {Object} activity - Dữ liệu hoạt động từ DB.
 * @param {Object} registration - Dữ liệu đăng ký của user (nếu có).
 * @param {Object} options - Các tùy chọn map thêm.
 * @returns {Object|null} Object hoạt động đã format.
 */
export const mapActivity = (activity, registration, options = {}) => {
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
    updatedAt: activity.updatedAt?.toISOString() ?? null,
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

export const buildActivityResponse = async (activityId, userId) => {
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
export const mapActivitySummaryForRegistration = (activity, options = {}) => {
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

  const maxParticipants = activity.sucChuaToiDa ?? null;

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
