import { useEffect, useRef, useState } from 'react';

const audioCtxRef: { current: AudioContext | null } = { current: null };

function playChime(success: boolean) {
  try {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const notes = success ? [523.25, 659.25, 783.99] : [440, 349.23];
    const duration = 0.15;
    const gap = 0.12;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * gap);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * gap + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * gap);
      osc.stop(now + i * gap + duration);
    });
  } catch {
    // Audio not available — silent fallback
  }
}

export interface Notification {
  id: string;
  conclusion: string;
  repoName: string;
  workflowName: string;
  runNumber: number;
  branch: string;
  htmlUrl: string;
  timestamp: number;
}

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const TOAST_DURATION = 30_000;

function isFailure(conclusion: string): boolean {
  return conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'action_required';
}

function ToastItem({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const failed = isFailure(notification.conclusion);
  const chimePlayed = useRef(false);

  useEffect(() => {
    if (!chimePlayed.current) {
      chimePlayed.current = true;
      playChime(!failed);
    }
  }, [failed]);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed((e) => {
        const next = e + 100;
        if (next >= TOAST_DURATION) {
          clearInterval(tick);
          onDismiss();
        }
        return next;
      });
    }, 100);
    return () => clearInterval(tick);
  }, [onDismiss]);

  const progress = Math.max(0, 1 - elapsed / TOAST_DURATION);

  return (
    <div
      className={`relative w-80 bg-gray-900 border rounded-xl shadow-2xl overflow-hidden animate-[slideIn_0.3s_ease-out] ${
        failed ? 'border-red-700/50' : 'border-green-700/50'
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${failed ? 'bg-red-500' : 'bg-green-500'}`} />

      <div className="pl-4 pr-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {failed ? (
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className={`text-xs font-semibold ${failed ? 'text-red-400' : 'text-green-400'}`}>
              Workflow {notification.conclusion.replace(/_/g, ' ')}
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-0.5 hover:bg-gray-800 rounded transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-1.5 ml-6">
          <div className="text-sm text-white font-medium truncate">{notification.workflowName}</div>
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {notification.repoName} <span className="text-gray-600">#{notification.runNumber}</span><br/>
            <span className="text-gray-600 mx-1">&middot;</span>
            <span className="text-gray-500">{notification.branch}</span>
          </div>
          <a
            href={notification.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline mt-1.5"
          >
            View on GitHub
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      <div className="h-0.5 bg-gray-800">
        <div
          className={`h-full transition-all duration-100 ease-linear ${failed ? 'bg-red-500/50' : 'bg-green-500/50'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-3">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
      ))}
    </div>
  );
}
