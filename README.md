# GitHub Actions Monitor

A real-time dashboard to monitor GitHub Actions workflow runs across multiple repositories within an organization.

## Features

- **PAT-based auth** — sign in with a GitHub Personal Access Token (`repo` + `read:org` scopes). Token stays in browser localStorage only.
- **Organization selector** — switch between your GitHub orgs; selection is persisted across sessions.
- **Repository management** — search, select, and manage which repos to monitor from the selected org (supports Select All / Clear All).
- **Live dashboard** — shows the latest run per workflow, grouped by status: Running, Waiting, Success, Failure.
- **Adaptive auto-refresh** — automatically polls every 5 seconds when active runs are detected (in-progress, queued, waiting); falls back to user-selected idle interval (15s / 30s / 60s / 120s) when all runs are complete. Includes countdown timer and manual refresh.
- **New run detection** — highlights newly appeared runs between refreshes with a pulsing "new" badge.
- **Expandable job/step details** — drill into jobs and individual steps for any workflow run, with duration and status indicators.
- **Persistent settings** — selected org, monitored repos, and refresh interval are saved to localStorage.

## Tech Stack

- **React 18** — UI framework
- **TypeScript** — type safety
- **Vite 6** — dev server and bundler
- **Tailwind CSS 3** — utility-first styling
- **GitHub REST API** — data source (no backend server required)

## Prerequisites

- Node.js >= 18
- npm

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173`, enter your GitHub PAT, select an org, add repos, and monitor.

## Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Start the dev server with hot module replacement |
| `npm run build` | `tsc -b && vite build` | Type-check and build for production into `dist/` |
| `npm run preview` | `vite build && vite preview` | Build and serve the production bundle locally |

## Project Structure

```
src/
├── main.tsx                # App entry point
├── App.tsx                 # Root component with routing and layout
├── index.css               # Tailwind directives and custom scrollbar styles
├── context/
│   └── AuthContext.tsx      # Auth state management (token, user, login/logout)
├── lib/
│   └── github.ts           # GitHub REST API client and type definitions
└── components/
    ├── LoginPage.tsx        # PAT login form
    ├── OrgSelector.tsx      # Organization dropdown selector
    ├── RepoManager.tsx      # Modal to search and select repos to monitor
    ├── Dashboard.tsx        # Main dashboard with status-grouped workflow runs
    ├── WorkflowCard.tsx     # Individual workflow run card with status badge
    └── StepsList.tsx        # Expandable job and step details
```

## Token Scopes

Your GitHub Personal Access Token needs:

- `repo` — access workflow runs (including private repos)
- `read:org` — list organizations

[Create a token](https://github.com/settings/tokens/new?scopes=repo,read:org&description=GitHub+Actions+Monitor)

## Security

- Your token is stored **only** in your browser's `localStorage`.
- The app makes requests directly from the browser to the GitHub API — there is no backend server.
- No data is sent to any third-party service.
