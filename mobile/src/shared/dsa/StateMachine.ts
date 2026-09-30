/**
 * Finite State Machine for Pipeline Execution
 * Enforces legal state transitions and prevents invalid status jumps.
 */

import { PipelineStatus } from '../types/pipeline';

export class PipelineStateMachine {
  private currentState: PipelineStatus = 'idle';
  private listeners: Set<(newState: PipelineStatus, prevState: PipelineStatus) => void> = new Set();

  private static readonly LEGAL_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
    idle: ['fetching', 'downloading'],
    fetching: ['idle', 'downloading', 'error'],
    downloading: ['paused', 'normalizing', 'done', 'error', 'cancelled'],
    paused: ['downloading', 'cancelled'],
    normalizing: ['stitching', 'done', 'error', 'cancelled'],
    stitching: ['embedding_chapters', 'done', 'error', 'cancelled'],
    embedding_chapters: ['done', 'error', 'cancelled'],
    done: ['idle', 'fetching', 'downloading'],
    error: ['idle', 'fetching', 'downloading'],
    cancelled: ['idle', 'fetching', 'downloading'],
  };

  constructor(initialState: PipelineStatus = 'idle') {
    this.currentState = initialState;
  }

  getState(): PipelineStatus {
    return this.currentState;
  }

  canTransitionTo(targetState: PipelineStatus): boolean {
    const allowed = PipelineStateMachine.LEGAL_TRANSITIONS[this.currentState] || [];
    return allowed.includes(targetState);
  }

  transition(targetState: PipelineStatus): boolean {
    if (this.currentState === targetState) {
      return true;
    }

    if (!this.canTransitionTo(targetState)) {
      console.warn(
        `[StateMachine] Illegal transition attempted from '${this.currentState}' to '${targetState}'.`
      );
      return false;
    }

    const prevState = this.currentState;
    this.currentState = targetState;
    this.notify(targetState, prevState);
    return true;
  }

  forceReset(state: PipelineStatus = 'idle'): void {
    const prev = this.currentState;
    this.currentState = state;
    this.notify(state, prev);
  }

  subscribe(listener: (newState: PipelineStatus, prevState: PipelineStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(newState: PipelineStatus, prevState: PipelineStatus): void {
    for (const listener of this.listeners) {
      try {
        listener(newState, prevState);
      } catch (err) {
        console.error('[StateMachine] Error in transition listener:', err);
      }
    }
  }
}
