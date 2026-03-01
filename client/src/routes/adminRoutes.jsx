import { lazy } from 'react';
import { ROUTE_PATHS } from '@/config/routes.config';

const DashboardPage = lazy(() => import('@/admin/pages/DashboardPage/DashboardPage'));
const ActivitiesPage = lazy(() => import('@/admin/pages/ActivitiesPage/ActivitiesPage'));
const ActivitiesAddEditPage = lazy(() => import('@/admin/pages/ActivitiesAddEditPage/ActivitiesAddEditPage'));
const ActivitiesDetailPage = lazy(() => import('@/admin/pages/ActivitiesDetailPage/ActivitiesDetailPage'));
const ScoringPage = lazy(() => import('@/admin/pages/ScoringPage/ScoringPage'));
const ScoringDetailPage = lazy(() => import('@/admin/pages/ScoringDetailPage/ScoringDetailPage'));
const FeedbackPage = lazy(() => import('@/admin/pages/FeedbackPage/FeedbackPage'));
const FeedbackDetailPage = lazy(() => import('@/admin/pages/FeedbackDetailPage/FeedbackDetailPage'));
const ReportsPage = lazy(() => import('@/admin/pages/ReportsPage/ReportsPage'));
const CouncilPage = lazy(() => import('@/admin/pages/CouncilPage/CouncilPage'));
const SystemPage = lazy(() => import('@/admin/pages/SystemPage/SystemPage'));
const UsersPage = lazy(() => import('@/admin/pages/UsersPage/UsersPage'));
const UsersAddEditPage = lazy(() => import('@/admin/pages/UsersAddEditPage/UsersAddEditPage'));
const StudentsPage = lazy(() => import('@/admin/pages/StudentsPage/StudentsPage'));
const LecturersPage = lazy(() => import('@/admin/pages/LecturersPage/LecturersPage'));
const AcademicYearsPage = lazy(() => import('@/admin/pages/AcademicYearsPage/AcademicYearsPage'));

const lastPathSegment = (path) => path.split('/').pop();

export const adminRoutes = [
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.DASHBOARD), // 'dashboard'
    component: DashboardPage,
    meta: {
      key: 'dashboard',
      label: 'Bảng điều khiển',
      icon: 'DashboardOutlined',
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.ACTIVITIES), // 'activities'
    component: ActivitiesPage,
    meta: {
      key: 'activities',
      label: 'Hoạt động CTXH',
      icon: 'CalendarOutlined',
    },
  },
  {
    path: 'activities/create',
    component: ActivitiesAddEditPage,
    meta: {
      key: 'activities-create',
      label: 'Tạo hoạt động mới',
      hideInSidebar: true,
    },
  },
  {
    path: 'activities/:id',
    component: ActivitiesDetailPage,
    meta: {
      key: 'activities-detail',
      label: 'Chi tiết hoạt động',
      hideInSidebar: true,
    },
  },
  {
    path: 'activities/:id/edit',
    component: ActivitiesAddEditPage,
    meta: {
      key: 'activities-edit',
      label: 'Chỉnh sửa hoạt động',
      hideInSidebar: true,
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.SCORING), // 'scoring'
    component: ScoringPage,
    meta: {
      key: 'scoring',
      label: 'Điểm & Minh chứng',
      icon: 'TrophyOutlined',
    },
  },
  {
    path: 'scoring/:id',
    component: ScoringDetailPage,
    meta: {
      key: 'scoring-detail',
      label: 'Chi tiết điểm rèn luyện',
      hideInSidebar: true,
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.FEEDBACK), // 'feedback'
    component: FeedbackPage,
    meta: {
      key: 'feedback',
      label: 'Phản hồi sinh viên',
      icon: 'MessageOutlined',
    },
  },
  {
    path: 'feedback/:id',
    component: FeedbackDetailPage,
    meta: {
      key: 'feedback-detail',
      label: 'Chi tiết phản hồi',
      hideInSidebar: true,
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.REPORTS), // 'reports'
    component: ReportsPage,
    meta: {
      key: 'reports',
      label: 'Báo cáo & thống kê',
      icon: 'BarChartOutlined',
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.COUNCIL), // 'council'
    component: CouncilPage,
    meta: {
      key: 'council',
      label: 'Hội đồng xét điểm',
      icon: 'TeamOutlined',
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.STUDENTS), // 'students'
    component: StudentsPage,
    meta: {
      key: 'students',
      label: 'Quản lý sinh viên',
      icon: 'StudentOutlined',
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.LECTURERS), // 'lecturers'
    component: LecturersPage,
    meta: {
      key: 'lecturers',
      label: 'Quản lý giảng viên',
      icon: 'UserTieOutlined',
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.USERS), // 'users'
    component: UsersPage,
    meta: {
      key: 'users',
      label: 'Quản lý tài khoản',
      icon: 'UserGearOutlined',
    },
  },
  {
    path: 'users/create',
    component: UsersAddEditPage,
    meta: {
      key: 'users-create',
      label: 'Tạo tài khoản mới',
      hideInSidebar: true,
    },
  },
  {
    path: 'users/:id/edit',
    component: UsersAddEditPage,
    meta: {
      key: 'users-edit',
      label: 'Chỉnh sửa tài khoản',
      hideInSidebar: true,
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.ACADEMIC_YEARS), // 'academic-years'
    component: AcademicYearsPage,
    meta: {
      key: 'academics',
      label: 'Cấu hình năm học',
      icon: 'CalendarAltOutlined',
    },
  },
  {
    path: lastPathSegment(ROUTE_PATHS.ADMIN.SYSTEM), // 'system'
    component: SystemPage,
    meta: {
      key: 'system',
      label: 'Quản lý hệ thống',
      icon: 'SettingOutlined',
    },
  },
];

export default adminRoutes;
