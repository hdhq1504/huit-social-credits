import React from 'react';
import { Button, Input, Select } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../FeedbackPage.module.scss';

const cx = classNames.bind(styles);

/**
 * FeedbackFilters - Filter bar component for feedback list
 */
export default function FeedbackFilters({
  searchValue,
  onSearchChange,
  customFilters,
  onFilterChange,
  onResetFilters,
  filterOptions,
}) {
  const handleSelectChange = (filterKey) => (value) => {
    onFilterChange(filterKey, value || undefined);
  };

  return (
    <div className={cx('feedback-page__filter-bar')}>
      <Input
        placeholder="Tìm kiếm hoạt động, sinh viên..."
        className={cx('feedback-page__filter-search')}
        value={searchValue}
        onChange={onSearchChange}
        allowClear
      />
      <Select
        placeholder="Khoa"
        className={cx('feedback-page__filter-select')}
        allowClear
        value={customFilters.faculty}
        options={filterOptions.faculties || []}
        optionFilterProp="label"
        onChange={handleSelectChange('faculty')}
      />
      <Select
        placeholder="Lớp"
        className={cx('feedback-page__filter-select')}
        allowClear
        value={customFilters.class}
        options={filterOptions.classes || []}
        optionFilterProp="label"
        onChange={handleSelectChange('class')}
      />
      <Select
        placeholder="Hoạt động"
        className={cx('feedback-page__filter-select')}
        allowClear
        showSearch
        value={customFilters.activityId}
        options={filterOptions.activities || []}
        optionFilterProp="label"
        onChange={handleSelectChange('activityId')}
      />
      <Select
        placeholder="Trạng thái"
        className={cx('feedback-page__filter-select')}
        allowClear
        value={customFilters.status}
        options={filterOptions.statuses || []}
        optionFilterProp="label"
        onChange={handleSelectChange('status')}
      />
      <Button type="primary" icon={<FontAwesomeIcon icon={faArrowRotateRight} />} onClick={onResetFilters}>
        Đặt lại
      </Button>
    </div>
  );
}
