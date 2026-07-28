-- C-Safe baseline 0: 필요한 확장 먼저 생성
-- (feedbacks의 uuid_generate_v4 → uuid-ossp, near-miss 공간질의 → postgis)
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
