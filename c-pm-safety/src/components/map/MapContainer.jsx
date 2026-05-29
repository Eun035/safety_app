import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Map, MapMarker, Circle, Polyline, useKakaoLoader, CustomOverlayMap, MarkerClusterer } from 'react-kakao-maps-sdk';
import { useVoiceGuidance } from '../../hooks/useVoiceGuidance';
import InfoCard from './InfoCard';
import { AlertTriangle, Navigation, Zap, X } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';

import usePMParkingData from '../../hooks/usePMParkingData';
import stationData from '../../data/station_data.json';
import { useRideSession } from '../../hooks/useRideSession';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../hooks/useToast';
import { SafeRouteService } from '../../services/SafeRouteService';
import { useSafeNavigation } from '../../hooks/useSafeNavigation';

// 🏢 천안 랜드마크 데이터베이스 (가이드 패널 및 지도 연동용)
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

const MapContainer = ({
    data,
    tagoPms = [],
    showStressLayer, // 🌋 추가
    selectedLocation,
    setSelectedLocation,
    onStationClick,
    rideConfig,
    onRouteReady,
    onMapReady, // New: Signal when map is truly ready to show
    // Lifted Props
    navStep,
    setNavStep,
    routeOrigin,
    setRouteOrigin,
    routeDestination,
    setRouteDestination,
    gpsFollowMode, // 🛰️ 프롭으로 수신
    setGpsFollowMode, // 🛰️ 프롭으로 수신
    showPMs, // 🛰️ 프롭으로 수신
    panToLocation // 🔍 검색 이동용 프롭 수신
}) => {
    const mapRef = useRef(null);
    const hasNotifiedReady = useRef(false);
    const { speak } = useVoiceGuidance();

    const [map, setMap] = useState(null);
    const pmParkings = usePMParkingData();
    const [pmStations, setPmStations] = useState([]);
    const [mapCenter, setMapCenter] = useState({ lat: 36.833, lng: 127.179 });
    const [highlightedStationId, setHighlightedStationId] = useState(null);
    const [safetyGridScores, setSafetyGridScores] = useState([]);

    const [safeRouteInfo, setSafeRouteInfo] = useState(null);
    useSafeNavigation(safeRouteInfo?.warningPoints);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // 실시간 검색 기능 (가이드 패널 입력창용)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const trimmed = searchQuery.trim().toLowerCase();

        // 1. 사전 지정 랜드마크 필터링
        const matchedLandmarks = LANDMARKS.filter(landmark => 
            landmark.title.toLowerCase().includes(trimmed) || 
            landmark.desc.toLowerCase().includes(trimmed)
        );

        // 2. 카카오 로컬 키워드 검색 폴백
        if (window.kakao?.maps?.services) {
            const places = new window.kakao.maps.services.Places();
            places.keywordSearch(trimmed, (kakaoResults, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
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
                    setSearchResults([...matchedLandmarks, ...formattedKakao]);
                } else {
                    setSearchResults(matchedLandmarks);
                }
            }, {
                location: new window.kakao.maps.LatLng(36.833, 127.179),
                radius: 10000
            });
        } else {
            setSearchResults(matchedLandmarks);
        }
    }, [searchQuery]);

    const handleSelectOrigin = (item) => {
        setRouteOrigin({
            id: item.id || `landmark-${Date.now()}`,
            title: item.title,
            lat: item.lat,
            lng: item.lng,
            desc: item.desc,
            type: item.type || 'parking',
            safetyTip: item.safetyTip
        });
        setNavStep('select_destination');
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchFocused(false);
        speak(`출발지가 ${item.title}로 설정되었습니다. 이제 목적지를 선택하세요.`);
        toast('🏁 출발지가 설정되었습니다. 목적지를 선택하세요.', 'success');
        setMapCenter({ lat: item.lat, lng: item.lng });
        setGpsFollowMode(false);
    };

    const handleSelectDestination = (item) => {
        setRouteDestination({
            id: item.id || `landmark-${Date.now()}`,
            title: item.title,
            lat: item.lat,
            lng: item.lng,
            desc: item.desc,
            type: item.type || 'parking',
            safetyTip: item.safetyTip
        });
        setNavStep('route_ready');
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchFocused(false);
        speak(`${item.title}이 목적지로 설정되었습니다.`);
        toast('🏁 목적지가 설정되었습니다. 주행을 시작하세요!', 'success');
        setMapCenter({ lat: item.lat, lng: item.lng });
        setGpsFollowMode(false);
    };

    useEffect(() => {
        if (navStep === 'route_ready' && routeOrigin && routeDestination) {
            SafeRouteService.getSafeRoute(
                { latitude: routeOrigin.lat, longitude: routeOrigin.lng },
                { latitude: routeDestination.lat, longitude: routeDestination.lng }
            ).then(res => {
                setSafeRouteInfo(res);
                toast(`안전 경로 탐색 완료! 추가 보상: ${res.safeToEarnPoints}P`, 'success');
            }).catch(err => {
                console.error(err);
                toast("안전 경로 생성에 실패했습니다.", 'error');
            });
        } else if (navStep === 'idle') {
            setSafeRouteInfo(null);
        }
    }, [navStep, routeOrigin, routeDestination]);

    const { isRiding, currentPath } = useRideSession();

    // 0. Filter PMs by active brands
    const filteredTagoPms = useMemo(() => {
        if (!rideConfig?.brandFilters || rideConfig.brandFilters.length === 0) return tagoPms;
        return tagoPms.filter(pm => {
            const operator = pm.operator?.toLowerCase() || '';
            return rideConfig.brandFilters.some(brand => operator.includes(brand.toLowerCase()));
        });
    }, [tagoPms, rideConfig?.brandFilters]);

    // 1. 카카오맵 SDK 로딩 (설정 객체 메모이제이션으로 무한 루프 방지)
    const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;
    if (!kakaoApiKey && typeof window !== 'undefined' && !window.__KAKAO_KEY_WARNED__) {
        window.__KAKAO_KEY_WARNED__ = true;
        console.error('[C-Safe] VITE_KAKAO_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
    }
    const loaderConfig = useMemo(() => ({
        appkey: kakaoApiKey,
        libraries: ['services', 'clusterer', 'drawing'],
    }), [kakaoApiKey]);

    const [loading, error] = useKakaoLoader(loaderConfig);


    const { location: userLocation, startTracking, stopTracking } = useGeolocation();

    useEffect(() => {
        startTracking();
        return () => stopTracking();
    }, [startTracking, stopTracking]);

    // Phase 26: Kakao Maps BICYCLE Layer Overlay 활성화
    useEffect(() => {
        if (map && window.kakao) {
            map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE);
        }
    }, [map]);

    useEffect(() => {
        if (userLocation && gpsFollowMode && mapRef.current) {
            setMapCenter(userLocation);
        }
    }, [userLocation, gpsFollowMode]);

    useEffect(() => {
        if (panToLocation) {
            setMapCenter({ lat: panToLocation.lat, lng: panToLocation.lng });
            setGpsFollowMode(false); // 수동 검색 시 GPS 자동 추적 해제
        }
    }, [panToLocation, setGpsFollowMode]);

    const handleDragStart = () => {
        setGpsFollowMode(false);
    };

    // Phase 45: Fetch Safety Grid Scores
    useEffect(() => {
        const fetchSafetyScores = async () => {
            try {
                const { data: scores, error } = await supabase
                    .from('safety_grid_scores')
                    .select('*')
                    .gt('safe_pass_count', 0);

                if (error) throw error;
                setSafetyGridScores(scores || []);
            } catch (err) {
                console.error('[C-Safe] Safety Grid 로드 실패:', err);
                setSafetyGridScores([
                    { grid_id: 'g1', lat_center: 36.833, lng_center: 127.179, safe_pass_count: 15 },
                    { grid_id: 'g2', lat_center: 36.834, lng_center: 127.180, safe_pass_count: 8 },
                    { grid_id: 'g3', lat_center: 36.832, lng_center: 127.178, safe_pass_count: 20 }
                ]);
            }
        };

        fetchSafetyScores();

        const channel = supabase
            .channel('safety_updates')
            .on('postgres_changes', { event: 'INSERT', table: 'safety_grid_scores', schema: 'public' }, fetchSafetyScores)
            .on('postgres_changes', { event: 'UPDATE', table: 'safety_grid_scores', schema: 'public' }, fetchSafetyScores)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Phase 45: Memoize Overlay Lists to prevent lag
    const safetyGridOverlay = useMemo(() => {
        return safetyGridScores.map((grid) => {
            const score = Math.min(grid.safe_pass_count / 10, 1);
            return (
                <Circle
                    key={`safety-grid-${grid.grid_id}`}
                    center={{ lat: grid.lat_center, lng: grid.lng_center }}
                    radius={25}
                    strokeWeight={0}
                    fillColor="#40ffdc"
                    fillOpacity={score * 0.3}
                />
            );
        });
    }, [safetyGridScores]);

    const ridingPath = useMemo(() => {
        if (!isRiding || currentPath.length < 2) return null;
        return (
            <Polyline
                path={currentPath.map(p => ({ lat: p.lat, lng: p.lng }))}
                strokeWeight={6}
                strokeColor="#40ffdc"
                strokeOpacity={0.8}
                strokeStyle="solid"
            />
        );
    }, [isRiding, currentPath]);

    // 🚀 최적화: 가시 영역 필터링 (Viewport Filtering)
    const [currentLevel, setCurrentLevel] = useState(3);
    const [mapBounds, setMapBounds] = useState(null);
    const boundsTimeoutRef = useRef(null);

    // 지도를 움직이는 동안에는 계산을 멈추고, 멈췄을 때만 마커를 갱신
    const updateBoundsDebounced = React.useCallback((map) => {
        if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
        boundsTimeoutRef.current = setTimeout(() => {
            const bounds = map.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            setMapBounds({
                sw: { lat: sw.getLat(), lng: sw.getLng() },
                ne: { lat: ne.getLat(), lng: ne.getLng() }
            });
        }, 150);
    }, []);

    const memoizedParkingMarkers = useMemo(() => {
        // 지도가 너무 멀리 있을 때는 클러스터러가 처리하도록 마커 렌더링을 제한하거나
        // 화면에 보이는 마커만 필터링하여 렌더링 부하를 줄임
        let visibleParkings = pmParkings;
        
        if (mapBounds) {
            visibleParkings = pmParkings.filter(p => 
                p.lat >= mapBounds.sw.lat && p.lat <= mapBounds.ne.lat &&
                p.lng >= mapBounds.sw.lng && p.lng <= mapBounds.ne.lng
            );
        }

        // 성능을 위해 한 번에 최대 150개까지만 마커로 렌더링 (그 이상은 클러스터가 처리)
        const displayLimit = currentLevel <= 4 ? 150 : 0;
        const targetParkings = visibleParkings.slice(0, displayLimit);

        return targetParkings.map((station, idx) => (
            <CustomOverlayMap
                key={`parking-${idx}`}
                position={{ lat: station.lat, lng: station.lng }}
                yAnchor={1}
                zIndex={10}
            >
                <div 
                    onClick={() => {
                        // 🚀 목적지 선택 모드일 때 클릭 시 목적지로 설정
                        if (navStep === 'select_destination') {
                            setRouteDestination({
                                title: station.locationName || '주차 구역',
                                lat: station.lat,
                                lng: station.lng,
                                type: 'parking'
                            });
                            setNavStep('route_ready');
                            speak(`${station.locationName || '주차 구역'}이 목적지로 설정되었습니다.`);
                            toast('🏁 목적지가 설정되었습니다. 주행을 시작하세요!', 'success');
                        } else {
                            // 일반 모드에서는 정보 표시
                            setSelectedLocation({
                                title: station.locationName || '주차 구역',
                                desc: '안전 주차 및 리워드 적립이 가능한 구역입니다.',
                                lat: station.lat,
                                lng: station.lng,
                                type: 'parking'
                            });
                            speak(`${station.locationName || '주차 구역'}입니다. 안전 주차 구역입니다.`);
                        }
                    }}
                    className="group cursor-pointer flex flex-col items-center transition-all duration-300 hover:scale-110"
                >
                    {/* 주차장 명칭 툴팁 (확대 시 표시) */}
                    {currentLevel <= 3 && (
                        <div className="mb-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap shadow-xl">
                            <p className="text-[9px] font-black text-white">{station.locationName}</p>
                        </div>
                    )}
                    
                    {/* P 아이콘 배지 */}
                    <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-white/50 relative">
                        <span className="font-black text-xs text-white">P</span>
                        {/* 말꼬리 디자인 */}
                        <div className="absolute -bottom-1.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-blue-500"></div>
                    </div>
                </div>
            </CustomOverlayMap>
        ));

    }, [pmParkings, navStep, setNavStep, setRouteDestination, currentLevel, mapBounds]);

    useEffect(() => {
        if (!loading && !error && window.kakao?.maps?.services) {
            const places = new window.kakao.maps.services.Places();

            const fetchPlaces = (keyword) => {
                return new Promise((resolve) => {
                    places.keywordSearch(keyword, (result, status) => {
                        if (status === window.kakao.maps.services.Status.OK) {
                            resolve(result);
                        } else {
                            resolve([]);
                        }
                    }, {
                        location: new window.kakao.maps.LatLng(36.833, 127.179),
                        radius: 5000,
                        size: 15
                    });
                });
            };

            const fetchCategory = (code) => {
                return new Promise((resolve) => {
                    places.categorySearch(code, (result, status) => {
                        if (status === window.kakao.maps.services.Status.OK) {
                            resolve(result);
                        } else {
                            resolve([]);
                        }
                    }, { location: new window.kakao.maps.LatLng(36.833, 127.179), radius: 5000 });
                });
            };

            Promise.all([
                fetchPlaces('공원'),
                fetchPlaces('대학교'),
                fetchCategory('PK6')
            ]).then((results) => {
                const allResults = results.flat();

                const formatted = allResults.map(item => ({
                    id: `pm-${item.id}`,
                    title: `${item.place_name} (PM / 공용 주차 / 대여소)`,
                    lat: Number(item.y),
                    lng: Number(item.x),
                    type: 'PM_STATION',
                    desc: item.road_address_name || item.address_name,
                    safetyTip: '실시간 API 연동 구역: 올바른 주차 문화를 만들어가요.'
                }));

                const uniqueStations = formatted.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 30);
                setPmStations(uniqueStations);
            });
        }
    }, [loading, error]);

    const handleMarkerClick = (location) => {
        // 탐색 모드 (Navigation Mode) 중일 때의 동작
        if (navStep === 'select_origin') {
            setRouteOrigin(location);
            setNavStep('select_destination');
            toast('🏁 출발지가 설정되었습니다. 이제 목적지를 선택하세요.', 'success');
            return;
        }

        if (navStep === 'select_destination') {
            // 사용자 요청: 헬멧 스테이션, PM 주차장을 최우선으로 지정
            const isSafeZone = location.type === 'parking' || location.type === 'PM_STATION' || location.id?.startsWith('pm-');

            if (!isSafeZone) {
                speak("안전한 주차와 리워드 혜택을 위해 주차장이나 헬멧 스테이션을 목적지로 선택해 주세요.");
                toast('⚠️ 안전 주행을 위해 지정된 주차 구역을 목적지로 선택해 주세요!', 'warning');
                return;
            }

            setRouteDestination(location);
            setNavStep('route_ready');
            speak("목적지가 설정되었습니다. 경로를 확인하고 주행을 시작하세요.");
            toast('✨ 목적지가 설정되었습니다. 안전 경로가 생성됩니다.', 'success');
            return;
        }

        // 일반 모드 동작
        setHighlightedStationId(null);
        setSelectedLocation(location);
        speak(`${location.title || ''} 지역입니다. ${location.desc || ''}. ${location.safetyTip || ''}`);
    };

    if (loading) {
        return (
            <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600 border-r-transparent"></div>
                <p className="text-blue-600 font-black text-xs animate-pulse uppercase tracking-widest">Map Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h3 className="text-lg font-black text-red-900 mb-2">지도 로딩 실패</h3>
                <p className="text-sm text-red-600 font-medium">카카오맵 서비스를 일시적으로 사용할 수 없습니다.</p>
            </div>
        );
    }


    return (

        <div className="relative w-full h-full bg-[#0a1118] overflow-hidden">
            {/* Map Placeholder / Skeleton */}
            {!map && (
                <div className="absolute inset-0 bg-[#0a1118] z-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin"></div>
                </div>
            )}

            {/* Map Layer (With Filter) */}
            <div 
                className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out"
                style={{
                    filter: rideConfig?.isNightMode
                        ? 'invert(90%) hue-rotate(190deg) brightness(95%) contrast(105%)'
                        : 'none',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)'
                }}
            >
                <Map
                    center={mapCenter}
                    level={4}
                    style={{ width: '100%', height: '100%' }}
                    ref={mapRef}
                    onDragStart={handleDragStart}
                    onZoomChanged={(map) => {
                        setCurrentLevel(map.getLevel());
                        updateBoundsDebounced(map);
                    }}
                    onBoundsChanged={updateBoundsDebounced}
                    onCreate={(mapInstance) => {
                        // 🚀 최적화: 이미 설정된 경우 중복 호출 방지
                        if (!map) {
                            setMap(mapInstance);
                        }
                        
                        // 🚀 최적화: 무한 루프 방지를 위해 최초 1회만 신호 전송
                        if (!hasNotifiedReady.current) {
                            setTimeout(() => {
                                if (typeof onMapReady === 'function') {
                                    onMapReady();
                                    hasNotifiedReady.current = true;
                                }
                            }, 1000);
                        }
                    }}
                    onClick={() => setHighlightedStationId(null)}

                >
                    {userLocation && (
                        <CustomOverlayMap position={userLocation} yAnchor={0.5} zIndex={10}>
                            <div className="relative flex items-center justify-center">
                                <div className="w-6 h-6 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_20px_rgba(59,130,246,1)] z-10" />
                                <div className="absolute w-12 h-12 bg-blue-400 rounded-full opacity-30 animate-ping" />
                            </div>
                        </CustomOverlayMap>
                    )}

                    {ridingPath}
                    {safetyGridOverlay}

                    {/* 출발지 → 목적지 안내 루트 (Polyline) — 주행 중에도 표시 유지 */}
                    {safeRouteInfo?.routePath && (
                        <Polyline
                            path={safeRouteInfo.routePath.map(p => ({ lat: p.latitude, lng: p.longitude }))}
                            strokeWeight={6}
                            strokeColor="#3b82f6"
                            strokeOpacity={0.9}
                            strokeStyle="solid"
                        />
                    )}

                    {/* 경로 상 위험 지점 경고 — 주행 중에도 표시 유지 */}
                    {safeRouteInfo?.warningPoints && safeRouteInfo.warningPoints.map((wp, i) => (
                        <Circle
                            key={`wp-${i}`}
                            center={{ lat: wp.latitude, lng: wp.longitude }}
                            radius={50}
                            strokeWeight={2}
                            strokeColor="#f59e0b"
                            fillColor="#f59e0b"
                            fillOpacity={0.4}
                        />
                    ))}

                    <MarkerClusterer
                        averageCenter={true}
                        minLevel={6}
                        disableClickZoom={false}
                        gridSize={100}
                        minClusterSize={2}
                        styles={[{
                            width: '53px', height: '52px',
                            background: 'rgba(64, 255, 220, 0.9)',
                            borderRadius: '26px',
                            color: '#000',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            lineHeight: '54px',
                            border: '2px solid #fff',
                            boxShadow: '0 0 15px rgba(64, 255, 220, 0.5)'
                        }]}
                    >
                        {memoizedParkingMarkers}
                    </MarkerClusterer>

                    {Array.isArray(data) && data.filter(loc => loc.type !== 'available_pm').map((loc) => (
                        <MapMarker
                            key={`safety-${loc.id}`}
                            position={{ lat: loc.lat, lng: loc.lng }}
                            onClick={() => handleMarkerClick(loc)}
                            image={{
                                src: loc.type === 'SLOPE'
                                    ? 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png'
                                    : 'https://t1.daumcdn.net/mapjsapi/images/2.0/marker.png',
                                size: { width: 24, height: 35 }
                            }}
                        />
                    ))}

                    {showPMs && Array.isArray(filteredTagoPms) && filteredTagoPms.map((loc) => (
                        <CustomOverlayMap key={loc.id} position={{ lat: loc.lat, lng: loc.lng }} yAnchor={0.5} zIndex={2}>
                            <div
                                onClick={() => handleMarkerClick(loc)}
                                className="w-6 h-6 bg-fuchsia-500 border-[2px] border-white rounded-full shadow-[0_0_15px_rgba(217,70,239,0.9)] cursor-pointer hover:scale-125 transition-all flex flex-col items-center justify-center animate-bounce"
                            >
                                <Zap size={10} className="text-white fill-white" />
                            </div>
                        </CustomOverlayMap>
                    ))}

                    {showPMs && pmStations.map((station) => (
                        <CustomOverlayMap key={station.id} position={{ lat: station.lat, lng: station.lng }} yAnchor={1} zIndex={1}>
                            <div
                                onClick={() => handleMarkerClick(station)}
                                className="w-10 h-10 bg-cyber-panel/90 border-2 border-cyber-green rounded-full flex flex-col items-center justify-center shadow-neon-green cursor-pointer hover:scale-110 transition-all relative"
                            >
                                <div className="absolute -bottom-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyber-green"></div>
                                <Zap size={20} className="text-cyber-green fill-cyber-green/50" />
                            </div>
                        </CustomOverlayMap>
                    ))}

                    {showPMs && stationData.map((station) => {
                        const isHighlighted = highlightedStationId === station.id;
                        return (
                            <CustomOverlayMap key={station.id} position={{ lat: station.lat, lng: station.lng }} yAnchor={1} zIndex={isHighlighted ? 40 : 3}>
                                <div
                                    onClick={() => {
                                        setHighlightedStationId(station.id);
                                        handleMarkerClick(station);
                                        if (onStationClick) onStationClick(station);
                                    }}
                                    className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative ${isHighlighted
                                        ? 'scale-125 animate-bounce shadow-[0_0_30px_#f97316] z-50 rounded-full'
                                        : 'w-10 h-10 bg-[#1e1410]/90 border border-orange-500 rounded-full hover:scale-110 shadow-lg'
                                        }`}
                                >
                                    {isHighlighted ? (
                                        <div className="w-12 h-12 bg-orange-500 border-2 border-white rounded-full flex flex-col items-center justify-center relative">
                                            <div className="absolute -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-orange-500"></div>
                                            <span className="text-xl">🏪</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="absolute -bottom-1.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-orange-500"></div>
                                            <span className="text-sm">🏪</span>
                                        </>
                                    )}
                                </div>
                            </CustomOverlayMap>
                        );
                    })}

                    {showPMs && Array.isArray(pmParkings) && pmParkings.map((parking, idx) => (
                        <CustomOverlayMap key={`parking-${idx}`} position={{ lat: parking.lat, lng: parking.lng }} yAnchor={1} zIndex={2} clickable={true}>
                            <div
                                onClick={() => handleMarkerClick({ id: `parking-${idx}`, lat: parking.lat, lng: parking.lng, title: parking.locationName, desc: `주차가능 대수: ${parking.capacity}`, type: 'parking' })}
                                className="pointer-events-auto w-8 h-8 rounded-full bg-cyan-600 border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.8)] hover:scale-110 transition-transform cursor-pointer relative"
                            >
                                <div className="absolute -bottom-1 h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-cyan-600 pointer-events-none"></div>
                                <span className="text-white font-black text-sm pointer-events-none">P</span>
                            </div>
                        </CustomOverlayMap>
                    ))}

                    {/* 🌋 보행자 스트레스 존 레이어 시각화 */}
                    {showStressLayer && [
                        { id: 's1', lat: 36.833, lng: 127.179, radius: 150, name: "단국대 정문 보행자 보호구역" },
                        { id: 's2', lat: 36.818, lng: 127.156, radius: 200, name: "종합터미널 보행자 밀집구역" }
                    ].map(zone => (
                        <Circle
                            key={`stress-${zone.id}`}
                            center={{ lat: zone.lat, lng: zone.lng }}
                            radius={zone.radius}
                            strokeWeight={2}
                            strokeColor="#f97316"
                            strokeOpacity={0.8}
                            fillColor="#f97316"
                            fillOpacity={0.2}
                        />
                    ))}
                </Map>
            </div>

            {/* UI Layer (Above Map, No Filter) */}
            <div className="absolute inset-0 z-10 pointer-events-none">

                {/* ══════════════════════════════════════════════════════════
                    검색 결과 풀오버레이 (가이드 패널과 분리 / 항상 최상단)
                    입력 중에만 노출되며 다른 UI와 절대 겹치지 않음
                ══════════════════════════════════════════════════════════ */}
                {isSearchFocused && searchQuery.trim() && navStep !== 'route_ready' && (
                    <div
                        className="absolute inset-0 z-[200] pointer-events-auto flex flex-col"
                        onClick={() => { setIsSearchFocused(false); setSearchQuery(''); }}
                    >
                        {/* 반투명 배경 (탭하면 닫힘) */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                        {/* 검색결과 패널 — 화면 상단 50px 여백 두고 시작 */}
                        <div
                            className="relative z-10 mx-auto w-[calc(100%-32px)] max-w-md mt-[50px] flex flex-col max-h-[70vh] animate-in slide-in-from-top-2 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 헤더 */}
                            <div className="flex items-center justify-between bg-[#0d1117] border border-white/15 rounded-t-2xl px-4 py-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <Navigation size={14} className="text-cyber-cyan" />
                                    <span className="text-[11px] font-black text-cyber-cyan uppercase tracking-widest">
                                        {navStep === 'select_origin' ? '출발지 검색' : '목적지 검색'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-gray-500 font-bold">
                                        {searchResults.length}건
                                    </span>
                                    <button
                                        onClick={() => { setIsSearchFocused(false); setSearchQuery(''); }}
                                        className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* 결과 목록 */}
                            <div className="flex-1 overflow-y-auto bg-[#0d1117]/98 border-x border-b border-white/15 rounded-b-2xl divide-y divide-white/5 shadow-2xl">
                                {searchResults.length > 0 ? (
                                    searchResults.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                if (navStep === 'select_origin') {
                                                    handleSelectOrigin(item);
                                                } else if (navStep === 'select_destination') {
                                                    handleSelectDestination(item);
                                                }
                                            }}
                                            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/8 active:bg-white/12 transition-colors"
                                            style={{ animationDelay: `${idx * 30}ms` }}
                                        >
                                            {/* 아이콘 */}
                                            <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0 text-base">
                                                {item.type === 'city_hall' ? '🏢'
                                                    : item.type === 'fire_station' ? '🚒'
                                                    : item.type === 'university' ? '🏫'
                                                    : item.type === 'station' ? '🚉'
                                                    : item.type === 'terminal' ? '🚌'
                                                    : '📍'}
                                            </div>

                                            {/* 텍스트 */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-black text-white truncate">{item.title}</p>
                                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.desc}</p>
                                                {item.badge && (
                                                    <span className="inline-block mt-1 text-[8px] px-1.5 py-0.5 bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 rounded-full font-bold">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 선택 아이콘 */}
                                            <div className="w-7 h-7 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg flex items-center justify-center shrink-0">
                                                <Navigation size={13} className="text-cyber-cyan" />
                                            </div>
                                        </div>
                                    ))
                                ) : searchQuery.trim().length >= 1 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                        <span className="text-2xl">🔍</span>
                                        <p className="text-xs font-black text-gray-500">검색 결과가 없습니다</p>
                                        <p className="text-[9px] text-gray-600">다른 키워드로 검색해보세요</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 상단 네비게이션 가이드 패널 --- */}
                {navStep !== 'idle' && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-md z-50 animate-in slide-in-from-top-4 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-black flex items-center gap-2">
                                    <Navigation size={18} className="text-cyber-cyan" />
                                    {navStep === 'select_origin' && '출발지를 선택하세요 (1/2)'}
                                    {navStep === 'select_destination' && '목적지를 선택하세요 (2/2)'}
                                    {navStep === 'route_ready' && '안전 경로 탐색 완료!'}
                                </h3>
                                <button onClick={() => { setNavStep('idle'); setRouteOrigin(null); setRouteDestination(null); }} className="text-gray-400 hover:text-white p-1">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex flex-col gap-2 mt-3">
                                {/* 출발지 카드 */}
                                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${navStep === 'select_origin' ? 'border-cyber-cyan bg-cyber-cyan/20' : 'border-white/10 bg-white/10'}`}>
                                    <div className={`w-3 h-3 rounded-full ${routeOrigin ? 'bg-cyber-cyan shadow-neon-cyan' : 'bg-gray-600 animate-pulse'}`} />
                                    {navStep === 'select_origin' ? (
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setIsSearchFocused(true);
                                            }}
                                            onFocus={() => setIsSearchFocused(true)}
                                            placeholder="출발지 직접 입력 (시청, 소방서, 대학교 등)..."
                                            className="flex-1 bg-transparent text-xs font-black text-white outline-none border-none placeholder-gray-500 py-0.5"
                                        />
                                    ) : (
                                        <span className={`text-xs font-black ${routeOrigin ? 'text-white' : 'text-gray-400'}`}>
                                            {routeOrigin ? routeOrigin.title : '출발지 선택 중...'}
                                        </span>
                                    )}
                                </div>

                                {/* 목적지 카드 */}
                                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${navStep === 'select_destination' ? 'border-orange-500 bg-orange-500/20' : 'border-white/10 bg-white/10'}`}>
                                    <div className={`w-3 h-3 rounded-full ${routeDestination ? 'bg-orange-500 shadow-neon-orange' : 'bg-gray-600 animate-pulse'}`} />
                                    {navStep === 'select_destination' ? (
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setIsSearchFocused(true);
                                            }}
                                            onFocus={() => setIsSearchFocused(true)}
                                            placeholder="목적지 직접 입력 (시청, 소방서, 대학교 등)..."
                                            className="flex-1 bg-transparent text-xs font-black text-white outline-none border-none placeholder-gray-500 py-0.5"
                                        />
                                    ) : (
                                        <span className={`text-xs font-black ${routeDestination ? 'text-white' : 'text-gray-400'}`}>
                                            {routeDestination ? routeDestination.title : '목적지 선택 중...'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {navStep === 'route_ready' && (
                                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Safe-to-Earn</p>
                                            <p className="text-lg font-black text-white italic">+{safeRouteInfo?.safeToEarnPoints || 0} <span className="text-[10px] not-italic text-gray-400">Points</span></p>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Est. Time</p>
                                            <p className="text-lg font-black text-white italic">{safeRouteInfo?.estimatedTime || 0} <span className="text-[10px] not-italic text-gray-400">Min</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                                            <AlertTriangle size={14} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Route Caution</p>
                                            <p className="text-[11px] text-gray-300 font-bold leading-tight">
                                                사고 다발 구역이 {safeRouteInfo?.warningPoints?.length || 0}곳 있습니다. 진입 50m 전 햅틱 알림이 송출됩니다.
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        if (safeRouteInfo) {
                                            toast(`안전 경로 주행 시작 (예상 리워드: ${safeRouteInfo.safeToEarnPoints}P)`, 'info');
                                        }
                                        onRouteReady();
                                    }} className="w-full py-4 bg-cyber-green text-black font-black rounded-xl hover:bg-emerald-400 transition-all shadow-neon-green flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                                        <Zap size={16} className="fill-black" />
                                        Start Safe Ride
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                )}



                {/* Info Card */}
                <div className="absolute bottom-6 w-full px-4 pointer-events-auto">
                    <div className="max-w-lg mx-auto">
                        <InfoCard
                            location={selectedLocation}
                            onClose={() => setSelectedLocation(null)}
                            onSetOrigin={() => {
                                setRouteOrigin(selectedLocation);
                                setNavStep('select_destination');
                                setSelectedLocation(null);
                                toast('🏁 출발지가 설정되었습니다. 목적지를 선택하세요.', 'success');
                            }}
                            onSetDestination={() => {
                                setRouteDestination(selectedLocation);
                                setNavStep('route_ready');
                                setSelectedLocation(null);
                                speak(`${selectedLocation.title}이 목적지로 설정되었습니다.`);
                                toast('🏁 목적지가 설정되었습니다. 주행을 시작하세요!', 'success');
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapContainer;
