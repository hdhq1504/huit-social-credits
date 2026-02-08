import { useState, useCallback, useEffect, useMemo } from 'react';
import useDebounce from './useDebounce';

/**
 * useTable - Reusable hook for table state management
 *
 * Manages:
 * - Pagination (current page, page size)
 * - Filters (search with debounce, custom filters)
 * - Sorting (field, order)
 * - Row selection (selected keys)
 *
 * Auto-resets pagination to page 1 when filters change.
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.initialPageSize=10] - Initial page size
 * @param {number} [options.debounceDelay=300] - Debounce delay for search (ms)
 * @returns {Object} Table state and handlers
 */
export default function useTable(options = {}) {
  const { initialPageSize = 10, debounceDelay = 300 } = options;

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: initialPageSize,
  });

  // Filter state
  const [search, setSearch] = useState('');
  const [customFilters, setCustomFilters] = useState({});
  const debouncedSearch = useDebounce(search, debounceDelay);

  // Sorting state
  const [sorting, setSorting] = useState({
    field: null,
    order: null,
  });

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState([]);

  // Auto-reset pagination to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [debouncedSearch, customFilters]);

  // Pagination handler
  const handlePaginationChange = useCallback((page, pageSize) => {
    setPagination({ current: page, pageSize });
  }, []);

  // Custom filter setter
  const handleSetCustomFilter = useCallback((key, value) => {
    setCustomFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setCustomFilters({});
  }, []);

  // Sorting handler
  const handleSetSort = useCallback((field, order) => {
    setSorting({ field, order });
  }, []);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  // Reset pagination to initial state
  const handleResetPagination = useCallback(() => {
    setPagination({ current: 1, pageSize: initialPageSize });
  }, [initialPageSize]);

  // Memoize all return objects for stable references
  const paginationResult = useMemo(
    () => ({
      current: pagination.current,
      pageSize: pagination.pageSize,
      onChange: handlePaginationChange,
    }),
    [pagination.current, pagination.pageSize, handlePaginationChange],
  );

  const filtersResult = useMemo(
    () => ({
      search,
      setSearch,
      debouncedSearch,
      customFilters,
      setCustomFilter: handleSetCustomFilter,
      resetFilters: handleResetFilters,
    }),
    [search, debouncedSearch, customFilters, handleSetCustomFilter, handleResetFilters],
  );

  const sortingResult = useMemo(
    () => ({
      field: sorting.field,
      order: sorting.order,
      setSort: handleSetSort,
    }),
    [sorting.field, sorting.order, handleSetSort],
  );

  const selectionResult = useMemo(
    () => ({
      selectedKeys,
      setSelectedKeys,
      clearSelection: handleClearSelection,
    }),
    [selectedKeys, handleClearSelection],
  );

  return {
    pagination: paginationResult,
    filters: filtersResult,
    sorting: sortingResult,
    selection: selectionResult,
    resetPagination: handleResetPagination,
  };
}
