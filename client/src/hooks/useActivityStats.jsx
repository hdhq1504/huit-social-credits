import { useMemo } from 'react';

/**
 * useActivityStats - Calculate activity statistics from registrations
 * @param {Array} registrations - Array of user registrations
 * @returns {Object} Stats object with totalPoints, totalActivities, completed, absent
 */
export default function useActivityStats(registrations) {
  return useMemo(() => {
    const registered = registrations.filter(
      (item) =>
        item.status === 'DANG_KY' && !['check_in', 'check_out', 'attendance_open'].includes(item.activity?.state),
    );

    const attended = registrations.filter((item) => item.status === 'DA_THAM_GIA');
    const canceled = registrations.filter((item) => item.status === 'DA_HUY');
    const absent = registrations.filter((item) => item.status === 'VANG_MAT');
    const totalPoints = attended.reduce((sum, item) => sum + (item.activity?.points ?? 0), 0);

    return {
      totalPoints,
      totalActivities: registrations.length,
      completed: attended.length,
      registered,
      attended,
      canceled,
      absent,
    };
  }, [registrations]);
}
