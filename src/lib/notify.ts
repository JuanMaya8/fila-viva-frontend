/** Best-effort local notification + vibration; silently skipped if unsupported. */
export function notify(title: string, body: string): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration is optional.
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, { body, icon: '/icon.svg', tag: 'fila-viva' });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
    navigator.serviceWorker?.ready
      .then((registration) => registration.showNotification(title, { body, icon: '/icon.svg' }))
      .catch(() => undefined);
  }
}

export function canAskNotifications(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'default';
}
