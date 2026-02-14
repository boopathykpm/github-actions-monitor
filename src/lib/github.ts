const API = 'https://api.github.com';

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------- Types ----------

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
}

export interface GitHubOrg {
  login: string;
  avatar_url: string;
  description: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
}

export interface WorkflowRun {
  id: number;
  name: string;
  display_title: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  run_attempt: number;
  jobs_url: string;
  head_commit: {
    id: string;
    message: string;
    author: { name: string; email: string };
  } | null;
  actor: {
    login: string;
    avatar_url: string;
  };
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
}

export interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: WorkflowStep[];
}

// ---------- API Functions ----------

export async function getUser(token: string): Promise<GitHubUser> {
  return ghFetch<GitHubUser>(token, '/user');
}

export async function getOrgs(token: string): Promise<GitHubOrg[]> {
  return ghFetch<GitHubOrg[]>(token, '/user/orgs?per_page=100');
}

export async function getOrgRepos(
  token: string,
  org: string
): Promise<GitHubRepo[]> {
  // Fetch up to 100 repos, sorted by most recently updated
  return ghFetch<GitHubRepo[]>(
    token,
    `/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=updated&direction=desc`
  );
}

export async function getWorkflowRuns(
  token: string,
  owner: string,
  repo: string,
  perPage = 5
): Promise<{ total_count: number; workflow_runs: WorkflowRun[] }> {
  return ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${perPage}`
  );
}

export async function getRunJobs(
  token: string,
  owner: string,
  repo: string,
  runId: number
): Promise<{ total_count: number; jobs: WorkflowJob[] }> {
  return ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/jobs`
  );
}
