import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrgs, type GitHubOrg } from '../lib/github';

const ORG_KEY = 'gha_monitor_org';

interface OrgSelectorProps {
  selectedOrg: string | null;
  onOrgChange: (org: string | null) => void;
}

export default function OrgSelector({ selectedOrg, onOrgChange }: OrgSelectorProps) {
  const { token } = useAuth();
  const [orgs, setOrgs] = useState<GitHubOrg[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getOrgs(token)
      .then(setOrgs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // Restore saved org
  useEffect(() => {
    const saved = localStorage.getItem(ORG_KEY);
    if (saved && !selectedOrg) {
      onOrgChange(saved);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectOrg(org: string) {
    localStorage.setItem(ORG_KEY, org);
    onOrgChange(org);
    setOpen(false);
  }

  const selectedOrgData = orgs.find((o) => o.login === selectedOrg);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 hover:border-gray-600 transition-colors text-sm cursor-pointer"
      >
        {selectedOrgData ? (
          <>
            <img
              src={selectedOrgData.avatar_url}
              alt={selectedOrgData.login}
              className="w-5 h-5 rounded"
            />
            <span className="text-gray-200">{selectedOrgData.login}</span>
          </>
        ) : (
          <span className="text-gray-400">
            {loading ? 'Loading orgs...' : 'Select Organization'}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {orgs.length === 0 ? (
            <div className="p-3 text-sm text-gray-400">
              {loading ? 'Loading...' : 'No organizations found'}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {orgs.map((org) => (
                <button
                  key={org.login}
                  onClick={() => selectOrg(org.login)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-700 transition-colors cursor-pointer ${
                    selectedOrg === org.login ? 'bg-gray-700/50 text-white' : 'text-gray-300'
                  }`}
                >
                  <img
                    src={org.avatar_url}
                    alt={org.login}
                    className="w-6 h-6 rounded"
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{org.login}</div>
                    {org.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {org.description}
                      </div>
                    )}
                  </div>
                  {selectedOrg === org.login && (
                    <svg className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
