import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Checkbox, Input, Pagination, Select, Tag, Tooltip, Form } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleDot,
  faArrowRotateRight,
  faPenToSquare,
  faSearch,
  faSort,
  faTrash,
  faUserPlus,
  faChalkboardTeacher,
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import AdminTable from '@/admin/components/AdminTable/AdminTable';
import lecturersApi, { LECTURERS_QUERY_KEY } from '@/api/lecturers.api';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import { ROUTE_PATHS, buildPath } from '@/config/routes.config';
import useToast from '@/components/Toast/Toast';
import useTable from '@/hooks/useTable';
import useConfirmDialog from '@/hooks/useConfirmDialog';
import useModal from '@/hooks/useModal';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import BaseModal from '@/components/BaseModal/BaseModal';
import styles from './LecturersPage.module.scss';

const cx = classNames.bind(styles);

const STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Ngưng hoạt động', value: 'inactive' },
];

const formatDateTime = (value, placeholder = 'Chưa đăng nhập') => {
  if (!value) return placeholder;
  return dayjs(value).format('HH:mm DD/MM/YYYY');
};

const toTimeValue = (value) => (value ? dayjs(value).valueOf() : 0);

const buildStatusTag = (isActive) => (
  <Tag
    className={cx(
      'lecturers-page__status-tag',
      isActive ? 'lecturers-page__status-tag--active' : 'lecturers-page__status-tag--inactive',
    )}
  >
    <FontAwesomeIcon icon={faCircleDot} className={cx('lecturers-page__status-icon')} />
    {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
  </Tag>
);

export default function LecturersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageActions, setBreadcrumbs } = useContext(AdminPageContext);
  const { contextHolder, open: openToast } = useToast();

  // Table state management
  const table = useTable({ initialPageSize: 10, debounceDelay: 400 });
  const [statusValue, setStatusValue] = useState('all');

  // Assign modal state
  const assignModal = useModal();
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [assignForm] = Form.useForm();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Trang chủ', path: ROUTE_PATHS.ADMIN.DASHBOARD },
      { label: 'Quản lý giảng viên', path: ROUTE_PATHS.ADMIN.LECTURERS },
    ]);
    setPageActions([
      {
        key: 'create',
        label: 'Thêm giảng viên',
        type: 'primary',
        className: 'admin-navbar__add-button',
        icon: <FontAwesomeIcon icon={faUserPlus} />,
        onClick: () => navigate(ROUTE_PATHS.ADMIN.USER_CREATE), // Should probably be LECTURER_CREATE
      },
    ]);
    return () => {
      setBreadcrumbs(null);
      setPageActions(null);
    };
  }, [setBreadcrumbs, setPageActions, navigate]);

  const queryKey = useMemo(
    () => [
      LECTURERS_QUERY_KEY,
      {
        page: table.pagination.current,
        pageSize: table.pagination.pageSize,
        search: table.filters.debouncedSearch.trim(),
        status: statusValue,
      },
    ],
    [table.pagination, table.filters.debouncedSearch, statusValue],
  );

  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: ({ queryKey: [, params] }) => lecturersApi.list(params),
    keepPreviousData: true,
  });

  const { data: availableClasses } = useQuery({
    queryKey: ['admin', 'classes', 'available'],
    queryFn: lecturersApi.getAvailableClasses,
    enabled: assignModal.isOpen,
  });

  const deleteLecturerMutation = useMutation({
    mutationFn: (id) => lecturersApi.remove(id), // Assuming remove exists or using generic user remove
    onSuccess: (response) => {
      openToast({ message: response?.message || 'Đã xóa giảng viên.', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [LECTURERS_QUERY_KEY] });
    },
    onError: (error) => {
      openToast({ message: error.response?.data?.error || 'Không thể xóa giảng viên.', variant: 'danger' });
    },
  });

  const assignHomeroomMutation = useMutation({
    mutationFn: (payload) => lecturersApi.assignHomeroom(payload),
    onSuccess: (response) => {
      openToast({ message: response?.message || 'Đã phân công chủ nhiệm.', variant: 'success' });
      assignModal.close();
      assignForm.resetFields();
      queryClient.invalidateQueries({ queryKey: [LECTURERS_QUERY_KEY] });
    },
    onError: (error) => {
      openToast({ message: error.response?.data?.error || 'Phân công thất bại.', variant: 'danger' });
    },
  });

  // Delete confirmation dialog
  const deleteDialog = useConfirmDialog({
    onConfirm: async (lecturer) => {
      await deleteLecturerMutation.mutateAsync(lecturer.id);
    },
  });

  const lecturers = data?.teachers ?? []; // API returns { teachers: [], pagination: {} }
  const totalItems = data?.pagination?.total ?? 0;

  const handleEditLecturer = useCallback(
    (id) => {
      navigate(buildPath.adminUserEdit(id));
    },
    [navigate],
  );

  const handleDeleteLecturer = useCallback(
    (record) => {
      if (!record?.id) return;
      deleteDialog.open(record);
    },
    [deleteDialog],
  );

  const handleOpenAssignModal = useCallback(
    (record) => {
      assignModal.open(record);
      assignForm.setFieldsValue({ classIds: [] });
    },
    [assignModal, assignForm],
  );

  const handleAssignSubmit = (values) => {
    if (!assignModal.data) return;
    assignHomeroomMutation.mutate({
      teacherId: assignModal.data.id,
      classIds: values.classIds,
    });
  };

  const renderSortIcon = useCallback(
    ({ sortOrder }) => (
      <FontAwesomeIcon
        icon={faSort}
        className={cx('lecturers-page__sort-icon', { 'lecturers-page__sort-icon--active': Boolean(sortOrder) })}
      />
    ),
    [],
  );

  const isDeleting = deleteLecturerMutation.isPending;

  const handleResetFilters = () => {
    table.filters.setSearch('');
    setStatusValue('all');
    table.resetPagination();
  };

  const handleSearchChange = (event) => {
    table.filters.setSearch(event.target.value);
  };

  const handleStatusChange = (value) => {
    setStatusValue(value);
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
        dataIndex: 'staffCode',
        key: 'staffCode',
        width: 140,
        sorter: (a, b) => (a.staffCode || '').localeCompare(b.staffCode || ''),
      },
      {
        title: 'Khoa',
        dataIndex: 'department',
        key: 'department',
        width: 180,
        sorter: (a, b) => (a.department || '').localeCompare(b.department || ''),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        key: 'status',
        width: 160,
        sorter: (a, b) => Number(Boolean(a.isActive)) - Number(Boolean(b.isActive)),
      },
      {
        title: 'Lần đăng nhập cuối',
        dataIndex: 'lastLoginAt',
        key: 'lastLoginAt',
        width: 200,
        sorter: (a, b) => toTimeValue(a.lastLoginAt) - toTimeValue(b.lastLoginAt),
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 180,
        align: 'center',
      },
    ],
    [],
  );

  const columnRenderers = useMemo(
    () => ({
      index: ({ index }) => (table.pagination.current - 1) * table.pagination.pageSize + index + 1,
      fullName: ({ record }) => (
        <div className={cx('lecturers-page__user-cell')}>
          <Avatar size={40} src={record.avatarUrl} className={cx('lecturers-page__avatar')}>
            {(record.fullName || record.email || '?').charAt(0).toUpperCase()}
          </Avatar>
          <div className={cx('lecturers-page__user-info')}>
            <strong>{record.fullName || '--'}</strong>
            <span>{record.email || '--'}</span>
          </div>
        </div>
      ),
      staffCode: ({ value }) => value || '--',
      department: ({ value }) => value || '--',
      status: ({ value }) => buildStatusTag(Boolean(value)),
      lastLoginAt: ({ value }) => formatDateTime(value),
      actions: ({ record }) => (
        <div className={cx('lecturers-page__actions')}>
          <Tooltip title="Phân công chủ nhiệm">
            <button
              type="button"
              className={cx('lecturers-page__action-button', 'lecturers-page__action-button--assign')}
              onClick={(event) => {
                event.stopPropagation();
                handleOpenAssignModal(record);
              }}
            >
              <FontAwesomeIcon icon={faChalkboardTeacher} />
            </button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <button
              type="button"
              className={cx('lecturers-page__action-button', 'lecturers-page__action-button--edit')}
              onClick={(event) => {
                event.stopPropagation();
                handleEditLecturer(record.id);
              }}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          </Tooltip>
          <Tooltip title="Xóa giảng viên">
            <button
              type="button"
              className={cx('lecturers-page__action-button', 'lecturers-page__action-button--delete')}
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteLecturer(record);
              }}
              disabled={isDeleting}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </Tooltip>
        </div>
      ),
    }),
    [handleDeleteLecturer, handleEditLecturer, handleOpenAssignModal, isDeleting, table.pagination],
  );

  const hasLecturers = lecturers.length > 0;
  const startIndex = hasLecturers ? (table.pagination.current - 1) * table.pagination.pageSize + 1 : 0;
  const endIndex = hasLecturers ? startIndex + lecturers.length - 1 : 0;

  const classOptions = useMemo(() => {
    if (!availableClasses) return [];

    // Filter classes based on checkbox
    const filteredClasses = showOnlyUnassigned
      ? availableClasses.filter((cls) => !cls.giangVienChuNhiem)
      : availableClasses;

    // Map to options with only class name
    return filteredClasses.map((cls) => ({
      label: cls.tenLop,
      value: cls.id,
    }));
  }, [availableClasses, showOnlyUnassigned]);

  return (
    <>
      {contextHolder}
      <div className={cx('lecturers-page')}>
        <div className={cx('lecturers-page__filter-bar')}>
          <Input
            size="large"
            allowClear
            value={table.filters.search}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm giảng viên..."
            prefix={<FontAwesomeIcon icon={faSearch} />}
            className={cx('lecturers-page__filter-search')}
          />

          <Select
            size="large"
            value={statusValue}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            className={cx('lecturers-page__filter-select')}
          />

          <Button size="large" onClick={handleResetFilters} className={cx('lecturers-page__reset-button')}>
            <FontAwesomeIcon icon={faArrowRotateRight} />
            Đặt lại
          </Button>
        </div>

        <div className={cx('lecturers-page__content')}>
          <div className={cx('lecturers-page__content-header')}>
            <h3>Danh sách giảng viên</h3>
            <span className={cx('lecturers-page__content-summary')}>
              {totalItems ? `${totalItems.toLocaleString('vi-VN')} giảng viên` : 'Không có dữ liệu'}
            </span>
          </div>

          <div className={cx('lecturers-page__table-wrapper')}>
            <AdminTable
              rowKey="id"
              columns={columns}
              dataSource={lecturers}
              loading={isFetching}
              columnRenderers={columnRenderers}
              pagination={false}
              sortIcon={renderSortIcon}
              className={cx('lecturers-page__table')}
            />
          </div>

          <div className={cx('lecturers-page__pagination')}>
            <div className={cx('lecturers-page__pagination-summary')}>
              {totalItems
                ? hasLecturers
                  ? `Đang hiển thị ${startIndex}-${endIndex} trong ${totalItems.toLocaleString('vi-VN')} giảng viên`
                  : 'Không tìm thấy giảng viên phù hợp'
                : 'Không có giảng viên'}
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

      {/* Assign Homeroom Modal */}
      <BaseModal
        isOpen={assignModal.isOpen}
        onClose={() => {
          assignModal.close();
          setShowOnlyUnassigned(false);
        }}
        title={`Phân công chủ nhiệm - ${assignModal.data?.fullName || ''}`}
        size="md"
        footer={null}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssignSubmit}>
          <Form.Item
            name="classIds"
            label="Chọn lớp chủ nhiệm"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một lớp' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn lớp..."
              options={classOptions}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox checked={showOnlyUnassigned} onChange={(e) => setShowOnlyUnassigned(e.target.checked)}>
              Chỉ hiển thị lớp chưa có GVCN
            </Checkbox>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                onClick={() => {
                  assignModal.close();
                  setShowOnlyUnassigned(false);
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={assignHomeroomMutation.isPending}>
                Lưu phân công
              </Button>
            </div>
          </div>
        </Form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteDialog.isOpen}
        onConfirm={deleteDialog.confirm}
        onCancel={deleteDialog.close}
        isLoading={deleteDialog.isLoading}
        title="Xóa giảng viên"
        message={`Bạn có chắc chắn muốn xóa ${deleteDialog.data?.fullName || deleteDialog.data?.staffCode || 'giảng viên này'} khỏi hệ thống?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
      />
    </>
  );
}
