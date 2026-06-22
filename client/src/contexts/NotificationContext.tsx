import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { getToken, api } from '@/services/api';
import { playSound, setCachedSoundConfig } from '@/lib/sound';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'user-activity' | 'access-change' | 'password-reset-request' | 'system';
  createdAt: Date;
  read: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshMe } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    // Fetch system-wide sound configuration to cache it locally
    api.get('/notifications/sounds')
      .then(({ data }) => {
        setCachedSoundConfig(data);
      })
      .catch((err) => {
        console.warn('[Sound] Failed to load sound configurations from server:', err);
      });

    // Establish Server-Sent Events subscription connection
    const eventSource = new EventSource(`/api/notifications/subscribe?token=${encodeURIComponent(token)}`);

    // Handle handshake confirmation
    eventSource.addEventListener('handshake', () => {
      console.log('[SSE] Connection established successfully.');
    });

    // Handle user activity notifications (Root Admin only)
    eventSource.addEventListener('user-activity', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: Notification = {
          id: data.id || Math.random().toString(),
          title: `User Activity: ${data.action} ${data.entityType}`,
          message: `${data.userName} performed ${data.action} on ${data.entityName}`,
          type: 'user-activity',
          createdAt: new Date(data.createdAt || Date.now()),
          read: false
        };

        setNotifications((prev) => [newNotif, ...prev]);

        // Play real-time notification alert sound
        playSound('notification');

        // Pop up sonner toast with beautiful formatting
        toast.info(newNotif.title, {
          description: newNotif.message,
          duration: 5000,
        });
      } catch (err) {
        console.error('[SSE] Failed to parse user-activity payload:', err);
      }
    });

    // Handle role/access changes (User notifications)
    eventSource.addEventListener('access-change', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: Notification = {
          id: Math.random().toString(),
          title: data.role ? 'Role Access Updated' : 'Account Status Updated',
          message: data.message,
          type: 'access-change',
          createdAt: new Date(),
          read: false
        };

        setNotifications((prev) => [newNotif, ...prev]);

        // Play real-time notification alert sound
        playSound('notification');

        // Show toast alert
        toast.success(newNotif.title, {
          description: newNotif.message,
          duration: 6000,
        });

        // Trigger context refresh to update permissions / roles instantly
        refreshMe();
      } catch (err) {
        console.error('[SSE] Failed to parse access-change payload:', err);
      }
    });

    // Password reset requests (admins only).
    eventSource.addEventListener('password-reset-request', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: Notification = {
          id: Math.random().toString(),
          title: 'Password reset requested',
          message: `${data.name} (${data.email}) requested a password reset.`,
          type: 'password-reset-request',
          createdAt: new Date(data.requestedAt || Date.now()),
          read: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        playSound('notification');
        toast.warning(newNotif.title, {
          description: `${newNotif.message} Reset it from the Users page.`,
          duration: 8000,
        });
      } catch (err) {
        console.error('[SSE] Failed to parse password-reset-request payload:', err);
      }
    });

    // Live code-activity tracker updates → refresh the feed + lightweight toast.
    eventSource.addEventListener('code-activity', (event) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({ queryKey: ['code-tracker'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
        playSound('notification');
        toast.info('Code activity tracked', {
          description: `${data.title}${data.productName ? ` — ${data.productName}` : ''}`,
          duration: 5000,
        });
      } catch (err) {
        console.error('[SSE] Failed to parse code-activity payload:', err);
      }
    });

    // Code-activity tracker error (e.g. Ollama unreachable / model not pulled).
    eventSource.addEventListener('code-activity-error', (event) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({ queryKey: ['code-tracker'] });
        toast.error('Code tracker', { description: data.error || 'AI generation failed', duration: 7000 });
      } catch (err) {
        console.error('[SSE] Failed to parse code-activity-error payload:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('[SSE] EventSource encountered connection error. Reconnecting...', err);
    };

    return () => {
      eventSource.close();
    };
  }, [user, refreshMe, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
