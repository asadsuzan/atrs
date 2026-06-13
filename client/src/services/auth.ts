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
