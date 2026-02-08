/**
 * Toast/notification messages constants
 */

export const MESSAGES = {
  // Success messages
  SUCCESS: {
    CREATE: 'Tạo mới thành công!',
    UPDATE: 'Cập nhật thành công!',
    DELETE: 'Xóa thành công!',
    SAVE: 'Lưu thành công!',
    APPROVE: 'Duyệt thành công!',
    REJECT: 'Từ chối thành công!',
  },

  // Error messages
  ERROR: {
    GENERIC: 'Đã xảy ra lỗi, vui lòng thử lại.',
    NETWORK: 'Lỗi kết nối mạng, vui lòng kiểm tra lại.',
    UNAUTHORIZED: 'Bạn không có quyền thực hiện thao tác này.',
    NOT_FOUND: 'Không tìm thấy dữ liệu.',
    VALIDATION: 'Vui lòng kiểm tra lại thông tin nhập.',
  },

  // Confirmation messages
  CONFIRM: {
    DELETE: 'Bạn có chắc chắn muốn xóa?',
    CANCEL: 'Bạn có chắc chắn muốn hủy?',
    LOGOUT: 'Bạn có chắc chắn muốn đăng xuất?',
  },
};

export const getSuccessMessage = (action, entity = '') => {
  const message = MESSAGES.SUCCESS[action.toUpperCase()];
  return entity ? message.replace('!', ` ${entity}!`) : message;
};

export const getErrorMessage = (error) => {
  return error?.response?.data?.message || MESSAGES.ERROR.GENERIC;
};
