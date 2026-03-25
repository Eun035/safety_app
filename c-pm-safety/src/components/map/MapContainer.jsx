import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Map, MapMarker, Circle, Polyline, useKakaoLoader, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { useVoiceGuidance } from '../../hooks/useVoiceGuidance';
import InfoCard from './InfoCard';
import { AlertTriangle, MapPin, Navigation, Info, ShieldAlert, Zap, LocateFixed, Share2 } from 'lucide-react';
import accidentData from '../../data/accidentHeatmap.json';
import { useGeolocation } from '../../hooks/useGeolocation';
import { calculateDistance } from '../../utils/distance';

import usePMParkingData from '../../hooks/usePMParkingData';
import stationData from '../../data/station_data.json';

const MapContainer = ({ data, tagoPms = [], showHeatmap, selectedLocation, setSelectedLocation, onStationClick }) => {
    const mapRef = useRef(null);
    const { speak } = useVoiceGuidance();
    const [map, setMap] = useState(null);
    const pmParkings = usePMParkingData();
    const [pmStations, setPmStations] = useState([]);
    const [mapCenter, setMapCenter] = useState({ lat: 36.833, lng: 127.179 });
    const [isFollowMode, setIsFollowMode] = useState(true);
    const [highlightedStationId, setHighlightedStationId] = useState(null);

    // 1. 카카오맵 SDK 로딩
    const [loading, error] = useKakaoLoader({
        appkey: import.meta.env.VITE_KAKAO_API_KEY,
        libraries: ['services', 'clusterer', 'drawing'],
    });

    // Phase 12: Real-time PM Station Fetching

    const { location: userLocation, error: geoError, isTracking, startTracking } = useGeolocation();

    useEffect(() => {
        // 컴포넌트 마운트 시 위치 추적 시작
        startTracking();
    }, []);

    // Phase 26: Kakao Maps BICYCLE Layer Overlay 활성화
    useEffect(() => {
        if (map && window.kakao) {
            map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE);
        }
    }, [map]);

    useEffect(() => {
        // 사용자 위치가 변하고, 팔로우 모드일 때만 지도 중심 이동
        if (userLocation && isFollowMode && mapRef.current) {
            setMapCenter(userLocation);
        }
    }, [userLocation, isFollowMode]);

    // 사용자가 지도를 드래그하면 팔로우 모드 해제
    const handleDragStart = () => {
        setIsFollowMode(false);
    };

    // 내 위치 버튼 클릭 시
    const locateMe = () => {
        setIsFollowMode(true);
        if (userLocation) {
            setMapCenter(userLocation);
        }
    };

    // Phase 24: AI Nearest PM Recommendation
    const findNearestPM = () => {
        if (!userLocation || tagoPms.length === 0) {
            speak("현재 위치를 찾을 수 없거나 주변에 킥보드가 없습니다.");
            return;
        }

        setIsFollowMode(false); // 추천 기기를 자유롭게 볼 수 있도록 팔로우 모드 해제

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
            speak(`가장 가까운 킥보드를 찾았습니다.거리 약 ${Math.round(minDistance)}미터 앞, 배터리 ${nearestPM.battery}퍼센트 입니다.`);
            // mapRef.current가 유효하면 부드럽게 레벨 변경 기능을 쓸 수도 있음. (지금은 카카오맵 리액트 래퍼가 속성을 제어함)
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
                        location: new window.kakao.maps.LatLng(36.833, 127.179), // 단대호수 기준
                        radius: 5000, // 5km 반경 (더 넓게 확장하여 무조건 결과가 나오도록)
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

            // 검색 범위를 대폭 넓히고, 주차장(PK6), 지하철역(SW8) 및 공원 키워드를 복합 사용하여 데이터 보장
            Promise.all([
                fetchPlaces('공원'),
                fetchPlaces('대학교'),
                fetchCategory('PK6') // 주차장
            ]).then((results) => {
                const allResults = results.flat();

                const formatted = allResults.map(item => ({
                    id: `pm - ${item.id} `,
                    title: `${item.place_name} (PM / 공용 주차 / 대여소)`,
                    lat: Number(item.y),
                    lng: Number(item.x),
                    type: 'PM_STATION',
                    desc: item.road_address_name || item.address_name,
                    safetyTip: '실시간 API 연동 구역: 올바른 주차 문화를 만들어가요.'
                }));

                // 중복 제거 및 최대 30개로 제한
                const uniqueStations = formatted.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 30);
                setPmStations(uniqueStations);
            });
        }
    }, [loading, error]);

    // Phase 26: 안전 경고는 App.jsx의 useHazardWarning 훅이 실시간 처리하므로, MapContainer 내 OSRM 라우팅 렌더링은 삭제됨.

    // 마커 클릭 핸들러
    const handleMarkerClick = (location) => {
        if (showHeatmap) return;
        setHighlightedStationId(null); // 다른 마커 클릭 시 하이라이트 해제
        setSelectedLocation(location);
        speak(`${location.title || ''} 지역입니다.${location.desc || ''}. ${location.safetyTip || ''} `);
    };

    // Phase 35: Share App
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
                alert(`앱 공유 링크가 복사되었습니다!\n${shareData.url} `);
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
        <div className="relative w-full h-full">
            <Map
                center={mapCenter}
                level={4}
                style={{ width: '100%', height: '100%' }}
                ref={mapRef}
                onDragStart={handleDragStart}
                onCreate={setMap}
                onClick={() => setHighlightedStationId(null)}
            >
                {/* Phase 23: Real-time User Location (Blue Neon Pulse) */}
                {userLocation && (
                    <CustomOverlayMap
                        position={userLocation}
                        yAnchor={0.5}
                        zIndex={10}
                    >
                        <div className="relative flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_20px_rgba(59,130,246,1)] z-10" />
                            <div className="absolute w-12 h-12 bg-blue-400 rounded-full opacity-30 animate-ping" />
                        </div>
                    </CustomOverlayMap>
                )}

                {/* 일반 안전 데이터 마커 (경고/주의 표지판) */}
                {!showHeatmap && Array.isArray(data) && data.filter(loc => loc.type !== 'available_pm').map((loc) => (
                    <MapMarker
                        key={`safety - ${loc.id} `}
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

                {/* Phase 21: Real-time TAGO Public PM Data (Neon Fuchsia Mark) */}
                {!showHeatmap && Array.isArray(tagoPms) && tagoPms.map((loc) => (
                    <CustomOverlayMap
                        key={loc.id}
                        position={{ lat: loc.lat, lng: loc.lng }}
                        yAnchor={0.5}
                        zIndex={2}
                    >
                        <div
                            onClick={() => handleMarkerClick(loc)}
                            className="w-6 h-6 bg-fuchsia-500 border-[2px] border-white rounded-full shadow-[0_0_15px_rgba(217,70,239,0.9)] cursor-pointer hover:scale-125 transition-all flex flex-col items-center justify-center animate-bounce"
                            title={`${loc.operator} - 배터리: ${loc.battery}% `}
                        >
                            <Zap size={10} className="text-white fill-white" />
                        </div>
                    </CustomOverlayMap>
                ))}

                {/* Phase 12: 실시간 PM 스테이션 (초록색 네온 커스텀 마커) */}
                {!showHeatmap && pmStations.map((station) => (
                    <CustomOverlayMap
                        key={station.id}
                        position={{ lat: station.lat, lng: station.lng }}
                        yAnchor={1} // 마커 꼭지점이 핀에 맞도록 조정
                        zIndex={1}
                    >
                        <div
                            onClick={() => handleMarkerClick(station)}
                            className="w-10 h-10 bg-cyber-panel/90 border-2 border-cyber-green rounded-full flex flex-col items-center justify-center shadow-neon-green cursor-pointer hover:scale-110 hover:bg-black transition-all relative"
                        >
                            <div className="absolute -bottom-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyber-green"></div>
                            <Zap size={20} className="text-cyber-green fill-cyber-green/50" />
                        </div>
                    </CustomOverlayMap>
                ))}

                {/* O2O 제휴 헬멧 스테이션 (오렌지 마커) */}
                {!showHeatmap && stationData.map((station) => {
                    const isHighlighted = highlightedStationId === station.id;
                    return (
                        <CustomOverlayMap
                            key={station.id}
                            position={{ lat: station.lat, lng: station.lng }}
                            yAnchor={1}
                            zIndex={isHighlighted ? 40 : 3}
                        >
                            <div
                                onClick={() => {
                                    setHighlightedStationId(station.id);
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

                {/* PM 주차장 (민트색 P 마커) */}
                {!showHeatmap && Array.isArray(pmParkings) && pmParkings.map((parking, idx) => (
                    <CustomOverlayMap
                        key={`parking-${idx}`}
                        position={{ lat: parking.lat, lng: parking.lng }}
                        yAnchor={1}
                        zIndex={2}
                    >
                        <div
                            onClick={() => {
                                handleMarkerClick({
                                    id: `parking-${idx}`,
                                    title: parking.locationName,
                                    desc: `주차가능 대수: ${parking.capacity}`,
                                    type: 'parking'
                                });

                                // 가장 가까운 헬멧 스테이션 찾기 (반경 50m)
                                let nearest = null;
                                let minDist = Infinity;
                                stationData.forEach(s => {
                                    const dist = calculateDistance(parking.lat, parking.lng, s.lat, s.lng);
                                    if (dist < minDist) {
                                        minDist = dist;
                                        nearest = s;
                                    }
                                });

                                if (nearest && minDist <= 50) {
                                    setHighlightedStationId(nearest.id);
                                    speak(`${parking.locationName} 주차장입니다. 바로 옆 편의점 반납 스테이션을 이용해 추가 리워드를 받으세요!`);
                                }
                            }}
                            className="w-8 h-8 rounded-full bg-cyan-600 border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.8)] hover:scale-110 transition-transform cursor-pointer relative"
                        >
                            <div className="absolute -bottom-1 h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-cyan-600"></div>
                            <span className="text-white font-black text-sm">P</span>
                        </div>
                    </CustomOverlayMap>
                ))}

                {/* 사고 다발 구역 히트맵 */}
                {showHeatmap && accidentData.map((acc) => (
                    <Circle
                        key={`acc - ${acc.id} `}
                        center={{ lat: acc.lat, lng: acc.lng }}
                        radius={acc.radius}
                        strokeWeight={2}
                        strokeColor="#FF0000"
                        strokeOpacity={0.8}
                        fillColor="#FF0000"
                        fillOpacity={0.4}
                    />
                ))}
            </Map>

            {/* Fab Group (Right Bottom) */}
            <div className="absolute bottom-[220px] right-4 flex flex-col gap-3 z-[100]">
                {/* Phase 35: App Share FAB */}
                <button
                    onClick={handleShareApp}
                    className="p-4 rounded-full shadow-2xl transition-all bg-[#1a1a1a] text-cyber-cyan border border-cyber-cyan/30 hover:border-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-neon-cyan"
                    title="앱 공유하기"
                >
                    <Share2 size={24} className="fill-cyber-cyan/30" />
                </button>

                {/* Phase 24: Find Nearest PM FAB */}
                <button
                    onClick={findNearestPM}
                    className="p-4 rounded-full shadow-2xl transition-all bg-[#1a1a1a] text-purple-400 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    title="가장 가까운 PM 찾기"
                >
                    <Zap size={24} className="fill-purple-500/50" />
                </button>

                {/* Phase 23: Locate Me FAB */}
                <button
                    onClick={locateMe}
                    className={`p-4 rounded-full shadow-2xl transition-all border ${isFollowMode
                        ? 'bg-blue-900/40 text-blue-400 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)]'
                        : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-blue-400/50 hover:bg-blue-900/20'
                        }`}
                    title="내 위치 찾기"
                >
                    <LocateFixed size={24} className={isFollowMode ? 'animate-pulse' : ''} />
                </button>
            </div>

            <div className="flex justify-center flex-col absolute bottom-0 w-full z-10 pointer-events-none pb-24 px-4">
                <div className="w-full max-w-lg mx-auto pointer-events-auto">
                    <InfoCard
                        location={selectedLocation}
                        onClose={() => setSelectedLocation(null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default MapContainer;
