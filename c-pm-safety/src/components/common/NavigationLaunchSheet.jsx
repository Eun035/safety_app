import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, AlertTriangle, Smartphone, Volume2, CheckCircle2, Navigation } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// ─── 딥링크 런처 ──────────────────────────────────────────────────────────────
/**
 * 카카오맵 / 네이버지도 앱 딥링크 시도 후 웹 폴백
 * - 앱이 설치돼 있으면 앱으로, 없으면 웹으로 연결
 */
function launchNavApp(app, origin, destination) {
    if (!destination?.lat) return;

    const destLat = destination.lat;
    const destLng = destination.lng;
    const destName = encodeURIComponent(destination.name || '목적지');
    const orgLat = origin?.lat;
    const orgLng = origin?.lng;
    const orgName = encodeURIComponent(origin?.name || '현재 위치');

    if (app === 'kakao') {
        // 앱 딥링크 (설치 시)
        const appUrl = orgLat
            ? `kakaomap://route?sp=${orgLat},${orgLng}&ep=${destLat},${destLng}&by=FOOT`
            : `kakaomap://look?p=${destLat},${destLng}`;
        // 웹 폴백 (1.5초 후 앱 미설치 판단)
        const webUrl = `https://map.kakao.com/link/to/${destName},${destLat},${destLng}`;
        window.location.href = appUrl;
        setTimeout(() => window.open(webUrl, '_blank'), 1500);

    } else if (app === 'naver') {
        const appUrl = orgLat
            ? `nmap://route/bicycle?slat=${orgLat}&slng=${orgLng}&sname=${orgName}&dlat=${destLat}&dlng=${destLng}&dname=${destName}&appname=csafe`
            : `nmap://place?lat=${destLat}&lng=${destLng}&name=${destName}&appname=csafe`;
        const webUrl = orgLat
            ? `https://map.naver.com/v5/directions/${orgLng},${orgLat},,${orgName}/${destLng},${destLat},,${destName}/-/bicycle?c=14,0,0,0,dh`
            : `https://map.naver.com/v5/search/${destName}`;
        window.location.href = appUrl;
        setTimeout(() => window.open(webUrl, '_blank'), 1500);
    }
}

// ─── 단계 정의 ────────────────────────────────────────────────────────────────
// STEP: 'consent' → 'app_select' → 'safety' → (launch)

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

