import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import AdminHeader from '../AdminHeader/AdminHeader';
import AdminSidebar from '../AdminSidebar/AdminSidebar';
import AdminBodyContent from '../AdminBodyContent/AdminBodyContent';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import adminRoutes from '@/routes/adminRoutes';
import { ROUTE_PATHS } from '@/config/routes.config';
import useAuthStore from '@/stores/useAuthStore';
import { authApi } from '@/api/auth.api';
import useToast from '@/components/Toast/Toast';
import styles from './AdminLayout.module.scss';

const cx = classNames.bind(styles);

const iconByKey = {
  DashboardOutlined: 'dashboard',
  CalendarOutlined: 'activities',
  TrophyOutlined: 'scoring',
  FileSearchOutlined: 'proof',
  MessageOutlined: 'feedback',
  BarChartOutlined: 'reports',
  TeamOutlined: 'council',
  UserGearOutlined: 'users',
  StudentOutlined: 'students',
  UserTieOutlined: 'lecturers',
  CalendarAltOutlined: 'academics',
  SettingOutlined: 'system',
};

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [pageActions, setPageActions] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState(null);
  const authUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.logout);
  const { contextHolder, open: openToast } = useToast();
  const contextValue = useMemo(() => ({ setPageActions, setBreadcrumbs }), []);

  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const sidebarItems = useMemo(
    () =>
      adminRoutes
        .filter((route) => !route.meta.hideInSidebar)
        .map((route) => ({
          path: `/admin/${route.path}`,
          label: route.meta.label,
          iconKey: iconByKey[route.meta.icon] || 'dashboard',
        })),
    [],
  );

  const defaultLabel = sidebarItems[0]?.label ?? 'Bảng điều khiển';

  const activeItem = useMemo(
    () => sidebarItems.find((item) => location.pathname.startsWith(item.path)),
    [location.pathname, sidebarItems],
  );

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearSession();
      openToast({ message: 'Đã đăng xuất khỏi hệ thống.', variant: 'success' });
      navigate(ROUTE_PATHS.PUBLIC.LOGIN);
    },
    onError: (error) => {
      openToast({ message: error.response?.data?.error || 'Đăng xuất thất bại, vui lòng thử lại.', variant: 'danger' });
    },
  });

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const headerUser = useMemo(
    () => ({
      name: authUser?.fullName || 'Admin',
      email: authUser?.email || 'admin@huit.edu.vn',
      avatarUrl: authUser?.avatarUrl || '',
    }),
    [authUser],
  );

  return (
    <AdminPageContext.Provider value={contextValue}>
      {contextHolder}
      <div className={cx('admin-layout')}>
        <div
          className={`${cx('admin-layout__sidebar')} ${
            isSidebarOpen ? cx('admin-layout__sidebar--open') : cx('admin-layout__sidebar--closed')
          }`}
        >
          <AdminSidebar
            items={sidebarItems}
            activePath={activeItem?.path ?? ''}
            isOpen={isSidebarOpen}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </div>

        <div className={cx('admin-layout__main')}>
          <div className={cx('admin-layout__header')}>
            <AdminHeader
              onToggleSidebar={handleToggleSidebar}
              isOpen={isSidebarOpen}
              user={headerUser}
              onLogout={handleLogout}
            />
          </div>

          <AdminBodyContent
            pageTitle={activeItem?.label ?? defaultLabel}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
          >
            <Outlet />
          </AdminBodyContent>
        </div>
      </div>
    </AdminPageContext.Provider>
  );
}

export default AdminLayout;
