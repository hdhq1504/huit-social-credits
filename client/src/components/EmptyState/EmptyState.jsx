import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInbox } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './EmptyState.module.scss';

const cx = classNames.bind(styles);

/**
 * EmptyState - Empty state display component
 *
 * Shows friendly message when no data is available.
 * Used in tables, lists, and other data displays.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} [props.icon] - Icon to display
 * @param {string} [props.title='Không có dữ liệu'] - Title text
 * @param {string} [props.description] - Description text
 * @param {React.ReactNode} [props.action] - Action button or element
 * @param {string} [props.className] - Additional CSS class
 */
function EmptyState({
  icon = <FontAwesomeIcon icon={faInbox} />,
  title = 'Không có dữ liệu',
  description,
  action,
  className,
}) {
  return (
    <div className={cx('empty-state', className)}>
      {icon && <div className={cx('empty-state__icon')}>{icon}</div>}
      <h3 className={cx('empty-state__title')}>{title}</h3>
      {description && <p className={cx('empty-state__description')}>{description}</p>}
      {action && <div className={cx('empty-state__action')}>{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
};

export default EmptyState;
