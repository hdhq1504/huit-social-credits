import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import { Button, DatePicker, Input } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import styles from './ActivityFilters.module.scss';

const cx = classNames.bind(styles);
const { RangePicker } = DatePicker;

/**
 * ActivityFilters - Search and filter controls for activity list
 * @param {Object} props
 * @param {string} props.keyword - Current search keyword
 * @param {Function} props.onKeywordChange - Keyword change handler
 * @param {Array} props.timeRange - Selected date range [start, end]
 * @param {Function} props.onTimeRangeChange - Date range change handler
 * @param {Function} props.onReset - Reset filters callback
 * @param {boolean} props.isRefetching - Loading state for reset button
 */
export default function ActivityFilters({
  keyword,
  onKeywordChange,
  timeRange,
  onTimeRangeChange,
  onReset,
  isRefetching = false,
}) {
  return (
    <div className={cx('activity-filters')}>
      <Input
        placeholder="Nhập từ khóa"
        size="large"
        className={cx('activity-filters__input')}
        allowClear
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
      />

      <RangePicker
        value={timeRange}
        onChange={onTimeRangeChange}
        allowClear
        size="large"
        format="DD/MM/YYYY"
        className={cx('activity-filters__range')}
        placeholder={['Từ ngày', 'Đến ngày']}
      />

      <Button
        type="primary"
        size="large"
        className={cx('activity-filters__button')}
        icon={<FontAwesomeIcon icon={faArrowRotateRight} />}
        onClick={onReset}
        loading={isRefetching}
      >
        Đặt lại
      </Button>
    </div>
  );
}

ActivityFilters.propTypes = {
  keyword: PropTypes.string,
  onKeywordChange: PropTypes.func.isRequired,
  timeRange: PropTypes.arrayOf(PropTypes.any),
  onTimeRangeChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  isRefetching: PropTypes.bool,
};
