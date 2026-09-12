import { describe, it, expect } from 'vitest';
import { co2AvoidedKg, CO2_AVOIDED_KG_PER_KM } from './emissions';

describe('co2AvoidedKg', () => {
  it('계수(0.100 kg/km)를 곱한다', () => {
    expect(CO2_AVOIDED_KG_PER_KM).toBe(0.1);
    expect(co2AvoidedKg(10)).toBeCloseTo(1.0, 10);
    expect(co2AvoidedKg(2.5)).toBeCloseTo(0.25, 10);
  });

  it('0·음수·비유한·비수치 입력은 0으로 처리', () => {
    expect(co2AvoidedKg(0)).toBe(0);
    expect(co2AvoidedKg(-5)).toBe(0);
    expect(co2AvoidedKg(NaN)).toBe(0);
    expect(co2AvoidedKg(Infinity)).toBe(0);
    expect(co2AvoidedKg('abc')).toBe(0);
    expect(co2AvoidedKg(undefined)).toBe(0);
  });

  it('숫자 문자열은 파싱해 계산', () => {
    expect(co2AvoidedKg('10')).toBeCloseTo(1.0, 10);
  });
});
