import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  // 실시간 Opean-Meteo API 날씨 가져오기
  const fetchWeather = async () => {
    try {
      // 천안 단대호수 기준 좌표
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=36.833&longitude=127.179&current=temperature_2m,precipitation,weather_code&timezone=Asia%2FSeoul');
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
      console.error("[C-Safe] 실시간 날씨 로드 실패 (Fallback 진행):", error.message);
      // Fallback: 30% 확률 테스트 기믹
      setWeatherRisk(Math.random() < 0.3);
      setCurrentTemp('20°C');
    }
  };

  // 초기 데이터 가져오기 (Hazards from Supabase)
  const fetchHazards = async () => {
    try {
      const { data, error } = await supabase
        .from('hazards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
          id: 'fb-1', title: '단국대 학생회관 앞 급경사', lat: 36.8405, lng: 127.1720, 
          type: 'SLOPE', description: '내리막길 속도 주의 구역', 
          safetyTip: '속도를 10km/h 이하로 유지하고 브레이크 점검을 꼭 하세요.' 
        },
        { 
          id: 'fb-2', title: '안서동 천호지 입구 교차로', lat: 36.8320, lng: 127.1780, 
          type: 'accident', description: '빈번한 사고 발생 구역', 
          safetyTip: '좌우 합류 차량을 확인하고 일시 정지 후 출발하세요.' 
        },
        {
          id: 'fb-3', title: '상명대 정문 보도 파손', lat: 36.8325, lng: 127.1775,
          type: '도로파손', description: '보도블록 돌출 주의',
          safetyTip: '바퀴 끼임 사고 위험이 있으니 우회하거나 서행하세요.'
        }
      ];

      setLocations(fallbackHazards.map(item => ({
        ...item,
        desc: item.description,
        safetyTip: item.safety_tip
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
      const statuses = ['대여 가능', '배터리 부족', '점검 중'];

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
          desc: `잔여 배터리: ${battery}%`,
          safetyTip: `기기 번호: DEV-${Math.floor(Math.random() * 9999)}`
        };
      });

      setTagoPms(mappedPms);
    } catch (error) {
      console.error("[C-Safe] TAGO PM 데이터 로딩 실패:", error);
    }
  };

  // 실시간 제보 업로드 함수
  const reportHazard = async (newHazard) => {
    try {
      const { data, error } = await supabase
        .from('hazards')
        .insert([
          {
            title: newHazard.title,
            lat: newHazard.lat,
            lng: newHazard.lng,
            type: newHazard.type,
            description: newHazard.desc,
            safety_tip: newHazard.safetyTip
          }
        ]);

      if (error) throw error;
      return { success: true };
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

      await Promise.race([
        Promise.all([
          fetchHazards(),
          fetchWeather(),
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

  return { locations, tagoPms, weatherRisk, currentTemp, isLoading, reportHazard };
};
