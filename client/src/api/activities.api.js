import http from '@utils/http';

export const ACTIVITIES_QUERY_KEY = ['activities'];
export const MY_ACTIVITIES_QUERY_KEY = [...ACTIVITIES_QUERY_KEY, 'mine'];
export const DASHBOARD_QUERY_KEY = ['dashboard'];

export const activitiesApi = {
  /**
   * Lấy danh sách hoạt động.
   * @returns {Promise<Array>} Danh sách hoạt động.
   */
  async list() {
    const { data } = await http.get('/activities');
    return data.activities ?? [];
  },

  /**
   * Lấy danh sách hoạt động gần đây (giới hạn 5, sắp xếp theo cập nhật mới nhất).
   * @returns {Promise<Array>} Danh sách 5 hoạt động cập nhật gần nhất.
   */
  async getRecent() {
    const { data } = await http.get('/activities', {
      params: {
        limit: 5,
        sort: 'updatedAt:desc',
      },
    });
    const activities = data.activities ?? [];
    // Auto-derive type: if updatedAt > createdAt, it's an update
    return activities.map((activity) => {
      const created = new Date(activity.createdAt).getTime();
      const updated = new Date(activity.updatedAt || activity.createdAt).getTime();
      // Consider as UPDATED if updatedAt is more than 5 seconds after createdAt
      const type = updated - created > 5000 ? 'UPDATED' : 'CREATED';
      return { ...activity, type };
    });
  },

  /**
   * Lấy chi tiết hoạt động.
   * @param {string|number} id - ID hoạt động.
   * @returns {Promise<Object>} Thông tin chi tiết hoạt động.
   */
  async detail(id) {
    const { data } = await http.get(`/activities/${id}`);
    return data.activity;
  },

  /**
   * Tạo hoạt động mới.
   * @param {Object} activityData - Dữ liệu hoạt động.
   * @returns {Promise<Object>} Hoạt động vừa tạo.
   */
  async create(activityData) {
    const { data } = await http.post('/activities', activityData);
    return data.activity;
  },

  /**
   * Cập nhật hoạt động.
   * @param {string|number} id - ID hoạt động.
   * @param {Object} activityData - Dữ liệu cập nhật.
   * @returns {Promise<Object>} Hoạt động đã cập nhật.
   */
  async update(id, activityData) {
    const { data } = await http.put(`/activities/${id}`, activityData);
    return data.activity;
  },

  /**
   * Xóa hoạt động.
   * @param {string|number} id - ID hoạt động.
   * @returns {Promise<Object>} Kết quả xóa.
   */
  async remove(id) {
    const { data } = await http.delete(`/activities/${id}`);
    return data;
  },

  /**
   * Đăng ký tham gia hoạt động.
   * @param {string|number} activityId - ID hoạt động.
   * @param {Object} payload - Dữ liệu bổ sung (nếu có).
   * @returns {Promise<Object>} Thông tin hoạt động sau khi đăng ký.
   */
  async register(activityId, payload = {}) {
    const { data } = await http.post(`/activities/${activityId}/registrations`, payload);
    return data.activity;
  },

  /**
   * Hủy đăng ký tham gia hoạt động.
   * @param {string|number} activityId - ID hoạt động.
   * @param {Object} payload - Dữ liệu bổ sung (nếu có).
   * @returns {Promise<Object>} Thông tin hoạt động sau khi hủy.
   */
  async cancel(activityId, payload = {}) {
    const { data } = await http.post(`/activities/${activityId}/registrations/cancel`, payload);
    return data.activity;
  },

  /**
   * Điểm danh hoạt động.
   * @param {string|number} activityId - ID hoạt động.
   * @param {Object} payload - Dữ liệu điểm danh (mã QR, vị trí...).
   * @returns {Promise<Object>} Kết quả điểm danh.
   */
  async attendance(activityId, payload = {}) {
    const { data } = await http.post(`/activities/${activityId}/attendance`, payload);
    return data;
  },

  /**
   * Gửi phản hồi cho hoạt động.
   * @param {string|number} activityId - ID hoạt động.
   * @param {Object} payload - Nội dung phản hồi.
   * @returns {Promise<Object>} Kết quả gửi phản hồi.
   */
  async feedback(activityId, payload = {}) {
    const { data } = await http.post(`/activities/${activityId}/feedback`, payload);
    return data;
  },

  /**
   * Duyệt hoạt động (Admin/Giảng viên).
   * @param {string|number} id - ID hoạt động.
   * @returns {Promise<Object>} Kết quả duyệt.
   */
  async approve(id) {
    const { data } = await http.put(`/activities/${id}/approve`);
    return data;
  },

  /**
   * Từ chối hoạt động (Admin/Giảng viên).
   * @param {string|number} id - ID hoạt động.
   * @param {string} reason - Lý do từ chối.
   * @returns {Promise<Object>} Kết quả từ chối.
   */
  async reject(id, reason) {
    const { data } = await http.put(`/activities/${id}/reject`, { reason });
    return data;
  },

  /**
   * Lấy danh sách hoạt động của tôi (đã đăng ký/tham gia).
   * @param {Object} params - Tham số truy vấn.
   * @returns {Promise<Array>} Danh sách đăng ký của tôi.
   */
  async listMine(params = {}) {
    const { data } = await http.get('/activities/my', { params });
    return data.registrations ?? [];
  },
};

export default activitiesApi;
