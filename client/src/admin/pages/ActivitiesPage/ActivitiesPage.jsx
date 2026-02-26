import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfigProvider, Tooltip, Popconfirm } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEye, faEdit, faTrash, faCheck, faTimes, faSort } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import activitiesApi, { ACTIVITIES_QUERY_KEY } from '@/api/activities.api';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import AdminTable from '@/admin/components/AdminTable/AdminTable';
import { ROUTE_PATHS } from '@/config/routes.config';
import useTable from '@/hooks/useTable';
import useModal from '@/hooks/useModal';
import useConfirmDialog from '@/hooks/useConfirmDialog';
import useToast from '@/components/Toast/Toast';

// Sub-components
import { ActivitiesFilters, BulkActionsBar, DeleteActivityModal, RejectActivitiesModal } from './components';
import {
  formatDateTime,
  deriveStatusCategory,
  getGroupTag,
  getStatusTag,
  getApprovalStatusTag,
} from './activitiesUtils';

import styles from './ActivitiesPage.module.scss';

const cx = classNames.bind(styles);

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageActions } = useContext(AdminPageContext);
  const { contextHolder, open: openToast } = useToast();

  // State management
  const table = useTable({ initialPageSize: 10, debounceDelay: 400 });
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState('all');

  // Modal state
  const deleteModal = useConfirmDialog({
    onConfirm: (activity) => deleteMutation.mutateAsync(activity.id),
  });
  const rejectModal = useModal();
  const [rejectReason, setRejectReason] = useState('');

  // Set up page actions
  useEffect(() => {
    setPageActions([
      {
        key: 'add',
        label: 'Thêm hoạt động mới',
        icon: <FontAwesomeIcon icon={faPlus} />,
        type: 'primary',
        className: 'admin-navbar__add-button',
        onClick: () => navigate(ROUTE_PATHS.ADMIN.ACTIVITY_CREATE),
      },
    ]);

    return () => setPageActions(null);
  }, [setPageActions, navigate]);

  // Data fetching
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ACTIVITIES_QUERY_KEY,
    queryFn: activitiesApi.list,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => activitiesApi.remove(id),
    onSuccess: () => {
      openToast({ message: 'Xóa hoạt động thành công!', variant: 'success' });
      queryClient.invalidateQueries(ACTIVITIES_QUERY_KEY);
    },
    onError: (error) => {
      openToast({
        message: error.response?.data?.error || 'Xóa thất bại, vui lòng thử lại.',
        variant: 'danger',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => activitiesApi.approve(id),
    onSuccess: () => {
      openToast({ message: 'Duyệt hoạt động thành công!', variant: 'success' });
      queryClient.invalidateQueries(ACTIVITIES_QUERY_KEY);
    },
    onError: (error) => {
      openToast({
        message: error.response?.data?.error || 'Duyệt thất bại.',
        variant: 'danger',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => activitiesApi.reject(id, reason),
    onSuccess: () => {
      openToast({ message: 'Từ chối hoạt động thành công!', variant: 'success' });
      queryClient.invalidateQueries(ACTIVITIES_QUERY_KEY);
      rejectModal.close();
      setRejectReason('');
    },
    onError: (error) => {
      openToast({
        message: error.response?.data?.error || 'Từ chối thất bại.',
        variant: 'danger',
      });
    },
  });

  // Filter activities
  const filteredActivities = useMemo(() => {
    const normalizedSearch = table.filters.debouncedSearch.trim().toLowerCase();

    return activities
      .filter((activity) => {
        const matchesSearch =
          !normalizedSearch ||
          [activity.title, activity.location, activity.code]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        const matchesGroup = selectedGroup === 'all' || activity.pointGroup === selectedGroup;

        const statusCategory = deriveStatusCategory(activity);
        const matchesStatus = selectedStatus === 'all' || statusCategory === selectedStatus;

        const matchesApprovalStatus =
          selectedApprovalStatus === 'all' || activity.approvalStatus === selectedApprovalStatus;

        const matchesDate =
          !selectedDate || (activity.startTime && dayjs(activity.startTime).isSame(selectedDate, 'day'));

        return matchesSearch && matchesGroup && matchesStatus && matchesDate && matchesApprovalStatus;
      })
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [activities, table.filters.debouncedSearch, selectedGroup, selectedStatus, selectedDate, selectedApprovalStatus]);

  // Reset pagination on filter change
  useEffect(() => {
    table.resetPagination();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, selectedStatus, selectedDate, selectedApprovalStatus]);

  // Bulk actions
  const handleBulkApprove = useCallback(async () => {
    if (!table.selection.selectedKeys.length) return;

    let successCount = 0;
    for (const id of table.selection.selectedKeys) {
      try {
        await approveMutation.mutateAsync(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to approve activity ${id}`, error);
      }
    }

    if (successCount > 0) {
      table.selection.clearSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveMutation]);

  const handleBulkReject = useCallback(async () => {
    if (!table.selection.selectedKeys.length || !rejectReason.trim()) return;

    let successCount = 0;
    for (const id of table.selection.selectedKeys) {
      try {
        await rejectMutation.mutateAsync({ id, reason: rejectReason });
        successCount++;
      } catch (error) {
        console.error(`Failed to reject activity ${id}`, error);
      }
    }

    if (successCount > 0) {
      table.selection.clearSelection();
      rejectModal.close();
      setRejectReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectReason, rejectMutation]);

  const rowSelection = {
    selectedRowKeys: table.selection.selectedKeys,
    onChange: table.selection.setSelectedKeys,
  };

  // Table columns
  const columns = useMemo(
    () => [
      { title: 'STT', dataIndex: 'index', key: 'index', width: 60 },
      {
        title: 'Tên hoạt động',
        dataIndex: 'title',
        key: 'title',
        width: 350,
        sorter: (a, b) => a.title.localeCompare(b.title),
      },
      {
        title: 'Nhóm',
        dataIndex: 'pointGroup',
        key: 'pointGroup',
        width: 120,
        sorter: (a, b) => (a.pointGroup || '').localeCompare(b.pointGroup || ''),
      },
      {
        title: 'Học kỳ',
        dataIndex: 'semester',
        key: 'semester',
        width: 100,
        sorter: (a, b) => (a.semester || '').localeCompare(b.semester || ''),
      },
      {
        title: 'Năm học',
        dataIndex: 'academicYear',
        key: 'academicYear',
        width: 120,
        sorter: (a, b) => (a.academicYear || '').localeCompare(b.academicYear || ''),
      },
      {
        title: 'Điểm',
        dataIndex: 'points',
        key: 'points',
        width: 80,
        sorter: (a, b) => (a.points || 0) - (b.points || 0),
      },
      {
        title: 'SL',
        dataIndex: 'capacity',
        key: 'capacity',
        width: 80,
        sorter: (a, b) => (a.capacity || 0) - (b.capacity || 0),
      },
      {
        title: 'Bắt đầu',
        dataIndex: 'startTime',
        key: 'startTime',
        width: 150,
        sorter: (a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0),
      },
      {
        title: 'Kết thúc',
        dataIndex: 'endTime',
        key: 'endTime',
        width: 150,
        sorter: (a, b) => new Date(a.endTime || 0) - new Date(b.endTime || 0),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'state',
        key: 'state',
        width: 130,
        sorter: (a, b) => deriveStatusCategory(a).localeCompare(deriveStatusCategory(b)),
      },
      {
        title: 'Duyệt',
        dataIndex: 'approvalStatus',
        key: 'approvalStatus',
        width: 100,
        sorter: (a, b) => (a.approvalStatus || '').localeCompare(b.approvalStatus || ''),
      },
      { title: 'Hành động', dataIndex: 'actions', key: 'actions', width: 120, fixed: 'right' },
    ],
    [],
  );

  // Column renderers
  const columnRenderers = useMemo(
    () => ({
      index: ({ index }) => index,
      title: ({ value, record }) => (
        <Tooltip title={value}>
          <span
            className={cx('activities-page__link')}
            onClick={() => navigate(`${ROUTE_PATHS.ADMIN.ACTIVITIES}/${record.id}`)}
          >
            {value}
          </span>
        </Tooltip>
      ),
      pointGroup: ({ record }) => getGroupTag(record.pointGroup, record.pointGroupLabel),
      semester: ({ value }) => value || '--',
      academicYear: ({ value }) => value || '--',
      points: ({ value }) => (
        <span className={cx('activities-page__points', { 'activities-page__points--highlight': value > 0 })}>
          {value != null ? `+${value}` : '--'}
        </span>
      ),
      capacity: ({ record }) => (
        <span>
          {record.registrationCount ?? 0}/{record.capacity ?? '∞'}
        </span>
      ),
      startTime: ({ value }) => formatDateTime(value),
      endTime: ({ value }) => formatDateTime(value),
      state: ({ record }) => getStatusTag(deriveStatusCategory(record)),
      approvalStatus: ({ value }) => getApprovalStatusTag(value),
      actions: ({ record }) => (
        <div className={cx('activities-page__actions')}>
          <Tooltip title="Xem chi tiết">
            <button
              type="button"
              className={cx('activities-page__action-button')}
              onClick={() => navigate(`${ROUTE_PATHS.ADMIN.ACTIVITIES}/${record.id}`)}
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <button
              type="button"
              className={cx('activities-page__action-button')}
              onClick={() => navigate(`${ROUTE_PATHS.ADMIN.ACTIVITIES}/edit/${record.id}`)}
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
          </Tooltip>
          {record.approvalStatus === 'CHO_DUYET' && (
            <>
              <Popconfirm
                title="Duyệt hoạt động?"
                onConfirm={() => approveMutation.mutate(record.id)}
                okText="Duyệt"
                cancelText="Hủy"
              >
                <Tooltip title="Duyệt">
                  <button
                    type="button"
                    className={cx('activities-page__action-button', 'activities-page__action-button--approve')}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                </Tooltip>
              </Popconfirm>
              <Tooltip title="Từ chối">
                <button
                  type="button"
                  className={cx('activities-page__action-button', 'activities-page__action-button--reject')}
                  onClick={() => {
                    table.selection.setSelectedKeys([record.id]);
                    rejectModal.open();
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </Tooltip>
            </>
          )}
          <Tooltip title="Xóa">
            <button
              type="button"
              className={cx('activities-page__action-button', 'activities-page__action-button--delete')}
              onClick={() => deleteModal.open(record)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </Tooltip>
        </div>
      ),
    }),
    [navigate, approveMutation, deleteModal, rejectModal, table.selection],
  );

  const renderSortIcon = useCallback(
    ({ sortOrder }) => (
      <FontAwesomeIcon
        icon={faSort}
        className={cx('activities-page__sort-icon', { 'activities-page__sort-icon--active': sortOrder })}
      />
    ),
    [],
  );

  return (
    <ConfigProvider locale={viVN}>
      {contextHolder}
      <div className={cx('activities-page')}>
        <ActivitiesFilters
          searchValue={table.filters.search}
          onSearchChange={table.filters.setSearch}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedApprovalStatus={selectedApprovalStatus}
          onApprovalStatusChange={setSelectedApprovalStatus}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <div className={cx('activities-page__content')}>
          <div className={cx('activities-page__content-header')}>
            <h3>Danh sách hoạt động</h3>
          </div>
          <AdminTable
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={filteredActivities}
            columnRenderers={columnRenderers}
            rowSelection={rowSelection}
            pagination={{
              current: table.pagination.current,
              pageSize: table.pagination.pageSize,
              total: filteredActivities.length,
              onChange: table.pagination.onChange,
              showSizeChanger: false,
            }}
            sortIcon={renderSortIcon}
            className={cx('activities-page__table')}
          />
        </div>

        <BulkActionsBar
          selectedCount={table.selection.selectedKeys.length}
          onApprove={handleBulkApprove}
          onReject={() => rejectModal.open()}
          isApproving={approveMutation.isLoading}
          isRejecting={rejectMutation.isLoading}
        />
      </div>

      <DeleteActivityModal
        isOpen={deleteModal.isOpen}
        onConfirm={deleteModal.confirm}
        onCancel={deleteModal.close}
        isLoading={deleteModal.isLoading}
        activityTitle={deleteModal.data?.title}
      />

      <RejectActivitiesModal
        isOpen={rejectModal.isOpen}
        onClose={() => {
          rejectModal.close();
          setRejectReason('');
        }}
        onConfirm={handleBulkReject}
        isLoading={rejectMutation.isPending}
        selectedCount={table.selection.selectedKeys.length}
        rejectReason={rejectReason}
        onReasonChange={setRejectReason}
      />
    </ConfigProvider>
  );
}
