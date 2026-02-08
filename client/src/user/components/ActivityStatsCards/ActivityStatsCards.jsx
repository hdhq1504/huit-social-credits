import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCalendarCheck, faCircleCheck, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './ActivityStatsCards.module.scss';

const cx = classNames.bind(styles);

/**
 * ActivityStatsCards - Displays user activity statistics
 * @param {Object} props
 * @param {number} props.totalPoints - Total CTXH points earned
 * @param {number} props.totalActivities - Total registered activities
 * @param {number} props.completed - Completed activities count
 * @param {number} props.absent - Absent activities count
 * @param {boolean} props.isLoading - Show loading skeleton
 */
export default function ActivityStatsCards({ totalPoints, totalActivities, completed, absent, isLoading = false }) {
  if (isLoading) {
    return (
      <div className={cx('activity-stats-cards')}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cx('activity-stats-cards__card', 'activity-stats-cards__card--loading')}>
            <div className={cx('activity-stats-cards__skeleton')} />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      key: 'scores',
      label: 'Điểm CTXH',
      value: totalPoints,
      icon: faTrophy,
      variant: 'scores',
    },
    {
      key: 'total',
      label: 'Tổng hoạt động',
      value: totalActivities,
      icon: faCalendarCheck,
      variant: 'total',
    },
    {
      key: 'completed',
      label: 'Đã tham gia',
      value: completed,
      icon: faCircleCheck,
      variant: 'completed',
    },
    {
      key: 'absent',
      label: 'Vắng mặt',
      value: absent,
      icon: faUserXmark,
      variant: 'absent',
    },
  ];

  return (
    <div className={cx('activity-stats-cards')}>
      {cards.map((card) => (
        <div key={card.key} className={cx('activity-stats-cards__card', `activity-stats-cards__card--${card.variant}`)}>
          <div className={cx('activity-stats-cards__row')}>
            <div className={cx('activity-stats-cards__info')}>
              <div className={cx('activity-stats-cards__label')}>{card.label}</div>
              <div className={cx('activity-stats-cards__value')}>{card.value}</div>
            </div>
            <div className={cx('activity-stats-cards__icon')}>
              <FontAwesomeIcon icon={card.icon} className={cx('activity-stats-cards__icon-mark')} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

ActivityStatsCards.propTypes = {
  totalPoints: PropTypes.number.isRequired,
  totalActivities: PropTypes.number.isRequired,
  completed: PropTypes.number.isRequired,
  absent: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
};
