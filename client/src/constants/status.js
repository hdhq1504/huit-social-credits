/**
 * Status constants for various entities
 */

// Activity status
export const ACTIVITY_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ACTIVITY_STATUS_LABELS = {
  [ACTIVITY_STATUS.UPCOMING]: 'Sắp diễn ra',
  [ACTIVITY_STATUS.ONGOING]: 'Đang diễn ra',
  [ACTIVITY_STATUS.COMPLETED]: 'Đã kết thúc',
  [ACTIVITY_STATUS.CANCELLED]: 'Đã hủy',
};

export const ACTIVITY_STATUS_COLORS = {
  [ACTIVITY_STATUS.UPCOMING]: 'blue',
  [ACTIVITY_STATUS.ONGOING]: 'green',
  [ACTIVITY_STATUS.COMPLETED]: 'default',
  [ACTIVITY_STATUS.CANCELLED]: 'red',
};

// Approval status
export const APPROVAL_STATUS = {
  PENDING: 'CHO_DUYET',
  APPROVED: 'DA_DUYET',
  REJECTED: 'BI_TU_CHOI',
};

export const APPROVAL_STATUS_LABELS = {
  [APPROVAL_STATUS.PENDING]: 'Chờ duyệt',
  [APPROVAL_STATUS.APPROVED]: 'Đã duyệt',
  [APPROVAL_STATUS.REJECTED]: 'Bị từ chối',
};

export const APPROVAL_STATUS_COLORS = {
  [APPROVAL_STATUS.PENDING]: 'orange',
  [APPROVAL_STATUS.APPROVED]: 'green',
  [APPROVAL_STATUS.REJECTED]: 'red',
};

// Registration status
export const REGISTRATION_STATUS = {
  REGISTERED: 'registered',
  ATTENDED: 'attended',
  CANCELLED: 'cancelled',
  SCORED: 'scored',
};

export const REGISTRATION_STATUS_LABELS = {
  [REGISTRATION_STATUS.REGISTERED]: 'Đã đăng ký',
  [REGISTRATION_STATUS.ATTENDED]: 'Đã điểm danh',
  [REGISTRATION_STATUS.CANCELLED]: 'Đã hủy',
  [REGISTRATION_STATUS.SCORED]: 'Đã chấm điểm',
};

// Point groups
export const POINT_GROUPS = {
  DANH_GIA_VE_Y_THUC: 1,
  DANH_GIA_VE_HOC_TAP: 2,
  DANH_GIA_VE_THE_LUC: 3,
  DANH_GIA_VE_TINH_NGUYEN: 4,
  DANH_GIA_VE_HOI_NHAP: 5,
};

export const POINT_GROUP_LABELS = {
  [POINT_GROUPS.DANH_GIA_VE_Y_THUC]: 'Đánh giá về ý thức',
  [POINT_GROUPS.DANH_GIA_VE_HOC_TAP]: 'Đánh giá về học tập',
  [POINT_GROUPS.DANH_GIA_VE_THE_LUC]: 'Đánh giá về thể lực',
  [POINT_GROUPS.DANH_GIA_VE_TINH_NGUYEN]: 'Đánh giá về tình nguyện',
  [POINT_GROUPS.DANH_GIA_VE_HOI_NHAP]: 'Đánh giá về hội nhập',
};
