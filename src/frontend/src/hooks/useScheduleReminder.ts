import { useEffect, useRef } from 'react';
import { scheduleService } from '../services/scheduleService';

const CHECK_INTERVAL_MS = 60_000;

function dispatchSpeech(text: string) {
  window.dispatchEvent(new CustomEvent('aivis:speech', { detail: { text } }));
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: `aivis-reminder-${title}`,
  });
}

export function useScheduleReminder() {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    async function check() {
      try {
        const upcoming = await scheduleService.getUpcomingReminders(10);
        for (const item of upcoming) {
          if (!notifiedRef.current.has(item.id)) {
            notifiedRef.current.add(item.id);
            const msg = `곧 시작: ${item.startTime} ${item.title}`;
            dispatchSpeech(msg);
            showBrowserNotification('AIVIS 일정 알림', msg);
          }
        }
      } catch {
        // network unavailable — silently skip
      }
    }

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
