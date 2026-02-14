import { useState } from 'react';
import type { WorkflowRun } from '../lib/github';
import StepsList from './StepsList';

interface WorkflowCardProps {
  run: WorkflowRun;
  isNew?: boolean;
  refreshCycle?: number;
}

function statusColor(status: string, conclusion: string | null) {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return { bg: 'bg-green-900/30', border: 'border-green-700/40', text: 'text-green-400', dot: 'bg-green-400' };
      case 'failure':
        return { bg: 'bg-red-900/30', border: 'border-red-700/40', text: 'text-red-400', dot: 'bg-red-400' };
      case 'cancelled':
        return { bg: 'bg-gray-800/50', border: 'border-gray-700/40', text: 'text-gray-400', dot: 'bg-gray-400' };
      case 'skipped':
        return { bg: 'bg-gray-800/50', border: 'border-gray-700/40', text: 'text-gray-500', dot: 'bg-gray-500' };
      default:
        return { bg: 'bg-gray-800/50', border: 'border-gray-700/40', text: 'text-gray-400', dot: 'bg-gray-400' };
    }
  }
  if (status === 'in_progress') {
    return { bg: 'bg-yellow-900/20', border: 'border-yellow-700/30', text: 'text-yellow-400', dot: 'bg-yellow-400' };
  }
  // queued, waiting, pending
  return { bg: 'bg-gray-800/50', border: 'border-gray-700/40', text: 'text-gray-400', dot: 'bg-gray-500' };
}

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  const colors = statusColor(status, conclusion);
  const label = status === 'completed' ? (conclusion || status) : status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {status === 'in_progress' ? (
        <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
      ) : (
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
      )}
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WorkflowCard({ run, isNew, refreshCycle = 0 }: WorkflowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = statusColor(run.status, run.conclusion);
  const [owner, repo] = run.repository.full_name.split('/');

  const isActive = run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting' || run.status === 'pending' || run.status === 'requested';

  return (
    <div
      className={`rounded-xl border transition-all duration-500 overflow-hidden ${colors.border} ${colors.bg} ${
        isNew ? 'ring-2 ring-blue-400/60 shadow-lg shadow-blue-500/10' : ''
      }`}
    >
      {/* New badge */}
      {isNew && (
        <div className="px-4 pt-2 pb-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 uppercase tracking-wider animate-pulse">
            new
          </span>
        </div>
      )}

      {/* Card Header - clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <a
                href={run.repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate"
              >
                {run.repository.full_name}
              </a>
            </div>
            <h3 className="text-sm font-semibold text-white truncate">
              {run.name}
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {run.display_title}
            </p>
          </div>
          <StatusBadge status={run.status} conclusion={run.conclusion} />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {run.head_branch}
            </span>
            <span>#{run.run_number}</span>
            <span>{timeAgo(run.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src={run.actor.avatar_url}
              alt={run.actor.login}
              className="w-4 h-4 rounded-full"
            />
            <a
              href={run.html_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Steps */}
      {expanded && (
        <div className="border-t border-gray-800/50 bg-gray-950/30">
          <div className="max-h-72 overflow-y-auto p-4">
            <StepsList
              owner={owner}
              repo={repo}
              runId={run.id}
              refreshCycle={isActive ? refreshCycle : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
