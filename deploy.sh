#!/bin/bash

# Input Fields
read -p "Do you have the aws cli, sam cli, npm and git installed? (y/n): " HAS_DEPENDENCIES

if [ "$HAS_DEPENDENCIES" != "y" ]; then
  echo "Please install the AWS CLI, SAM CLI, and Git before running this script."
  exit 1
fi

read -p "Enter your AWS region (default: us-east-1): " AWS_DEFAULT_REGION
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

read -p "Enter your Discord Bot Token: " DISCORD_BOT_TOKEN
read -p "Enter your Discord Channel ID: " DISCORD_CHANNEL_ID


# Install node modules
echo "Installing Node.js dependencies..."
npm install --prefix ./src

# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RANDOM_STRING=$(openssl rand -base64 6 | tr -dc 'a-z0-9' | head -c 6)
S3_BUCKET_NAME="discordcdnservicelambda-$ACCOUNT_ID-$RANDOM_STRING"

# Create the S3 bucket
echo "Creating S3 bucket: $S3_BUCKET_NAME"
aws s3 mb s3://$S3_BUCKET_NAME --region $AWS_DEFAULT_REGION

# Build and Deploy the SAM Application
echo "Building SAM application..."
sam build

echo "Deploying SAM application..."
sam deploy --template-file template.yml \
  --stack-name discordCDNServiceLambdaStack \
  --capabilities CAPABILITY_IAM \
  --s3-bucket "$S3_BUCKET_NAME" \
  --region "$AWS_DEFAULT_REGION" \
  --parameter-overrides DiscordBotToken=$DISCORD_BOT_TOKEN DiscordChannelId=$DISCORD_CHANNEL_ID