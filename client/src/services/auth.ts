import { api } from './api';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
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
  return data as { success: boolean };
};
