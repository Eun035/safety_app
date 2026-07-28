-- hazards 테이블 생성 SQL
-- Supabase SQL Editor에 복사하여 실행하세요.

CREATE TABLE hazards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  type TEXT NOT NULL, -- 'SLOPE', 'PARKING', 'SCHOOL', 'CROSSING' 등
  description TEXT,
  safety_tip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 실시간 구독 활성화 (Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE hazards;

-- RLS (Row Level Security) 설정 - 테스트를 위해 모두 허용 (실배포시엔 인증된 사용자만 허용하도록 변경 필요)
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view hazards" ON hazards FOR SELECT USING (true);
CREATE POLICY "Anyone can report hazards" ON hazards FOR INSERT WITH CHECK (true);

-- 초기 테스트 데이터 삽입 (옵션)
INSERT INTO hazards (title, lat, lng, type, description, safety_tip)
VALUES 
('단대앞 급경사', 36.833, 127.179, 'SLOPE', '내리막길 경사가 매우 가파릅니다.', '브레이크를 나누어 잡으며 서행하세요.'),
('공학관 안심 주차', 36.841, 127.186, 'PARKING', 'PM 전용 주차 구역입니다.', '통행에 방해되지 않게 가지런히 세워주세요.');
