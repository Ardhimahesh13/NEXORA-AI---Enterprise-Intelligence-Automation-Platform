# NEXORA-AI: Enterprise Intelligence Automation Platform

NEXORA-AI is a privacy-focused enterprise intelligence platform that leverages local Large Language Models (LLMs) to automate and enhance business intelligence tasks. Built with a high-performance FastAPI backend, a Streamlit user interface, and Pinecone vector search, the platform uses local Qwen models and Nomic embeddings via Ollama to ensure complete data privacy and security without relying on external API dependencies.

**Document intelligence · Conversational memory · Guardrails · Human review · Observability · CI/CD**

[Overview](#overview) · [Architecture](#architecture) · [Quick Start](#quick-start) · [CI/CD Deployment](#cicd-deployment-to-aws) · [API](#api-reference) · [Security](#security-and-production-readiness)

## 🚀 Key Features

* **Privacy-First Architecture:** Utlizes local LLMs (Qwen) and embedding models (nomic-embed-text) running via Ollama.
* **Retrieval-Augmented Generation (RAG):** Continuous document ingestion and RAG pipelines for intelligent, context-aware querying.
* **High-Performance API:** FastAPI-driven backend for rapid and scalable model serving.
* **Interactive UI:** Streamlit frontend for seamless user interaction and data visualization.
* **Vector Search:** Integrated with Pinecone for efficient similarity search and retrieval.
* **Cloud-Ready:** Containerized architecture ready for deployment on AWS EC2.

## 📁 Repository Structure

* `app/` - FastAPI backend application, routing, and API endpoints.
* `worker/` - Document ingestion scripts and the core RAG pipeline processing.
* `docs/` - Project documentation and database schemas.
* `infra/` - Infrastructure, Docker configurations, and deployment scripts.
* `scripts/` - Utility and automation scripts.
* `Test/` - Testing modules and local LLM configuration fallbacks.

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
* **Python:** Version 3.12
* **Conda:** Anaconda or Miniconda
* **Ollama:** For running local LLMs and embeddings
* **Docker:** (Optional) For containerized deployment

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Ardhimahesh13/NEXORA-AI---Enterprise-Intelligence-Automation-Platform.git](https://github.com/Ardhimahesh13/NEXORA-AI---Enterprise-Intelligence-Automation-Platform.git)
   cd NEXORA-AI---Enterprise-Intelligence-Automation-Platform

## Create and activate the Conda environment
**conda create -n nexora python=3.12 -y
conda activate nexora**

## Install dependencies
**pip install -r requirements.txt**

## Start Local LLMs:
**ollama pull qwen
ollama pull nomic-embed-text**


## 💻 Running the Application
**uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload**
