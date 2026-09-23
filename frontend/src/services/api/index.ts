/**
 * Unified API Client Facade.
 *
 * Composes specialized domain endpoint clients while providing an identical
 * interface for all frontend views and hooks.
 */

import { HttpClient, httpClient } from './client';
import { clearAuthToken, getAuthToken, setAuthToken } from './storage';
import { SystemEndpoints } from './endpoints/system';
import { PlaylistEndpoints } from './endpoints/playlists';
import { MergerEndpoints } from './endpoints/merger';
import { QueueEndpoints } from './endpoints/queues';
import { HistoryEndpoints } from './endpoints/history';
import { AuthEndpoints } from './endpoints/auth';
import { LicenseEndpoints } from './endpoints/license';
import { AdminEndpoints } from './endpoints/admin';
import { TelemetryEndpoints } from './endpoints/telemetry';
import { FeedbackEndpoints } from './endpoints/feedback';
import { UpdateCheckResult, UpdateEndpoints } from './endpoints/updates';

export type { UpdateCheckResult } from './endpoints/updates';

export class ApiClient {
  private http: HttpClient;
  private system: SystemEndpoints;
  private playlists: PlaylistEndpoints;
  private merger: MergerEndpoints;
  private queues: QueueEndpoints;
  private history: HistoryEndpoints;
  private auth: AuthEndpoints;
  private license: LicenseEndpoints;
  private admin: AdminEndpoints;
  private telemetry: TelemetryEndpoints;
  private feedback: FeedbackEndpoints;
  private updates: UpdateEndpoints;

  constructor(client: HttpClient = httpClient) {
    this.http = client;
    this.system = new SystemEndpoints(client);
    this.playlists = new PlaylistEndpoints(client);
    this.merger = new MergerEndpoints(client);
    this.queues = new QueueEndpoints(client);
    this.history = new HistoryEndpoints(client);
    this.auth = new AuthEndpoints(client);
    this.license = new LicenseEndpoints(client);
    this.admin = new AdminEndpoints(client);
    this.telemetry = new TelemetryEndpoints(client);
    this.feedback = new FeedbackEndpoints(client);
    this.updates = new UpdateEndpoints(client);
  }

  // Auth Token helpers
  getToken(): string | null {
    return getAuthToken();
  }

  setToken(token: string): void {
    setAuthToken(token);
  }

  clearToken(): void {
    clearAuthToken();
  }

  // System
  getHealth = () => this.system.getHealth();
  openFile = (path: string) => this.system.openFile(path);
  openFolder = (path: string) => this.system.openFolder(path);
  openUrl = (url: string) => this.system.openUrl(url);
  getSettings = () => this.system.getSettings();
  saveSettings = (settings: Record<string, any>) => this.system.saveSettings(settings);
  quitApp = () => this.system.quitApp();
  checkConnectivity = () => this.system.checkConnectivity();

  // Playlists
  fetchPlaylist = (url: string) => this.playlists.fetchPlaylist(url);

  // Merger
  startMerge = (payload: Parameters<MergerEndpoints['startMerge']>[0]) => this.merger.startMerge(payload);
  pauseMerge = () => this.merger.pauseMerge();
  resumeMerge = () => this.merger.resumeMerge();
  cancelMerge = () => this.merger.cancelMerge();
  connectProgress = (
    onMessage: Parameters<MergerEndpoints['connectProgress']>[0],
    onError?: Parameters<MergerEndpoints['connectProgress']>[1]
  ) => this.merger.connectProgress(onMessage, onError);

  // Queues
  getQueues = () => this.queues.getQueues();
  enqueuePlaylist = (item: Parameters<QueueEndpoints['enqueuePlaylist']>[0]) => this.queues.enqueuePlaylist(item);
  deleteQueueItem = (id: number) => this.queues.deleteQueueItem(id);

  // History
  getHistory = () => this.history.getHistory();
  deleteHistoryItem = (id: number) => this.history.deleteHistoryItem(id);
  clearAllHistory = () => this.history.clearAllHistory();

  // Auth
  register = (email: string, pass: string, name: string) => this.auth.register(email, pass, name);
  login = (email: string, pass: string) => this.auth.login(email, pass);
  getAuthMe = () => this.auth.getAuthMe();
  logout = () => this.auth.logout();
  deactivateDevice = (hwid: string) => this.auth.deactivateDevice(hwid);
  getUserProfile = () => this.auth.getUserProfile();

  // License & Billing
  getLicenseStatus = () => this.license.getLicenseStatus();
  activateLicense = (key: string) => this.license.activateLicense(key);
  deactivateLicense = () => this.license.deactivateLicense();
  getAccountUsage = () => this.license.getAccountUsage();
  getBillingPlans = () => this.license.getBillingPlans();
  createCheckoutSession = (tier: string) => this.license.createCheckoutSession(tier);

  // Admin
  adminGetStats = () => this.admin.adminGetStats();
  adminGetUsers = (search?: string) => this.admin.adminGetUsers(search);
  adminUpdateUserTier = (userId: string, tier: string, role?: string) =>
    this.admin.adminUpdateUserTier(userId, tier, role);
  adminResetDevices = (userId: string) => this.admin.adminResetDevices(userId);
  adminGetLicenses = () => this.admin.adminGetLicenses();
  adminGenerateLicense = (payload: Parameters<AdminEndpoints['adminGenerateLicense']>[0]) =>
    this.admin.adminGenerateLicense(payload);
  adminRevokeLicense = (key: string) => this.admin.adminRevokeLicense(key);
  adminGetAuditLog = (limit?: number) => this.admin.adminGetAuditLog(limit);

  // Telemetry
  trackEvent = (eventName: string, props?: Record<string, any>) => this.telemetry.trackEvent(eventName, props);

  // Feedback
  submitReview = (payload: Parameters<FeedbackEndpoints['submitReview']>[0]) =>
    this.feedback.submitReview(payload);
  submitCancellationComplaint = (
    payload: Parameters<FeedbackEndpoints['submitCancellationComplaint']>[0]
  ) => this.feedback.submitCancellationComplaint(payload);

  // Updates
  checkForUpdates = () => this.updates.checkForUpdates();
}

export const api = new ApiClient();

// Standalone function re-exports for modules that import functions directly
const _system = new SystemEndpoints(httpClient);
const _updates = new UpdateEndpoints(httpClient);

export const checkConnectivity = () => _system.checkConnectivity();
export const checkForUpdates = (): Promise<UpdateCheckResult> => _updates.checkForUpdates();
export const quitApp = () => _system.quitApp();
