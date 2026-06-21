import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ShieldCheck, UserCheck, AlertTriangle,
    Loader2, SkipForward, ScanLine, Sparkles
} from 'lucide-react';

/**
 * 하이브리드 헬멧 + 본인 인증 화면 (Demo).
 *
 *  - Vision AI: 헬멧 착용 여부 (시뮬레이션)
 *  - Face Match: 가입 프로필 사진과 셀카 대조 (시뮬레이션, 면허 도용 방지 컨셉)
 *  - 시뮬레이션 한계: 실제 모델 미연동. dummy 통과로 데모 영상·심사용에 한함.
 *    실서비스 전에 face-api.js 또는 외부 API 도입 + 우회 차단 필수.
 *
 *  Props
 *    isOpen     : boolean
 *    onClose    : () => void
 *    onSuccess  : () => void   // 정상 인증 → +50P 보상 + 라이딩 진입
 *    onSkip     : () => void   // 보상 없이 일반 주행 진입
 */

const ACCENT = '#CCFF00';      // 네온 그린 (Nike/Strava 톤)
const BLUE = '#00d4ff';        // 일렉트릭 블루
const MATTE_BG = '#0a0a0a';

const PHASE = {
    IDLE: 'idle',          // 권한 OK + 인증 대기
    SCANNING: 'scanning',  // 듀얼 프로그레스 진행
    SUCCESS: 'success',    // 헬멧 + 본인 모두 통과
    FAILED: 'failed',      // 시뮬 실패 케이스
    DENIED: 'denied'       // 카메라 권한 거부
};

