// 지역(천안·아산) 메타데이터 단일 소스
// bbox = [minLat, minLng, maxLat, maxLng]

export const REGIONS = {
  cheonan: {
    id: 'cheonan',
    name: '천안',
    center: { lat: 36.833, lng: 127.179 },
    bbox: [36.78, 127.10, 36.86, 127.22],
    level: 6
  },
  asan: {
    id: 'asan',
    name: '아산',
    center: { lat: 36.7898, lng: 127.0019 },
    bbox: [36.74, 126.90, 36.82, 127.12],
    level: 7
  }
};

export const REGION_LIST = Object.values(REGIONS);

// GPS 좌표가 어느 지역 bbox 안에 있는지 판정. 어디에도 안 들면 가장 가까운 중심.
export function detectRegionByLatLng(lat, lng) {
  for (const r of REGION_LIST) {
    const [minLat, minLng, maxLat, maxLng] = r.bbox;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return r.id;
    }
  }
  // bbox 밖 → 가장 가까운 중심
  let best = null;
  let bestD = Infinity;
  for (const r of REGION_LIST) {
    const d = (r.center.lat - lat) ** 2 + (r.center.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = r.id; }
  }
  return best || 'cheonan';
}
