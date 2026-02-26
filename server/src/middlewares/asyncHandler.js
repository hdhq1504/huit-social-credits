/**
 * Wrap async route handler để tự động bắt lỗi và chuyển đến error middleware.
 * Loại bỏ boilerplate try-catch trong mỗi controller.
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware với error handling tự động
 *
 * @example
 * // Trước:
 * export async function listUsers(req, res) {
 *   try {
 *     const users = await prisma.nguoiDung.findMany();
 *     res.json(users);
 *   } catch (err) {
 *     res.status(500).json({ error: err.message });
 *   }
 * }
 *
 * // Sau:
 * export const listUsers = asyncHandler(async (req, res) => {
 *   const users = await prisma.nguoiDung.findMany();
 *   res.json(users);
 * });
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
