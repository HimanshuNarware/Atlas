# DocReader — AI Document Intelligence & Grounded Q&A

DocReader is a production-grade full-stack Retrieval-Augmented Generation (RAG) platform. It allows users and students to upload PDFs, textbooks, or research papers, automatically extracts and recursively chunks their contents, indexes them into a vector database with dense embeddings, and delivers factually grounded answers with verified page citations and reasoning criteria.

The application features a warm, hand-drawn **Hilos bento aesthetic**, a Claude-inspired minimal thinking indicator, a two-sided messenger chat interface, and a robust Node.js Express backend built with PostgreSQL user authentication.

---

## 📸 Interface & UX Highlights

- **Two-Sided Messenger Flow**: User queries are aligned to the right (with user avatar); AI responses are aligned to the left (with Atlas avatar).
- **Agent-Side Evidence Citations**: Before presenting the answer, Atlas displays an **`Evidence Criteria & Reasoning`** card containing the cosine match percentage, page number, verified text excerpt, and retrieval criteria.
- **Claude-Style Minimal Loader**: Replaces distracting technical logs with clean, smooth rotating phrases (`Thinking...`, `Reading document...`, `Generating...`) and a warm terracotta sunburst pulse.
- **One-Shot Upload & Ask**: Users can upload a PDF and ask a question in a single prompt.
- **Hand-Drawn Typography**: Styled with `Shantell Sans` and `Patrick Hand` Google variable fonts with 50% lighter borders (`1px`) for a clean, notebook-like feel.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User["👤 Student / User"]
    Frontend["🖥️ React 18 + Vite (Nginx)\n(Port 80 / 3000)"]
    Backend["⚙️ Node.js + Express (TypeScript)\n(Port 5000)"]
    Postgres[("🐘 PostgreSQL 17\nUsers & Auth")]
    GoogleGenAI["🧠 Google GenAI SDK (@google/genai)\ngemini-embedding-001 (1536 dim)\ngemini-2.5-flash (Grounding)"]
    Qdrant[("🎯 Qdrant Vector Cloud\nCosine Similarity Search")]

    User -->|Upload PDF / Ask Question| Frontend
    Frontend -->|Reverse Proxy / REST API| Backend
    Backend -->|Read Buffer & Extract| PDFParse["📄 pdf-parse"]
    PDFParse -->|Recursive Text Splitter| Chunker["✂️ Recursive Chunker\n(~700 chars, 100 overlap)"]
    Chunker -->|Batch Text Chunks| GoogleGenAI
    GoogleGenAI -->|1536-dim Embeddings| Backend
    Backend -->|Upsert Chunks & Payloads| Qdrant
    Backend -->|Store User Credentials| Postgres
    Backend -->|Query Vector Search| Qdrant
    Qdrant -->|Top K Relevant Passages| Backend
    Backend -->|Question + Context Chunks| GoogleGenAI
    GoogleGenAI -->|Synthesized Grounded Answer| Backend
    Backend -->|JSON Answer + Page Citations| Frontend
    Frontend -->|Render Markdown & Citation Bridge| User
```

---

## 📁 Repository Structure

```text
DocReader/
├── backend/                       # Express + TypeScript RAG Backend
│   ├── src/
│   │   ├── config/                # Zod environment schema & Postgres pool
│   │   ├── controllers/           # doc-reader.controller & user.controller
│   │   ├── db/                    # SQL schema & migration runner
│   │   ├── integrations/          # google-genai.service & qdrant.service
│   │   ├── middlewares/           # Admin token, rate limiting, error handling
│   │   ├── routes/                # docReaderRouter & userRouter
│   │   ├── services/              # doc-reader.service & user.service
│   │   ├── utils/                 # recursive chunker & response wrappers
│   │   └── index.ts               # Server bootstrap & graceful shutdown
│   ├── Dockerfile                 # Multi-stage production Node.js container
│   ├── .dockerignore
│   ├── package.json
│   └── tsconfig.json
├── client/                        # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/            # GeminiThinkingLoader, MarkdownRenderer, HilosArt
│   │   ├── services/              # Typed REST client (api.ts)
│   │   ├── App.tsx                # Two-sided chat, Knowledge Base, Evidence card
│   │   ├── index.css              # Hand-drawn typography, Hilos design tokens
│   │   └── main.tsx
│   ├── Dockerfile                 # Multi-stage React build + Nginx reverse proxy
│   ├── nginx.conf                 # Nginx SPA routing & API reverse proxy
│   ├── .dockerignore
│   ├── package.json
│   └── vite.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions automated build validator
├── docker-compose.yml             # Orchestrates Postgres + Backend + Frontend
├── .env.example                   # Environment variable template
├── .gitignore
├── FLOW_AND_CHANGES.md            # Detailed RAG technical specification
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file at the root of the project (or in `backend/.env` for manual backend execution):

