# GitHub Actions Monitor

A real-time dashboard to monitor GitHub Actions workflow runs across multiple repositories within an organization.

## Features

- **PAT-based auth** — sign in with a GitHub Personal Access Token (`repo` + `read:org` scopes). Token stays in browser localStorage only.
- **Organization selector** — switch between your GitHub orgs.
- **Repository management** — pick which repos to monitor from the selected org.
- **Live dashboard** — shows the latest run per workflow, grouped by status: Running, Waiting, Success, Failure.
- **Auto-refresh** — configurable interval (15s / 30s / 60s / 120s) with countdown and manual refresh.
- **New run detection** — highlights newly appeared runs between refreshes.
- **Expandable job/step details** — drill into jobs and steps for any workflow run.

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, enter your GitHub PAT, select an org, add repos, and monitor.

## Build

```bash
npm run build
npm run preview
```

## Token Scopes

Your PAT needs:

- `repo` — access workflow runs (including private repos)
- `read:org` — list organizations

[Create a token](https://github.com/settings/tokens/new?scopes=repo,read:org&description=GitHub+Actions+Monitor)
