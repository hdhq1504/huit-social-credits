import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames/bind';
import styles from '../FeedbackPage.module.scss';

const cx = classNames.bind(styles);

/**
 * FeedbackStatsCards - Statistics cards section for feedback dashboard
 */
export default function FeedbackStatsCards({ statsCards }) {
  return (
    <section className={cx('feedback-page__stats')}>
      {statsCards.map((item) => (
        <div key={item.key} className={cx('feedback-page__stats-card')}>
          <div className={cx('feedback-page__stats-info')}>
            <p className={cx('feedback-page__stats-label')}>{item.label}</p>
            <h2 className={cx('feedback-page__stats-value')} style={{ color: item.color }}>
              {item.value}
            </h2>
          </div>
          <div className={cx('feedback-page__stats-icon')} style={{ backgroundColor: item.bg }}>
            <FontAwesomeIcon icon={item.icon} size="lg" color={item.color} />
          </div>
        </div>
      ))}
    </section>
  );
}
