import React from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { ROUTE_PATHS } from '@/config/routes.config';
import styles from './AdminNavbar.module.scss';

const cx = classNames.bind(styles);

function AdminNavbar({ pageTitle, actions, breadcrumbs }) {
  const renderBreadcrumbs = () => {
    if (breadcrumbs) {
      return (
        <div className={cx('admin-navbar__breadcrumb')}>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            if (isLast) {
              return (
                <span key={index} className={cx('admin-navbar__breadcrumb-current')}>
                  {crumb.label}
                </span>
              );
            }
            return (
              <React.Fragment key={index}>
                <Link to={crumb.path} className={cx('admin-navbar__breadcrumb-home')}>
                  {crumb.label}
                </Link>
                <span className={cx('admin-navbar__breadcrumb-slash')}>/</span>
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    // Logic mặc định (cho Dashboard)
    return (
      <div className={cx('admin-navbar__breadcrumb')}>
        <Link to={ROUTE_PATHS.ADMIN.DASHBOARD} className={cx('admin-navbar__breadcrumb-home')}>
          Trang chủ
        </Link>
        <span className={cx('admin-navbar__breadcrumb-slash')}>/</span>
        <span className={cx('admin-navbar__breadcrumb-current')}>{pageTitle}</span>
      </div>
    );
  };

  // Render Title động
  const renderTitle = () => {
    // Nếu có breadcrumb, title là mục cuối cùng, nếu không, dùng pageTitle
    const title = breadcrumbs && breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : pageTitle;
    return <span className={cx('admin-navbar__title')}>{title}</span>;
  };

  // Render Actions động
  const renderActions = () => {
    if (actions) {
      // Nếu có actions, render các nút đó
      return (
        <div className={cx('admin-navbar__actions')}>
          {actions.map((action) => (
            <Button
              key={action.key}
              type={action.type || 'default'}
              icon={action.icon}
              onClick={action.onClick}
              danger={action.danger}
              className={cx('admin-navbar__action-btn', action.className)}
              loading={action.loading} // Thêm loading state
              disabled={action.disabled} // Thêm disabled state
            >
              {action.label}
            </Button>
          ))}
        </div>
      );
    }

    return (
      <Link to={ROUTE_PATHS.ADMIN.ACTIVITY_CREATE} className={cx('admin-navbar__add-button')}>
        <FontAwesomeIcon icon={faPlus} />
        <span style={{ marginLeft: '5px' }}>Thêm mới hoạt động mới</span>
      </Link>
    );
  };

  return (
    <div className={cx('admin-navbar')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {renderBreadcrumbs()}
        {renderTitle()}
      </div>
      {renderActions()}
    </div>
  );
}

export default AdminNavbar;
