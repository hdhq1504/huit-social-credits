import prisma from "../../prisma.js";
import { env } from "../../env.js";
import { notifyUser } from "../../utils/notification.service.js";
import {
  evaluateFaceMatch,
  FACE_MATCH_CONSTANTS,
  normalizeDescriptor,
  normalizeDescriptorCollection,
} from "../../utils/face.js";
import {
  uploadBase64Image,
  buildAttendancePath,
  isSupabaseConfigured,
} from "../../utils/supabaseStorage.js";
import {
  buildActivityResponse,
  sanitizeOptionalText,
  sanitizeAttendanceEvidence,
  summarizeFaceHistoryRaw,
} from "../../utils/activity.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const markAttendance = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const { id: activityId } = req.params;
  const {
    note,
    status,
    evidence,
    phase,
    faceDescriptor,
    faceDescriptors,
    faceError,
  } = req.body || {};

  const user = await prisma.nguoiDung.findUnique({
    where: { id: userId },
    select: { id: true, email: true, hoTen: true },
  });
  if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

  const registration = await prisma.dangKyHoatDong.findUnique({
    where: {
      nguoiDungId_hoatDongId: { nguoiDungId: userId, hoatDongId: activityId },
    },
    include: {
      hoatDong: true,
      lichSuDiemDanh: { orderBy: { taoLuc: "asc" } },
    },
  });

  if (!registration || registration.trangThai === "DA_HUY") {
    return res
      .status(404)
      .json({ error: "Bạn chưa đăng ký hoạt động này hoặc đã hủy trước đó" });
  }

  const activity = registration.hoatDong;
  if (!activity) {
    return res.status(404).json({ error: "Hoạt động không tồn tại" });
  }

  const startTime = activity.batDauLuc ? new Date(activity.batDauLuc) : null;
  const endTime = activity.ketThucLuc ? new Date(activity.ketThucLuc) : null;
  const now = new Date();

  if (!startTime) {
    return res
      .status(400)
      .json({
        error: "Hoạt động chưa có thời gian bắt đầu, không thể điểm danh",
      });
  }

  if (now < startTime) {
    return res
      .status(400)
      .json({ error: "Hoạt động chưa diễn ra, bạn không thể điểm danh" });
  }

  if (endTime && now > endTime) {
    return res
      .status(400)
      .json({ error: "Hoạt động đã kết thúc, bạn không thể điểm danh" });
  }

  const normalizedPhase =
    typeof phase === "string" && phase.toLowerCase() === "checkout"
      ? "checkout"
      : "checkin";
  const isCheckout = normalizedPhase === "checkout";

  const history = registration.lichSuDiemDanh ?? [];
  const checkinEntries = history.filter((entry) => entry.loai === "CHECKIN");
  const hasCheckin = checkinEntries.length > 0;
  const hasCheckout = history.some((entry) => entry.loai === "CHECKOUT");

  if (!isCheckout && hasCheckin) {
    return res
      .status(409)
      .json({ error: "Bạn đã điểm danh đầu giờ cho hoạt động này" });
  }

  if (isCheckout && !hasCheckin) {
    return res
      .status(400)
      .json({
        error: "Bạn cần điểm danh đầu giờ trước khi điểm danh cuối giờ",
      });
  }

  if (isCheckout && hasCheckout) {
    return res
      .status(409)
      .json({ error: "Bạn đã điểm danh cuối giờ cho hoạt động này" });
  }

  let faceProfile = await prisma.faceProfile.findUnique({
    where: { nguoiDungId: userId },
  });
  if (!faceProfile) {
    return res.status(409).json({
      error:
        "Bạn chưa đăng ký khuôn mặt. Vui lòng đăng ký trong trang Thông tin sinh viên trước khi điểm danh.",
    });
  }

  const normalizedNote = sanitizeOptionalText(note);
  const sanitizedEvidence = sanitizeAttendanceEvidence(evidence);
  let storedEvidence = null;
  if (sanitizedEvidence.metadata) {
    storedEvidence = sanitizedEvidence.metadata;
  } else if (sanitizedEvidence.data) {
    if (!isSupabaseConfigured()) {
      return res
        .status(500)
        .json({ error: "Dịch vụ lưu trữ chưa được cấu hình" });
    }
    try {
      const uploadResult = await uploadBase64Image({
        dataUrl: sanitizedEvidence.data,
        bucket: env.SUPABASE_ATTENDANCE_BUCKET,
        pathPrefix: buildAttendancePath({ userId, activityId }),
        fileName: sanitizedEvidence.fileName,
      });
      storedEvidence = {
        ...uploadResult,
        mimeType: sanitizedEvidence.mimeType ?? uploadResult.mimeType,
        fileName: sanitizedEvidence.fileName ?? uploadResult.fileName,
      };
    } catch (error) {
      console.error("Không thể lưu ảnh điểm danh lên Supabase:", error);
      return res
        .status(500)
        .json({ error: "Không thể lưu ảnh điểm danh. Vui lòng thử lại." });
    }
  }

  if (!storedEvidence) {
    return res
      .status(400)
      .json({ error: "Vui lòng chụp hoặc tải lên ảnh điểm danh." });
  }

  let descriptorSource = null;
  let normalizedDescriptor = null;
  const directDescriptor = normalizeDescriptor(faceDescriptor);
  if (directDescriptor) {
    normalizedDescriptor = directDescriptor;
    descriptorSource = "faceDescriptor";
  } else {
    const descriptorCollection = normalizeDescriptorCollection(faceDescriptors);
    if (descriptorCollection.length) {
      normalizedDescriptor = descriptorCollection[0];
      descriptorSource = "faceDescriptors";
    }
  }

  let faceMatchResult = null;
  let referenceDescriptors = normalizeDescriptorCollection(
    faceProfile?.descriptors || [],
  );

  if (faceError) {
    faceMatchResult = { status: "REVIEW", score: null, reason: "client_error" };
  } else if (!referenceDescriptors.length) {
    faceMatchResult = {
      status: "REVIEW",
      score: null,
      reason: "empty_profile",
    };
  } else if (!normalizedDescriptor) {
    faceMatchResult = {
      status: "REVIEW",
      score: null,
      reason: "missing_descriptor",
    };
  } else {
    faceMatchResult = evaluateFaceMatch({
      descriptor: normalizedDescriptor,
      profileDescriptors: referenceDescriptors,
    });
  }

  const attendanceTime = new Date();

  const nextHistory = [
    ...history,
    {
      loai: isCheckout ? "CHECKOUT" : "CHECKIN",
      faceMatch: faceMatchResult?.status ?? null,
    },
  ];

  const faceSummary = summarizeFaceHistoryRaw(nextHistory);

  let finalStatus = registration.trangThai;
  let entryStatus = "DANG_KY";

  if (!isCheckout) {
    if (faceMatchResult?.status === "REVIEW") {
      entryStatus = "CHO_DUYET";
    } else {
      finalStatus = "DANG_THAM_GIA";
      entryStatus = "DANG_THAM_GIA";
    }
  } else if (faceSummary?.approvedCount >= 2) {
    finalStatus = "DA_THAM_GIA";
    entryStatus = "DA_THAM_GIA";
  } else if (
    faceSummary?.requiresReview ||
    (faceSummary?.approvedCount || 0) > 0
  ) {
    finalStatus = "CHO_DUYET";
    entryStatus = "CHO_DUYET";
  } else {
    finalStatus = "VANG_MAT";
    entryStatus = "VANG_MAT";
  }

  const registrationUpdate = {
    diemDanhLuc: attendanceTime,
    diemDanhGhiChu: normalizedNote,
    diemDanhBoiId: userId,
  };

  // Cập nhật trạng thái khi checkin hoặc checkout
  if (!isCheckout && finalStatus === "DANG_THAM_GIA") {
    registrationUpdate.trangThai = finalStatus;
  } else if (isCheckout) {
    registrationUpdate.trangThai = finalStatus;
    if (finalStatus === "DA_THAM_GIA") {
      registrationUpdate.duyetLuc = attendanceTime;
    }
  }

  const faceMeta = {
    descriptorSource,
    descriptorLength: normalizedDescriptor?.length ?? null,
    referenceCount: referenceDescriptors.length,
    reason: faceMatchResult?.reason ?? null,
    faceError: faceError ? String(faceError).slice(0, 100) : null,
    matchThreshold: FACE_MATCH_CONSTANTS.MATCH_THRESHOLD,
  };

  await prisma.$transaction([
    prisma.dangKyHoatDong.update({
      where: { id: registration.id },
      data: registrationUpdate,
    }),
    prisma.diemDanhNguoiDung.create({
      data: {
        dangKyId: registration.id,
        nguoiDungId: userId,
        hoatDongId: activityId,
        trangThai: entryStatus,
        loai: isCheckout ? "CHECKOUT" : "CHECKIN",
        ghiChu: normalizedNote,
        anhDinhKem: storedEvidence,
        faceMatch: faceMatchResult?.status ?? null,
        faceScore: faceMatchResult?.score ?? null,
        faceMeta,
      },
    }),
  ]);

  const updated = await buildActivityResponse(activityId, userId);

  let notificationTitle;
  let notificationMessage;
  let notificationType;
  let notificationAction;
  let emailSubject;
  const emailMessageLines = [];
  let responseMessage;

  if (isCheckout) {
    if (finalStatus === "DA_THAM_GIA") {
      responseMessage = "Điểm danh cuối giờ thành công, hệ thống đã cộng điểm";
      notificationTitle = "Điểm danh thành công";
      notificationMessage = `Điểm danh cho hoạt động "${activity.tieuDe}" đã được ghi nhận và cộng điểm.`;
      notificationType = "success";
      notificationAction = "ATTENDED";
      emailSubject = `[HUIT Social Credits] Điểm danh thành công - "${activity.tieuDe}"`;
      emailMessageLines.push(
        `Điểm danh cho hoạt động "${activity.tieuDe}" đã được ghi nhận thành công và cộng điểm.`,
      );
    } else if (finalStatus === "CHO_DUYET") {
      responseMessage =
        "Ảnh điểm danh cần xác minh. Vui lòng chờ ban quản trị duyệt.";
      notificationTitle = "Điểm danh đang chờ duyệt";
      notificationMessage = `Hệ thống cần xác minh ảnh điểm danh của bạn cho hoạt động "${activity.tieuDe}".`;
      notificationType = "warning";
      notificationAction = "ATTENDANCE_REVIEW";
      emailSubject = `[HUIT Social Credits] Điểm danh chờ duyệt - \"${activity.tieuDe}\"`;
      if (faceSummary?.approvedCount === 1) {
        emailMessageLines.push(
          "Hệ thống chỉ nhận diện trùng khớp một trong hai ảnh điểm danh. Ban quản trị sẽ kiểm tra thủ công.",
        );
      } else {
        emailMessageLines.push(
          "Hệ thống chưa thể xác minh tự động ảnh điểm danh. Ban quản trị sẽ kiểm tra thủ công trong thời gian sớm nhất.",
        );
      }
    } else {
      responseMessage = "Đã ghi nhận vắng mặt";
      notificationTitle = "Đã ghi nhận vắng mặt";
      notificationMessage = `Bạn được ghi nhận vắng mặt tại hoạt động "${activity.tieuDe}".`;
      notificationType = "danger";
      notificationAction = "ABSENT";
      emailSubject = `[HUIT Social Credits] Ghi nhận vắng mặt - "${activity.tieuDe}"`;
      emailMessageLines.push(
        `Điểm danh cho hoạt động "${activity.tieuDe}" ghi nhận bạn vắng mặt.`,
      );
    }
  } else {
    if (faceMatchResult?.status === "REVIEW") {
      responseMessage =
        "Đã ghi nhận điểm danh đầu giờ, hệ thống đang chờ xác minh khuôn mặt.";
      notificationTitle = "Điểm danh đầu giờ chờ xác minh";
      notificationMessage = `Ảnh điểm danh đầu giờ của bạn cho hoạt động "${activity.tieuDe}" cần được kiểm tra thêm.`;
      notificationType = "warning";
      notificationAction = "CHECKIN_REVIEW";
      emailSubject = `[HUIT Social Credits] Điểm danh đầu giờ chờ xác minh - "${activity.tieuDe}"`;
      emailMessageLines.push(
        `Hệ thống chưa thể xác nhận tự động ảnh điểm danh đầu giờ cho hoạt động "${activity.tieuDe}". Ban quản trị sẽ xem xét.`,
      );
    } else {
      responseMessage = "Điểm danh đầu giờ thành công";
      notificationTitle = "Đã ghi nhận điểm danh đầu giờ";
      notificationMessage = `Điểm danh đầu giờ cho hoạt động "${activity.tieuDe}" đã được ghi nhận.`;
      notificationType = "info";
      notificationAction = "CHECKIN";
      emailSubject = `[HUIT Social Credits] Điểm danh đầu giờ - "${activity.tieuDe}"`;
      emailMessageLines.push(
        `Điểm danh đầu giờ cho hoạt động "${activity.tieuDe}" đã được ghi nhận thành công.`,
      );
    }
  }

  if (normalizedNote) {
    emailMessageLines.push(`Ghi chú: ${normalizedNote}`);
  }

  await notifyUser({
    userId,
    user,
    title: notificationTitle,
    message: notificationMessage,
    type: notificationType,
    data: { activityId, action: notificationAction },
    emailSubject,
    emailMessageLines,
  });

  res.json({
    message: responseMessage,
    activity: updated,
  });
});
