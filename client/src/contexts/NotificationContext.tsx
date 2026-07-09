import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { getToken, api } from '@/services/api';
import { playSound, setCachedSoundConfig } from '@/lib/sound';
import { getMyNotifications, markAsRead as markAsReadApi, markAllAsRead as markAllAsReadApi } from '@/services/notifications';

export interface Notification {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type: string;
  createdAt: Date;
  read: boolean;
  link?: string;
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

  const { data: dbNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getMyNotifications,
    enabled: !!user,
    // Poll as a fallback so notifications still arrive if a realtime SSE event
    // is missed (e.g. on serverless, where the stream may reconnect to a
    // different instance). Also drives the axios 401 → logout path on expiry.
    refetchInterval: user ? 60_000 : false,
  });

  const [realtimeNotifications, setRealtimeNotifications] = useState<Notification[]>([]);

  // Combine DB notifications with unread realtime ones. Memoized so a new array
  // isn't produced (and consumers re-rendered) on every render.
  const notifications = useMemo(
    () =>
      [
        ...realtimeNotifications,
        ...dbNotifications.filter((dbN: any) => !realtimeNotifications.find((rN) => rN._id === dbN._id)),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [realtimeNotifications, dbNotifications],
  );

  // Keep the latest refreshMe without putting the (possibly unstable) function
  // in the effect deps — otherwise the SSE stream would tear down/reconnect on
  // every auth refresh.
  const refreshMeRef = useRef(refreshMe);
  refreshMeRef.current = refreshMe;
  const userId = user?._id ?? null;

  useEffect(() => {
    if (!userId) {
      setRealtimeNotifications([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    // Track a burst of connection errors so a dead/expired stream doesn't
    // reconnect forever; the polling query above is the fallback.
    let errorBurst = 0;
    let lastErrorAt = 0;

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
      errorBurst = 0;
    });

    // Handle user activity notifications (Root Admin only)
    eventSource.addEventListener('user-activity', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: Notification = {
          id: data.id || crypto.randomUUID(),
          title: `User Activity: ${data.action} ${data.entityType}`,
          message: `${data.userName} performed ${data.action} on ${data.entityName}`,
          type: 'user-activity',
          createdAt: new Date(data.createdAt || Date.now()),
          read: false
        };

        setRealtimeNotifications((prev) => [newNotif, ...prev]);

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
          id: crypto.randomUUID(),
          title: data.role ? 'Role Access Updated' : 'Account Status Updated',
          message: data.message,
          type: 'access-change',
          createdAt: new Date(),
          read: false
        };

        setRealtimeNotifications((prev) => [newNotif, ...prev]);

        // Play real-time notification alert sound
        playSound('notification');

        // Show toast alert
        toast.success(newNotif.title, {
          description: newNotif.message,
          duration: 6000,
        });

        // Trigger context refresh to update permissions / roles instantly
        refreshMeRef.current();
      } catch (err) {
        console.error('[SSE] Failed to parse access-change payload:', err);
      }
    });

    // Password reset requests (admins only).
    eventSource.addEventListener('password-reset-request', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: Notification = {
          id: crypto.randomUUID(),
          title: 'Password reset requested',
          message: `${data.name} (${data.email}) requested a password reset.`,
          type: 'password-reset-request',
          createdAt: new Date(data.requestedAt || Date.now()),
          read: false,
        };
        setRealtimeNotifications((prev) => [newNotif, ...prev]);
        playSound('notification');
        toast.warning(newNotif.title, {
          description: `${newNotif.message} Reset it from the Users page.`,
          duration: 8000,
        });
      } catch (err) {
        console.error('[SSE] Failed to parse password-reset-request payload:', err);
      }
    });

    // General app notifications (mentions, system, etc)
    eventSource.addEventListener('notification', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: Notification = {
          ...data,
          createdAt: new Date(data.createdAt || Date.now())
        };
        setRealtimeNotifications((prev) => [newNotif, ...prev]);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        playSound('notification');
        toast(newNotif.title, {
          description: newNotif.message,
          duration: 5000,
        });
      } catch (err) {
        console.error('[SSE] Failed to parse notification payload:', err);
      }
    });

    eventSource.onerror = () => {
      const now = Date.now();
      errorBurst = now - lastErrorAt < 5000 ? errorBurst + 1 : 1;
      lastErrorAt = now;

      // If the token is gone (logged out), stop for good — the axios layer
      // handles the redirect.
      if (!getToken()) {
        eventSource.close();
        return;
      }
      // A sustained error burst usually means an expired/rejected token or a
      // persistently unreachable server. Stop reconnecting so we don't hammer
      // the endpoint; the 60s polling query keeps notifications flowing and
      // will surface a 401 through the axios interceptor.
      if (errorBurst >= 6) {
        console.warn('[SSE] Too many reconnect attempts; falling back to polling.');
        eventSource.close();
      }
      // Otherwise let EventSource auto-reconnect.
    };

    return () => {
      eventSource.close();
    };
  }, [userId, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: markAsReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAsRead = (id: string) => {
    setRealtimeNotifications((prev) =>
      prev.map((n) => ((n._id === id || n.id === id) ? { ...n, read: true } : n))
    );
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    setRealtimeNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllAsReadMutation.mutate();
  };

  const clearNotifications = () => {
    setRealtimeNotifications([]);
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
