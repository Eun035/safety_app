import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * @typedef {'SMOOTH' | 'WOBBLY' | 'CRITICAL'} BehaviorStatus
 *
 * useRiderBehavior — PWA DeviceMotion 기반 라이더 행동 분류 훅
 *
 * 목적:
 *   정적 면허 검증의 한계를 보완하기 위해 "도로 위 실제 행동 패턴"으로
 *   숙련도·도용 의심을 분류한다. 무면허 청소년·다인 탑승은 조작 미숙으로
 *   좌우 요잉(yaw)·롤링(roll) 변동성이 정상 숙련자 대비 크게 흔들린다.
 *
 * 동작:
 *   1) DeviceMotionEvent로 가속도·자이로를 60Hz 내외로 수신
 *   2) 슬라이딩 윈도우(1.5초)에서 표준편차·peak 추출
 *   3) 임계값 기반 SMOOTH / WOBBLY / CRITICAL 분류 (200ms마다 평가)
 *   4) 노이즈 차단을 위해 상태 전이는 디바운싱 (악화는 빠르게, 완화는 느리게)
 *
 * 권한:
 *   - iOS 13+: DeviceMotionEvent.requestPermission() 명시 사용자 제스처 필요
 *   - Android/Chrome: HTTPS에서만 자동 수신 (Vercel 배포 OK)
 *
 * 사용 예 (App.jsx):
 *   const rider = useRiderBehavior();
 *   // 라이딩 시작 시 (사용자 제스처 콜백 안에서)
 *   await rider.requestPermission();
 *   rider.start();
 *   // useEffect로 rider.status 관찰 → speak/vibrate 트리거
 *   // 종료 시
 *   rider.stop();
 */

// ─── 임계값 (PM 도메인 도메인 보수치, 베타 데이터로 보정 필요) ───────────
const THRESHOLD = {
    // 자이로 회전율 (deg/s) — 표준편차 기반
    rollStd:  { wobbly: 8,  critical: 25 },   // 좌우 흔들림 (gamma)
    yawStd:   { wobbly: 12, critical: 35 },   // 급조향 (alpha)
    // 가속도 변동 (m/s²) — 중력 제거 후 표준편차
    accStd:   { wobbly: 1.6, critical: 5.5 }, // 급제동·급가속·노면 충격
    // peak 단발 이벤트 (deg/s) — 1회만이라도 초과 시 CRITICAL 가점
    rollPeak: 60,
    yawPeak:  80
};

const WINDOW_MS = 1500;
const EVAL_INTERVAL_MS = 200;
const DEBOUNCE_ESCALATE_MS = 600;   // 악화는 빠르게 (≈3회 평가)
const DEBOUNCE_RECOVER_MS  = 2500;  // 완화는 느리게 (오탐 방지)

const STATUS_RANK = { SMOOTH: 0, WOBBLY: 1, CRITICAL: 2 };

