#!/bin/bash
# Deploy the Tsuru POS static site — CFN stack + S3 sync + CF invalidation.
#
# Migrated from the monorepo (scripts/pipeline-frontend-pos-system.sh). Same
# stack/bucket/domain names so it updates the existing infrastructure in place.
# Standalone-repo paths: build output is ./dist, CFN template is ./cloudformation.
#
# Expects the AWS CLI to be authenticated (GitHub Actions OIDC role, or locally
# `AWS_PROFILE=J-CAMPOS ./scripts/deploy.sh`). Run AFTER `npm run build`.
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${REGION:-us-east-1}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-j-markets.jcampos.dev}"
ROOT_DOMAIN="${ROOT_DOMAIN:-jcampos.dev}"

STACK_NAME="jmarkets-${ENVIRONMENT}-frontend-pos-system"
BUCKET_NAME="jmarkets-${ENVIRONMENT}-pos-system"
DIST_DIR="dist"
DOMAIN="pos.${FRONTEND_DOMAIN}"
GITHUB_ORG="${GITHUB_ORG:-chepelcr}"
GITHUB_REPO="${GITHUB_REPO:-tsuru-pos-system}"

echo "=== Tsuru POS Frontend Deploy ==="
echo "  Environment : $ENVIRONMENT"
echo "  Region      : $REGION"
echo "  Domain      : $DOMAIN"
echo ""

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: $DIST_DIR not found — run 'npm run build' first."
  exit 1
fi

# Resolve Route53 hosted zone
echo "Resolving hosted zone for ${ROOT_DOMAIN}..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='${ROOT_DOMAIN}.'].Id" \
  --output text | sed 's|/hostedzone/||')

if [ -z "$HOSTED_ZONE_ID" ]; then
  echo "ERROR: Could not resolve hosted zone for $ROOT_DOMAIN"
  exit 1
fi
echo "  HostedZoneId: $HOSTED_ZONE_ID"
echo ""

# Deploy CloudFormation stack (create or update — no-op if nothing changed)
echo "Deploying CFN stack: ${STACK_NAME}..."
aws cloudformation deploy \
  --template-file cloudformation/frontend-site.yml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides \
    "BucketName=${BUCKET_NAME}" \
    "DomainName=${DOMAIN}" \
    "HostedZoneId=${HOSTED_ZONE_ID}" \
    "Environment=${ENVIRONMENT}" \
    "GitHubOrg=${GITHUB_ORG}" \
    "GitHubRepo=${GITHUB_REPO}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${REGION}" \
  --no-fail-on-empty-changeset
echo "Stack ${STACK_NAME} ready."
echo ""

# Sync HTML/JSON with no-cache; hashed assets with long-lived cache
aws s3 sync "${DIST_DIR}/" "s3://${BUCKET_NAME}" \
  --delete \
  --exclude "assets/*" \
  --cache-control "no-cache, no-store, must-revalidate"

aws s3 sync "${DIST_DIR}/assets/" "s3://${BUCKET_NAME}/assets/" \
  --cache-control "public, max-age=31536000, immutable" 2>/dev/null || true

echo "S3 sync complete."
echo ""

# Retrieve distribution ID and create invalidation
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

echo "Invalidating CloudFront cache (distribution: ${DIST_ID})..."
aws cloudfront create-invalidation \
  --distribution-id "${DIST_ID}" \
  --paths "/*"

echo ""
echo "pos-system deployed: https://${DOMAIN}"
