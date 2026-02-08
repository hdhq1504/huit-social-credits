import React, { useContext, useEffect, useMemo, useCallback } from 'react';
import classNames from 'classnames/bind';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, DatePicker, message, Popconfirm, Tag, Collapse, Tooltip, Modal } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faCheck } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import academicApi from '@/api/academic.api';
import { AdminPageContext } from '@/admin/contexts/AdminPageContext';
import AdminTable from '@/admin/components/AdminTable/AdminTable';
import { ROUTE_PATHS } from '@/config/routes.config';
import useTable from '@/hooks/useTable';
import useModal from '@/hooks/useModal';
import BaseModal from '@/components/BaseModal/BaseModal';
import { SemesterManagementModal } from './components';
import styles from './AcademicYearsPage.module.scss';

const cx = classNames.bind(styles);
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

export default function AcademicYearsPage() {
  const queryClient = useQueryClient();
  const { setPageActions, setBreadcrumbs } = useContext(AdminPageContext);

  // Table and modal state management
  const table = useTable({ initialPageSize: 10 });
  const editModal = useModal();
  const semesterModal = useModal();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'academic-years'],
    queryFn: () => academicApi.getNamHocs({ page: 1, pageSize: 100 }),
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Trang chủ', path: ROUTE_PATHS.ADMIN.DASHBOARD },
      { label: 'Cấu hình năm học, học kỳ', path: ROUTE_PATHS.ADMIN.ACADEMIC_YEARS },
    ]);
    setPageActions([
      {
        key: 'create',
        label: 'Tạo năm học mới',
        type: 'primary',
        className: 'admin-navbar__btn--primary',
        icon: <FontAwesomeIcon icon={faPlus} />,
        onClick: () => editModal.open(),
      },
    ]);
    return () => {
      setBreadcrumbs(null);
      setPageActions(null);
    };
  }, [setBreadcrumbs, setPageActions, editModal]);

  const createMutation = useMutation({
    mutationFn: academicApi.createNamHoc,
    onSuccess: () => {
      message.success('Tạo năm học thành công');
      queryClient.invalidateQueries(['admin', 'academic-years']);
      handleCloseModal();
    },
    onError: (error) => {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => academicApi.updateNamHoc(id, data),
    onSuccess: () => {
      message.success('Cập nhật năm học thành công');
      queryClient.invalidateQueries(['admin', 'academic-years']);
      queryClient.invalidateQueries({ queryKey: ['admin', 'semesters'] });
      handleCloseModal();
    },
    onError: (error) => {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: academicApi.deleteNamHoc,
    onSuccess: () => {
      message.success('Xóa năm học thành công');
      queryClient.invalidateQueries(['admin', 'academic-years']);
    },
    onError: (error) => {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra');
    },
  });

  const activateMutation = useMutation({
    mutationFn: academicApi.activateNamHoc,
    onSuccess: () => {
      message.success('Kích hoạt năm học thành công');
      queryClient.invalidateQueries(['admin', 'academic-years']);
    },
    onError: (error) => {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra');
    },
  });

  const handleOpenModal = useCallback(
    (year = null) => {
      editModal.open(year);
      if (year) {
        form.setFieldsValue({
          ma: year.ma,
          nienKhoa: year.nienKhoa,
          ten: year.ten,
          dateRange: [dayjs(year.batDau), dayjs(year.ketThuc)],
        });
      } else {
        form.resetFields();
      }
    },
    [editModal, form],
  );

  const handleCloseModal = useCallback(() => {
    editModal.close();
    form.resetFields();
  }, [editModal, form]);

  const handleSubmit = async (values) => {
    const [batDau, ketThuc] = values.dateRange;
    const payload = {
      ma: values.ma,
      nienKhoa: values.nienKhoa,
      ten: values.ten,
      batDau: batDau.toISOString(),
      ketThuc: ketThuc.toISOString(),
    };

    if (editModal.data) {
      updateMutation.mutate({ id: editModal.data.id, data: payload });
    } else {
      createMutation.mutate(payload, {
        onSuccess: async (response) => {
          const yearId = response.namHoc.id;
          const yearStart = dayjs(batDau);
          const yearEnd = dayjs(ketThuc);

          const semesters = [
            {
              ma: `${values.ma}-HK1`,
              ten: 'Học kỳ 1',
              thuTu: 1,
              batDau: yearStart.toISOString(),
              ketThuc: yearStart.add(4, 'month').toISOString(),
            },
            {
              ma: `${values.ma}-HK2`,
              ten: 'Học kỳ 2',
              thuTu: 2,
              batDau: yearStart.add(4, 'month').add(1, 'day').toISOString(),
              ketThuc: yearStart.add(8, 'month').toISOString(),
            },
            {
              ma: `${values.ma}-HK3`,
              ten: 'Học kỳ 3',
              thuTu: 3,
              batDau: yearStart.add(8, 'month').add(1, 'day').toISOString(),
              ketThuc: yearEnd.toISOString(),
            },
          ];

          try {
            await Promise.all(semesters.map((sem) => academicApi.createHocKy(yearId, sem)));
            message.success('Đã tạo 3 học kỳ tự động');
            queryClient.invalidateQueries(['admin', 'academic-years']);
          } catch {
            message.warning('Năm học đã tạo nhưng có lỗi khi tạo học kỳ');
          }
        },
      });
    }
  };

  const handleDelete = useCallback(
    (id) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const handleActivate = useCallback(
    (id) => {
      activateMutation.mutate(id);
    },
    [activateMutation],
  );

  const handleManageSemesters = useCallback(
    (year) => {
      semesterModal.open(year);
    },
    [semesterModal],
  );

  const columns = useMemo(
    () => [
      { title: 'Mã', dataIndex: 'ma', key: 'ma', width: 100 },
      { title: 'Niên khóa', dataIndex: 'nienKhoa', key: 'nienKhoa', width: 150 },
      { title: 'Tên năm học', dataIndex: 'ten', key: 'ten', width: 200 },
      {
        title: 'Thời gian',
        key: 'time',
        width: 200,
        render: ({ record }) => (
          <span>
            {dayjs(record.batDau).format('DD/MM/YYYY')} - {dayjs(record.ketThuc).format('DD/MM/YYYY')}
          </span>
        ),
      },
      {
        title: 'Số học kỳ',
        dataIndex: ['_count', 'hocKy'],
        key: 'semesterCount',
        width: 100,
        align: 'center',
        render: ({ value: count, record }) => (
          <Button type="link" onClick={() => handleManageSemesters(record)}>
            {count || 0} học kỳ
          </Button>
        ),
      },
      { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 80, align: 'center' },
      { title: 'Hành động', key: 'actions', width: 200, align: 'center' },
    ],
    [handleManageSemesters],
  );

  const columnRenderers = useMemo(
    () => ({
      isActive: ({ value }) => (
        <Tag
          className={cx(
            'academic-years-page__status-tag',
            value ? 'academic-years-page__status-tag--success' : 'academic-years-page__status-tag--default',
          )}
          icon={value ? <FontAwesomeIcon icon={faCheck} /> : null}
        >
          {value ? 'Đang áp dụng' : 'Không hoạt động'}
        </Tag>
      ),
      actions: ({ record }) => (
        <div className={cx('academic-years-page__actions')}>
          {!record.isActive && (
            <button
              type="button"
              className={cx('academic-years-page__action-button', 'academic-years-page__action-button--activate')}
              onClick={() => handleActivate(record.id)}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
          )}
          <Tooltip title="Sửa">
            <button
              type="button"
              className={cx('academic-years-page__action-button', 'academic-years-page__action-button--edit')}
              onClick={() => handleOpenModal(record)}
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
          </Tooltip>
          <Popconfirm
            title="Xóa năm học"
            description="Bạn có chắc chắn muốn xóa năm học này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <button
                type="button"
                className={cx('academic-years-page__action-button', 'academic-years-page__action-button--delete')}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    }),
    [handleActivate, handleDelete, handleOpenModal],
  );

  const namHocs = data?.namHocs || [];

  return (
    <div className={cx('academic-years-page')}>
      <div className={cx('academic-years-page__content')}>
        <div className={cx('academic-years-page__content-header')}>
          <h3>Danh sách năm học</h3>
          <div className={cx('academic-years-page__stats')}>
            Tổng số: <strong>{namHocs.length}</strong>
          </div>
        </div>
        <AdminTable
          columns={columns}
          dataSource={namHocs}
          rowKey="id"
          loading={isLoading}
          columnRenderers={columnRenderers}
          pagination={{
            current: table.pagination.current,
            pageSize: table.pagination.pageSize,
            total: namHocs.length,
            onChange: table.pagination.onChange,
            showSizeChanger: false,
          }}
          className={cx('academic-years-page__table')}
        />
      </div>

      <BaseModal
        title={editModal.data ? 'Chỉnh sửa năm học' : 'Thêm năm học mới'}
        isOpen={editModal.isOpen}
        onClose={handleCloseModal}
        footer={null}
        size="md"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="ma" label="Mã năm học" rules={[{ required: true, message: 'Vui lòng nhập mã năm học' }]}>
            <Input placeholder="VD: 2024-2025" />
          </Form.Item>

          <Form.Item name="nienKhoa" label="Niên khóa" rules={[{ required: true, message: 'Vui lòng nhập niên khóa' }]}>
            <Input placeholder="VD: 2024-2025" />
          </Form.Item>

          <Form.Item name="ten" label="Tên năm học">
            <Input placeholder="VD: Năm học 2024-2025" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Thời gian"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
            />
          </Form.Item>

          {!editModal.data && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#0369a1' }}>
                💡 Hệ thống sẽ tự động tạo 3 học kỳ cho năm học này
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCloseModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editModal.data ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </BaseModal>

      <SemesterManagementModal
        open={semesterModal.isOpen}
        year={semesterModal.data}
        onClose={() => semesterModal.close()}
        onSuccess={() => {
          queryClient.invalidateQueries(['admin', 'academic-years']);
        }}
      />
    </div>
  );
}
