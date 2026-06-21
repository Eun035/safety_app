-- Phase 45: 무사고 주행 데이터 상세화 및 안전 지도 구축 스키마

-- 1. 상세 주행 경로 저장 테이블
CREATE TABLE IF NOT EXISTS ride_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  path_data JSONB NOT NULL, -- [{lat, lng, ts}, ...]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 안전 격자 점수 테이블 (50m 단위 격자)
CREATE TABLE IF NOT EXISTS safety_grid_scores (
  grid_id TEXT PRIMARY KEY, -- "lat_fixed_lng_fixed" (예: "36.833_127.179")
  lat_center FLOAT NOT NULL,
  lng_center FLOAT NOT NULL,
  safe_pass_count INTEGER DEFAULT 0,
  risk_event_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE safety_grid_scores;

-- 4. RLS 설정
ALTER TABLE ride_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_grid_scores ENABLE ROW LEVEL SECURITY;

-- 5. 정책 설정
CREATE POLICY "Users can insert their own ride paths" ON ride_paths FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM rides WHERE id = ride_id AND user_id = auth.uid())
);
CREATE POLICY "Everyone can view safety grid scores" ON safety_grid_scores FOR SELECT USING (true);

-- 6. 안전 점수 업데이트용 RPC (Stored Procedure)
-- 이 함수는 주행 종료 시 클라이언트에서 한 번의 호출로 여러 그리드 노드를 업데이트하기 위함입니다.
-- grids: [{id: text, lat: float, lng: float, is_safe: boolean}] 형태의 JSONB
CREATE OR REPLACE FUNCTION update_safety_scores(grids JSONB)
RETURNS VOID AS $$
DECLARE
  grid_item RECORD;
BEGIN
  FOR grid_item IN SELECT * FROM jsonb_to_recordset(grids) AS x(id TEXT, lat FLOAT, lng FLOAT, is_safe BOOLEAN)
  LOOP
    INSERT INTO safety_grid_scores (grid_id, lat_center, lng_center, safe_pass_count, risk_event_count, last_updated)
    VALUES (grid_item.id, grid_item.lat, grid_item.lng, 
            CASE WHEN grid_item.is_safe THEN 1 ELSE 0 END,
            CASE WHEN NOT grid_item.is_safe THEN 1 ELSE 0 END,
            now())
    ON CONFLICT (grid_id) DO UPDATE SET
      safe_pass_count = safety_grid_scores.safe_pass_count + (CASE WHEN grid_item.is_safe THEN 1 ELSE 0 END),
      risk_event_count = safety_grid_scores.risk_event_count + (CASE WHEN NOT grid_item.is_safe THEN 1 ELSE 0 END),
      last_updated = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;
