import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrgRepos, getRepoWorkflows, type GitHubRepo, type GitHubWorkflow } from '../lib/github';

const REPOS_KEY = 'gha_monitor_repos';
const WORKFLOWS_KEY = 'gha_monitor_workflows';

interface RepoManagerProps {
  org: string;
  monitoredRepos: string[];
  monitoredWorkflows: Record<string, string[]>;
  onReposChange: (repos: string[]) => void;
  onWorkflowsChange: (workflows: Record<string, string[]>) => void;
  onClose: () => void;
}

function WorkflowSelector({
  repoFullName,
  selectedWorkflows,
  onWorkflowsChange,
}: {
  repoFullName: string;
  selectedWorkflows: string[];
  onWorkflowsChange: (repoFullName: string, workflows: string[]) => void;
}) {
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (!token || fetched.current) return;
    fetched.current = true;
    const [owner, repo] = repoFullName.split('/');
    getRepoWorkflows(token, owner, repo)
      .then((data) => setWorkflows(data.workflows.filter((w) => w.state === 'active')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, repoFullName]);

  const allSelected = selectedWorkflows.length === 0;

  function toggleWorkflow(name: string) {
    if (allSelected) {
      // Switching from "all" to specific: select all except the toggled one
      const all = workflows.map((w) => w.name).filter((n) => n !== name);
      onWorkflowsChange(repoFullName, all);
    } else if (selectedWorkflows.includes(name)) {
      const updated = selectedWorkflows.filter((n) => n !== name);
      // If nothing left or everything selected, reset to "all"
      if (updated.length === 0 || updated.length === workflows.length) {
        onWorkflowsChange(repoFullName, []);
      } else {
        onWorkflowsChange(repoFullName, updated);
      }
    } else {
      const updated = [...selectedWorkflows, name];
      if (updated.length === workflows.length) {
        onWorkflowsChange(repoFullName, []);
      } else {
        onWorkflowsChange(repoFullName, updated);
      }
    }
  }

  function selectAllWorkflows() {
    onWorkflowsChange(repoFullName, []);
  }

  function clearAllWorkflows() {
    onWorkflowsChange(repoFullName, ['__none__']);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 pl-10">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Loading workflows...</span>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="py-2 pl-10 text-xs text-gray-500">No active workflows found</div>
    );
  }

  const isChecked = (name: string) => allSelected || selectedWorkflows.includes(name);

  return (
    <div className="pl-8 pr-3 pb-2 space-y-0.5">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={selectAllWorkflows}
          className="px-2 py-0.5 text-[10px] bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors cursor-pointer"
        >
          All
        </button>
        <button
          onClick={clearAllWorkflows}
          className="px-2 py-0.5 text-[10px] bg-gray-700/50 text-gray-400 rounded hover:bg-gray-700 transition-colors cursor-pointer"
        >
          None
        </button>
        {!allSelected && (
          <span className="text-[10px] text-gray-500">
            {selectedWorkflows.filter((n) => n !== '__none__').length} of {workflows.length}
          </span>
        )}
      </div>
      {workflows.map((wf) => (
        <button
          key={wf.id}
          onClick={() => toggleWorkflow(wf.name)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-gray-800/50 transition-colors cursor-pointer"
        >
          <div
            className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
              isChecked(wf.name)
                ? 'bg-purple-500 border-purple-500'
                : 'border-gray-600 bg-gray-800'
            }`}
          >
            {isChecked(wf.name) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-xs text-gray-300 truncate" title={wf.name}>{wf.name}</span>
          <span className="text-[10px] text-gray-600 truncate ml-auto flex-shrink-0" title={wf.path}>
            {wf.path.replace('.github/workflows/', '')}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function RepoManager({
  org,
  monitoredRepos,
  monitoredWorkflows,
  onReposChange,
  onWorkflowsChange,
  onClose,
}: RepoManagerProps) {
  const { token } = useAuth();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !org) return;
    setLoading(true);
    getOrgRepos(token, org)
      .then(setRepos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, org]);

  function toggleRepo(fullName: string) {
    let updated: string[];
    if (monitoredRepos.includes(fullName)) {
      updated = monitoredRepos.filter((r) => r !== fullName);
      if (expandedRepo === fullName) setExpandedRepo(null);
    } else {
      updated = [...monitoredRepos, fullName];
    }
    localStorage.setItem(REPOS_KEY, JSON.stringify(updated));
    onReposChange(updated);
  }

  function selectAll() {
    const all = filteredRepos.map((r) => r.full_name);
    const merged = [...new Set([...monitoredRepos, ...all])];
    localStorage.setItem(REPOS_KEY, JSON.stringify(merged));
    onReposChange(merged);
  }

  function clearAll() {
    const filtered = filteredRepos.map((r) => r.full_name);
    const updated = monitoredRepos.filter((r) => !filtered.includes(r));
    localStorage.setItem(REPOS_KEY, JSON.stringify(updated));
    onReposChange(updated);
  }

  function handleWorkflowsChange(repoFullName: string, workflows: string[]) {
    const updated = { ...monitoredWorkflows, [repoFullName]: workflows };
    if (workflows.length === 0) delete updated[repoFullName];
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(updated));
    onWorkflowsChange(updated);
  }

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const monitoredCount = filteredRepos.filter((r) =>
    monitoredRepos.includes(r.full_name)
  ).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Manage Repositories</h2>
            <p className="text-sm text-gray-400">
              {org} &middot; {monitoredCount} of {filteredRepos.length} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b border-gray-800 space-y-3">
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600/30 transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs bg-gray-700/50 text-gray-400 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Repo List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {search ? 'No repos match your search' : 'No repositories found'}
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const isMonitored = monitoredRepos.includes(repo.full_name);
              const isExpanded = expandedRepo === repo.full_name;
              const hasFilter = monitoredWorkflows[repo.full_name]?.length > 0;
              return (
                <div key={repo.id} className="mb-0.5">
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isMonitored
                        ? 'bg-blue-600/10 border border-blue-500/20'
                        : 'hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => toggleRepo(repo.full_name)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                          isMonitored
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-600 bg-gray-800'
                        }`}
                      >
                        {isMonitored && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-200 truncate">
                          {repo.name}
                        </div>
                        {repo.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasFilter && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded-full border border-purple-500/20">
                          filtered
                        </span>
                      )}
                      {repo.private && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-900/30 text-yellow-500 rounded">
                          Private
                        </span>
                      )}
                      {isMonitored && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRepo(isExpanded ? null : repo.full_name);
                          }}
                          className="p-1 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                          title="Filter workflows"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {isMonitored && isExpanded && (
                    <WorkflowSelector
                      repoFullName={repo.full_name}
                      selectedWorkflows={monitoredWorkflows[repo.full_name] || []}
                      onWorkflowsChange={handleWorkflowsChange}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium text-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
