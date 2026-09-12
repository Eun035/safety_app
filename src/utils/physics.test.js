import { describe, it, expect } from 'vitest';
import { calculateStopDistance, SURFACES } from './physics';

describe('calculateStopDistance', () => {
  it('속도 0이면 정지거리 0, 안전', () => {
    const r = calculateStopDistance(0);
    expect(r.totalDist).toBe(0);
    expect(r.riskLevel).toBe('safe');
  });

  it('공주거리 = (km/h ÷ 3.6) × 반응시간 (단위 변환 회귀 방지)', () => {
    // 18km/h = 5m/s, 반응 1초 → 공주거리 5m
    const r = calculateStopDistance(18, 0, 1.0, 'dry');
    expect(r.reactionDist).toBeCloseTo(5, 6);
  });

  it('알 수 없는 노면은 dry(mu 0.7)로 기본값', () => {
    const r = calculateStopDistance(20, 0, 1.0, 'unknown-surface');
    expect(r.mu).toBe(SURFACES.dry.mu);
  });

  it('미끄러운 노면(ice)은 마른 노면보다 제동거리가 길다', () => {
    const dry = calculateStopDistance(25, 0, 1.0, 'dry');
    const ice = calculateStopDistance(25, 0, 1.0, 'ice');
    expect(ice.brakingDist).toBeGreaterThan(dry.brakingDist);
  });

  it('고속에서는 danger 등급', () => {
    const r = calculateStopDistance(45, 0, 1.0, 'dry');
    expect(r.totalDist).toBeGreaterThan(8);
    expect(r.riskLevel).toBe('danger');
  });

  it('분모(μ+sinθ)가 0 이하이면 제동거리 Infinity → danger', () => {
    // 급한 내리막(음의 경사)으로 mu + sinθ ≤ 0 유도
    const r = calculateStopDistance(20, -60, 1.0, 'ice'); // mu 0.12, sin(-60°)≈-0.87
    expect(r.denominator).toBeLessThanOrEqual(0);
    expect(r.brakingDist).toBe(Infinity);
    expect(r.riskLevel).toBe('danger');
  });
});
