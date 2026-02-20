import { useState } from 'react';

export interface AwsAccount {
  accountId: string;
  name: string;
  environment?: string;
}

const AWS_KEY = 'gha_monitor_aws_accounts';

interface AwsAccountManagerProps {
  accounts: AwsAccount[];
  onAccountsChange: (accounts: AwsAccount[]) => void;
  onClose: () => void;
}

export default function AwsAccountManager({ accounts, onAccountsChange, onClose }: AwsAccountManagerProps) {
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addAccount() {
    const trimmedId = accountId.trim();
    const trimmedName = name.trim();
    setError(null);

    if (!/^\d{12}$/.test(trimmedId)) {
      setError('Account ID must be exactly 12 digits');
      return;
    }
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    if (accounts.some((a) => a.accountId === trimmedId)) {
      setError('Account ID already exists');
      return;
    }

    const updated = [...accounts, { accountId: trimmedId, name: trimmedName, environment: environment.trim() || undefined }];
    localStorage.setItem(AWS_KEY, JSON.stringify(updated));
    onAccountsChange(updated);
    setAccountId('');
    setName('');
    setEnvironment('');
  }

  function removeAccount(id: string) {
    const updated = accounts.filter((a) => a.accountId !== id);
    localStorage.setItem(AWS_KEY, JSON.stringify(updated));
    onAccountsChange(updated);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">AWS Account Mappings</h2>
            <p className="text-sm text-gray-400">
              Map AWS account IDs to friendly names for display on workflow cards
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add form */}
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Account ID (12 digits)"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value.replace(/\D/g, '').slice(0, 12))}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
            <input
              type="text"
              placeholder="Account name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Environment (optional, e.g. dev, prod)"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={addAccount}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors cursor-pointer flex-shrink-0"
            >
              Add
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Account list */}
        <div className="flex-1 overflow-y-auto p-2">
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No AWS accounts configured. Add one above to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Account ID</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Env</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acct) => (
                  <tr key={acct.accountId} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-sm text-gray-300 font-mono">{acct.accountId}</td>
                    <td className="px-3 py-2 text-sm text-gray-200">{acct.name}</td>
                    <td className="px-3 py-2">
                      {acct.environment && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded">
                          {acct.environment}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => removeAccount(acct.accountId)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
