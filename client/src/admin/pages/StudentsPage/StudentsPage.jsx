import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import studentsApi, { STUDENTS_QUERY_KEY } from '@/api/students.api';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import { ROUTE_PATHS, buildPath } from '@/config/routes.config';
import useToast from '@/components/Toast/Toast';
import useTable from '@/hooks/useTable';
import useConfirmDialog from '@/hooks/useConfirmDialog';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import styles from './StudentsPage.module.scss';

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
      'students-page__status-tag',
      isActive ? 'students-page__status-tag--active' : 'students-page__status-tag--inactive',
    )}
  >
    <FontAwesomeIcon icon={faCircleDot} className={cx('students-page__status-icon')} />
    {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
  </Tag>
);

export default function StudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageActions, setBreadcrumbs } = useContext(AdminPageContext);
  const { contextHolder, open: openToast } = useToast();

  // Table state management
  const table = useTable({ initialPageSize: 10, debounceDelay: 400 });

  // Custom filter states
  const [statusValue, setStatusValue] = useState('all');
  const [facultyValue, setFacultyValue] = useState('all');
  const [classValue, setClassValue] = useState('all');

  const { data: facultiesData } = useQuery({
    queryKey: ['admin', 'faculties'],
    queryFn: studentsApi.getFaculties,
  });

  const FACULTY_OPTIONS = useMemo(() => {
    if (!facultiesData) return [{ label: 'Tất cả khoa', value: 'all' }];
    return [{ label: 'Tất cả khoa', value: 'all' }, ...facultiesData.map((f) => ({ label: f.tenKhoa, value: f.id }))];
  }, [facultiesData]);

  const { data: classesData } = useQuery({
    queryKey: ['admin', 'classes', facultyValue],
    queryFn: () => studentsApi.getClassesByFaculty(facultyValue),
    enabled: facultyValue !== 'all',
  });

  const classOptions = useMemo(() => {
    if (!classesData) return [{ label: 'Tất cả lớp', value: 'all' }];
    return [{ label: 'Tất cả lớp', value: 'all' }, ...classesData.map((cls) => ({ label: cls.maLop, value: cls.id }))];
  }, [classesData]);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Trang chủ', path: ROUTE_PATHS.ADMIN.DASHBOARD },
      { label: 'Quản lý sinh viên', path: ROUTE_PATHS.ADMIN.STUDENTS },
    ]);
    setPageActions([
      {
        key: 'create',
        label: 'Thêm sinh viên',
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
      STUDENTS_QUERY_KEY,
      {
        page: table.pagination.current,
        pageSize: table.pagination.pageSize,
        search: table.filters.debouncedSearch.trim(),
        status: statusValue,
        khoaId: facultyValue !== 'all' ? facultyValue : undefined,
        lopId: classValue !== 'all' ? classValue : undefined,
      },
    ],
    [table.pagination, table.filters.debouncedSearch, statusValue, facultyValue, classValue],
  );

  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: ({ queryKey: [, params] }) => studentsApi.list(params),
    keepPreviousData: true,
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id) => studentsApi.remove(id),
    onSuccess: (response) => {
      openToast({ message: response?.message || 'Đã xóa sinh viên.', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_QUERY_KEY] });
    },
    onError: (error) => {
      openToast({ message: error.response?.data?.error || 'Không thể xóa sinh viên.', variant: 'danger' });
    },
  });

  // Delete confirmation dialog
  const deleteDialog = useConfirmDialog({
    onConfirm: async (student) => {
      await deleteStudentMutation.mutateAsync(student.id);
    },
  });

  const students = data?.students ?? [];
  const totalItems = data?.pagination?.total ?? 0;

  const handleEditStudent = useCallback(
    (id) => {
      navigate(buildPath.adminUserEdit(id));
    },
    [navigate],
  );

  const handleDeleteStudent = useCallback(
    (record) => {
      if (!record?.id) return;
      deleteDialog.open(record);
    },
    [deleteDialog],
  );

  const renderSortIcon = useCallback(
    ({ sortOrder }) => (
      <FontAwesomeIcon
        icon={faSort}
        className={cx('students-page__sort-icon', { 'students-page__sort-icon--active': Boolean(sortOrder) })}
      />
    ),
    [],
  );

  const isDeleting = deleteStudentMutation.isPending;

  const handleResetFilters = () => {
    table.filters.setSearch('');
    setStatusValue('all');
    setFacultyValue('all');
    setClassValue('all');
    table.resetPagination();
  };

  const handleSearchChange = (event) => {
    table.filters.setSearch(event.target.value);
  };

  const handleStatusChange = (value) => {
    setStatusValue(value);
  };

  const handleFacultyChange = (value) => {
    setFacultyValue(value);
    setClassValue('all');
  };

  const handleClassChange = (value) => {
    setClassValue(value);
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
        title: 'Thông tin sinh viên',
        dataIndex: 'fullName',
        key: 'fullName',
        width: 280,
        sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
      },
      {
        title: 'MSSV',
        dataIndex: 'studentCode',
        key: 'studentCode',
        width: 140,
        sorter: (a, b) => (a.studentCode || '').localeCompare(b.studentCode || ''),
      },
      {
        title: 'Lớp',
        dataIndex: 'classCode',
        key: 'classCode',
        width: 120,
        sorter: (a, b) => (a.classCode || '').localeCompare(b.classCode || ''),
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
        width: 140,
        align: 'center',
      },
    ],
    [],
  );

  const columnRenderers = useMemo(
    () => ({
      index: ({ index }) => (table.pagination.current - 1) * table.pagination.pageSize + index + 1,
      fullName: ({ record }) => (
        <div className={cx('students-page__user-cell')}>
          <Avatar size={40} src={record.avatarUrl} className={cx('students-page__avatar')}>
            {(record.fullName || record.email || '?').charAt(0).toUpperCase()}
          </Avatar>
          <div className={cx('students-page__user-info')}>
            <strong>{record.fullName || '--'}</strong>
            <span>{record.email || '--'}</span>
          </div>
        </div>
      ),
      studentCode: ({ value }) => value || '--',
      classCode: ({ value }) => value || '--',
      department: ({ value }) => value || '--',
      status: ({ value }) => buildStatusTag(Boolean(value)),
      lastLoginAt: ({ value }) => formatDateTime(value),
      actions: ({ record }) => (
        <div className={cx('students-page__actions')}>
          <Tooltip title="Chỉnh sửa">
            <button
              type="button"
              className={cx('students-page__action-button', 'students-page__action-button--edit')}
              onClick={(event) => {
                event.stopPropagation();
                handleEditStudent(record.id);
              }}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          </Tooltip>
          <Tooltip title="Xóa sinh viên">
            <button
              type="button"
              className={cx('students-page__action-button', 'students-page__action-button--delete')}
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteStudent(record);
              }}
              disabled={isDeleting}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </Tooltip>
        </div>
      ),
    }),
    [handleDeleteStudent, handleEditStudent, isDeleting, table.pagination],
  );

  const hasStudents = students.length > 0;
  const startIndex = hasStudents ? (table.pagination.current - 1) * table.pagination.pageSize + 1 : 0;
  const endIndex = hasStudents ? startIndex + students.length - 1 : 0;

  return (
    <>
      {contextHolder}
      <div className={cx('students-page')}>
        <div className={cx('students-page__filter-bar')}>
          <Input
            size="large"
            allowClear
            value={table.filters.search}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm sinh viên..."
            prefix={<FontAwesomeIcon icon={faSearch} />}
            className={cx('students-page__filter-search')}
          />

          <Select
            size="large"
            value={facultyValue}
            onChange={handleFacultyChange}
            options={FACULTY_OPTIONS}
            className={cx('students-page__filter-select')}
            placeholder="Chọn khoa"
          />

          <Select
            size="large"
            value={classValue}
            onChange={handleClassChange}
            options={classOptions}
            className={cx('students-page__filter-select')}
            placeholder="Chọn lớp"
            disabled={facultyValue === 'all'}
          />

          <Select
            size="large"
            value={statusValue}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            className={cx('students-page__filter-select')}
          />

          <Button size="large" onClick={handleResetFilters} className={cx('students-page__reset-button')}>
            <FontAwesomeIcon icon={faArrowRotateRight} />
            Đặt lại
          </Button>
        </div>

        <div className={cx('students-page__content')}>
          <div className={cx('students-page__content-header')}>
            <h3>Danh sách sinh viên</h3>
            <span className={cx('students-page__content-summary')}>
              {totalItems ? `${totalItems.toLocaleString('vi-VN')} sinh viên` : 'Không có dữ liệu'}
            </span>
          </div>

          <div className={cx('students-page__table-wrapper')}>
            <AdminTable
              rowKey="id"
              columns={columns}
              dataSource={students}
              loading={isFetching}
              columnRenderers={columnRenderers}
              pagination={false}
              sortIcon={renderSortIcon}
              className={cx('students-page__table')}
            />
          </div>

          <div className={cx('students-page__pagination')}>
            <div className={cx('students-page__pagination-summary')}>
              {totalItems
                ? hasStudents
                  ? `Đang hiển thị ${startIndex}-${endIndex} trong ${totalItems.toLocaleString('vi-VN')} sinh viên`
                  : 'Không tìm thấy sinh viên phù hợp'
                : 'Không có sinh viên'}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteDialog.isOpen}
        onConfirm={deleteDialog.confirm}
        onCancel={deleteDialog.close}
        isLoading={deleteDialog.isLoading}
        title="Xóa sinh viên"
        message={`Bạn có chắc chắn muốn xóa ${deleteDialog.data?.fullName || deleteDialog.data?.studentCode || 'sinh viên này'} khỏi hệ thống?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
      />
    </>
  );
}
