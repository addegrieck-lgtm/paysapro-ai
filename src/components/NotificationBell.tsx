import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, BellOff } from 'lucide-react';
import { useAppState } from '../lib/store';
import { computeNotifications, notificationCenter } from '../features/notifications/notifications';
import { markNotificationsRead } from '../features/activity';
import { Drawer } from './ui/Extras';
import { relativeTime } from '../utils/date';

export function useNotifications() {
  const { projects, quotes, clients, activity, settings } = useAppState();
  return useMemo(
    () => notificationCenter(activity, computeNotifications(projects, quotes, clients), settings.notificationPrefs),
    [projects, quotes, clients, activity, settings.notificationPrefs],
  );
}

/** Cloche + centre de notifications. */
export function NotificationBell({ className = '' }: { className?: string }) {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications (${unread} non lues)` : 'Notifications'}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink ${className}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.7rem] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <Drawer
        open={open}
        onClose={() => {
          setOpen(false);
          markNotificationsRead();
        }}
        title="Notifications"
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center text-muted">
            <BellOff className="mb-2 h-8 w-8" aria-hidden />
            Aucune notification pour l’instant. Vous serez prévenu ici quand un client consulte ou signe un devis.
          </div>
        ) : (
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  disabled={!n.projectId}
                  onClick={() => {
                    setOpen(false);
                    markNotificationsRead();
                    if (n.projectId) navigate(`/projects/${n.projectId}`);
                  }}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 disabled:cursor-default"
                >
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-line' : n.createdAt ? 'bg-danger' : 'bg-warning'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block ${n.read ? 'text-muted' : 'font-medium text-ink'}`}>{n.message}</span>
                    <span className="text-xs text-muted">{n.createdAt ? relativeTime(n.createdAt) : 'À suivre'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}
