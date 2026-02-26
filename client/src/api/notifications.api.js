import http from '@utils/http';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];
export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = [...NOTIFICATIONS_QUERY_KEY, 'unread-count'];

export const notificationsApi = {
  /**
   * Lấy danh sách thông báo.
   * @param {Object} params - Tham số truy vấn (limit, cursor).
   * @returns {Promise<Object>} { notifications, hasMore, nextCursor }.
   */
  async list(params = {}) {
    const { data } = await http.get('/notifications', { params });
    return {
      notifications: data.notifications ?? [],
      hasMore: data.hasMore ?? false,
      nextCursor: data.nextCursor ?? null,
    };
  },

  /**
   * Lấy số lượng thông báo chưa đọc.
   * @returns {Promise<Object>} Số lượng chưa đọc { count: number }.
   */
  async getUnreadCount() {
    const { data } = await http.get('/notifications/unread-count');
    return data ?? { count: 0 };
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   * @returns {Promise<Object>} Kết quả thực hiện.
   */
  async markAllRead() {
    const { data } = await http.post('/notifications/mark-all-read');
    return data;
  },
};

export default notificationsApi;
