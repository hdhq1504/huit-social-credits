import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import styles from './DashboardStats.module.scss';

const cx = classNames.bind(styles);

/**
 * DashboardStats - Displays overview statistics cards
 * @param {Object} props
 * @param {Array} props.cards - Array of stat card objects
 * @param {boolean} props.isLoading - Loading state
 */
export default function DashboardStats({ cards, isLoading = false }) {
  if (isLoading) {
    return (
      <section className={cx('dashboard-stats')}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={cx('dashboard-stats__card', 'dashboard-stats__card--loading')}>
            <div className={cx('dashboard-stats__skeleton')} />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className={cx('dashboard-stats')}>
      {cards.map((card) => (
        <div key={card.key} className={cx('dashboard-stats__card')}>
          <div className={cx('dashboard-stats__icon-box', `dashboard-stats__icon-box--${card.color}`)}>{card.icon}</div>
          <div className={cx('dashboard-stats__info')}>
            <h2>{card.count}</h2>
            <p>{card.label}</p>
          </div>
          <span
            className={cx('dashboard-stats__badge', {
              'dashboard-stats__badge--positive': !card.negative,
              'dashboard-stats__badge--negative': card.negative,
            })}
          >
            {card.badge}
          </span>
        </div>
      ))}
    </section>
  );
}

DashboardStats.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      icon: PropTypes.element.isRequired,
      count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      label: PropTypes.string.isRequired,
      badge: PropTypes.string.isRequired,
      color: PropTypes.oneOf(['blue', 'green', 'purple', 'orange']).isRequired,
      negative: PropTypes.bool,
    }),
  ).isRequired,
  isLoading: PropTypes.bool,
};