```env
# 1. PostgreSQL Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=randompassword
POSTGRES_DB=docreader_db
DATABASE_URL=postgresql://postgres:randompassword@localhost:5432/docreader_db

# 2. Google Gemini API Key
# Get a free key at: https://aistudio.google.com/
GEMINI_API_KEY=AIzaSy...your_gemini_api_key

# 3. Qdrant Vector Database
# Free managed cluster at: https://cloud.qdrant.io/
QDRANT_URL=https://your-cluster-id.us-east-1-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_cloud_api_key
QDRANT_COLLECTION=doc_reader

# 4. Security & JWT
JWT_SECRET=super-secret-jwt-key-change-in-production
ADMIN_SECRET_KEY=admin-super-secret-key-12345
```

---

## 🐳 Quick Start with Docker Compose (Local)

The entire system (PostgreSQL, Express Backend, and React Frontend) can be launched with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/DocReader.git
cd DocReader

# 2. Configure your environment variables
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY and QDRANT credentials

# 3. Spin up all containers
docker compose up -d --build
```

- **Frontend Application**: `http://localhost:80` (or `http://localhost:3000` in dev)
- **Backend API**: `http://localhost:5000`
- **PostgreSQL**: `localhost:5432`

---

## 💻 Manual Local Development (Without Docker)

### 1. Database
```bash
docker compose up -d postgres
cd backend
npm run db:migrate
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

---

## ☁️ Step-by-Step AWS Deployment Guide

This guide details how to deploy DocReader on **AWS EC2** using Docker and Docker Compose. This method is the **most cost-effective**, runs PostgreSQL, Backend, and Frontend on a single server, and eliminates extra managed service costs.

### 📋 Prerequisites
1. An AWS Account.
2. A GitHub account.
3. Your Google Gemini API Key and Qdrant Cloud credentials.

---

### Phase 1: Push Project to GitHub

1. Initialize Git locally and create your initial commit:
   ```bash
   cd DocReader
   git init
   git add .
   git commit -m "feat: complete DocReader full-stack RAG system"
   ```

2. Create a new repository on [GitHub](https://github.com/new) named `DocReader` (set to **Public** or **Private**).

3. Link your local repo and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/DocReader.git
   git push -u origin main
   ```

---

### Phase 2: Launch & Configure AWS EC2 Instance

1. **Open AWS Console**:
   - Go to **EC2** -> **Instances** -> Click **Launch Instances**.

2. **Instance Details**:
   - **Name**: `DocReader-Server`
   - **OS Image (AMI)**: **Ubuntu Server 24.04 LTS** (64-bit x86).
   - **Instance Type**: `t3.small` (2 vCPU, 2GB RAM — recommended) or `t3.medium`.
   - **Key Pair**: Select an existing key pair or click **Create new key pair** (`docreader-key.pem`). Save the `.pem` file to your computer.

