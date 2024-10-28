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
read -p "Enter your desirec CDN URL eg. https://cdn.example.com : " CDN_URL

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
  --parameter-overrides DiscordBotToken=$DISCORD_BOT_TOKEN DiscordChannelId=$DISCORD_CHANNEL_ID CDNUrl=$CDN_URL