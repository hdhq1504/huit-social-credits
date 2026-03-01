import sanitizeHtml from "sanitize-html";
import {
  RICH_TEXT_ALLOWED_TAGS,
  RICH_TEXT_ALLOWED_ATTRIBUTES,
  MAX_ATTENDANCE_EVIDENCE_SIZE,
} from "./constants.js";
import { sanitizeAttendanceEvidenceMetadata } from "./storage.js";

export const sanitizeOptionalText = (value, maxLength = 500) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export const sanitizeStringArray = (value, maxLength = 500) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeOptionalText(item, maxLength))
    .filter((item) => typeof item === "string" && item.length > 0);
};

export const sanitizeRichText = (value, maxLength = 20_000) => {
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

export const sanitizePoints = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
};

export const sanitizeCapacity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
};

export const sanitizeAttendanceEvidence = (value) => {
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

export const sanitizeStatusFilter = (value, allowed) =>
  allowed.includes(value) ? value : undefined;
