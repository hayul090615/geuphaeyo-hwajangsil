CREATE TABLE IF NOT EXISTS public.service_requests (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL CHECK (category IN ('feature', 'data', 'bug', 'other')),
  message VARCHAR(1000) NOT NULL,
  reply_email VARCHAR(254),
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS service_requests_status_created_at_idx
  ON public.service_requests (status, created_at DESC);
