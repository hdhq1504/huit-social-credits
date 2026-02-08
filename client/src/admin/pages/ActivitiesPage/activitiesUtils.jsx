import dayjs from 'dayjs';
import { Tag } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ActivitiesPage.module.scss';

const cx = classNames.bind(styles);

/**
 * Format ISO datetime string to Vietnamese format
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '--';
  return dayjs(isoString).format('HH:mm DD/MM/YYYY');
};

/**
 * Map activity state to status category
 */
const STATUS_CATEGORY_MAP = {
  ongoing: 'ongoing',
  check_in: 'ongoing',
  check_out: 'ongoing',
  confirm_out: 'ongoing',
  attendance_review: 'ongoing',
  upcoming: 'upcoming',
  registered: 'upcoming',
  attendance_closed: 'upcoming',
  ended: 'ended',
  feedback_pending: 'ended',
  feedback_reviewing: 'ended',
  completed: 'ended',
  feedback_accepted: 'ended',
  feedback_waiting: 'ended',
  feedback_denied: 'ended',
  canceled: 'ended',
  absent: 'ended',
};

/**
 * Derive status category from activity
 */
export const deriveStatusCategory = (activity) => {
  if (!activity) return 'upcoming';
  const mapped = STATUS_CATEGORY_MAP[activity.state];
  if (mapped) return mapped;

  const now = dayjs();
  const start = activity.startTime ? dayjs(activity.startTime) : null;
  const end = activity.endTime ? dayjs(activity.endTime) : null;

  if (start && now.isBefore(start)) return 'upcoming';
  if (end && now.isAfter(end)) return 'ended';
  if (start && (!end || now.isBefore(end))) return 'ongoing';
  return 'upcoming';
};

/**
 * Group tag CSS class mapping
 */
const GROUP_TAG_CLASS = {
  NHOM_1: 'activities-page__group-tag--nhom-1',
  NHOM_2: 'activities-page__group-tag--nhom-2',
  NHOM_3: 'activities-page__group-tag--nhom-3',
};

/**
 * Get group tag component
 */
export const getGroupTag = (groupId, groupLabel) => {
  const label = groupLabel || groupId || '--';
  const tagClass = GROUP_TAG_CLASS[groupId] || GROUP_TAG_CLASS.NHOM_2;
  return <Tag className={cx('activities-page__group-tag', tagClass)}>{label}</Tag>;
};

/**
 * Get status tag component
 */
export const getStatusTag = (status) => {
  switch (status) {
    case 'ongoing':
      return (
        <Tag className={cx('activities-page__status-tag', 'activities-page__status-tag--ongoing')}>
          <FontAwesomeIcon icon={faCircleDot} className={cx('activities-page__status-dot')} />
          Đang diễn ra
        </Tag>
      );
    case 'upcoming':
      return (
        <Tag className={cx('activities-page__status-tag', 'activities-page__status-tag--upcoming')}>
          <FontAwesomeIcon icon={faCircleDot} className={cx('activities-page__status-dot')} />
          Sắp diễn ra
        </Tag>
      );
    case 'ended':
      return (
        <Tag className={cx('activities-page__status-tag', 'activities-page__status-tag--ended')}>
          <FontAwesomeIcon icon={faCircleDot} className={cx('activities-page__status-dot')} />
          Đã kết thúc
        </Tag>
      );
    default:
      return <Tag>{status}</Tag>;
  }
};

/**
 * Get approval status tag component
 */
export const getApprovalStatusTag = (approvalStatus) => {
  switch (approvalStatus) {
    case 'CHO_DUYET':
      return <Tag className={cx('activities-page__status-tag', 'activities-page__status-tag--pending')}>Chờ duyệt</Tag>;
    case 'DA_DUYET':
      return <Tag className={cx('activities-page__status-tag', 'activities-page__status-tag--approved')}>Đã duyệt</Tag>;
    case 'BI_TU_CHOI':
      return (
        <Tag className={cx('activities-page__status-tag', 'activities-page__status-tag--rejected')}>Bị từ chối</Tag>
      );
    default:
      return null;
  }
};
