-- Add a stable public_id to complex table for cross-referencing favorites
-- Safe to run multiple times

-- 1) Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'complex' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE public.complex ADD COLUMN public_id text;
  END IF;
END$$;

-- 2) Backfill: prefer existing id, else deterministic hash of name+address
UPDATE public.complex c
SET public_id = COALESCE(
  c.public_id,
  (CASE
     WHEN c.id IS NOT NULL THEN c.id::text
     ELSE 'complex-' || substring(md5(coalesce(c.name,'') || '-' || coalesce(c.address,'')) for 12)
   END)
)
WHERE c.public_id IS NULL;

-- 3) Create unique index for fast lookup and to ensure stability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'complex_public_id_key'
  ) THEN
    CREATE UNIQUE INDEX complex_public_id_key ON public.complex (public_id);
  END IF;
END$$;

-- Optional hardening step (commented out until verified):
-- ALTER TABLE public.complex ALTER COLUMN public_id SET NOT NULL;


