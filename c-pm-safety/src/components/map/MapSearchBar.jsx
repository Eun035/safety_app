import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, MapPin, Building, ShieldAlert, Sparkles, Navigation } from 'lucide-react';
import { toast } from '../../hooks/useToast';

// 🏢 천안 핵심 랜드마크 데이터베이스 (시청, 소방서, 대학교 등 우선순위 매칭)
const PRESETS = [
    { label: '🏢 천안시청', query: '시청' },
    { label: '🚒 소방서', query: '소방서' },
    { label: '🏫 대학교', query: '대학교' },
    { label: '🚉 역/터미널', query: '역' }
];

const LANDMARKS = [
    {
        id: 'landmark-cityhall',
        title: '천안시청',
        desc: '충청남도 천안시 서북구 번영로 156 (공공기관)',
        lat: 36.815129,
        lng: 127.113893,
        type: 'city_hall',
        badge: '🏢 시청 우선',
        safetyTip: '시청 주변은 자전거 도로 정비가 잘 되어 있으나 보행자가 많으니 안전 속도(시속 20km)를 유지하세요.'
    },
    {
        id: 'landmark-seobuk-fire',
        title: '천안서북소방서',
        desc: '충청남도 천안시 서북구 백석동 8 (재난안전)',
        lat: 36.832791,
        lng: 127.113289,
        type: 'fire_station',
        badge: '🚒 소방서 우선',
        safetyTip: '긴급 출동 차량이 수시로 출입하는 구역입니다. 소방서 차고지 앞 주차 및 서성임은 금지됩니다.'
    },
    {
        id: 'landmark-dongnam-fire',
        title: '천안동남소방서',
        desc: '충청남도 천안시 동남구 구성동 282-1 (재난안전)',
        lat: 36.802521,
        lng: 127.161877,
        type: 'fire_station',
        badge: '🚒 소방서 우선',
        safetyTip: '소방차량 긴급 출동 동선 확보를 위해 주변 5m 이내에 절대 주차(PM 거치)하지 마세요.'
    },
    {
        id: 'landmark-dankook',
        title: '단국대학교 천안캠퍼스',
        desc: '충청남도 천안시 동남구 단대로 119 (대학)',
        lat: 36.832655,
        lng: 127.167888,
        type: 'university',
        badge: '🏫 대학교',
        safetyTip: '단대 호수(안서호) 주변 산책로는 PM 진입이 금지되거나 제한되므로 주의하여 우회하세요.'
    },
    {
        id: 'landmark-sangmyung',
        title: '상명대학교 천안캠퍼스',
        desc: '충청남도 천안시 동남구 상명대길 31 (대학)',
        lat: 36.833543,
        lng: 127.179331,
        type: 'university',
        badge: '🏫 대학교',
        safetyTip: '캠퍼스 내 경사 구간이 매우 가파릅니다. 급경사 다운힐 시 반드시 풋브레이크와 전면 감속을 실행하세요.'
    },
    {
        id: 'landmark-baekseok',
        title: '백석대학교',
        desc: '충청남도 천안시 동남구 문암로 76 (대학)',
        lat: 36.839843,
        lng: 127.186542,
        type: 'university',
        badge: '🏫 대학교',
        safetyTip: '등하교 시간 대학가 주변 보행자 밀집도가 매우 높습니다. 보행자 보호구역 진입 시 반드시 서행하세요.'
    },
    {
        id: 'landmark-cheonan-station',
        title: '천안역 (동부광장)',
        desc: '충청남도 천안시 동남구 대흥로 239 (철도역)',
        lat: 36.811451,
        lng: 127.146522,
        type: 'station',
        badge: '🚉 교통거점',
        safetyTip: '천안역 광장 앞은 유동인구가 매우 조밀한 구역입니다. 하차 후 보행 시 끌고 가시는 것이 안전합니다.'
    },
    {
        id: 'landmark-dujeong-station',
        title: '두정역',
        desc: '충청남도 천안시 서북구 두정역길 43 (지하철역)',
        lat: 36.831521,
        lng: 127.148811,
        type: 'station',
        badge: '🚉 교통거점',
        safetyTip: '퇴근 시간 두정역 출구 인근은 PM 반납 혼잡구역입니다. 반드시 지정된 노란색 합법 주차선 안에 주차하세요.'
    },
    {
        id: 'landmark-terminal',
        title: '천안종합버스터미널',
        desc: '충청남도 천안시 동남구 만남로 43 (버스터미널)',
        lat: 36.819662,
        lng: 127.155822,
        type: 'terminal',
        badge: '🚉 교통거점',
        safetyTip: '신부동 터미널 앞 도로는 대표적인 사고 다발 지점입니다. 인도 주행은 불가하며, 자전거도로로 서행하세요.'
    }
];

const MapSearchBar = ({ onSelectLocation, speak }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);

    // 외부 클릭 시 검색결과 창 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 검색어 입력에 따른 실시간 하이브리드 검색 실행
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const trimmed = query.trim().toLowerCase();

        // 1. 사전 지정 랜드마크 필터링 (우선순위 1)
        const matchedLandmarks = LANDMARKS.filter(landmark => 
            landmark.title.toLowerCase().includes(trimmed) || 
            landmark.desc.toLowerCase().includes(trimmed) ||
            landmark.badge.toLowerCase().includes(trimmed)
        );

        // 2. 카카오 맵 로컬 키워드 검색 수행 (우선순위 2 - 폴백)
        if (window.kakao?.maps?.services) {
            const places = new window.kakao.maps.services.Places();
            places.keywordSearch(trimmed, (kakaoResults, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    // 중복 방지 처리 (사전 정의된 랜드마크와 겹치지 않게 필터링)
                    const formattedKakao = kakaoResults
                        .filter(item => !LANDMARKS.some(l => 
                            l.title.includes(item.place_name) || item.place_name.includes(l.title)
                        ))
                        .map(item => ({
                            id: `kakao-${item.id}`,
                            title: item.place_name,
                            desc: item.road_address_name || item.address_name,
                            lat: Number(item.y),
                            lng: Number(item.x),
                            type: 'kakao_place',
                            badge: '📍 일반 장소',
                            safetyTip: '일반 목적지입니다. 도착 후 반드시 합법 주차구역(P)을 찾아 올바르게 세워두세요.'
                        }));

                    setResults([...matchedLandmarks, ...formattedKakao]);
                } else {
                    setResults(matchedLandmarks);
                }
            }, {
                location: new window.kakao.maps.LatLng(36.833, 127.179), // 천안 기준
                radius: 10000 // 10km 이내
            });
        } else {
            setResults(matchedLandmarks);
        }
    }, [query]);

    const handleSelect = (item) => {
        setQuery(item.title);
        setIsOpen(false);
        onSelectLocation(item);
        
        // TTS 안내 송출
        if (speak) {
            speak(t('tts_destination_search', { title: t(item.title) }));
        }
        toast(`🔍 ${item.title} 매칭 완료!`, 'success');
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
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={t('search_placeholder')}
                    className={`w-full pl-12 pr-12 bg-gray-950/80 backdrop-blur-xl border border-white/10 focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/50 rounded-2xl text-white font-bold tracking-tight shadow-2xl transition-all duration-300 outline-none ${
                        isOpen ? 'py-5 text-base' : 'py-3.5 text-xs'
                    }`}
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                        }}
                        className="absolute right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                    >
                        <X size={20} />
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
