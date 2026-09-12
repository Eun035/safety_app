import { describe, it, expect } from 'vitest';
import { calculateDistance } from './distance';

describe('calculateDistance (Haversine, meters)', () => {
  it('동일 지점은 0m', () => {
    expect(calculateDistance(36.8, 127.1, 36.8, 127.1)).toBeCloseTo(0, 6);
  });

  it('위도 1도 차이는 약 111km', () => {
    const d = calculateDistance(36.0, 127.0, 37.0, 127.0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('인자 중 하나라도 falsy(0 포함)면 Infinity 가드', () => {
    expect(calculateDistance(0, 127, 36, 127)).toBe(Infinity);
    expect(calculateDistance(36, 127, 37)).toBe(Infinity);
    expect(calculateDistance(undefined, 127, 36, 127)).toBe(Infinity);
  });

  it('대칭성: A→B 와 B→A 거리가 같다', () => {
    const ab = calculateDistance(36.80, 127.10, 36.83, 127.18);
    const ba = calculateDistance(36.83, 127.18, 36.80, 127.10);
    expect(ab).toBeCloseTo(ba, 6);
  });
});
