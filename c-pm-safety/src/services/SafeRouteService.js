// path: src/services/SafeRouteService.js

export class SafeRouteService {
  /**
   * PM 전용 안전 경로 및 Safe-to-Earn 리워드를 계산합니다.
   * @param origin 출발지 좌표 {latitude, longitude}
   * @param destination 도착지 좌표 {latitude, longitude}
   */
  static async getSafeRoute(origin, destination) {
    try {
      // 1. 외부 지도 API를 통한 기본 경로 및 대안 경로 후보군 Fetch (Mocking)
      const routeCandidates = await this.fetchRouteCandidates(origin, destination);

      // 2. 지자체 교통량 및 자전거도로 데이터를 기반으로 경로 안전도 평가
      const evaluatedRoutes = routeCandidates.map(route => {
        const safetyScore = this.calculateSafetyScore(route);
        return { ...route, safetyScore };
      });

      // 3. 안전 점수가 가장 높은 경로 선택 (Epic 1 핵심 로직)
      const bestSafeRoute = evaluatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore)[0];
      const shortestRoute = evaluatedRoutes.sort((a, b) => a.distance - b.distance)[0];

      // 4. 경로 상의 '사고 다발 교차로' 노드 추출
      const warningPoints = this.extractAccidentProneNodes(bestSafeRoute);

      // 5. Safe-to-Earn 리워드 계산 (최단경로 대신 안전경로 선택에 대한 보상)
      let rewardPoints = 0;
      if (bestSafeRoute.id !== shortestRoute.id) {
        // 안전 경로 우회로 인한 추가 거리 100m당 10포인트 지급 등 비즈니스 로직 적용
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

  // (Mock Methods)
  static async fetchRouteCandidates(origin, dest) {
    // 실제 구현 시 Kakao Mobility, Tmap 등의 API 연동 필요
    return [{ id: 'r1', path: [origin, dest], distance: 2000, duration: 15, bikeLaneRatio: 0.8, highTrafficNodeCount: 1, accidentProneCount: 1 }];
  }

  static extractAccidentProneNodes(route) {
    // 지자체 사고 다발 구역 좌표와 경로 좌표를 교차 검증하여 반환
    return [{ latitude: 37.5665, longitude: 126.9780 }]; // Mock data
  }
}
