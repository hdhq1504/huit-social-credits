import React from 'react';
import PropTypes from 'prop-types';
import { Modal as AntModal } from 'antd';

/**
 * ConfirmModal - Confirmation dialog component
 *
 * Specialized modal for confirmation actions (delete, approve, reject).
 * Works seamlessly with useConfirmDialog hook.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onConfirm - Confirm handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {string} props.title - Modal title
 * @param {string} [props.message] - Confirmation message
 * @param {React.ReactNode} [props.children] - Custom content (overrides message)
 * @param {string} [props.confirmText='Xác nhận'] - Confirm button text
 * @param {string} [props.cancelText='Hủy'] - Cancel button text
 * @param {'default'|'danger'|'warning'} [props.variant='default'] - Visual variant
 * @param {boolean} [props.centered=true] - Center modal
 * @param {boolean} [props.destroyOnClose=true] - Destroy content on close
 */
function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  title,
  message,
  children,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'default',
  centered = true,
  destroyOnClose = true,
  ...restProps
}) {
  const getOkType = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <AntModal
      open={isOpen}
      title={title}
      okText={confirmText}
      cancelText={cancelText}
      okType={getOkType()}
      confirmLoading={isLoading}
      onOk={onConfirm}
      onCancel={onCancel}
      centered={centered}
      destroyOnClose={destroyOnClose}
      {...restProps}
    >
      {children || (message && <p>{message}</p>)}
    </AntModal>
  );
}

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  title: PropTypes.node.isRequired,
  message: PropTypes.string,
  children: PropTypes.node,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'danger', 'warning']),
  centered: PropTypes.bool,
  destroyOnClose: PropTypes.bool,
};

export default ConfirmModal;
