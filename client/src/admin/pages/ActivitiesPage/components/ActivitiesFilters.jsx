import React from 'react';
import { Input, Select, DatePicker } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import viVN from 'antd/locale/vi_VN';
import classNames from 'classnames/bind';
import styles from '../ActivitiesPage.module.scss';

const cx = classNames.bind(styles);
const { Option } = Select;

/**
 * ActivitiesFilters - Filter bar component for activities list
 */
export default function ActivitiesFilters({
  searchValue,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  selectedStatus,
  onStatusChange,
  selectedApprovalStatus,
  onApprovalStatusChange,
  selectedDate,
  onDateChange,
}) {
  return (
    <div className={cx('activities-page__filter-bar')}>
      <Input
        placeholder="Tìm kiếm hoạt động..."
        className={cx('activities-page__filter-search')}
        prefix={<FontAwesomeIcon icon={faSearch} />}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        placeholder="Nhóm hoạt động"
        className={cx('activities-page__filter-select')}
        value={selectedGroup}
        onChange={onGroupChange}
      >
        <Option value="all">Tất cả nhóm</Option>
        <Option value="NHOM_1">Nhóm 1</Option>
        <Option value="NHOM_2">Nhóm 2</Option>
        <Option value="NHOM_3">Nhóm 3</Option>
      </Select>
      <Select
        placeholder="Trạng thái"
        className={cx('activities-page__filter-select')}
        value={selectedStatus}
        onChange={onStatusChange}
      >
        <Option value="all">Tất cả trạng thái</Option>
        <Option value="ongoing">Đang diễn ra</Option>
        <Option value="upcoming">Sắp diễn ra</Option>
        <Option value="ended">Đã kết thúc</Option>
      </Select>
      <Select
        placeholder="Trạng thái duyệt"
        className={cx('activities-page__filter-select')}
        value={selectedApprovalStatus}
        onChange={onApprovalStatusChange}
      >
        <Option value="all">Tất cả trạng thái duyệt</Option>
        <Option value="CHO_DUYET">Chờ duyệt</Option>
        <Option value="DA_DUYET">Đã duyệt</Option>
        <Option value="BI_TU_CHOI">Bị từ chối</Option>
      </Select>
      <DatePicker
        placeholder="Lọc theo ngày"
        className={cx('activities-page__filter-date')}
        locale={viVN}
        value={selectedDate}
        onChange={onDateChange}
        allowClear
      />
    </div>
  );
}
