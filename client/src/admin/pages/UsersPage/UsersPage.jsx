import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import classNames from 'classnames/bind';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Input, Pagination, Select, Tag, Tooltip } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleDot,
  faArrowRotateRight,
  faPenToSquare,
  faSearch,
  faSort,
  faTrash,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import AdminTable from '@/admin/components/AdminTable/AdminTable';
import usersApi, { USERS_QUERY_KEY } from '@/api/users.api';
import useTable from '@/hooks/useTable';
import useConfirmDialog from '@/hooks/useConfirmDialog';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import { ROUTE_PATHS, buildPath } from '@/config/routes.config';
import useToast from '@/components/Toast/Toast';
import styles from './UsersPage.module.scss';

const cx = classNames.bind(styles);

const ROLE_OPTIONS = [
  { label: 'Tất cả vai trò', value: 'all' },
  { label: 'Sinh viên', value: 'SINHVIEN' },
  { label: 'Giảng viên', value: 'GIANGVIEN' },
  { label: 'Quản trị viên', value: 'ADMIN' },
];

const STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Ngưng hoạt động', value: 'inactive' },
];

const ROLE_LABELS = {
  SINHVIEN: 'Sinh viên',
  GIANGVIEN: 'Giảng viên',
  ADMIN: 'Quản trị viên',
};

const formatDateTime = (value, placeholder = 'Chưa đăng nhập') => {
  if (!value) return placeholder;
  return dayjs(value).format('HH:mm DD/MM/YYYY');
};

const toTimeValue = (value) => (value ? dayjs(value).valueOf() : 0);

