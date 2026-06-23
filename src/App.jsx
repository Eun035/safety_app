import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, ShieldCheck, Cloud, AlertTriangle, Moon,
  Layers, Play, Star, Zap, TrendingUp, Download,
  Sliders, Wallet, X, LocateFixed, Share2,
  Settings, Users
} from 'lucide-react';


import ErrorBoundary from './components/common/ErrorBoundary';
import MapContainer from './components/map/MapContainer';
import SafetyQuiz from './components/quiz/SafetyQuiz';
import MapSearchBar from './components/map/MapSearchBar';


import SplashScreen from './components/common/SplashScreen';
import LanguageSelectorScreen from './components/common/LanguageSelectorScreen';
import DisclaimerModal from './components/common/DisclaimerModal';
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
import EarphoneConfirmGate from './components/common/EarphoneConfirmGate';
import ReferralWelcomeModal from './components/common/ReferralWelcomeModal';
import ShadowImpactSheet from './components/common/ShadowImpactSheet';
import UserProfileSheet from './components/common/UserProfileSheet';
import HelmetStationSelector from './components/common/HelmetStationSelector';
import HelmetReturnSheet from './components/common/HelmetReturnSheet';
import RewardWalletSheet from './components/common/RewardWalletSheet';
// 5순위: AdminDashboard 레이지 로딩 — 초기 번들 ~39KB 절감
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
import { useSafeData } from './hooks/useSafeData';
import { useVoiceGuidance } from './hooks/useVoiceGuidance';
import { useRideSession } from './hooks/useRideSession';
import { useSafetyGrid } from './hooks/useSafetyGrid';
import StationRewardModal from './components/common/StationRewardModal';
import DropAndGoModal from './components/common/DropAndGoModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useHazardWarning } from './hooks/useHazardWarning';
import HazardAlertOverlay from './components/common/HazardAlertOverlay';
import HardwareStatusOverlay from './components/common/HardwareStatusOverlay';
import ProfileEditModal from './components/common/ProfileEditModal';
import AccountDeletionModal from './components/common/AccountDeletionModal';
import AISafetyCoach from './components/common/AISafetyCoach';
import { useNearMissEngine } from './hooks/useNearMissEngine';
import { useBeginnerMissions } from './hooks/useBeginnerMissions';
import SafeCorridorSheet from './components/common/SafeCorridorSheet';
import NavigationLaunchSheet from './components/common/NavigationLaunchSheet';
import RideStartScreen from './components/common/RideStartScreen';
import { useAutoCheckout } from './hooks/useAutoCheckout';
import { useWakeLock } from './hooks/useWakeLock';


import pmParkingData from './data/pm_parking_data.json';
import { calculateDistance } from './utils/distance';
import { useUserStore } from './hooks/useUserStore';
import { useGeolocation } from './hooks/useGeolocation';
import { useRegion } from './hooks/useRegion';
import { useHaptic } from './hooks/useHaptic';
import { useRiderBehavior } from './hooks/useRiderBehavior';
import { captureReferralFromUrl, readPendingReferral, clearPendingReferral, buildReferralCode } from './utils/referral';
import { calculateStopDistance } from './utils/physics';
import DigitalTwinIndicator from './components/common/DigitalTwinIndicator';
import ToastContainer from './components/common/ToastContainer';
import { supabase } from './lib/supabaseClient';
import { flush as flushPendingSync } from './lib/pendingSyncQueue';
import { toast } from './hooks/useToast';


// 🌋 보행자 스트레스 존 정의 (관리자 설정 데이터와 연동됨)
// 컴포넌트 외부 상수로 두어 매 렌더마다 재생성 → useEffect 재실행되는 것을 방지
const STRESS_ZONES = [
  { id: 's1', lat: 36.833, lng: 127.179, radius: 150, name: "단국대 정문 보행자 보호구역" },
  { id: 's2', lat: 36.818, lng: 127.156, radius: 200, name: "종합터미널 보행자 밀집구역" },
  { id: 's3', lat: 36.7898, lng: 127.0019, radius: 150, name: "아산시청 보행자 보호구역", region: 'asan' },
  { id: 's4', lat: 36.7708, lng: 126.9322, radius: 200, name: "순천향대 정문 보행자 보호구역", region: 'asan' }
];

