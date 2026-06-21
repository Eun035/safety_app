import { create } from 'zustand';
import { REGIONS, detectRegionByLatLng } from '../config/regions';

// 현재 활성 지역 (천안/아산). 한 번 사용자가 수동 변경하면 GPS로 덮어쓰지 않는다.
export const useRegion = create((set, get) => ({
  currentRegion: 'cheonan',
  isManual: false,        // true면 GPS 자동 감지 무시
  hasAutoDetected: false, // 첫 1회만 자동 감지 수행

  setRegion: (id) => {
    if (!REGIONS[id]) return;
    set({ currentRegion: id, isManual: true });
  },

  // 첫 GPS fix에서 1회 자동 감지. 사용자 수동 변경 후에는 호출돼도 무시.
  autoDetectFromGPS: (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const { isManual, hasAutoDetected } = get();
    if (isManual || hasAutoDetected) return;
    const detected = detectRegionByLatLng(lat, lng);
    set({ currentRegion: detected, hasAutoDetected: true });
  },

  getRegionMeta: () => REGIONS[get().currentRegion]
}));
