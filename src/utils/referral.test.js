import { describe, it, expect } from 'vitest';
import { buildReferralCode, buildReferralUrl } from './referral';

describe('buildReferralCode', () => {
  it('falsy 입력은 CSAFE0', () => {
    expect(buildReferralCode('')).toBe('CSAFE0');
    expect(buildReferralCode(null)).toBe('CSAFE0');
    expect(buildReferralCode(undefined)).toBe('CSAFE0');
  });

  it('영숫자 외 문자를 제거하고 대문자 6자를 만든다', () => {
    expect(buildReferralCode('abcdef123456')).toBe('ABCDEF');
  });

  it('UUID는 하이픈 제거 후 끝 12자 → 앞 6자', () => {
    // strip → ...555555555555, 끝 12자 = 555555555555, 앞 6자 = 555555
    expect(buildReferralCode('11111111-2222-3333-4444-555555555555')).toBe('555555');
  });

  it('항상 6자 이하', () => {
    expect(buildReferralCode('someverylonguseridentifier').length).toBeLessThanOrEqual(6);
  });
});

describe('buildReferralUrl', () => {
  // node 환경(window 없음)에서는 폴백 origin을 사용한다.
  it('?ref=CODE 쿼리와 UTM 파라미터를 붙인다', () => {
    const url = buildReferralUrl('ABC123');
    expect(url).toContain('/?ref=ABC123');
    expect(url).toContain('utm_source=instagram');
    expect(url).toContain('utm_medium=ride_card');
    expect(url).toContain('utm_campaign=user_share');
  });

  it('서버 라우팅 의존 경로(/r/:code)가 아니라 루트 쿼리 방식', () => {
    const url = buildReferralUrl('XYZ');
    expect(url).not.toContain('/r/');
    expect(url.startsWith('http')).toBe(true);
  });
});
