import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRunJobs, rerunJob, type WorkflowJob, type WorkflowStep } from '../lib/github';

interface StepsListProps {
  owner: string;
  repo: string;
  runId: number;
  /** When this value changes, steps are re-fetched (used for live-updating active runs). */
  refreshCycle?: number;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '--';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.max(0, e - s);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function StepStatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return (
        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (conclusion === 'failure') {
      return (
        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    if (conclusion === 'skipped') {
      return (
        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      );
    }
    // cancelled or other
    return (
      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    );
  }

  if (status === 'in_progress') {
    return (
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // queued / pending
  return (
    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
      <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
    </div>
  );
}

function StepRow({ step }: { step: WorkflowStep }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-800/50 transition-colors">
      <StepStatusIcon status={step.status} conclusion={step.conclusion} />
      <span className="text-sm text-gray-300 flex-1 truncate" title={step.name}>{step.name}</span>
      <span className="text-xs text-gray-500 font-mono flex-shrink-0">
        {formatDuration(step.started_at, step.completed_at)}
      </span>
    </div>
  );
}

export default function StepsList({ owner, repo, runId, refreshCycle }: StepsListProps) {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunningJob, setRerunningJob] = useState<number | null>(null);
  const [rerunResult, setRerunResult] = useState<{ jobId: number; ok: boolean } | null>(null);

  async function handleRerunJob(jobId: number) {
    if (!token) return;
    setRerunningJob(jobId);
    setRerunResult(null);
    try {
      await rerunJob(token, owner, repo, jobId);
      setRerunResult({ jobId, ok: true });
      setTimeout(() => setRerunResult(null), 4000);
    } catch {
      setRerunResult({ jobId, ok: false });
      setTimeout(() => setRerunResult(null), 5000);
    } finally {
      setRerunningJob(null);
    }
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    if (jobs.length === 0) setLoading(true);
    setError(null);

    getRunJobs(token, owner, repo, runId)
      .then((data) => {
        if (!cancelled) setJobs(data.jobs);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token, owner, repo, runId, refreshCycle]);

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="py-4 px-2 text-sm text-red-400">Failed to load steps: {error}</div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="py-4 px-2 text-sm text-gray-500">No jobs found for this run.</div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id}>
          {/* Job header */}
          <div className="flex items-center gap-2 px-2 py-1">
            <StepStatusIcon status={job.status} conclusion={job.conclusion} />
            <span className="text-sm font-medium text-gray-200" title={job.name}>{job.name}</span>
            <span className="text-xs text-gray-500 font-mono ml-auto">
              {formatDuration(job.started_at, job.completed_at)}
            </span>
            {job.status === 'completed' && (
              <button
                onClick={() => handleRerunJob(job.id)}
                disabled={rerunningJob !== null}
                className="p-1 hover:bg-gray-700 rounded transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
                title={`Re-run ${job.name}`}
              >
                {rerunningJob === job.id ? (
                  <div className="w-3.5 h-3.5 border-[1.5px] border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : rerunResult?.jobId === job.id ? (
                  rerunResult.ok ? (
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {/* Steps */}
          <div className="ml-4 border-l border-gray-800 pl-2">
            {job.steps.map((step) => (
              <StepRow key={step.number} step={step} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
