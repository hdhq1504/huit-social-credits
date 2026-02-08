import { useEffect } from 'react';
import useAuthStore from '../stores/useAuthStore';

function AuthProvider() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}

export default AuthProvider;
