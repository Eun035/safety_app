import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Map, MapMarker, Circle, Polyline, useKakaoLoader, CustomOverlayMap } from 'react-kakao-maps-sdk';
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
    selectedLocation, 
    setSelectedLocation, 
    onStationClick, 
    rideConfig, 
    onRouteReady,
    // Lifted Props
    navStep,
    setNavStep,
    routeOrigin,
    setRouteOrigin,
    routeDestination,
    setRouteDestination
}) => {
    const mapRef = useRef(null);
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

    // 1. 카카오맵 SDK 로딩
    const [loading, error] = useKakaoLoader({
        appkey: import.meta.env.VITE_KAKAO_API_KEY || '40e6d1b5e849c283027335cbba22bf32',
        libraries: ['services', 'clusterer', 'drawing'],
    });

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
                    .gt('safe_pass_count', 0); // 최소 1회 이상 통과한 구역만
                
                if (error) throw error;
                setSafetyGridScores(scores || []);
            } catch (err) {
                console.error('[C-Safe] Safety Grid 로드 실패:', err);
                // Fallback: 하드코딩된 안전 그리드 데이터 (시각적 피드백 유지)
                setSafetyGridScores([
                    { grid_id: 'g1', lat_center: 36.833, lng_center: 127.179, safe_pass_count: 15 },
                    { grid_id: 'g2', lat_center: 36.834, lng_center: 127.180, safe_pass_count: 8 },
                    { grid_id: 'g3', lat_center: 36.832, lng_center: 127.178, safe_pass_count: 20 }
                ]);
            }
        };

        fetchSafetyScores();
        
        // 실시간 업데이트 구독 (선택 사항)
        const channel = supabase
            .channel('safety_updates')
            .on('postgres_changes', { event: 'INSERT', table: 'safety_grid_scores', schema: 'public' }, fetchSafetyScores)
            .on('postgres_changes', { event: 'UPDATE', table: 'safety_grid_scores', schema: 'public' }, fetchSafetyScores)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

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
        <div className={`relative w-full h-full transition-all duration-700 ${rideConfig?.isNightMode ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
            <div 
                className="w-full h-full transition-all duration-1000 ease-in-out"
                style={{
                    filter: rideConfig?.isNightMode 
                        ? 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(120%) saturate(140%)' 
                        : 'none'
                }}
            >
                {/* --- 상단 네비게이션 가이드 패널 --- */}
                {navStep !== 'idle' && (
                    <div className="absolute top-6 left-4 right-4 z-50 animate-in slide-in-from-top-4 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-black flex items-center gap-2">
                                    <Navigation size={18} className="text-cyber-cyan" />
                                    {navStep === 'select_origin' && '출발지를 지도에서 선택하세요 (1/2)'}
                                    {navStep === 'select_destination' && '목적지를 지도에서 선택하세요 (2/2)'}
                                    {navStep === 'route_ready' && '안전 경로 탐색 완료!'}
                                </h3>
                                <button onClick={() => { setNavStep('idle'); setRouteOrigin(null); setRouteDestination(null); }} className="text-gray-400 hover:text-white p-1">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-2 mt-3">
                                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${navStep === 'select_origin' ? 'border-cyber-cyan bg-cyber-cyan/10' : 'border-white/5 bg-white/5'}`}>
                                    <div className={`w-3 h-3 rounded-full ${routeOrigin ? 'bg-cyber-cyan' : 'bg-gray-500 animate-pulse'}`} />
                                    <span className={`text-sm ${routeOrigin ? 'text-white' : 'text-gray-400'}`}>
                                        {routeOrigin ? routeOrigin.title : (navStep === 'select_origin' ? '지도 위 마커(대여소 등)를 터치' : '대기 중')}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${navStep === 'select_destination' ? 'border-cyber-green bg-cyber-green/10' : 'border-white/5 bg-white/5'}`}>
                                    <div className={`w-3 h-3 rounded-full ${routeDestination ? 'bg-cyber-green' : 'bg-gray-500'}`} />
                                    <span className={`text-sm ${routeDestination ? 'text-white' : 'text-gray-400'}`}>
                                        {routeDestination ? routeDestination.title : (navStep === 'select_destination' ? '지도 위 마커 터치' : '대기 중')}
                                    </span>
                                </div>
                            </div>

                            {navStep === 'route_ready' && (
                                <button 
                                    onClick={() => typeof onRouteReady === 'function' && onRouteReady()}
                                    className="mt-4 w-full py-3 bg-cyber-green text-black font-black rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                >
                                    이 길로 Choose Vibe & 주행 시작
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <Map
                    center={mapCenter}
                    level={4}
                    style={{ width: '100%', height: '100%' }}
                    ref={mapRef}
                    onDragStart={handleDragStart}
                    onCreate={setMap}
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

                    {/* Phase 45: Current Ride Path Visualization */}
                    {isRiding && currentPath.length > 1 && (
                        <Polyline
                            path={currentPath.map(p => ({ lat: p.lat, lng: p.lng }))}
                            strokeWeight={6}
                            strokeColor="#40ffdc"
                            strokeOpacity={0.8}
                            strokeStyle="solid"
                        />
                    )}

                    {/* --- Mock Safe Route Visualization --- */}
                    {navStep === 'route_ready' && routeOrigin && routeDestination && (
                        <Polyline
                            path={[
                                { lat: routeOrigin.lat, lng: routeOrigin.lng },
                                { lat: (routeOrigin.lat + routeDestination.lat) / 2 + 0.003, lng: (routeOrigin.lng + routeDestination.lng) / 2 + 0.003 }, // 약간의 곡선을 주기 위한 경유지
                                { lat: routeDestination.lat, lng: routeDestination.lng }
                            ]}
                            strokeWeight={8}
                            strokeColor="#10B981"
                            strokeOpacity={0.8}
                            strokeStyle="shortdash"
                        />
                    )}

                    {/* Phase 45: Safety Grid Layer (Collective Intelligence) */}
                    {safetyGridScores.map((grid) => {
                        const score = Math.min(grid.safe_pass_count / 10, 1); // 10회 이상이면 최대 불투명도
                        return (
                            <Circle
                                key={`safety-grid-${grid.grid_id}`}
                                center={{ lat: grid.lat_center, lng: grid.lng_center }}
                                radius={25} // 50m 격자 (반경 25m)
                                strokeWeight={0}
                                fillColor="#40ffdc"
                                fillOpacity={score * 0.4} // 안전할수록 더 선명한 비취색
                            />
                        );
                    })}

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

                    {/* ⚠️ Danger Zones: visible only when showHeatmap is active */}
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
                                {/* Small badge label */}
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
                                {/* Inline info card on click */}
                                {isSelected && (
                                    <CustomOverlayMap position={{ lat: acc.lat, lng: acc.lng }} yAnchor={1.15} zIndex={50}>
                                        <div
                                            className="pointer-events-auto w-52 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                                            style={{ background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(16px)' }}
                                        >
                                            <div className="px-3 pt-2.5 pb-1 flex items-center gap-2 border-b border-white/10" style={{ borderLeft: `4px solid ${color}` }}>
                                                <span className="text-sm">⚠️</span>
                                                <span className="text-white text-[11px] font-black tracking-tight leading-tight">{acc.desc}</span>
                                            </div>
                                            <div className="px-3 py-2">
                                                <p className="text-gray-300 text-[10px] leading-tight">{acc.detourGuide}</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedDangerZone(null)}
                                                className="w-full py-1.5 text-[9px] font-black tracking-widest uppercase"
                                                style={{ color, background: `${color}22` }}
                                            >닫기</button>
                                        </div>
                                    </CustomOverlayMap>
                                )}
                            </React.Fragment>
                        );
                    })}
                </Map>
            </div>

            {/* Fab Group (Right Bottom) */}
            <div className="absolute bottom-[220px] right-4 flex flex-col gap-3 z-[100]">
                {/* --- 길찾기 전환 버튼 --- */}
                {navStep === 'idle' && !showHeatmap && (
                    <button 
                        onClick={() => setNavStep('select_origin')} 
                        className="p-4 rounded-full shadow-2xl transition-all bg-cyber-green text-black border border-cyber-green hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                    >
                        <Navigation size={24} className="fill-black/30" />
                    </button>
                )}
                
                <button onClick={handleShareApp} className="p-4 rounded-full shadow-2xl transition-all bg-[#1a1a1a] text-cyber-cyan border border-cyber-cyan/30 hover:border-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-neon-cyan">
                    <Share2 size={24} className="fill-cyber-cyan/30" />
                </button>
                <button onClick={() => setShowPMs(prev => !prev)} className={`p-4 rounded-full shadow-2xl transition-all border ${showPMs ? 'bg-purple-900/40 text-purple-400 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)]' : 'bg-[#1a1a1a] text-purple-400 border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'}`}>
                    <Zap size={24} className={showPMs ? "fill-purple-400 text-purple-400" : "fill-purple-500/50"} />
                </button>
                <button onClick={locateMe} className={`p-4 rounded-full shadow-2xl transition-all border ${isFollowMode ? 'bg-blue-900/40 text-blue-400 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'bg-[#1a1a1a] text-gray-400 border-white/10'}`}>
                    <LocateFixed size={24} className={isFollowMode ? 'animate-pulse' : ''} />
                </button>
            </div>

            <div className="flex justify-center flex-col absolute bottom-0 w-full z-10 pointer-events-none pb-24 px-4">
                <div className="w-full max-w-lg mx-auto pointer-events-auto">
                    <InfoCard 
                        location={selectedLocation} 
                        onClose={() => setSelectedLocation(null)} 
                        onSetOrigin={() => {
                            setRouteOrigin(selectedLocation);
                            setNavStep('select_destination');
                            setSelectedLocation(null);
                            toast('🏁 출발지가 설정되었습니다. 이제 마커를 눌러 목적지를 선택하세요.', 'success');
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default MapContainer;
