#!/bin/bash
# ==============================================================================
# HockeyLifeHL - Production Deployment Script
# ==============================================================================
# Usage: ./scripts/deploy-production.sh
#
# IMPORTANT: This script deploys to PRODUCTION. Ensure you have:
# - Tested thoroughly on staging
# - All environment variables configured
# - Database migrations applied
# - Stripe webhooks configured for production
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "=============================================="
echo "   HockeyLifeHL - PRODUCTION Deployment"
echo "=============================================="
echo ""
echo -e "${RED}WARNING: This will deploy to PRODUCTION!${NC}"
echo ""

# Confirmation prompt
read -p "Are you sure you want to deploy to production? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Deployment cancelled."
  exit 0
fi

# Double check for production
read -p "Have you tested on staging? (yes/no): " staging_tested
if [ "$staging_tested" != "yes" ]; then
  echo -e "${RED}Please test on staging first.${NC}"
  exit 1
fi

# Step 1: Pre-flight checks
echo -e "\n${YELLOW}Step 1: Pre-flight checks${NC}"

# Check git status
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
  git status --short
  read -p "Continue anyway? (yes/no): " continue_dirty
  if [ "$continue_dirty" != "yes" ]; then
    exit 1
  fi
fi

# Check we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
  echo -e "${YELLOW}Warning: Not on main branch (currently on: $current_branch)${NC}"
  read -p "Continue anyway? (yes/no): " continue_branch
  if [ "$continue_branch" != "yes" ]; then
    exit 1
  fi
fi

# Step 2: Pull latest
echo -e "\n${YELLOW}Step 2: Pulling latest changes${NC}"
git pull origin main || {
  echo -e "${RED}Failed to pull latest changes.${NC}"
  exit 1
}

# Step 3: Install dependencies
echo -e "\n${YELLOW}Step 3: Installing dependencies${NC}"
pnpm install --frozen-lockfile

# Step 4: Build
echo -e "\n${YELLOW}Step 4: Building production bundle${NC}"
cd apps/league-builder
NODE_ENV=production pnpm build || {
  echo -e "${RED}Build failed. Aborting deployment.${NC}"
  exit 1
}
cd ../..

echo -e "${GREEN}Build successful!${NC}"

# Step 5: Deploy to Vercel production
echo -e "\n${YELLOW}Step 5: Deploying to Vercel (PRODUCTION)${NC}"

if command -v vercel &> /dev/null; then
  vercel --prod --yes || {
    echo -e "${RED}Vercel deployment failed.${NC}"
    exit 1
  }
else
  echo -e "${RED}Vercel CLI not found. Install with: pnpm add -g vercel${NC}"
  exit 1
fi

# Step 6: Post-deployment verification
echo -e "\n${YELLOW}Step 6: Post-deployment checklist${NC}"
echo ""
echo "Please verify the following:"
echo -e "  ${CYAN}[ ]${NC} Application loads correctly"
echo -e "  ${CYAN}[ ]${NC} Authentication works (login/signup)"
echo -e "  ${CYAN}[ ]${NC} Dashboard loads without errors"
echo -e "  ${CYAN}[ ]${NC} Stripe webhooks are responding"
echo -e "  ${CYAN}[ ]${NC} Email notifications are working"
echo ""

echo -e "\n${GREEN}=============================================="
echo "   PRODUCTION Deployment Complete!"
echo "==============================================${NC}"
echo ""
echo -e "${CYAN}Monitor the following for the next 2 hours:${NC}"
echo "  - Vercel logs: https://vercel.com/dashboard"
echo "  - Stripe webhooks: https://dashboard.stripe.com/webhooks"
echo "  - Supabase logs: https://app.supabase.com/project/_/logs"
echo ""
echo -e "${YELLOW}Rollback command if needed:${NC}"
echo "  vercel rollback"
