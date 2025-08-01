import { ClockSyncState } from './types';

/**
 * Handles external MIDI clock synchronization
 * Receives MIDI clock messages from DAW and provides timing events for arpeggiator
 */
export class ClockSync {
  private state: ClockSyncState = {
    isRunning: false,
    ticks: 0,
    bpm: 120,
    status: 'stopped',
    lastTickTime: 0
  };

  private onTickCallbacks: (() => void)[] = [];
  private onQuarterNoteCallbacks: (() => void)[] = [];
  private onSixteenthNoteCallbacks: (() => void)[] = [];
  private onStartCallbacks: (() => void)[] = [];
  private onStopCallbacks: (() => void)[] = [];
  private tickIntervals: number[] = [];
  private readonly MAX_INTERVALS = 10;

  /**
   * Handles incoming MIDI clock tick (0xF8)
   * Calculates BPM and triggers timing events
   */
  onMIDIClockTick(): void {
    const now = performance.now();
    
    if (this.state.lastTickTime > 0) {
      const tickInterval = now - this.state.lastTickTime;
      this.tickIntervals.push(tickInterval);
      
      if (this.tickIntervals.length > this.MAX_INTERVALS) {
        this.tickIntervals.shift();
      }
      
      // Calculate average interval for stability
      if (this.tickIntervals.length >= 3) { // Need at least 3 samples
        const avgInterval = this.tickIntervals.reduce((a, b) => a + b) / this.tickIntervals.length;
        const ticksPerSecond = 1000 / avgInterval;
        this.state.bpm = Math.round((ticksPerSecond * 60) / 24);
      }
    }
    
    this.state.lastTickTime = now;
    this.state.ticks++;
    
    // Trigger tick callbacks
    this.onTickCallbacks.forEach(callback => callback());
    
    // Every 24 ticks = quarter note
    if (this.state.ticks % 24 === 0) {
      this.onQuarterNoteCallbacks.forEach(callback => callback());
    }
    
    // Every 6 ticks = sixteenth note
    if (this.state.ticks % 6 === 0) {
      this.onSixteenthNoteCallbacks.forEach(callback => callback());
    }
  }

  /**
   * Handles MIDI Start message (0xFA)
   * Resets clock and starts timing
   */
  onMIDIStart(): void {
    this.state.isRunning = true;
    this.state.ticks = 0;
    this.state.status = 'synced';
    this.state.lastTickTime = 0;
    this.tickIntervals = []; // Clear intervals on start
    
    this.onStartCallbacks.forEach(callback => callback());
  }

  /**
   * Handles MIDI Stop message (0xFC)
   * Stops timing and resets state
   */
  onMIDIStop(): void {
    this.state.isRunning = false;
    this.state.status = 'stopped';
    
    this.onStopCallbacks.forEach(callback => callback());
  }

  /**
   * Handles MIDI Continue message (0xFB)
   * Resumes timing without resetting ticks
   */
  onMIDIContinue(): void {
    this.state.isRunning = true;
    this.state.status = 'synced';
    
    this.onStartCallbacks.forEach(callback => callback());
  }

  /**
   * Gets the current clock state
   */
  getState(): ClockSyncState {
    return { ...this.state };
  }

  /**
   * Gets current BPM calculated from clock ticks
   */
  getBPM(): number {
    return Math.round(this.state.bpm);
  }

  /**
   * Gets current tick count
   */
  getTicks(): number {
    return this.state.ticks;
  }

  /**
   * Checks if clock is currently running
   */
  isRunning(): boolean {
    return this.state.isRunning;
  }

  /**
   * Gets current sync status
   */
  getStatus(): 'synced' | 'free' | 'stopped' {
    return this.state.status;
  }

  // Event registration methods
  onTick(callback: () => void): void {
    this.onTickCallbacks.push(callback);
  }

  onQuarterNote(callback: () => void): void {
    this.onQuarterNoteCallbacks.push(callback);
  }

  onSixteenthNote(callback: () => void): void {
    this.onSixteenthNoteCallbacks.push(callback);
  }

  onStart(callback: () => void): void {
    this.onStartCallbacks.push(callback);
  }

  onStop(callback: () => void): void {
    this.onStopCallbacks.push(callback);
  }

  /**
   * Removes all event callbacks
   */
  clearCallbacks(): void {
    this.onTickCallbacks = [];
    this.onQuarterNoteCallbacks = [];
    this.onSixteenthNoteCallbacks = [];
    this.onStartCallbacks = [];
    this.onStopCallbacks = [];
  }
} 