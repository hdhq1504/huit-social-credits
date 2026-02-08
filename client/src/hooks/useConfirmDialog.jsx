import { useCallback } from 'react';
import useModal from './useModal';

/**
 * useConfirmDialog - Specialized hook for confirmation dialogs
 *
 * Extends useModal with confirmation logic.
 * Handles loading state during async operations.
 * Automatically closes on success, stays open on error.
 *
 * @param {Object} options - Configuration options
 * @param {Function} [options.onConfirm] - Async function to call on confirm
 * @param {Function} [options.onOpen] - Callback when dialog opens
 * @param {Function} [options.onClose] - Callback when dialog closes
 * @returns {Object} Dialog state and handlers
 */
export default function useConfirmDialog(options = {}) {
  const { onConfirm, ...modalOptions } = options;
  const modal = useModal(modalOptions);

  /**
   * Confirm action using the onConfirm callback
   * Sets loading state, calls onConfirm with modal data,
   * closes on success, keeps open on error
   */
  const confirm = useCallback(async () => {
    if (!onConfirm) return;

    modal.setLoading(true);
    try {
      await onConfirm(modal.data);
      modal.close();
    } catch (error) {
      // Keep modal open on error so user can retry or cancel
      modal.setLoading(false);
      throw error;
    }
  }, [modal, onConfirm]);

  /**
   * Confirm action with custom async function
   * Useful when you need different confirm logic per instance
   *
   * @param {*} data - Data to pass to async function
   * @param {Function} asyncFn - Async function to execute
   */
  const confirmAsync = useCallback(
    async (data, asyncFn) => {
      modal.setLoading(true);
      try {
        await asyncFn(data);
        modal.close();
      } catch (error) {
        modal.setLoading(false);
        throw error;
      }
    },
    [modal],
  );

  return {
    ...modal,
    confirm,
    confirmAsync,
  };
}
