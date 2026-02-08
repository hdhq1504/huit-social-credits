import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCalendar, faUsers, faPlus } from '@fortawesome/free-solid-svg-icons';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import { ROUTE_PATHS } from '@/config/routes.config';
import { formatDateTime } from '@/utils/datetime';
import { useDashboardStats } from '@/hooks/useDashboardStats.jsx';
import DashboardStats from '@/admin/components/DashboardStats/DashboardStats.jsx';
import RecentActivitiesTable from '@/admin/components/RecentActivitiesTable/RecentActivitiesTable.jsx';
import styles from './DashboardPage.module.scss';

const cx = classNames.bind(styles);
dayjs.extend(relativeTime);
dayjs.locale('vi');

export default function DashboardPage() {
  const [year, setYear] = useState(dayjs().year());
  const { setPageActions } = useContext(AdminPageContext);
  const navigate = useNavigate();

  // Use custom hook for data fetching
  const {
    recentActivities,
    dashboardData,
    overviewCards,
    upcomingActivities,
    pendingFeedback,
    isLoadingRecent,
    isLoadingDashboard,
  } = useDashboardStats();

  const availableYears = useMemo(() => {
    if (!dashboardData?.chart) return [];
    return Object.keys(dashboardData.chart)
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  }, [dashboardData?.chart]);

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(year)) {
      setYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, year]);

  const chartRows = useMemo(() => {
    if (!dashboardData?.chart || !year) return [];
    const rows = dashboardData.chart[year];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      name: row.label ?? `T${row.month ?? ''}`,
      group1: row.group1 ?? 0,
      group2: row.group2 ?? 0,
      group3: row.group3 ?? 0,
    }));
  }, [dashboardData?.chart, year]);

  useEffect(() => {
    setPageActions([
      {
        key: 'add',
        label: 'Thêm hoạt động mới',
        icon: <FontAwesomeIcon icon={faPlus} />,
        type: 'primary',
        className: 'admin-navbar__add-button',
        onClick: () => navigate(ROUTE_PATHS.ADMIN.ACTIVITY_CREATE),
      },
    ]);

    return () => setPageActions(null);
  }, [setPageActions, navigate]);

  return (
    <div className={cx('dashboard')}>
      {/* Use extracted DashboardStats component */}
      <DashboardStats cards={overviewCards} isLoading={isLoadingDashboard} />

      <section className={cx('dashboard__grid')}>
        <div className={cx('dashboard__chart')}>
          <div className={cx('dashboard__chart-header')}>
            <h3 className={cx('dashboard__chart-title')}>Hoạt động CTXH theo tháng</h3>
            <div className={cx('dashboard__chart-year-group')}>
              {availableYears.length > 0 ? (
                availableYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={cx('dashboard__chart-year-chip', {
                      'dashboard__chart-year-chip--active': year === y,
                    })}
                  >
                    {y}
                  </button>
                ))
              ) : (
                <span className={cx('dashboard__chart-year-chip')} style={{ cursor: 'default', opacity: 0.6 }}>
                  Chưa có dữ liệu
                </span>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartRows} barCategoryGap={18} barGap={6}>
              <CartesianGrid stroke="#B3B3B3" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.6)' }}
                tick={{ fontSize: 12, fill: 'var(--black-color)' }}
                dy={8}
              />
              <YAxis
                domain={[0, 30]}
                ticks={[0, 10, 20, 30]}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.6)' }}
                tick={{ fontSize: 12, fill: 'var(--black-color)' }}
                label={{
                  value: 'Số lượng hoạt động',
                  angle: -90,
                  position: 'middle',
                  style: { fill: 'rgba(0,0,0,0.6)', fontSize: 13, fontWeight: 500 },
                }}
              />
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ paddingTop: 14 }}
              />
              <Bar dataKey="group1" name="Nhóm 1" fill="#00008B" barSize={12} radius={[6, 6, 0, 0]} />
              <Bar dataKey="group2" name="Nhóm 2" fill="#FF5C00" barSize={12} radius={[6, 6, 0, 0]} />
              <Bar dataKey="group3" name="Nhóm 3" fill="#10B981" barSize={12} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Use extracted RecentActivitiesTable component */}
        <RecentActivitiesTable activities={recentActivities} isLoading={isLoadingRecent} />

        <div className={cx('dashboard__upcoming')}>
          <div className={cx('dashboard__upcoming-header')}>
            <h3>Hoạt động sắp diễn ra</h3>
            <a href={ROUTE_PATHS.ADMIN.ACTIVITIES} className={cx('dashboard__upcoming-view-more')}>
              Xem tất cả <FontAwesomeIcon icon={faArrowRight} />
            </a>
          </div>
          <div className={cx('dashboard__upcoming-list')}>
            {isLoadingDashboard ? (
              <div className={cx('dashboard__upcoming-item')}>Đang tải dữ liệu...</div>
            ) : upcomingActivities.length ? (
              upcomingActivities.map((event) => (
                <div key={event.id} className={cx('dashboard__upcoming-item')}>
                  <h4 className={cx('dashboard__upcoming-title')}>{event.title}</h4>
                  <p className={cx('dashboard__upcoming-location')}>{event.location}</p>
                  <div className={cx('dashboard__upcoming-footer')}>
                    <div className={cx('dashboard__upcoming-date')}>
                      <FontAwesomeIcon icon={faCalendar} />
                      <span>{formatDateTime(event.startTime)}</span>
                    </div>
                    <div className={cx('dashboard__upcoming-participants')}>
                      <FontAwesomeIcon icon={faUsers} />
                      <span>
                        {event.participantsCount}
                        {event.maxCapacity ? `/${event.maxCapacity}` : ''} người
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={cx('dashboard__upcoming-item')}>Không có hoạt động sắp diễn ra.</div>
            )}
          </div>
        </div>

        <div className={cx('dashboard__feedback')}>
          <div className={cx('dashboard__feedback-header')}>
            <h3>Phản hồi chờ xử lý</h3>
            <a href={ROUTE_PATHS.ADMIN.FEEDBACKS} className={cx('dashboard__feedback-view-more')}>
              Xem tất cả <FontAwesomeIcon icon={faArrowRight} />
            </a>
          </div>
          <div className={cx('dashboard__feedback-list')}>
            {isLoadingDashboard ? (
              <div className={cx('dashboard__feedback-item')}>Đang tải dữ liệu...</div>
            ) : pendingFeedback.length ? (
              pendingFeedback.map((feedback, idx) => (
                <div key={feedback.id || idx} className={cx('dashboard__feedback-item')}>
                  <img src={feedback.avatarUrl} alt={feedback.name} className={cx('dashboard__feedback-avatar')} />
                  <div className={cx('dashboard__feedback-content')}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <strong className={cx('dashboard__feedback-name')}>{feedback.name}</strong>
                      <span className={cx('dashboard__feedback-time')}>
                        {feedback.submittedAt ? dayjs(feedback.submittedAt).fromNow() : 'Vừa xong'}
                      </span>
                    </div>
                    <p className={cx('dashboard__feedback-message')}>{feedback.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className={cx('dashboard__feedback-item')}>Không có phản hồi chờ xử lý.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