const HelmetDetectionCamera = ({ isOpen, onClose, onSuccess, onSkip }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);

    const [phase, setPhase] = useState(PHASE.IDLE);
    const [helmetProgress, setHelmetProgress] = useState(0);
    const [faceProgress, setFaceProgress] = useState(0);

    // ─── 카메라 권한·스트림 ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        let canceled = false;
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false
                });
                if (canceled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setPhase(PHASE.IDLE);
            } catch (err) {
                console.warn('[HelmetCamera] 권한 거부 또는 카메라 없음:', err?.name);
                setPhase(PHASE.DENIED);
            }
        };
        startCamera();

        return () => {
            canceled = true;
            if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
            stopStream();
        };
    }, [isOpen]);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    // ─── 하이브리드 인증 시뮬 ────────────────────────────────────────────
    const startScan = () => {
        if (phase !== PHASE.IDLE && phase !== PHASE.FAILED) return;
        setPhase(PHASE.SCANNING);
        setHelmetProgress(0);
        setFaceProgress(0);

        const helmetStep = 2.8;   // ≈3.6초에 100%
        const faceStep   = 2.2;   // ≈4.5초 (Face Match가 약간 느림)
        scanIntervalRef.current = setInterval(() => {
            setHelmetProgress(p => Math.min(100, p + helmetStep));
            setFaceProgress(p => Math.min(100, p + faceStep));
        }, 100);
    };

    // 두 프로그레스 100% 도달 시 완료 처리 (시뮬은 항상 성공)
    useEffect(() => {
        if (phase !== PHASE.SCANNING) return;
        if (helmetProgress >= 100 && faceProgress >= 100) {
            clearInterval(scanIntervalRef.current);
            setPhase(PHASE.SUCCESS);
        }
    }, [phase, helmetProgress, faceProgress]);

    // ─── 액션 핸들러 ────────────────────────────────────────────────────
    const handleStart = () => {
        stopStream();
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        onSuccess?.();
        onClose();
    };

    const handleSkip = () => {
        stopStream();
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        if (onSkip) onSkip(); else onSuccess?.();
        onClose();
    };

    const handleRetry = () => {
        setHelmetProgress(0);
        setFaceProgress(0);
        setPhase(PHASE.IDLE);
    };

    const handleClose = () => {
        stopStream();
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[1200] flex items-center justify-center font-pretendard"
            style={{ background: `radial-gradient(circle at 50% 30%, #15171a 0%, ${MATTE_BG} 60%, #000 100%)` }}
        >
            {/* 배경 그리드 패턴 */}
            <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(204,255,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(204,255,0,0.6) 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="relative w-full max-w-md h-full mx-auto flex flex-col">

                {/* ── Top Bar ─────────────────────────────────────── */}
                <div className="relative z-30 flex items-center justify-between px-5 pt-6 pb-3">
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white/10 active:scale-95 transition"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                    <div className="text-center">
                        <div className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 font-mono">com.csafe.pm</div>
                        <div className="text-base font-black tracking-tight text-white">HYBRID VERIFY</div>
                    </div>
                    <div className="w-10 h-10" />
                </div>

                {/* ── 카메라 뷰파인더 (원형) ───────────────────────── */}
                <div className="relative z-10 flex-1 flex items-center justify-center px-6">
                    <div className="relative" style={{ width: 'min(82vw, 360px)', height: 'min(82vw, 360px)' }}>

                        {/* 회전 글로우 링 (스캔 중일 때 활성) */}
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: `conic-gradient(from 0deg, transparent 0deg, ${ACCENT} 60deg, transparent 120deg, ${BLUE} 240deg, transparent 300deg)`,
                                filter: 'blur(10px)',
                                opacity: phase === PHASE.SCANNING ? 0.75 : (phase === PHASE.SUCCESS ? 0.5 : 0.25)
                            }}
                            animate={{ rotate: phase === PHASE.SCANNING ? 360 : 0 }}
                            transition={{ duration: 2.4, repeat: phase === PHASE.SCANNING ? Infinity : 0, ease: 'linear' }}
                        />

                        {/* 정적 네온 외곽 링 */}
                        <div
                            className="absolute inset-[6px] rounded-full"
                            style={{
                                border: `2px solid ${phase === PHASE.SUCCESS ? ACCENT : phase === PHASE.FAILED ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                                boxShadow: phase === PHASE.SUCCESS ? `0 0 30px ${ACCENT}` : 'none',
                                transition: 'all 400ms ease'
                            }}
                        />

                        {/* 카메라 비디오 (원형 마스크) */}
                        <div className="absolute inset-[12px] rounded-full overflow-hidden bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            {/* 권한 거부 화면 */}
                            {phase === PHASE.DENIED && (
                                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center px-6 text-center">
                                    <AlertTriangle size={36} className="text-red-400 mb-3" />
                                    <p className="text-sm font-black text-white mb-1">카메라 권한 거부됨</p>
                                    <p className="text-[11px] text-white/60 leading-relaxed">기기 설정에서 권한을 허용하거나<br/>일반 주행으로 진입하세요.</p>
                                </div>
                            )}
                            {/* 스캔 라인 */}
                            <AnimatePresence>
                                {phase === PHASE.SCANNING && (
                                    <motion.div
                                        className="absolute left-0 right-0 h-[3px] pointer-events-none"
                                        style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`, boxShadow: `0 0 16px ${ACCENT}` }}
                                        initial={{ top: '0%' }}
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                )}
                            </AnimatePresence>
                            {/* 가이드 텍스트 */}
                            {phase === PHASE.IDLE && (
                                <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
                                    <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-black tracking-wider uppercase text-white/80 font-mono">
                                        <ScanLine size={11} className="inline mr-1.5 -mt-0.5" />
                                        헬멧 + 얼굴을 중앙에
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 상단 코너 마커 */}
                        {[
                            { top: '-6px', left: '-6px', borderTop: 1, borderLeft: 1 },
                            { top: '-6px', right: '-6px', borderTop: 1, borderRight: 1 },
                            { bottom: '-6px', left: '-6px', borderBottom: 1, borderLeft: 1 },
                            { bottom: '-6px', right: '-6px', borderBottom: 1, borderRight: 1 }
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="absolute w-5 h-5"
                                style={{
                                    ...s,
                                    borderColor: ACCENT,
                                    borderTopWidth:    s.borderTop    ? '2px' : 0,
                                    borderRightWidth:  s.borderRight  ? '2px' : 0,
                                    borderBottomWidth: s.borderBottom ? '2px' : 0,
                                    borderLeftWidth:   s.borderLeft   ? '2px' : 0
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── 하단 패널 ─────────────────────────────────── */}
                <div className="relative z-20 px-6 pb-8 pt-2">

                    {/* 듀얼 인증 프로그레스 */}
                    {(phase === PHASE.IDLE || phase === PHASE.SCANNING || phase === PHASE.SUCCESS) && (
                        <div className="space-y-3 mb-5">
                            <DualTrack
                                icon={<ShieldCheck size={16} />}
                                label="Vision AI · 헬멧 감지"
                                progress={helmetProgress}
                                done={helmetProgress >= 100}
                                color={ACCENT}
                            />
                            <DualTrack
                                icon={<UserCheck size={16} />}
                                label="Face Match · 본인 확인"
                                progress={faceProgress}
                                done={faceProgress >= 100}
                                color={BLUE}
                                hint="면허 도용 방지"
                            />
                        </div>
                    )}

                    {/* 상태별 액션 */}
                    {phase === PHASE.IDLE && (
                        <button
                            onClick={startScan}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                            style={{ background: ACCENT, color: '#0a0a0a', boxShadow: `0 0 30px ${ACCENT}55` }}
                        >
                            <Sparkles size={16} /> 인증 시작
                        </button>
                    )}

                    {phase === PHASE.SCANNING && (
                        <button
                            disabled
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-white/5 border border-white/10 text-white/50 flex items-center justify-center gap-2"
                        >
                            <Loader2 size={16} className="animate-spin" /> 인증 진행 중...
                        </button>
                    )}

                    {phase === PHASE.SUCCESS && (
                        <SuccessPanel onStart={handleStart} accent={ACCENT} />
                    )}

                    {phase === PHASE.FAILED && (
                        <FailedPanel onRetry={handleRetry} onSkip={handleSkip} />
                    )}

                    {phase === PHASE.DENIED && (
                        <button
                            onClick={handleSkip}
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition flex items-center justify-center gap-2"
                        >
                            <SkipForward size={14} /> 크레딧 적립 없이 일반 주행
                        </button>
                    )}

                    {/* 보조 SKIP 라인 (IDLE·SCANNING 외엔 노출 안 함) */}
                    {(phase === PHASE.IDLE || phase === PHASE.SCANNING) && (
                        <button
                            onClick={handleSkip}
                            className="w-full mt-2.5 py-2.5 text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 font-bold flex items-center justify-center gap-1.5 font-mono transition"
                        >
                            <SkipForward size={12} /> 헬멧 없이 일반 주행
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── 듀얼 트랙 컴포넌트 ──────────────────────────────────────────────────
const DualTrack = ({ icon, label, progress, done, color, hint }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-white">
                <span style={{ color: done ? color : '#fff' }}>{icon}</span>
                <span className="text-[11px] font-black tracking-wide">{label}</span>
                {hint && (
                    <span className="text-[8px] font-bold text-white/40 tracking-widest uppercase font-mono">· {hint}</span>
                )}
            </div>
            <span className="text-[10px] font-black tracking-wider font-mono" style={{ color: done ? color : 'rgba(255,255,255,0.5)' }}>
                {done ? '✓ DONE' : `${Math.round(progress)}%`}
            </span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
                className="h-full rounded-full"
                style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            />
        </div>
    </div>
);

// ─── 성공 패널 ──────────────────────────────────────────────────────────
const SuccessPanel = ({ onStart, accent }) => (
    <div>
        <div
            className="rounded-2xl p-4 mb-3 flex items-center gap-3"
            style={{ background: `${accent}15`, border: `1.5px solid ${accent}55`, boxShadow: `inset 0 0 24px ${accent}10` }}
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}25` }}>
                <Sparkles size={20} style={{ color: accent }} />
            </div>
            <div className="flex-1">
                <div className="text-[11px] font-black tracking-wider uppercase font-mono" style={{ color: accent }}>본인 확인 완료</div>
                <div className="text-xs font-bold text-white mt-0.5">안전 크레딧 <span style={{ color: accent }}>+50P</span> 적립 ⚡</div>
            </div>
        </div>
        <button
            onClick={onStart}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: accent, color: '#0a0a0a', boxShadow: `0 0 32px ${accent}66` }}
        >
            🚀 주행 시작
        </button>
    </div>
);

// ─── 실패 패널 ──────────────────────────────────────────────────────────
const FailedPanel = ({ onRetry, onSkip }) => (
    <div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-3 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-red-200 font-bold leading-relaxed">
                헬멧 미착용 또는 본인 확인 실패. 다시 인증하거나 크레딧 없이 일반 주행할 수 있습니다.
            </div>
        </div>
        <div className="flex gap-2">
            <button
                onClick={onSkip}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 active:scale-95 transition"
            >
                <SkipForward size={12} className="inline mr-1.5 -mt-0.5" />
                일반 주행
            </button>
            <button
                onClick={onRetry}
                className="flex-[1.4] py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition"
                style={{ background: ACCENT, color: '#0a0a0a', boxShadow: `0 0 24px ${ACCENT}55` }}
            >
                다시 인증
            </button>
        </div>
    </div>
);

export default HelmetDetectionCamera;
