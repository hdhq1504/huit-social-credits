import sanitizeHtml from "sanitize-html";
import { env } from "../../env.js";

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

// ─── Status arrays ───
export const ACTIVE_REG_STATUSES = [
  "DANG_KY",
  "DANG_THAM_GIA",
  "DA_THAM_GIA",
  "CHO_DUYET",
];
export const REGISTRATION_STATUSES = [
  "DANG_KY",
  "DA_HUY",
  "DA_THAM_GIA",
  "VANG_MAT",
  "CHO_DUYET",
];
export const FEEDBACK_STATUSES = ["CHO_DUYET", "DA_DUYET", "BI_TU_CHOI"];

// ─── Status label maps ───
export const FEEDBACK_STATUS_LABELS = {
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đã duyệt",
  BI_TU_CHOI: "Bị từ chối",
};

export const REGISTRATION_STATUS_LABELS = {
  DANG_KY: "Chờ duyệt",
  DA_THAM_GIA: "Đã duyệt",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
  CHO_DUYET: "Chờ duyệt điểm danh",
};

export const ATTENDANCE_STATUS_LABELS = {
  DANG_KY: "Đang xử lý",
  DANG_THAM_GIA: "Đúng giờ",
  DA_THAM_GIA: "Đúng giờ",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
  CHO_DUYET: "Chờ duyệt",
};

export const FACE_MATCH_LABELS = {
  APPROVED: "Khớp khuôn mặt",
  REVIEW: "Cần kiểm tra",
};

export const ADMIN_STATUS_MAP = {
  pending: "DANG_KY",
  approved: "DA_THAM_GIA",
  rejected: "VANG_MAT",
  canceled: "DA_HUY",
};

// ─── Pagination ───
export const DEFAULT_REGISTRATION_PAGE_SIZE = 10;
export const MAX_REGISTRATION_PAGE_SIZE = 50;

// ─── Evidence size ───
export const MAX_ATTENDANCE_EVIDENCE_SIZE = 5_000_000;

// ─── Bucket sets ───
export const ACTIVITY_BUCKET_SET = buildBucketSet(env.SUPABASE_ACTIVITY_BUCKET);
export const ATTENDANCE_BUCKET_SET = buildBucketSet(
  env.SUPABASE_ATTENDANCE_BUCKET,
);
export const FEEDBACK_BUCKET_SET = buildBucketSet(env.SUPABASE_FEEDBACK_BUCKET);

// ─── Prisma select / include configs ───
export const USER_PUBLIC_FIELDS = {
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

export const ACTIVITY_INCLUDE = {
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

export const REGISTRATION_INCLUDE = {
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

export const ADMIN_STUDENT_FIELDS = {
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

export const ADMIN_REGISTRATION_INCLUDE = {
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
      sucChuaToiDa: true,
    },
  },
};

// ─── Rich text sanitization config ───
export const RICH_TEXT_ALLOWED_TAGS = Array.from(
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

export const RICH_TEXT_ALLOWED_ATTRIBUTES = {
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
