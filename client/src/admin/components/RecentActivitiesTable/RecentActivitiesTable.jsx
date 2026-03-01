import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faPenToSquare,
  faXmark,
  faCircleCheck,
  faClipboardCheck,
  faComments,
  faUsers,
  faPlus,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import styles from './RecentActivitiesTable.module.scss';

const cx = classNames.bind(styles);
dayjs.extend(relativeTime);
dayjs.locale('vi');

/**
 * Get icon configuration based on activity type
 */
const getIconForActivity = (activityType) => {
  const iconMap = {
    COMPLETED: { icon: faCheck, className: 'complete' },
    REGISTERED: { icon: faUsers, className: 'register' },
    UPDATED: { icon: faPenToSquare, className: 'update' },
    CANCELLED: { icon: faXmark, className: 'cancel' },
    APPROVED: { icon: faCircleCheck, className: 'approved' },
    FEEDBACK_RECEIVED: { icon: faComments, className: 'feedback' },
    ATTENDANCE_CHECKED: { icon: faClipboardCheck, className: 'attendance' },
    CREATED: { icon: faPlus, className: 'create' },
  };

  return iconMap[activityType] || iconMap.CREATED;
};

/**
 * Transform activity data for display
 */
const transformActivity = (activity) => {
  const activityTitle = activity.title || 'Hoạt động';
  const currentParticipants = activity.participantsCount || 0;
  const maxCapacity = activity.maxCapacity || 0;
  const organizer = activity.organizer || 'Hệ thống';

  const messageMap = {
    COMPLETED: {
      title: `Hoạt động "${activityTitle}"`,
      desc: `${currentParticipants} sinh viên đã tham gia thành công.`,
    },
    REGISTERED: {
      title: `${currentParticipants} sinh viên mới đăng ký tham...`,
      desc: `Hoạt động "${activityTitle}" có thêm ${currentParticipants} người đăng ký.`,
    },
    UPDATED: {
      title: `Cập nhật hoạt động "${activityTitle}"`,
      desc: `${organizer} đã chỉnh sửa thông tin hoạt động.`,
    },
    CANCELLED: {
      title: `Hủy hoạt động "${activityTitle}"`,
      desc: `Hoạt động đã bị hủy bởi ${organizer}.`,
    },
    APPROVED: {
      title: `Phê duyệt hoạt động "${activityTitle}"`,
      desc: `${organizer} đã phê duyệt hoạt động này.`,
    },
    FEEDBACK_RECEIVED: {
      title: `Nhận phản hồi mới cho "${activityTitle}"`,
      desc: `${currentParticipants} sinh viên đã gửi phản hồi.`,
    },
    ATTENDANCE_CHECKED: {
      title: `Điểm danh hoạt động "${activityTitle}"`,
      desc: `${currentParticipants} sinh viên đã được điểm danh.`,
    },
    CREATED: {
      title: `Tạo hoạt động mới "${activityTitle}"`,
      desc: maxCapacity
        ? `${organizer} tạo hoạt động mới với sức chứa ${maxCapacity} người.`
        : `${organizer} tạo hoạt động mới.`,
    },
  };

  const type = activity.type || 'CREATED';
  const message = messageMap[type] || messageMap.CREATED;
  const iconInfo = getIconForActivity(type);

  return {
    id: activity.id,
    icon: iconInfo.icon,
    iconClassName: iconInfo.className,
    title: message.title,
    desc: message.desc,
    time: activity.updatedAt
      ? dayjs(activity.updatedAt).fromNow()
      : activity.createdAt
        ? dayjs(activity.createdAt).fromNow()
        : 'Vừa xong',
  };
};

/**
 * RecentActivitiesTable - Displays a list of recent activity updates
 */
export default function RecentActivitiesTable({ activities = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className={cx('recent-activities')}>
        <h3 className={cx('recent-activities__title')}>Hoạt động gần đây</h3>
        <ul className={cx('recent-activities__list')}>
          <li className={cx('recent-activities__item')} style={{ justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faSpinner} spin />
            <span style={{ marginLeft: 8 }}>Đang tải...</span>
          </li>
        </ul>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cx('recent-activities')}>
        <h3 className={cx('recent-activities__title')}>Hoạt động gần đây</h3>
        <ul className={cx('recent-activities__list')}>
          <li className={cx('recent-activities__item')}>Không có hoạt động gần đây.</li>
        </ul>
      </div>
    );
  }

  const transformedActivities = activities.map(transformActivity);

  return (
    <div className={cx('recent-activities')}>
      <h3 className={cx('recent-activities__title')}>Hoạt động gần đây</h3>
      <ul className={cx('recent-activities__list')}>
        {transformedActivities.map((item) => (
          <li key={item.id} className={cx('recent-activities__item')}>
            <div
              className={cx(
                'recent-activities__icon-wrapper',
                `recent-activities__icon-wrapper--${item.iconClassName}`,
              )}
            >
              <FontAwesomeIcon icon={item.icon} />
            </div>

            <div className={cx('recent-activities__content')}>
              <div className={cx('recent-activities__top')}>
                <strong className={cx('recent-activities__title-text', 'recent-activities__truncate')}>
                  {item.title}
                </strong>
                <span className={cx('recent-activities__time')}>{item.time}</span>
              </div>
              <p className={cx('recent-activities__desc', 'recent-activities__truncate')}>{item.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

RecentActivitiesTable.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      type: PropTypes.oneOf([
        'CREATED',
        'UPDATED',
        'CANCELLED',
        'COMPLETED',
        'REGISTERED',
        'APPROVED',
        'FEEDBACK_RECEIVED',
        'ATTENDANCE_CHECKED',
      ]),
      participantsCount: PropTypes.number,
      maxCapacity: PropTypes.number,
      organizer: PropTypes.string,
      createdAt: PropTypes.string,
    }),
  ),
  isLoading: PropTypes.bool,
};
