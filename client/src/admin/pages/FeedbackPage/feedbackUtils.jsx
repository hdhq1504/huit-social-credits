import { Tag } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './FeedbackPage.module.scss';

const cx = classNames.bind(styles);

/**
 * Status metadata for feedback items
 */
export const STATUS_META = {
  CHO_DUYET: { label: 'Chờ duyệt', className: 'feedback-page__status-tag--pending' },
  DA_DUYET: { label: 'Đã duyệt', className: 'feedback-page__status-tag--approved' },
  BI_TU_CHOI: { label: 'Từ chối', className: 'feedback-page__status-tag--rejected' },
};

/**
 * Build status tag component
 */
export const buildStatusTag = (status, label = '') => {
  const meta = STATUS_META[status] || STATUS_META.CHO_DUYET;
  return (
    <Tag className={cx('feedback-page__status-tag', meta.className)}>
      <FontAwesomeIcon icon={faCircleDot} className={cx('feedback-page__status-dot')} />
      {label || meta.label}
    </Tag>
  );
};

/**
 * Format number with Vietnamese locale
 */
export const formatNumber = (value, placeholder = '--') => {
  if (value === undefined || value === null) return placeholder;
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('vi-VN') : value;
};
