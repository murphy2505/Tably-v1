-- Add priceOverrideCents to ProductVariant for variant-level pricing
ALTER TABLE "ProductVariant" ADD COLUMN "priceOverrideCents" INTEGER;