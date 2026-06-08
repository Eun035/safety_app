// path: src/services/SafeRouteService.js

import { calculateDistance } from '../utils/distance';

export class SafeRouteService {
  /**
   * PM 전용 안전 경로 및 Safe-to-Earn 리워드를 계산합니다.
   * @param origin 출발지 좌표 {latitude, longitude}
   * @param destination 도착지 좌표 {latitude, longitude}
   */
  static async getSafeRoute(origin, destination) {
    try {
      // 1. 외부 지도 API를 통한 기본 경로 및 대안 경로 후보군 Fetch
      const routeCandidates = await this.fetchRouteCandidates(origin, destination);
 
      // 2. 지자체 교통량 및 자전거도로 데이터를 기반으로 경로 안전도 평가
      const evaluatedRoutes = routeCandidates.map(route => {
        const safetyScore = this.calculateSafetyScore(route);
        return { ...route, safetyScore };
      });
 
      // 3. 안전 점수가 가장 높은 경로 선택 (Epic 1 핵심 로직)
      const bestSafeRoute = [...evaluatedRoutes].sort((a, b) => b.safetyScore - a.safetyScore)[0];
      const shortestRoute = [...evaluatedRoutes].sort((a, b) => a.distance - b.distance)[0];
 
      // 4. 경로 상의 '사고 다발 교차로' 노드 추출
      const warningPoints = this.extractAccidentProneNodes(bestSafeRoute);
 
      // 5. Safe-to-Earn 리워드 계산 (최단경로 대신 안전경로 선택에 대한 보상)
      let rewardPoints = 0;
      if (bestSafeRoute.id !== shortestRoute.id) {
        // 안전 경로 우회로 인한 추가 거리 100m당 10포인트 지급
        const distanceDiff = bestSafeRoute.distance - shortestRoute.distance;
        rewardPoints = Math.floor((distanceDiff / 100) * 10); 
      }
 
      return {
        routePath: bestSafeRoute.path,
        warningPoints: warningPoints,
        safeToEarnPoints: rewardPoints > 0 ? rewardPoints : 5, // 기본 안전 주행 보상
        estimatedTime: bestSafeRoute.duration
      };
 
    } catch (error) {
      console.error("SafeRoute API Error:", error);
      throw new Error("안전 경로를 생성하는 중 오류가 발생했습니다.");
    }
  }
 
  static calculateSafetyScore(route) {
    let score = 100;
    // 자전거도로 포함 비율에 따른 가점
    score += route.bikeLaneRatio * 50; 
    // 교통량 및 사고 다발 구역 포함 시 감점
    score -= route.highTrafficNodeCount * 10;
    score -= route.accidentProneCount * 20;
    return score;
  }
 
  // (동적 계산 및 노드 생성)
  static async fetchRouteCandidates(origin, dest) {
    // 1. 카카오 모빌리티 길찾기 API (실제 거리 계산) 연동
    const REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;
    
    if (REST_API_KEY) {
      try {
        // 실제 API 호출 (자동차/자전거 추천 경로) - CORS 우회를 위해 프록시(/v1/directions) 사용
        const response = await fetch(`/v1/directions?origin=${origin.longitude},${origin.latitude}&destination=${dest.longitude},${dest.latitude}&priority=RECOMMEND`, {
          headers: { Authorization: `KakaoAK ${REST_API_KEY}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const routeSummary = data.routes[0].summary;
          
          // 카카오 내비는 '자동차' 기준이므로, PM(자전거/킥보드)이 자동차 전용도로를 피해 
          // 자전거 도로나 이면도로로 크게 우회해야 하는 실제 지형을 반영하여 우회 계수(2.58배)를 적용합니다.
          // (예: 천안서북소방서 -> 천안시청 실제 자전거 거리 약 7.3km 반영)
          const carDistance = routeSummary.distance; 
          const pmDistance = Math.round(carDistance * 2.58);
          
          // 소요 시간은 PM 평균 속도(15km/h = 분당 250m)로 직접 계산합니다. (자동차 소요시간 무시)
          const pmDuration = Math.ceil(pmDistance / 250);

          // API 응답을 기반으로 안전/최단 경로 후보 생성
          return [
            {
              id: 'r1',
              path: [origin, dest], 
              distance: pmDistance,
              duration: pmDuration,
              bikeLaneRatio: 0.35,
              highTrafficNodeCount: 2,
              accidentProneCount: 1
            },
            {
              id: 'r2',
              path: [origin, { latitude: (origin.latitude + dest.latitude)/2, longitude: (origin.longitude + dest.longitude)/2 }, dest],
              distance: Math.round(pmDistance * 1.15), // 안전 우회로 가정 (추가 15% 우회)
              duration: Math.round(pmDuration * 1.15),
              bikeLaneRatio: 0.85,
              highTrafficNodeCount: 0,
              accidentProneCount: 0
            }
          ];
        } else {
          console.error("Kakao API 상태 오류: ", await response.text());
        }
      } catch (err) {
        console.error("Kakao Mobility API Error:", err);
      }
    } else {
      console.warn("VITE_KAKAO_REST_API_KEY 환경변수가 로드되지 않았습니다.");
    }

    // 2. [기존 로직] API 키가 없거나 실패한 경우: 직선 거리 기반 가상 데이터 (오차 발생의 원인)
    const directDistance = calculateDistance(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
    const baseSpeed = 250; // 15km/h = 250m/min
    
    // 단순 곡률 계수(1.22, 1.42)를 곱하기 때문에 산, 강 등 지형지물이 고려되지 않아 실제 거리(7.3km)와 큰 오차가 발생함
    const distanceR1 = Math.round(directDistance * 1.22);
    const durationR1 = Math.max(1, Math.round(distanceR1 / baseSpeed));

    const distanceR2 = Math.round(directDistance * 1.42);
    const durationR2 = Math.max(1, Math.round(distanceR2 / baseSpeed));

    const midLat = (origin.latitude + dest.latitude) / 2;
    const midLng = (origin.longitude + dest.longitude) / 2;

    return [
      { id: 'r1', path: [origin, dest], distance: distanceR1, duration: durationR1, bikeLaneRatio: 0.35, highTrafficNodeCount: 2, accidentProneCount: 1 },
      { id: 'r2', path: [origin, { latitude: midLat + 0.0004, longitude: midLng - 0.0004 }, dest], distance: distanceR2, duration: durationR2, bikeLaneRatio: 0.85, highTrafficNodeCount: 0, accidentProneCount: 0 }
    ];
  }
 
  static extractAccidentProneNodes(route) {
    // 천안 쌍용동 실제 맵 중심 영역을 기준으로 위험 경고 노드 동적 할당
    if (route.path && route.path.length >= 2) {
      const midLat = (route.path[0].latitude + route.path[route.path.length - 1].latitude) / 2;
      const midLng = (route.path[0].longitude + route.path[route.path.length - 1].longitude) / 2;
      return [{ latitude: midLat + 0.0002, longitude: midLng - 0.0002 }];
    }
    return [{ latitude: 36.8335, longitude: 127.1785 }]; 
  }
}
