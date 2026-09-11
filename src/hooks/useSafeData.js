import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import i18n from '../locales/i18n';
import { useGeolocation } from './useGeolocation';
import { useRegion } from './useRegion';
import { REGIONS } from '../config/regions';

// 날씨 조회 좌표를 격자로 뭉갠다. 주행 중 GPS는 초 단위로 바뀌지만
// 기상 조건은 그 해상도로 변하지 않으므로, 약 5km 격자를 벗어날 때만 다시 조회한다.
const WEATHER_GRID_DEG = 0.05;
// toFixed로 마무리하지 않으면 126.55가 126.55000000000001로 나와 URL이 지저분해진다
const snapToGrid = (v) => Number((Math.round(v / WEATHER_GRID_DEG) * WEATHER_GRID_DEG).toFixed(2));

// 주행 중 기상이 바뀔 수 있으므로 주기적으로도 갱신한다.
const WEATHER_REFRESH_MS = 10 * 60 * 1000;

/**
 * C-Safe Supabase 실시간 데이터베이스 연동 훅
 * 1. 초기 로딩 시 DB에서 모든 안전 데이터를 가져옵니다.
 * 2. Supabase Realtime을 통해 새로운 제보를 실시간으로 수신합니다.
 * 3. 기상 위험도 체크 및 Fail-safe 대응 로직을 포함합니다.
 */
