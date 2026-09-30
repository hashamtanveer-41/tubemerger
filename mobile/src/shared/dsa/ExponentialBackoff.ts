/**
 * Exponential Backoff Algorithm with Jitter
 * Used for retry logic in network operations (e.g. metadata extraction).
 */

export interface BackoffOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  maxAttempts?: number;
  jitter?: boolean;
}

export class ExponentialBackoff {
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly factor: number;
  private readonly maxAttempts: number;
  private readonly jitter: boolean;

  constructor(options: BackoffOptions = {}) {
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.factor = options.factor ?? 2;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.jitter = options.jitter ?? true;
  }

  getDelay(attempt: number): number {
    const rawDelay = this.initialDelayMs * Math.pow(this.factor, attempt);
    const cappedDelay = Math.min(rawDelay, this.maxDelayMs);

    if (!this.jitter) {
      return cappedDelay;
    }

    // Full jitter formula: random between 0 and cappedDelay
    return Math.floor(Math.random() * cappedDelay);
  }

  async execute<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (err) {
        lastError = err;
        if (attempt === this.maxAttempts - 1) {
          break;
        }

        const delay = this.getDelay(attempt);
        await new Promise((resolve) => setTimeout(() => resolve(undefined), delay));
      }
    }

    throw lastError;
  }
}
