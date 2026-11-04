import { describe, expect, it } from 'vitest';
import { initialCountdown, setTarget, tick } from './countdown';

describe('countdown smoothing', () => {
  it('starts at the first estimate and counts down in real time', () => {
    let state = setTarget(initialCountdown(), 10, 0);
    expect(state.displayedSeconds).toBe(600);
    state = tick(state, 1000);
    expect(state.displayedSeconds).toBeCloseTo(599, 0);
  });

  it('glides towards a new estimate instead of jumping', () => {
    let state = setTarget(initialCountdown(), 10, 0);
    state = setTarget(state, 5, 0);
    state = tick(state, 1000);
    expect(state.displayedSeconds).toBeLessThan(599);
    expect(state.displayedSeconds).toBeGreaterThan(299);
    for (let second = 2; second < 40; second += 1) {
      state = tick(state, second * 1000);
    }
    expect(state.displayedSeconds).toBeCloseTo(300 - 39, 0);
  });

  it('never goes below zero', () => {
    let state = setTarget(initialCountdown(), 0.05, 0);
    for (let second = 1; second < 20; second += 1) {
      state = tick(state, second * 1000);
    }
    expect(state.displayedSeconds).toBe(0);
  });

  it('ignores ticks before the first estimate', () => {
    expect(tick(initialCountdown(), 5000).displayedSeconds).toBe(0);
  });
});
