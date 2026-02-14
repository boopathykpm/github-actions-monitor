import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrgRepos, type GitHubRepo } from '../lib/github';

const REPOS_KEY = 'gha_monitor_repos';

interface RepoManagerProps {
  org: string;
  monitoredRepos: string[];
  onReposChange: (repos: string[]) => void;
  onClose: () => void;
}

export default function RepoManager({
  org,
  monitoredRepos,
  onReposChange,
  onClose,
}: RepoManagerProps) {
  const { token } = useAuth();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

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
              return (
                <button
                  key={repo.id}
                  onClick={() => toggleRepo(repo.full_name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer mb-0.5 ${
                    isMonitored
                      ? 'bg-blue-600/10 border border-blue-500/20'
                      : 'hover:bg-gray-800 border border-transparent'
                  }`}
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
                  {repo.private && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-900/30 text-yellow-500 rounded flex-shrink-0">
                      Private
                    </span>
                  )}
                </button>
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
