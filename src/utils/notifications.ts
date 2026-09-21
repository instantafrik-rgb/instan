/**
 * Système de notifications locales Android & Web pour Nantor Sourcing App V3
 * Gère le retour sonore via Web Audio API (100% offline, autonome),
 * la vibration haptique Android et les notifications système.
 */

// Son doux deux tons pour notification professionnelle
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Ton 1 (587.33 Hz - D5) puis Ton 2 (880 Hz - A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (err) {
    // Audio non supporté ou bloqué par le navigateur sans interaction préalable
    console.debug('Notification audio skipped:', err);
  }
}

// Vibration haptique Android
export function triggerDeviceVibration(pattern: number | number[] = [120, 60, 120]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.debug('Vibration skipped:', err);
  }
}

// Demande d'autorisation pour notifications locales Android
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (err) {
    console.debug('Notification permission request error:', err);
    return false;
  }
}

// Déclenchement de la notification locale
export function triggerNativeNotification(title: string, body: string, icon = '/icon.svg'): void {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon,
        badge: '/icon.svg',
        tag: 'nantor-notification',
      });
    }
  } catch (err) {
    console.debug('Native notification display error:', err);
  }
}
