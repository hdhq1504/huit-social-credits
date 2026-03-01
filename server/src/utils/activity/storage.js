import { env } from "../../env.js";
import { uploadBase64Image, isSupabaseConfigured } from "../supabaseStorage.js";
import {
  sanitizeStorageMetadata,
  sanitizeStorageList,
  mapStorageForResponse,
  mapStorageListForResponse,
} from "../storageMapper.js";
import {
  ACTIVITY_BUCKET_SET,
  ATTENDANCE_BUCKET_SET,
  FEEDBACK_BUCKET_SET,
} from "./constants.js";

export const sanitizeActivityCoverMetadata = (value) =>
  sanitizeStorageMetadata(value, {
    allowedBuckets: ACTIVITY_BUCKET_SET,
    fallbackBucket: env.SUPABASE_ACTIVITY_BUCKET,
  });

export const mapActivityCover = (value) =>
  mapStorageForResponse(value, {
    fallbackBucket: env.SUPABASE_ACTIVITY_BUCKET,
  });

export const mapAttendanceEvidence = (value) =>
  mapStorageForResponse(value, {
    fallbackBucket: env.SUPABASE_ATTENDANCE_BUCKET,
  });

export const sanitizeAttendanceEvidenceMetadata = (value) =>
  sanitizeStorageMetadata(value, {
    allowedBuckets: ATTENDANCE_BUCKET_SET,
    fallbackBucket: env.SUPABASE_ATTENDANCE_BUCKET,
  });

export const mapFeedbackAttachments = (value) =>
  mapStorageListForResponse(value, {
    fallbackBucket: env.SUPABASE_FEEDBACK_BUCKET,
  });

export const sanitizeFeedbackAttachmentList = (value) =>
  sanitizeStorageList(value, {
    allowedBuckets: FEEDBACK_BUCKET_SET,
    fallbackBucket: env.SUPABASE_FEEDBACK_BUCKET,
    limit: 10,
  });

/**
 * Xử lý ảnh bìa hoạt động (upload, xóa, giữ nguyên).
 * @param {Object} params - Tham số đầu vào.
 * @param {string} params.activityId - ID hoạt động.
 * @param {Object} params.payload - Dữ liệu ảnh mới (hoặc null để xóa).
 * @param {Object} params.existing - Metadata ảnh hiện tại.
 * @returns {Promise<Object>} Metadata mới và danh sách file cần xóa.
 */
export const processActivityCover = async ({
  activityId,
  payload,
  existing,
}) => {
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
