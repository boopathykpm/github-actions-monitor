import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import OrgSelector from './components/OrgSelector';
import RepoManager from './components/RepoManager';
import AwsAccountManager, { type AwsAccount } from './components/AwsAccountManager';
import Dashboard from './components/Dashboard';

const REPOS_KEY = 'gha_monitor_repos';
const WORKFLOWS_KEY = 'gha_monitor_workflows';
const AWS_KEY = 'gha_monitor_aws_accounts';
const ENV_FILTER_KEY = 'gha_monitor_env_filter';

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
  const [awsAccounts, setAwsAccounts] = useState<AwsAccount[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(AWS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [envFilter, setEnvFilter] = useState<string | null>(() => {
    return localStorage.getItem(ENV_FILTER_KEY) || null;
  });
  const [showRepoManager, setShowRepoManager] = useState(false);
  const [showAwsSettings, setShowAwsSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const availableEnvironments = useMemo(() => {
    const envs = new Set<string>();
    for (const acct of awsAccounts) {
      if (acct.environment) envs.add(acct.environment);
    }
    return Array.from(envs).sort((a, b) => a.localeCompare(b));
  }, [awsAccounts]);

  function changeEnvFilter(env: string | null) {
    setEnvFilter(env);
    if (env) {
      localStorage.setItem(ENV_FILTER_KEY, env);
    } else {
      localStorage.removeItem(ENV_FILTER_KEY);
    }
  }

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
              <div className="flex items-center gap-3">
                <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 28 28" fill="none">
                  <rect x="1" y="1" width="26" height="26" rx="6" stroke="url(#navGrad)" strokeWidth="1.5" />
                  <path d="M8 14h3l2-4 3 8 2-4h3" stroke="url(#navGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="navGrad" x1="2" y1="2" x2="26" y2="26">
                      <stop stopColor="#4ade80" />
                      <stop offset="1" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-sm font-semibold hidden sm:inline">
                  <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">IGAM</span>
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

              {/* Environment filter */}
              {availableEnvironments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  <select
                    value={envFilter || ''}
                    onChange={(e) => changeEnvFilter(e.target.value || null)}
                    className="px-2 py-1.5 text-xs font-medium bg-gray-800 border border-gray-700 rounded-lg text-gray-300 cursor-pointer focus:outline-none focus:border-blue-500 transition-colors appearance-none pr-6"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '14px' }}
                  >
                    <option value="">All Environments</option>
                    {availableEnvironments.map((env) => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                  {envFilter && (
                    <button
                      onClick={() => changeEnvFilter(null)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                      title="Clear environment filter"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* AWS Settings */}
              <button
                onClick={() => setShowAwsSettings(true)}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 hover:border-gray-600 transition-colors cursor-pointer"
                title="AWS Account Mappings"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

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
            awsAccounts={awsAccounts}
            envFilter={envFilter}
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

      {/* AWS Account Settings Modal */}
      {showAwsSettings && (
        <AwsAccountManager
          accounts={awsAccounts}
          onAccountsChange={setAwsAccounts}
          onClose={() => setShowAwsSettings(false)}
        />
      )}
    </div>
  );
}
