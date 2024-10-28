# Deployment

## Initialize and Deploy

Clone this repo:
```bash
git clone https://github.com/Pablo-Wynistorf/discord-cdn-service-lambda.git
cd discord-cdn-service-lambda
```

### Automatic Deployment:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Cleanup:

Just run these two commands:

```bash
# Set variables
AWS_DEFAULT_REGION="us-east-1"

# Delete SAM Stack
aws cloudformation delete-stack --stack-name discordCDNServiceLambdaStack --region $AWS_DEFAULT_REGION