3. **Configure Security Group (Firewall Rules)**:
   Add the following inbound rules:
   | Type | Port | Source | Purpose |
   |---|---|---|---|
   | SSH | 22 | My IP (or `0.0.0.0/0`) | SSH terminal access |
   | HTTP | 80 | `0.0.0.0/0` | Web access (Frontend & Nginx) |
   | HTTPS | 443 | `0.0.0.0/0` | Secure SSL access |
   | Custom TCP | 5000 | `0.0.0.0/0` | Backend API (Optional if proxied via 80) |

4. **Storage**:
   - Change root volume size from 8 GB to **20 GB** (gp3) to comfortably accommodate Docker images.

5. Click **Launch Instance**.

---

### Phase 3: Connect to EC2 & Install Docker

1. Set permissions on your downloaded private key:
   ```bash
   chmod 400 docreader-key.pem
   ```

2. SSH into your EC2 server:
   ```bash
   ssh -i "docreader-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```

3. Update Ubuntu and install Docker & Docker Compose:
   ```bash
   sudo apt update && sudo apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Allow ubuntu user to run Docker without sudo
   sudo usermod -aG docker ubuntu
   newgrp docker

   # Verify installation
   docker --version
   docker compose version
   ```

---

### Phase 4: Deploy the Application

1. Clone your GitHub repository on the EC2 server:
   ```bash
   git clone https://github.com/<your-username>/DocReader.git
   cd DocReader
   ```
   *(If your repository is private, use a GitHub Personal Access Token or SSH deploy key).*

2. Create your production `.env` file on the server:
   ```bash
   nano .env
   ```
   Paste your configuration:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_strong_postgres_password
   POSTGRES_DB=docreader_db

   GEMINI_API_KEY=AIzaSy...your_gemini_api_key
   QDRANT_URL=https://your-cluster-id.us-east-1-0.aws.cloud.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_cloud_api_key
   QDRANT_COLLECTION=doc_reader

   JWT_SECRET=production_jwt_secret_key_98765
   ADMIN_SECRET_KEY=admin_secret_key_12345
   ```
   Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

3. Build and launch all containers in detached mode:
   ```bash
   docker compose up -d --build
   ```

4. Verify container status:
   ```bash
   docker compose ps
   ```
   You should see:
   - `docreader-postgres` (healthy)
   - `docreader-backend` (running)
   - `docreader-frontend` (running on port `80`)

5. Open your browser and navigate to:
   ```text
   http://<YOUR-EC2-PUBLIC-IP>
   ```
   Your DocReader application is now fully live on AWS!

---

### Phase 5: Automated CI/CD with GitHub Actions (Optional)

To enable automatic redeployment on AWS every time you run `git push origin main`:

1. On your EC2 server, generate an SSH key pair or reuse your `.pem` key.
2. In your GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:
   - `EC2_HOST`: `<YOUR-EC2-PUBLIC-IP>`
   - `EC2_USER`: `ubuntu`
   - `EC2_SSH_KEY`: Contents of your `docreader-key.pem`
3. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to AWS EC2

   on:
     push:
       branches: [ main ]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Execute remote SSH commands to deploy
           uses: appleboy/ssh-action@v1.0.3
           with:
             host: ${{ secrets.EC2_HOST }}
             username: ${{ secrets.EC2_USER }}
             key: ${{ secrets.EC2_SSH_KEY }}
             script: |
               cd DocReader
               git pull origin main
               docker compose down
               docker compose up -d --build
   ```

---

## 📡 API Reference

### 1. Document Upload & Extraction
- **`POST /docReaderRouter/upload`**
- Multipart form data:
  - `file`: PDF / text file (required)
  - `question`: Optional question to ask simultaneously with upload.

### 2. Grounded Q&A
- **`POST /docReaderRouter/ans`**
- Request body:
  ```json
  {
    "question": "What were the quarterly net revenues?",
    "documentId": "optional-document-id"
  }
  ```
- Returns synthesized answer, cosine similarity match score, and verified page excerpts.

### 3. Document Repository History
- **`GET /docReaderRouter/history`**
- Returns indexed documents and query counts.

---

## 🛡️ License
Distributed under the ISC License. Designed and developed with modern Node.js, React, and Google GenAI.
