CREATE TABLE IF NOT EXISTS public.toilets (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DECIMAL(10, 7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  open_24h BOOLEAN DEFAULT FALSE,
  opening_hours VARCHAR(100),
  accessible BOOLEAN DEFAULT FALSE,
  password_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_toilets_name_address UNIQUE (name, address),
  stairs_count INTEGER NOT NULL DEFAULT 0 CHECK (stairs_count >= 0),
  distance_meters DECIMAL(10, 2) CHECK (distance_meters IS NULL OR distance_meters >= 0),
  male_toilet_available BOOLEAN NOT NULL DEFAULT FALSE,
  female_toilet_available BOOLEAN NOT NULL DEFAULT FALSE,
  male_toilet_count INTEGER CHECK (male_toilet_count IS NULL OR male_toilet_count >= 0),
  female_toilet_count INTEGER CHECK (female_toilet_count IS NULL OR female_toilet_count >= 0),
  emergency_bell_available BOOLEAN NOT NULL DEFAULT FALSE,
  diaper_changing_table_available BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_toilets_location
  ON public.toilets (latitude, longitude);

COMMENT ON COLUMN public.toilets.distance_meters IS
  '사용자 현재 위치 기준 거리(m).';

COMMENT ON COLUMN public.toilets.password_required IS
  '화장실 이용 시 비밀번호가 필요한지 여부';

COMMENT ON COLUMN public.toilets.stairs_count IS
  '화장실까지 이동 시 고려할 계단 수';
