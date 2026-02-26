import prisma from "../prisma.js";
import { env } from "../env.js";
import {
  FACE_MATCH_CONSTANTS,
  normalizeDescriptorCollection,
  summarizeFaceProfile,
} from "../utils/face.js";
import {
  isSupabaseConfigured,
  removeFiles,
  uploadBase64Image,
} from "../utils/supabaseStorage.js";
import {
  extractStoragePaths,
  sanitizeStorageList,
} from "../utils/storageMapper.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const MIN_DESCRIPTOR_COUNT = 3;
const MAX_FACE_SAMPLES = 5;
const FACE_SAMPLE_BUCKET = env.SUPABASE_FACE_BUCKET;
const FACE_SAMPLE_BUCKET_SET = new Set([FACE_SAMPLE_BUCKET].filter(Boolean));

// Chuẩn hóa đoạn đường dẫn (chỉ cho phép chữ cái, số, gạch dưới)
const sanitizePathSegment = (value, fallback = "user") => {
  if (!value) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  const normalized = trimmed.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
  return normalized || fallback;
};

// Trích xuất data URL ảnh từ giá trị đầu vào
const extractSampleDataUrl = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.startsWith("data:image") ? trimmed : null;
  }
  if (typeof value === "object") {
    const dataUrl =
      typeof value.dataUrl === "string" ? value.dataUrl.trim() : null;
    return dataUrl && dataUrl.startsWith("data:image") ? dataUrl : null;
  }
  return null;
};

// Chuẩn hóa danh sách mẫu khuôn mặt
const sanitizeFaceSamples = (value) =>
  sanitizeStorageList(value, {
    allowedBuckets: FACE_SAMPLE_BUCKET_SET,
    fallbackBucket: FACE_SAMPLE_BUCKET,
    limit: MAX_FACE_SAMPLES,
  });

// Lưu mẫu khuôn mặt lên Supabase Storage
const storeFaceSamples = async (userId, dataUrls) => {
  if (!dataUrls.length) return [];
  if (!isSupabaseConfigured()) {
    const error = new Error("SUPABASE_NOT_CONFIGURED");
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }

  const prefix = `face-profiles/${sanitizePathSegment(userId)}`;
  const uploads = [];
  try {
    for (let index = 0; index < dataUrls.length; index += 1) {
      const dataUrl = dataUrls[index];
      const upload = await uploadBase64Image({
        dataUrl,
        bucket: FACE_SAMPLE_BUCKET,
        pathPrefix: prefix,
        fileName: `sample-${Date.now()}-${index + 1}`,
        metadata: { cacheControl: "604800" },
      });
      uploads.push(upload);
    }
    return uploads;
  } catch (error) {
    // Xóa các ảnh đã upload nếu có lỗi
    const uploadedPaths = extractStoragePaths(uploads);
    if (uploadedPaths.length) {
      await removeFiles(FACE_SAMPLE_BUCKET, uploadedPaths);
    }
    throw error;
  }
};

/**
 * Lấy hồ sơ khuôn mặt của người dùng hiện tại.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getMyFaceProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId)
    return res.status(401).json({ error: "Không xác định được người dùng" });

  const profile = await prisma.faceProfile.findUnique({
    where: { nguoiDungId: userId },
  });
  const summary = summarizeFaceProfile(profile);
  const storedSamples = sanitizeFaceSamples(profile?.samples ?? []);

  res.json({
    profile: {
      ...summary,
      thresholds: FACE_MATCH_CONSTANTS,
      samples: storedSamples,
    },
  });
});

export const upsertMyFaceProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId)
    return res.status(401).json({ error: "Không xác định được người dùng" });

  const { descriptors, samples } = req.body || {};
  const normalizedDescriptors = normalizeDescriptorCollection(descriptors);

  if (!normalizedDescriptors.length) {
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp ít nhất 1 mẫu khuôn mặt hợp lệ." });
  }

  if (normalizedDescriptors.length < MIN_DESCRIPTOR_COUNT) {
    return res
      .status(400)
      .json({
        error: `Vui lòng chụp tối thiểu ${MIN_DESCRIPTOR_COUNT} ảnh khuôn mặt rõ nét.`,
      });
  }

  const existing = await prisma.faceProfile.findUnique({
    where: { nguoiDungId: userId },
  });
  const existingSamples = sanitizeFaceSamples(existing?.samples ?? []);

  const incomingDataUrls = Array.isArray(samples)
    ? samples
        .map((item) => extractSampleDataUrl(item))
        .filter(Boolean)
        .slice(0, MAX_FACE_SAMPLES)
    : [];

  if (Array.isArray(samples) && samples.length && !incomingDataUrls.length) {
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp ảnh khuôn mặt hợp lệ." });
  }

  let uploadedSamples = [];
  if (incomingDataUrls.length) {
    try {
      uploadedSamples = await storeFaceSamples(userId, incomingDataUrls);
    } catch (error) {
      console.error("Không thể lưu ảnh hồ sơ khuôn mặt:", error);
      if (error.code === "SUPABASE_NOT_CONFIGURED") {
        return res
          .status(500)
          .json({
            error:
              "Dịch vụ lưu trữ chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
          });
      }
      return res
        .status(500)
        .json({ error: "Không thể lưu ảnh khuôn mặt. Vui lòng thử lại." });
    }
  }

  const sanitizedUploadedSamples = sanitizeFaceSamples(uploadedSamples);
  const payload = {
    descriptors: normalizedDescriptors,
    samples: sanitizedUploadedSamples.length
      ? sanitizedUploadedSamples
      : existingSamples.length
        ? existingSamples
        : null,
  };

  const cleanupTargets = sanitizedUploadedSamples.length
    ? extractStoragePaths(existingSamples)
    : [];
  let profile;
  try {
    if (existing) {
      profile = await prisma.faceProfile.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      profile = await prisma.faceProfile.create({
        data: { ...payload, nguoiDungId: userId },
      });
    }
  } catch (error) {
    if (sanitizedUploadedSamples.length) {
      const uploadedPaths = extractStoragePaths(sanitizedUploadedSamples);
      if (uploadedPaths.length) {
        await removeFiles(FACE_SAMPLE_BUCKET, uploadedPaths);
      }
    }
    throw error;
  }

  if (cleanupTargets.length) {
    removeFiles(FACE_SAMPLE_BUCKET, cleanupTargets);
  }

  const summary = summarizeFaceProfile(profile);
  const storedSamples = sanitizeFaceSamples(profile?.samples ?? []);
  res.json({
    message: "Đã cập nhật hồ sơ khuôn mặt.",
    profile: {
      ...summary,
      thresholds: FACE_MATCH_CONSTANTS,
      samples: storedSamples,
    },
  });
});
