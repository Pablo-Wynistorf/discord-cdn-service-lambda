#!/bin/bash

HAS_DEPENDENCIES="y"

# Check if the AWS CLI is installed
if ! [ -x "$(command -v aws --version)" ]; then
  HAS_DEPENDENCIES="n"
fi

# Check if the SAM CLI is installed
if ! [ -x "$(command -v sam)" ]; then
  HAS_DEPENDENCIES="n"
fi

# Check if npm is installed
if ! [ -x "$(command -v npm)" ]; then
  HAS_DEPENDENCIES="n"
fi


if [ "$HAS_DEPENDENCIES" != "y" ]; then
  echo "Please install the AWS CLI, SAM CLI, and npm before running this script."
  exit 1
fi

read -p "Enter your AWS region (default: us-east-1): " AWS_DEFAULT_REGION
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

read -p "Enter your Discord Bot Token: " DISCORD_BOT_TOKEN
read -p "Enter your Discord Channel ID: " DISCORD_CHANNEL_ID
read -p "Enter your CDN URL (e.g. https://cdn.example.com): " CDN_URL

if [ -z "$CDN_URL" ]; then
  echo "CDN URL cannot be empty."
  exit 1
fi

if [[ ! $CDN_URL =~ ^https://.* ]]; then
  echo "CDN URL must start with https://."
  exit 1
fi

read -p "Enter the issued certificate ARN for the CDN URL in the same region as the api-gw (e.g. arn:aws:acm:us-east-1:123:certificate/123-123-123-123): " CERTIFICATE_ARN

CERTIFICATE_DETAILS=$(aws acm describe-certificate --certificate-arn "$CERTIFICATE_ARN" --region "$AWS_DEFAULT_REGION" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Certificate ARN is invalid."
  exit 1
fi

VALIDATION_STATUS=$(echo "$CERTIFICATE_DETAILS" | grep -o '"ValidationStatus": *"[^"]*"' | sed 's/"ValidationStatus": *//;s/"//g')

if [ "$VALIDATION_STATUS" != "SUCCESS" ]; then
  echo "Validation status is not SUCCESS."
  exit 1
fi

RAW_CDN_URL=$(echo $CDN_URL | sed 's/https:\/\///')

# Install node modules
echo "Installing Node.js dependencies..."
npm install --prefix ./src

# Build and Deploy the SAM Application
echo "Building SAM application..."
sam build

echo "Deploying SAM application..."
sam deploy --template-file template.yml \
  --stack-name discordCDNServiceLambdaStack \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --region "$AWS_DEFAULT_REGION" \
  --parameter-overrides DiscordBotToken=$DISCORD_BOT_TOKEN DiscordChannelId=$DISCORD_CHANNEL_ID CDNUrl=$CDN_URL RawCdnUrl=$RAW_CDN_URL CdnUrlCertificateArn=$CERTIFICATE_ARN

API_GW_CNAME=$(aws apigateway get-domain-names --query "items[?domainName=='$RAW_CDN_URL'].regionalDomainName" --output text --region "$AWS_DEFAULT_REGION")

echo "Make sure to update your DNS settings to point: $RAW_CDN_URL to the following CNAME: $API_GW_CNAME"