export const useRiderBehavior = () => {
    const [status, setStatus] = useState(/** @type {BehaviorStatus} */ ('SMOOTH'));
    const [isRunning, setIsRunning] = useState(false);
    const [isGranted, setIsGranted] = useState(false);
    const [lastMetrics, setLastMetrics] = useState({ rollStd: 0, yawStd: 0, accStd: 0 });

    const samplesRef = useRef([]);           // { t, ax, ay, az, alpha, beta, gamma }
    const evalTimerRef = useRef(null);
    const pendingStatusRef = useRef('SMOOTH');
    const pendingSinceRef = useRef(0);
    const handlerRef = useRef(null);

    const isSupported = typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined';

    // ─── 권한 요청 (iOS 13+ requestPermission 패턴) ──────────────────
    const requestPermission = useCallback(async () => {
        if (!isSupported) return false;
        try {
            // iOS는 함수가 정의되어 있음, Android는 undefined
            if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
                const result = await window.DeviceMotionEvent.requestPermission();
                const granted = result === 'granted';
                setIsGranted(granted);
                return granted;
            }
            // Android/Chrome — 별도 권한 요청 없이 사용 가능
            setIsGranted(true);
            return true;
        } catch (e) {
            console.warn('[useRiderBehavior] permission request failed:', e?.message || e);
            setIsGranted(false);
            return false;
        }
    }, [isSupported]);

    // ─── 윈도우 평가 ────────────────────────────────────────────────
    const evaluateWindow = useCallback(() => {
        const now = performance.now();
        const samples = samplesRef.current.filter(s => now - s.t <= WINDOW_MS);
        samplesRef.current = samples;
        if (samples.length < 5) return; // 표본 부족 → 평가 보류

        // 표준편차 함수
        const std = (arr) => {
            const m = arr.reduce((a, b) => a + b, 0) / arr.length;
            const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
            return Math.sqrt(v);
        };

        const rollStd = std(samples.map(s => s.gamma));            // 좌우 (deg/s)
        const yawStd  = std(samples.map(s => s.alpha));            // 방향 (deg/s)
        // 가속도 크기에서 중력 평균을 빼고 표준편차
        const accMag  = samples.map(s => Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az));
        const accStd  = std(accMag);

        const rollPeak = Math.max(...samples.map(s => Math.abs(s.gamma)));
        const yawPeak  = Math.max(...samples.map(s => Math.abs(s.alpha)));

        setLastMetrics({
            rollStd: +rollStd.toFixed(2),
            yawStd:  +yawStd.toFixed(2),
            accStd:  +accStd.toFixed(2)
        });

        // ─── 임계값 → 상태 결정 ───
        let next = 'SMOOTH';
        const criticalHit =
            rollStd >= THRESHOLD.rollStd.critical ||
            yawStd  >= THRESHOLD.yawStd.critical  ||
            accStd  >= THRESHOLD.accStd.critical  ||
            rollPeak >= THRESHOLD.rollPeak ||
            yawPeak  >= THRESHOLD.yawPeak;
        const wobblyHit =
            rollStd >= THRESHOLD.rollStd.wobbly ||
            yawStd  >= THRESHOLD.yawStd.wobbly  ||
            accStd  >= THRESHOLD.accStd.wobbly;

        if (criticalHit) next = 'CRITICAL';
        else if (wobblyHit) next = 'WOBBLY';

        // ─── 디바운싱 ───
        if (next !== pendingStatusRef.current) {
            pendingStatusRef.current = next;
            pendingSinceRef.current = now;
            return;
        }
        const elapsed = now - pendingSinceRef.current;
        const currentRank = STATUS_RANK[status];
        const nextRank = STATUS_RANK[next];
        const isEscalating = nextRank > currentRank;
        const debounce = isEscalating ? DEBOUNCE_ESCALATE_MS : DEBOUNCE_RECOVER_MS;

        if (elapsed >= debounce && next !== status) {
            setStatus(next);
        }
    }, [status]);

    // ─── DeviceMotion 핸들러 ────────────────────────────────────────
    const onMotion = useCallback((event) => {
        const ag = event.accelerationIncludingGravity;
        const rr = event.rotationRate;
        if (!ag || !rr) return;
        samplesRef.current.push({
            t: performance.now(),
            ax: ag.x ?? 0,
            ay: ag.y ?? 0,
            az: ag.z ?? 0,
            alpha: rr.alpha ?? 0,
            beta:  rr.beta  ?? 0,
            gamma: rr.gamma ?? 0
        });
        // 윈도우 길이 제한 (메모리 가드)
        if (samplesRef.current.length > 300) {
            samplesRef.current = samplesRef.current.slice(-200);
        }
    }, []);

    // ─── 시작 / 정지 ───────────────────────────────────────────────
    const start = useCallback(() => {
        if (!isSupported) {
            console.warn('[useRiderBehavior] DeviceMotionEvent not supported');
            return false;
        }
        if (isRunning) return true;

        handlerRef.current = onMotion;
        window.addEventListener('devicemotion', handlerRef.current);
        evalTimerRef.current = setInterval(evaluateWindow, EVAL_INTERVAL_MS);
        setIsRunning(true);
        return true;
    }, [isSupported, isRunning, onMotion, evaluateWindow]);

    const stop = useCallback(() => {
        if (handlerRef.current) {
            window.removeEventListener('devicemotion', handlerRef.current);
            handlerRef.current = null;
        }
        if (evalTimerRef.current) {
            clearInterval(evalTimerRef.current);
            evalTimerRef.current = null;
        }
        samplesRef.current = [];
        pendingStatusRef.current = 'SMOOTH';
        pendingSinceRef.current = 0;
        setStatus('SMOOTH');
        setIsRunning(false);
    }, []);

    // 언마운트 시 자동 정리
    useEffect(() => {
        return () => {
            if (handlerRef.current) window.removeEventListener('devicemotion', handlerRef.current);
            if (evalTimerRef.current) clearInterval(evalTimerRef.current);
        };
    }, []);

    return {
        status,           // 'SMOOTH' | 'WOBBLY' | 'CRITICAL'
        lastMetrics,      // { rollStd, yawStd, accStd } — 디버그·튜닝용
        isSupported,
        isGranted,
        isRunning,
        requestPermission,
        start,
        stop
    };
};
