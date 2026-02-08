import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import { Calendar } from 'antd';
import dayjs from 'dayjs';
import styles from './ActivityCalendar.module.scss';

const cx = classNames.bind(styles);

/**
 * ActivityCalendar - Calendar view showing user's registered activities
 * @param {Object} props
 * @param {Array} props.registrations - User registrations to display
 * @param {boolean} props.isLoading - Show loading skeleton
 */
export default function ActivityCalendar({ registrations, isLoading = false }) {
  // Map registrations to calendar events
  const calendarEvents = useMemo(() => {
    const map = {};
    registrations.forEach((registration) => {
      const activity = registration.activity;
      if (!activity?.startTime) return;
      const key = dayjs(activity.startTime).format('YYYY-MM-DD');
      if (map[key]) return;

      let type = 'primary';
      if (registration.status === 'DA_THAM_GIA') type = 'success';
      else if (registration.status === 'VANG_MAT') type = 'error';
      else if (registration.status === 'DA_HUY') type = 'warning';

      map[key] = { type, label: activity.title };
    });
    return map;
  }, [registrations]);

  // Custom cell renderer
  const fullCellRender = (current, info) => {
    const key = dayjs(current).format('YYYY-MM-DD');
    const event = calendarEvents[key];
    const isCurrentMonth = info.originNode?.props?.className?.includes('ant-picker-cell-in-view');

    return (
      <div
        className={cx('activity-calendar__cell', {
          'activity-calendar__cell--in-view': isCurrentMonth,
          'activity-calendar__cell--has-event': Boolean(event),
          'activity-calendar__cell--primary': event?.type === 'primary',
          'activity-calendar__cell--warning': event?.type === 'warning',
          'activity-calendar__cell--success': event?.type === 'success',
          'activity-calendar__cell--error': event?.type === 'error',
        })}
      >
        <span className={cx('activity-calendar__date')}>{current.date()}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cx('activity-calendar')}>
        <h3 className={cx('activity-calendar__title')}>Lịch hoạt động</h3>
        <div className={cx('activity-calendar__skeleton')} />
      </div>
    );
  }

  return (
    <div className={cx('activity-calendar')}>
      <h3 className={cx('activity-calendar__title')}>Lịch hoạt động</h3>

      <Calendar fullCellRender={fullCellRender} className={cx('activity-calendar__panel')} />

      {/* Legend */}
      <div className={cx('activity-calendar__legend')}>
        <div className={cx('activity-calendar__legend-item')}>
          <span className={cx('activity-calendar__legend-dot', 'activity-calendar__legend-dot--primary')} />
          <span>Đã đăng ký</span>
        </div>
        <div className={cx('activity-calendar__legend-item')}>
          <span className={cx('activity-calendar__legend-dot', 'activity-calendar__legend-dot--success')} />
          <span>Đã tham gia</span>
        </div>
        <div className={cx('activity-calendar__legend-item')}>
          <span className={cx('activity-calendar__legend-dot', 'activity-calendar__legend-dot--warning')} />
          <span>Đã hủy</span>
        </div>
        <div className={cx('activity-calendar__legend-item')}>
          <span className={cx('activity-calendar__legend-dot', 'activity-calendar__legend-dot--error')} />
          <span>Vắng mặt</span>
        </div>
      </div>
    </div>
  );
}

ActivityCalendar.propTypes = {
  registrations: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.string,
      activity: PropTypes.shape({
        startTime: PropTypes.string,
        title: PropTypes.string,
      }),
    }),
  ).isRequired,
  isLoading: PropTypes.bool,
};
