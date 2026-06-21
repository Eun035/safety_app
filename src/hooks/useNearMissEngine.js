import { useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { enqueue as enqueuePendingSync } from '../lib/pendingSyncQueue';

/**
 * useNearMissEngine
 * ─────────────────────────────────────────────────────────────────────────
 * C-SAFE 전략적 데이터 자산: 아차사고(Near-Miss) 이벤트 캡처 & 영속화 엔진
 *
 * 역할:
 *   - 주행 중 급제동 / 고위험 이벤트를 감지해 Supabase에 기록
 *   - GPS 위치, 속도, 날씨, 스트레스존 여부, 헬멧 착용 등 맥락 데이터 수집
 *   - 로컬 폴백: Supabase 불가 시 localStorage에 저장하여 데이터 손실 방지
 *   - 중복 레코딩 방지: 3초 쿨타임 (연속 급제동 중복 방지)
 *
 * 재사용:
 *   - useRideSession 의 updateMetrics 에 연결 (App.jsx에서 호출)
 *   - useGeolocation 의 location 사용
 *   - useSafeData 의 weatherRisk 사용
 *   - STRESS_ZONES 상수 (App.jsx에서 props로 주입)
 *
 * ⚠️ 보호된 파일 변경 없음. App.jsx 최소 변경으로 주입.
 */
export const useNearMissEngine = () => {
    // 3초 쿨타임으로 중복 이벤트 방지
    const lastEventTime = useRef(0);
    const COOLDOWN_MS = 3000;

    /**
     * captureNearMiss
     * 급제동 또는 고위험 이벤트 발생 시 호출
     *
     * @param {object} ctx - 이벤트 발생 시 맥락
     * @param {number}  ctx.lat          - 현재 위도
     * @param {number}  ctx.lng          - 현재 경도
     * @param {number}  ctx.speed        - 현재 속도 (km/h)
     * @param {number}  ctx.deceleration - 감속 강도 (예: 급제동 횟수 증분; 실제 m/s² 가용 시 대체)
     * @param {boolean} ctx.weatherRisk  - 기상 위험 여부 (useSafeData)
     * @param {boolean} ctx.inStressZone - 보행자 스트레스 존 진입 여부
     * @param {boolean} ctx.helmetOn     - 헬멧 착용 여부 (Edge AI 결과)
     * @param {object|null} ctx.activeHazard - 인근 위험 구역 (useHazardWarning)
     * @param {string}  ctx.userId       - 사용자 ID (익명 포함)
     */
    const captureNearMiss = useCallback(async (ctx) => {
        const now = Date.now();

        // 쿨타임 체크: 3초 이내 중복 이벤트 무시
        if (now - lastEventTime.current < COOLDOWN_MS) {
            console.log('[NearMiss] 쿨타임 중 — 이벤트 건너뜀');
            return;
        }
        lastEventTime.current = now;

        const {
            lat, lng, speed = 0, deceleration = 1,
            weatherRisk = false, inStressZone = false,
            helmetOn = false, activeHazard = null,
            userId = null
        } = ctx;

        // 이벤트 페이로드 구성
        const eventPayload = {
            user_id: userId,
            lat: lat ?? null,
            lng: lng ?? null,
            speed_kmh: Math.round(speed),
            deceleration_intensity: deceleration, // 1=보통, 2=강, 3=매우강
            weather_risk: weatherRisk,
            in_stress_zone: inStressZone,
            helmet_on: helmetOn,
            nearby_hazard_id: activeHazard?.id ?? null,
            nearby_hazard_type: activeHazard?.type ?? null,
            occurred_at: new Date().toISOString(),
        };

        console.log('[NearMiss] 이벤트 캡처:', eventPayload);

        // 1. Supabase 저장 시도
        const isGuest = userId?.toString().startsWith('guest_');
        if (userId && !isGuest) {
            try {
                const { error } = await supabase
                    .from('near_miss_events')
                    .insert([eventPayload]);

                if (error) {
                    console.warn('[NearMiss] Supabase 저장 실패 → sync 큐 + 로컬 폴백:', error.message);
                    // P0-3: 정상 사용자 insert 실패는 sync 큐에 적재해 다음 온라인 시 flush
                    enqueuePendingSync('near_miss_events', eventPayload);
                    _saveToLocalStorage(eventPayload);
                } else {
                    console.log('[NearMiss] Supabase 저장 성공');
                }
            } catch (err) {
                console.error('[NearMiss] 저장 중 예외 발생:', err);
                enqueuePendingSync('near_miss_events', eventPayload);
                _saveToLocalStorage(eventPayload);
            }
        } else {
            // 게스트 모드: 로컬 저장만 (큐는 user_id가 게스트면 어차피 flush 스킵)
            _saveToLocalStorage(eventPayload);
        }
    }, []);

    /**
     * getLocalNearMisses
     * localStorage에 저장된 아차사고 이벤트 목록 반환
     * (오프라인 상황이나 게스트 분석에 사용)
     */
    const getLocalNearMisses = useCallback(() => {
        try {
            return JSON.parse(localStorage.getItem('csafe_near_miss_events') || '[]');
        } catch {
            return [];
        }
    }, []);

    return { captureNearMiss, getLocalNearMisses };
};

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * localStorage 폴백 저장 (최대 200건 유지, FIFO)
 */
function _saveToLocalStorage(payload) {
    try {
        const key = 'csafe_near_miss_events';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [payload, ...existing].slice(0, 200); // 최대 200건
        localStorage.setItem(key, JSON.stringify(updated));
        console.log('[NearMiss] 로컬 저장 완료 (총:', updated.length, '건)');
    } catch (err) {
        console.error('[NearMiss] 로컬 저장 실패:', err);
    }
}
