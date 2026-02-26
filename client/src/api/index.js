const BASE = '/api';

function getToken() {
  return localStorage.getItem('bt_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Auth
export const api = {
  auth: {
    signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
  },
  babies: {
    list: () => request('/babies'),
    get: (id) => request(`/babies/${id}`),
    create: (body) => request('/babies', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/babies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/babies/${id}`, { method: 'DELETE' }),
    leave: (id) => request(`/babies/${id}/leave`, { method: 'DELETE' }),
  },
  weights: {
    list: (babyId) => request(`/babies/${babyId}/weights`),
    add: (babyId, body) => request(`/babies/${babyId}/weights`, { method: 'POST', body: JSON.stringify(body) }),
    update: (babyId, id, body) => request(`/babies/${babyId}/weights/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (babyId, id) => request(`/babies/${babyId}/weights/${id}`, { method: 'DELETE' }),
  },
  invites: {
    create: (babyId) => request(`/babies/${babyId}/invites`, { method: 'POST' }),
    info: (token) => request(`/invites/${token}`),
    accept: (token) => request(`/invites/${token}/accept`, { method: 'POST' }),
  },
};
