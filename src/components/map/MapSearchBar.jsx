import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, MapPin, Building, ShieldAlert, Sparkles, Navigation, ChevronDown, Mic } from 'lucide-react';
import { toast } from '../../hooks/useToast';
import { LANDMARKS } from '../../data/landmarks';
import { useRegion } from '../../hooks/useRegion';
import { REGION_LIST, REGIONS } from '../../config/regions';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

// 🏢 천안·아산 핵심 랜드마크 데이터베이스는 src/data/landmarks.js 단일 소스를 사용
const PRESETS = [
    { label: '🏢 시청', query: '시청' },
    { label: '🚒 소방서', query: '소방서' },
    { label: '🏫 대학교', query: '대학교' },
    { label: '🚉 역/터미널', query: '역' }
];

const MapSearchBar = ({ onSelectLocation, speak }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
    const [voiceAlternatives, setVoiceAlternatives] = useState([]); // 음성 인식 확률순 후보 (best 제외)
    const searchRef = useRef(null);

    const currentRegion = useRegion(s => s.currentRegion);
    const setRegion = useRegion(s => s.setRegion);
    const regionMeta = REGIONS[currentRegion] || REGIONS.cheonan;

    // 음성 검색 — best는 input에 표시, 나머지 후보는 별도 저장하여 같이 검색
    const { start: startVoice, isListening, isSupported: voiceSupported } = useSpeechRecognition({
        onResult: (text, alternatives) => {
            setQuery(text);
            setVoiceAlternatives(Array.isArray(alternatives) ? alternatives.slice(1) : []);
            setIsOpen(true);
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

    // 외부 클릭 시 검색결과 창 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsRegionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 검색어 입력에 따른 실시간 하이브리드 검색 실행 — query + voiceAlternatives 동시 조회
    useEffect(() => {
        const allQueries = [query, ...voiceAlternatives]
            .map(q => (q || '').trim())
            .filter(q => q.length > 0);
        const uniqueQueries = [...new Set(allQueries)];

        if (uniqueQueries.length === 0) {
            setResults([]);
            return;
        }

        // 1. 사전 지정 랜드마크 필터링 — 모든 후보에 대해 검색, dedup
        const matchedLandmarksSet = new Map();
        uniqueQueries.forEach(q => {
            const trimmed = q.toLowerCase();
            LANDMARKS
                .filter(landmark =>
                    landmark.title.toLowerCase().includes(trimmed) ||
                    landmark.desc.toLowerCase().includes(trimmed) ||
                    landmark.badge.toLowerCase().includes(trimmed)
                )
                .forEach(l => { if (!matchedLandmarksSet.has(l.id)) matchedLandmarksSet.set(l.id, l); });
        });
        const matchedLandmarks = [...matchedLandmarksSet.values()].sort((a, b) => {
            const aSame = (a.region || 'cheonan') === currentRegion ? 0 : 1;
            const bSame = (b.region || 'cheonan') === currentRegion ? 0 : 1;
            return aSame - bSame;
        });

        // 2. 카카오 키워드 + 주소 동시 검색 — uniqueQueries 전부에 대해 병렬 발사
        if (window.kakao?.maps?.services) {
            const placeOptions = {
                location: new window.kakao.maps.LatLng(regionMeta.center.lat, regionMeta.center.lng),
                radius: 10000
            };

            const searches = uniqueQueries.flatMap(q => [
                new Promise((resolve) => {
                    const places = new window.kakao.maps.services.Places();
                    places.keywordSearch(q, (data, status) => {
                        resolve(status === window.kakao.maps.services.Status.OK ? data : []);
                    }, placeOptions);
                }),
                new Promise((resolve) => {
                    const geocoder = new window.kakao.maps.services.Geocoder();
                    geocoder.addressSearch(q, (data, status) => {
                        resolve(status === window.kakao.maps.services.Status.OK ? data : []);
                    });
                })
            ]);

            Promise.all(searches).then(arrays => {
                const seenCoords = new Set();
                const formattedPlaces = [];
                const formattedAddresses = [];

                arrays.forEach((arr, idx) => {
                    const isAddressSearch = idx % 2 === 1; // 짝=Places, 홀=Geocoder
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
                            formattedAddresses.push({
                                id: `kakao-addr-${coordKey}`,
                                title: roadName || lotName,
                                desc: roadName ? lotName : t('rss_addr_lot'),
                                lat, lng,
                                type: 'kakao_address',
                                badge: '🏠 주소',
                                safetyTip: '주소 기반 목적지입니다. 도착 후 반드시 합법 주차구역(P)을 찾아 올바르게 세워두세요.'
                            });
                        } else {
                            // landmark와 중복인 POI는 제외
                            const dup = LANDMARKS.some(l =>
                                l.title.includes(item.place_name) || item.place_name.includes(l.title)
                            );
                            if (dup) return;
                            formattedPlaces.push({
                                id: `kakao-${item.id}`,
                                title: item.place_name,
                                desc: item.road_address_name || item.address_name,
                                lat, lng,
                                type: 'kakao_place',
                                badge: '📍 일반 장소',
                                safetyTip: '일반 목적지입니다. 도착 후 반드시 합법 주차구역(P)을 찾아 올바르게 세워두세요.'
                            });
                        }
                    });
                });

                setResults([...matchedLandmarks, ...formattedAddresses, ...formattedPlaces].slice(0, 15));
            });
        } else {
            setResults(matchedLandmarks);
        }
    }, [query, voiceAlternatives, currentRegion, regionMeta.center.lat, regionMeta.center.lng]);

    const handleSelect = (item) => {
        setQuery(item.title);
        setIsOpen(false);
        onSelectLocation(item);
        
        // TTS 안내 송출
        if (speak) {
            speak(t('tts_destination_search', { title: t(item.title) }));
        }
        toast(t('mp_matched', { title: t(item.title, { defaultValue: item.title }) }), 'success');
    };

    const handlePresetClick = (presetQuery) => {
        setQuery(presetQuery);
        setIsOpen(true);
    };

    return (
        <div ref={searchRef} className="w-full flex flex-col gap-2 relative z-[100]">
            {/* 검색 바 입력부 */}
            <div className="relative flex items-center">
                <div className="absolute left-4 text-gray-400">
                    <Search size={isOpen ? 24 : 18} className="text-cyber-cyan shadow-neon-cyan/20 animate-pulse transition-all duration-300" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setVoiceAlternatives([]);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={t('search_placeholder')}
                    className={`w-full pl-12 pr-28 bg-gray-950/80 backdrop-blur-xl border border-white/10 focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/50 rounded-2xl text-white font-bold tracking-tight shadow-2xl transition-all duration-300 outline-none ${
                        isOpen ? 'py-5 text-base' : 'py-3.5 text-xs'
                    }`}
                />

                {/* 🏙️ 지역 토글 칩 (천안 ▾ / 아산 ▾) */}
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsRegionMenuOpen(v => !v);
                        }}
                        className={`flex items-center gap-1 bg-white/10 border border-white/15 hover:border-cyber-cyan/50 active:scale-95 rounded-lg shadow-sm transition-all ${
                            isOpen ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'
                        } font-black text-cyber-cyan`}
                    >
                        <span>🏙️ {regionMeta.name}</span>
                        <ChevronDown size={isOpen ? 14 : 12} />
                    </button>
                    {isRegionMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 bg-gray-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[300] min-w-[100px]">
                            {REGION_LIST.map(r => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRegion(r.id);
                                        setIsRegionMenuOpen(false);
                                        toast(t('mp_region_switched', { name: r.name }), 'success');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-cyber-cyan/15 transition ${
                                        r.id === currentRegion ? 'text-cyber-cyan bg-cyber-cyan/10' : 'text-gray-300'
                                    }`}
                                >
                                    {r.id === currentRegion ? '✓ ' : ''}{r.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {query ? (
                    <button
                        onClick={() => {
                            setQuery('');
                            setVoiceAlternatives([]);
                            setResults([]);
                        }}
                        className="absolute right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                        aria-label={t('mp_clear_search')}
                    >
                        <X size={20} />
                    </button>
                ) : voiceSupported && (
                    <button
                        onClick={startVoice}
                        disabled={isListening}
                        className={`absolute right-4 p-1.5 rounded-full transition ${
                            isListening
                                ? 'text-cyber-cyan bg-cyber-cyan/15 animate-pulse shadow-[0_0_12px_rgba(64,255,220,0.5)]'
                                : 'text-gray-400 hover:text-cyber-cyan hover:bg-white/10'
                        }`}
                        aria-label={isListening ? t('rss_voice_listening') : t('mp_voice_search')}
                    >
                        <Mic size={20} />
                    </button>
                )}
            </div>

            {/* 프리셋 빠른 필터 태그 */}
            <div className={`flex transition-all duration-300 ${isOpen ? 'gap-2 overflow-x-auto pb-2 mt-2 scrollbar-none' : 'gap-1.5 w-full pb-1 mt-1'}`}>
                {PRESETS.map((preset, idx) => {
                    const presetLabels = {
                        '시청': t('🏢 천안시청', { defaultValue: '🏢 천안시청' }),
                        '소방서': t('🚒 소방서', { defaultValue: '🚒 소방서' }),
                        '대학교': t('🏫 대학교', { defaultValue: '🏫 대학교' }),
                        '역': t('🚉 역/터미널', { defaultValue: '🚉 역/터미널' })
                    };
                    const label = presetLabels[preset.query] || preset.label;
                    return (
                        <button
                            key={idx}
                            onClick={() => handlePresetClick(preset.query)}
                            className={`bg-white/15 backdrop-blur-md border border-white/30 hover:bg-cyber-cyan/20 hover:border-cyber-cyan/60 active:scale-95 rounded-xl font-black text-white hover:text-cyber-cyan transition-all duration-300 shadow-lg shadow-black/20 ${
                                isOpen ? 'shrink-0 px-5 py-3.5 text-sm' : 'flex-1 px-1 py-2 text-[11px] whitespace-nowrap overflow-hidden text-ellipsis'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* 실시간 하이브리드 검색 결과 리스트 */}
            {isOpen && (query || results.length > 0) && (
                <div className="absolute top-[130px] left-0 right-0 max-h-[300px] overflow-y-auto bg-gray-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[200] divide-y divide-white/5 scrollbar-thin">
                    {results.length > 0 ? (
                        results.map((item) => {
                            const isLandmark = item.type !== 'kakao_place';
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-cyber-cyan/10 transition-colors ${
                                        isLandmark ? 'bg-cyber-cyan/5' : ''
                                    }`}
                                >
                                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                                        isLandmark 
                                            ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30 shadow-[0_0_10px_rgba(64,255,220,0.2)]' 
                                            : 'bg-white/10 text-gray-300 border-white/10'
                                    }`}>
                                        {item.type === 'fire_station' ? (
                                            <ShieldAlert size={16} className="text-orange-400" />
                                        ) : item.type === 'city_hall' ? (
                                            <Building size={16} className="text-cyber-cyan" />
                                        ) : (
                                            <MapPin size={16} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-sm font-black text-white truncate">{t(item.title, { defaultValue: item.title })}</h4>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 border uppercase tracking-wider ${
                                                isLandmark
                                                    ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/30 shadow-sm'
                                                    : 'bg-white/5 text-gray-400 border-white/5'
                                            }`}>
                                                {t(item.badge, { defaultValue: item.badge })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-bold truncate mt-0.5">{t(item.desc, { defaultValue: item.desc })}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-gray-500 font-bold flex flex-col items-center gap-2">
                            <Sparkles size={24} className="text-gray-600 animate-pulse" />
                            <p className="text-xs">{t('search_no_results')}</p>
                            <p className="text-[10px] text-gray-600 font-medium">{t('search_no_results_desc')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MapSearchBar;
