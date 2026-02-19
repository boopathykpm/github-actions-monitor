import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import OrgSelector from './components/OrgSelector';
import RepoManager from './components/RepoManager';
import Dashboard from './components/Dashboard';

const REPOS_KEY = 'gha_monitor_repos';
const WORKFLOWS_KEY = 'gha_monitor_workflows';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [monitoredRepos, setMonitoredRepos] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(REPOS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [monitoredWorkflows, setMonitoredWorkflows] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem(WORKFLOWS_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const [showRepoManager, setShowRepoManager] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Persist repos
  useEffect(() => {
    localStorage.setItem(REPOS_KEY, JSON.stringify(monitoredRepos));
  }, [monitoredRepos]);

  // Persist workflow selections
  useEffect(() => {
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(monitoredWorkflows));
  }, [monitoredWorkflows]);

  // Clean up workflow selections when repos are removed
  function handleReposChange(repos: string[]) {
    setMonitoredRepos(repos);
    setMonitoredWorkflows((prev) => {
      const next: Record<string, string[]> = {};
      for (const repo of repos) {
        if (prev[repo]) next[repo] = prev[repo];
      }
      return next;
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white hidden sm:inline">
                  Actions Monitor
                </span>
              </div>
              <div className="h-5 w-px bg-gray-800" />
              <OrgSelector selectedOrg={selectedOrg} onOrgChange={setSelectedOrg} />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {selectedOrg && (
                <button
                  onClick={() => setShowRepoManager(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline text-gray-300">Repos</span>
                  {monitoredRepos.length > 0 && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-1.5 py-0.5 rounded-full">
                      {monitoredRepos.length}
                    </span>
                  )}
                </button>
              )}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-8 h-8 rounded-full border border-gray-700"
                  />
                </button>
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-700">
                        <div className="text-sm font-medium text-white">
                          {user.name || user.login}
                        </div>
                        <div className="text-xs text-gray-400">@{user.login}</div>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedOrg ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Select an Organization</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              Choose an organization from the dropdown above to get started.
            </p>
          </div>
        ) : (
          <Dashboard
            monitoredRepos={monitoredRepos}
            monitoredWorkflows={monitoredWorkflows}
            onOpenRepoManager={() => setShowRepoManager(true)}
          />
        )}
      </main>

      {/* Repo Manager Modal */}
      {showRepoManager && selectedOrg && (
        <RepoManager
          org={selectedOrg}
          monitoredRepos={monitoredRepos}
          monitoredWorkflows={monitoredWorkflows}
          onReposChange={handleReposChange}
          onWorkflowsChange={setMonitoredWorkflows}
          onClose={() => setShowRepoManager(false)}
        />
      )}
    </div>
  );
}
