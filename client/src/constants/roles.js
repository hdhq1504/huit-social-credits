/**
 * User roles constants
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  COUNCIL: 'council',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Quản trị viên',
  [USER_ROLES.TEACHER]: 'Giảng viên',
  [USER_ROLES.STUDENT]: 'Sinh viên',
  [USER_ROLES.COUNCIL]: 'Hội đồng',
};

export const ROLE_COLORS = {
  [USER_ROLES.ADMIN]: 'red',
  [USER_ROLES.TEACHER]: 'blue',
  [USER_ROLES.STUDENT]: 'green',
  [USER_ROLES.COUNCIL]: 'purple',
};