const buildStatusTag = (isActive) => (
  <Tag
    className={cx(
      'users-page__status-tag',
      isActive ? 'users-page__status-tag--active' : 'users-page__status-tag--inactive',
    )}
  >
    <FontAwesomeIcon icon={faCircleDot} className={cx('users-page__status-icon')} />
    {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
  </Tag>
);

const mapIdentifier = (user) => {
  if (user.studentCode) return user.studentCode;
  if (user.staffCode) return user.staffCode;
  return '--';
};

export default function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageActions, setBreadcrumbs } = useContext(AdminPageContext);
  const { contextHolder, open: openToast } = useToast();

  // Table and dialog state management
  const table = useTable({ initialPageSize: 10, debounceDelay: 400 });
  const deleteDialog = useConfirmDialog();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Trang chủ', path: ROUTE_PATHS.ADMIN.DASHBOARD },
      { label: 'Quản lý người dùng', path: ROUTE_PATHS.ADMIN.USERS },
    ]);
    setPageActions([
      {
        key: 'create',
        label: 'Thêm người dùng mới',
        type: 'primary',
        className: 'admin-navbar__add-button',
        icon: <FontAwesomeIcon icon={faUserPlus} />,
        onClick: () => navigate(ROUTE_PATHS.ADMIN.USER_CREATE),
      },
    ]);
    return () => {
      setBreadcrumbs(null);
      setPageActions(null);
    };
  }, [setBreadcrumbs, setPageActions, navigate]);

  const queryKey = useMemo(
    () => [
      USERS_QUERY_KEY,
      {
        page: table.pagination.current,
        pageSize: table.pagination.pageSize,
        search: table.filters.debouncedSearch.trim(),
        role: table.filters.customFilters.role || 'all',
        status: table.filters.customFilters.status || 'all',
      },
    ],
    [table.pagination, table.filters.debouncedSearch, table.filters.customFilters],
  );

  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: ({ queryKey: [, params] }) => usersApi.list(params),
    keepPreviousData: true,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => usersApi.remove(userId),
    onSuccess: (response) => {
      openToast({ message: response?.message || 'Đã xóa người dùng.', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      deleteDialog.handleSuccess();
    },
    onError: (error) => {
      openToast({ message: error.response?.data?.error || 'Không thể xóa người dùng.', variant: 'danger' });
      deleteDialog.handleError();
    },
  });

  const users = data?.users ?? [];
  const totalItems = data?.pagination?.total ?? 0;

  const handleEditUser = useCallback(
    (userId) => {
      navigate(buildPath.adminUserEdit(userId));
    },
    [navigate],
  );

  const handleDeleteUser = useCallback(
    (record) => {
      if (!record?.id) return;
      const displayName = record.fullName || record.email || 'người dùng này';
      deleteDialog.openDialog({
        userId: record.id,
        displayName,
      });
    },
    [deleteDialog],
  );

  const renderSortIcon = useCallback(
    ({ sortOrder }) => (
      <FontAwesomeIcon
        icon={faSort}
        className={cx('users-page__sort-icon', { 'users-page__sort-icon--active': Boolean(sortOrder) })}
      />
    ),
    [],
  );

  const isDeletingUser = deleteUserMutation.isPending;

  const handleResetFilters = () => {
    table.filters.resetFilters();
  };

  const handleSearchChange = (event) => {
    table.filters.setSearch(event.target.value);
  };

  const handleRoleChange = (value) => {
    table.filters.setCustomFilter('role', value);
  };

  const handleStatusChange = (value) => {
    table.filters.setCustomFilter('status', value);
  };

  const columns = useMemo(
    () => [
      {
        title: 'STT',
        dataIndex: 'index',
        key: 'index',
        width: 70,
        align: 'center',
      },
      {
        title: 'Họ tên',
        dataIndex: 'fullName',
        key: 'fullName',
        width: 280,
        sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
      },
      {
        title: 'ID',
        dataIndex: 'identifier',
        key: 'identifier',
        width: 160,
        sorter: (a, b) => mapIdentifier(a).localeCompare(mapIdentifier(b)),
      },
      {
        title: 'Vai trò',
        dataIndex: 'role',
        key: 'role',
        width: 150,
        sorter: (a, b) => (a.role || '').localeCompare(b.role || ''),
      },
      {
        title: 'Khoa / Lớp',
        dataIndex: 'department',
        key: 'department',
        width: 200,
        sorter: (a, b) =>
          `${a.departmentCode || ''} ${a.classCode || ''}`.localeCompare(
            `${b.departmentCode || ''} ${b.classCode || ''}`,
          ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phoneNumber',
        key: 'phoneNumber',
        width: 160,
        sorter: (a, b) => (a.phoneNumber || '').localeCompare(b.phoneNumber || ''),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        key: 'status',
        width: 180,
        sorter: (a, b) => Number(Boolean(a.isActive)) - Number(Boolean(b.isActive)),
      },
      {
        title: 'Lần đăng nhập cuối',
        dataIndex: 'lastLoginAt',
        key: 'lastLoginAt',
        width: 220,
        sorter: (a, b) => toTimeValue(a.lastLoginAt) - toTimeValue(b.lastLoginAt),
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 160,
        align: 'center',
      },
    ],
    [],
  );

  const columnRenderers = useMemo(
    () => ({
      index: ({ index }) => (table.pagination.current - 1) * table.pagination.pageSize + index + 1,
      fullName: ({ record }) => (
        <div className={cx('users-page__user-cell')}>
          <Avatar size={44} src={record.avatarUrl} className={cx('users-page__avatar')}>
            {(record.fullName || record.email || '?').charAt(0).toUpperCase()}
          </Avatar>
          <div className={cx('users-page__user-info')}>
            <strong>{record.fullName || '--'}</strong>
            <span>{record.email || '--'}</span>
          </div>
        </div>
      ),
      identifier: ({ record }) => mapIdentifier(record),
      role: ({ value }) => ROLE_LABELS[value] || value || '--',
      department: ({ record }) => (
        <div className={cx('users-page__meta-cell')}>
          <strong>{record.departmentCode || '--'}</strong>
          <span>{record.classCode || '--'}</span>
        </div>
      ),
      phoneNumber: ({ value }) => value || '--',
      status: ({ value }) => buildStatusTag(Boolean(value)),
      lastLoginAt: ({ value }) => formatDateTime(value),
      actions: ({ record }) => (
        <div className={cx('users-page__actions')}>
          <Tooltip title="Chỉnh sửa">
            <button
              type="button"
              className={cx('users-page__action-button', 'users-page__action-button--edit')}
              onClick={(event) => {
                event.stopPropagation();
                handleEditUser(record.id);
              }}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          </Tooltip>
          <Tooltip title="Xóa người dùng">
            <button
              type="button"
              className={cx('users-page__action-button', 'users-page__action-button--delete')}
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteUser(record);
              }}
              disabled={isDeletingUser}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </Tooltip>
        </div>
      ),
    }),
    [handleDeleteUser, handleEditUser, isDeletingUser],
  );

  const hasUsers = users.length > 0;
  const startIndex = hasUsers ? (table.pagination.current - 1) * table.pagination.pageSize + 1 : 0;
  const endIndex = hasUsers ? startIndex + users.length - 1 : 0;

  return (
    <>
      {contextHolder}
      <div className={cx('users-page')}>
        <div className={cx('users-page__filter-bar')}>
          <Input
            size="large"
            allowClear
            value={table.filters.search}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm người dùng..."
            prefix={<FontAwesomeIcon icon={faSearch} />}
            className={cx('users-page__filter-search')}
          />

          <Select
            size="large"
            value={table.filters.customFilters.role || 'all'}
            onChange={handleRoleChange}
            options={ROLE_OPTIONS}
            className={cx('users-page__filter-select')}
          />

          <Select
            size="large"
            value={table.filters.customFilters.status || 'all'}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            className={cx('users-page__filter-select')}
          />

          <Button size="large" onClick={handleResetFilters} className={cx('users-page__reset-button')}>
            <FontAwesomeIcon icon={faArrowRotateRight} />
            Đặt lại
          </Button>
        </div>

        <div className={cx('users-page__content')}>
          <div className={cx('users-page__content-header')}>
            <h3>Danh sách người dùng</h3>
            <span className={cx('users-page__content-summary')}>
              {totalItems ? `${totalItems.toLocaleString('vi-VN')} người dùng` : 'Không có dữ liệu'}
            </span>
          </div>

          <div className={cx('users-page__table-wrapper')}>
            <AdminTable
              rowKey="id"
              columns={columns}
              dataSource={users}
              loading={isFetching}
              columnRenderers={columnRenderers}
              pagination={false}
              sortIcon={renderSortIcon}
              className={cx('users-page__table')}
            />
          </div>

          <div className={cx('users-page__pagination')}>
            <div className={cx('users-page__pagination-summary')}>
              {totalItems
                ? hasUsers
                  ? `Đang hiển thị ${startIndex}-${endIndex} trong ${totalItems.toLocaleString('vi-VN')} người dùng`
                  : 'Không tìm thấy người dùng phù hợp'
                : 'Không có người dùng'}
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
      </div>

      <ConfirmModal
        {...deleteDialog.dialogProps}
        title="Xóa người dùng"
        variant="danger"
        confirmText="Xóa"
        onConfirm={async () => {
          if (deleteDialog.data?.userId) {
            await deleteUserMutation.mutateAsync(deleteDialog.data.userId);
          }
        }}
      >
        {deleteDialog.data?.displayName && (
          <span>
            Bạn có chắc chắn muốn xóa <strong>{deleteDialog.data.displayName}</strong> khỏi hệ thống?
          </span>
        )}
      </ConfirmModal>
    </>
  );
}
