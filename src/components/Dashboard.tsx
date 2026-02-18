import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWorkflowRuns, type WorkflowRun } from '../lib/github';
import WorkflowCard from './WorkflowCard';

interface DashboardProps {
  monitoredRepos: string[];
  onOpenRepoManager: () => void;
}

const REFRESH_OPTIONS = [15, 30, 60, 120] as const; // seconds (idle interval)
const ACTIVE_POLL_INTERVAL = 10; // seconds — fast poll when runs are in progress
const REFRESH_KEY = 'gha_monitor_refresh';

function getSavedInterval(): number {
  const saved = localStorage.getItem(REFRESH_KEY);
  const parsed = saved ? Number(saved) : 60;
  return REFRESH_OPTIONS.includes(parsed as typeof REFRESH_OPTIONS[number]) ? parsed : 60;
}

const ACTIVE_STATUSES = new Set(['in_progress', 'queued', 'waiting', 'pending', 'requested']);

type StatusCategory = 'running' | 'waiting' | 'success' | 'failure';

const CATEGORY_META: Record<StatusCategory, { label: string; dot: string; textColor: string; order: number }> = {
  running:  { label: 'Running',  dot: 'bg-yellow-400 animate-pulse', textColor: 'text-yellow-400', order: 0 },
  waiting:  { label: 'Waiting',  dot: 'bg-blue-400 animate-pulse',   textColor: 'text-blue-400',   order: 1 },
  success:  { label: 'Success',  dot: 'bg-green-400',                textColor: 'text-green-400',   order: 2 },
  failure:  { label: 'Failure',  dot: 'bg-red-400',                  textColor: 'text-red-400',     order: 3 },
};

function categorizeRun(run: WorkflowRun): StatusCategory {
  const s = run.status;
  const c = run.conclusion;

  if (s === 'in_progress') return 'running';
  if (s === 'queued' || s === 'waiting' || s === 'pending' || s === 'requested') return 'waiting';
  if (s === 'completed' && (c === 'failure' || c === 'timed_out' || c === 'action_required')) return 'failure';
  return 'success'; // success, cancelled, skipped, neutral, etc.
}

