#!/bin/bash

# Azure deployment script for archi-demo

# Set variables
RESOURCE_GROUP="your-resource-group"
ACR_NAME="meijichatbotrag"
BACKEND_APP_NAME="archi-demo-backend"
FRONTEND_APP_NAME="archi-demo-app"
LOCATION="japaneast"

# Build and push backend image
echo "Building backend image..."
docker build --platform linux/amd64 -t $ACR_NAME.azurecr.io/archi_demo/backend:latest ./backend
docker push $ACR_NAME.azurecr.io/archi_demo/backend:latest

# Build and push frontend production image
echo "Building frontend production image..."
docker build --platform linux/amd64 -f ./frontend/Dockerfile.production -t $ACR_NAME.azurecr.io/archi_demo/frontend:prod ./frontend
docker push $ACR_NAME.azurecr.io/archi_demo/frontend:prod

# Deploy backend to Azure Web App
echo "Deploying backend to Azure Web App..."
az webapp config container set \
    --name $BACKEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $ACR_NAME.azurecr.io/archi_demo/backend:latest \
    --docker-registry-server-url https://$ACR_NAME.azurecr.io

# Set backend environment variables
az webapp config appsettings set \
    --name $BACKEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
    OPENAI_API_KEY="${OPENAI_API_KEY}" \
    _FORCE_OPENAI="true" \
    NEO4J_URI="${NEO4J_URI}" \
    NEO4J_AUTH="${NEO4J_AUTH}"

# Deploy frontend to Azure Web App
echo "Deploying frontend to Azure Web App..."
az webapp config container set \
    --name $FRONTEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $ACR_NAME.azurecr.io/archi_demo/frontend:prod \
    --docker-registry-server-url https://$ACR_NAME.azurecr.io

# Set frontend environment variables
az webapp config appsettings set \
    --name $FRONTEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
    REACT_APP_API_URL="https://$BACKEND_APP_NAME.azurewebsites.net"

echo "Deployment complete!"