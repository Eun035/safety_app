import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Clock, Share2, Shield,
  ChevronRight, X, Search, Loader2, CheckCircle2,
  Send, MessageCircle, Instagram, Copy, ArrowRight, Mic
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { toast } from '../../hooks/useToast';
import { calculateDistance } from '../../utils/distance';

// ─── 인기 목적지 (빠른 선택) ─────────────────────────────────────────────
// name = 한국어 기본값(외부 라우팅 폴백용), nameKey = i18n 키(화면 표시용)
const QUICK_DESTINATIONS = [
  { id: 'q1', name: '단국대학교 정문', nameKey: 'rss_qd_dankook', emoji: '🎓', etaMin: 4, lat: 36.8331, lng: 127.1791 },
  { id: 'q2', name: '천안터미널', nameKey: 'rss_qd_terminal', emoji: '🚌', etaMin: 11, lat: 36.8152, lng: 127.1518 },
  { id: 'q3', name: '신부동 먹자골목', nameKey: 'rss_qd_sinbu', emoji: '🍜', etaMin: 7, lat: 36.8093, lng: 127.1534 },
  { id: 'q4', name: '천안역', nameKey: 'rss_qd_station', emoji: '🚂', etaMin: 14, lat: 36.8097, lng: 127.1492 },
];

// ─── 목적지 검색 결과 모킹 (Kakao API 연동 전 placeholder) ───────────────
function mockSearch(query) {
  const allPlaces = [
    { id: 's1', name: '단국대학교 도서관', address: '충남 천안시 동남구 단대로 119', etaMin: 5, lat: 36.8335, lng: 127.1803 },
    { id: 's2', name: '천안 신부공원', address: '충남 천안시 동남구 신부동', etaMin: 8, lat: 36.8101, lng: 127.1578 },
    { id: 's3', name: '이마트 천안점', address: '충남 천안시 동남구 만남로 43', etaMin: 12, lat: 36.8043, lng: 127.1521 },
    { id: 's4', name: '천안중앙시장', address: '충남 천안시 동남구 충절로 37', etaMin: 9, lat: 36.8138, lng: 127.1499 },
    { id: 's5', name: '갈마광장', address: '충남 천안시 서북구 갈마로', etaMin: 16, lat: 36.8312, lng: 127.1423 },
    { id: 's6', name: '순천향대학교병원', address: '충남 천안시 동남구 순천향6길 31', etaMin: 10, lat: 36.7988, lng: 127.0998 },
  ];
  const q = query.toLowerCase();
  return allPlaces.filter(p =>
    p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  );
}

// ─── ETA 포맷 ─────────────────────────────────────────────────────────────
function formatETA(etaMin) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + etaMin);
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─── 소셜 공유 메시지 생성 (i18n 템플릿 사용) ─────────────────────────────
function buildShareMessage(t, destinationName, etaMin) {
  const arrivalTime = formatETA(etaMin);
  return t('share_message_template', {
    eta: etaMin,
    time: arrivalTime,
    dest: destinationName,
    url: window.location.href,
  });
}

