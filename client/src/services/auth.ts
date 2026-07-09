import { api, setToken } from './api';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  jobTitle?: string;
  role: UserRole;
  status: UserStatus;
  isRoot: boolean;
  mustChangePassword?: boolean;
  passwordResetRequested?: boolean;
  createdAt?: string;
}

export const login = async (payload: { email: string; password: string }) => {
  const { data } = await api.post('/auth/login', payload);
  return data as { token: string; user: AuthUser };
};

export const register = async (payload: { name: string; email: string; password: string }) => {
  const { data } = await api.post('/auth/register', payload);
  return data as { message: string; user: AuthUser };
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data as AuthUser;
};

/** Self-service profile update (display name + presenter job title). */
export const updateMe = async (payload: { name?: string; jobTitle?: string }) => {
  const { data } = await api.patch('/auth/me', payload);
  return data as AuthUser;
};

export const checkEmail = async (email: string) => {
  const { data } = await api.post('/auth/check-email', { email });
  return data as { exists: boolean; name?: string };
};

export const requestPasswordReset = async (email: string) => {
  const { data } = await api.post('/auth/password-reset-request', { email });
  return data as { requested: boolean };
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
  // The server rotates the token on a password change (old tokens are now
  // rejected); adopt the new one so the current session stays valid.
  if (data?.token) setToken(data.token);
  return data as { success: boolean; token?: string };
};
