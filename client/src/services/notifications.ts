import { api } from './api';

export const getMyNotifications = async () => {
  const { data } = await api.get('/notifications');
  return data;
};

export const markAsRead = async (id: string) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};

export const deleteNotification = async (id: string) => {
  const { data } = await api.delete(`/notifications/${id}`);
  return data;
};