// ─── 공유 플랫폼 팝업 ────────────────────────────────────────────────────
const SharePopup = ({ message, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(message).catch(() => {
      const el = document.createElement('textarea');
      el.value = message;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  const handleKakao = useCallback(() => {
    // 카카오링크 SDK가 없을 경우 클립보드 복사 + 알림
    handleCopy();
    alert(t('share_kakao_alert'));
  }, [handleCopy, t]);

  const handleInstagram = useCallback(() => {
    handleCopy();
    alert(t('share_instagram_alert'));
  }, [handleCopy, t]);

  const handleNativeShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: t('share_native_title'), text: message }).catch(() => {});
    } else {
      handleCopy();
    }
  }, [message, handleCopy, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3100] flex items-end justify-center px-0 sm:px-4"
      onClick={onClose}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* 시트 */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#111318] rounded-t-[2rem] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] border-t border-[#2563eb]/40 overflow-hidden"
      >
        {/* 핸들 */}
        <div className="w-full pt-4 pb-2 flex justify-center">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[17px] font-black text-white tracking-tight">{t('share_notify_friend')}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{t('share_notify_sub')}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* 메시지 미리보기 */}
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-4 mb-5">
            <p className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-wider">{t('share_msg_to_send')}</p>
            <p className="text-[12px] text-gray-200 leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          {/* 플랫폼 버튼들 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* 카카오톡 */}
            <button
              onClick={handleKakao}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#FEE500]/10 border border-[#FEE500]/30 hover:bg-[#FEE500]/20 transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-[#FEE500] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-[18px] font-black text-black leading-none">K</span>
              </div>
              <span className="text-[10px] font-bold text-[#FEE500]">{t('share_kakao')}</span>
            </button>

            {/* Instagram DM */}
            <button
              onClick={handleInstagram}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#E1306C]/10 border border-[#E1306C]/30 hover:bg-[#E1306C]/20 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] to-[#cc2366] to-[#bc1888] flex items-center justify-center shadow-lg">
                <Instagram size={20} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-[#E1306C]">Instagram</span>
            </button>

            {/* 더보기 (네이티브 공유) */}
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-lg">
                <Send size={20} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-gray-400">{t('share_more')}</span>
            </button>
          </div>

          {/* 복사 버튼 */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-[12px] font-bold text-green-400">{t('share_copied')}</span>
              </>
            ) : (
              <>
                <Copy size={16} className="text-gray-400" />
                <span className="text-[12px] font-bold text-gray-400">{t('share_copy_text')}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  RideStartScreen — 주행 시작 & 목적지 설정 화면 (Step 1)
// ═══════════════════════════════════════════════════════════════════════════
const RideStartScreen = ({
  isOpen,
  onClose,
  userLat,
  userLng,
  onProceedToHelmet, // Step 2: 헬멧 인증으로 이동
  routeDestination,
  setRouteDestination,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDest, setSelectedDest] = useState(routeDestination || null);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [etaPulse, setEtaPulse] = useState(false);
  // 음성 인식 후보(확률순). best는 query에 들어가고, 나머지는 병렬 검색용.
  const [voiceAlternatives, setVoiceAlternatives] = useState([]);

  // 목적지 표시명: 정적 빠른목적지는 i18n 키로 번역, 동적(Kakao) 결과는 원문(한국어) 유지
  const destName = useCallback((d) => (d?.nameKey ? t(d.nameKey) : (d?.name || '')), [t]);

  // 음성 검색 — best는 input에 표시, 나머지 후보는 voiceAlternatives에 저장하여 같이 검색
  const { start: startVoice, isListening: isVoiceListening, isSupported: voiceSupported } = useSpeechRecognition({
    onResult: (text, alternatives) => {
      setSelectedDest(null);
      setQuery(text);
      // best 제외한 alternatives만 별도 저장
      setVoiceAlternatives(Array.isArray(alternatives) ? alternatives.slice(1) : []);
    },
    onError: (errCode) => {
      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        toast(t('rss_toast_mic_blocked'), 'error');
      } else if (errCode === 'no-device') {
        toast(t('rss_toast_mic_nodevice'), 'error');
      } else if (errCode === 'no-speech') {
        toast(t('rss_toast_mic_nospeech'), 'info');
      } else if (errCode === 'unsupported') {
        toast(t('rss_toast_mic_unsupported'), 'error');
      } else if (errCode === 'insecure-context') {
        toast(t('rss_toast_mic_insecure'), 'error');
      }
    }
  });
  const inputRef = useRef(null);
  const searchTimer = useRef(null);

  // 외부에서 routeDestination 변경 시 동기화
  useEffect(() => {
    if (routeDestination) setSelectedDest(routeDestination);
  }, [routeDestination]);

  // 열릴 때 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      setQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // ⌨️ 모바일 키보드가 하단 "빠른 목적지"를 가리는 문제 대응.
  // VisualViewport로 키보드가 차지한 높이(kbInset)를 측정 → 시트를 키보드 위로 올리고
  // 내부 스크롤로 모든 항목이 노출되도록 한다.
  const [kbInset, setKbInset] = useState(0);
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      // 레이아웃 뷰포트 - 비주얼 뷰포트 하단 = 키보드(및 하단 UI)가 덮은 높이
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // 80px 이하 변화는 키보드가 아닌 주소창 등으로 간주하여 무시
      setKbInset(inset > 80 ? Math.round(inset) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isOpen]);

  // 출발지~좌표 거리로 ETA 추정 (PM 평균 15 km/h 기준)
  const estimateEtaMin = useCallback((lat, lng) => {
    if (!userLat || !userLng || !lat || !lng) return 5;
    const meters = calculateDistance(userLat, userLng, lat, lng);
    return Math.max(1, Math.round(meters / 250)); // 15 km/h ≈ 250 m/min
  }, [userLat, userLng]);

  // 디바운스 검색 — query + voiceAlternatives 모두 Kakao Places + Geocoder로 병렬 조회 후 병합
  useEffect(() => {
    const allQueries = [query, ...voiceAlternatives]
      .map(q => (q || '').trim())
      .filter(q => q.length > 0);
    const uniqueQueries = [...new Set(allQueries)];

    if (uniqueQueries.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const hasKakao = typeof window !== 'undefined' && window.kakao?.maps?.services;

      // Kakao SDK 미로딩 시 mockSearch 폴백 (6개 하드코딩 — 동작 보장)
      if (!hasKakao) {
        const merged = [];
        const seen = new Set();
        uniqueQueries.forEach(q => {
          mockSearch(q).forEach(r => {
            if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
          });
        });
        setSearchResults(merged);
        setIsSearching(false);
        return;
      }

      const placesSvc = new window.kakao.maps.services.Places();
      const geocoder = new window.kakao.maps.services.Geocoder();
      const placeOptions = (userLat && userLng) ? {
        location: new window.kakao.maps.LatLng(userLat, userLng),
        radius: 20000
      } : {};

      const searches = uniqueQueries.flatMap(q => [
        new Promise(resolve => {
          placesSvc.keywordSearch(q, (data, status) => {
            resolve(status === window.kakao.maps.services.Status.OK ? data : []);
          }, placeOptions);
        }),
        new Promise(resolve => {
          geocoder.addressSearch(q, (data, status) => {
            resolve(status === window.kakao.maps.services.Status.OK ? data : []);
          });
        })
      ]);

      Promise.all(searches).then(arrays => {
        const merged = [];
        const seenCoords = new Set();

        arrays.forEach((arr, idx) => {
          const isAddressSearch = idx % 2 === 1; // 짝수 idx=Places, 홀수=Geocoder
          arr.forEach(item => {
            const lat = Number(item.y);
            const lng = Number(item.x);
            if (!lat || !lng) return;
            const coordKey = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
            if (seenCoords.has(coordKey)) return;
            seenCoords.add(coordKey);

            if (isAddressSearch) {
              const roadName = item.road_address?.address_name;
              const lotName = item.address?.address_name || item.address_name;
              merged.push({
                id: `kakao-addr-${coordKey}`,
                name: roadName || lotName,
                address: roadName ? lotName : t('rss_addr_lot'),
                etaMin: estimateEtaMin(lat, lng),
                lat,
                lng
              });
            } else {
              merged.push({
                id: `kakao-${item.id}`,
                name: item.place_name,
                address: item.road_address_name || item.address_name || '',
                etaMin: estimateEtaMin(lat, lng),
                lat,
                lng
              });
            }
          });
        });

        setSearchResults(merged.slice(0, 12)); // 너무 많으면 부담 — 상위 12개
        setIsSearching(false);
      }).catch(() => {
        setSearchResults([]);
        setIsSearching(false);
      });
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query, voiceAlternatives, userLat, userLng, estimateEtaMin, t]);

  // ETA 결정 시 pulse 애니메이션
  const handleSelectDest = useCallback((dest) => {
    setSelectedDest(dest);
    setRouteDestination?.(dest);
    setQuery('');
    setSearchResults([]);
    setEtaPulse(true);
    setTimeout(() => setEtaPulse(false), 800);
  }, [setRouteDestination]);

  const shareMessage = selectedDest
    ? buildShareMessage(t, destName(selectedDest), selectedDest.etaMin)
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ride-start-root"
          className="fixed inset-0 z-[2900] flex flex-col justify-end items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // 키보드가 올라오면 그 높이만큼 시트를 위로 밀어 올려 하단 항목 가림 방지
          style={{ paddingBottom: kbInset ? `${kbInset}px` : 0, transition: 'padding-bottom 0.2s ease' }}
        >
          {/* 배경 */}
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-lg"
            onClick={onClose}
          />

          {/* 메인 시트 */}
          <motion.div
            key="ride-start-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0d1117 0%, #0a0c10 100%)',
              borderTop: '1px solid rgba(37, 99, 235, 0.4)',
              borderRadius: '2rem 2rem 0 0',
              boxShadow: '0 -20px 80px rgba(0, 0, 0, 0.95), 0 -2px 30px rgba(37, 99, 235, 0.15)',
              // 키보드가 열리면 (뷰포트 - 키보드) 안에 맞춰 상단 12px 여백만 남기고 최대화
              maxHeight: kbInset ? `calc(100dvh - ${kbInset}px - 12px)` : '90dvh',
            }}
          >
            {/* 드래그 핸들 */}
            <div className="w-full pt-4 pb-1 flex justify-center flex-shrink-0">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>

            {/* 스크롤 가능 본문 */}
            <div className="overflow-y-auto overscroll-contain px-5 pb-6 flex flex-col gap-5 flex-1" style={{ scrollbarWidth: 'none' }}>

              {/* ── 헤더 ───────────────────────────────────────────── */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', boxShadow: '0 0 12px rgba(37,99,235,0.5)' }}
                  >
                    <Navigation size={14} className="text-white" />
                  </div>
                  <h2 className="text-[18px] font-black text-white tracking-tight">{t('rss_title')}</h2>
                </div>
                <p className="text-[11px] text-gray-500 pl-9">{t('rss_subtitle')}</p>
              </div>

              {/* ── 출발지 (현재 위치, 고정) ─────────────────────── */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)' }}>
                  <MapPin size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{t('rss_origin')}</p>
                  <p className="text-[13px] font-bold text-gray-300 truncate">{t('rss_current_loc')}</p>
                  {(userLat && userLng) && (
                    <p className="text-[9px] text-gray-600 font-mono">
                      {userLat.toFixed(4)}, {userLng.toFixed(4)}
                    </p>
                  )}
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(37,99,235,0.8)' }} />
              </div>

              {/* 연결선 */}
              <div className="flex items-center gap-3 -my-2 pl-[30px]">
                <div className="flex flex-col gap-1">
                  <div className="w-0.5 h-1.5 bg-gray-700 rounded-full mx-auto" />
                  <div className="w-0.5 h-1.5 bg-gray-700 rounded-full mx-auto" />
                  <div className="w-0.5 h-1.5 bg-gray-700 rounded-full mx-auto" />
                </div>
              </div>

              {/* ── 목적지 검색창 ──────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-300"
                  style={{
                    background: selectedDest ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.05)',
                    borderColor: selectedDest ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.1)',
                    boxShadow: selectedDest ? '0 0 20px rgba(37,99,235,0.1)' : 'none',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: selectedDest ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                      border: selectedDest ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {isSearching
                      ? <Loader2 size={15} className="text-blue-400 animate-spin" />
                      : <MapPin size={15} className={selectedDest ? 'text-red-400' : 'text-gray-500'} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{t('rss_destination')}</p>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query || (selectedDest ? destName(selectedDest) : '')}
                      onChange={e => {
                        setQuery(e.target.value);
                        if (selectedDest) setSelectedDest(null);
                        setVoiceAlternatives([]);
                      }}
                      placeholder={t('rss_dest_placeholder')}
                      className="w-full bg-transparent text-[13px] font-bold text-white placeholder-gray-600 outline-none"
                    />
                  </div>
                  {(query || selectedDest) && (
                    <button
                      onClick={() => { setQuery(''); setSelectedDest(null); setSearchResults([]); setVoiceAlternatives([]); }}
                      className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {!query && !selectedDest && (
                    voiceSupported ? (
                      <button
                        type="button"
                        onClick={startVoice}
                        disabled={isVoiceListening}
                        className={`p-1.5 rounded-full transition shrink-0 ${
                          isVoiceListening
                            ? 'text-red-400 bg-red-500/20 animate-pulse shadow-[0_0_12px_rgba(248,113,113,0.5)]'
                            : 'text-gray-400 hover:text-red-400 hover:bg-white/10'
                        }`}
                        aria-label={isVoiceListening ? t('rss_voice_listening') : t('rss_voice_search')}
                      >
                        <Mic size={15} />
                      </button>
                    ) : (
                      <Search size={15} className="text-gray-600 shrink-0" />
                    )
                  )}
                </div>

                {/* 검색 결과 드롭다운 */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-2xl overflow-hidden border"
                      style={{ background: '#0f1117', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectDest(result)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                        >
                          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <MapPin size={13} className="text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-white truncate">{destName(result)}</p>
                            <p className="text-[9px] text-gray-600 truncate">{result.address}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] font-black text-blue-400">{result.etaMin}{t('rss_min')}</p>
                            <p className="text-[8px] text-gray-600">{formatETA(result.etaMin)} {t('rss_arrive')}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── ETA 카드 (목적지 선택 시) ──────────────────────── */}
              <AnimatePresence>
                {selectedDest && (
                  <motion.div
                    key="eta-card"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{
                      opacity: 1,
                      scale: etaPulse ? [1, 1.02, 1] : 1,
                      y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(14,165,233,0.08) 100%)',
                      border: '1px solid rgba(37,99,235,0.35)',
                      boxShadow: '0 0 30px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="px-4 py-4 flex items-center gap-4">
                      {/* 시계 아이콘 */}
                      <div
                        className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.4)' }}
                      >
                        <Clock size={20} className="text-blue-400 mb-0.5" />
                        <span className="text-[16px] font-black text-white leading-none">{selectedDest.etaMin}</span>
                        <span className="text-[7px] font-bold text-blue-400 uppercase tracking-wider">{t('rss_min')}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">{t('rss_eta_label')}</p>
                        <p className="text-[22px] font-black text-white tracking-tight leading-none mb-1">
                          {t('rss_eta_big', { n: selectedDest.etaMin })}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          <span className="font-bold text-gray-300">{t('rss_arrive_at', { time: formatETA(selectedDest.etaMin) })}</span>
                          <span className="mx-1.5 text-gray-700">·</span>
                          <span className="truncate">{destName(selectedDest)}</span>
                        </p>
                      </div>
                    </div>

                    {/* 하단 상세 바 */}
                    <div
                      className="px-4 py-2.5 flex items-center gap-3 border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">{t('rss_analyzing_route')}</span>
                      </div>
                      <div className="flex-1" />
                      <span className="text-[9px] text-gray-600">~{(selectedDest.etaMin * 0.25).toFixed(1)} km</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── 빠른 목적지 (목적지 미선택 시) ────────────────── */}
              {!selectedDest && searchResults.length === 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">{t('rss_frequent')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_DESTINATIONS.map(dest => (
                      <button
                        key={dest.id}
                        onClick={() => handleSelectDest(dest)}
                        className="flex items-center gap-2.5 px-3 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97] border"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderColor: 'rgba(255,255,255,0.07)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        <span className="text-[20px] shrink-0">{dest.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate leading-snug">{destName(dest)}</p>
                          <p className="text-[9px] font-bold text-blue-400">{dest.etaMin}{t('rss_min')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 소셜 공유 버튼 ──────────────────────────────────── */}
              <AnimatePresence>
                {selectedDest && (
                  <motion.button
                    key="share-btn"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => setShowSharePopup(true)}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all active:scale-[0.98]"
                    style={{
                      background: 'rgba(254,229,0,0.05)',
                      borderColor: 'rgba(254,229,0,0.2)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(254,229,0,0.15)', border: '1px solid rgba(254,229,0,0.3)' }}
                    >
                      <MessageCircle size={18} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-black text-white">{t('rss_notify_arrival')}</p>
                      <p className="text-[10px] text-gray-500">{t('rss_notify_via')}</p>
                    </div>
                    <Share2 size={15} className="text-yellow-400 shrink-0" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* ── 헬멧 인증 CTA 버튼 ─────────────────────────────── */}
              <motion.div layout className="flex flex-col gap-2.5">
                {/* 메인 CTA */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (!selectedDest) {
                      inputRef.current?.focus();
                      return;
                    }
                    onProceedToHelmet?.();
                  }}
                  className="w-full flex items-center justify-center gap-3 py-[18px] rounded-2xl font-black text-[15px] tracking-tight transition-all relative overflow-hidden"
                  style={
                    selectedDest
                      ? {
                          background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 50%, #06b6d4 100%)',
                          boxShadow: '0 0 30px rgba(37,99,235,0.5), 0 0 60px rgba(37,99,235,0.2), 0 4px 20px rgba(0,0,0,0.4)',
                          color: '#fff',
                        }
                      : {
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#6b7280',
                          cursor: 'not-allowed',
                        }
                  }
                >
                  {/* 글로우 레이어 */}
                  {selectedDest && (
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', animation: 'shimmer 2.5s infinite' }}
                    />
                  )}
                  <Shield size={20} className={selectedDest ? 'text-white' : 'text-gray-600'} />
                  <span className="relative z-10">
                    {selectedDest ? t('rss_cta_helmet') : t('rss_cta_select_first')}
                  </span>
                  {selectedDest && <ArrowRight size={18} className="text-white/80 relative z-10" />}
                </motion.button>

                {/* 단계 힌트 */}
                {selectedDest && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    {[t('rss_step_dest'), t('rss_step_helmet'), t('rss_step_go')].map((label, i) => (
                      <React.Fragment key={label}>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                            style={
                              i === 0
                                ? { background: '#2563eb', color: '#fff', boxShadow: '0 0 6px rgba(37,99,235,0.6)' }
                                : { background: 'rgba(255,255,255,0.08)', color: '#6b7280' }
                            }
                          >
                            {i === 0 ? <CheckCircle2 size={9} /> : i + 1}
                          </div>
                          <span
                            className="text-[9px] font-bold"
                            style={{ color: i === 0 ? '#2563eb' : '#4b5563' }}
                          >
                            {label}
                          </span>
                        </div>
                        {i < 2 && <ChevronRight size={10} className="text-gray-700" />}
                      </React.Fragment>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* 공유 팝업 */}
          <AnimatePresence>
            {showSharePopup && (
              <SharePopup
                message={shareMessage}
                onClose={() => setShowSharePopup(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RideStartScreen;
