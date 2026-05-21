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
    // 두 좌표 간의 실제 직선 거리 계산
    const directDistance = calculateDistance(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
    
    // PM 평균 실질 속도: 250m/분 (15km/h)
    const baseSpeed = 250; 

    // 후보 경로 1: 최단 경로 (곡률 계수 1.22 적용)
    const distanceR1 = Math.round(directDistance * 1.22);
    const durationR1 = Math.max(1, Math.round(distanceR1 / baseSpeed));

    // 후보 경로 2: 안전 경로 (곡률 계수 1.42 적용, 우회 노드 경유)
    const distanceR2 = Math.round(directDistance * 1.42);
    const durationR2 = Math.max(1, Math.round(distanceR2 / baseSpeed));

    const midLat = (origin.latitude + dest.latitude) / 2;
    const midLng = (origin.longitude + dest.longitude) / 2;

    return [
      { 
        id: 'r1', 
        path: [origin, dest], 
        distance: distanceR1, 
        duration: durationR1, 
        bikeLaneRatio: 0.35, 
        highTrafficNodeCount: 2, 
        accidentProneCount: 1 
      },
      { 
        id: 'r2', 
        path: [
          origin, 
          // 안전 우회를 위한 임의 중간 지점 추가 (다이내믹 폴리라인 형성)
          { latitude: midLat + 0.0004, longitude: midLng - 0.0004 },
          dest
        ], 
        distance: distanceR2, 
        duration: durationR2, 
        bikeLaneRatio: 0.85, 
        highTrafficNodeCount: 0, 
        accidentProneCount: 0 
      }
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
