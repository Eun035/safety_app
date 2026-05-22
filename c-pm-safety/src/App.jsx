import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, Cloud, AlertTriangle, MapPin, Moon, Activity,
  Layers, Play, Camera, Navigation, Search, Star,
  Calendar, Phone, Zap, TrendingUp, RefreshCw, Download,
  Database, User, Map as MapIcon, Sliders, Box, Wallet,
  Unlock, Leaf, X, Compass, Sparkles, HeartPulse, LocateFixed, Share2,
  Settings, Users
} from 'lucide-react';


import ErrorBoundary from './components/common/ErrorBoundary';
import MapContainer from './components/map/MapContainer';
import SafetyQuiz from './components/quiz/SafetyQuiz';
import MapSearchBar from './components/map/MapSearchBar';


import SplashScreen from './components/common/SplashScreen';
import LanguageSelectorScreen from './components/common/LanguageSelectorScreen';
import DisclaimerModal from './components/common/DisclaimerModal';
import SOSButton from './components/common/SOSButton';
import EmergencyModal from './components/common/EmergencyModal';
import ParkingVerification from './components/common/ParkingVerification';
import PersonalInsights from './components/common/PersonalInsights';
import RideSettings from './components/common/RideSettings';
import QRScanner from './components/common/QRScanner';
import VibeRouteSelector from './components/map/VibeRouteSelector';
import RideSummaryModal from './components/common/RideSummaryModal';
import FavoriteStations from './components/common/FavoriteStations';
import PaymentReceiptModal from './components/common/PaymentReceiptModal';
import HelmetDetectionCamera from './components/common/HelmetDetectionCamera';
import ESGDashboard from './components/common/ESGDashboard';
import ShadowImpactSheet from './components/common/ShadowImpactSheet';
import UserProfileSheet from './components/common/UserProfileSheet';
import RewardWalletSheet from './components/common/RewardWalletSheet';
import AdminDashboard from './components/admin/AdminDashboard';
import { useSafeData } from './hooks/useSafeData';
import { useVoiceGuidance } from './hooks/useVoiceGuidance';
import { useRideSession } from './hooks/useRideSession';
import { useSafetyGrid } from './hooks/useSafetyGrid';
import StationRewardModal from './components/common/StationRewardModal';
import DropAndGoModal from './components/common/DropAndGoModal';
import StationUnlockScreen from './components/common/StationUnlockScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useHazardWarning } from './hooks/useHazardWarning';
import HazardAlertOverlay from './components/common/HazardAlertOverlay';
import HardwareStatusOverlay from './components/common/HardwareStatusOverlay';
import DrivingConsoleUI from './components/common/DrivingConsoleUI';
import ProfileEditModal from './components/common/ProfileEditModal';
import VehicleSelectModal from './components/common/VehicleSelectModal';


import pmParkingData from './data/pm_parking_data.json';
import { calculateDistance } from './utils/distance';
import { useUserStore } from './hooks/useUserStore';
import { useGeolocation } from './hooks/useGeolocation';
import { calculateStopDistance } from './utils/physics';
import DigitalTwinIndicator from './components/common/DigitalTwinIndicator';
import ToastContainer from './components/common/ToastContainer';
import { supabase } from './lib/supabaseClient';
import { toast } from './hooks/useToast';


// 🌋 보행자 스트레스 존 정의 (관리자 설정 데이터와 연동됨)
// 컴포넌트 외부 상수로 두어 매 렌더마다 재생성 → useEffect 재실행되는 것을 방지
const STRESS_ZONES = [
  { id: 's1', lat: 36.833, lng: 127.179, radius: 150, name: "단국대 정문 보행자 보호구역" },
  { id: 's2', lat: 36.818, lng: 127.156, radius: 200, name: "종합터미널 보행자 밀집구역" }
];

