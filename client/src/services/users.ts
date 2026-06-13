import { api } from './api';
import type { AuthUser, UserRole } from './auth';

export const getUsers = async (params?: { status?: string; role?: string }) => {
  const { data } = await api.get('/users', { params });
  return data as AuthUser[];
};

export const approveUser = async (id: string) => {
  const { data } = await api.patch(`/users/${id}/approve`);
  return data as AuthUser;
};

export const suspendUser = async (id: string) => {
  const { data } = await api.patch(`/users/${id}/suspend`);
  return data as AuthUser;
};

export const reactivateUser = async (id: string) => {
  const { data } = await api.patch(`/users/${id}/reactivate`);
  return data as AuthUser;
};

export const setUserRole = async (id: string, role: UserRole) => {
  const { data } = await api.patch(`/users/${id}/role`, { role });
  return data as AuthUser;
};

export const deleteUser = async (id: string, reassignTo?: string) => {
  const { data } = await api.delete(`/users/${id}`, { params: reassignTo ? { reassignTo } : undefined });
  return data;
};
