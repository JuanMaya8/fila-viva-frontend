import { describe, expect, it } from 'vitest';
import { initials, niceMax, queueDots, statusStepIndex, waitProgress } from './visual';

describe('visual helpers', () => {
  it('computes wait progress safely', () => {
    expect(waitProgress(null, 600)).toBe(0);
    expect(waitProgress(300, 600)).toBeCloseTo(0.5);
    expect(waitProgress(900, 600)).toBe(0);
    expect(waitProgress(0, 600)).toBe(1);
    expect(waitProgress(10, 0)).toBe(0);
  });

  it('caps the people-ahead dots', () => {
    expect(queueDots(0)).toEqual({ shown: 0, overflow: 0 });
    expect(queueDots(4)).toEqual({ shown: 4, overflow: 0 });
    expect(queueDots(15, 10)).toEqual({ shown: 10, overflow: 5 });
    expect(queueDots(-2)).toEqual({ shown: 0, overflow: 0 });
  });

  it('rounds chart maxima to readable values', () => {
    expect(niceMax([])).toBe(1);
    expect(niceMax([0.4])).toBe(0.5);
    expect(niceMax([7])).toBe(10);
    expect(niceMax([23, 4])).toBe(25);
    expect(niceMax([130])).toBe(200);
  });

  it('maps statuses to the stepper', () => {
    expect(statusStepIndex('created')).toBe(0);
    expect(statusStepIndex('in_service')).toBe(2);
    expect(statusStepIndex('cancelled')).toBe(-1);
  });

  it('builds initials', () => {
    expect(initials('Ana María Pérez')).toBe('AM');
    expect(initials('luis')).toBe('L');
  });
});
