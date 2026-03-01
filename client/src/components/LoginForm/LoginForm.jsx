import React, { useState } from 'react';
import classNames from 'classnames/bind';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Checkbox, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import InputField from '../InputField/InputField';
import { authApi } from '@api/auth.api';
import { ROUTE_PATHS } from '@/config/routes.config';
import styles from './LoginForm.module.scss';

const cx = classNames.bind(styles);

/**
 * Component form đăng nhập.
 * Xử lý đăng nhập bằng email/password và điều hướng theo role người dùng.
 *
 * @returns {React.ReactElement} Component LoginForm.
 *
 * @example
 * <LoginForm />
 */
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Mutation đăng nhập sử dụng React Query.
   * Xử lý redirect theo role khi thành công và hiển thị lỗi khi thất bại.
   */
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const user = await authApi.login(email, password);
      return user;
    },
    // Redirect dựa trên role người dùng
    onSuccess: (user) => {
      setIsLoading(false);
      const normalizedRole = user?.role?.toUpperCase();
      if (normalizedRole === 'ADMIN') {
        navigate(ROUTE_PATHS.ADMIN.DASHBOARD, { replace: true });
        return;
      }
      if (normalizedRole === 'GIANGVIEN') {
        navigate(ROUTE_PATHS.TEACHER.CLASSES, { replace: true });
        return;
      }
      navigate(ROUTE_PATHS.PUBLIC.HOME, { replace: true });
    },
    // Xử lý hiển thị lỗi từ server
    onError: (error) => {
      setIsLoading(false);
      const responseData = error?.response?.data;
      // Nếu có lỗi cụ thể theo field, hiển thị tương ứng
      if (responseData?.details) {
        const newErrors = {};
        responseData.details.forEach((err) => {
          newErrors[err.field] = err.message;
        });
        setErrors(newErrors);
      } else {
        // Lỗi chung, hiển thị ở field password
        const message = responseData?.error || responseData?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        setErrors({ password: message });
      }
    },
  });

  /**
   * Handler xử lý submit form đăng nhập.
   */
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className={cx('login-form')}>
      <form className={cx('login-form__card')} onSubmit={handleEmailLogin}>
        <div className={cx('login-form__banner')} style={{ backgroundImage: "url('/images/bialogin.jpg')" }}>
          <p className={cx('login-form__banner-title')}>
            Tra cứu điểm công tác xã hội dễ dàng tại <br />
            <span>HUIT SOCIAL CREDITS</span>
          </p>
        </div>

        <div className={cx('login-form__content')}>
          <p className={cx('login-form__greeting')}>Xin chào bạn !</p>
          <h4 className={cx('login-form__heading')}>Đăng nhập tài khoản</h4>

          <div className={cx('login-form__fields')}>
            <div className={cx('login-form__field')}>
              <InputField
                label="Email"
                placeholder="Nhập Email của bạn"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                disabled={isLoading}
              />
            </div>
            <div className={cx('login-form__field', 'login-form__field--password')}>
              <InputField
                label="Mật khẩu"
                placeholder="Nhập mật khẩu của bạn"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={isLoading}
              />
              <span className={cx('login-form__password-toggle')} onClick={() => setShowPassword(!showPassword)}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </span>
            </div>
          </div>

          <div className={cx('login-form__meta')}>
            <label className={cx('login-form__remember')}>
              <Checkbox className={cx('login-form__checkbox')}>Lưu đăng nhập</Checkbox>
            </label>
            <label className={cx('login-form__forgot')}>
              <FontAwesomeIcon icon={faCircleQuestion} color={'#00008B'} size={'lg'} />
              <Link to="/forgot-password">Quên mật khẩu</Link>
            </label>
          </div>

          <div className={cx('login-form__actions')}>
            <button
              type="submit"
              className={cx('login-form__submit', { 'login-form__submit--loading': isLoading })}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spin indicator={<LoadingOutlined spin />} size="small" />
                  <span>Đăng nhập...</span>
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default LoginForm;
