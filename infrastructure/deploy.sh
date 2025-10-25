#!/bin/bash

# EU Real Estate Portal - Deployment Script
# This script helps deploy the infrastructure and application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-eu-west-1}
PROJECT_NAME="eu-real-estate-portal"

echo -e "${BLUE}🚀 EU Real Estate Portal Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "Prerequisites check passed"

# Navigate to terraform directory
cd "$(dirname "$0")/terraform"

# Initialize Terraform
echo -e "${BLUE}🔧 Initializing Terraform...${NC}"
terraform init

# Create terraform.tfvars if it doesn't exist
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${BLUE}📝 Creating terraform.tfvars file...${NC}"
    cat > terraform.tfvars << EOF
# EU Real Estate Portal - Terraform Variables
project_name = "${PROJECT_NAME}"
environment  = "${ENVIRONMENT}"
aws_region   = "${AWS_REGION}"

# Database Configuration
db_instance_class = "db.t3.micro"
db_allocated_storage = 20

# ECS Configuration
ecs_task_cpu = 256
ecs_task_memory = 512

# Monitoring
enable_monitoring = true
log_retention_days = 7

# Domain (optional - set if you have a domain)
# domain_name = "your-domain.com"
# certificate_arn = "arn:aws:acm:region:account:certificate/certificate-id"
EOF
    print_warning "Created terraform.tfvars - please review and update as needed"
fi

# Plan the deployment
echo -e "${BLUE}📋 Planning Terraform deployment...${NC}"
terraform plan -var-file="terraform.tfvars"

# Ask for confirmation
echo ""
read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Apply the deployment
echo -e "${BLUE}🚀 Deploying infrastructure...${NC}"
terraform apply -var-file="terraform.tfvars" -auto-approve

# Get outputs
echo -e "${BLUE}📊 Getting deployment outputs...${NC}"
ALB_DNS=$(terraform output -raw alb_dns_name)
ECR_API_REPO=$(terraform output -raw ecr_api_repository_url)
ECR_WEB_REPO=$(terraform output -raw ecr_web_repository_url)
APP_URL=$(terraform output -raw application_url)

print_status "Infrastructure deployed successfully!"

echo ""
echo -e "${GREEN}🎉 Deployment Summary:${NC}"
echo -e "${BLUE}Application URL: ${APP_URL}${NC}"
echo -e "${BLUE}Load Balancer DNS: ${ALB_DNS}${NC}"
echo -e "${BLUE}API ECR Repository: ${ECR_API_REPO}${NC}"
echo -e "${BLUE}Web ECR Repository: ${ECR_WEB_REPO}${NC}"

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Build and push Docker images to ECR repositories"
echo "2. Update ECS services to use the new images"
echo "3. Run database migrations"
echo "4. Configure monitoring and alerts"

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"