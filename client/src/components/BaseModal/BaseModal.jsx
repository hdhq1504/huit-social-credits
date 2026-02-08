import React from 'react';
import PropTypes from 'prop-types';
import { Modal as AntModal } from 'antd';

/**
 * BaseModal - Reusable modal wrapper component
 *
 * Wraps Ant Design Modal with consistent defaults and props.
 * Works seamlessly with useModal hook.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} [props.footer] - Custom footer
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Modal size
 * @param {boolean} [props.centered=true] - Center modal
 * @param {boolean} [props.destroyOnClose=true] - Destroy content on close
 */
function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  centered = true,
  destroyOnClose = true,
  ...restProps
}) {
  const SIZES = {
    sm: 400,
    md: 600,
    lg: 800,
    xl: 1000,
  };

  return (
    <AntModal
      open={isOpen}
      onCancel={onClose}
      title={title}
      footer={footer}
      width={SIZES[size]}
      centered={centered}
      destroyOnClose={destroyOnClose}
      {...restProps}
    >
      {children}
    </AntModal>
  );
}

BaseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  centered: PropTypes.bool,
  destroyOnClose: PropTypes.bool,
};

export default BaseModal;