function App() {
  const { t, i18n } = useTranslation();
  const { locations, tagoPms, weatherRisk, currentTemp, isLoading: mapLoading } = useSafeData();
  const { user, profile, isLoading: authLoading, signInAnonymously, loadUser } = useUserStore();

  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false); // New: FAB Menu State
  const [showStressLayer, setShowStressLayer] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isShadowSheetOpen, setIsShadowSheetOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isDrivingConsoleOpen, setIsDrivingConsoleOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [gpsFollowMode, setGpsFollowMode] = useState(true); // 🛰️ GPS 추적 모드 상태 추가
  const [panToLocation, setPanToLocation] = useState(null); // New: Signal for map movement
  const [showPMs, setShowPMs] = useState(false);
  const [coupons, setCoupons] = useLocalStorage('coupons', []);

  // Phase 15 & 19: Mandatory Onboarding & Disclaimer (Forced to run every session for presentation)
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [hasAgreedDisclaimer, setHasAgreedDisclaimer] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);


  // Phase 35: Lightweight Ride Session & Static Safety Grid
  const { isRiding, startRide, endRideSession, updateMetrics, totalDistance, suddenBrakeCount, isHardwareSyncing, historyMetrics, loadHistory, rideHistory, currentPath } = useRideSession();

  // Static location fallback for testing / permissions denied
  const DEFAULT_LAT = 36.833;
  const DEFAULT_LNG = 127.179;

  // Phase 38: Realtime Geolocation Tracker
  const { location, startTracking, stopTracking } = useGeolocation();

  // 현재 위치 좌표 (GPS 수신 중이면 실시간 위치, 아니면 단국대 앞 모킹 위치)
  const userLat = location?.lat || DEFAULT_LAT;
  const userLng = location?.lng || DEFAULT_LNG;

  const { borderColor: gridBorderColor = '#40ffdc' } = useSafetyGrid(userLat, userLng);

  // 실시간 안정성 지수 (0~100): 과속/급제동에 비례해 감점
  // - 과속 1km/h당 5점 감점 (자전거 모드는 과속 평가 제외)
  // - 급제동 1회당 10점 감점
  const stability = React.useMemo(() => {
    const speedNum = Number(location?.speed) || 0;
    const overSpeed = rideConfig.isBicycleMode
      ? 0
      : Math.max(0, speedNum - rideConfig.speedLimit);
    const raw = 100 - overSpeed * 5 - (suddenBrakeCount || 0) * 10;
    return Math.round(Math.max(0, Math.min(100, raw)));
  }, [location?.speed, rideConfig.speedLimit, rideConfig.isBicycleMode, suddenBrakeCount]);

  // Helper variables to match old `currentMetrics` prop
  const currentMetrics = {
    mileage: totalDistance.toFixed(2),
    savedCarbon: (totalDistance * 0.2).toFixed(1),
    speed: location?.speed || 0,
    stability
  };
  const { speak } = useVoiceGuidance();

  // 각 스트레스 존에 "현재 안에 있는지" 를 기억해 진입 순간에만 1회 안내
  const stressZoneInsideRef = React.useRef({});

  // 실시간 위치 감시를 통한 스트레스 존 진입 감지 (Haversine + 진입 엣지 트리거)
  useEffect(() => {
    if (!isRiding || !location) {
      // 주행 종료 시 상태 리셋 → 다음 주행에서 다시 진입 시 알람
      stressZoneInsideRef.current = {};
      return;
    }

    STRESS_ZONES.forEach(zone => {
      const dist = calculateDistance(location.lat, location.lng, zone.lat, zone.lng);
      const wasInside = stressZoneInsideRef.current[zone.id] || false;
      const isInside = dist < zone.radius;

      if (isInside && !wasInside) {
        speak(`${zone.name}에 진입했습니다. 보행자 보호를 위해 감속해 주세요.`);
      }
      stressZoneInsideRef.current[zone.id] = isInside;
    });
  }, [location, isRiding, speak]);

  const [showEcoBadge, setShowEcoBadge] = useState(false);
  const [isVibeRouteOpen, setIsVibeRouteOpen] = useState(false);
  const [currentVibeRoute, setCurrentVibeRoute] = useState({
    id: 'sunset',
    title: 'Riverside Chill',
    subTitle: '노을 맛집 (Sunset View)',
    preference: 'eco',
    drivingMode: 'CHILL'
  });


  const [parkingGeofenceModal, setParkingGeofenceModal] = useState({ isOpen: false, success: false });

  // Phase 26: Geofencing Hazard Warning Hook
  const { activeHazard } = useHazardWarning(locations);

  // Phase 17 & 18 & 35 & 40: Post-Ride Flow (With Payment)
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);
  const [isStationRewardOpen, setIsStationRewardOpen] = useState(false);
  const [isRideSummaryOpen, setIsRideSummaryOpen] = useState(false);
  const [finalRideSummary, setFinalRideSummary] = useState(null);
  const [isDropAndGoOpen, setIsDropAndGoOpen] = useState(false);
  const [selectedDropStation, setSelectedDropStation] = useState(null);
  const [isStationUnlockOpen, setIsStationUnlockOpen] = useState(false);

  // Phase Digital Twin: Indicator State
  const [isDigitalTwinOpen, setIsDigitalTwinOpen] = useState(false);
  const [isESGDashboardOpen, setIsESGDashboardOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [digitalTwinData, setDigitalTwinData] = useState(null);
  const [simSpeed, setSimSpeed] = useState(15);
  const [rideConfig, setRideConfig] = useState({
    brandFilters: [],
    isNightMode: true, // Always default to Dark Mode for premium feel
    isVoiceEnabled: true,
    speedLimit: 20,
    isBicycleMode: false
  });
  const [isRideSettingsOpen, setIsRideSettingsOpen] = useState(false);
  const [isVehicleSelectOpen, setIsVehicleSelectOpen] = useState(false);

  // Phase 45: Lifted Navigation / Route States from MapContainer
  const [navStep, setNavStep] = useState('idle'); // 'idle' | 'select_origin' | 'select_destination' | 'route_ready'
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [routeDestination, setRouteDestination] = useState(null);

  // Sync simulation speed with ride config
  useEffect(() => {
    setSimSpeed(rideConfig.speedLimit);
  }, [rideConfig.speedLimit]);

  // Phase 26: PWA Manual Install Prompt
  // Phase 26: PWA Manual Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const [showSplash, setShowSplash] = useState(true);
  const [, setRideSummaryPhoto] = useState(null);
  const [isHelmetAIOpen, setIsHelmetAIOpen] = useState(false);
  const [qrScanMode, setQrScanMode] = useState('station');
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);




  // 🚀 최적화: 무한 루프 방지를 위한 콜백 안정화
  const handleMapReady = React.useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleSplashComplete = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  // 🚀 배포 단계: 온보딩 상태 유지 (강제 초기화 코드 제거)
  useEffect(() => {
    console.log("[C-Safe] App Initialized. State persistence active.");
  }, []);

  // Phase 20: Emergency Splash Timeout (Fail-Safe)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSplash) {
        console.warn("[C-Safe] Emergency Splash Exit triggered.");
        setShowSplash(false);
        // 로딩이 멈춘 경우를 대비해 강제로 데이터 로딩 상태도 해제
        useUserStore.setState({ isLoading: false });
      }
    }, 5000); // 5초 후 강제 진입
    return () => clearTimeout(timer);
  }, [showSplash]);

  // Supabase Auth Init (익명 로그인 처리, 온보딩과 무관하게 최초 1회)
  useEffect(() => {
    const initAuth = async () => {
      await loadUser();
      const currentUser = useUserStore.getState().user;
      if (!currentUser) {
        await signInAnonymously();
      }
      const finalUser = useUserStore.getState().user;
      loadHistory(finalUser?.id); // 주행 기록 기반 지표 로드
    };
    initAuth();

    // 🚀 Fail-safe: 지도가 8초 안에 로드되지 않으면 강제로 진입 허용 (카카오맵 API 오류 대비)
    const mapTimeout = setTimeout(() => {
      setIsMapReady(prev => {
        if (!prev) {
          console.warn("[C-Safe] Map initialization timeout. Forcing entry.");
          return true;
        }
        return prev;
      });
    }, 8000);

    return () => clearTimeout(mapTimeout);
  }, []);

  useEffect(() => {
    console.log("PWA: Initializing Install Prompt listener...");

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      console.log("PWA: App is already running in standalone mode.");
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log("PWA: beforeinstallprompt event fired!");
      // Chrome 등 브라우저에서 기본으로 띄우는 설치 프롬프트 방지
      e.preventDefault();
      // 이벤트를 보관하여 나중에 트리거할 수 있게 함
      setDeferredPrompt(e);
      // 설치 버튼 활성화
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // Detect if inside an iframe (Streamlit wrapper)
    const isIframe = window.self !== window.top;

    if (!deferredPrompt) {
      if (isIframe) {
        if (confirm("현재 Streamlit 내 환경에서는 직접적인 앱 설치가 제한됩니다.\n설치를 위해 별도 새 창에서 앱을 여시겠습니까? (새 창에서 INSTALL 을 눌러보세요!)")) {
          window.open(window.location.href, '_blank');
        }
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        toast("Safari의 '공유' 아이콘 → '홈 화면에 추가'를 탭하여 설치해 주세요.", 'info');
      } else {
        toast("설치를 지원하지 않는 환경이거나 이미 설치되어 있습니다.", 'info');
      }
      return;
    }

    // 설치 프롬프트 표시
    deferredPrompt.prompt();

    // 사용자의 응답 대기
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User choice outcome: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('사용자가 PWA 설치를 수락했습니다.');
    } else {
      console.log('사용자가 PWA 설치를 거부했습니다.');
    }

    // 프롬프트는 한 번만 사용할 수 있으므로 초기화 및 버튼 숨김
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // Phase 45 & 46: 실시간 경로 추적 및 효율적인 안전 모니터링
  const lastLocationRef = React.useRef(null);
  const lastAlertTimeRef = React.useRef(0);

  useEffect(() => {
    if (!isRiding || !location?.lat) {
      lastLocationRef.current = null;
      return;
    }

    // --- 1. 경로 및 마일리지 추적 (기본 기능) ---
    let distanceDelta = 0;
    if (lastLocationRef.current) {
      distanceDelta = calculateDistance(
        lastLocationRef.current.lat,
        lastLocationRef.current.lng,
        location.lat,
        location.lng
      );
    }
    updateMetrics(distanceDelta, location.speed || 0, false, location);
    lastLocationRef.current = location;

    // --- 2. 물리 엔진 기반 안전 모니터링 (알람 기능) ---
    let surface = weatherRisk ? 'wet' : 'dry';
    if (activeHazard?.type === 'ICE') surface = 'ice';
    else if (activeHazard?.type === 'WET') surface = 'wet';
    else if (activeHazard?.type === 'TILE') surface = 'tile';

    const speed = location?.speed || 0;
    const reactionTime = historyMetrics?.avgReactionTime || 1.0;
    const result = calculateStopDistance(speed, activeHazard?.type === 'SLOPE' ? 10 : 0, reactionTime, surface);

    setDigitalTwinData({
      ...result,
      speed,
      incline: activeHazard?.type === 'SLOPE' ? 10 : 0,
      surface,
      reactionTime
    });

    // --- 3. 알람 임계치 체크 및 음성 안내 ---
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 5000) return; // 5초 쿨타임

    if (!rideConfig.isBicycleMode && speed > rideConfig.speedLimit) {
      speak(`과속입니다! 현재 ${Math.round(speed)}km입니다. 속도를 줄이세요.`);
      lastAlertTimeRef.current = now;
    } else if (result.riskLevel === 'danger') {
      speak(`위험! 제동 거리가 ${Math.round(result.totalDist)}미터입니다. 감속하세요.`);
      lastAlertTimeRef.current = now;
    }
  }, [isRiding, location, weatherRisk, activeHazard, rideConfig.speedLimit, rideConfig.isBicycleMode, speak, historyMetrics, updateMetrics]);

  const [showLangMenu, setShowLangMenu] = useState(false);

  // Phase 26: Debug 온보딩 초기화 함수
  const resetOnboarding = () => {
    setHasSelectedLanguage(false);
    setHasAgreedDisclaimer(false);
    setHasCompletedOnboarding(false);
    setNavStep('idle');
    setRouteOrigin(null);
    setRouteDestination(null);
    setShowSplash(true);
    toast("온보딩이 초기화되었습니다. 재시작합니다.", 'info');
  };

  // Vibe & Preference 기반 동적 TTS 안내 함수
  const announceVibeStart = (vibe) => {
    const prefNames = {
      safe: "안전 최우선 모드",
      eco: "유유자적 에코 모드",
      bike_lane: "자전거 도로 우선 모드",
      fastest: "최단 거리 모드"
    };

    const vibeNames = {
      sunset: "리버사이드 칠 노을 맛집 경로",
      quiet: "콰이어트 스트리트 가로수길 경로",
      urban: "스트리트 러너 도심 숏컷 경로"
    };

    const prefName = prefNames[vibe?.preference] || "유유자적 에코 모드";
    const vibeName = vibeNames[vibe?.id] || "안전 경로";
    const modeName = vibe?.drivingMode === 'FAST' ? "빠른 주행" : "여유로운 주행";

    speak(`${vibeName}, ${prefName}로 ${modeName}을 시작합니다. 안전 운행하세요!`);
  };

  const handleQRScanSuccess = (decodedText) => {
    setIsQRScannerOpen(false);

    if (qrScanMode === 'helmet') {
      // 내 헬멧 인증 (프로필에 등록된 헬멧 코드와 일치하는지 확인. 데모를 위해 안내문과 함께 통과)
      const newPoint = {
        id: Date.now(),
        shopName: '안전 인증 마일리지 (선지급)',
        amount: '+50P',
        issuedAt: new Date().toLocaleDateString(),
        type: '안전 보상',
        status: 'active'
      };
      setCoupons(prev => [newPoint, ...prev]);
      toast("✅ 안전모 착용 확인! 선지급 마일리지 50P 적립 완료", 'success');

      startRide();
      startTracking(); // 실제 GPS 트래킹 시작
      announceVibeStart(currentVibeRoute);
      return;
    }

    // Supabase 연동 (QR 제휴 장소 보너스 300P)
    if (user?.id) {
      const earnedPoints = 300;
      supabase.from('profiles').select('points').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            supabase.from('profiles').update({ points: (data.points || 0) + earnedPoints }).eq('id', user.id)
              .then(() => {
                toast(`🎉 안전 지식 테스트 완료! ${earnedPoints}P 적립`, 'success');
                loadUser(); // 프로필 새로고침
              });
          }
        });
    }

    const newPoint = {
      id: Date.now(),
      shopName: decodedText.includes('CAFE') ? '제휴 카페 A' : (decodedText || '단국대 주변 헬멧 스테이션'),
      amount: '+500P',
      issuedAt: new Date().toLocaleDateString(),
      type: '천안사랑카드',
      status: 'active'
    };

    setCoupons(prev => [newPoint, ...prev]);
    toast("🎁 보관 완료! 천안사랑카드 500P 적립", 'success');
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'C-Safe PM Safety',
        text: '안전한 개인용 이동장치 이용, C-Safe와 함께하세요!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      copyToClipboard(window.location.href);
      toast('🔗 앱 링크가 클립보드에 복사되었습니다.', 'info');
    }
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };



  const handleParkingComplete = async (photoUrl) => {
    setIsParkingOpen(false);
    if (photoUrl) setRideSummaryPhoto(photoUrl);

    if (isRiding) {
      stopTracking(); // 주차 완료 시 GPS 트래킹 중지

      // 운행 중이었다면 주차 인증 직후 운행 종료 처리 및 요약 화면 표출
      // Geofencing: 반경 10m 이내 주차장 검색 로직 (조용히 포인트만 지급하고 경고창은 간소화)
      let minDistance = Infinity;
      if (Array.isArray(pmParkingData)) {
        const distances = pmParkingData.map(p => calculateDistance(userLat, userLng, p.lat, p.lng));
        minDistance = distances.length > 0 ? Math.min(...distances) : Infinity;
      }

      if (minDistance <= 10) {
        speak("주차 확인 성공. 리워드 100포인트가 적립되었습니다. 주차를 종료합니다.");
      }

      const summary = await endRideSession(user?.id);
      if (summary) setFinalRideSummary(summary);
    } else {
      // Mock data if not actively riding, allowing UI testing
      setFinalRideSummary({
        distance: "12.4",
        time: "42",
        co2Saved: "2.4",
        topSpeed: "21.5",
        suddenBrakeCount: 0
      });
    }

    // Instead of RideSummaryModal directly, show Payment first
    setIsPaymentReceiptOpen(true);
  };

  const handlePaymentComplete = () => {
    setIsPaymentReceiptOpen(false);
    setIsStationRewardOpen(true);
  };

  if (!hasSelectedLanguage) {
    return <LanguageSelectorScreen onComplete={() => {
      speak('');
      setHasSelectedLanguage(true);
    }} />;
  }

  return (
    <ErrorBoundary>
      <ToastContainer />

      {/* Phase Transition: Splash Screen Overlay */}
      {showSplash && (
        <SplashScreen
          isDataLoading={mapLoading || authLoading || !isMapReady}
          onComplete={() => {
            console.log("[C-Safe] Splash complete, entering main flow.");
            setShowSplash(false);
          }}
        />
      )}

      {/* 🚀 Onboarding Flow (Sequential Overlays) */}
      {!showSplash && !hasAgreedDisclaimer && (
        <DisclaimerModal onAgree={() => {
          speak('');
          setHasAgreedDisclaimer(true);
        }} />
      )}

      {!showSplash && hasAgreedDisclaimer && !hasCompletedOnboarding && (
        <SafetyQuiz onComplete={() => {
          setHasCompletedOnboarding(true);
          if (user?.id) {
            supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
              .then(({ data }) => {
                const currentPoints = data?.points || 0;
                supabase.from('profiles').upsert({ id: user.id, points: currentPoints + 500 })
                  .then(() => loadUser());
              });
          }
        }} />
      )}

      {/* Global Cyberpunk Chill Background */}
      <div
        className={`h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col mx-auto sm:max-w-md transition-all duration-1000 ${(!showSplash && hasAgreedDisclaimer && hasCompletedOnboarding) ? 'opacity-100' : 'opacity-0'}`}
        style={{ boxShadow: `inset 0 0 40px ${gridBorderColor}40`, border: `2px solid ${gridBorderColor}80` }}
      >

        {/* Phase Station: Unlock & Sterilization Screen */}
        {isStationUnlockOpen && (
          <StationUnlockScreen
            onClose={() => setIsStationUnlockOpen(false)}
            onUnlockComplete={() => {
              setIsStationUnlockOpen(false);
              toast("🔓 스테이션 잠금이 해제되었습니다. 주행을 시작하세요!", "success");
            }}
          />
        )}


        {/* Phase 26: Real-time Hazard Alert Overlay */}
        <HazardAlertOverlay activeHazard={activeHazard} />

        {/* Global Dark Grid Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Weather Banner (Glassmorphism Cyber Theme) */}
        {weatherRisk && (
          <div className="absolute top-0 left-0 w-full z-[60] bg-red-900/60 backdrop-blur-md text-white py-2 px-4 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 border-b border-red-500/50">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm font-black tracking-tight">{t("Weather Risk")}</span>
          </div>
        )}

        {/* Phase 9 & 11: Chill / Cyber Navigation Goal Selector */}
        {/* Phase 9 & 11: Real-time Cyber Telemetry */}
        {isRiding && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-md flex flex-col gap-2 animate-in slide-in-from-top duration-500">
            {/* Live Status Indicator */}
            <div className="flex justify-center mb-1">
              <div className="bg-cyber-cyan/20 backdrop-blur-md py-1.5 px-4 rounded-full border border-cyber-cyan/30 flex items-center gap-2 shadow-[0_0_15px_rgba(64,255,220,0.2)]">
                <div className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse shadow-neon-cyan"></div>
                <span className="text-[10px] font-black text-cyber-cyan tracking-widest uppercase">Live Riding</span>
              </div>
            </div>

            {/* Speed & Mileage Dashboard */}
            <div className="bg-gray-900/90 backdrop-blur-xl text-white p-5 rounded-[32px] shadow-2xl border border-white/10 flex items-center justify-between">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Speed</span>
                <span className="text-4xl font-black italic tracking-tighter">{currentMetrics.speed}</span>
                <span className="text-[10px] font-bold text-blue-400">km/h</span>
              </div>

              <div className="h-10 w-[2px] bg-white/10 mx-2" />

              <div className="flex-1 px-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Stability</span>
                  <span className={`text-[10px] font-black ${currentMetrics.stability < 50 ? 'text-red-500' : 'text-green-500'}`}>
                    {currentMetrics.stability}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${currentMetrics.stability < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${currentMetrics.stability}%` }}
                  />
                </div>
              </div>

              <div className="h-10 w-[2px] bg-white/10 mx-2" />

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Mileage</span>
                <span className="text-xl font-black tracking-tighter text-yellow-400">+{currentMetrics.mileage}</span>
                <span className="text-[8px] font-bold uppercase">Reward</span>
              </div>
            </div>

            {/* End Ride Button (Refined Style) */}
            <button
              onClick={() => {
                speak(''); // TTS 권한 강제 획득 (운행 종료 시 음성 지원)
                setIsParkingOpen(true);
              }}
              disabled={isHardwareSyncing}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 h-14 rounded-2xl font-black shadow-xl active:scale-95 transition-all border border-red-500/30 disabled:opacity-50 flex items-center justify-center backdrop-blur-md"
            >
              {isHardwareSyncing ? (
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                  <span>주행 종료 및 주차 인증</span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Map Control Buttons (Left Side) */}
        {/* Phase 35: Domain Debug Overlay for Kakao Map Registration */}


        {/* Phase 40: Unified Tools Menu (FAB Grouping) */}
        <div className="absolute left-4 bottom-[160px] z-[100] flex flex-col gap-2 pointer-events-auto items-center">
          {isToolsOpen && (
            <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <button
                onClick={() => setShowHeatmap(prev => !prev)}
                className={`w-10 h-10 bg-gray-900/80 backdrop-blur-md rounded-xl border flex items-center justify-center transition-all ${showHeatmap ? 'text-orange-500 border-orange-500/50 shadow-neon-orange' : 'text-white border-white/10'
                  }`}
                title="위험 구역 히트맵"
              >
                <Activity size={18} />
              </button>
              <button
                onClick={() => setIsDashboardOpen(true)}
                className={`w-10 h-10 bg-gray-900/80 backdrop-blur-md rounded-xl border flex items-center justify-center transition-all ${isDashboardOpen ? 'text-cyber-cyan border-cyber-cyan/50 shadow-neon-cyan' : 'text-white border-white/10'
                  }`}
                title="종합 대시보드"
              >
                <Layers size={18} />
              </button>

              <div className="h-[1px] w-6 bg-white/10 mx-auto my-1" />

              <button
                onClick={handleInstallClick}
                className="w-10 h-10 bg-gray-900/80 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center text-white/60"
                title="PWA 설치"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => setIsStationUnlockOpen(true)}
                className="w-10 h-10 bg-blue-600/80 backdrop-blur-md rounded-xl border border-blue-400/30 flex items-center justify-center text-white"
                title="스테이션 언락 테스트"
              >
                <Unlock size={18} />
              </button>
              <button
                onClick={() => setIsESGDashboardOpen(true)}
                className="w-10 h-10 bg-cyber-green/80 backdrop-blur-md rounded-xl border border-cyber-green/30 flex items-center justify-center text-white shadow-neon-green"
                title="ESG 임팩트 대시보드"
              >
                <Leaf size={18} />
              </button>
              <button
                onClick={() => setIsDrivingConsoleOpen(true)}
                className="w-10 h-10 bg-[#1C1C1E]/80 backdrop-blur-md rounded-xl border border-gray-600/50 flex items-center justify-center text-white shadow-lg"
                title="맞춤형 주행 콘솔"
              >
                <Sliders size={18} />
              </button>

              <button
                onClick={() => setIsRideSettingsOpen(true)}
                className="w-10 h-10 bg-gray-900/80 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center text-white"
                title="주행 환경 설정 (Night/자전거 모드/브랜드 필터)"
              >
                <Settings size={18} />
              </button>

              <button
                onClick={() => setShowStressLayer(prev => !prev)}
                className={`w-10 h-10 backdrop-blur-md rounded-xl border flex items-center justify-center transition-all ${showStressLayer ? 'bg-orange-500/30 text-orange-400 border-orange-400/50 shadow-neon-orange' : 'bg-gray-900/80 text-white border-white/10'}`}
                title="보행자 스트레스 존 표시"
              >
                <Users size={18} />
              </button>

              <button
                onClick={() => setIsHelmetAIOpen(true)}
                className="w-10 h-10 bg-purple-600/80 backdrop-blur-md rounded-xl border border-purple-400/30 flex items-center justify-center text-white"
                title="테스트 AI 헬멧 인식 강제 오픈"
              >
                <Shield size={18} />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            className={`w-12 h-12 rounded-2xl shadow-glass flex items-center justify-center transition-all duration-300 border ${isToolsOpen ? 'bg-orange-500 text-black border-orange-400 rotate-45' : 'bg-gray-900/90 text-white border-white/20'
              }`}
          >
            {isToolsOpen ? <X size={24} /> : <Layers size={24} />}
          </button>
        </div>

        <header className="p-4 transition-all duration-300 z-50 pt-4">

          <div className="max-w-xl mx-auto flex items-center justify-between">
            {/* Branding */}
            <div className="relative">
              <button
                onClick={() => {
                  speak(''); // TTS 권한 획득 겸용
                  if (!isRiding && !digitalTwinData) {
                    setDigitalTwinData({
                      speed: 0,
                      reactionDist: 0,
                      brakingDist: 0,
                      totalDist: 0,
                      riskLevel: 'safe',
                      mu: 0.7,
                      incline: 0,
                      reactionTime: 1.0
                    });
                  }
                  setIsDigitalTwinOpen(true);
                }}

                className={`bg-cyber-panel/80 backdrop-blur-lg py-2 px-5 rounded-full shadow-glass border transition-all duration-500 flex items-center gap-3 active:scale-95 outline-none ${digitalTwinData?.riskLevel === 'danger' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                  digitalTwinData?.riskLevel === 'warning' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                    'border-cyber-cyan/30 shadow-glass'
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors duration-500 ${digitalTwinData?.riskLevel === 'danger' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' :
                  digitalTwinData?.riskLevel === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' :
                    'bg-cyber-cyan shadow-[0_0_10px_rgba(64,255,220,0.5)]'
                  }`}>
                  <Shield size={16} className={digitalTwinData?.riskLevel === 'danger' || digitalTwinData?.riskLevel === 'warning' ? 'text-white' : 'text-black'} />
                </div>
                <h1 className="text-lg font-black text-white tracking-tighter italic">C-Safe</h1>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-cyber-panel/80 backdrop-blur-lg py-2 px-5 rounded-full shadow-glass border border-white/10">
              <Cloud size={18} className="text-cyber-cyan" />
              <span className="text-xs font-bold text-gray-200">{currentTemp}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full relative">

          {/* 🔍 Floating Map Search Bar */}
          {navStep !== 'route_ready' && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-[100] pointer-events-auto transition-all duration-300"
              style={{ top: navStep === 'idle' ? '16px' : '190px' }}
            >
              <MapSearchBar
                speak={speak}
                onSelectLocation={(loc) => {
                  setPanToLocation({ lat: loc.lat, lng: loc.lng, timestamp: Date.now() });
                  setSelectedLocation({
                    id: loc.id,
                    title: loc.title,
                    desc: loc.desc,
                    lat: loc.lat,
                    lng: loc.lng,
                    type: loc.type,
                    safetyTip: loc.safetyTip
                  });
                }}
              />
            </div>
          )}

          {/* Main Map Background */}
          <div className="absolute inset-0 z-10">
            <MapContainer
              data={locations}
              rideConfig={rideConfig}
              tagoPms={tagoPms}
              showHeatmap={showHeatmap}
              showStressLayer={showStressLayer}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              panToLocation={panToLocation}
              onStationClick={(station) => {
                setSelectedDropStation(station);
                setIsDropAndGoOpen(true);
              }}
              onRouteReady={() => {
                // 목적지 선택 완료 후 이동 수단 선택 모달 오픈
                setIsVehicleSelectOpen(true);
              }}
              onMapReady={handleMapReady}
              gpsFollowMode={gpsFollowMode}
              setGpsFollowMode={setGpsFollowMode}
              showPMs={showPMs}
              setShowPMs={setShowPMs}
              // Lifted Props
              navStep={navStep}
              setNavStep={setNavStep}
              routeOrigin={routeOrigin}
              setRouteOrigin={setRouteOrigin}
              routeDestination={routeDestination}
              setRouteDestination={setRouteDestination}
            />
          </div>
          {/* Phase 11: Core Action Buttons (Neon Cyan & Zen Mode) */}
          <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col gap-3 pointer-events-none z-[100]">
            {/* Compact Ready Status Badge (Shrunk from large card) */}



            {!isRiding && !selectedLocation && (
              <div className="flex gap-3 mt-1 animate-in slide-in-from-bottom">
                <button
                  onClick={() => {
                    speak(''); // TTS 권한 획득
                    // 주행 시작 클릭 시 바로 시작 대신 목적지 설정 모드 진입
                    setRouteOrigin({
                      title: '현재 위치',
                      lat: userLat,
                      lng: userLng,
                      type: 'CURRENT_LOC'
                    });
                    setNavStep('select_destination');
                    toast('📍 안전 주행을 위해 목적지(주차 구역)를 선택해 주세요.', 'info');
                  }}
                  disabled={isHardwareSyncing || navStep !== 'idle'}
                  className="pointer-events-auto flex-1 bg-cyber-cyan text-black h-14 rounded-2xl font-black text-lg shadow-neon-cyan flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isHardwareSyncing ? (
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Play size={20} className="fill-black" />
                      <span className="tracking-tighter">
                        {navStep === 'idle' ? t("START RIDE") : "목적지 선택 중..."}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Fab Group (Layers & Location) - Shifted Up to avoid overlap */}
          <div className="absolute bottom-40 right-6 flex flex-col gap-3 z-[100] pointer-events-auto">
            <button
              onClick={handleShareApp}
              className="w-12 h-12 rounded-xl bg-gray-900/80 backdrop-blur-md text-white border border-white/10 flex items-center justify-center active:scale-90 transition-all shadow-xl"
            >
              <Share2 size={18} />
            </button>

            <button
              onClick={() => setShowPMs(!showPMs)}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all shadow-xl ${showPMs ? 'text-cyber-cyan border-cyber-cyan/50 shadow-neon-cyan' : 'text-white border-white/10 bg-gray-900/80'
                }`}
            >
              <Zap size={18} className={showPMs ? "fill-cyber-cyan" : "fill-white/30"} />
            </button>

            <div className="h-[1px] w-6 bg-white/10 mx-auto my-1" />

            <button
              onClick={() => {
                setGpsFollowMode(true);
                if (location) setPanToLocation({ ...location, timestamp: Date.now() });
              }}
              className={`w-14 h-14 rounded-[22px] flex flex-col items-center justify-center transition-all duration-300 border-2 shadow-2xl ${gpsFollowMode
                ? 'bg-cyber-cyan border-white text-black shadow-neon-cyan'
                : 'bg-gray-900/90 border-cyber-cyan/30 text-cyber-cyan backdrop-blur-xl'
                }`}
            >
              <LocateFixed size={24} className={gpsFollowMode ? 'animate-pulse' : ''} />
              <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">GPS</span>
            </button>
          </div>
        </main>

        <footer className="bg-cyber-panel border-t border-white/5 pb-[env(safe-area-inset-bottom)] z-[40]">
          <div className="max-w-xl mx-auto flex justify-between items-center px-10">
            <button
              onClick={() => setIsVibeRouteOpen(true)}
              className="flex flex-col items-center gap-1 text-[#FF8C94] outline-none border-none group active:scale-95 transition-all"
            >
              <Moon size={24} className="fill-[#FF8C94]/20 animate-pulse drop-shadow-[0_0_8px_rgba(255,140,148,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-[#FF8C94]/90">VIBE</span>
            </button>





            <button
              onClick={() => setIsShadowSheetOpen(true)}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent"
            >
              <TrendingUp size={24} className="bg-transparent" />
              <span className="text-[9px] font-bold uppercase tracking-wider bg-transparent">{t("Activity")}</span>
            </button>
            <button
              onClick={() => setIsWalletSheetOpen(true)}
              className="flex flex-col items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center -mt-6 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-xl outline-none ring-0">
                <Wallet size={24} className="bg-transparent text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              </div>
            </button>
            <button
              onClick={() => setIsFavoritesOpen(true)}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent"
            >
              <Star size={24} className="bg-transparent" />
              <span className="text-[9px] font-bold uppercase tracking-wider bg-transparent">{t("Saved")}</span>
            </button>
            <button
              onClick={() => setIsProfileSheetOpen(true)}
              className="flex flex-col items-center gap-1 text-cyber-cyan outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent bg-transparent"
            >
              <div className="w-6 h-6 rounded-full bg-cyber-cyan/20 mb-0.5 overflow-hidden border border-cyber-cyan/50 outline-none ring-0 bg-transparent flex items-center justify-center shadow-[0_0_8px_rgba(64,255,220,0.4)]">
                {profile?.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt="profile"
                    className="w-full h-full object-cover bg-transparent border-none outline-none"
                  />
                ) : (
                  <span className="text-cyber-cyan text-xs font-bold leading-none select-none">Me</span>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-transparent text-cyber-cyan">{profile?.nickname || t("Profile")}</span>
            </button>
          </div>
        </footer>

        {/* Modals */}
        <DropAndGoModal
          isOpen={isDropAndGoOpen}
          onClose={() => setIsDropAndGoOpen(false)}
          station={selectedDropStation}
          onScanStart={() => {
            setIsDropAndGoOpen(false);
            setIsParkingOpen(true);
          }}
        />
        <EmergencyModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
        <ParkingVerification isOpen={isParkingOpen} onClose={() => setIsParkingOpen(false)} speak={speak} onComplete={handleParkingComplete} />
        <PersonalInsights
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          history={rideHistory}
        />
        <ShadowImpactSheet
          isOpen={isShadowSheetOpen}
          onClose={() => setIsShadowSheetOpen(false)}
          userName={profile?.nickname || "J"}
        />
        <UserProfileSheet
          isOpen={isProfileSheetOpen}
          onClose={() => setIsProfileSheetOpen(false)}
          userName={profile?.nickname || "사용자 K"}
          userPoints={profile?.points || 0}
          userScore={profile?.safety_score || 0}
          profileImage={profile?.profile_image}
          onAdminOpen={() => {
            setIsProfileSheetOpen(false);
            setIsAdminDashboardOpen(true);
          }}
          onEditProfile={() => setIsProfileEditOpen(true)}
        />
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
        />
        <RewardWalletSheet
          isOpen={isWalletSheetOpen}
          onClose={() => setIsWalletSheetOpen(false)}
          userPoints={profile?.points || 0}
          coupons={coupons}
          setCoupons={setCoupons}
        />
        <QRScanner
          isOpen={isQRScannerOpen}
          mode={qrScanMode}
          onClose={() => setIsQRScannerOpen(false)}
          onScanSuccess={handleQRScanSuccess}
        />
        <VibeRouteSelector
          isOpen={isVibeRouteOpen}
          onClose={() => setIsVibeRouteOpen(false)}
          onSelectRoute={(vibe) => {
            setCurrentVibeRoute(vibe);
            setIsVibeRouteOpen(false);
          }}
          routeOrigin={routeOrigin}
          routeDestination={routeDestination}
        />

        <PaymentReceiptModal
          isOpen={isPaymentReceiptOpen}
          onClose={() => setIsPaymentReceiptOpen(false)}
          metrics={finalRideSummary}
          pointsUsed={100} // 예시: 보상받은 100P 즉시 사용 할인
          onPaymentComplete={handlePaymentComplete}
        />

        <StationRewardModal
          isOpen={isStationRewardOpen}
          onClose={() => setIsStationRewardOpen(false)}
          onNext={() => {
            setIsStationRewardOpen(false);
            setIsRideSummaryOpen(true);
          }}
          points={100}
        />

        <RideSummaryModal
          isOpen={isRideSummaryOpen}
          onClose={() => setIsRideSummaryOpen(false)}
          metrics={finalRideSummary}
          vibeName={currentVibeRoute ? `${currentVibeRoute.title} (${currentVibeRoute.subTitle.split(' ')[0]})` : "Safety Route"}
          suddenBrakeCount={0}
        />




        <FavoriteStations
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          onSelect={(loc) => {
            setPanToLocation({ ...loc, timestamp: Date.now() });
            setIsFavoritesOpen(false);
          }}
          userLocation={{ lat: 36.833, lng: 127.179 }} // Mock user location
        />

        <HelmetDetectionCamera
          isOpen={isHelmetAIOpen}
          onClose={() => setIsHelmetAIOpen(false)}
          onSuccess={() => {
            const newPoint = {
              id: Date.now(),
              shopName: 'AI 헬멧 인증 (선지급)',
              amount: '+100P',
              issuedAt: new Date().toLocaleDateString(),
              type: '안전 보상',
              status: 'active'
            };
            setCoupons(prev => [newPoint, ...prev]);

            setIsHelmetAIOpen(false); // 모달 닫기
            setNavStep('idle'); // 주행 시작 시 목적지 설정 팝업(navStep) 닫기
            startRide();
            startTracking(); // 실제 GPS 트래킹 시작
            announceVibeStart(currentVibeRoute);
          }}
        />

        {/* Digital Twin Indicator Modal */}
        <DigitalTwinIndicator
          isOpen={isDigitalTwinOpen}
          onClose={() => setIsDigitalTwinOpen(false)}
          data={digitalTwinData}
        />

        {/* ESG Dashboard Modal */}
        <ESGDashboard
          isOpen={isESGDashboardOpen}
          onClose={() => setIsESGDashboardOpen(false)}
          metrics={{
            carbonSaved: (profile?.total_distance * 0.2).toFixed(1) || 0,
            safetyScore: profile?.safety_score || 0,
            hazardReports: historyMetrics.hazardReports || 0,
            safetyStreak: historyMetrics.safetyStreak || 1
          }}
          history={rideHistory}
        />

        <RideSettings
          isOpen={isRideSettingsOpen}
          onClose={() => setIsRideSettingsOpen(false)}
          config={rideConfig}
          setConfig={setRideConfig}
        />

        <VehicleSelectModal
          isOpen={isVehicleSelectOpen}
          onClose={() => setIsVehicleSelectOpen(false)}
          isBicycleMode={rideConfig.isBicycleMode}
          onSelect={(isBicycle) => {
            setRideConfig(prev => ({ ...prev, isBicycleMode: isBicycle }));
            setIsVehicleSelectOpen(false);
            if (isBicycle) {
              speak("자전거 주행 모드가 선택되었습니다. 초과 속도 경고가 비활성화됩니다. 안전 주행을 위해 Edge AI 헬멧 검증을 시작합니다.");
            } else {
              speak("전동 킥보드 주행 모드가 선택되었습니다. 최고 속도는 20km/h로 감시됩니다. 안전 주행을 위해 Edge AI 헬멧 검증을 시작합니다.");
            }
            setIsHelmetAIOpen(true);
          }}
        />

        <DrivingConsoleUI
          isOpen={isDrivingConsoleOpen}
          onClose={() => setIsDrivingConsoleOpen(false)}
          onApply={(maxSpeed) => setRideConfig(prev => ({ ...prev, speedLimit: maxSpeed }))}
        />

        {/* Carbon Saved / Eco Badge Modal (New Engagement Feature) */}
        {showEcoBadge && (
          <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
            <div className="w-full max-w-sm bg-cyber-panel/90 border border-cyber-green/50 rounded-3xl p-8 relative overflow-hidden shadow-glass">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyber-green/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyber-cyan/20 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-cyber-green/20 rounded-full flex items-center justify-center mb-4 border-2 border-cyber-green shadow-neon-green">
                  <Cloud size={40} className="text-cyber-green fill-cyber-green/30" />
                </div>
                <h2 className="text-cyber-green font-black text-xl tracking-tight mb-2 uppercase">{t("Eco Badge")}</h2>
                <p className="text-sm font-medium text-gray-300 mb-6 tracking-tight">당신의 작은 움직임이 세상을 바꿉니다.</p>

                <div className="bg-black/40 rounded-2xl w-full py-4 mb-8 border border-white/5">
                  <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">{t("Carbon Saved")}</p>
                  <p className="text-5xl font-black text-white italic tracking-tighter">4.2 <span className="text-lg text-cyber-green not-italic">kg</span></p>
                </div>

                <button
                  onClick={() => setShowEcoBadge(false)}
                  className="w-full bg-white text-black py-4 rounded-xl font-black shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  공유하고 포인트 받기 <span className="material-icons-outlined text-sm">ios_share</span>
                </button>
                <button onClick={() => setShowEcoBadge(false)} className="mt-4 text-xs font-bold text-gray-500 hover:text-white">닫기</button>
              </div>
            </div>
          </div>
        )}



        {/* 주차 검증(Geofencing) 모달 */}
        {parkingGeofenceModal.isOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className={`w-full max-w-sm rounded-[2rem] p-8 text-center border overflow-hidden relative shadow-2xl ${parkingGeofenceModal.success ? 'bg-cyber-panel/90 border-cyber-cyan shadow-neon-cyan' : 'bg-[#111] border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'}`}>
              <div className="relative inline-block mb-6 z-10">
                {parkingGeofenceModal.success ? (
                  <div className="bg-cyber-cyan/20 w-24 h-24 rounded-full flex items-center justify-center border-2 border-cyber-cyan shadow-neon-cyan">
                    <Zap size={48} className="text-cyber-cyan fill-cyber-cyan/50" />
                  </div>
                ) : (
                  <div className="bg-red-500/20 w-24 h-24 rounded-full flex items-center justify-center border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                    <AlertTriangle size={48} className="text-red-500" />
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-tighter relative z-10">
                {parkingGeofenceModal.success ? "합법 주차 성공!" : "주차 구역 이탈 경고"}
              </h2>
              {parkingGeofenceModal.success ? (
                <p className="text-cyber-cyan font-black mb-6 text-xl tracking-tight relative z-10">+100 P 적립 완료</p>
              ) : (
                <p className="text-red-400 font-bold mb-6 text-md tracking-tight relative z-10 text-center">반경 10m 이내에<br />지정 주차장이 없습니다.</p>
              )}
              <p className={`font-medium mb-8 text-sm leading-relaxed relative z-10 ${parkingGeofenceModal.success ? 'text-gray-300' : 'text-gray-400'}`}>
                {parkingGeofenceModal.success ? "올바른 구역에 완료되었습니다.\n안전한 천안시를 만들어주셔서 감사합니다." : "현재 위치에 주차 시\n견인 조치 및 페널티가 부과될 수 있습니다."}
              </p>
              <button
                onClick={() => setParkingGeofenceModal({ isOpen: false, success: false })}
                className={`w-full py-4 text-black font-black text-lg rounded-2xl active:scale-95 transition-all relative z-10 ${parkingGeofenceModal.success ? 'bg-cyber-cyan shadow-neon-cyan' : 'bg-white shadow-lg border border-red-200'}`}
              >
                확인
              </button>
              {/* Background glow */}
              <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] -z-0 ${parkingGeofenceModal.success ? 'bg-cyber-cyan/20' : 'bg-red-500/10'}`}></div>
              <div className={`absolute bottom-0 left-0 w-40 h-40 rounded-full blur-[80px] -z-0 ${parkingGeofenceModal.success ? 'bg-cyber-blue/20' : 'bg-red-500/10'}`}></div>
            </div>
          </div>
        )}

        {isAdminDashboardOpen && (
          <AdminDashboard onClose={() => setIsAdminDashboardOpen(false)} />
        )}


        <HardwareStatusOverlay isSyncing={isHardwareSyncing} isRiding={isRiding} />

      </div>
    </ErrorBoundary>

  );
}

export default App;
