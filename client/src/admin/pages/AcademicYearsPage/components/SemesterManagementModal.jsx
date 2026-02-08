import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, DatePicker, message, Popconfirm, Modal } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import academicApi from '@/api/academic.api';

const { RangePicker } = DatePicker;

/**
 * SemesterManagementModal - Modal for managing semesters within an academic year
 */
export default function SemesterManagementModal({ open, year, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [editingSemester, setEditingSemester] = useState(null);
  const [semesterForm] = Form.useForm();

  const { data: semesters } = useQuery({
    queryKey: ['admin', 'semesters', year?.id],
    queryFn: () => academicApi.getHocKys(year.id),
    enabled: !!year,
  });

  const createSemesterMutation = useMutation({
    mutationFn: ({ namHocId, data }) => academicApi.createHocKy(namHocId, data),
    onSuccess: () => {
      message.success('Tạo học kỳ thành công');
      queryClient.invalidateQueries(['admin', 'semesters', year?.id]);
      queryClient.invalidateQueries(['admin', 'academic-years']);
      setEditingSemester(null);
      semesterForm.resetFields();
      onSuccess?.();
    },
  });

  const updateSemesterMutation = useMutation({
    mutationFn: ({ id, data }) => academicApi.updateHocKy(id, data),
    onSuccess: () => {
      message.success('Cập nhật học kỳ thành công');
      queryClient.invalidateQueries(['admin', 'semesters', year?.id]);
      setEditingSemester(null);
      semesterForm.resetFields();
      onSuccess?.();
    },
  });

  const deleteSemesterMutation = useMutation({
    mutationFn: academicApi.deleteHocKy,
    onSuccess: () => {
      message.success('Xóa học kỳ thành công');
      queryClient.invalidateQueries(['admin', 'semesters', year?.id]);
      queryClient.invalidateQueries(['admin', 'academic-years']);
      onSuccess?.();
    },
  });

  const handleEditSemester = (semester) => {
    setEditingSemester(semester);
    semesterForm.setFieldsValue({
      ma: semester.ma,
      ten: semester.ten,
      thuTu: semester.thuTu,
      moTa: semester.moTa,
      dateRange: [dayjs(semester.batDau), dayjs(semester.ketThuc)],
    });
  };

  const handleSubmitSemester = (values) => {
    const [batDau, ketThuc] = values.dateRange;
    const payload = {
      ma: values.ma,
      ten: values.ten,
      thuTu: values.thuTu,
      moTa: values.moTa,
      batDau: batDau.toISOString(),
      ketThuc: ketThuc.toISOString(),
    };

    if (editingSemester) {
      updateSemesterMutation.mutate({ id: editingSemester.id, data: payload });
    } else {
      createSemesterMutation.mutate({ namHocId: year.id, data: payload });
    }
  };

  const handleCancelEdit = () => {
    setEditingSemester(null);
    semesterForm.resetFields();
  };

  return (
    <Modal title={`Quản lý học kỳ - ${year?.nienKhoa}`} open={open} onCancel={onClose} footer={null} width={800}>
      <div style={{ marginBottom: 16 }}>
        {semesters?.map((semester) => (
          <div
            key={semester.id}
            style={{ marginBottom: 12, padding: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>{semester.ten}</h4>
                <p style={{ margin: '4px 0', color: '#8c8c8c', fontSize: 14 }}>
                  {dayjs(semester.batDau).format('DD/MM/YYYY')} - {dayjs(semester.ketThuc).format('DD/MM/YYYY')}
                </p>
              </div>
              <div>
                <Button
                  type="link"
                  size="small"
                  icon={<FontAwesomeIcon icon={faEdit} />}
                  onClick={() => handleEditSemester(semester)}
                >
                  Sửa
                </Button>
                <Popconfirm
                  title="Xóa học kỳ"
                  description="Bạn có chắc chắn muốn xóa học kỳ này?"
                  onConfirm={() => deleteSemesterMutation.mutate(semester.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button type="link" danger size="small" icon={<FontAwesomeIcon icon={faTrash} />}>
                    Xóa
                  </Button>
                </Popconfirm>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingSemester && (
        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
          <h4>Chỉnh sửa học kỳ</h4>
          <Form form={semesterForm} layout="vertical" onFinish={handleSubmitSemester}>
            <Form.Item name="ma" label="Mã học kỳ" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="ten" label="Tên học kỳ" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="thuTu" label="Thứ tự" rules={[{ required: true }]}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="moTa" label="Mô tả">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="dateRange" label="Thời gian" rules={[{ required: true }]}>
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={handleCancelEdit}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={updateSemesterMutation.isPending}>
                Cập nhật
              </Button>
            </div>
          </Form>
        </div>
      )}
    </Modal>
  );
}
