// 테스트용 랜덤 주행 데이터 생성기.
// 데스크톱(실 GPS 없음)에서도 라이드 서머리·스피드 히트 루트·베지어 곡선을 확인하기 위해
// "실제 GPS가 기록되듯" 곡선 경로 + 지표를 만든다.
//   - 시작~끝: 직선 변위 약 1~15km
//   - 소요시간: 1~30분
//   - 경로: 사인파 곡선 + 구간별 속도 변화(스피드 히트 색이 보이도록)

const CENTER = { lat: 36.8151, lng: 127.1139 }; // 천안 대략 중심

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * @returns {{
 *   id:string, date:string, startTime:number,
 *   distance:number, time:number, topSpeed:string, avgSpeed:number,
 *   suddenBrakeCount:number, co2Saved:string, helmetOnPct:number, isSafe:boolean,
 *   path:{lat:number,lng:number,ts:number}[], destination:null
 * }}
 */
export function generateMockRide() {
    const distanceKm = +rand(1, 15).toFixed(2);            // 이동거리 1~15km
    // PM 현실 평균속도(10~24km/h)로 소요시간 도출 → 1~30분으로 클램프(비현실 속도 방지)
    const avgKmh = rand(10, 24);
    const durationMin = Math.max(1, Math.min(30, Math.round((distanceKm / avgKmh) * 60)));
    const suddenBrakeCount = Math.random() < 0.55 ? 0 : Math.floor(rand(1, 4)); // 0~3
    const helmetOnPct = Math.random() < 0.75 ? 100 : 0;

    // 시작점: 중심 부근 랜덤
    const startLat = CENTER.lat + rand(-0.03, 0.03);
    const startLng = CENTER.lng + rand(-0.03, 0.03);

    // 진행 방향(heading) + 곡선 파라미터
    const heading = rand(0, Math.PI * 2);
    const ux = Math.cos(heading), uy = Math.sin(heading);   // 진행 단위벡터(동/북)
    const px = -uy, py = ux;                                 // 수직(곡선 오프셋 방향)
    const totalDisp = distanceKm * 1000;                     // 직선 변위(m)
    const waves = 1 + Math.floor(Math.random() * 3);         // 1~3개 굽이
    const amp = totalDisp * rand(0.08, 0.18);                // 곡선 진폭
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos(startLat * Math.PI / 180);

    const N = 45 + Math.floor(Math.random() * 40);           // 45~84 점
    const startTs = Date.now() - durationMin * 60000;
    const dtMs = (durationMin * 60000) / (N - 1);

    const path = [];
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        // along-track 거리: 속도 변화(0.5~1.5x) → 구간 속도 다양 → 스피드 색
        const along = totalDisp * (t - 0.5 * Math.sin(2 * Math.PI * t) / (2 * Math.PI));
        const offset = amp * Math.sin(t * Math.PI * waves);
        const east = ux * along + px * offset;
        const north = uy * along + py * offset;
        const jLat = rand(-4, 4) / mPerDegLat;   // 미세 노이즈(±4m)
        const jLng = rand(-4, 4) / mPerDegLng;
        path.push({
            lat: startLat + north / mPerDegLat + jLat,
            lng: startLng + east / mPerDegLng + jLng,
            ts: Math.round(startTs + t * durationMin * 60000),
        });
    }

    const avgSpeed = +(distanceKm / (durationMin / 60)).toFixed(1);
    const topSpeed = Math.min(30, avgSpeed * rand(1.15, 1.45)).toFixed(1); // PM 상한 ~30km/h
    const co2Saved = (distanceKm * 0.13).toFixed(1);

    return {
        id: `mock-${startTs}`,
        date: new Date(startTs).toLocaleDateString(),
        startTime: startTs,
        distance: distanceKm,
        time: durationMin,
        topSpeed,
        avgSpeed,
        suddenBrakeCount,
        co2Saved,
        helmetOnPct,
        isSafe: suddenBrakeCount === 0,
        path,
        destination: null,
    };
}
