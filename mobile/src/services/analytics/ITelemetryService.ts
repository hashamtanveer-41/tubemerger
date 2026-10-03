/**
 * Telemetry Service Interface (SOLID - Dependency Inversion Principle)
 * High-level business logic depends on this interface, not the concrete Aptabase implementation.
 */

export type TelemetryProps = Record<string, string | number | boolean>;

export interface ITelemetryService {
  init(appKey?: string): void;
  trackAppStarted(): void;
  trackPlaylistInspected(clipCount: number, playlistSizeMb?: number): void;
  trackMergeStarted(clipCount: number, preset: string, playlistSizeMb?: number): void;
  trackMergeCompleted(durationSeconds: number, clipCount: number): void;
  trackMergeFailed(
    errorMessage: string,
    clipCount?: number,
    preset?: string,
    playlistSizeMb?: number
  ): void;
  trackMergeCancelled(overallPercent: number, clipCount?: number): void;
  trackUpdateAvailable(latestVersion: string): void;
  trackCustomEvent(eventName: string, props?: TelemetryProps): void;
}
