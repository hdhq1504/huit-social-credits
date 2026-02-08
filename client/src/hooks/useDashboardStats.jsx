import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faUsers, faComments } from '@fortawesome/free-solid-svg-icons';
import activitiesApi, { DASHBOARD_QUERY_KEY } from '@/api/activities.api';
import statsApi, { ADMIN_DASHBOARD_QUERY_KEY } from '@/api/stats.api';

/**
 * Custom hook for fetching and processing dashboard statistics data
 * @returns {Object} Dashboard data including recent activities, overview cards, and loading states
 */
export function useDashboardStats() {
  // Fetch recent activities
  const { data: recentActivities, isLoading: isLoadingRecent } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, 'recent'],
    queryFn: activitiesApi.getRecent,
  });

  // Fetch dashboard overview data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: statsApi.getAdminDashboard,
  });

  // Format percent change helper
  const formatPercentChange = (value) => {
    if (value == null) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  // Process overview cards with icons and formatting
  const overviewCards = useMemo(() => {
    const overview = dashboardData?.overview;
    const baseCards = [
      {
        key: 'activities',
        icon: <FontAwesomeIcon icon={faCalendarCheck} size={22} color="#fff" />,
        count: overview?.activities?.total ?? 0,
        label: 'Hoạt động CTXH',
        percent: overview?.activities?.changePercent ?? 0,
        color: 'blue',
      },
      {
        key: 'participants',
        icon: <FontAwesomeIcon icon={faUsers} size={22} color="#fff" />,
        count: overview?.participants?.total ?? 0,
        label: 'Sinh viên tham gia',
        percent: overview?.participants?.changePercent ?? 0,
        color: 'green',
      },
      {
        key: 'feedbacks',
        icon: <FontAwesomeIcon icon={faComments} size={22} color="#fff" />,
        count: overview?.feedbacks?.total ?? 0,
        label: 'Phản hồi chờ xử lý',
        percent: overview?.feedbacks?.changePercent ?? 0,
        color: 'purple',
      },
    ];

    return baseCards.map(({ percent, ...card }) => ({
      ...card,
      count: isLoadingDashboard ? '--' : card.count,
      badge: isLoadingDashboard ? '--' : formatPercentChange(percent),
      negative: !isLoadingDashboard && percent < 0,
    }));
  }, [dashboardData?.overview, isLoadingDashboard]);

  // Extract upcoming activities and feedback
  const upcomingActivities = dashboardData?.upcoming ?? [];
  const pendingFeedback = dashboardData?.feedbacks ?? [];

  return {
    recentActivities,
    dashboardData,
    overviewCards,
    upcomingActivities,
    pendingFeedback,
    isLoading: isLoadingRecent || isLoadingDashboard,
    isLoadingRecent,
    isLoadingDashboard,
  };
}
