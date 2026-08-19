/**
 * Web Notifications & Push Manager for AngryUI.
 * Provides system-level lock screen and desktop notifications
 * when background tasks complete or unapproved tool permissions are requested.
 */
class NotificationManager {
  private enabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('agy_notifications_enabled');
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch {}
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem('agy_notifications_enabled', String(val));
    } catch {}
  }

  /**
   * Send a system notification with title, options, and click-to-focus
   */
  public sendNotification(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isEnabled() || !this.isSupported() || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notif = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/favicon.ico',
        ...options
      });

      notif.onclick = () => {
        try {
          window.focus();
          notif.close();
        } catch {}
      };

      return notif;
    } catch (e) {
      console.warn('Failed to send notification:', e);
      return null;
    }
  }

  /**
   * Notify user when a long task has completed in background
   */
  public notifyTaskComplete(summary?: string): void {
    if (typeof document !== 'undefined' && !document.hidden) {
      // User is actively looking at the tab, no need to spam system notifications
      return;
    }
    this.sendNotification('AngryUI — Task Completed', {
      body: summary || 'The agent has finished the requested task.',
      tag: 'agy-task-complete'
    });
  }

  /**
   * Notify user when an unapproved command or tool permission is requested
   */
  public notifyPermissionRequired(cmdOrTool?: string): void {
    if (typeof document !== 'undefined' && !document.hidden) {
      return;
    }
    this.sendNotification('AngryUI — Action Authorization Required', {
      body: cmdOrTool ? `Permission required: $ ${cmdOrTool}` : 'The agent requires your permission to proceed.',
      tag: 'agy-permission-required',
      requireInteraction: true
    });
  }
}

export const notificationManager = new NotificationManager();
