import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, ConfigProvider, Empty, Input, Pagination, Tag, Tooltip } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleXmark,
  faEye,
  faFileLines,
  faHourglassHalf,
  faSort,
} from '@fortawesome/free-solid-svg-icons';
import viVN from 'antd/locale/vi_VN';
import AdminTable from '@/admin/components/AdminTable/AdminTable';
import feedbackApi, { FEEDBACK_LIST_QUERY_KEY } from '@/api/feedback.api';
import { ADMIN_DASHBOARD_QUERY_KEY } from '@/api/stats.api';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import { ROUTE_PATHS, buildPath } from '@/config/routes.config';
import useToast from '@/components/Toast/Toast';
import useTable from '@/hooks/useTable';
import useModal from '@/hooks/useModal';
import BaseModal from '@/components/BaseModal/BaseModal';
import { formatDateTime } from '@/utils/datetime';

// Sub-components
import { FeedbackFilters, FeedbackStatsCards } from './components';
import { buildStatusTag, formatNumber } from './feedbackUtils';

import styles from './FeedbackPage.module.scss';

const cx = classNames.bind(styles);

function FeedbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setBreadcrumbs, setPageActions } = useContext(AdminPageContext);
  const { contextHolder, open: openToast } = useToast();

  // Table state management with hooks
  const table = useTable({ initialPageSize: 10, debounceDelay: 400 });
  const decisionModal = useModal();
  const [rejectReason, setRejectReason] = useState('');

  const selectedCount = table.selection.selectedKeys.length;
  const isDecisionReject = decisionModal.data?.status === 'BI_TU_CHOI';

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Trang chủ', path: ROUTE_PATHS.ADMIN.DASHBOARD },
      { label: 'Phản hồi sinh viên', path: ROUTE_PATHS.ADMIN.FEEDBACK },
    ]);
    setPageActions([]);
    return () => {
      setBreadcrumbs(null);
      setPageActions(null);
    };
  }, [setBreadcrumbs, setPageActions]);

  const queryKey = useMemo(
    () => [
      FEEDBACK_LIST_QUERY_KEY,
      {
        page: table.pagination.current,
        pageSize: table.pagination.pageSize,
        search: table.filters.debouncedSearch,
        faculty: table.filters.customFilters.faculty,
        class: table.filters.customFilters.class,
        activityId: table.filters.customFilters.activityId,
        status: table.filters.customFilters.status,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.pagination.current, table.pagination.pageSize, table.filters.debouncedSearch, table.filters.customFilters],
  );

  const { data, isFetching, isLoading } = useQuery({
    queryKey,
    queryFn: ({ queryKey: [, params] }) => feedbackApi.list(params),
    keepPreviousData: true,
  });

  const stats = data?.stats ?? {};
  const filters = data?.filters ?? {};
  const feedbacks = useMemo(() => {
    const list = data?.feedbacks ?? [];
    return list.sort((a, b) => {
      const ta = new Date(a.submittedAt || 0).getTime();
      const tb = new Date(b.submittedAt || 0).getTime();
      return tb - ta;
    });
  }, [data?.feedbacks]);
  const totalItems = data?.pagination?.total ?? 0;

  useEffect(() => {
    if (!feedbacks.length) {
      table.selection.clearSelection();
      return;
    }
    table.selection.setSelectedKeys((prev) => prev.filter((key) => feedbacks.some((item) => item.id === key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbacks]);

  const decideMutation = useMutation({
    mutationFn: feedbackApi.decide,
    onSuccess: (response) => {
      openToast({
        message: response?.message || 'Cập nhật phản hồi thành công.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: FEEDBACK_LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY });
      table.selection.clearSelection();
    },
    onError: (error) => {
      openToast({
        message: error.response?.data?.error || 'Không thể cập nhật trạng thái phản hồi.',
        variant: 'danger',
      });
    },
    onSettled: () => {
      decisionModal.close();
      setRejectReason('');
    },
  });

  const handleSearchChange = (event) => {
    table.filters.setSearch(event.target.value);
  };

  const handleFilterChange = (filterKey, value) => {
    table.filters.setCustomFilter(filterKey, value || undefined);
  };

  const handleResetFilters = () => {
    table.filters.resetFilters();
  };

  const openDecisionModal = useCallback(
    (status) => {
      if (!table.selection.selectedKeys.length) return;
      decisionModal.open({ status });
      setRejectReason('');
    },
    [decisionModal, table.selection.selectedKeys.length],
  );

  const handleConfirmDecision = async () => {
    if (!decisionModal.data?.status || !table.selection.selectedKeys.length) return;

    const payload = {
      ids: table.selection.selectedKeys,
      status: decisionModal.data.status,
      ...(decisionModal.data.status === 'BI_TU_CHOI' ? { reason: rejectReason } : {}),
    };

    await decideMutation.mutateAsync(payload);
  };

  const columns = useMemo(
    () => [
      { title: 'STT', dataIndex: 'index', key: 'index', width: 70, align: 'center' },
      { title: 'Họ tên', dataIndex: ['student', 'name'], key: 'student', width: 260 },
      {
        title: 'MSSV',
        dataIndex: ['student', 'studentCode'],
        key: 'studentCode',
        width: 120,
        sorter: (a, b) => (a.student?.studentCode || '').localeCompare(b.student?.studentCode || ''),
      },
      {
        title: 'Khoa',
        dataIndex: ['student', 'faculty'],
        key: 'faculty',
        width: 200,
        sorter: (a, b) => (a.student?.faculty || '').localeCompare(b.student?.faculty || ''),
      },
      {
        title: 'Lớp',
        dataIndex: ['student', 'className'],
        key: 'className',
        width: 150,
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
        title: 'Ngày nộp',
        dataIndex: 'submittedAt',
        key: 'submittedAt',
        width: 150,
        sorter: (a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0),
      },
      { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120 },
      { title: 'Hành động', dataIndex: 'actions', key: 'actions', width: 100, fixed: 'right' },
    ],
    [],
  );

  const columnRenderers = useMemo(
    () => ({
      index: ({ index }) => index + 1,
      student: ({ record }) => (
        <div className={cx('feedback-page__student-cell')}>
          <Avatar src={record.student?.avatarUrl} size={36} className={cx('feedback-page__avatar')}>
            {record.student?.name?.charAt(0)}
          </Avatar>
          <div>
            <div className={cx('feedback-page__student-name')}>{record.student?.name}</div>
            <div className={cx('feedback-page__student-email')}>{record.student?.email}</div>
          </div>
        </div>
      ),
      studentCode: ({ record }) => record.student?.studentCode,
      faculty: ({ record }) => record.student?.faculty,
      className: ({ record }) => record.student?.className,
      activity: ({ record }) => (
        <Tooltip title={record.activity?.title}>
          <span className={cx('feedback-page__activity-link')}>{record.activity?.title}</span>
        </Tooltip>
      ),
      submittedAt: ({ value }) => formatDateTime(value),
      status: ({ record }) => buildStatusTag(record.status),
      actions: ({ record }) => (
        <div className={cx('feedback-page__actions')}>
          <Tooltip title="Xem chi tiết">
            <button
              type="button"
              className={cx('feedback-page__action-button')}
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildPath.adminFeedbackDetail(record.id));
              }}
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
          </Tooltip>
        </div>
      ),
    }),
    [navigate],
  );

  const statsCards = useMemo(
    () => [
      {
        key: 'total',
        label: 'Tổng minh chứng',
        value: formatNumber(stats.total, isLoading ? '--' : 0),
        color: '#00008B',
        icon: faFileLines,
        bg: '#e8edff',
      },
      {
        key: 'pending',
        label: 'Chờ duyệt',
        value: formatNumber(stats.pending, isLoading ? '--' : 0),
        color: '#DB7B00',
        icon: faHourglassHalf,
        bg: '#fff3e0',
      },
      {
        key: 'approved',
        label: 'Đã duyệt',
        value: formatNumber(stats.approved, isLoading ? '--' : 0),
        color: '#198754',
        icon: faCircleCheck,
        bg: '#e6f8ee',
      },
      {
        key: 'rejected',
        label: 'Từ chối',
        value: formatNumber(stats.rejected, isLoading ? '--' : 0),
        color: '#DC3545',
        icon: faCircleXmark,
        bg: '#fdeaea',
      },
    ],
    [stats, isLoading],
  );

  const rowSelection = {
    selectedRowKeys: table.selection.selectedKeys,
    onChange: table.selection.setSelectedKeys,
    getCheckboxProps: (record) => ({
      disabled: record.status !== 'CHO_DUYET',
    }),
  };

  const canConfirm = isDecisionReject ? rejectReason.trim().length > 0 : true;

  const renderSortIcon = useCallback(
    ({ sortOrder }) => (
      <FontAwesomeIcon
        icon={faSort}
        className={cx('feedback-page__sort-icon', { 'feedback-page__sort-icon--active': sortOrder })}
      />
    ),
    [],
  );

  return (
    <ConfigProvider locale={viVN}>
      {contextHolder}

      <div className={cx('feedback-page')}>
        <FeedbackStatsCards statsCards={statsCards} />

        <FeedbackFilters
          searchValue={table.filters.search}
          onSearchChange={handleSearchChange}
          customFilters={table.filters.customFilters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          filterOptions={filters}
        />

        <div className={cx('feedback-page__content')}>
          <div className={cx('feedback-page__content-header')}>
            <h3>Danh sách phản hồi</h3>
          </div>
          <AdminTable
            rowKey="id"
            columns={columns}
            dataSource={feedbacks}
            loading={isFetching || decideMutation.isPending}
            rowSelection={rowSelection}
            pagination={false}
            columnRenderers={columnRenderers}
            sortIcon={renderSortIcon}
            className={cx('feedback-page__table')}
            locale={{
              emptyText: <Empty description="Không có phản hồi" />,
            }}
            onRow={(record) => ({
              onClick: (event) => {
                if (event.target.closest('button')) return;
                navigate(buildPath.adminFeedbackDetail(record.id));
              },
            })}
          />
          <div className={cx('feedback-page__pagination')}>
            <div className={cx('feedback-page__selection-info')}>
              Đã chọn <strong>{selectedCount}</strong> trong <strong>{formatNumber(totalItems, 0)}</strong> phản hồi
            </div>
            <Pagination
              current={table.pagination.current}
              pageSize={table.pagination.pageSize}
              total={totalItems}
              onChange={table.pagination.onChange}
              showSizeChanger={false}
            />
          </div>
        </div>

        {selectedCount > 0 && (
          <div className={cx('feedback-page__bulk-actions')}>
            <div className={cx('feedback-page__bulk-summary')}>
              <strong>{selectedCount}</strong> sinh viên đã chọn
            </div>
            <div className={cx('feedback-page__bulk-buttons')}>
              <Button onClick={() => table.selection.clearSelection()}>Bỏ chọn tất cả</Button>
              <Button type="primary" onClick={() => openDecisionModal('DA_DUYET')} loading={decideMutation.isPending}>
                Duyệt đạt
              </Button>
              <Button danger onClick={() => openDecisionModal('BI_TU_CHOI')} loading={decideMutation.isPending}>
                Không đạt
              </Button>
            </div>
          </div>
        )}
      </div>

      <BaseModal
        isOpen={decisionModal.isOpen}
        title={decisionModal.data?.status === 'DA_DUYET' ? 'Xác nhận duyệt phản hồi' : 'Từ chối phản hồi'}
        onClose={() => {
          decisionModal.close();
          setRejectReason('');
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => {
                decisionModal.close();
                setRejectReason('');
              }}
              disabled={decideMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleConfirmDecision}
              disabled={!canConfirm}
              loading={decideMutation.isPending}
              danger={isDecisionReject}
            >
              {decisionModal.data?.status === 'DA_DUYET' ? 'Duyệt đạt' : 'Từ chối'}
            </Button>
          </div>
        }
      >
        {isDecisionReject ? (
          <div className={cx('feedback-page__decision-body')}>
            <p>
              Vui lòng nhập lý do từ chối cho <strong>{selectedCount}</strong> phản hồi đã chọn.
            </p>
            <Input.TextArea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Nhập lý do từ chối..."
              maxLength={500}
            />
          </div>
        ) : (
          <p>
            Bạn có chắc muốn duyệt <strong>{selectedCount}</strong> phản hồi đã chọn?
          </p>
        )}
      </BaseModal>
    </ConfigProvider>
  );
}

export default FeedbackPage;
