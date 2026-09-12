import { describe, it, expect } from 'vitest';
import { getGridId, getGridCenter, aggregatePathToGrids } from './safetyScoring';

describe('getGridId / getGridCenter', () => {
  it('좌표를 약 50m(0.0005°) 격자 ID로 양자화', () => {
    expect(getGridId(36.833, 127.179)).toBe('36.8330_127.1790');
  });

  it('근접 좌표는 같은 격자로 스냅된다', () => {
    // 0.0001° 차이(약 11m)는 같은 격자
    expect(getGridId(36.8331, 127.1791)).toBe(getGridId(36.833, 127.179));
  });

  it('getGridCenter는 ID를 좌표로 되돌린다', () => {
    const c = getGridCenter('36.8330_127.1790');
    expect(c.lat).toBeCloseTo(36.833, 6);
    expect(c.lng).toBeCloseTo(127.179, 6);
  });

  it('라운드트립: id → center → id 는 안정적', () => {
    const id = getGridId(36.8412, 127.1523);
    const c = getGridCenter(id);
    expect(getGridId(c.lat, c.lng)).toBe(id);
  });
});

describe('aggregatePathToGrids', () => {
  it('빈 경로는 빈 배열', () => {
    expect(aggregatePathToGrids([], true)).toEqual([]);
  });

  it('같은 격자에 속한 점들은 하나로 중복 제거', () => {
    const path = [
      { lat: 36.833, lng: 127.179 },
      { lat: 36.8331, lng: 127.1791 }, // 같은 격자
      { lat: 36.8332, lng: 127.1789 }, // 같은 격자
    ];
    const grids = aggregatePathToGrids(path, true);
    expect(grids).toHaveLength(1);
    expect(grids[0].id).toBe(getGridId(36.833, 127.179));
  });

  it('서로 다른 격자는 각각 유지, is_safe·중심좌표 포함', () => {
    const path = [
      { lat: 36.833, lng: 127.179 },
      { lat: 36.900, lng: 127.200 },
    ];
    const grids = aggregatePathToGrids(path, false);
    expect(grids).toHaveLength(2);
    grids.forEach((g) => {
      expect(g.is_safe).toBe(false);
      expect(typeof g.lat).toBe('number');
      expect(typeof g.lng).toBe('number');
    });
  });
});
