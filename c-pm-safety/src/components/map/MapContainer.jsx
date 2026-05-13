import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Map, MapMarker, Circle, Polyline, useKakaoLoader, CustomOverlayMap, MarkerClusterer } from 'react-kakao-maps-sdk';
import { useVoiceGuidance } from '../../hooks/useVoiceGuidance';
import InfoCard from './InfoCard';
import { AlertTriangle, MapPin, Navigation, Info, ShieldAlert, Zap, LocateFixed, Share2, X } from 'lucide-react';
import accidentData from '../../data/accidentHeatmap.json';
import { useGeolocation } from '../../hooks/useGeolocation';
import { calculateDistance } from '../../utils/distance';

import usePMParkingData from '../../hooks/usePMParkingData';
import stationData from '../../data/station_data.json';
import { useRideSession } from '../../hooks/useRideSession';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../hooks/useToast';

const MapContainer = ({
    data,
    tagoPms = [],
    showHeatmap,
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
    setRouteDestination
}) => {
    const mapRef = useRef(null);
    const hasNotifiedReady = useRef(false);
    const { speak } = useVoiceGuidance();

    const [map, setMap] = useState(null);
    const pmParkings = usePMParkingData();
    const [pmStations, setPmStations] = useState([]);
    const [mapCenter, setMapCenter] = useState({ lat: 36.833, lng: 127.179 });
    const [isFollowMode, setIsFollowMode] = useState(true);
    const [highlightedStationId, setHighlightedStationId] = useState(null);
    const [selectedDangerZone, setSelectedDangerZone] = useState(null);
    const [safetyGridScores, setSafetyGridScores] = useState([]);
    const [showPMs, setShowPMs] = useState(false); // Phase 26: PM 가시성 토글

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
    const loaderConfig = useMemo(() => ({
        appkey: import.meta.env.VITE_KAKAO_API_KEY || '40e6d1b5e849c283027335cbba22bf32',
        libraries: ['services', 'clusterer', 'drawing'],
    }), []);

    const [loading, error] = useKakaoLoader(loaderConfig);


    const { location: userLocation, error: geoError, isTracking, startTracking } = useGeolocation();

    useEffect(() => {
        startTracking();
    }, []);

    // Phase 26: Kakao Maps BICYCLE Layer Overlay 활성화
    useEffect(() => {
        if (map && window.kakao) {
            map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE);
        }
    }, [map]);

    useEffect(() => {
        if (userLocation && isFollowMode && mapRef.current) {
            setMapCenter(userLocation);
        }
    }, [userLocation, isFollowMode]);

    const handleDragStart = () => {
        setIsFollowMode(false);
    };

    const locateMe = () => {
        setIsFollowMode(true);
        if (userLocation) {
            setMapCenter(userLocation);
        }
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
        if (showHeatmap) return null;
        
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

    }, [pmParkings, showHeatmap, navStep, setNavStep, setRouteDestination, currentLevel, mapBounds]);

    const findNearestPM = () => {
        if (!userLocation || tagoPms.length === 0) {
            speak("현재 위치를 찾을 수 없거나 주변에 킥보드가 없습니다.");
            return;
        }

        setIsFollowMode(false);

        let nearestPM = null;
        let minDistance = Infinity;

        tagoPms.forEach(pm => {
            const dist = calculateDistance(userLocation.lat, userLocation.lng, pm.lat, pm.lng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestPM = pm;
            }
        });

        if (nearestPM) {
            setMapCenter({ lat: nearestPM.lat, lng: nearestPM.lng });
            setSelectedLocation(nearestPM);
            speak(`가장 가까운 킥보드를 찾았습니다. 거리 약 ${Math.round(minDistance)}미터 앞, 배터리 ${nearestPM.battery}퍼센트 입니다.`);
        }
    };

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
        if (showHeatmap) return;

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

    const handleShareApp = async () => {
        const shareData = {
            title: 'C-Safe 천안 PM 안전 지도',
            text: '제가 주로 쓰는 전동 킥보드 안전 지도 앱 C-Safe입니다! 합법 주차장 찾고 킥보드 탈 때 안전하게 이용해보세요 🛴✨',
            url: window.location.origin
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                toast(`🔗 공유 링크 복사됨 — ${shareData.url}`, 'info');
                navigator.clipboard.writeText(shareData.url);
            }
        } catch (err) {
            console.error('공유 실패:', err);
        }
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

                    {!showHeatmap && (
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
                    )}

                    {!showHeatmap && Array.isArray(data) && data.filter(loc => loc.type !== 'available_pm').map((loc) => (
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
                        <CustomOverlayMap key={`parking-${idx}`} position={{ lat: parking.lat, lng: parking.lng }} yAnchor={1} zIndex={2}>
                            <div
                                onClick={() => handleMarkerClick({ id: `parking-${idx}`, lat: parking.lat, lng: parking.lng, title: parking.locationName, desc: `주차가능 대수: ${parking.capacity}`, type: 'parking' })}
                                className="w-8 h-8 rounded-full bg-cyan-600 border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.8)] hover:scale-110 transition-transform cursor-pointer relative"
                            >
                                <div className="absolute -bottom-1 h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-cyan-600"></div>
                                <span className="text-white font-black text-sm">P</span>
                            </div>
                        </CustomOverlayMap>
                    ))}

                    {showHeatmap && accidentData.map((acc) => {
                        const isSelected = selectedDangerZone?.id === acc.id;
                        const color = acc.intensity === 'HIGH' ? '#ef4444' : acc.intensity === 'MEDIUM' ? '#f87171' : '#fca5a5';
                        return (
                            <React.Fragment key={`danger-${acc.id}`}>
                                <Circle
                                    center={{ lat: acc.lat, lng: acc.lng }}
                                    radius={acc.radius}
                                    strokeWeight={isSelected ? 3 : 2}
                                    strokeColor="#ef4444"
                                    strokeOpacity={0.9}
                                    fillColor="#ef4444"
                                    fillOpacity={isSelected ? 0.45 : 0.3}
                                    onClick={() => setSelectedDangerZone(isSelected ? null : acc)}
                                />
                                {!isSelected && (
                                    <CustomOverlayMap position={{ lat: acc.lat, lng: acc.lng }} yAnchor={0.5} zIndex={20}>
                                        <div
                                            onClick={() => setSelectedDangerZone(acc)}
                                            className="pointer-events-auto cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-black shadow-lg border border-white/20"
                                            style={{ background: `${color}dd` }}
                                        >
                                            ⚠️ {acc.intensity === 'HIGH' ? '위험' : acc.intensity === 'MEDIUM' ? '주의' : '유의'}
                                        </div>
                                    </CustomOverlayMap>
                                )}
                            </React.Fragment>
                        );
                    })}

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
                                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${navStep === 'select_origin' ? 'border-cyber-cyan bg-cyber-cyan/20' : 'border-white/10 bg-white/10'}`}>
                                    <div className={`w-3 h-3 rounded-full ${routeOrigin ? 'bg-cyber-cyan shadow-neon-cyan' : 'bg-gray-600 animate-pulse'}`} />
                                    <span className={`text-sm font-bold ${routeOrigin ? 'text-white' : 'text-gray-300'}`}>{routeOrigin ? routeOrigin.title : '출발지 선택 중...'}</span>
                                </div>
                                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${navStep === 'select_destination' ? 'border-orange-500 bg-orange-500/20' : 'border-white/10 bg-white/10'}`}>
                                    <div className={`w-3 h-3 rounded-full ${routeDestination ? 'bg-orange-500 shadow-neon-orange' : 'bg-gray-600'}`} />
                                    <span className={`text-sm font-bold ${routeDestination ? 'text-white' : 'text-gray-300'}`}>{routeDestination ? routeDestination.title : '목적지 선택 중...'}</span>
                                </div>
                            </div>
                            {navStep === 'route_ready' && (
                                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl p-3">
                                            <p className="text-[10px] font-black text-cyber-cyan uppercase tracking-widest mb-1">Safety Index</p>
                                            <p className="text-lg font-black text-white italic">98% <span className="text-[10px] not-italic text-gray-400">Stable</span></p>
                                        </div>
                                        <div className="bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-3">
                                            <p className="text-[10px] font-black text-cyber-green uppercase tracking-widest mb-1">Eco Saving</p>
                                            <p className="text-lg font-black text-white italic">0.4 <span className="text-[10px] not-italic text-gray-400">kg CO2</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                                            <AlertTriangle size={14} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Route Caution</p>
                                            <p className="text-[11px] text-gray-300 font-bold leading-tight">경로 상에 급경사 구간이 1곳 포함되어 있습니다. 브레이크 점검 후 출발하세요.</p>
                                        </div>
                                    </div>
                                    <button onClick={onRouteReady} className="w-full py-4 bg-cyber-green text-black font-black rounded-xl hover:bg-emerald-400 transition-all shadow-neon-green flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                                        <Zap size={16} className="fill-black" />
                                        Start Safe Ride
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Fab Group */}
                <div className="absolute bottom-36 right-4 flex flex-col gap-3 pointer-events-auto">
                    <button onClick={handleShareApp} className="w-10 h-10 rounded-xl bg-gray-900/80 backdrop-blur-md text-white border border-white/10 flex items-center justify-center active:scale-90 transition-all"><Share2 size={18} /></button>
                    <button onClick={() => setShowPMs(prev => !prev)} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${showPMs ? 'text-cyber-cyan border-cyber-cyan/50 shadow-neon-cyan' : 'text-white border-white/10 bg-gray-900/80'}`}><Zap size={18} className={showPMs ? "fill-cyber-cyan" : "fill-white/30"} /></button>
                    <div className="h-[1px] w-6 bg-white/10 mx-auto" />
                    <button onClick={locateMe} className={`w-12 h-12 rounded-2xl shadow-neon-blue flex items-center justify-center active:scale-90 transition-all border-2 ${isFollowMode ? 'bg-blue-500 text-white border-white' : 'bg-gray-900/90 text-blue-400 border-blue-500/30'}`}><LocateFixed size={24} className={isFollowMode ? 'animate-pulse' : ''} /></button>
                </div>

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
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapContainer;
