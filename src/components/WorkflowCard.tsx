import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRunJobs, type WorkflowRun, type WorkflowJob } from '../lib/github';
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

function getEnvironment(inputs: Record<string, string> | null | undefined): string | null {
  if (!inputs) return null;
  for (const [key, value] of Object.entries(inputs)) {
    if (key.toLowerCase() === 'environment' && value) return value;
  }
  return null;
}

export default function WorkflowCard({ run, isNew, refreshCycle = 0 }: WorkflowCardProps) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const colors = statusColor(run.status, run.conclusion);
  const [owner, repo] = run.repository.full_name.split('/');

  const isActive = run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting' || run.status === 'pending' || run.status === 'requested';

  // Auto-fetch jobs for active runs to surface environment and current job
  useEffect(() => {
    if (!token || !isActive) return;
    let cancelled = false;

    getRunJobs(token, owner, repo, run.id)
      .then((data) => { if (!cancelled) setJobs(data.jobs); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [token, owner, repo, run.id, isActive, refreshCycle]);

  // Derive environment: prefer job.environment, fall back to run.inputs
  const environment = useMemo(() => {
    for (const job of jobs) {
      if (job.environment) return job.environment;
    }
    return getEnvironment(run.inputs);
  }, [jobs, run.inputs]);

  // Derive current running job with step progress
  const currentJob = useMemo(() => {
    if (!isActive || jobs.length === 0) return null;
    const active = jobs.find((j) => j.status === 'in_progress');
    if (!active) {
      const queued = jobs.find((j) => j.status === 'queued' || j.status === 'waiting');
      if (queued) return { name: queued.name, completedSteps: 0, totalSteps: queued.steps.length };
      return null;
    }
    const completedSteps = active.steps.filter((s) => s.status === 'completed').length;
    return { name: active.name, completedSteps, totalSteps: active.steps.length };
  }, [isActive, jobs]);

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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white truncate">
                {run.name}
              </h3>
              {environment && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20 flex-shrink-0">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                  </svg>
                  {environment}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {run.display_title}
            </p>
            {currentJob && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 border-[1.5px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-[11px] text-yellow-300 truncate">{currentJob.name}</span>
                {currentJob.totalSteps > 0 && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    step {currentJob.completedSteps}/{currentJob.totalSteps}
                  </span>
                )}
              </div>
            )}
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
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                run.run_attempt > 1
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'bg-gray-700/50 text-gray-400'
              }`}
              title={`Attempt ${run.run_attempt}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {run.run_attempt}
            </span>
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
