import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faCircleCheck, faClock, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import { Calendar, ConfigProvider, Empty, Pagination, Tabs } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import updateLocale from 'dayjs/plugin/updateLocale';
import { useQuery } from '@tanstack/react-query';
import { CardActivity, Label, useToast } from '@components/index';
import activitiesApi, { MY_ACTIVITIES_QUERY_KEY } from '@api/activities.api';
import { ROUTE_PATHS } from '@/config/routes.config';
import useInvalidateActivities from '@/hooks/useInvalidateActivities';
import useRegistrationFilters from '@/hooks/useRegistrationFilters';
import useAuthStore from '@/stores/useAuthStore';
import ActivityStatsCards from '@/user/components/ActivityStatsCards/ActivityStatsCards.jsx';
import ActivityFilters from '@/user/components/ActivityFilters/ActivityFilters.jsx';
import ActivityCalendar from '@/user/components/ActivityCalendar/ActivityCalendar.jsx';
import useActivityStats from '@/hooks/useActivityStats';
import useMyActivities from '@/hooks/useMyActivities';
import styles from './MyActivitiesPage.module.scss';

const cx = classNames.bind(styles);
const PAGE_SIZE = 6;

dayjs.extend(updateLocale);
dayjs.locale('vi');
dayjs.updateLocale('vi', { weekStart: 1 });

