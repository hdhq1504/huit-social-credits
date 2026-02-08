import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { Avatar, Button, Input, Pagination, Select, Tag, Tooltip, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
  faCalendarAlt,
  faCheckCircle,
  faClock,
  faExclamationCircle,
  faEye,
  faSort,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import AdminTable from '@/admin/components/AdminTable/AdminTable';
import registrationsApi, { ADMIN_REGISTRATIONS_QUERY_KEY } from '@/api/registrations.api.js';
import { ROUTE_PATHS, buildPath } from '@/config/routes.config.js';
import useToast from '@/components/Toast/Toast.jsx';
import useTable from '@/hooks/useTable.jsx';
import styles from './ScoringPage.module.scss';

const cx = classNames.bind(styles);
const PAGE_SIZE = 10;

/** Map trạng thái điểm danh sang tone hiển thị */
const ATTENDANCE_TONES = {
  DANG_KY: { tone: 'warning', icon: faClock, label: 'Đang xử lý' },
  DANG_THAM_GIA: { tone: 'success', icon: faCheckCircle, label: 'Đúng giờ' },
  DA_THAM_GIA: { tone: 'success', icon: faCheckCircle, label: 'Đúng giờ' },
  TRE_GIO: { tone: 'warning', icon: faExclamationCircle, label: 'Trễ giờ' },
  VANG_MAT: { tone: 'danger', icon: faTimesCircle, label: 'Vắng mặt' },
  DA_HUY: { tone: 'neutral', icon: faTimesCircle, label: 'Đã hủy' },
};

/** Map trạng thái đăng ký sang thông tin hiển thị */
const REGISTRATION_STATUS_META = {
  DANG_KY: { color: 'warning', icon: faClock, label: 'Đã đăng ký' },
  DANG_THAM_GIA: { color: 'processing', icon: faClock, label: 'Đang tham gia' },
  DA_THAM_GIA: { color: 'success', icon: faCheckCircle, label: 'Đạt' },
  TRE_GIO: { color: 'warning', icon: faExclamationCircle, label: 'Trễ giờ' },
  VANG_MAT: { color: 'error', icon: faTimesCircle, label: 'Không đạt' },
  DA_HUY: { color: 'default', icon: faTimesCircle, label: 'Đã hủy' },
  CHO_DUYET: { color: 'warning', icon: faClock, label: 'Chờ duyệt' },
};

const getAttendanceEntry = (history, phase) => history?.find((item) => item.phase === phase) || null;

const renderAttendanceStatus = (entry) => {
  const meta = entry ? ATTENDANCE_TONES[entry.status] || ATTENDANCE_TONES.VANG_MAT : null;
  const timeStr = entry?.capturedAt ? dayjs(entry.capturedAt).format('HH:mm:ss') : '--:--:--';
  const tone = meta?.tone || 'neutral';
  return (
    <div className={cx('scoring-page__check-status')}>
      <Typography.Text className={cx('scoring-page__check-time')}>{timeStr}</Typography.Text>
      <Typography.Text className={cx('scoring-page__check-label', `scoring-page__check-label--${tone}`)}>
        {meta ? <FontAwesomeIcon icon={meta.icon} /> : null}
        {entry?.statusLabel || meta?.label || 'Chưa cập nhật'}
      </Typography.Text>
    </div>
  );
};

function ScoringPage() {
  const navigate = useNavigate();
  const { contextHolder, open: openToast } = useToast();
  const { setBreadcrumbs, setPageActions } = useContext(AdminPageContext);

  // Table state management
  const table = useTable({ initialPageSize: PAGE_SIZE, debounceDelay: 500 });
  const [filterOptions, setFilterOptions] = useState({ faculties: [], classes: [], activities: [] });
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Trang chủ', path: ROUTE_PATHS.ADMIN.DASHBOARD },
      { label: 'Điểm & Minh chứng', path: ROUTE_PATHS.ADMIN.FEEDBACK },
    ]);
    setPageActions([]);
    return () => {
      setBreadcrumbs(null);
      setPageActions(null);
    };
  }, [setBreadcrumbs, setPageActions]);

  const queryParams = useMemo(() => {
    const params = {
      page: table.pagination.current,
      pageSize: table.pagination.pageSize,
      search: table.filters.debouncedSearch || undefined,
    };

    const status = table.filters.customFilters.status;
    if (status && status !== 'all') params.status = status;
    if (table.filters.customFilters.faculty) params.faculty = table.filters.customFilters.faculty;
    if (table.filters.customFilters.className) params.className = table.filters.customFilters.className;
    if (table.filters.customFilters.activityId) params.activityId = table.filters.customFilters.activityId;

    return params;
  }, [table.pagination, table.filters.debouncedSearch, table.filters.customFilters]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [ADMIN_REGISTRATIONS_QUERY_KEY, queryParams],
    queryFn: () => registrationsApi.list(queryParams),
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      openToast({
        message: 'Không thể tải danh sách minh chứng',
        variant: 'danger',
      });
      console.error(error);
    }
  }, [error, openToast]);

  useEffect(() => {
    const stats = data?.stats ?? {};
    const faculties = (data?.filterOptions?.faculties ?? []).map((item) => {
      if (typeof item === 'string') return { label: item, value: item };
      return { label: item.label, value: item.value };
    });
    const classes = (data?.filterOptions?.classes ?? []).map((value) => ({ label: value, value }));
    const activities = (data?.filterOptions?.activities ?? []).map((item) => ({ label: item.title, value: item.id }));
    setFilterOptions({ faculties, classes, activities });

    const totalCount = stats.total ?? (stats.pending ?? 0) + (stats.approved ?? 0) + (stats.rejected ?? 0);
    setStatusCounts({
      all: totalCount,
      pending: stats.pending ?? 0,
      approved: stats.approved ?? 0,
      rejected: stats.rejected ?? 0,
    });
  }, [data]);

  const registrations = data?.registrations ?? [];

  useEffect(() => {
    const regLength = data?.registrations?.length || 0;
    if (!regLength) {
      table.selection.clearSelection();
      return;
    }
    const regIds = data.registrations.map((item) => item.id);
    table.selection.setSelectedKeys((prev) => prev.filter((key) => regIds.includes(key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleStatusFilterChange = useCallback(
    (statusValue) => {
      table.filters.setCustomFilter('status', statusValue ?? 'all');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSearchChange = (event) => {
    table.filters.setSearch(event.target.value);
  };

  const handleResetFilters = () => {
    table.filters.resetFilters();
  };

  const handleSelectChange = (key) => (value) => {
    table.filters.setCustomFilter(key, value || undefined);
  };

  const rowSelection = {
    selectedRowKeys: table.selection.selectedKeys,
    onChange: table.selection.setSelectedKeys,
  };

  const renderSortIcon = useCallback(
    ({ sortOrder }) => (
      <FontAwesomeIcon
        icon={faSort}
        className={cx('scoring-page__sort-icon', { 'scoring-page__sort-icon--active': Boolean(sortOrder) })}
      />
    ),
    [],
  );

  const columns = useMemo(
    () => [
      { title: 'STT', dataIndex: 'index', key: 'index', width: 60, align: 'center' },
      { title: 'Tên sinh viên', dataIndex: ['student', 'name'], key: 'student', width: 250 },
      {
        title: 'MSSV',
        dataIndex: ['student', 'studentCode'],
        key: 'studentCode',
        width: 110,
        sorter: (a, b) => (a.student?.studentCode || '').localeCompare(b.student?.studentCode || ''),
      },
      {
        title: 'Khoa',
        dataIndex: ['student', 'faculty'],
        key: 'faculty',
        width: 180,
        sorter: (a, b) => (a.student?.faculty || '').localeCompare(b.student?.faculty || ''),
      },
      {
        title: 'Lớp',
        dataIndex: ['student', 'className'],
        key: 'className',
        width: 100,
        sorter: (a, b) => (a.student?.className || '').localeCompare(b.student?.className || ''),
      },
      {
        title: 'Hoạt động',
        dataIndex: ['activity', 'title'],
        key: 'activity',
        width: 250,
        sorter: (a, b) => (a.activity?.title || '').localeCompare(b.activity?.title || ''),
      },
      {
        title: 'Điểm',
        dataIndex: ['activity', 'points'],
        key: 'points',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.activity?.points || 0) - (b.activity?.points || 0),
      },
      { title: 'Check-in', dataIndex: 'checkIn', key: 'checkIn', width: 130 },
      { title: 'Check out', dataIndex: 'checkOut', key: 'checkOut', width: 130 },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        align: 'center',
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      },
      { title: 'Hành động', key: 'action', width: 100, align: 'center' },
    ],
    [],
  );

  const columnRenderers = useMemo(
    () => ({
      index: ({ index }) => (table.pagination.current - 1) * table.pagination.pageSize + index + 1,
      student: ({ record }) => (
        <div className={cx('scoring-page__student')}>
          <Avatar src={record.student?.avatarUrl || '/images/profile.png'} />
          <div className={cx('scoring-page__student-details')}>
            <Typography.Text className={cx('scoring-page__student-name')}>
              {record.student?.name || 'N/A'}
            </Typography.Text>
            <Typography.Text type="secondary" className={cx('scoring-page__student-email')}>
              {record.student?.email || 'N/A'}
            </Typography.Text>
          </div>
        </div>
      ),
      studentCode: ({ record }) => record.student?.studentCode || '--',
      faculty: ({ record }) => record.student?.faculty || '--',
      className: ({ record }) => record.student?.className || '--',
      activity: ({ record }) => (
        <div className={cx('scoring-page__activity')}>
          <Typography.Text className={cx('scoring-page__activity-name')}>
            {record.activity?.title || '--'}
          </Typography.Text>
          <Typography.Text type="secondary" className={cx('scoring-page__activity-date')}>
            <FontAwesomeIcon icon={faCalendarAlt} />
            {record.activity?.startTime ? dayjs(record.activity.startTime).format('DD/MM/YYYY') : '--/--/----'}
          </Typography.Text>
        </div>
      ),
      points: ({ record }) => {
        const points = Number.isFinite(Number(record.activity?.points)) ? Number(record.activity.points) : 0;
        return (
          <Typography.Text className={cx('scoring-page__score')}>{points > 0 ? `+${points}` : points}</Typography.Text>
        );
      },
      checkIn: ({ record }) => renderAttendanceStatus(getAttendanceEntry(record.attendanceHistory, 'checkin')),
      checkOut: ({ record }) => renderAttendanceStatus(getAttendanceEntry(record.attendanceHistory, 'checkout')),
      status: ({ record }) => {
        let meta = REGISTRATION_STATUS_META[record.status] || REGISTRATION_STATUS_META.DANG_KY;
        let label = record.statusLabel || meta.label;
        let tone = meta.color;

        if (record.feedback?.status === 'BI_TU_CHOI') {
          meta = { color: 'error', icon: faTimesCircle, label: 'Từ chối' };
          label = 'Từ chối';
          tone = 'error';
        }

        const toneClass = `scoring-page__status-tag--${tone}`;
        return <Tag className={cx('scoring-page__status-tag', toneClass)}>{label}</Tag>;
      },
      action: ({ record }) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            icon={<FontAwesomeIcon icon={faEye} style={{ color: 'var(--primary-color)' }} />}
            onClick={() => navigate(buildPath.adminScoringDetail(record.id))}
          />
        </Tooltip>
      ),
    }),
    [navigate],
  );

  const statusOptions = useMemo(
    () => [
      { label: `Tất cả (${statusCounts.all ?? 0})`, value: 'all' },
      { label: `Chờ duyệt (${statusCounts.pending ?? 0})`, value: 'pending' },
      { label: `Đạt (${statusCounts.approved ?? 0})`, value: 'approved' },
      { label: `Không đạt (${statusCounts.rejected ?? 0})`, value: 'rejected' },
    ],
    [statusCounts],
  );

  return (
    <section className={cx('scoring-page')}>
      {contextHolder}

      <div className={cx('scoring-page__filter-bar')}>
        <Input
          placeholder="Tìm kiếm hoạt động, sinh viên..."
          className={cx('scoring-page__filter-search')}
          value={table.filters.search}
          onChange={handleSearchChange}
          allowClear
        />
        <Select
          placeholder="Khoa"
          className={cx('scoring-page__filter-select')}
          allowClear
          value={table.filters.customFilters.faculty}
          options={filterOptions.faculties}
          optionFilterProp="label"
          onChange={handleSelectChange('faculty')}
        />
        <Select
          placeholder="Lớp"
          className={cx('scoring-page__filter-select')}
          allowClear
          value={table.filters.customFilters.className}
          options={filterOptions.classes}
          optionFilterProp="label"
          onChange={handleSelectChange('className')}
        />
        <Select
          placeholder="Hoạt động"
          className={cx('scoring-page__filter-select')}
          allowClear
          showSearch
          value={table.filters.customFilters.activityId}
          options={filterOptions.activities}
          optionFilterProp="label"
          onChange={handleSelectChange('activityId')}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          className={cx('scoring-page__filter-select')}
          value={table.filters.customFilters.status === 'all' ? undefined : table.filters.customFilters.status}
          options={statusOptions}
          optionFilterProp="label"
          onChange={handleStatusFilterChange}
        />

        <Button type="primary" icon={<FontAwesomeIcon icon={faArrowRotateRight} />} onClick={handleResetFilters}>
          Đặt lại
        </Button>
      </div>

      <div className={cx('scoring-page__container')}>
        <div className={cx('scoring-page__header')}>
          <h3>Danh sách minh chứng</h3>
        </div>

        <AdminTable
          rowSelection={rowSelection}
          columns={columns}
          dataSource={registrations}
          loading={isLoading || isFetching}
          pagination={false}
          rowKey="id"
          columnRenderers={columnRenderers}
          sortIcon={renderSortIcon}
          className={cx('scoring-page__table')}
        />

        <div className={cx('scoring-page__footer')}>
          <Typography.Text className={cx('scoring-page__selection-info')}>
            Đã chọn <Typography.Text strong>{table.selection.selectedKeys.length}</Typography.Text> trong{' '}
            <Typography.Text strong>{table.pagination.total}</Typography.Text> kết quả
          </Typography.Text>
          <Pagination
            current={table.pagination.current}
            total={table.pagination.total}
            pageSize={table.pagination.pageSize}
            showSizeChanger={false}
            onChange={table.pagination.onChange}
          />
        </div>
      </div>
    </section>
  );
}

export default ScoringPage;
