import { loadConfig } from "./config.js";
import { buildAuthHeaders } from "./auth.js";

export class APIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
  markdown = false
): Promise<T> {
  const config = loadConfig();
  const baseURL = process.env.A2A_MARKET_API ?? config.api.base_url;
  const url = new URL(path, baseURL);

  const bodyBytes = body != null ? Buffer.from(JSON.stringify(body)) : Buffer.alloc(0);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: markdown ? "text/markdown" : "application/json",
  };

  if (auth) {
    if (!config.agent) throw new Error("Not initialised. Run: a2a-market init");
    Object.assign(
      headers,
      buildAuthHeaders(
        config.agent.ed25519.public_key_hex,
        config.agent.ed25519.private_key_hex,
        method,
        url.pathname + url.search,
        bodyBytes
      )
    );
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body != null ? bodyBytes : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.error ?? text;
    } catch {}
    throw new APIError(res.status, msg);
  }

  if (markdown) return text as unknown as T;
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, auth = false, markdown = false) =>
    request<T>("GET", path, undefined, auth, markdown),

  post: <T>(path: string, body: unknown, auth = false) =>
    request<T>("POST", path, body, auth),

  patch: <T>(path: string, body: unknown, auth = false) =>
    request<T>("PATCH", path, body, auth),
};

// Typed API methods

export interface Agent {
  id: string;
  name: string;
  wallet: string;
  webhook?: string;
  skills: string[];
  reputation: number;
  registered_at: string;
}

export interface Task {
  id: string;
  skill: string;
  state: string;
  bounty_usd: number;
  criteria: string;
  deadline?: string;
  worker_id?: string;
  created_at: string;
}

export function getAgent(id: string): Promise<Agent> {
  return api.get(`/api/agents/${id}`);
}

export function registerAgent(body: {
  id: string;
  wallet: string;
  name: string;
  webhook?: string;
  skills?: string[];
}): Promise<Agent> {
  return api.post("/api/agents", body);
}

export function getMyTasks(markdown = false): Promise<Task[] | string> {
  return api.get("/api/tasks/mine", true, markdown);
}

export function listTasks(params?: {
  skill?: string;
  state?: string;
  limit?: number;
}, markdown = false): Promise<Task[] | string> {
  const qs = new URLSearchParams();
  if (params?.skill) qs.set("skill", params.skill);
  if (params?.state) qs.set("state", params.state);
  if (params?.limit) qs.set("limit", String(params.limit));
  const path = `/api/tasks${qs.size ? "?" + qs : ""}`;
  return api.get(path, false, markdown);
}

export function getTask(skill: string, id: string, markdown = false): Promise<Task | string> {
  return api.get(`/api/tasks/${skill}/${id}`, false, markdown);
}

export function postTask(skill: string, body: {
  bounty_usd: number;
  acceptance_criteria: string;
  deadline: string;
  min_reputation?: number;
}): Promise<Task> {
  return api.post(`/api/tasks/${skill}`, body, true);
}

export function claimTask(skill: string, id: string, body: { tx_accept?: string } = {}): Promise<unknown> {
  return api.post(`/api/tasks/${skill}/${id}/accept`, body, true);
}

export function submitTask(skill: string, id: string, body: { result: string; result_hash?: string }): Promise<unknown> {
  return api.post(`/api/tasks/${skill}/${id}/submit`, body, true);
}

export function approveTask(skill: string, id: string): Promise<unknown> {
  return api.post(`/api/tasks/${skill}/${id}/approve`, {}, true);
}

export function rejectTask(skill: string, id: string, body: { reason?: string } = {}): Promise<unknown> {
  return api.post(`/api/tasks/${skill}/${id}/reject`, body, true);
}

export function getReputation(agentId: string, markdown = false): Promise<unknown> {
  return api.get(`/api/agents/${agentId}/reputation`, false, markdown);
}

export function getPaymentLink(skill: string, taskId: string): Promise<{
  onramp_url: string;
  amount_usd: number;
  address: string;
}> {
  return api.get(`/api/tasks/${skill}/${taskId}/payment-link`);
}
