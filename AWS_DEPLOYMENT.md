# Butler App Backend + Ollama (qwen2.5:0.5b) AWS Deployment Guide

This guide details how to deploy the **Butler Express Backend** and the **Ollama AI Inference Engine** running **`qwen2.5:0.5b`** on Amazon Web Services (AWS).

---

## 🏛️ Architecture Overview

```
                          ┌────────────────────────┐
                          │   Client / Mobile App  │
                          └───────────┬────────────┘
                                      │ HTTPS (Port 443)
                                      ▼
                          ┌────────────────────────┐
                          │  AWS Application Load  │
                          │   Balancer (ALB) / Nginx
                          └───────────┬────────────┘
                                      │ Port 3000
                                      ▼
                      ┌─────────────────────────────────┐
                      │    Butler Express Backend       │
                      │    (Node.js / Express / JWT)    │
                      └───────────────┬─────────────────┘
                                      │ HTTP (Internal VPC)
                                      │ OLLAMA_BASE_URL:11434
                                      ▼
                      ┌─────────────────────────────────┐
                      │    Ollama AI Engine Container   │
                      │    Model: qwen2.5:0.5b          │
                      │    RAM Footprint: < 600 MB      │
                      └─────────────────────────────────┘
```

Because **`qwen2.5:0.5b`** is a high-performance 0.5-billion parameter model:

- **Memory Footprint**: ~398 MB weights + ~200 MB runtime RAM (< 1 GB total).
- **CPU Inference**: Ultra-fast on standard AWS CPU instances (e.g. `t3.medium`, `t4g.medium` Graviton).
- **Cost-Efficiency**: Can run on AWS free-tier or inexpensive instances without needing expensive GPU instances.

---

## 🚀 Option 1: AWS EC2 with Docker Compose (Recommended)

### Step 1: Launch an AWS EC2 Instance

1. Go to **AWS Console** -> **EC2** -> **Launch Instance**.
2. **AMI**: Ubuntu Server 24.04 LTS (x86_64 or ARM64).
3. **Instance Type**:
   - `t3.medium` (2 vCPU, 4 GB RAM) or `t4g.medium` (Graviton ARM, 2 vCPU, 4 GB RAM)
4. **Storage**: 20 GB gp3 SSD.
5. **Security Group Rules**:
   - Inbound SSH (Port 22): Your IP
   - Inbound HTTP (Port 80): `0.0.0.0/0`
   - Inbound HTTPS (Port 443): `0.0.0.0/0`
   - Inbound API (Port 3000): `0.0.0.0/0` (or behind ALB)
   - _Note: Keep Port 11434 private (do NOT expose Ollama port to 0.0.0.0/0)._

---

### Step 2: Provision the EC2 Server

Connect to your EC2 instance via SSH:

```bash
ssh -i "your-key.pem" ubuntu@<your-ec2-public-ip>
```

Install Docker & Docker Compose:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose git curl

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker
```

---

### Step 3: Clone Code & Configure Environment

```bash
# Clone the repository
git clone <your-repo-url> /home/ubuntu/butler-app-express
cd /home/ubuntu/butler-app-express

# Create production .env file
cat << 'EOF' > .env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_super_production_secret_key_change_me
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=info@yourdomain.com
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:0.5b
OLLAMA_TIMEOUT_MS=60000
EOF
```

---

### Step 4: Launch via Docker Compose & Pull Model

```bash
# Start backend and ollama containers in background
docker-compose up -d

# Pull qwen2.5:0.5b model inside the Ollama container
docker exec -it butler_ollama_engine ollama pull qwen2.5:0.5b
```

Verify the model is loaded:

```bash
docker exec -it butler_ollama_engine ollama list
```

_Output should show `qwen2.5:0.5b` ready!_

---

### Step 5: Test the API from Your Terminal / Postman / Swagger

```bash
# Live EC2 Health & Status check
curl http://ec2-51-24-120-153.eu-west-2.compute.amazonaws.com:3000/api/butler/status

