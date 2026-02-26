import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { env } from "../env.js";
import { sendMail } from "../utils/mailer.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const cookieOpts = {
  httpOnly: true,
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const RESET_TOKEN_TTL_MINUTES = 15;

const buildForgotPasswordResponse = (message, otp) => {
  if (otp && env.NODE_ENV !== "production") {
    return { message, otp };
  }
  return { message };
};

/**
 * Đăng nhập người dùng.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  const user = await prisma.nguoiDung.findUnique({ where: { email } });
  if (!user || !user.isActive)
    return res.status(401).json({ error: "Thông tin đăng nhập không hợp lệ" });

  const ok = await bcrypt.compare(password, user.matKhau);
  if (!ok)
    return res.status(401).json({ error: "Thông tin đăng nhập không hợp lệ" });

  // Cập nhật thời gian đăng nhập cuối
  prisma.nguoiDung
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch((err) => console.error("Failed to update lastLoginAt:", err));

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.vaiTro,
    name: user.hoTen,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user.id });

  res.cookie("refresh_token", refreshToken, cookieOpts);
  return res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.hoTen,
      role: user.vaiTro,
      studentId: user.maSV,
      dateOfBirth: user.ngaySinh,
      phone: user.soDT,
    },
  });
});

/**
 * Lấy thông tin người dùng hiện tại (Me).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const me = asyncHandler(async (req, res) => {
  const user = await prisma.nguoiDung.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      email: true,
      hoTen: true,
      vaiTro: true,
      maSV: true,
      ngaySinh: true,
      soDT: true,
      gioiTinh: true,
      avatarUrl: true,
      lopHoc: {
        select: {
          maLop: true,
          nganhHoc: {
            select: {
              khoa: {
                select: {
                  maKhoa: true,
                },
              },
            },
          },
        },
      },
      khoa: {
        select: {
          maKhoa: true,
        },
      },
    },
  });
  if (!user) return res.status(404).json({ error: "User không tồn tại" });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.hoTen,
      role: user.vaiTro,
      studentCode: user.maSV,
      dateOfBirth: user.ngaySinh,
      phoneNumber: user.soDT,
      gender: user.gioiTinh,
      classCode: user.lopHoc?.maLop,
      departmentCode: user.khoa?.maKhoa || user.lopHoc?.nganhHoc?.khoa?.maKhoa,
      avatarUrl: user.avatarUrl,
    },
  });
});

/**
 * Làm mới access token bằng refresh token.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });
  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.nguoiDung.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ error: "User không hợp lệ" });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.vaiTro,
      name: user.hoTen,
    });
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Refresh token không hợp lệ" });
  }
});

/**
 * Đăng xuất người dùng.
 * @param {Object} _req - Express request object.
 * @param {Object} res - Express response object.
 */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("refresh_token", { ...cookieOpts, maxAge: 0 });
  res.json({ message: "Đã đăng xuất" });
});

/**
 * Yêu cầu đặt lại mật khẩu (Gửi OTP).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();

  const user = await prisma.nguoiDung.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res
      .status(404)
      .json({ error: "Không tìm thấy tài khoản với email này" });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.nguoiDung.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedOtp,
      resetPasswordTokenExpiresAt: expiresAt,
    },
  });

  // Gửi OTP qua email
  try {
    await sendMail({
      to: email,
      subject: "Mã xác thực đặt lại mật khẩu - HUIT Social Credits",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0056b3;">Yêu cầu đặt lại mật khẩu</h2>
          <p>Xin chào ${user.hoTen},</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản HUIT Social Credits.</p>
          <p>Mã xác thực (OTP) của bạn là:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>Mã này sẽ hết hạn sau ${RESET_TOKEN_TTL_MINUTES} phút.</p>
          <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">Đây là email tự động, vui lòng không trả lời.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return res
      .status(500)
      .json({ error: "Không thể gửi email xác thực. Vui lòng thử lại sau." });
  }

  return res.json(
    buildForgotPasswordResponse(
      `Mã xác nhận đã được gửi tới ${email}. Mã có hiệu lực trong ${RESET_TOKEN_TTL_MINUTES} phút.`,
      otp,
    ),
  );
});

/**
 * Xác thực mã OTP đặt lại mật khẩu.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const otp = req.body?.otp?.trim();

  const user = await prisma.nguoiDung.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res
      .status(404)
      .json({ error: "Không tìm thấy tài khoản với email này" });
  }

  if (!user.resetPasswordToken || !user.resetPasswordTokenExpiresAt) {
    return res
      .status(400)
      .json({ error: "Mã xác nhận không hợp lệ hoặc đã hết hạn" });
  }

  if (user.resetPasswordTokenExpiresAt < new Date()) {
    return res.status(400).json({ error: "Mã xác nhận đã hết hạn" });
  }

  const isValid = await bcrypt.compare(otp, user.resetPasswordToken);
  if (!isValid) {
    return res.status(400).json({ error: "Mã xác nhận không đúng" });
  }

  return res.json({ message: "Mã xác nhận hợp lệ" });
});

/**
 * Đặt lại mật khẩu mới bằng OTP.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const otp = req.body?.otp?.trim();
  const newPassword = req.body?.newPassword;

  const user = await prisma.nguoiDung.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res
      .status(404)
      .json({ error: "Không tìm thấy tài khoản với email này" });
  }

  if (!user.resetPasswordToken || !user.resetPasswordTokenExpiresAt) {
    return res
      .status(400)
      .json({ error: "Mã xác nhận không hợp lệ hoặc đã hết hạn" });
  }

  if (user.resetPasswordTokenExpiresAt < new Date()) {
    return res.status(400).json({ error: "Mã xác nhận đã hết hạn" });
  }

  const isValid = await bcrypt.compare(otp, user.resetPasswordToken);
  if (!isValid) {
    return res.status(400).json({ error: "Mã xác nhận không đúng" });
  }

  // Validate độ dài mật khẩu mới
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
    newPassword,
  );
  if (
    !newPassword ||
    newPassword.length < 6 ||
    !hasUppercase ||
    !hasSpecialChar
  ) {
    return res
      .status(400)
      .json({
        error:
          "Mật khẩu phải có ít nhất 6 ký tự, 1 chữ hoa và 1 ký tự đặc biệt",
      });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.nguoiDung.update({
    where: { id: user.id },
    data: {
      matKhau: hashedPassword,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
    },
  });

  return res.json({ message: "Đặt lại mật khẩu thành công" });
});

/**
 * Đổi mật khẩu (đã đăng nhập).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const { currentPassword, newPassword } = req.body || {};

  if (!userId) {
    return res.status(401).json({ error: "Không được phép" });
  }

  const user = await prisma.nguoiDung.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "Người dùng không tồn tại" });
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.matKhau,
  );
  if (!isCurrentPasswordValid) {
    return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.nguoiDung.update({
    where: { id: userId },
    data: { matKhau: hashedPassword },
  });

  return res.json({ message: "Đổi mật khẩu thành công" });
});