export default function Dashboard({ monitoredRepos, onOpenRepoManager }: DashboardProps) {
  const { token } = useAuth();
  const [runs, setRuns] = useState<Map<string, WorkflowRun[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [newRunIds, setNewRunIds] = useState<Set<number>>(new Set());
  const [refreshCycle, setRefreshCycle] = useState(0);
  const [intervalSec, setIntervalSec] = useState(getSavedInterval);
  const [countdown, setCountdown] = useState(intervalSec);
  const knownRunIdsRef = useRef<Set<number>>(new Set());
  const isFirstFetchRef = useRef(true);

  // Detect whether any fetched runs are still active
  const hasActiveRuns = useMemo(() => {
    for (const repoRuns of runs.values()) {
      for (const run of repoRuns) {
        if (ACTIVE_STATUSES.has(run.status)) return true;
      }
    }
    return false;
  }, [runs]);

  // When runs are active, override to fast polling; otherwise use user's chosen interval
  const effectiveInterval = hasActiveRuns ? ACTIVE_POLL_INTERVAL : intervalSec;

  const fetchAll = useCallback(async () => {
    if (!token || monitoredRepos.length === 0) {
      setRuns(new Map());
      return;
    }

    setLoading(true);
    const results = new Map<string, WorkflowRun[]>();

    await Promise.allSettled(
      monitoredRepos.map(async (fullName) => {
        const [owner, repo] = fullName.split('/');
        try {
          const data = await getWorkflowRuns(token, owner, repo, 30);
          results.set(fullName, data.workflow_runs);
        } catch (err) {
          console.error(`Failed to fetch runs for ${fullName}:`, err);
          results.set(fullName, []);
        }
      })
    );

    // Detect new runs
    const allFetchedRuns = Array.from(results.values()).flat();
    const freshIds = new Set(allFetchedRuns.map((r) => r.id));

    if (!isFirstFetchRef.current) {
      const newIds = new Set<number>();
      for (const id of freshIds) {
        if (!knownRunIdsRef.current.has(id)) {
          newIds.add(id);
        }
      }
      if (newIds.size > 0) {
        setNewRunIds((prev) => new Set([...prev, ...newIds]));
        setTimeout(() => {
          setNewRunIds((prev) => {
            const next = new Set(prev);
            for (const id of newIds) next.delete(id);
            return next;
          });
        }, 15_000);
      }
    } else {
      isFirstFetchRef.current = false;
    }

    knownRunIdsRef.current = freshIds;
    setRuns(results);
    setLastRefresh(new Date());
    setRefreshCycle((c) => c + 1);
    setLoading(false);
  }, [token, monitoredRepos]);

  // Initial fetch and adaptive auto-refresh
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, effectiveInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchAll, effectiveInterval]);

  // Countdown timer — resets whenever effectiveInterval changes
  useEffect(() => {
    setCountdown(effectiveInterval);
  }, [effectiveInterval]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  function changeInterval(sec: number) {
    localStorage.setItem(REFRESH_KEY, String(sec));
    setIntervalSec(sec);
    setCountdown(sec);
  }

  const activeRunCount = useMemo(() => {
    let count = 0;
    for (const repoRuns of runs.values()) {
      for (const run of repoRuns) {
        if (ACTIVE_STATUSES.has(run.status)) count++;
      }
    }
    return count;
  }, [runs]);

  // Derive: latest run per (repo, workflow_name), grouped by repo, split by status
  const sections = useMemo(() => {
    // 1. For each repo, for each unique workflow name, keep only the latest run
    const latestRuns: WorkflowRun[] = [];

    for (const repoRuns of runs.values()) {
      const byWorkflow = new Map<string, WorkflowRun>();
      // runs are already sorted newest-first from the API
      for (const run of repoRuns) {
        const key = run.name; // workflow name
        if (!byWorkflow.has(key)) {
          byWorkflow.set(key, run);
        }
      }
      latestRuns.push(...byWorkflow.values());
    }

    // 2. Categorize each run
    const categorized = new Map<StatusCategory, Map<string, WorkflowRun[]>>();
    for (const cat of ['running', 'waiting', 'failure', 'success'] as StatusCategory[]) {
      categorized.set(cat, new Map());
    }

    for (const run of latestRuns) {
      const cat = categorizeRun(run);
      const repoMap = categorized.get(cat)!;
      const repoName = run.repository.full_name;
      if (!repoMap.has(repoName)) {
        repoMap.set(repoName, []);
      }
      repoMap.get(repoName)!.push(run);
    }

    // 3. Sort workflows within each repo by most recent first
    for (const repoMap of categorized.values()) {
      for (const [repo, wfRuns] of repoMap) {
        repoMap.set(repo, wfRuns.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ));
      }
    }

    return categorized;
  }, [runs]);

  const totalLatest = Array.from(sections.values()).reduce(
    (acc, repoMap) => acc + Array.from(repoMap.values()).reduce((a, r) => a + r.length, 0),
    0
  );

  if (monitoredRepos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0v3.375m0-3.375h3.375M6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No repositories monitored</h3>
        <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
          Add repositories to start monitoring their GitHub Actions workflow runs.
        </p>
        <button
          onClick={onOpenRepoManager}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Add Repositories
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-400">
          Monitoring <span className="text-white font-medium">{monitoredRepos.length}</span> repos
          {lastRefresh && (
            <> &middot; Updated {lastRefresh.toLocaleTimeString()}</>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Fast-refresh indicator */}
          {hasActiveRuns && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs font-medium text-yellow-400">
                Live {ACTIVE_POLL_INTERVAL}s
              </span>
              <span className="text-[10px] text-yellow-500/70">
                ({activeRunCount} active)
              </span>
            </div>
          )}
          {/* Idle refresh interval selector */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {REFRESH_OPTIONS.map((sec) => (
              <button
                key={sec}
                onClick={() => changeInterval(sec)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  intervalSec === sec
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500 tabular-nums w-16 text-right">
            {loading ? 'Refreshing' : `${countdown}s`}
          </span>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 hover:border-gray-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading overlay for initial load */}
      {loading && totalLatest === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Fetching workflow runs...</span>
          </div>
        </div>
      )}

      {/* Status Sections */}
      {(['running', 'waiting', 'success', 'failure'] as StatusCategory[]).map((cat) => {
        const repoMap = sections.get(cat)!;
        if (repoMap.size === 0) return null;

        const meta = CATEGORY_META[cat];
        const totalInSection = Array.from(repoMap.values()).reduce((a, r) => a + r.length, 0);

        return (
          <div key={cat} className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              <h2 className={`text-sm font-semibold ${meta.textColor}`}>
                {meta.label}
              </h2>
              <span className="text-xs text-gray-500">({totalInSection})</span>
            </div>

            {/* Repo groups within this status */}
            <div className="space-y-6">
              {Array.from(repoMap.entries())
                .sort(([, aRuns], [, bRuns]) => {
                  const aLatest = Math.max(...aRuns.map((r) => new Date(r.updated_at).getTime()));
                  const bLatest = Math.max(...bRuns.map((r) => new Date(r.updated_at).getTime()));
                  return bLatest - aLatest;
                })
                .map(([repoFullName, repoRuns]) => (
                  <div key={repoFullName}>
                    {/* Repo header */}
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-400">{repoFullName}</span>
                      <span className="text-[10px] text-gray-600">({repoRuns.length} workflow{repoRuns.length > 1 ? 's' : ''})</span>
                    </div>
                    {/* Workflow cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {repoRuns.map((run) => (
                        <WorkflowCard
                          key={`${run.repository.full_name}-${run.id}`}
                          run={run}
                          isNew={newRunIds.has(run.id)}
                          refreshCycle={refreshCycle}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {/* No runs state */}
      {!loading && totalLatest === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            No workflow runs found for the monitored repositories.
          </p>
        </div>
      )}
    </div>
  );
}
