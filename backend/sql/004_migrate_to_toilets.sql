-- 기존에 restrooms 테이블을 이미 만든 경우에만 한 번 실행하세요.
-- 새로 시작하는 경우에는 002_create_tables.sql을 사용하면 됩니다.

DO $$
BEGIN
  IF to_regclass('public.restrooms') IS NOT NULL
     AND to_regclass('public.toilets') IS NULL THEN
    ALTER TABLE public.restrooms RENAME TO toilets;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'toilets'
      AND column_name = 'operating_hours'
  ) THEN
    ALTER TABLE public.toilets RENAME COLUMN operating_hours TO opening_hours;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'toilets'
      AND column_name = 'accessible_toilet_available'
  ) THEN
    ALTER TABLE public.toilets RENAME COLUMN accessible_toilet_available TO accessible;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'toilets'
      AND column_name = 'restroom_password_required'
  ) THEN
    ALTER TABLE public.toilets RENAME COLUMN restroom_password_required TO password_required;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.toilets
  ADD COLUMN IF NOT EXISTS open_24h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100),
  ADD COLUMN IF NOT EXISTS accessible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_required BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.toilets
  ALTER COLUMN name TYPE VARCHAR(100) USING LEFT(name, 100),
  ALTER COLUMN address TYPE VARCHAR(255) USING LEFT(address, 255),
  ALTER COLUMN latitude TYPE DECIMAL(10, 7),
  ALTER COLUMN longitude TYPE DECIMAL(10, 7),
  ALTER COLUMN opening_hours TYPE VARCHAR(100) USING LEFT(opening_hours, 100),
  ALTER COLUMN created_at TYPE TIMESTAMP USING created_at::timestamp,
  ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at::timestamp,
  ALTER COLUMN open_24h SET DEFAULT FALSE,
  ALTER COLUMN accessible SET DEFAULT FALSE,
  ALTER COLUMN password_required SET DEFAULT FALSE,
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_restrooms_name_address'
      AND conrelid = 'public.toilets'::regclass
  ) THEN
    ALTER TABLE public.toilets
      RENAME CONSTRAINT uq_restrooms_name_address TO uq_toilets_name_address;
  END IF;

  IF to_regclass('public.idx_restrooms_location') IS NOT NULL THEN
    ALTER INDEX public.idx_restrooms_location RENAME TO idx_toilets_location;
  END IF;
END $$;
