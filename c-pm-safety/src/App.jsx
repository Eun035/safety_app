import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, Cloud, AlertTriangle, MapPin, Moon, Activity,
  Layers, Play, Camera, Navigation, Search, Star,
  Calendar, Phone, Zap, TrendingUp, RefreshCw, Download,
  Database, User, Map as MapIcon, Sliders, Box
} from 'lucide-react';
import ErrorBoundary from './components/common/ErrorBoundary';
import MapContainer from './components/map/MapContainer';
import SafetyQuiz from './components/quiz/SafetyQuiz';
import SplashScreen from './components/common/SplashScreen';
import LanguageSelectorScreen from './components/common/LanguageSelectorScreen';
import DisclaimerModal from './components/common/DisclaimerModal';
import SOSButton from './components/common/SOSButton';
import EmergencyModal from './components/common/EmergencyModal';
import ParkingVerification from './components/common/ParkingVerification';
import PersonalInsights from './components/common/PersonalInsights';
import RideSettings from './components/common/RideSettings';
import QRScanner from './components/common/QRScanner';
import CouponBox from './components/common/CouponBox';
import VibeRouteSelector from './components/map/VibeRouteSelector';
import RideSummaryModal from './components/common/RideSummaryModal';
import FeedbackReport from './components/common/FeedbackReport';
import RideCameraModal from './components/common/RideCameraModal';
import FavoriteStations from './components/common/FavoriteStations';
import PaymentReceiptModal from './components/common/PaymentReceiptModal';
import HelmetDetectionCamera from './components/common/HelmetDetectionCamera';
import ESGDashboard from './components/common/ESGDashboard';
import { useSafeData } from './hooks/useSafeData';
import { useVoiceGuidance } from './hooks/useVoiceGuidance';
import { useRideSession } from './hooks/useRideSession';
import { useSafetyGrid } from './hooks/useSafetyGrid';
import StationRewardModal from './components/common/StationRewardModal';
import DropAndGoModal from './components/common/DropAndGoModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useHazardWarning } from './hooks/useHazardWarning';
import HazardAlertOverlay from './components/common/HazardAlertOverlay';
import pmParkingData from './data/pm_parking_data.json';
import { calculateDistance } from './utils/distance';
import { useUserStore } from './hooks/useUserStore';
import { useGeolocation } from './hooks/useGeolocation';
import { calculateStopDistance } from './utils/physics';
import DigitalTwinIndicator from './components/common/DigitalTwinIndicator';

// (제거된 mockUserProfile)

const mockUserProfile = {
  "userId": "usr_9981",
  "nickname": "천안안전라이더",
  "university": "단국대학교 천안캠퍼스",
  "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "registeredHelmet": "HELMET-MY-001",
  "dashboard": {
    "safetyScore": 94,
    "safetyRank": "상위 5%",
    "helmetStationUsage": 18,
    "rewardPoints": 1800,
    "carbonReduction": "14.2kg"
  },
  "emergencyContact": {
    "name": "어머니",
    "phone": "010-1234-5678"
  },
  "recentRoutes": [
    {
      "date": "2026-02-23",
      "from": "천안아산역",
      "to": "단국대학교 천안캠퍼스",
      "distance": "5.2km"
    },
    {
      "date": "2026-02-21",
      "from": "상명대학교",
      "to": "신부동 터미널",
      "distance": "3.1km"
    }
  ]
};