function App() {
  const { t } = useTranslation();
  const { locations, tagoPms, weatherRisk, currentTemp, isLoading: mapLoading } = useSafeData();
  const { user, profile, isLoading: authLoading, signInAnonymously, loadUser } = useUserStore();

  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false); // New: FAB Menu State
  const [showStressLayer, setShowStressLayer] = useState(false);
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isShadowSheetOpen, setIsShadowSheetOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isAccountDeletionOpen, setIsAccountDeletionOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [gpsFollowMode, setGpsFollowMode] = useState(true); // 🛰️ GPS 추적 모드 상태 추가
  const [panToLocation, setPanToLocation] = useState(null); // New: Signal for map movement
  const [showPMs, setShowPMs] = useState(false);
  const [coupons, setCoupons] = useLocalStorage('coupons', []);

  // Phase 15 & 19: Onboarding — Disclaimer는 매 세션 노출, Quiz는 정책 기반 영속화
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [hasAgreedDisclaimer, setHasAgreedDisclaimer] = useState(false);

  // 퀴즈 메타데이터: 누적 시도 횟수 / 마지막 정답 개수 / 마지막 완료 시각
  const [quizMeta, setQuizMeta] = useLocalStorage('csafe_quiz_meta', {
    totalAttempts: 0,
    lastCorrectCount: 0,
    lastCompletedAt: null
  });
  const [quizCompletedThisSession, setQuizCompletedThisSession] = useState(false);
  // 퀴즈 게이트 노출 결정: null=미평가, true=노출, false=건너뜀 (Disclaimer 동의 후 1회 평가)
  const [quizGateDecision, setQuizGateDecision] = useState(null);


  // Phase 35: Lightweight Ride Session & Static Safety Grid
  const { isRiding, startRide, endRideSession, updateMetrics, totalDistance, suddenBrakeCount, isHardwareSyncing, historyMetrics, loadHistory, rideHistory, enterZone, exitZone, sampleZoneSpeed } = useRideSession();

  // 🅿️ 자동 체크아웃 — 라이딩 중 PM 주차장 10m 이내 + 속도 0이 10초 유지되면
  // triggerAutoCheckout() 자동 발화 → endRideSession 전체 정상 종료 흐름 실행
  useAutoCheckout();

  // 🔋 라이딩 중 화면 절전 차단 (Screen Wake Lock).
  // 백그라운드 복귀 시 usePageVisibility로 자동 재획득. 미지원 브라우저는 no-op.
  useWakeLock(isRiding);

  // Phase 19: 안전 퀴즈 게이트 노출 정책 평가 (Disclaimer 동의 후 1회만)
  // 조건 1: 직전 시도에서 3개 다 맞히지 못함  → 재노출
  // 조건 2: 마지막 완료로부터 15일 이상 경과  → 재노출
  // 조건 3: 누적 시도 10회 미만이면, 안전점수 낮음 / 운전이력 부족할수록 확률↑
  useEffect(() => {
    if (!hasAgreedDisclaimer) return;
    if (quizGateDecision !== null) return;

    // 🛠️ Dev 모드(로컬)에서는 항상 퀴즈 노출 — QA/확인 편의. 운영 빌드에선 정책 적용.
    if (import.meta.env.DEV) {
      setQuizGateDecision(true);
      return;
    }

    const decide = () => {
      if (!quizMeta.lastCompletedAt) return true;                           // 조건 1: 미완료
      if ((quizMeta.lastCorrectCount ?? 0) < 3) return true;                // 조건 2: 만점 미달
      if ((quizMeta.totalAttempts ?? 0) < 3) return true;                   // 조건 3: 누적 3회 미만 = 시드 학습 보장

      // 조건 4 (신규): 일별 1회 강제 노출 — 같은 날 여러 번 진입은 1번만, 다음 날 다시
      const today = new Date().toISOString().slice(0, 10);
      const lastDay = new Date(quizMeta.lastCompletedAt).toISOString().slice(0, 10);
      if (lastDay !== today) return true;

      if ((quizMeta.totalAttempts ?? 0) < 10) {                             // 조건 5: 누적 10회 미만 + 확률 (드물게 같은 날 재진입 시)
        const safetyScore = profile?.safety_score ?? 100;
        const rideCount = rideHistory?.length ?? 0;
        const safetyFactor = Math.max(0, Math.min(1, (100 - safetyScore) / 60));
        const rideFactor = Math.max(0, Math.min(1, (10 - rideCount) / 10));
        const probability = Math.max(safetyFactor, rideFactor);
        if (Math.random() < probability) return true;
      }
      return false;
    };

    setQuizGateDecision(decide());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAgreedDisclaimer, profile, rideHistory]);

  // 🧠 Near-Miss Event Engine (전략적 데이터 수집)
  const { captureNearMiss, getLocalNearMisses } = useNearMissEngine();

  // 🏆 초보자 미션 시스템 (게임화 → 재방문 유도). 완료 시 포인트 자동 지급.
  const { progressMission } = useBeginnerMissions({
    onReward: (missionId, points) => {
      toast(`🏆 미션 완료! +${points.toLocaleString()}P 적립`, 'success');
      if (user?.id) {
        supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
          .then(({ data }) => {
            const currentPoints = data?.points || 0;
            supabase.from('profiles').upsert({ id: user.id, points: currentPoints + points })
              .then(() => loadUser());
          });
      }
    }
  });
  const [isAICoachOpen, setIsAICoachOpen] = React.useState(false);
  const [coachingData, setCoachingData] = React.useState(null);
  // 헬멧 착용 상태 (HelmetDetectionCamera 성공 시 true로 설정)
  const helmetOnRef = React.useRef(false);

  // Static location fallback for testing / permissions denied
  const DEFAULT_LAT = 36.833;
  const DEFAULT_LNG = 127.179;

  // Phase 38: Realtime Geolocation Tracker
  const { location, startTracking, stopTracking } = useGeolocation();

  // 🏙️ 첫 GPS fix 시 1회 지역 자동 감지 (사용자 수동 변경 후에는 useRegion 내부에서 무시)
  const autoDetectRegion = useRegion(s => s.autoDetectFromGPS);
  React.useEffect(() => {
    if (location?.lat && location?.lng) {
      autoDetectRegion(location.lat, location.lng);
    }
  }, [location?.lat, location?.lng, autoDetectRegion]);

  // 현재 위치 좌표 (GPS 수신 중이면 실시간 위치, 아니면 단국대 앞 모킹 위치)
  const userLat = location?.lat || DEFAULT_LAT;
  const userLng = location?.lng || DEFAULT_LNG;

  const { borderColor: gridBorderColor = '#40ffdc' } = useSafetyGrid(userLat, userLng);

  const { speak } = useVoiceGuidance();
  const { vibrate } = useHaptic();
  const rider = useRiderBehavior();

  // 🎯 라이더 행동 상태 변화 → 즉각 음성·햅틱 경고 (Tier 3 에지 트리거)
  //   SMOOTH    → 무음 (정상)
  //   WOBBLY    → L2 음성 + 햅틱 (좌우 흔들림·미숙 의심)
  //   CRITICAL  → L4 음성 + 햅틱 (급조향·급제동·도용 강력 의심)
  React.useEffect(() => {
    if (!rider.isRunning) return;
    if (rider.status === 'WOBBLY') {
      speak('차량이 흔들립니다. 자세 안정.', 'L2');
      vibrate('L2');
    } else if (rider.status === 'CRITICAL') {
      speak('주의! 급격한 흔들림 감지. 즉시 감속.', 'L4');
      vibrate('L4');
    }
  }, [rider.status, rider.isRunning, speak, vibrate]);

  // 🛑 라이딩 종료 시 sensor 모니터링 자동 정지 (배터리 보호)
  React.useEffect(() => {
    if (!isRiding && rider.isRunning) {
      rider.stop();
    }
  }, [isRiding, rider]);

  // 각 스트레스 존에 "현재 안에 있는지" 를 기억해 진입 순간에만 1회 안내
  const stressZoneInsideRef = React.useRef({});

  // 실시간 위치 감시를 통한 스트레스 존 진입 감지 (Haversine + 진입 엣지 트리거)
  useEffect(() => {
    if (!isRiding || !location) {
      // 주행 종료 시 상태 리셋 → 다음 주행에서 다시 진입 시 알람
      stressZoneInsideRef.current = {};
      return;
    }

    const STRESS_ZONE_TARGET_SPEED = 10; // km/h — 보행자 보호구역 권장 제한속도
    const currentSpeed = location.speed || 0;

    STRESS_ZONES.forEach(zone => {
      const dist = calculateDistance(location.lat, location.lng, zone.lat, zone.lng);
      const wasInside = stressZoneInsideRef.current[zone.id] || false;
      const isInside = dist < zone.radius;

      if (isInside && !wasInside) {
        speak(t('tts_stress_zone_enter', { zoneName: t(zone.name) }), 'L3');
        vibrate('L3');
        // 🛡️ RSR 계측: V_entry 스냅샷
        enterZone(zone.id, currentSpeed, STRESS_ZONE_TARGET_SPEED);
      } else if (!isInside && wasInside) {
        // 🛡️ RSR 계측: 이탈 시 누적치 commit
        exitZone();
      }
      stressZoneInsideRef.current[zone.id] = isInside;
    });

    // 존 내부면 현재 속도 샘플 누적
    if (Object.values(stressZoneInsideRef.current).some(Boolean)) {
      sampleZoneSpeed(currentSpeed);
    }
  }, [location, isRiding, speak, enterZone, exitZone, sampleZoneSpeed, t]);

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

  // Phase Digital Twin: Indicator State
  const [isDigitalTwinOpen, setIsDigitalTwinOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [digitalTwinData, setDigitalTwinData] = useState(null);
  const [rideConfig, setRideConfig] = useState({
    brandFilters: [],
    isNightMode: true, // Always default to Dark Mode for premium feel
    isVoiceEnabled: true,
    speedLimit: 20,
    isBicycleMode: false
  });

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

  const currentMetrics = {
    mileage: totalDistance.toFixed(2),
    savedCarbon: (totalDistance * 0.2).toFixed(1),
    speed: location?.speed || 0,
    stability
  };

  const [isRideSettingsOpen, setIsRideSettingsOpen] = useState(false);

  // Phase 45: Lifted Navigation / Route States from MapContainer
  const [navStep, setNavStep] = useState('idle'); // 'idle' | 'select_origin' | 'select_destination' | 'route_ready'
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [routeDestination, setRouteDestination] = useState(null);

  // Safe Corridor & Navigation Launch Sheets
  const [isSafeCorridorOpen, setIsSafeCorridorOpen] = useState(false);
  const [isNavLaunchOpen, setIsNavLaunchOpen] = useState(false);

  // Phase 26: PWA Manual Install Prompt
  // Phase 26: PWA Manual Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [, setShowInstallBtn] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const [showSplash, setShowSplash] = useState(true);
  const [, setRideSummaryPhoto] = useState(null);
  const [isHelmetAIOpen, setIsHelmetAIOpen] = useState(false);
  const [isEarphoneGateOpen, setIsEarphoneGateOpen] = useState(false);
  const [isHelmetStationOpen, setIsHelmetStationOpen] = useState(false);
  const [selectedHelmetStation, setSelectedHelmetStation] = useState(null);
  const [isHelmetReturnOpen, setIsHelmetReturnOpen] = useState(false);
  const [qrScanMode] = useState('station');
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isRideStartOpen, setIsRideStartOpen] = useState(false);




  // 🚀 최적화: 무한 루프 방지를 위한 콜백 안정화
  const handleMapReady = React.useCallback(() => {
    setIsMapReady(true);
  }, []);

  // 🚀 배포 단계: 온보딩 상태 유지 (강제 초기화 코드 제거)
  useEffect(() => {
    console.log("[C-Safe] App Initialized. State persistence active.");
  }, []);

  // 🪖 route_ready 시 헬멧 거점 선택 시트 노출 (목적지 → 헬멧 거점 선택 → 헬멧 인증)
  // 사용자가 목적지 근처 헬멧 스테이션/스토어 중에서 선택 또는 "선택안함"으로 다음
  // 단계로. 어느 쪽이든 헬멧 인증 모달로 자동 진입.
  useEffect(() => {
    if (navStep === 'route_ready' && routeDestination) {
      setIsHelmetStationOpen(true);
    } else if (navStep === 'idle') {
      setIsSafeCorridorOpen(false);
      setIsNavLaunchOpen(false);
      setIsHelmetStationOpen(false);
      setSelectedHelmetStation(null);
    }
  }, [navStep, routeDestination]);

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

  // P0-3: 오프라인 sync 큐 flush
  // 정상 사용자가 온라인 상태일 때 미전송 row(rides/ride_paths/zone_events/
  // near_miss_events)를 일괄 전송. user.id 변경 시 + 마운트 시 + online 이벤트 시.
  useEffect(() => {
    if (!user?.id || user?.is_guest || String(user.id).startsWith('guest_')) return;
    let cancelled = false;
    const doFlush = async () => {
      try {
        const result = await flushPendingSync(user.id);
        if (!cancelled && result.flushed > 0) {
          console.log(`[C-Safe][sync] flushed ${result.flushed} rows, remaining ${result.remaining}`);
        }
      } catch (err) {
        console.warn('[C-Safe][sync] flush 실패:', err);
      }
    };
    doFlush();
    const onOnline = () => doFlush();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [user?.id, user?.is_guest]);

  // 🔗 페이지 진입 직후 URL에서 추천 코드·UTM 캡처 (Auth보다 먼저)
  const [pendingReferral, setPendingReferral] = useState(null);
  useEffect(() => {
    const pending = captureReferralFromUrl();
    if (pending) {
      setPendingReferral(pending);
      // referrals 테이블에 landing 행 INSERT (invitee_user_id는 가입 후 채워짐)
      supabase.from('referrals').insert({
        inviter_code: pending.code,
        utm_source:   pending.utm_source,
        utm_medium:   pending.utm_medium,
        utm_campaign: pending.utm_campaign
      }).then(({ error }) => {
        if (error) console.warn('[referral] landing insert failed:', error.message);
      });
    }
  }, []);

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

      // 🔗 가입 직후 pending referral을 invitee_user_id로 연결 + profiles 기록
      const pending = readPendingReferral();
      if (finalUser?.id && pending?.code) {
        const myCode = buildReferralCode(finalUser.id);
        // 본인 코드 = 누군가 데려온 코드면 자기 추천 방지
        if (pending.code !== myCode) {
          try {
            await supabase.from('referrals')
              .update({ invitee_user_id: finalUser.id, signed_up_at: new Date().toISOString() })
              .eq('inviter_code', pending.code)
              .is('invitee_user_id', null)
              .order('landed_at', { ascending: false })
              .limit(1);
            await supabase.from('profiles')
              .update({ referral_code: myCode, referred_by_code: pending.code })
              .eq('id', finalUser.id);
            clearPendingReferral();
          } catch (e) {
            console.warn('[referral] signup link failed:', e?.message || e);
          }
        }
      } else if (finalUser?.id) {
        // 추천 없는 사용자도 본인 코드는 영속화
        const myCode = buildReferralCode(finalUser.id);
        supabase.from('profiles').update({ referral_code: myCode }).eq('id', finalUser.id).then(({ error }) => {
          if (error) console.warn('[referral] self code persist failed:', error.message);
        });
      }
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
      speak(t('tts_speeding_alert', { speed: Math.round(speed) }), 'L4');
      vibrate('L4');
      lastAlertTimeRef.current = now;
    } else if (result.riskLevel === 'warning') {
      // 🎚️ 중간 위험: 단계적 사전 안내 (L2 — 진행 중 발화 없을 때만)
      speak(t('tts_braking_risk_alert', { distance: Math.round(result.totalDist) }), 'L2');
      vibrate('L2');
      lastAlertTimeRef.current = now;
    } else if (result.riskLevel === 'danger') {
      speak(t('tts_braking_risk_alert', { distance: Math.round(result.totalDist) }), 'L4');
      vibrate('L4');
      lastAlertTimeRef.current = now;

      // 🎯 Near-Miss 이벤트 캡처 (위험 수준 달성 시)
      captureNearMiss({
        lat: location?.lat,
        lng: location?.lng,
        speed,
        deceleration: result.riskLevel === 'danger' ? 3 : 2,
        weatherRisk: !!weatherRisk,
        inStressZone: STRESS_ZONES.some(z =>
          typeof calculateDistance === 'function' &&
          calculateDistance(location?.lat, location?.lng, z.lat, z.lng) < z.radius
        ),
        helmetOn: helmetOnRef.current,
        activeHazard,
        userId: user?.id
      });
    }
  }, [isRiding, location, weatherRisk, activeHazard, rideConfig.speedLimit, rideConfig.isBicycleMode, speak, historyMetrics, updateMetrics, captureNearMiss, user?.id, t]);


  // Vibe & Preference 기반 동적 TTS 안내 함수
  const announceVibeStart = (vibe) => {
    const prefName = t(vibe?.preference || 'eco');
    const vibeName = t(vibe?.id || 'sunset');
    const modeName = t(vibe?.drivingMode || 'CHILL');

    speak(t('tts_vibe_start', { vibeName, prefName, modeName }));
  };

  const handleQRScanSuccess = (decodedText) => {
    setIsQRScannerOpen(false);

    if (qrScanMode === 'helmet') {
      // DEMO: QR 헬멧 인증 — 시연용으로 검증 없이 통과/보상 지급.
      // 실서비스 시 프로필의 등록 헬멧 시리얼과 디코딩 결과를 대조하고
      // 일치할 때에만 setCoupons / startRide 호출하도록 게이팅 필요.
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

      // Geofencing: 반경 10m 이내 지정 주차장 검색
      let minDistance = Infinity;
      if (Array.isArray(pmParkingData)) {
        const distances = pmParkingData.map(p => calculateDistance(userLat, userLng, p.lat, p.lng));
        minDistance = distances.length > 0 ? Math.min(...distances) : Infinity;
      }

      const isLegalPark = minDistance <= 10;

      if (isLegalPark) {
        speak(t('tts_parking_legal'));
      } else {
        // 비합법 주차: 페널티 모달 표시 + 보상 차단
        speak(t('tts_parking_illegal'));
        setParkingGeofenceModal({ isOpen: true, success: false });
        await endRideSession(user?.id, {
          isLegalPark: false,
          helmetOn: helmetOnRef.current,
          destinationText: routeDestination?.title || routeDestination?.name || null,
          helmetPickupStationId: selectedHelmetStation?.id || null
        }); // 주행 기록은 저장하되 +100P 보상 제외
        return; // 결제 모달 진입 차단
      }

      const summary = await endRideSession(user?.id, {
        isLegalPark: true,
        helmetOn: helmetOnRef.current,
        destinationText: routeDestination?.title || routeDestination?.name || null,
        helmetPickupStationId: selectedHelmetStation?.id || null
      });
      if (summary) {
        setFinalRideSummary(summary);

        // 🏆 초보자 미션 진행 (합법 주차 완료 시에만)
        progressMission('first_ride', 1);

        const finalDistKm = parseFloat(summary.distance || 0);
        if (finalDistKm > 0 && Number(summary.suddenBrakeCount ?? 0) === 0) {
          progressMission('smooth_5km', finalDistKm);
        }

        // 일별 스트릭: 오늘 첫 주행일 때만 +1 (같은 날 중복 카운트 방지)
        const today = new Date().toISOString().slice(0, 10);
        const lastRideDate = (() => {
          try { return localStorage.getItem('csafe_last_ride_date'); } catch { return null; }
        })();
        if (lastRideDate !== today) {
          progressMission('weekly_streak_7', 1);
          try { localStorage.setItem('csafe_last_ride_date', today); } catch { /* no-op */ }
        }
      } else {
        // endRideSession이 null 반환 (autoCheckout이 이미 종료시킨 케이스 등) — 폴백 요약으로 체인 보호
        console.warn('[C-Safe] endRideSession returned null, applying fallback summary');
        setFinalRideSummary({
          distance: String(totalDistance || 0),
          time: 0,
          topSpeed: '0',
          co2Saved: '0',
          suddenBrakeCount: suddenBrakeCount || 0
        });
      }
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

    // 🪖 헬멧 반납 인증 시트 노출 (반납 시 +100P, 건너뛰기 가능) → 이후 결제 영수증
    console.log('[C-Safe][chain] step1 → HelmetReturn open');
    setIsHelmetReturnOpen(true);
  };

  const handlePaymentComplete = () => {
    console.log('[C-Safe][chain] step3 → PaymentReceipt close, StationReward open');
    setIsPaymentReceiptOpen(false);
    setIsStationRewardOpen(true);
  };

  return (
    <ErrorBoundary>
      <ToastContainer />

      {/* 1️⃣ Splash Screen (최초 진입 시 풀스크린) */}
      {showSplash && (
        <SplashScreen
          isDataLoading={mapLoading || authLoading || !isMapReady}
          onComplete={() => {
            console.log("[C-Safe] Splash complete, entering main flow.");
            setShowSplash(false);
          }}
        />
      )}

      {/* 2️⃣ Language Selector (Splash 완료 후) */}
      {!showSplash && !hasSelectedLanguage && (
        <LanguageSelectorScreen onComplete={() => {
          speak('');
          setHasSelectedLanguage(true);
        }} />
      )}

      {/* 3️⃣ Disclaimer (언어 선택 후) */}
      {!showSplash && hasSelectedLanguage && !hasAgreedDisclaimer && (
        <DisclaimerModal
          onAgree={() => {
            speak('');
            setHasAgreedDisclaimer(true);
          }}
          onBack={() => setHasSelectedLanguage(false)}
        />
      )}

      {/* 4️⃣ Safety Quiz (면책 동의 후, 정책상 노출 결정 시) */}
      {!showSplash && hasSelectedLanguage && hasAgreedDisclaimer && quizGateDecision === true && !quizCompletedThisSession && (
        <SafetyQuiz onComplete={(correctCount) => {
          setQuizMeta({
            totalAttempts: (quizMeta.totalAttempts ?? 0) + 1,
            lastCorrectCount: correctCount ?? 0,
            lastCompletedAt: new Date().toISOString()
          });
          setQuizCompletedThisSession(true);

          // 첫 사용자에게만(퀴즈 통과 후 1회) Ride Control 자동 오픈
          const hasSeenSettings = localStorage.getItem('hasSeenInitialRideSettings');
          if (!hasSeenSettings) {
            setIsRideSettingsOpen(true);
            localStorage.setItem('hasSeenInitialRideSettings', 'true');
          }
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

      {/* 5️⃣ Global Cyberpunk Chill Background (퀴즈 게이트 통과 후 노출, 그 전엔 백그라운드 마운트) */}
      <div
        className={`h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col mx-auto sm:max-w-md transition-all duration-1000 ${(!showSplash && hasSelectedLanguage && hasAgreedDisclaimer && (quizGateDecision === false || quizCompletedThisSession)) ? 'opacity-100' : 'opacity-0'}`}
        style={{ boxShadow: `inset 0 0 40px ${gridBorderColor}40`, border: `2px solid ${gridBorderColor}80` }}
      >

        {/* Phase Station: Unlock & Sterilization Screen */}
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

        {/* Phase 40: Unified Tools Menu (FAB Grouping) — START 후엔 숨김 */}
        <div className={`absolute left-4 bottom-[160px] z-[100] flex flex-col gap-2 pointer-events-auto items-center transition-opacity duration-300 ${navStep === 'idle' && !isRiding ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {isToolsOpen && (
            <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
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
                onClick={() => setIsRideSettingsOpen(true)}
                className="w-10 h-10 bg-[#1C1C1E]/80 backdrop-blur-md rounded-xl border border-gray-600/50 flex items-center justify-center text-white shadow-lg"
                title="주행 환경 설정 (속도/야간/자전거 모드/브랜드)"
              >
                <Sliders size={18} />
              </button>

              <button
                onClick={() => setShowStressLayer(prev => !prev)}
                className={`w-10 h-10 backdrop-blur-md rounded-xl border flex items-center justify-center transition-all ${showStressLayer ? 'bg-orange-500/30 text-orange-400 border-orange-400/50 shadow-neon-orange' : 'bg-gray-900/80 text-white border-white/10'}`}
                title="보행자 스트레스 존 표시"
              >
                <Users size={18} />
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

          {/* 🔍 Floating Map Search Bar — idle 상태에서만 노출
              (select_origin / select_destination에서는 가이드 패널 입력이 마이크 포함된 전용 검색이라 중복 회피) */}
          {navStep === 'idle' && !isRiding && (
            <div className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-[100] pointer-events-auto transition-all duration-300 top-4">
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
              showStressLayer={showStressLayer}
              stressZones={STRESS_ZONES}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              panToLocation={panToLocation}
              onStationClick={(station) => {
                setSelectedDropStation(station);
                setIsDropAndGoOpen(true);
              }}
              onRouteReady={() => {
                // navStep이 route_ready로 전환되면 useEffect에서 SafeCorridorSheet 자동 오픈
                // (RideSettings는 SafeCorridorSheet 닫힌 후에 열림)
              }}
              onMapReady={handleMapReady}
              gpsFollowMode={gpsFollowMode}
              setGpsFollowMode={setGpsFollowMode}
              showPMs={showPMs}
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



            {!isRiding && !selectedLocation && navStep === 'idle' && (
              <div className="flex gap-3 mt-1 animate-in slide-in-from-bottom">
                <button
                  onClick={() => {
                    speak(''); // TTS 권한 획득
                    // 주행 시작 클릭 시 RideStartScreen 오픈
                    setRouteOrigin({
                      title: '현재 위치',
                      lat: userLat,
                      lng: userLng,
                      type: 'CURRENT_LOC'
                    });
                    setIsRideStartOpen(true);
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

          {/* Fab Group (Share & GPS) — START 후엔 숨김 */}
          <div className={`absolute bottom-40 right-6 flex flex-col gap-3 z-[100] pointer-events-auto transition-opacity duration-300 ${navStep === 'idle' && !isRiding ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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

        <footer className={`bg-cyber-panel border-t border-white/5 pb-[env(safe-area-inset-bottom)] z-[40] transition-all duration-300 ${navStep === 'idle' && !isRiding ? 'opacity-100 max-h-32' : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'}`}>
          <div className="max-w-xl mx-auto grid grid-cols-5 items-center">
            {/* VIBE */}
            <button
              onClick={() => setIsVibeRouteOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 text-[#FF8C94] outline-none border-none group active:scale-95 transition-all"
            >
              <Moon size={24} className="fill-[#FF8C94]/20 animate-pulse drop-shadow-[0_0_8px_rgba(255,140,148,0.5)] shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-[#FF8C94]/90">VIBE</span>
            </button>

            {/* Activity */}
            <button
              onClick={() => setIsShadowSheetOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0"
            >
              <TrendingUp size={24} className="shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{t("Activity")}</span>
            </button>
            <button
              onClick={() => setIsWalletSheetOpen(true)}
              className="flex flex-col items-center justify-center text-amber-400 hover:text-amber-300 transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center -mt-5 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-xl shrink-0">
                <Wallet size={24} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              </div>
            </button>
            <button
              onClick={() => setIsFavoritesOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 text-gray-500 hover:text-white transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0"
            >
              <Star size={24} className="shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{t("Saved")}</span>
            </button>
            <button
              onClick={() => setIsProfileSheetOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 text-cyber-cyan outline-none border-none ring-0 focus:outline-none focus:ring-0 active:ring-0"
            >
              <div className="w-6 h-6 rounded-full bg-cyber-cyan/20 mb-0.5 overflow-hidden border border-cyber-cyan/50 outline-none ring-0 bg-transparent flex items-center justify-center shadow-[0_0_8px_rgba(64,255,220,0.4)]">
                {profile?.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt="profile"
                    className="w-full h-full object-cover bg-transparent border-none outline-none"
                  />
                ) : (
                  <span className="text-cyber-cyan text-xs font-bold leading-none select-none">
                    {profile?.nickname?.[0]?.toUpperCase() || 'Me'}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyber-cyan w-full text-center truncate px-0.5">
                {profile?.nickname ? profile.nickname.slice(0, 5) : 'ME'}
              </span>
            </button>
          </div>
        </footer>

        {/* 🗺️ RideStartScreen — 주행 시작 & 목적지 설정 (Step 1) */}
        <RideStartScreen
          isOpen={isRideStartOpen}
          onClose={() => setIsRideStartOpen(false)}
          userLat={userLat}
          userLng={userLng}
          routeDestination={routeDestination}
          setRouteDestination={(dest) => {
            setRouteDestination(dest);
            if (dest) {
              setNavStep('select_destination');
            }
          }}
          onProceedToHelmet={() => {
            setIsRideStartOpen(false);
            // 목적지가 설정됐으면 route_ready로 전환 → HelmetStationSelector 자동 열림
            setNavStep('route_ready');
          }}
        />

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
          onOpenShadowImpact={() => setIsShadowSheetOpen(true)}
          userId={user?.id}
        />
        <ShadowImpactSheet
          isOpen={isShadowSheetOpen}
          onClose={() => setIsShadowSheetOpen(false)}
          userName={profile?.nickname || '라이더'}
          rideHistory={rideHistory}
          getLocalNearMisses={getLocalNearMisses}
          metrics={{
            carbonSaved: (profile?.total_distance * 0.2) || 0,
            safetyScore: profile?.safety_score || 0,
            hazardReports: historyMetrics.hazardReports || 0,
            safetyStreak: historyMetrics.safetyStreak || 1
          }}
        />
        <UserProfileSheet
          isOpen={isProfileSheetOpen}
          onClose={() => setIsProfileSheetOpen(false)}
          userName={profile?.nickname || '라이더'}
          userPoints={profile?.points || 0}
          userScore={profile?.safety_score || 0}
          profileImage={profile?.profile_image}
          onAdminOpen={() => {
            setIsProfileSheetOpen(false);
            setIsAdminDashboardOpen(true);
          }}
          onEditProfile={() => setIsProfileEditOpen(true)}
          onMissionReward={(missionId, points) => {
            toast(`🏆 미션 완료! +${points.toLocaleString()}P 적립`, 'success');
          }}
          onDeleteAccount={() => {
            setIsProfileSheetOpen(false);
            setIsAccountDeletionOpen(true);
          }}
        />
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
        />
        <AccountDeletionModal
          isOpen={isAccountDeletionOpen}
          onClose={() => setIsAccountDeletionOpen(false)}
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
            console.log('[C-Safe][chain] step4 → StationReward close, RideSummary open');
            setIsStationRewardOpen(false);
            setIsRideSummaryOpen(true);
          }}
          points={100}
        />

        <RideSummaryModal
          isOpen={isRideSummaryOpen}
          onClose={() => {
            setIsRideSummaryOpen(false);
            // 주행 요약 닫힌 후 AI 코치 카드 표시
            if (finalRideSummary) {
              setCoachingData({
                distance: finalRideSummary.distance,
                time: finalRideSummary.time,
                topSpeed: finalRideSummary.topSpeed,
                suddenBrakeCount: finalRideSummary.suddenBrakeCount || suddenBrakeCount,
                co2Saved: finalRideSummary.co2Saved,
                history: rideHistory,
                helmetOn: helmetOnRef.current
              });
              setIsAICoachOpen(true);
            }
            // 다음 주행을 위해 헬멧 상태 초기화
            helmetOnRef.current = false;
          }}
          metrics={finalRideSummary}
          vibeName={currentVibeRoute ? `${currentVibeRoute.title} (${currentVibeRoute.subTitle.split(' ')[0]})` : "Safety Route"}
          suddenBrakeCount={finalRideSummary?.suddenBrakeCount || suddenBrakeCount}
          userId={user?.id}
          helmetOn={helmetOnRef.current}
        />

        {/* 🧠 AI Safety Coach — 주행 후 개인화 피드백 */}
        <AISafetyCoach
          isOpen={isAICoachOpen}
          onClose={() => setIsAICoachOpen(false)}
          data={coachingData}
        />

        {/* 🗺️ Safe Corridor — 경로 안전 분석 시트 (도구 패널에서 진입) */}
        <SafeCorridorSheet
          isOpen={isSafeCorridorOpen}
          onClose={() => setIsSafeCorridorOpen(false)}
          routeOrigin={routeOrigin}
          routeDestination={routeDestination}
          locations={locations}
          stressZones={STRESS_ZONES}
          onNavigate={() => {
            // 외부 앱 연동 선택 시에도 주행 설정은 건너뜀
            setIsSafeCorridorOpen(false);
            setIsNavLaunchOpen(true);
          }}
        />

        {/* 📱 Navigation Launch — 외부 앱 연동 (동의 → 앱선택 → 안전안내) */}
        <NavigationLaunchSheet
          isOpen={isNavLaunchOpen}
          onClose={() => setIsNavLaunchOpen(false)}
          routeOrigin={routeOrigin}
          routeDestination={routeDestination}
          onLaunch={() => {
            speak('주행 중 화면 주시를 삼가고 음성 안내에 집중해 주세요. 안전 운행하세요!');
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

        {/* 🪖 목적지 근처 헬멧 거점 선택 시트 — route_ready 시 자동 노출, 선택/스킵 후 헬멧 인증으로 진입 */}
        <HelmetStationSelector
          isOpen={isHelmetStationOpen}
          destinationLat={routeDestination?.lat}
          destinationLng={routeDestination?.lng}
          onClose={() => {
            // backdrop/X 닫기 = 선택안함 처리 (헬멧 인증으로 계속 진행)
            setIsHelmetStationOpen(false);
            setIsHelmetAIOpen(true);
          }}
          onSelect={(station) => {
            setSelectedHelmetStation(station);
            toast(`🪖 헬멧 거점 선택 · ${station.name}`, 'success');
            setIsHelmetStationOpen(false);
            setIsHelmetAIOpen(true);
          }}
          onSkip={() => {
            setSelectedHelmetStation(null);
            setIsHelmetStationOpen(false);
            setIsHelmetAIOpen(true);
          }}
        />

        {/* 🪖 헬멧 반납 인증 시트 — 합법 주차 종료 직후, 결제 영수증 진입 직전 */}
        <HelmetReturnSheet
          isOpen={isHelmetReturnOpen}
          selectedStation={selectedHelmetStation}
          endLat={location?.lat ?? userLat}
          endLng={location?.lng ?? userLng}
          rewardPoints={100}
          onConfirm={(station) => {
            const HELMET_RETURN_REWARD = 100;
            // 💰 Supabase profiles.points 서버 영속화 (시작 인증 +100P와 동일 패턴)
            if (user?.id && !String(user.id).startsWith('guest_')) {
              supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
                .then(({ data }) => {
                  const currentPoints = data?.points || 0;
                  return supabase.from('profiles')
                    .upsert({ id: user.id, points: currentPoints + HELMET_RETURN_REWARD })
                    .then(() => loadUser());
                })
                .catch(err => console.warn('[C-Safe] 헬멧 반납 보상 적립 실패:', err?.message || err));

              // 🪖 rides.helmet_return_station_id 기록 (이번 주행 row 보강)
              if (finalRideSummary?.db_ride_id) {
                supabase.from('rides')
                  .update({ helmet_return_station_id: station.id })
                  .eq('id', finalRideSummary.db_ride_id)
                  .then(({ error }) => {
                    if (error) console.warn('[C-Safe] helmet_return_station_id UPDATE 실패:', error?.message || error);
                  });
              }
            }
            // 로컬 쿠폰에도 흔적 (시작 인증 패턴과 동일)
            setCoupons(prev => [{
              id: Date.now(),
              shopName: `헬멧 반납 인증 (${station.name})`,
              amount: `+${HELMET_RETURN_REWARD}P`,
              issuedAt: new Date().toLocaleDateString(),
              type: '안전 보상',
              status: 'active'
            }, ...prev]);
            toast(`🪖 헬멧 반납 완료 · ${station.name} · +${HELMET_RETURN_REWARD}P 적립`, 'success');
            console.log('[C-Safe][chain] step2a → HelmetReturn confirm, PaymentReceipt open. finalRideSummary:', finalRideSummary);
            setIsHelmetReturnOpen(false);
            setSelectedHelmetStation(null);
            setIsPaymentReceiptOpen(true);
          }}
          onSkip={() => {
            console.log('[C-Safe][chain] step2b → HelmetReturn skip, PaymentReceipt open. finalRideSummary:', finalRideSummary);
            setIsHelmetReturnOpen(false);
            setSelectedHelmetStation(null);
            setIsPaymentReceiptOpen(true);
          }}
          onClose={() => {
            // backdrop/X 클릭 = 건너뛰기와 동일 처리 (결제 흐름은 계속 진행)
            console.log('[C-Safe][chain] step2c → HelmetReturn close, PaymentReceipt open. finalRideSummary:', finalRideSummary);
            setIsHelmetReturnOpen(false);
            setSelectedHelmetStation(null);
            setIsPaymentReceiptOpen(true);
          }}
        />

        <HelmetDetectionCamera
          isOpen={isHelmetAIOpen}
          onClose={() => setIsHelmetAIOpen(false)}
          onSuccess={() => {
            // DEMO: 하이브리드 인증(헬멧 + Face Match) — 둘 다 시뮬레이션 단계.
            // 실서비스 전에 실제 헬멧 모델 + face-api.js(또는 외부 API) 도입 + 우회 차단 필수.
            const HYBRID_REWARD = 50;
            const newPoint = {
              id: Date.now(),
              shopName: '하이브리드 인증 (헬멧+본인)',
              amount: `+${HYBRID_REWARD}P`,
              issuedAt: new Date().toLocaleDateString(),
              type: '안전 크레딧',
              status: 'active'
            };
            setCoupons(prev => [newPoint, ...prev]);

            // 💰 Supabase profiles.points 서버 영속화 (퀴즈/주행종료와 동일 패턴)
            if (user?.id && !String(user.id).startsWith('guest_')) {
              supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
                .then(({ data }) => {
                  const currentPoints = data?.points || 0;
                  return supabase.from('profiles')
                    .upsert({ id: user.id, points: currentPoints + HYBRID_REWARD })
                    .then(() => loadUser());
                })
                .catch(err => console.warn('[C-Safe] 하이브리드 인증 보상 적립 실패:', err?.message || err));
            }
            toast(`⚡ 본인 확인 완료 · 안전 크레딧 +${HYBRID_REWARD}P 적립`, 'success');

            // 🛡️ 헬멧 착용 상태 기록 (Near-Miss 맥락 데이터)
            helmetOnRef.current = true;

            // 🏆 초보자 미션: 헬멧 인증 진행 (단순 누적, 정교한 연속성은 추후 보강)
            progressMission('helmet_streak_3', 1);

            setIsHelmetAIOpen(false); // 모달 닫기
            setNavStep('idle'); // 주행 시작 시 목적지 설정 팝업(navStep) 닫기

            // 🎧 이어폰 미착용 자가 확인 게이트 — 통과 시에만 라이딩 시작
            setIsEarphoneGateOpen(true);
          }}
          onSkip={() => {
            // 🟡 헬멧 인증 SKIP — 보상 없음, helmetOn=false 기록
            helmetOnRef.current = false;
            toast('🟡 헬멧 인증 건너뜀 · 보상 없이 주행 시작', 'info');

            setIsHelmetAIOpen(false);
            setNavStep('idle');
            setIsEarphoneGateOpen(true);
          }}
        />

        <EarphoneConfirmGate
          isOpen={isEarphoneGateOpen}
          onCancel={() => setIsEarphoneGateOpen(false)}
          onConfirm={async () => {
            setIsEarphoneGateOpen(false);
            startRide();
            startTracking(); // 실제 GPS 트래킹 시작
            announceVibeStart(currentVibeRoute);

            // 🎯 라이더 행동 모니터링 — 사용자 제스처(onConfirm) 안에서 권한 요청
            //   iOS 13+는 명시적 제스처 콜백 안에서만 requestPermission 허용
            try {
              const granted = await rider.requestPermission();
              if (granted) rider.start();
            } catch (e) {
              console.warn('[C-Safe] DeviceMotion 권한·시작 실패 (Tier3 비활성, 진행 계속):', e?.message || e);
            }
          }}
        />

        {/* 🔗 추천 링크 진입 시 환영 + 7초 시연 (sessionStorage로 1회만 노출) */}
        <ReferralWelcomeModal
          pendingReferral={pendingReferral}
          speak={speak}
          vibrate={vibrate}
        />

        {/* Digital Twin Indicator Modal */}
        <DigitalTwinIndicator
          isOpen={isDigitalTwinOpen}
          onClose={() => setIsDigitalTwinOpen(false)}
          data={digitalTwinData}
        />


        {/* 주행 환경 설정 시트 — 도구 패널에서 진입 (속도/야간/자전거모드/브랜드 필터) */}
        <RideSettings
          isOpen={isRideSettingsOpen}
          onClose={() => setIsRideSettingsOpen(false)}
          onNext={() => setIsRideSettingsOpen(false)}
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

        {/* 5순위: Suspense로 감싸 레이지 로딩 처리 */}
        {isAdminDashboardOpen && (
          <Suspense fallback={
            <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-cyber-cyan tracking-widest uppercase">Admin Loading...</span>
              </div>
            </div>
          }>
            <AdminDashboard onClose={() => setIsAdminDashboardOpen(false)} />
          </Suspense>
        )}


        <HardwareStatusOverlay isSyncing={isHardwareSyncing} isRiding={isRiding} />

      </div>
    </ErrorBoundary>

  );
}

export default App;
