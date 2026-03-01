import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth.api';

const normalizeUser = (user) => {
  if (!user) return null;
  const role = (user.role || user.vaiTro || 'SINHVIEN').toUpperCase();
  const fullName = user.fullName || user.hoTen || user.TenNguoiDung || user.name || user.email || '';
  return {
    ...user,
    role,
    fullName,
    TenNguoiDung: user.TenNguoiDung || fullName,
    hoTen: user.hoTen || fullName,
  };
};

const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      isLoggedIn: false,
      user: null,

      login: ({ accessToken, user }) => {
        set({
          accessToken,
          isLoggedIn: true,
          user: normalizeUser(user),
        });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      updateUser: (user) =>
        set((state) => ({
          user: normalizeUser({ ...(state.user || {}), ...user }),
        })),

      logout: () => {
        set({ accessToken: null, isLoggedIn: false, user: null });
      },

      initialize: async () => {
        const state = useAuthStore.getState();

        if (state.accessToken) {
          try {
            const user = await authApi.me();
            set({
              isLoggedIn: true,
              user: normalizeUser(user),
            });
            return;
          } catch {
            // Access token invalid or expired, continue to refresh
          }
        }

        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (response.ok) {
            const data = await response.json();
            if (data?.accessToken) {
              set({ accessToken: data.accessToken });

              const user = await authApi.me();
              set({
                isLoggedIn: true,
                user: normalizeUser(user),
              });
              return;
            }
          }
        } catch {
          console.debug('No valid refresh token available');
        }
        set({ accessToken: null, isLoggedIn: false, user: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
    },
  ),
);

export default useAuthStore;
