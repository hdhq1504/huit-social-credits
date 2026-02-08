import React from 'react';
import { Input } from 'antd';
import classNames from 'classnames/bind';
import BaseModal from '@/components/BaseModal/BaseModal';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import styles from '../ActivitiesPage.module.scss';

const cx = classNames.bind(styles);

/**
 * DeleteActivityModal - Confirmation modal for deleting an activity
 */
export function DeleteActivityModal({ isOpen, onConfirm, onCancel, isLoading, activityTitle }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onConfirm={onConfirm}
      onCancel={onCancel}
      isLoading={isLoading}
      title="Bạn có chắc chắn muốn xóa?"
      message={`Hoạt động "${activityTitle}" sẽ bị xóa vĩnh viễn và không thể khôi phục.`}
      confirmText="Xóa"
      cancelText="Hủy"
      variant="danger"
    />
  );
}

/**
 * RejectActivitiesModal - Modal for entering rejection reason
 */
export function RejectActivitiesModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  selectedCount,
  rejectReason,
  onReasonChange,
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Từ chối hoạt động"
      size="md"
      footer={[
        <button
          key="cancel"
          type="button"
          onClick={onClose}
          className={cx('activities-page__modal-button', 'activities-page__modal-button--cancel')}
        >
          Hủy
        </button>,
        <button
          key="confirm"
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !rejectReason.trim()}
          className={cx('activities-page__modal-button', 'activities-page__modal-button--danger')}
        >
          {isLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
        </button>,
      ]}
    >
      <p>Vui lòng nhập lý do từ chối cho {selectedCount} hoạt động đã chọn:</p>
      <Input.TextArea
        rows={4}
        value={rejectReason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Nhập lý do từ chối..."
      />
    </BaseModal>
  );
}
