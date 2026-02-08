import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../ActivitiesPage.module.scss';

const cx = classNames.bind(styles);

/**
 * BulkActionsBar - Floating bar for bulk actions on selected activities
 */
export default function BulkActionsBar({ selectedCount, onApprove, onReject, isApproving, isRejecting }) {
  if (selectedCount === 0) return null;

  return (
    <div className={cx('activities-page__bulk-actions')}>
      <div className={cx('activities-page__bulk-info')}>
        Đã chọn <strong>{selectedCount}</strong> hoạt động
      </div>
      <div className={cx('activities-page__bulk-buttons')}>
        <button
          type="button"
          className={cx('activities-page__bulk-button', 'activities-page__bulk-button--approve')}
          onClick={onApprove}
          disabled={isApproving}
        >
          <FontAwesomeIcon icon={faCheck} /> Duyệt
        </button>
        <button
          type="button"
          className={cx('activities-page__bulk-button', 'activities-page__bulk-button--reject')}
          onClick={onReject}
          disabled={isRejecting}
        >
          <FontAwesomeIcon icon={faTimes} /> Từ chối
        </button>
      </div>
    </div>
  );
}
