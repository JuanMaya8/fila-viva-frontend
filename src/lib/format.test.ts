import { describe, expect, it } from 'vitest';
import { friendlyMessage, pickInstitution } from './api';
import { formatBranchDate, formatBranchTime, formatCountdown, formatMinutes } from './format';

describe('formatting', () => {
  it('formats minutes for people', () => {
    expect(formatMinutes(null)).toBe('—');
    expect(formatMinutes(0.4)).toBe('menos de 1 min');
    expect(formatMinutes(12.6)).toBe('13 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(95)).toBe('1 h 35 min');
  });

  it('formats a countdown', () => {
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(3725)).toBe('1:02:05');
    expect(formatCountdown(-3)).toBe('00:00');
  });
});

describe('api helpers', () => {
  it('maps HTTP statuses to Spanish messages without server details', () => {
    expect(friendlyMessage(0)).toMatch(/conectar/);
    expect(friendlyMessage(409)).toMatch(/estado actual/);
    expect(friendlyMessage(502)).toMatch(/servidor/);
  });

  it('picks the first institution when no code is configured', () => {
    const institutions = [
      { id: '1', code: 'a', name: 'A' },
      { id: '2', code: 'b', name: 'B' },
    ];
    expect(pickInstitution(institutions)?.id).toBe('1');
    expect(pickInstitution([])).toBeNull();
  });
});

describe('branch clock', () => {
  // 2026-11-17 19:05 UTC is 14:05 in Bogotá (UTC-5, no daylight saving).
  const instant = Date.UTC(2026, 10, 17, 19, 5);

  it('shows the Bogotá time whatever the machine time zone is', () => {
    expect(formatBranchTime(instant)).toBe('14:05');
  });

  it('shows the Bogotá date, capitalised', () => {
    expect(formatBranchDate(instant)).toBe('Martes, 17 de noviembre de 2026');
  });

  it('keeps the previous day late in the evening in Bogotá', () => {
    expect(formatBranchDate(Date.UTC(2026, 10, 18, 3, 0))).toMatch(/^Martes, 17 de noviembre/);
  });
});
