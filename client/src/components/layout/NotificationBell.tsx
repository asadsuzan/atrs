import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Activity, ShieldAlert, Key, UserCheck, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: string, message: string) => {
    switch (type) {
      case 'user-activity':
        return <Activity className="w-4 h-4 text-sky-500" />;
      case 'access-change':
        if (message.toLowerCase().includes('suspend')) {
          return <ShieldAlert className="w-4 h-4 text-destructive" />;
        }
        if (message.toLowerCase().includes('role')) {
          return <Key className="w-4 h-4 text-amber-500" />;
        }
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      default:
        return <Inbox className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className="relative flex items-center justify-center w-9 h-9 rounded-full border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground font-semibold">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0 border shadow-2xl mr-4" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1 font-medium cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
              <span className="text-xs font-medium">No notifications yet</span>
              <span className="text-[10px] opacity-75 mt-0.5">Real-time alerts will appear here</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id || notif.id}
                onClick={() => !notif.read && markAsRead(notif._id || notif.id!)}
                className={`flex gap-3 p-4 text-left transition-colors cursor-pointer ${
                  notif.read ? 'hover:bg-muted/40 bg-card' : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                {/* Icon Badge */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {getIcon(notif.type, notif.message)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold truncate ${notif.read ? 'text-foreground/80' : 'text-foreground'}`}>
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-relaxed break-words">
                    {notif.message}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/40 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearNotifications()}
              className="text-xs h-7 px-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive gap-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