function App() {
  const { t, i18n } = useTranslation();
  const { locations, tagoPms, weatherRisk, currentTemp, isLoading: mapLoading } = useSafeData();
  const { user, profile, isLoading: authLoading, signInAnonymously, loadUser } = useUserStore();

  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isAROpen, setIsAROpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Serverless Phase 1: O2O & SOS
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isCouponBoxOpen, setIsCouponBoxOpen] = useState(false);
  const [coupons, setCoupons] = useLocalStorage('coupons', []);

  // Phase 15 & 19: Mandatory Onboarding & Disclaimer
  const [hasSelectedLanguage, setHasSelectedLanguage] = useLocalStorage('csafe_language_selected_v7', false);
  const [hasAgreedDisclaimer, setHasAgreedDisclaimer] = useLocalStorage('csafe_disclaimer_agreed_v7', false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage('csafe_onboarding_completed_v7', false);

  // Phase 8: Mock Profile & Ride Tracker (Carbon Tracker Added)
  const [userProfile, setUserProfile] = useState({
    id: 'test-user-uuid',
    nickname: "에코라이더",
    safety_score: 92,
    total_distance: 15.8,
    points: 2450,
    carbon_saved: 4.2 // kg CO2 saved
  });

  // Phase 35: Lightweight Ride Session & Static Safety Grid
  const { isRiding, startRide, endRideSession, totalDistance, suddenBrakeCount, isHardwareSyncing, historyMetrics, loadHistory } = useRideSession();

  // Static location fallback for testing / permissions denied
  const DEFAULT_LAT = 36.833;
  const DEFAULT_LNG = 127.179;

  // Phase 38: Realtime Geolocation Tracker
  const { location, startTracking, stopTracking } = useGeolocation();

  // 현재 위치 좌표 (GPS 수신 중이면 실시간 위치, 아니면 단국대 앞 모킹 위치)
  const userLat = location?.lat || DEFAULT_LAT;
  const userLng = location?.lng || DEFAULT_LNG;

  const { borderColor: gridBorderColor } = useSafetyGrid(userLat, userLng);

  // Helper variables to match old `currentMetrics` prop
  const currentMetrics = {
    mileage: totalDistance.toFixed(2),
    savedCarbon: (totalDistance * 0.2).toFixed(1),
    speed: location?.speed || 0
  };
  const { speak } = useVoiceGuidance();

  // Phase 9 & 11 & 16: Route Vibe Aesthetic Modals
  const [showEcoBadge, setShowEcoBadge] = useState(false);
  const [isVibeRouteOpen, setIsVibeRouteOpen] = useState(false);
  const [parkingGeofenceModal, setParkingGeofenceModal] = useState({ isOpen: false, success: false });

  // Phase 26: Geofencing Hazard Warning Hook
  const { activeHazard } = useHazardWarning(locations);

  // Phase 17 & 18 & 35 & 40: Post-Ride Flow (With Payment)
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);
  const [isStationRewardOpen, setIsStationRewardOpen] = useState(false);
  const [isRideSummaryOpen, setIsRideSummaryOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [finalRideSummary, setFinalRideSummary] = useState(null);
  const [isDropAndGoOpen, setIsDropAndGoOpen] = useState(false);
  const [selectedDropStation, setSelectedDropStation] = useState(null);

  // Phase Digital Twin: Indicator State
  const [isDigitalTwinOpen, setIsDigitalTwinOpen] = useState(false);
  const [isESGDashboardOpen, setIsESGDashboardOpen] = useState(false);
  const [digitalTwinData, setDigitalTwinData] = useState(null);
  const [simSpeed, setSimSpeed] = useState(15);
  const [rideConfig, setRideConfig] = useState({
    speedLimit: 15,
    isNightMode: false,
    brandFilters: ['G-Bike', 'Swing', 'Dear']
  });
  const [isRideSettingsOpen, setIsRideSettingsOpen] = useState(false);

  // Sync simulation speed with ride config
  useEffect(() => {
    setSimSpeed(rideConfig.speedLimit);
  }, [rideConfig.speedLimit]);

  // Phase 26: PWA Manual Install Prompt
  // Phase 26: PWA Manual Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Supabase Auth Init (익명 로그인 처리, 온보딩과 무관하게 최초 1회)
  useEffect(() => {
    const initAuth = async () => {
      await loadUser();
      if (!useUserStore.getState().user) {
        await signInAnonymously();
      }
      loadHistory(); // 주행 기록 기반 지표 로드
    };
    initAuth();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
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
    if (!deferredPrompt) return;

    // 설치 프롬프트 표시
    deferredPrompt.prompt();

    // 사용자의 응답 대기
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('사용자가 PWA 설치를 수락했습니다.');
    } else {
      console.log('사용자가 PWA 설치를 거부했습니다.');
    }

    // 프롬프트는 한 번만 사용할 수 있으므로 초기화 및 버튼 숨김
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // 야간/날씨 등 위험 감지 시 음성 경고
  useEffect(() => {
    if (weatherRisk) {
      speak("현재 노면이 매우 미끄럽습니다. 급가속과 급제동을 피하고 천천히 운행하세요.");
    }

    // Phase 9: 실시간 주행 품질 경고
    if (isRiding && (currentMetrics?.stability || 100) < 40) {
      speak("기기가 심하게 흔들립니다. 주행 안정도가 낮으니 서행하여 마일리지를 보호하세요.");
    }
  }, [weatherRisk, isRiding, currentMetrics?.stability, speak]);

  // Phase Digital Twin: 실시간 위험도 계산 및 음성 안내 연동
  useEffect(() => {
    // 1. 노면 상태 결정 (Weather + Hazard context)
    let surface = weatherRisk ? 'wet' : 'dry';
    if (activeHazard?.type === 'ICE') surface = 'ice';
    else if (activeHazard?.type === 'WET') surface = 'wet';
    else if (activeHazard?.type === 'TILE') surface = 'tile';

    // 2. 경사도 결정 (Hazard context)
    const incline = activeHazard?.type === 'SLOPE' ? 10 : 0;

    // 3. 속도 결정
    // GPS 속도가 있으면 우선 사용, 없으면 시뮬레이션 속도 사용
    const speed = (isRiding && location?.speed > 0) ? location.speed : (isRiding ? 20 : simSpeed);

    // 4. 반응 시간 결정 (히스토리 데이터 반영)
    const reactionTime = historyMetrics?.avgReactionTime || 1.0;

    const result = calculateStopDistance(speed, incline, reactionTime, surface);
    setDigitalTwinData({
      ...result,
      speed,
      incline,
      surface,
      reactionTime
    });

    // 위험/경고 시 속도 감속 안내 (사용자 요청 사항)
    if (isRiding && (result.riskLevel === 'danger' || result.riskLevel === 'warning')) {
      speak("위험 상황입니다. 속도를 줄이고 안전거리를 확보해 주세요.");
    }
  }, [weatherRisk, activeHazard, isRiding, currentMetrics?.speed, simSpeed, speak, historyMetrics]);

  const [showLangMenu, setShowLangMenu] = useState(false);

  // Phase 26: Debug 온보딩 초기화 함수
  const resetOnboarding = () => {
    setHasSelectedLanguage(false);
    setHasAgreedDisclaimer(false);
    setHasCompletedOnboarding(false);
    setShowSplash(true);
    alert("온보딩 상태가 초기화되었습니다. 다시 시작합니다.");
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
      alert("안전모 착용이 확인되었습니다! 선지급 마일리지 50P가 적립되었습니다. 운행을 시작합니다.");

      setCameraAction(null); // 모달 닫기
      startRide();
      startTracking(); // 실제 GPS 트래킹 시작
      speak(t("Zen Mode"));
      return;
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
    alert("보관 완료! 천안사랑카드 500P가 적립되었습니다.");
  };

  // Phase 20: Splash Screen state management
  const [showSplash, setShowSplash] = useState(true);

  // Phase 26: Pocket App Camera Modal State
  const [cameraAction, setCameraAction] = useState(null);
  const [rideSummaryPhoto, setRideSummaryPhoto] = useState(null);
  const [isHelmetAIOpen, setIsHelmetAIOpen] = useState(false);

  // Phase 26: QR Scanner Mode (station | helmet)
  const [qrScanMode, setQrScanMode] = useState('station');

  // Phase 26: Favorite Stations State
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [panToLocation, setPanToLocation] = useState(null);

  const handleParkingComplete = (photoUrl) => {
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
        const newPoint = {
          id: Date.now() + 1,
          shopName: '합법 주차장 반납 보상',
          amount: '+100P',
          issuedAt: new Date().toLocaleDateString(),
          type: '주차 보상',
          status: 'active'
        };
        setCoupons(prev => [newPoint, ...prev]);
        speak("주차 확인 성공. 리워드 100포인트가 적립되었습니다. 주차를 종료합니다.");
      }

      const summary = endRideSession();
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

  const handleCameraConfirm = async (photoData) => {
    if (cameraAction === 'start') {
      await startRide(); // 기기 제어 타이머 등 비동기 대기
      startTracking();   // 시작 즉시 GPS 수집
      speak(t("Zen Mode"));
    }
    setCameraAction(null);
  };

  if (showSplash || authLoading) {
    return <SplashScreen isDataLoading={mapLoading || authLoading} onComplete={() => setShowSplash(false)} />;
  }

  if (!hasSelectedLanguage) {
    return <LanguageSelectorScreen onComplete={() => {
      speak('');
      setHasSelectedLanguage(true);
    }} />;
  }

  return (
    <ErrorBoundary>
      {/* Global Cyberpunk Chill Background */}
      <div
        className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col mx-auto sm:max-w-md transition-colors duration-1000"
        style={{ boxShadow: `inset 0 0 40px ${gridBorderColor}40`, border: `2px solid ${gridBorderColor}80` }}
      >
        {/* Phase 19: Mandatory Disclaimer Overlay (Highest Priority) */}
        {!hasAgreedDisclaimer && (
          <DisclaimerModal onAgree={() => {
            speak(''); // 브라우저 자동 재생 정책에 의해 막힌 TTS 권한 획득 (사용자 클릭)
            setHasAgreedDisclaimer(true);
          }} />
        )}

        {/* Phase 15: Mandatory Onboarding Quiz Overlay (Second Priority) */}
        {hasAgreedDisclaimer && !hasCompletedOnboarding && (
          <SafetyQuiz onComplete={() => setHasCompletedOnboarding(true)} />
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
            {/* Speed & Mileage Dashboard */}
            <div className="bg-gray-900/95 backdrop-blur-lg text-white p-5 rounded-[32px] shadow-2xl border border-white/10 flex items-center justify-between">
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

            {/* End Ride Button */}
            <button
              onClick={() => {
                speak(''); // TTS 권한 강제 획득 (운행 종료 시 음성 지원)
                setIsParkingOpen(true);
              }}
              disabled={isHardwareSyncing}
              className="w-full bg-white text-black h-14 rounded-2xl font-black shadow-xl active:scale-95 transition-transform border-4 border-black/5 disabled:opacity-50 flex items-center justify-center"
            >
              {isHardwareSyncing ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : "운행 종료"}
            </button>
          </div>
        )}

        {/* Map Control Buttons (Left Side) */}
        {/* Phase 35: Domain Debug Overlay for Kakao Map Registration */}


        <div className="absolute left-4 top-28 z-[45] flex flex-col gap-3 pointer-events-auto items-center">
          <button
            onClick={() => setIsESGDashboardOpen(true)}
            className="w-12 h-12 bg-cyber-panel/80 backdrop-blur-md rounded-2xl shadow-glass flex items-center justify-center text-cyber-cyan active:scale-90 transition-all border border-white/10"
          >
            <Shield size={24} />
          </button>
          <button
            onClick={() => setShowHeatmap(prev => !prev)}
            className={`w-12 h-12 bg-cyber-panel/80 backdrop-blur-md rounded-2xl shadow-glass flex items-center justify-center active:scale-90 transition-all border ${
              showHeatmap
                ? 'text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'text-red-900/60 border-white/10'
            }`}
          >
            <Activity size={20} />
          </button>
          <button
            onClick={() => setIsDashboardOpen(true)}
            className={`w-12 h-12 bg-cyber-panel/80 backdrop-blur-md rounded-2xl flex items-center justify-center active:scale-90 transition-all border ${isDashboardOpen ? 'text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-purple-400 border-white/10'}`}
          >
            <Layers size={21} />
          </button>
          <button
            onClick={() => setIsAROpen(true)}
            className="w-12 h-12 bg-cyber-panel/80 backdrop-blur-md rounded-2xl shadow-glass flex items-center justify-center text-purple-400 active:scale-90 transition-all border border-white/10"
          >
            <Box size={22} className="bg-transparent" />
          </button>
          <button
            className="w-12 h-12 bg-cyber-panel/80 backdrop-blur-md rounded-full shadow-glass flex items-center justify-center text-cyber-cyan active:scale-90 transition-all border border-white/10 outline-none ring-0 overflow-hidden bg-transparent"
          >
            <Navigation size={22} className="fill-cyber-cyan bg-transparent" />
          </button>

          {/* Phase 26: Debug 버튼 - 온보딩(퀴즈) 초기화 */}
          <button
            onClick={resetOnboarding}
            className="w-12 h-12 bg-red-900/60 backdrop-blur-md rounded-full mt-4 shadow-glass flex flex-col items-center justify-center text-white active:scale-90 transition-all border border-red-500/50"
            title="온보딩 초기화 (퀴즈 다시보기)"
          >
            <RefreshCw size={18} />
            <span className="text-[8px] font-bold mt-1">RESET</span>
          </button>

          {/* Phase 26: PWA 수동 설치 버튼 (Samsung Internet 등 지원) */}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-12 h-12 bg-blue-600/80 backdrop-blur-md rounded-full mt-2 shadow-glass flex flex-col items-center justify-center text-white active:scale-90 transition-all border border-blue-400"
              title="홈 화면에 앱 설치"
            >
              <Download size={20} className="animate-bounce" />
              <span className="text-[8px] font-black tracking-tighter mt-1 leading-none">INSTALL</span>
            </button>
          )}
        </div>



        <header className="p-4 transition-all duration-300 z-50 pt-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            {/* Branding */}
            <div className="relative">
              <button
                onClick={() => {
                  speak(''); // TTS 권한 획득 겸용
                  setIsDigitalTwinOpen(true);
                }}
                className={`bg-cyber-panel/80 backdrop-blur-lg py-2 px-5 rounded-full shadow-glass border transition-all duration-500 flex items-center gap-3 active:scale-95 outline-none ${
                  digitalTwinData?.riskLevel === 'danger' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                  digitalTwinData?.riskLevel === 'warning' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                  'border-cyber-cyan/30 shadow-glass'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors duration-500 ${
                  digitalTwinData?.riskLevel === 'danger' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' :
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
          {/* Main Map Background */}
          <div className="absolute inset-0 z-10">
            <MapContainer
              data={locations}
              rideConfig={rideConfig}
              tagoPms={tagoPms}
              showHeatmap={showHeatmap}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              panToLocation={panToLocation}
              onStationClick={(station) => {
                setSelectedDropStation(station);
                setIsDropAndGoOpen(true);
              }}
            />
          </div>
          {/* Phase 11: Core Action Buttons (Neon Cyan & Zen Mode) */}
          <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col gap-3 pointer-events-none z-[100]">
            {!isRiding && !selectedLocation && (
              <div className="flex items-center gap-3 w-full animate-in slide-in-from-bottom">
                <div className="flex-1 bg-cyber-panel/90 backdrop-blur-xl rounded-[2rem] p-4 flex items-center justify-between border border-white/5 shadow-glass pointer-events-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-cyber-cyan/30 border-t-cyber-cyan animate-spin flex-shrink-0 relative">
                      <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-cyber-cyan/20 blur-[4px]"></div>
                    </div>
                    <div>
                      <p className="text-white font-black text-lg leading-tight">{t("Ready to Ride")}</p>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">MI SCOOTER 4 PRO</p>
                    </div>
                  </div>
                  <div className="text-right bg-transparent border-none outline-none ring-0 focus:ring-0">
                    <p className="text-cyber-cyan font-black text-xl drop-shadow-[0_0_10px_rgba(64,255,220,0.8)] leading-tight bg-transparent border-none outline-none">
                      {isRiding ? (currentMetrics?.speed || 0) : '24.5'}
                    </p>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest bg-transparent border-none outline-none">EST. KM RANGE</p>
                  </div>
                </div>
              </div>
            )}

            {!isRiding && (
              <div className="flex gap-3 mt-1 animate-in slide-in-from-bottom">
                <button
                  onClick={() => {
                    speak(''); // TTS 권한 획득 (운행 시작 전처리)
                    setCameraAction('start');
                  }}
                  disabled={isHardwareSyncing}
                  className="pointer-events-auto flex-[3] bg-cyber-cyan text-black h-16 rounded-[2rem] font-black text-lg shadow-neon-cyan flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isHardwareSyncing ? (
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Play size={24} className="fill-black" />
                      {t("START RIDE")}
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsParkingOpen(true)}
                  className="pointer-events-auto flex-[1] bg-cyber-panel/80 backdrop-blur-xl h-16 rounded-[2rem] flex items-center justify-center border border-white/10 active:scale-95 transition-all text-white hover:bg-white/10 shadow-glass text-xl font-bold"
                >
                  <Camera size={24} className="text-cyber-green" />
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-cyber-panel border-t border-white/5 pb-[env(safe-area-inset-bottom)] z-[40]">
          <div className="max-w-xl mx-auto flex justify-between items-center px-10">
            <button
              onClick={() => setIsVibeRouteOpen(true)}
              className="flex flex-col items-center gap-1 text-cyber-cyan outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent"
            >
              <MapPin size={24} className="bg-transparent" />
              <span className="text-[9px] font-bold uppercase tracking-wider bg-transparent">{t("Explore")}</span>
            </button>
            <button 
              onClick={() => setIsDashboardOpen(true)}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent"
            >
              <TrendingUp size={24} className="bg-transparent" />
              <span className="text-[9px] font-bold uppercase tracking-wider bg-transparent">{t("Activity")}</span>
            </button>
            <button 
              onClick={() => setIsESGDashboardOpen(true)}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent"
            >
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center -mt-6 border border-white/10 shadow-glass backdrop-blur-xl outline-none ring-0">
                <Shield size={24} className="bg-transparent" />
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
              onClick={() => setIsDashboardOpen(true)}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0 -webkit-tap-highlight-color-transparent bg-transparent"
            >
              <div className="w-6 h-6 rounded-full bg-gray-700/50 mb-0.5 overflow-hidden border border-gray-600 outline-none ring-0 bg-transparent flex items-center justify-center">
                {profile?.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt="profile"
                    onDoubleClick={resetOnboarding}
                    className="w-full h-full object-cover bg-transparent border-none outline-none"
                    title="Double click to reset onboarding"
                  />
                ) : (
                  <span onDoubleClick={resetOnboarding} className="text-gray-400 text-xs font-bold leading-none select-none">Me</span>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-transparent">{profile?.nickname || t("Profile")}</span>
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
          history={JSON.parse(localStorage.getItem('csafe_ride_history') || '[]')}
        />
        <QRScanner
          isOpen={isQRScannerOpen}
          mode={qrScanMode}
          onClose={() => setIsQRScannerOpen(false)}
          onScanSuccess={handleQRScanSuccess}
        />
        <CouponBox isOpen={isCouponBoxOpen} onClose={() => setIsCouponBoxOpen(false)} coupons={coupons} setCoupons={setCoupons} />
        <VibeRouteSelector
          isOpen={isVibeRouteOpen}
          onClose={() => setIsVibeRouteOpen(false)}
          onSelectRoute={(vibe) => {
            setIsVibeRouteOpen(false);
          }}
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
          onClose={() => {
            setIsRideSummaryOpen(false);
          }}
          metrics={finalRideSummary}
          vibeName="Safety Route"
          capturedPhoto={rideSummaryPhoto}
          suddenBrakeCount={suddenBrakeCount}
          onFeedbackNext={() => {
            setIsRideSummaryOpen(false);
            setIsFeedbackOpen(true);
          }}
        />
        <FeedbackReport
          isOpen={isFeedbackOpen}
          onClose={() => {
            setIsFeedbackOpen(false);
          }}
          onSubmit={(feedback) => {
            console.log("Feedback submitted:", feedback);
            alert("피드백이 접수되었습니다. 감사합니다!");
            setIsFeedbackOpen(false);
          }}
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

        <RideCameraModal
          isOpen={!!cameraAction}
          mode={cameraAction}
          onClose={() => setCameraAction(null)}
          onConfirm={handleCameraConfirm}
          onQRScanRequest={() => {
            setQrScanMode('helmet');
            setIsQRScannerOpen(true);
          }}
          onAIScanRequest={() => {
            setIsHelmetAIOpen(true);
          }}
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
            
            setCameraAction(null); // 모달 닫기
            startRide();
            startTracking(); // 실제 GPS 트래킹 시작
            speak(t("Zen Mode"));
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
            carbonSaved: userProfile.carbon_saved,
            safetyScore: userProfile.safety_score,
            hazardReports: historyMetrics.hazardReports || 0,
            safetyStreak: historyMetrics.safetyStreak || 1
          }}
          history={JSON.parse(localStorage.getItem('csafe_ride_history') || '[]')}
        />

        <RideSettings
          isOpen={isRideSettingsOpen}
          onClose={() => setIsRideSettingsOpen(false)}
          config={rideConfig}
          setConfig={setRideConfig}
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

        {/* AR View Placeholder Modal */}
        {isAROpen && (
          <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-cyber-cyan/20 rounded-3xl flex items-center justify-center mb-6 shadow-neon-cyan border border-cyber-cyan/50">
              <Zap size={40} className="text-cyber-cyan fill-cyber-cyan" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">AR Vision</h2>
            <p className="text-cyan-100 mb-10 font-medium">카메라를 통해 실시간으로 네온 주차 구역과<br />안전 경로를 안내하는 비전입니다.</p>
            <button
              onClick={() => setIsAROpen(false)}
              className="w-full max-w-xs bg-cyber-cyan text-black py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-neon-cyan"
            >
              돌아가기
            </button>
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
      </div>
    </ErrorBoundary>
  );
}

export default App;
