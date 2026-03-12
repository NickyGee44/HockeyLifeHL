-- Add 'checkbox' signature type for simplified waiver flow
-- This allows leagues to use checkbox-only waiver acceptance (no drawn/typed signature)
ALTER TYPE signature_type_enum ADD VALUE IF NOT EXISTS 'checkbox';
