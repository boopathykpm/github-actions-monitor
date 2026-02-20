import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, error, loading } = useAuth();
  const [tokenInput, setTokenInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(tokenInput);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-5">
              <svg viewBox="0 0 28 28" fill="none">
                <rect x="1" y="1" width="26" height="26" rx="6" stroke="url(#loginGrad)" strokeWidth="1.5" />
                <path d="M8 14h3l2-4 3 8 2-4h3" stroke="url(#loginGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="loginGrad" x1="2" y1="2" x2="26" y2="26">
                    <stop stopColor="#4ade80" />
                    <stop offset="1" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">IGAM</span>
            </h1>
            <p className="text-sm text-gray-300 font-medium mb-1">
              Integrated GitHub Actions Monitor
            </p>
            <p className="text-gray-500 text-xs">
              Monitor workflow runs across multiple repositories in real-time.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-1.5">
                Personal Access Token
              </label>
              <input
                id="token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              {loading ? 'Verifying...' : 'Sign in with Token'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">
              Your token needs these scopes:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <code className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-blue-400 rounded">repo</code>
              <code className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-blue-400 rounded">read:org</code>
            </div>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=GitHub+Actions+Monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              Create a token on GitHub &rarr;
            </a>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Your token is stored only in your browser's local storage and is never sent to any server other than GitHub's API.
          </p>
        </div>
      </div>
    </div>
  );
}
