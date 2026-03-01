import prisma from "../../prisma.js";
import { env } from "../../env.js";
import { notifyUser } from "../../utils/notification.service.js";
import { removeFiles } from "../../utils/supabaseStorage.js";
import {
  buildActivityResponse,
  mapFeedback,
  sanitizeFeedbackAttachmentList,
  computeFeedbackWindow,
} from "../../utils/activity/index.js";
import { extractStoragePaths } from "../../utils/storageMapper.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

/**
 * Gửi phản hồi hoạt động của sinh viên.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const submitActivityFeedback = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const { id: activityId } = req.params;
  const { content, attachments } = req.body || {};

  if (!content || !String(content).trim()) {
    return res
      .status(400)
      .json({ error: "Nội dung phản hồi không được bỏ trống" });
  }

  const user = await prisma.nguoiDung.findUnique({
    where: { id: userId },
    select: { id: true, email: true, hoTen: true },
  });
  if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

  const registration = await prisma.dangKyHoatDong.findUnique({
    where: {
      nguoiDungId_hoatDongId: { nguoiDungId: userId, hoatDongId: activityId },
    },
    include: { phanHoi: true, hoatDong: true, lichSuDiemDanh: true },
  });

  if (!registration || registration.trangThai === "DA_HUY") {
    return res
      .status(404)
      .json({ error: "Bạn chưa đăng ký hoạt động này hoặc đã hủy trước đó" });
  }

  if (registration.trangThai !== "CHO_DUYET") {
    return res.status(400).json({
      error: "Kết quả điểm danh đã được xử lý, không thể gửi phản hồi",
    });
  }

  const history = registration.lichSuDiemDanh || [];
  const hasFaceIssue = history.some((entry) => entry.faceMatch === "REVIEW");

  if (!hasFaceIssue) {
    return res.status(400).json({
      error:
        "Bạn không thuộc diện cần phản hồi minh chứng (không có ảnh cần kiểm tra)",
    });
  }

  const { start, end } = computeFeedbackWindow(
    registration.hoatDong,
    registration,
  );
  const now = new Date();

  // Test
  // if (now < start) {
  //   return res.status(400).json({ error: "Chưa đến thời gian gửi phản hồi (vui lòng chờ 24h sau khi điểm danh)" });
  // }
  // if (now > end) {
  //   return res.status(400).json({ error: "Đã hết hạn gửi phản hồi" });
  // }

  const existingFeedback = registration.phanHoi ?? null;
  const existingAttachments = existingFeedback
    ? sanitizeFeedbackAttachmentList(existingFeedback.minhChung)
    : [];

  const normalizedAttachments = sanitizeFeedbackAttachmentList(attachments);
  if (
    Array.isArray(attachments) &&
    attachments.length &&
    !normalizedAttachments.length
  ) {
    return res.status(400).json({ error: "Danh sách minh chứng không hợp lệ" });
  }

  const incomingPathSet = new Set(extractStoragePaths(normalizedAttachments));
  const removalMap = new Map();
  existingAttachments.forEach((item) => {
    if (!item?.path) return;
    if (incomingPathSet.has(item.path)) return;
    const bucket = item.bucket || env.SUPABASE_FEEDBACK_BUCKET;
    if (!bucket) return;
    if (!removalMap.has(bucket)) {
      removalMap.set(bucket, []);
    }
    removalMap.get(bucket).push(item.path);
  });

  const payload = {
    noiDung: String(content).trim(),
    minhChung: normalizedAttachments,
    trangThai: "CHO_DUYET",
    lydoTuChoi: null,
  };

  let feedback;
  if (existingFeedback) {
    feedback = await prisma.phanHoiHoatDong.update({
      where: { id: existingFeedback.id },
      data: payload,
    });
  } else {
    feedback = await prisma.phanHoiHoatDong.create({
      data: {
        ...payload,
        dangKyId: registration.id,
        nguoiDungId: userId,
        hoatDongId: activityId,
      },
    });
  }

  removalMap.forEach((paths, bucket) => {
    if (paths?.length) {
      removeFiles(bucket, paths);
    }
  });

  const activity = await buildActivityResponse(activityId, userId);
  const activityTitle =
    activity?.title ?? registration.hoatDong?.tieuDe ?? "hoạt động";

  await notifyUser({
    userId,
    user,
    title: "Đã gửi phản hồi hoạt động",
    message: `Phản hồi của bạn cho hoạt động "${activityTitle}" đã được gửi thành công.`,
    type: "info",
    data: { activityId, action: "FEEDBACK_SUBMITTED", feedbackId: feedback.id },
    emailSubject: `[HUIT Social Credits] Xác nhận gửi phản hồi hoạt động "${activityTitle}"`,
    emailMessageLines: [
      `Phản hồi của bạn cho hoạt động "${activityTitle}" đã được gửi thành công.`,
      normalizedAttachments.length
        ? `Số lượng minh chứng: ${normalizedAttachments.length}`
        : null,
    ],
  });

  res.status(201).json({
    message: "Đã gửi phản hồi",
    feedback: mapFeedback(feedback),
    activity,
  });
});
