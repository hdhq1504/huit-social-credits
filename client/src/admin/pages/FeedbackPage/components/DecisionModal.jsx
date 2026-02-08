import React from 'react';
import { Input } from 'antd';
import classNames from 'classnames/bind';
import BaseModal from '@/components/BaseModal/BaseModal';
import styles from '../FeedbackPage.module.scss';

const cx = classNames.bind(styles);

/**
 * DecisionModal - Modal for approving or rejecting feedback items
 */
export default function DecisionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  isReject,
  selectedCount,
  rejectReason,
  onReasonChange,
}) {
  const canConfirm = isReject ? rejectReason.trim().length > 0 : true;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isReject ? 'Từ chối phản hồi' : 'Duyệt phản hồi'}
      footer={[
        <button
          key="cancel"
          type="button"
          onClick={onClose}
          className={cx('feedback-page__modal-button', 'feedback-page__modal-button--cancel')}
        >
          Hủy
        </button>,
        <button
          key="confirm"
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !canConfirm}
          className={cx(
            'feedback-page__modal-button',
            isReject ? 'feedback-page__modal-button--danger' : 'feedback-page__modal-button--primary',
          )}
        >
          {isLoading ? 'Đang xử lý...' : isReject ? 'Xác nhận từ chối' : 'Xác nhận duyệt'}
        </button>,
      ]}
    >
      {isReject ? (
        <>
          <p>Vui lòng nhập lý do từ chối cho {selectedCount} phản hồi đã chọn:</p>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Nhập lý do từ chối..."
          />
        </>
      ) : (
        <p>Bạn có chắc chắn muốn duyệt {selectedCount} phản hồi đã chọn?</p>
      )}
    </BaseModal>
  );
}
