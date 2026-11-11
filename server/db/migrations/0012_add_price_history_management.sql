
-- =========================================================
-- S2-DEV-07: Price History Management
-- Add soft delete and audit tracking to price history
-- =========================================================

-- 1. Add price history status and audit columns
ALTER TABLE public.pricehist
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- 2. Add user references for audit tracking
ALTER TABLE public.pricehist
ADD CONSTRAINT fk_pricehist_created_by
    FOREIGN KEY (created_by)
    REFERENCES public.app_user(userid);

ALTER TABLE public.pricehist
ADD CONSTRAINT fk_pricehist_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES public.app_user(userid);

-- 3. Add an index for price history lookup
CREATE INDEX IF NOT EXISTS idx_pricehist_product_effdate
ON public.pricehist (prodcode, effdate DESC);

-- 4. Add an index for active price history
CREATE INDEX IF NOT EXISTS idx_pricehist_active_product_effdate
ON public.pricehist (prodcode, effdate DESC)
WHERE is_deleted = FALSE;
