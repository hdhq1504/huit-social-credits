import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import activitiesApi from '@api/activities.api';
import { computeDescriptorFromDataUrl } from '@/services/faceApiService';
import uploadService from '@/services/uploadService';
import { fileToDataUrl } from '@utils/file';

/**
 * useMyActivities - Custom hook for activity mutations and action handlers
 * @param {Object} params
 * @param {Function} params.toast - Toast notification function
 * @param {string} params.userId - Current user ID
 * @param {Function} params.invalidateQueries - Function to invalidate activity queries
 * @returns {Object} { mutations, actions }
 */
export default function useMyActivities({ toast, userId, invalidateQueries }) {
  // ============================================
  // MUTATIONS
  // ============================================

  const registerMutation = useMutation({
    mutationFn: ({ id, note }) => activitiesApi.register(id, { note }),
    onSuccess: async () => {
      await invalidateQueries();
      toast({ message: 'Đăng ký hoạt động thành công!', variant: 'success' });
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Không thể đăng ký hoạt động. Vui lòng thử lại.';
      toast({ message, variant: 'danger' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, note }) => activitiesApi.cancel(id, { reason, note }),
    onSuccess: async () => {
      await invalidateQueries();
      toast({ message: 'Hủy đăng ký hoạt động thành công!', variant: 'success' });
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Không thể hủy đăng ký hoạt động. Vui lòng thử lại.';
      toast({ message, variant: 'danger' });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ id, payload }) => activitiesApi.attendance(id, payload),
    onSuccess: async (data) => {
      await invalidateQueries();
      return data;
    },
    onError: (error) => {
      const rawMessage = error.response?.data?.error;
      const message =
        typeof rawMessage === 'string' && rawMessage.trim()
          ? rawMessage.trim()
          : 'Không thể điểm danh hoạt động. Vui lòng thử lại.';
      toast({ message, variant: 'danger' });
      if (error && typeof error === 'object') {
        try {
          Object.defineProperty(error, 'handledByToast', { value: true, configurable: true, writable: true });
        } catch {
          // ignore
        }
      }
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, content, attachments }) => activitiesApi.feedback(id, { content, attachments }),
    onSuccess: async () => {
      await invalidateQueries();
      toast({ message: 'Gửi phản hồi thành công!', variant: 'success' });
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Không thể gửi phản hồi. Vui lòng thử lại.';
      toast({ message, variant: 'danger' });
    },
  });

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleRegister = useCallback(
    async ({ activity, note }) => {
      if (!activity?.id) return;
      await registerMutation.mutateAsync({ id: activity.id, note });
    },
    [registerMutation],
  );

  const handleCancel = useCallback(
    async ({ activity, reason, note }) => {
      if (!activity?.id) return;
      await cancelMutation.mutateAsync({ id: activity.id, reason, note });
    },
    [cancelMutation],
  );

  const handleAttendance = useCallback(
    async ({ activity, dataUrl, file, phase, faceDescriptor, faceError }) => {
      if (!activity?.id) return;

      // Convert file to dataURL if needed
      let evidenceDataUrl = dataUrl ?? null;
      if (!evidenceDataUrl && file) {
        try {
          evidenceDataUrl = await fileToDataUrl(file);
        } catch (error) {
          console.error('[useMyActivities] Không convert file -> dataURL:', error);
          toast({
            message: 'Không thể đọc file ảnh. Vui lòng thử lại.',
            variant: 'danger',
          });
          throw new Error('ATTENDANCE_ABORTED');
        }
      }

      // Process face recognition (always required for photo attendance)
      let descriptorPayload = null;
      let faceErrorPayload = faceError ?? null;

      // Convert faceDescriptor to array if provided
      if (faceDescriptor && typeof faceDescriptor === 'object') {
        try {
          descriptorPayload = Array.from(faceDescriptor);
        } catch {
          descriptorPayload = Array.isArray(faceDescriptor) ? faceDescriptor : null;
        }
      }

      // Compute face descriptor if not provided and we have image data
      if (!descriptorPayload && !faceErrorPayload && evidenceDataUrl) {
        try {
          const computedDescriptor = await computeDescriptorFromDataUrl(evidenceDataUrl);
          if (computedDescriptor?.length) {
            descriptorPayload = computedDescriptor;
          } else {
            faceErrorPayload = 'NO_FACE_DETECTED';
          }
        } catch (err) {
          console.error('[useMyActivities] Lỗi phân tích khuôn mặt:', err);
          faceErrorPayload = 'ANALYSIS_FAILED';
        }
      }

      // Log face detection result
      if (!descriptorPayload?.length) {
        console.debug('[useMyActivities] Không phát hiện khuôn mặt, sẽ gửi với faceError để chờ duyệt.', {
          faceError: faceErrorPayload || 'NO_FACE_DETECTED',
        });
        faceErrorPayload = faceErrorPayload || 'NO_FACE_DETECTED';
      } else {
        console.debug('[useMyActivities] Chuẩn bị gửi điểm danh với descriptor khuôn mặt.', {
          descriptorLength: descriptorPayload.length,
        });
      }

      // Submit attendance
      return attendanceMutation.mutateAsync({
        id: activity.id,
        payload: {
          status: 'present',
          phase,
          evidence: evidenceDataUrl
            ? {
                data: evidenceDataUrl,
                mimeType: file?.type || 'image/jpeg',
                fileName: file?.name || `attendance_${Date.now()}.jpg`,
              }
            : undefined,
          ...(descriptorPayload ? { faceDescriptor: descriptorPayload } : {}),
          ...(faceErrorPayload && !descriptorPayload ? { faceError: faceErrorPayload } : {}),
        },
      });
    },
    [attendanceMutation, toast],
  );

  const handleFeedback = useCallback(
    async ({ activity, content, files }) => {
      if (!activity?.id) return;
      try {
        const attachments = await uploadService.uploadMultipleFeedbackEvidence(files || [], {
          userId,
          activityId: activity.id,
        });
        await feedbackMutation.mutateAsync({ id: activity.id, content, attachments });
      } catch (error) {
        const message = error?.message || 'Không thể tải minh chứng. Vui lòng thử lại.';
        toast({ message, variant: 'danger' });
      }
    },
    [feedbackMutation, toast, userId],
  );

  // ============================================
  // RETURN
  // ============================================

  return {
    mutations: {
      register: registerMutation,
      cancel: cancelMutation,
      attendance: attendanceMutation,
      feedback: feedbackMutation,
    },
    actions: {
      handleRegister,
      handleCancel,
      handleAttendance,
      handleFeedback,
    },
  };
}
