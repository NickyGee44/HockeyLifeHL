#!/bin/bash
# ==============================================================================
# HockeyLifeHL - Staging Deployment Script
# ==============================================================================
# Usage: ./scripts/deploy-staging.sh
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "   HockeyLifeHL - Staging Deployment"
echo "=============================================="

# Step 1: Pre-flight checks
echo -e "\n${YELLOW}Step 1: Pre-flight checks${NC}"

# Check if required environment variables are set
required_vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "STRIPE_SECRET_KEY"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo -e "${RED}Error: Missing required environment variables:${NC}"
  for var in "${missing_vars[@]}"; do
    echo "  - $var"
  done
  echo -e "\nPlease set these in your .env.local or Vercel environment."
  exit 1
fi

echo -e "${GREEN}All required environment variables are set.${NC}"

# Step 2: Install dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies${NC}"
pnpm install --frozen-lockfile

# Step 3: Type checking
echo -e "\n${YELLOW}Step 3: Type checking${NC}"
pnpm typecheck || {
  echo -e "${RED}Type checking failed. Please fix TypeScript errors.${NC}"
  exit 1
}

# Step 4: Build
echo -e "\n${YELLOW}Step 4: Building production bundle${NC}"
cd apps/league-builder
pnpm build || {
  echo -e "${RED}Build failed. Please fix build errors.${NC}"
  exit 1
}
cd ../..

echo -e "${GREEN}Build successful!${NC}"

# Step 5: Run tests (optional - skip if CI)
if [ "$CI" != "true" ] && [ "$SKIP_TESTS" != "true" ]; then
  echo -e "\n${YELLOW}Step 5: Running tests${NC}"
  pnpm test || {
    echo -e "${YELLOW}Warning: Some tests failed. Review before deploying to production.${NC}"
  }
fi

# Step 6: Deploy to Vercel staging
echo -e "\n${YELLOW}Step 6: Deploying to Vercel (staging)${NC}"

if command -v vercel &> /dev/null; then
  vercel --yes || {
    echo -e "${RED}Vercel deployment failed.${NC}"
    exit 1
  }
else
  echo -e "${YELLOW}Vercel CLI not found. Install with: pnpm add -g vercel${NC}"
  echo "Then run: vercel --yes"
  exit 1
fi

echo -e "\n${GREEN}=============================================="
echo "   Staging Deployment Complete!"
echo "==============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test all critical flows on staging"
echo "  2. Verify Stripe webhooks are configured"
echo "  3. Run E2E tests against staging"
echo "  4. When ready, run: ./scripts/deploy-production.sh"
