import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * useHazardHeatmap
 * ─────────────────────────────────────────────────────────────
 * 뷰포트 기반 위험 클러스터 페치 + 실시간 invalidation.
 *
 * 백엔드: supabase_p4_nearmiss_geography_heatmap.sql
 *   - RPC: get_near_miss_clusters(sw_lat, sw_lng, ne_lat, ne_lng,
 *                                 since_days, grid_decimals, min_count)
 *   - SECURITY DEFINER + min_count(>=1) 으로 k-익명성 가드
 *
 * 파라미터
 *   mapBounds     {{sw:{lat,lng}, ne:{lat,lng}} | null}
 *   enabled       boolean  — 토글 OFF 시 페치 자체를 스킵
 *   sinceDays     number   — 최근 N일 (기본 30)
 *   gridDecimals  number   — 3≈110m, 2≈1.1km (기본 3)
 *   minCount      number   — 최소 카운트 필터 (기본 2; 시드 부족 시 1)
 *   debounceMs    number   — bbox 변화 디바운스 (기본 300ms)
 *
 * 반환
 *   { clusters, loading, error, lastUpdated }
 *     clusters: [{ cluster_lat, cluster_lng, event_count,
 *                  avg_speed, weather_pct, last_seen }]
 *
 * 통합 패턴 (MapContainer.jsx):
 *   const { clusters } = useHazardHeatmap({ mapBounds, enabled: showHazardHeatmap });
 *   const hazardHeatmapOverlay = useMemo(() => clusters.map(c => (
 *     <Circle key={...} center={{lat:c.cluster_lat,lng:c.cluster_lng}}
 *             radius={50} fillColor="#ef4444"
 *             fillOpacity={Math.min(c.event_count/10, 1) * 0.5}
 *             strokeWeight={0} />
 *   )), [clusters]);
 */
export const useHazardHeatmap = ({
    mapBounds,
    enabled = true,
    sinceDays = 30,
    gridDecimals = 3,
    minCount = 2,
    debounceMs = 300
} = {}) => {
    const [clusters, setClusters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const debounceTimer = useRef(null);
    const abortRef = useRef(0);          // 동시 요청 race condition 가드
    const lastBboxKeyRef = useRef(null); // 동일 bbox 중복 페치 방지

    useEffect(() => {
        if (!enabled) {
            setClusters([]);
            return;
        }
        if (!mapBounds?.sw || !mapBounds?.ne) return;

        const { sw, ne } = mapBounds;
        const bboxKey = [
            sw.lat.toFixed(4), sw.lng.toFixed(4),
            ne.lat.toFixed(4), ne.lng.toFixed(4),
            sinceDays, gridDecimals, minCount
        ].join('|');

        if (bboxKey === lastBboxKeyRef.current) return;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            const myToken = ++abortRef.current;
            lastBboxKeyRef.current = bboxKey;
            setLoading(true);
            setError(null);

            try {
                const { data, error: rpcError } = await supabase.rpc(
                    'get_near_miss_clusters',
                    {
                        sw_lat: sw.lat,
                        sw_lng: sw.lng,
                        ne_lat: ne.lat,
                        ne_lng: ne.lng,
                        since_days: sinceDays,
                        grid_decimals: gridDecimals,
                        min_count: minCount
                    }
                );

                if (myToken !== abortRef.current) return; // 더 최신 요청이 진행 중

                if (rpcError) {
                    console.warn('[HazardHeatmap] RPC 실패:', rpcError.message);
                    setError(rpcError);
                    setClusters([]);
                } else {
                    setClusters(Array.isArray(data) ? data : []);
                    setLastUpdated(Date.now());
                }
            } catch (err) {
                if (myToken !== abortRef.current) return;
                console.warn('[HazardHeatmap] 페치 예외:', err);
                setError(err);
                setClusters([]);
            } finally {
                if (myToken === abortRef.current) setLoading(false);
            }
        }, debounceMs);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [
        enabled,
        mapBounds?.sw?.lat, mapBounds?.sw?.lng,
        mapBounds?.ne?.lat, mapBounds?.ne?.lng,
        sinceDays, gridDecimals, minCount, debounceMs
    ]);

    // 실시간 invalidation — 새 near_miss_event INSERT 시 캐시 무효화 후 재요청
    useEffect(() => {
        if (!enabled) return;

        const channel = supabase
            .channel('hazard_heatmap_updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'near_miss_events' },
                () => {
                    lastBboxKeyRef.current = null; // 강제 무효화
                    // 다음 bbox 변경(또는 같은 bbox)에 재페치되도록 force-rerun
                    // 즉시 페치하려면 별도 카운터를 의존성에 두는 방식도 가능
                    if (mapBounds?.sw && mapBounds?.ne) {
                        const { sw, ne } = mapBounds;
                        supabase.rpc('get_near_miss_clusters', {
                            sw_lat: sw.lat, sw_lng: sw.lng,
                            ne_lat: ne.lat, ne_lng: ne.lng,
                            since_days: sinceDays,
                            grid_decimals: gridDecimals,
                            min_count: minCount
                        }).then(({ data, error: rpcError }) => {
                            if (rpcError) return;
                            setClusters(Array.isArray(data) ? data : []);
                            setLastUpdated(Date.now());
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [
        enabled,
        mapBounds?.sw?.lat, mapBounds?.sw?.lng,
        mapBounds?.ne?.lat, mapBounds?.ne?.lng,
        sinceDays, gridDecimals, minCount
    ]);

    return { clusters, loading, error, lastUpdated };
};