export const useSafeData = () => {
  const [locations, setLocations] = useState([]);
  const [tagoPms, setTagoPms] = useState([]); // Phase 21: TAGO API Data
  const [weatherRisk, setWeatherRisk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentTemp, setCurrentTemp] = useState('24°C'); // 기본값

  // 기상 조회 기준 좌표 — 사용자 현재 위치 우선, 없으면 선택된 지역 중심
  const location = useGeolocation(s => s.location);
  const currentRegion = useRegion(s => s.currentRegion);
  const regionCenter = (REGIONS[currentRegion] || REGIONS.cheonan).center;

  const weatherLat = snapToGrid(location?.lat ?? regionCenter.lat);
  const weatherLng = snapToGrid(location?.lng ?? regionCenter.lng);

  // 실시간 Open-Meteo API 날씨 가져오기 — 사용자 현재 위치 기준.
  // GPS가 아직 없으면(권한 대기·거부) 선택된 지역 중심 좌표로 조회한다.
  const fetchWeather = useCallback(async (lat, lng) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
        + '&current=temperature_2m,precipitation,weather_code&timezone=Asia%2FSeoul';
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.current) {
        const { temperature_2m, weather_code } = data.current;
        setCurrentTemp(`${Math.round(temperature_2m)}°C`);

        // WMO Weather interpretation codes (비, 눈, 뇌우 등 위험 기상 조건)
        // 51~67 (비/눈), 71~82 (눈/진눈깨비), 95~99 (뇌우)
        const isRisky = (weather_code >= 51 && weather_code <= 67) ||
          (weather_code >= 71 && weather_code <= 82) ||
          (weather_code >= 95 && weather_code <= 99);

        setWeatherRisk(isRisky);
      }
    } catch (error) {
      // 안전 경고를 추측으로 만들어내지 않는다. 예전엔 실패 시 30% 확률로
      // 위험을 띄우는 테스트 기믹이 있었는데, 근거 없는 경고는 경고 자체의
      // 신뢰를 떨어뜨린다. 조회에 실패하면 '위험 없음'으로 두고 다음 주기에 재시도한다.
      console.error("[C-Safe] 실시간 날씨 로드 실패 — 기상 경고는 표시하지 않음:", error.message);
      setWeatherRisk(false);
    }
  }, []);

  // 초기 데이터 가져오기 (Hazards from Supabase)
  const fetchHazards = async () => {
    try {
      const { data, error } = await supabase
        .from('hazards')
        .select('*')
        .eq('hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // ⚠️ RLS 거부는 SELECT에서 에러가 아니라 '빈 결과'로 온다.
      // 예전에 hazards 정책이 통째로 사라졌을 때 여기서 0행을 정상으로 받아
      // 지도에 위험구역이 하나도 안 떴는데, 폴백은 catch에만 있어 발동하지
      // 않았다. 그래서 고장이 오래 드러나지 않았다. 0행도 이상 신호로 다룬다.
      if (!data || data.length === 0) {
        console.warn('[C-Safe] hazards 0행 — RLS 차단이거나 데이터가 비어 있습니다. 폴백을 사용합니다.');
        throw new Error('hazards returned no rows');
      }

      // DB 필드를 UI 컴포넌트 형식에 맞게 맵핑 (snake_case -> camelCase)
      const mappedData = data.map(item => ({
        ...item,
        desc: item.description,
        safetyTip: item.safety_tip
      }));

      setLocations(mappedData);
    } catch (error) {
      console.error("[C-Safe] 데이터 로드 실패 (Fallback 진행):", error.message);
      
      // Fallback: 하드코딩된 안전 데이터 (DB가 없을 경우 대비)
      const fallbackHazards = [
        {
          id: 'fb-1', title: i18n.t('sd_fb1_title'), lat: 36.8405, lng: 127.1720,
          type: 'SLOPE', description: i18n.t('sd_fb1_desc'),
          safetyTip: i18n.t('sd_fb1_tip')
        },
        {
          id: 'fb-2', title: i18n.t('sd_fb2_title'), lat: 36.8320, lng: 127.1780,
          type: 'accident', description: i18n.t('sd_fb2_desc'),
          safetyTip: i18n.t('sd_fb2_tip')
        },
        {
          id: 'fb-3', title: i18n.t('sd_fb3_title'), lat: 36.8325, lng: 127.1775,
          type: '도로파손', description: i18n.t('sd_fb3_desc'),
          safetyTip: i18n.t('sd_fb3_tip')
        }
      ];

      setLocations(fallbackHazards.map(item => ({
        ...item,
        desc: item.description,
        safetyTip: item.safetyTip
      })));
    }
  };

  // Phase 21: 실시간 TAGO 공공데이터포털(PM) 연동 (API 오류로 인한 Mock Data 대체 로직 - 현실적인 좌표 맵핑)
  const fetchTagoPMs = async () => {
    try {
      // 천안 시내/대학가 중심의 실제 도로/인도 주변 현실적인 하드코딩 좌표 풀
      const realisticSpots = [
        { lat: 36.8199, lng: 127.1565 }, { lat: 36.8192, lng: 127.1558 }, { lat: 36.8205, lng: 127.1572 }, // 천안터미널 / 신부동
        { lat: 36.8415, lng: 127.1728 }, { lat: 36.8422, lng: 127.1741 }, { lat: 36.8398, lng: 127.1710 }, // 단국대 천안 (학생회관, 도서관 부근 도로)
        { lat: 36.8310, lng: 127.1785 }, { lat: 36.8302, lng: 127.1792 }, { lat: 36.8325, lng: 127.1770 }, // 상명대 천안 정문 / 기숙사길
        { lat: 36.8250, lng: 127.1650 }, { lat: 36.8265, lng: 127.1680 }, { lat: 36.8280, lng: 127.1705 }  // 두정동 / 성정동 연결 도로
      ];

      const brands = ['지쿠(GCOO)', '빔(Beam)', '씽씽(XingXing)', '킥고잉(Kickgoing)'];
      const statuses = [i18n.t('sd_status_available'), i18n.t('sd_status_lowbat'), i18n.t('sd_status_maintenance')];

      // 풀에서 사용할 위치들을 랜덤으로 6~9개 선택
      const shuffledSpots = realisticSpots.sort(() => 0.5 - Math.random());
      const selectedSpots = shuffledSpots.slice(0, Math.floor(Math.random() * 4) + 6);

      const mappedPms = selectedSpots.map((spot, idx) => {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const battery = Math.floor(Math.random() * 100);

        return {
          id: `tago_mock_${idx}`,
          lat: spot.lat + (Math.random() - 0.5) * 0.0002, // 도로 안에서 미세하게만 랜덤 배치 (오차범위 20m 이내)
          lng: spot.lng + (Math.random() - 0.5) * 0.0002,
          type: 'tago_pm',
          operator: brand,
          deviceId: `DEV-${Math.floor(Math.random() * 9999)}`,
          status: status,
          battery: battery,
          title: `${status} (${brand})`,
          desc: i18n.t('sd_battery_remaining', { n: battery }),
          safetyTip: i18n.t('sd_device_no', { n: Math.floor(Math.random() * 9999) })
        };
      });

      setTagoPms(mappedPms);
    } catch (error) {
      console.error("[C-Safe] TAGO PM 데이터 로딩 실패:", error);
    }
  };

  // 실시간 제보 업로드 함수
  // 서버 RPC 경유: reporter_id(auth.uid())를 서버에서 비공개로 기록하고
  // 제보자별 24h 레이트 리밋을 건다. hazards 직접 INSERT는 봉인되어 있다.
  const reportHazard = async (newHazard) => {
    try {
      const { data, error } = await supabase.rpc('report_hazard', {
        p_title: newHazard.title,
        p_lat: newHazard.lat,
        p_lng: newHazard.lng,
        p_type: newHazard.type,
        p_description: newHazard.desc ?? null,
        p_safety_tip: newHazard.safetyTip ?? null
      });

      if (error) throw error;
      if (!data?.ok) {
        return { success: false, error: data?.reason || 'report_failed' };
      }
      return { success: true, hazardId: data.hazard_id };
    } catch (error) {
      console.error("[C-Safe] 제보 업로드 실패:", error.message);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);

      // Phase 26: 10초 타임아웃 추가 (데이터 로딩 지연 시 무한 대기 방지)
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn("[C-Safe] 초기 로딩 타임아웃 발생 - 지도로 강제 진입합니다.");
          resolve();
        }, 10000);
      });

      // 날씨는 위치가 잡히는 대로 아래 전용 effect가 조회하므로 여기선 제외한다
      await Promise.race([
        Promise.all([
          fetchHazards(),
          fetchTagoPMs()
        ]),
        timeoutPromise
      ]);

      setIsLoading(false);
    };

    initialize();

    // 상시 30초마다 TAGO API 갱신
    const tagoInterval = setInterval(fetchTagoPMs, 30000);

    // --- Supabase Realtime 구독 설정 ---
    const channel = supabase
      .channel('hazards_realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hazards' },
        (payload) => {
          console.log('[C-Safe] 실시간 새 데이터 수신:', payload.new);

          const newItem = {
            ...payload.new,
            desc: payload.new.description,
            safetyTip: payload.new.safety_tip
          };

          // 새 데이터를 기존 리스트의 맨 앞에 추가
          setLocations((prev) => [newItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      console.log('[C-Safe] 불필요한 Realtime 채널 구독 해제 (Memory Leak 방지)');
      clearInterval(tagoInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // 기상 — 격자를 벗어나게 이동했을 때(약 5km) + 10분마다 갱신.
  // 초 단위 GPS 갱신마다 API를 두드리지 않도록 좌표를 격자로 뭉개 의존성에 쓴다.
  useEffect(() => {
    fetchWeather(weatherLat, weatherLng);
    const id = setInterval(() => fetchWeather(weatherLat, weatherLng), WEATHER_REFRESH_MS);
    return () => clearInterval(id);
  }, [weatherLat, weatherLng, fetchWeather]);

  return { locations, tagoPms, weatherRisk, currentTemp, isLoading, reportHazard };
};
