import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { notification as antdNotification } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faChartLine,
  faCheck,
  faFileCircleCheck,
  faTriangleExclamation,
  faChevronDown,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import styles from './Notification.module.scss';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import notificationsApi, {
  NOTIFICATIONS_QUERY_KEY,
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
} from '@api/notifications.api';
import useAuthStore from '@stores/useAuthStore';

const cx = classNames.bind(styles);

const PAGE_SIZE = 10;

/** Map icon theo loại thông báo */
const TYPE_ICON = {
  warning: faTriangleExclamation,
  success: faCalendarCheck,
  info: faFileCircleCheck,
  danger: faChartLine,
};

/** Formatter cho thời gian tương đối */
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

/** Các khoảng thời gian để format relative time */
const RELATIVE_TIME_RANGES = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 604800, divisor: 86400, unit: 'day' },
  { limit: 2629800, divisor: 604800, unit: 'week' },
  { limit: 31557600, divisor: 2629800, unit: 'month' },
  { limit: Infinity, divisor: 31557600, unit: 'year' },
];

/**
 * Format thời gian thành dạng tương đối (vd: "5 phút trước", "hôm qua").
 * @param {Date|string|number} value - Giá trị thời gian cần format.
 * @returns {string} Chuỗi thời gian tương đối.
 */
const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteDiff = Math.abs(diffInSeconds);

  for (const range of RELATIVE_TIME_RANGES) {
    if (absoluteDiff < range.limit) {
      const divisor = range.divisor || 1;
      const valueRounded = Math.round(diffInSeconds / divisor);
      return RELATIVE_TIME_FORMATTER.format(valueRounded, range.unit);
    }
  }

  return '';
};

/**
 * Component hiển thị danh sách thông báo của người dùng.
 * Hỗ trợ đánh dấu tất cả đã đọc, hiển thị thời gian tương đối,
 * và phân trang với nút "Xem thêm".
 *
 * @param {Object} props - Props của component.
 * @param {Function} [props.onMarkAllRead] - Callback khi đánh dấu tất cả đã đọc thành công.
 * @returns {React.ReactElement} Component Notification.
 */
function Notification({ onMarkAllRead }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const queryClient = useQueryClient();

  // State cho pagination
  const [allNotifications, setAllNotifications] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Query lấy danh sách thông báo ban đầu (tối đa PAGE_SIZE)
  const {
    data: queryData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsApi.list({ limit: PAGE_SIZE }),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  // Sync query data vào local state khi data thay đổi (initial load / refetch)
  useEffect(() => {
    if (queryData) {
      setAllNotifications(queryData.notifications);
      setHasMore(queryData.hasMore);
      setNextCursor(queryData.nextCursor);
    }
  }, [queryData]);

  /**
   * Mutation đánh dấu tất cả thông báo là đã đọc.
   * Sau khi thành công, invalidate các query liên quan để refresh UI.
   */
  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
      onMarkAllRead?.();
    },
    onError: () => {
      antdNotification.open({
        message: 'Không thể cập nhật thông báo',
        description: 'Vui lòng thử lại sau ít phút.',
        placement: 'topRight',
        icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
        duration: 2.2,
      });
    },
  });

  // Transform data: thêm timeAgo cho mỗi notification
  const items = useMemo(
    () =>
      allNotifications.map((notification) => ({
        ...notification,
        timeAgo: formatRelativeTime(notification.createdAt),
      })),
    [allNotifications],
  );

  /**
   * Handler đánh dấu tất cả đã đọc.
   * Bỏ qua nếu không có item hoặc đang pending.
   */
  const handleMarkAll = () => {
    if (!items.length || markAllMutation.isPending) return;
    markAllMutation.mutate();
  };

  /**
   * Handler load thêm thông báo.
   * Sử dụng cursor để lấy batch tiếp theo.
   */
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const data = await notificationsApi.list({ limit: PAGE_SIZE, cursor: nextCursor });
      setAllNotifications((prev) => [...prev, ...data.notifications]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      antdNotification.open({
        message: 'Không thể tải thêm thông báo',
        description: 'Vui lòng thử lại sau.',
        placement: 'topRight',
        icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
        duration: 2.2,
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, nextCursor, isLoadingMore]);

  return (
    <div className={cx('notification')}>
      <div className={cx('notification__header')}>
        <div className={cx('notification__title')}>Thông báo</div>

        <button
          type="button"
          className={cx('notification__mark-all')}
          onClick={handleMarkAll}
          disabled={!isLoggedIn || !items.length || markAllMutation.isPending}
        >
          <FontAwesomeIcon icon={faCheck} />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className={cx('notification__list')}>
        {!isLoggedIn && <div className={cx('notification__empty')}>Vui lòng đăng nhập để xem thông báo.</div>}

        {isLoggedIn && isLoading && <div className={cx('notification__empty')}>Đang tải thông báo...</div>}

        {isLoggedIn && isError && !isLoading && (
          <div className={cx('notification__empty')}>Không thể tải thông báo. Vui lòng thử lại sau.</div>
        )}

        {isLoggedIn && !isLoading && !items.length && !isError && (
          <div className={cx('notification__empty')}>Bạn chưa có thông báo nào.</div>
        )}

        {isLoggedIn &&
          items.map((n, index) => (
            <div
              key={n.id}
              className={cx('notification__item', {
                'notification__item--unread': n.isUnread,
                'notification__item--last': !hasMore && index === items.length - 1,
              })}
            >
              <div className={cx('notification__icon-wrap', `notification__icon-wrap--${n.type}`)}>
                <FontAwesomeIcon icon={TYPE_ICON[n.type] || faFileCircleCheck} />
              </div>

              <div className={cx('notification__content')}>
                <div className={cx('notification__heading')}>{n.title}</div>
                <div className={cx('notification__desc')}>{n.description}</div>
                <div className={cx('notification__time')}>{n.timeAgo}</div>
              </div>
            </div>
          ))}

        {isLoggedIn && hasMore && (
          <button
            type="button"
            className={cx('notification__load-more')}
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Đang tải...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faChevronDown} />
                Xem thêm
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default Notification;
