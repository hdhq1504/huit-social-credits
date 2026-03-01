import { useEffect, Fragment, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { publicRoutes, protectedUserRoutes } from './routes/userRoutes';
import { authRoutes } from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import teacherRoutes from './routes/teacherRoutes';
import ProtectedRoute from './components/guards/ProtectedRoute';
import GuestRoute from './components/guards/GuestRoute';
import NotFound from './components/NotFound/NotFound';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import AdminLayout from './admin/layouts/AdminLayout/AdminLayout';
import TeacherLayout from './teacher/layouts/TeacherLayout/TeacherLayout';
import useAuthStore from './stores/useAuthStore';
import { ROUTE_PATHS } from './config/routes.config';
import { setQueryClientRef } from './api/auth.api';

// Loading fallback
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <Spin size="large" tip="Đang tải..." />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Thiết lập reference để có thể clear cache khi logout
setQueryClientRef(queryClient);

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const RootRedirect = () => {
    const { isLoggedIn, user } = useAuthStore();

    if (isLoggedIn && user) {
      if (user.role === 'ADMIN') {
        return <Navigate to={ROUTE_PATHS.ADMIN.DASHBOARD} replace />;
      } else if (user.role === 'GIANGVIEN') {
        return <Navigate to={ROUTE_PATHS.TEACHER.CLASSES} replace />;
      }
    }

    const Page = publicRoutes[0].component;
    const Layout = publicRoutes[0].layout || Fragment;
    return (
      <Layout>
        <Page />
      </Layout>
    );
  };

  return (
    <ConfigProvider locale={viVN}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <ScrollToTop />
            <Routes>
              {authRoutes.map((route, index) => {
                const Page = route.component;
                return (
                  <Route
                    key={`auth-${index}`}
                    path={route.path}
                    element={
                      <GuestRoute>
                        <Page />
                      </GuestRoute>
                    }
                  />
                );
              })}

              <Route path={ROUTE_PATHS.PUBLIC.HOME} element={<RootRedirect />} />

              {publicRoutes.slice(1).map((route, index) => {
                const Page = route.component;
                const Layout = route.layout || Fragment;

                return (
                  <Route
                    key={`public-${index}`}
                    path={route.path}
                    element={
                      <Layout>
                        <Page />
                      </Layout>
                    }
                  />
                );
              })}

              {protectedUserRoutes.map((route, index) => {
                const Page = route.component;
                const Layout = route.layout || Fragment;

                return (
                  <Route
                    key={`user-${index}`}
                    path={route.path}
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Page />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                );
              })}

              <Route
                path={ROUTE_PATHS.ADMIN.ROOT}
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to={ROUTE_PATHS.ADMIN.DASHBOARD} replace />} />

                {adminRoutes.map((route) => {
                  const Page = route.component;
                  return <Route key={route.meta.key} path={route.path} element={<Page />} />;
                })}
              </Route>

              <Route
                path={ROUTE_PATHS.TEACHER.ROOT}
                element={
                  <ProtectedRoute allowedRoles={['GIANGVIEN']}>
                    <TeacherLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to={ROUTE_PATHS.TEACHER.CLASSES} replace />} />
                {teacherRoutes.map((route) => {
                  const Page = route.component;
                  return <Route key={route.path} path={route.path} element={<Page />} />;
                })}
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
