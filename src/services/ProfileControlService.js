// src/services/ProfileControlService.js

export class ProfileControlService {
  /**
   * 사용자 프로필 및 사용자가 설정한 희망 속도를 기반으로 최종 기기 제어값을 산출합니다.
   * @param {Object} user - { userId: string, age: number, rideCount: number }
   * @param {number} userRequestedSpeed - 사용자가 UI에서 슬라이더로 설정한 희망 제한 속도 (기본 20)
   */
  static async generateDeviceConfig(user, userRequestedSpeed = 20) {
    try {
      if (!user) {
        throw new Error("유효하지 않은 사용자 프로필입니다.");
      }

      // 숫자 타입 안정성 확보
      const safeSpeed = parseInt(userRequestedSpeed, 10) || 20;

      // 1. 기본 상태 초기화
      let config = {
        maxSpeedConfigured: Math.min(Math.max(safeSpeed, 10), 20), // 10~20 사이 값 보장
        accelerationProfile: 'NORMAL',
        brakingProfile: 'NORMAL',
        isBeginnerForced: false,
        isSeniorMode: false,
      };

      // 2. 시니어 안심 모드 평가 (65세 이상)
      if (user.age !== undefined && user.age >= 65) {
        config.isSeniorMode = true;
        config.accelerationProfile = 'LOW'; // 급가속 차단
        config.brakingProfile = 'EXTENDED'; // 제동거리 연장 (소프트 브레이킹)
      }

      // 3. 초보자 모드 강제 평가 (주행 5회 미만)
      if (user.rideCount !== undefined && user.rideCount < 5) {
        config.isBeginnerForced = true;
        // 초보자는 UI에서 20을 설정했더라도 시스템에서 15km/h로 강제 하향 조정
        config.maxSpeedConfigured = Math.min(config.maxSpeedConfigured, 15);
      }

      // IoT 통신 대신, 클라이언트 측(앱 내부)의 속도 감시(알람/TTS) 로직에서 사용하기 위해 config만 반환합니다.

      return config;
    } catch (error) {
      console.error("ProfileControl API Error:", error);
      throw new Error("기기 제어 프로필을 생성하는 중 오류가 발생했습니다.");
    }
  }

}