const NavigationLaunchSheet = ({
    isOpen,
    onClose,
    routeOrigin,
    routeDestination,
    onLaunch, // 실제 앱 열기 직전 App.jsx에서 TTS 실행용 콜백
}) => {
    const [step, setStep] = useState('consent'); // 'consent' | 'app_select' | 'safety'

    // 앱 선택 localStorage 영속화
    const [savedApp, setSavedApp] = useLocalStorage('csafe_nav_app', null);
    const [selectedApp, setSelectedApp] = useState(savedApp || null);

    // 동의 여부 localStorage 영속화 (재방문 시 consent 스킵)
    const [navConsent, setNavConsent] = useLocalStorage('csafe_nav_consent', false);

    // 시트가 열릴 때 단계 초기화 (앱 선택 기억 + 동의 기억)
    React.useEffect(() => {
        if (isOpen) {
            if (navConsent && savedApp) {
                // 이미 동의 + 앱 선택 완료 → 안전 안내만 표시
                setSelectedApp(savedApp);
                setStep('safety');
            } else if (navConsent) {
                // 동의는 했지만 앱 미선택
                setStep('app_select');
            } else {
                setStep('consent');
            }
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLaunch = () => {
        if (onLaunch) onLaunch(); // TTS: "주행 중 화면 주시를 삼가고 음성 안내에 집중해 주세요"
        launchNavApp(selectedApp, routeOrigin, routeDestination);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="nav-launch-root"
                    className="fixed inset-0 z-[2700] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4"
                >
                    {/* 배경 */}
                    <motion.div
                        key="nav-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/75 backdrop-blur-md pointer-events-auto"
                    />

                    {/* 시트 */}
                    <motion.div
                        key="nav-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="pointer-events-auto relative w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] border-t border-cyber-cyan/30 overflow-hidden"
                    >
                        {/* 드래그 핸들 */}
                        <div onClick={onClose} className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                        </div>

                        {/* 닫기 */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors z-10"
                        >
                            <X size={18} />
                        </button>

                        <AnimatePresence mode="wait">

                            {/* ════════════════════════════════
                                STEP 1: 동의 확인
                            ════════════════════════════════ */}
                            {step === 'consent' && (
                                <motion.div
                                    key="step-consent"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="px-6 pb-8 pt-2"
                                >
                                    {/* 아이콘 */}
                                    <div className="flex justify-center mb-5">
                                        <div className="w-16 h-16 bg-cyber-cyan/10 rounded-2xl border border-cyber-cyan/30 flex items-center justify-center shadow-[0_0_20px_rgba(64,255,220,0.15)]">
                                            <Navigation size={32} className="text-cyber-cyan" />
                                        </div>
                                    </div>

                                    <h2 className="text-[20px] font-black text-white text-center tracking-tighter mb-1">
                                        외부 내비게이션 연동
                                    </h2>
                                    <p className="text-[10px] text-gray-400 text-center mb-6 leading-relaxed px-4">
                                        목적지 정보를 카카오맵 또는 네이버지도 앱으로
                                        전달하여 상세 길 안내를 이용할 수 있습니다.
                                        <br />
                                        <span className="text-gray-500">
                                            (위치 정보는 선택한 앱의 개인정보 처리방침에 따라 처리됩니다)
                                        </span>
                                    </p>

                                    {/* 목적지 미리보기 */}
                                    {routeDestination && (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30 shrink-0">
                                                <span className="text-sm">📍</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">목적지</p>
                                                <p className="text-[12px] font-black text-white truncate">
                                                    {routeDestination.name || `${routeDestination.lat?.toFixed(5)}, ${routeDestination.lng?.toFixed(5)}`}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 버튼 */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold text-[11px] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                                        >
                                            사용 안 함
                                        </button>
                                        <button
                                            onClick={() => {
                                                setNavConsent(true);
                                                setStep('app_select');
                                            }}
                                            className="flex-[2] py-4 rounded-2xl bg-cyber-cyan text-black font-black text-[11px] uppercase tracking-wider shadow-neon-cyan hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            동의하고 계속 <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ════════════════════════════════
                                STEP 2: 앱 선택
                            ════════════════════════════════ */}
                            {step === 'app_select' && (
                                <motion.div
                                    key="step-app"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="px-6 pb-8 pt-2"
                                >
                                    <h2 className="text-[18px] font-black text-white text-center tracking-tighter mb-1">
                                        내비게이션 앱 선택
                                    </h2>
                                    <p className="text-[10px] text-gray-500 text-center mb-6">
                                        선호하는 앱을 선택하세요. 다음부터 자동으로 기억됩니다.
                                    </p>

                                    {/* 앱 선택 카드 */}
                                    <div className="space-y-3 mb-6">
                                        {/* 카카오맵 */}
                                        <button
                                            onClick={() => setSelectedApp('kakao')}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                                                selectedApp === 'kakao'
                                                    ? 'bg-yellow-400/15 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                                            }`}
                                        >
                                            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                                <span className="text-xl font-black text-black">K</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-white">카카오맵</p>
                                                <p className="text-[9px] text-gray-400">자전거·도보 경로 지원</p>
                                            </div>
                                            {selectedApp === 'kakao' && (
                                                <CheckCircle2 size={20} className="text-yellow-400 ml-auto" />
                                            )}
                                        </button>

                                        {/* 네이버지도 */}
                                        <button
                                            onClick={() => setSelectedApp('naver')}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                                                selectedApp === 'naver'
                                                    ? 'bg-green-500/15 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                                            }`}
                                        >
                                            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                                <span className="text-xl font-black text-white">N</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-white">네이버지도</p>
                                                <p className="text-[9px] text-gray-400">자전거·PM 경로 지원</p>
                                            </div>
                                            {selectedApp === 'naver' && (
                                                <CheckCircle2 size={20} className="text-green-400 ml-auto" />
                                            )}
                                        </button>
                                    </div>

                                    {/* 앱 변경 안내 */}
                                    <p className="text-[8px] text-gray-600 text-center mb-5">
                                        나중에 설정에서 변경할 수 있습니다
                                    </p>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStep('consent')}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold text-[11px] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                                        >
                                            이전
                                        </button>
                                        <button
                                            disabled={!selectedApp}
                                            onClick={() => {
                                                setSavedApp(selectedApp);
                                                setStep('safety');
                                            }}
                                            className="flex-[2] py-4 rounded-2xl bg-cyber-cyan text-black font-black text-[11px] uppercase tracking-wider shadow-neon-cyan hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            다음 <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ════════════════════════════════
                                STEP 3: 안전 안내 (중요!)
                            ════════════════════════════════ */}
                            {step === 'safety' && (
                                <motion.div
                                    key="step-safety"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="px-6 pb-8 pt-2"
                                >
                                    {/* 경고 헤더 */}
                                    <div className="flex justify-center mb-4">
                                        <motion.div
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-16 h-16 bg-amber-500/20 rounded-full border-2 border-amber-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                                        >
                                            <AlertTriangle size={28} className="text-amber-400" />
                                        </motion.div>
                                    </div>

                                    <h2 className="text-[18px] font-black text-white text-center tracking-tighter mb-1">
                                        주행 전 안전 확인
                                    </h2>
                                    <p className="text-[10px] text-amber-400/80 text-center font-bold mb-5">
                                        반드시 읽어주세요
                                    </p>

                                    {/* 안전 규칙 목록 */}
                                    <div className="space-y-2.5 mb-6">
                                        {[
                                            {
                                                icon: <Smartphone size={18} className="text-red-400" />,
                                                bg: 'bg-red-500/10 border-red-500/30',
                                                title: '주행 중 휴대폰 화면 주시 금지',
                                                desc: '주행 중 스마트폰을 보는 행위는 법적으로 금지되어 있으며\n중대한 사고로 이어질 수 있습니다.',
                                                badge: '⚠️ 법적 의무',
                                                badgeColor: 'text-red-400 bg-red-400/10 border-red-400/30',
                                            },
                                            {
                                                icon: <Volume2 size={18} className="text-cyber-cyan" />,
                                                bg: 'bg-cyber-cyan/10 border-cyber-cyan/30',
                                                title: '음성 안내를 우선 사용하세요',
                                                desc: '앱 실행 후 스마트폰을 주머니에 넣고\n음성 안내만으로 경로를 따라가세요.',
                                                badge: '✓ 권장 방식',
                                                badgeColor: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/30',
                                            },
                                            {
                                                icon: <CheckCircle2 size={18} className="text-green-400" />,
                                                bg: 'bg-green-500/10 border-green-500/30',
                                                title: '정차 후 화면 확인',
                                                desc: '경로 확인이 필요할 경우 반드시 안전한 장소에\n정차한 후에 화면을 확인하세요.',
                                                badge: '✓ 안전 수칙',
                                                badgeColor: 'text-green-400 bg-green-400/10 border-green-400/30',
                                            },
                                        ].map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 + i * 0.08 }}
                                                className={`flex gap-3 p-3 rounded-2xl border ${item.bg}`}
                                            >
                                                <div className="shrink-0 mt-0.5">{item.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                        <p className="text-[11px] font-black text-white">{item.title}</p>
                                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                            {item.badge}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 leading-relaxed whitespace-pre-line">{item.desc}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* 선택된 앱 변경 링크 */}
                                    <button
                                        onClick={() => setStep('app_select')}
                                        className="w-full text-center text-[9px] text-gray-600 hover:text-gray-400 transition-colors mb-4"
                                    >
                                        {selectedApp === 'kakao' ? '카카오맵' : '네이버지도'}으로 열기
                                        <span className="text-cyber-cyan ml-1">· 앱 변경</span>
                                    </button>

                                    {/* 출발 버튼 */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={handleLaunch}
                                        className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                        style={{
                                            background: 'linear-gradient(135deg, #40ffdc, #3b82f6)',
                                            color: '#000',
                                            boxShadow: '0 0 20px rgba(64,255,220,0.4)',
                                        }}
                                    >
                                        <Navigation size={16} />
                                        {selectedApp === 'kakao' ? '카카오맵' : '네이버지도'}으로 출발
                                    </motion.button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NavigationLaunchSheet;
