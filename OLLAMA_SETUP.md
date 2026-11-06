# Ollama Setup Guide for Heartbeat Protocol

Complete guide for configuring and running local AI vital diagnostics with Ollama.

## 🤖 What is Ollama?

Ollama enables running high-performance large language models (LLMs) locally:
- ✅ **Zero API Costs** — 100% free local inference
- ✅ **Absolute Privacy** — Telemetry data never leaves your infrastructure
- ✅ **Low Latency** — Instant vital exploit pattern extraction
- ✅ **Offline Resilience** — Works without external AI cloud dependencies

## 📦 Installation

### Linux & macOS

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

Download installer from [ollama.com/download](https://ollama.com/download)

### Verify Installation

```bash
ollama --version
```

## 🚀 Quick Start

### 1. Start Ollama Daemon

```bash
ollama serve
```

API runs on `http://localhost:11434`. Keep this terminal running during testing.

### 2. Pull Recommended Model

```bash
ollama pull llama3.1:8b
```

### 3. Verify Local API

```bash
curl http://localhost:11434/api/version
```

### 4. Test AI Diagnostics

```bash
cd cre-workflow
npm run test:analyzer
```

## ⚙️ Configuration

In `cre-workflow/.env`:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## 📊 Recommended Models

| Model | Size | RAM | Speed | Quality | Use Case |
|---|---|---|---|---|---|
| `llama3.1:8b` | 4.7GB | 8GB | Fast | Good | **Recommended** (Balanced diagnostics) |
| `mistral:7b` | 4.1GB | 8GB | Very Fast | Good | High-throughput telemetry |
| `codellama:13b`| 7.3GB | 16GB | Moderate | Excellent | Deep bytecode/reentrancy analysis |

---

**💓 Heartbeat Protocol — Autonomous DeFi Vital Defense**