# Live EC2 Chat endpoint test
curl -X POST http://ec2-51-24-120-153.eu-west-2.compute.amazonaws.com:3000/api/butler/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "A table for two tonight in London please.", "persona": "eaton"}'

# Interactive Swagger UI (Open in Browser)
# http://ec2-51-24-120-153.eu-west-2.compute.amazonaws.com:3000/api-docs
```

---

## 🛠️ Option 2: AWS ECS (Elastic Container Service) / Fargate

If deploying as separate ECS Services:

1. **Ollama Task Definition**:
   - Image: `ollama/ollama:latest`
   - CPU: `1024` (1 vCPU), Memory: `2048` (2 GB)
   - Port Mapping: `11434`
   - Mount an **Amazon EFS** volume to `/root/.ollama` to persist models across restarts.
   - Entrypoint Command / Post-start hook: `sh -c "ollama serve & sleep 3 && ollama pull qwen2.5:0.5b && wait"`
   - Service Discovery DNS: `ollama.butler.local:11434`

2. **Butler Express Task Definition**:
   - Image: `<your-ecr-registry>/butler-app-express:latest`
   - Port Mapping: `3000`
   - Environment Variable: `OLLAMA_BASE_URL=http://ollama.butler.local:11434`

---

## ⚡ Option 3: Separate Ollama Instance on EC2 + Express on App Runner

For high availability, you can run Ollama on a standalone EC2 instance in a private subnet, and the Butler Express backend on **AWS App Runner**:

1. Deploy Ollama on a dedicated EC2 instance inside your VPC.
2. In the Butler App Runner Environment Variables, set:
   ```env
   OLLAMA_BASE_URL=http://<ec2-private-ip>:11434
   OLLAMA_MODEL=qwen2.5:0.5b
   ```
3. In EC2 Security Group, allow inbound TCP on port `11434` only from the App Runner VPC connector / Security Group.

---

## 🛡️ Production Security Checklist

- [x] **Private Ollama Port**: Never expose port `11434` to the public internet (`0.0.0.0/0`). Keep it internal to Docker network or VPC private subnet.
- [x] **SSL / TLS**: Use AWS Certificate Manager (ACM) with an ALB or Let's Encrypt / Certbot with Nginx for HTTPS.
- [x] **Rate Limiting**: Express backend manages and validates all incoming requests before forwarding inference requests to Ollama.
- [x] **Fallback Handling**: If Ollama instance is restarting or temporarily unreachable, the Butler API automatically falls back to intelligent concierge responses without dropping requests.
- [x] **Streaming (SSE)**: Enable HTTP/2 and disable proxy buffering (`proxy_buffering off;` in Nginx) to support real-time SSE streaming for `/api/butler/chat/stream`.

---

## 📖 Available Backend Endpoints Reference

| Method   | Endpoint                                 | Description                                                      |
| -------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `GET`    | `/api/butler/status`                     | Connectivity, latency, and model availability check              |
| `GET`    | `/api/butler/concierges`                 | List available concierges (`eaton`, `merlin`, `galahad`)         |
| `GET`    | `/api/butler/suggestions`                | Prompt pills (e.g., "A table for two tonight")                   |
| `GET`    | `/api/butler/conversations`              | List persistent chat conversation threads for member             |
| `POST`   | `/api/butler/conversations`              | Create a new conversation thread                                 |
| `GET`    | `/api/butler/conversations/:id`          | Fetch full message history for a conversation                    |
| `DELETE` | `/api/butler/conversations/:id`          | Delete an entire conversation thread                             |
| `DELETE` | `/api/butler/conversations/:id/messages` | Clear history inside a thread                                    |
| `POST`   | `/api/butler/chat`                       | Send prompt to Butler with conversationId & history              |
| `POST`   | `/api/butler/chat/stream`                | Real-time Server-Sent Events (SSE) streaming with conversationId |
| `POST`   | `/api/butler/pull-model`                 | Trigger model pull dynamically                                   |
| `GET`    | `/api-docs`                              | Interactive Swagger UI API documentation                         |
