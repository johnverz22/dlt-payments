import { http, HttpResponse } from 'msw';

import loginSuccess from '../fixtures/login-success.json';
import profile from '../fixtures/profile.json';
import merchant from '../fixtures/merchant.json';
import machineClients from '../fixtures/machine-clients.json';
import integrationKeys from '../fixtures/integration-keys.json';
import teamMembers from '../fixtures/team-members.json';
import invitations from '../fixtures/invitations.json';
import transactionList from '../fixtures/transaction-list.json';
import transactionDetail from '../fixtures/transaction-detail.json';
import historyList from '../fixtures/history-list.json';
import metrics from '../fixtures/metrics.json';
import charts from '../fixtures/charts.json';
import currencyCatalogue from '../fixtures/currency-catalogue.json';

import error401 from '../fixtures/401-invalid-credentials.json';
import error422 from '../fixtures/422-validation.json';
import error429 from '../fixtures/429-rate-limited.json';

const API_BASE = 'http://localhost/api/v1';

export const handlers = [
  // Auth
  http.post(`${API_BASE}/auth/login`, () => HttpResponse.json(loginSuccess)),
  http.post(`${API_BASE}/auth/logout`, () => HttpResponse.json({ success: true, message: 'Logged out successfully' })),
  
  // Profile
  http.get(`${API_BASE}/portal/me`, () => HttpResponse.json(profile)),
  
  // Merchant
  http.get(`${API_BASE}/portal/merchant`, () => HttpResponse.json(merchant)),
  http.get(`${API_BASE}/portal/merchant/machine-clients`, () => HttpResponse.json(machineClients)),
  http.get(`${API_BASE}/portal/merchant/integration-keys`, () => HttpResponse.json(integrationKeys)),
  
  // Team
  http.get(`${API_BASE}/portal/team/members`, () => HttpResponse.json(teamMembers)),
  http.get(`${API_BASE}/portal/team/invitations`, () => HttpResponse.json(invitations)),
  
  // Transactions
  http.get(`${API_BASE}/portal/collections/transactions`, () => HttpResponse.json(transactionList)),
  http.get(`${API_BASE}/portal/collections/transactions/:id`, () => HttpResponse.json(transactionDetail)),
  http.get(`${API_BASE}/portal/collections/transactions/:id/history`, () => HttpResponse.json(historyList)),
  
  // Reporting
  http.get(`${API_BASE}/portal/collections/metrics`, () => HttpResponse.json(metrics)),
  http.get(`${API_BASE}/portal/collections/charts`, () => HttpResponse.json(charts)),
  
  // Config
  http.get(`${API_BASE}/json/currency`, () => HttpResponse.json(currencyCatalogue)),
];
