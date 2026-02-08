import { useState, useCallback } from 'react';

/**
 * useModal - Reusable hook for modal state management
 *
 * Manages:
 * - Open/close state
 * - Data passing to modal
 * - Loading state
 *
 * Automatically clears data and loading state when modal closes.
 *
 * @param {Object} options - Configuration options
 * @param {Function} [options.onOpen] - Callback when modal opens
 * @param {Function} [options.onClose] - Callback when modal closes
 * @returns {Object} Modal state and handlers
 */
export default function useModal(options = {}) {
  const { onOpen, onClose } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Open modal with optional data
   * @param {*} modalData - Data to pass to modal
   */
  const open = useCallback(
    (modalData) => {
      setIsOpen(true);
      setData(modalData);
      onOpen?.(modalData);
    },
    [onOpen],
  );

  /**
   * Close modal and reset state
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
    setIsLoading(false);
    onClose?.();
  }, [onClose]);

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  const setLoadingState = useCallback((loading) => {
    setIsLoading(loading);
  }, []);

  return {
    isOpen,
    data,
    isLoading,
    open,
    close,
    setLoading: setLoadingState,
  };
}