function MyActivitiesPage() {
  const { contextHolder, open: toast } = useToast();
  const userId = useAuthStore((state) => state.user?.id);
  const [pages, setPages] = useState({ registered: 1, attended: 1, canceled: 1, absent: 1 });

  const {
    data: registrations = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: MY_ACTIVITIES_QUERY_KEY,
    queryFn: () => activitiesApi.listMine(),
    staleTime: 30 * 1000,
    retry: 1,
    onError: (error) => {
      const message = error.response?.data?.error || 'Không thể tải danh sách hoạt động của bạn';
      toast({ message, variant: 'danger' });
    },
  });

  const {
    keyword,
    setKeyword,
    timeRange,
    setTimeRange,
    filtered: filteredRegistrations,
    resetFilters,
  } = useRegistrationFilters(registrations, {
    enableTimeRange: true,
  });

  const invalidateActivityQueries = useInvalidateActivities();

  const {
    mutations,
    actions: { handleRegister, handleCancel, handleAttendance, handleFeedback },
  } = useMyActivities({
    toast,
    userId,
    invalidateQueries: invalidateActivityQueries,
  });

  useEffect(() => {
    setPages({ registered: 1, attended: 1, canceled: 1, absent: 1 });
  }, [filteredRegistrations, registrations.length]);

  // Calculate stats using custom hook
  const stats = useActivityStats(filteredRegistrations);

  const handlePageChange = useCallback((tabKey, page) => {
    setPages((prev) => ({ ...prev, [tabKey]: page }));
  }, []);

  const paginate = useCallback(
    (items, tabKey) => {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const current = Math.max(1, Math.min(pages[tabKey] ?? 1, totalPages));
      const start = (current - 1) * PAGE_SIZE;

      return {
        total,
        current,
        pageItems: items.slice(start, start + PAGE_SIZE),
      };
    },
    [pages],
  );

  const buildCards = useCallback(
    (items) =>
      items.map((registration) => {
        const activityState = registration.activity?.state;
        const registrationStatus = registration.status;
        const feedbackStatus = registration.feedback?.status;

        let effectiveState = activityState;

        if (registrationStatus === 'DA_THAM_GIA') {
          if (activityState === 'feedback_accepted' || feedbackStatus === 'DA_DUYET') {
            effectiveState = 'feedback_accepted';
          } else if (
            activityState !== 'feedback_reviewing' &&
            activityState !== 'feedback_denied' &&
            activityState !== 'feedback_pending'
          ) {
            effectiveState = 'completed';
          }
        }

        return (
          <CardActivity
            key={registration.id}
            {...registration.activity}
            variant="vertical"
            state={effectiveState}
            onRegistered={handleRegister}
            onCancelRegister={handleCancel}
            onConfirmPresent={handleAttendance}
            onSendFeedback={handleFeedback}
            attendanceLoading={mutations.attendance.isPending}
          />
        );
      }),
    [handleRegister, handleCancel, handleAttendance, handleFeedback, mutations.attendance],
  );

  const renderTabContent = useCallback(
    (tabKey, items, emptyText) => {
      const { total, current, pageItems } = paginate(items, tabKey);

      if (isFetching && registrations.length === 0) {
        return (
          <div className={cx('my-activities__list')}>
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <CardActivity key={`skeleton-${tabKey}-${index}`} loading variant="vertical" />
            ))}
          </div>
        );
      }

      if (!total) {
        return (
          <div className={cx('my-activities__empty')}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText || 'Không có hoạt động nào'} />
          </div>
        );
      }

      return (
        <>
          <div className={cx('my-activities__list')}>{buildCards(pageItems)}</div>
          <Pagination
            className={cx('my-activities__pagination')}
            current={current}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={(page) => handlePageChange(tabKey, page)}
            showSizeChanger={false}
            hideOnSinglePage
          />
        </>
      );
    },
    [buildCards, handlePageChange, paginate, isFetching, registrations.length],
  );

  const tabItems = useMemo(() => {
    const { registered, attended, canceled, absent } = stats;

    return [
      {
        key: 'registered',
        label: (
          <div className={cx('my-activities__tab-label')}>
            <FontAwesomeIcon icon={faCalendarCheck} className={cx('my-activities__tab-icon')} />
            <span>Đã đăng ký</span>
            <span className={cx('my-activities__tab-badge')}>{registered.length}</span>
          </div>
        ),
        children: renderTabContent('registered', registered, 'Chưa có hoạt động nào được đăng ký'),
      },
      {
        key: 'attended',
        label: (
          <div className={cx('my-activities__tab-label')}>
            <FontAwesomeIcon icon={faCircleCheck} className={cx('my-activities__tab-icon')} />
            <span>Đã tham gia</span>
            <span className={cx('my-activities__tab-badge')}>{attended.length}</span>
          </div>
        ),
        children: renderTabContent('attended', attended, 'Chưa có hoạt động nào đã tham gia'),
      },
      {
        key: 'canceled',
        label: (
          <div className={cx('my-activities__tab-label')}>
            <FontAwesomeIcon icon={faClock} className={cx('my-activities__tab-icon')} />
            <span>Đã hủy</span>
            <span className={cx('my-activities__tab-badge')}>{canceled.length}</span>
          </div>
        ),
        children: renderTabContent('canceled', canceled, 'Chưa có hoạt động nào bị hủy'),
      },
      {
        key: 'absent',
        label: (
          <div className={cx('my-activities__tab-label')}>
            <FontAwesomeIcon icon={faUserXmark} className={cx('my-activities__tab-icon')} />
            <span>Vắng mặt</span>
            <span className={cx('my-activities__tab-badge')}>{absent.length}</span>
          </div>
        ),
        children: renderTabContent('absent', absent, 'Chưa có hoạt động nào vắng mặt'),
      },
    ];
  }, [renderTabContent, stats]);

  return (
    <ConfigProvider locale={viVN}>
      <section className={cx('my-activities')}>
        {contextHolder}

        <div className={cx('my-activities__container')}>
          {/* Header */}
          <header className={cx('my-activities__header')}>
            <nav className={cx('my-activities__header-breadcrumb')} aria-label="Breadcrumb">
              <Link to={ROUTE_PATHS.PUBLIC.HOME}>Trang chủ</Link> / <span>Hoạt động của tôi</span>
            </nav>

            <Label title="Hoạt động" highlight="của tôi" leftDivider={false} rightDivider showSubtitle={false} />
          </header>

          {/* Stats */}
          {/* Stats Cards */}
          <ActivityStatsCards
            totalPoints={stats.totalPoints}
            totalActivities={stats.totalActivities}
            completed={stats.completed}
            absent={stats.absent.length}
            isLoading={isFetching && registrations.length === 0}
          />

          {/* Calendar */}
          <ActivityCalendar
            registrations={filteredRegistrations}
            isLoading={isFetching && registrations.length === 0}
          />

          {/* Tabs */}
          <div className={cx('my-activities__tabs')}>
            <Tabs
              defaultActiveKey="registered"
              items={tabItems}
              type="line"
              size="large"
              tabBarGutter={12}
              renderTabBar={(props, TabBar) => {
                const RenderedTabBar = TabBar;
                return (
                  <>
                    <RenderedTabBar {...props} />

                    {/* Thanh tìm kiếm */}
                    <ActivityFilters
                      keyword={keyword}
                      onKeywordChange={setKeyword}
                      timeRange={timeRange}
                      onTimeRangeChange={setTimeRange}
                      onReset={() => {
                        resetFilters();
                        refetch();
                      }}
                      isRefetching={isFetching}
                    />

                    <div className={cx('my-activities__title')}>Danh sách hoạt động</div>
                  </>
                );
              }}
            />
          </div>
        </div>
      </section>
    </ConfigProvider>
  );
}

export default MyActivitiesPage;
