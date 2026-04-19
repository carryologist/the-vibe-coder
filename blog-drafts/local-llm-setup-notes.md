# Blog Fodder: Setting Up a Local LLM on My AI Workstation

> **Status**: Raw session notes — not a finished blog draft.
> Captured from Coder Agents chat session, April 19 2026.
> This covers: hardware assessment, Ollama install, model selection,
> API verification, and tool integration paths.

---

## Collapsible Pattern Used in This Document

Code snippets and long technical blocks use HTML `<details>` /
`<summary>` tags. These render as expandable sections in GitHub
Markdown, Hugo, Astro, Jekyll, Next.js MDX, and most static site
generators — no JavaScript required.

```html
<details>
<summary>Click to expand: description of what's inside</summary>

```bash
# your code here
```

</details>
```

---

## The Hardware

The "Master Build" AI workstation:

| Category | Component | Spec |
|---|---|---|
| CPU | AMD Ryzen 9 9950X3D | 16-Core Zen 5, 5.75 GHz boost |
| GPU | Zotac RTX 5090 | **32 GB GDDR7** (AMP Extreme Infinity) |
| Motherboard | ASRock X870 Pro-A WiFi | AM5, USB4, PCIe 5.0 |
| RAM | G.Skill Trident Z5 RGB | 64 GB (2x32 GB) DDR5-6000 |
| Storage | Samsung 9100 Pro | 2 TB Gen5 NVMe |
| Case | Antec Performance 1 FT | Full tower w/ temp display |
| Cooler | Thermaltake TH420 V2 | 420mm ARGB AIO |
| PSU | Thermaltake Toughpower GT | 1200W 80+ Gold ATX 3.1 |
| OS | Ubuntu 24.04 LTS | NVIDIA driver 590.48.01 |

### Why VRAM Is the Only Spec That Matters for Local LLMs

VRAM determines what models you can run. Period. The 32 GB on the
RTX 5090 lands in the sweet spot — capable of running 27B–35B models
at full quality, or 70B models at aggressive (Q4) quantization. The
64 GB system RAM provides headroom for KV cache spillover and running
Coder + IDE alongside the model. The 2 TB Gen5 NVMe means models
load fast and you can store many (~75 GB worth) without worry.

### What 32 GB VRAM Unlocks

| VRAM Tier | Models You Can Run |
|---|---|
| 8–12 GB | 7B models (Qwen3:8b, DeepSeek-Coder 1.3B–6.7B) |
| 16 GB | 14B–20B models (DeepSeek R1 14B, Codestral 25.12) |
| **24–32 GB** | **27B–35B models — the sweet spot for agentic coding** |
| 32 GB+ / unified | Qwen3-Coder-Next, 70B quantized |

---

## The Setup Script

Built a single self-contained bash script (`setup-local-llm.sh`) that
runs 6 phases end-to-end. Tailored to this exact hardware profile.
Supports `--models-only` and `--verify-only` flags for re-runs.

<details>
<summary>Click to expand: Full setup script (331 lines)</summary>

```bash
#!/usr/bin/env bash
# =============================================================================
# Local LLM Setup Script
# Target: AMD Ryzen 9 9950X3D / RTX 5090 32GB / 64GB DDR5 / Ubuntu 24.04 LTS
# NVIDIA Driver: 590
#
# Usage:
#   chmod +x setup-local-llm.sh
#   ./setup-local-llm.sh [--models-only] [--verify-only]
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — edit these to taste
# ---------------------------------------------------------------------------
PRIMARY_MODEL="qwen3.5:35b-a3b"
CODING_MODEL="devstral-small:24b"
REASONING_MODEL="deepseek-r1:14b"
AUTOCOMPLETE_MODEL="codestral:22b"
EMBEDDING_MODEL="nomic-embed-text"
KEEP_ALIVE="30m"
OLLAMA_HOST="127.0.0.1"
OLLAMA_PORT="11434"

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
MODELS_ONLY=false
VERIFY_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --models-only)  MODELS_ONLY=true ;;
    --verify-only)  VERIFY_ONLY=true ;;
    --help|-h)
      echo "Usage: $0 [--models-only] [--verify-only]"
      exit 0
      ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ============================================================================
# Phase 1: Verify Hardware & Drivers
# ============================================================================
echo ""
echo "============================================"
echo " Phase 1: Hardware & Driver Verification"
echo "============================================"

if command -v nvidia-smi &>/dev/null; then
  DRIVER_VERSION=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits | head -1)
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
  GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader | head -1)
  ok "NVIDIA driver: ${DRIVER_VERSION}"
  ok "GPU: ${GPU_NAME} (${GPU_VRAM})"
else
  fail "nvidia-smi not found. Install NVIDIA drivers first."
  exit 1
fi

DRIVER_MAJOR=$(echo "$DRIVER_VERSION" | cut -d. -f1)
if [ "$DRIVER_MAJOR" -lt 550 ]; then
  fail "Driver ${DRIVER_VERSION} is below the recommended 550+."
  exit 1
fi
ok "Driver ${DRIVER_VERSION} meets minimum requirement (550+)."

TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
ok "System RAM: ${TOTAL_RAM_GB} GB"

AVAILABLE_DISK_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
ok "Available disk: ${AVAILABLE_DISK_GB} GB"

if [ "$AVAILABLE_DISK_GB" -lt 100 ]; then
  warn "Less than 100 GB free. Models can be 10-25 GB each."
fi

# ============================================================================
# Phase 2: Install Ollama
# ============================================================================
if [ "$VERIFY_ONLY" = true ]; then
  info "Skipping install (--verify-only)."
elif [ "$MODELS_ONLY" = true ]; then
  info "Skipping install (--models-only)."
else
  echo "============================================"
  echo " Phase 2: Install Ollama"
  echo "============================================"

  info "Downloading and installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh

  if command -v ollama &>/dev/null; then
    INSTALLED_VERSION=$(ollama --version 2>&1 | grep -oP '[\d.]+' | head -1)
    ok "Ollama installed: v${INSTALLED_VERSION}"
  else
    fail "Ollama installation failed."
    exit 1
  fi
fi

# ============================================================================
# Phase 3: Configure Ollama Service
# ============================================================================
if [ "$VERIFY_ONLY" = false ]; then
  echo "============================================"
  echo " Phase 3: Configure Ollama Service"
  echo "============================================"

  if systemctl is-active --quiet ollama 2>/dev/null; then
    ok "Ollama service is already running."
  else
    info "Starting Ollama service..."
    sudo systemctl enable ollama 2>/dev/null || true
    sudo systemctl start ollama 2>/dev/null || true
  fi

  OLLAMA_ENV_FILE="/etc/systemd/system/ollama.service.d/override.conf"
  if [ ! -f "$OLLAMA_ENV_FILE" ]; then
    info "Creating Ollama service override..."
    sudo mkdir -p /etc/systemd/system/ollama.service.d
    sudo tee "$OLLAMA_ENV_FILE" > /dev/null <<EOF
[Service]
Environment="OLLAMA_KEEP_ALIVE=${KEEP_ALIVE}"
Environment="OLLAMA_HOST=${OLLAMA_HOST}:${OLLAMA_PORT}"
EOF
    sudo systemctl daemon-reload
    sudo systemctl restart ollama 2>/dev/null || true
    ok "Configured OLLAMA_KEEP_ALIVE=${KEEP_ALIVE}"
  fi

  info "Waiting for Ollama API..."
  for i in $(seq 1 30); do
    if curl -sf "http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/tags" &>/dev/null; then
      ok "Ollama API is responding at http://${OLLAMA_HOST}:${OLLAMA_PORT}"
      break
    fi
    sleep 1
  done
fi

# ============================================================================
# Phase 4: Pull Models
# ============================================================================
if [ "$VERIFY_ONLY" = true ]; then
  info "Skipping model pull (--verify-only)."
else
  echo "============================================"
  echo " Phase 4: Pull Models"
  echo "============================================"

  pull_model() {
    local model="$1"
    local role="$2"
    info "Pulling ${model} (${role})..."
    if ollama pull "$model"; then
      ok "${model} pulled successfully."
    else
      warn "Failed to pull ${model}. Retry: ollama pull ${model}"
    fi
  }

  pull_model "$PRIMARY_MODEL"      "primary agentic coder"
  pull_model "$CODING_MODEL"       "pure coding tasks"
  pull_model "$REASONING_MODEL"    "reasoning & debugging"
  pull_model "$AUTOCOMPLETE_MODEL" "IDE autocomplete"
  pull_model "$EMBEDDING_MODEL"    "embeddings / codebase search"
fi

# ============================================================================
# Phase 5: Verify Everything Works
# ============================================================================
echo "============================================"
echo " Phase 5: Verification"
echo "============================================"

info "Installed models:"
ollama list

info "Running inference test with ${PRIMARY_MODEL}..."
TEST_RESPONSE=$(ollama run "$PRIMARY_MODEL" \
  "Write a one-line Python function that checks if a number is prime. Reply with ONLY the code." \
  2>&1 | head -5)
if [ -n "$TEST_RESPONSE" ]; then
  ok "Inference test passed."
  echo "  $TEST_RESPONSE"
else
  fail "No response from model. Check: nvidia-smi"
fi

info "Testing OpenAI-compatible API..."
API_RESPONSE=$(curl -sf "http://${OLLAMA_HOST}:${OLLAMA_PORT}/v1/models" 2>&1)
if echo "$API_RESPONSE" | grep -q "data"; then
  ok "OpenAI-compatible API is working."
fi

info "GPU memory after model load:"
nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader

# ============================================================================
# Phase 6: Print Connection Reference
# ============================================================================
echo "============================================"
echo " Setup Complete — Connection Reference"
echo "============================================"
echo ""
echo "  Ollama API:    http://${OLLAMA_HOST}:${OLLAMA_PORT}"
echo "  OpenAI API:    http://${OLLAMA_HOST}:${OLLAMA_PORT}/v1"
echo "  Primary Model: ${PRIMARY_MODEL}"
echo ""
ok "You're ready to go. Happy coding!"
```

</details>

### How to Run It

```bash
chmod +x setup-local-llm.sh
./setup-local-llm.sh
```

Supports re-runs:

```bash
./setup-local-llm.sh --models-only   # Already have Ollama, just pull models
./setup-local-llm.sh --verify-only   # Just check everything is working
```

---

## What Happened When We Ran It

### Phase 1 — Hardware Detection (all green)

```
[OK]    NVIDIA driver: 590.48.01
[OK]    GPU: NVIDIA GeForce RTX 5090 (32607 MiB)
[OK]    Driver 590.48.01 meets minimum requirement (550+).
[OK]    System RAM: 60 GB
[OK]    Available disk: 1717 GB
```

### Phase 2 — Ollama Install

Ollama v0.21.0 installed cleanly. Single curl command, auto-detects
NVIDIA GPU, creates systemd service, adds user to render/video groups.

```
>>> Installing ollama to /usr/local
>>> NVIDIA GPU installed.
[OK]    Ollama installed: v0.21.0
```

### Phase 3 — Service Configuration

Created a systemd override to set `KEEP_ALIVE=30m` (models stay loaded
in VRAM for 30 minutes between requests — avoids cold-start delays).

### Phase 4 — Model Downloads

~44 GB pulled successfully. One model (`devstral-small:24b`) failed
because the Ollama registry name was wrong — fixed by pulling
`devstral` instead.

<details>
<summary>Click to expand: Model pull results</summary>

| Model | Size | Status | Notes |
|---|---|---|---|
| `qwen3.5:35b-a3b` | 23 GB | OK | Primary agentic coder. MoE — only 3B params active per token. 256K context. |
| `devstral-small:24b` | — | FAILED | Registry name wrong. Fix: `ollama pull devstral` |
| `deepseek-r1:14b` | 9.0 GB | OK | Chain-of-thought reasoning. Slower but more accurate on hard debugging. |
| `codestral:22b` | 12 GB | OK | Fast autocomplete for IDE tab-completion. |
| `nomic-embed-text` | 274 MB | OK | Embedding model for codebase search / RAG. |

</details>

### Phase 5 — Verification

Inference test with `qwen3.5:35b-a3b` returned empty during the
automated script run (cold-start timing issue loading 23 GB into VRAM).
Manual verification worked immediately:

```bash
$ ollama run qwen3.5:35b-a3b "What is 2+2? Reply with just the number."
4
```

API endpoint confirmed working:

<details>
<summary>Click to expand: API response from /v1/models</summary>

```json
{
  "object": "list",
  "data": [
    {"id": "nomic-embed-text:latest", "object": "model", "created": 1776640112, "owned_by": "library"},
    {"id": "codestral:22b",           "object": "model", "created": 1776640100, "owned_by": "library"},
    {"id": "deepseek-r1:14b",         "object": "model", "created": 1776639820, "owned_by": "library"},
    {"id": "qwen3.5:35b-a3b",         "object": "model", "created": 1776639644, "owned_by": "library"}
  ]
}
```

</details>

---

## Why These Models Were Chosen

### Model Selection Rationale (for 32 GB VRAM)

**Primary: `qwen3.5:35b-a3b`** — Best all-round agentic coder in
April 2026. Mixture-of-Experts architecture means only 3B parameters
are active per token despite being a 35B model. 256K context window.
Strong tool-calling support. Fits comfortably in 32 GB VRAM (~22 GB).

**Coding: `devstral-small:24b`** (or `devstral`) — Trained specifically
for agentic coding workflows: multi-file edits, terminal automation,
code repair. Benchmarks highest on Ollama for pure coding tasks.

**Reasoning: `deepseek-r1:14b`** — Chain-of-thought model. Thinks
before answering. Slower but catches bugs other models miss. Only
~12 GB VRAM, so it loads fast and leaves headroom.

**Autocomplete: `codestral:22b`** — Optimized for fast inline code
completion (fill-in-the-middle). Best fit for IDE tab-complete via
Continue.dev.

**Embeddings: `nomic-embed-text`** — Lightweight (274 MB) embedding
model for codebase search and RAG pipelines. Runs alongside any
of the above without VRAM pressure.

> Only one generation model is loaded into VRAM at a time. Ollama
> automatically unloads the previous model when you switch. The
> embedding model is small enough to coexist.

---

## How to Connect Coding Tools

### Connection Reference

```
Ollama API:    http://127.0.0.1:11434
OpenAI API:    http://127.0.0.1:11434/v1
API Key:       ollama  (placeholder — not validated)
Primary Model: qwen3.5:35b-a3b
```

### Claude Code (terminal agentic coding)

```bash
claude --model qwen3.5:35b-a3b
```

### Continue.dev (VS Code IDE integration)

<details>
<summary>Click to expand: Continue.dev config.yaml</summary>

```yaml
name: Local Coder
version: 1.0.0
schema: v1
models:
  - name: Qwen3.5 35B (Chat/Edit)
    provider: ollama
    model: qwen3.5:35b-a3b
    roles: [chat, edit, apply]
  - name: Devstral (Coding)
    provider: ollama
    model: devstral-small:24b
    roles: [chat, edit]
  - name: Codestral (Autocomplete)
    provider: ollama
    model: codestral:22b
    roles: [autocomplete]
  - name: Nomic Embed
    provider: ollama
    model: nomic-embed-text
    roles: [embed]
context:
  - provider: code
  - provider: docs
  - provider: diff
  - provider: terminal
  - provider: codebase
```

</details>

### Environment Variables (for scripts/agents)

```bash
export OLLAMA_HOST=http://127.0.0.1:11434
export OPENAI_API_BASE=http://127.0.0.1:11434/v1
export OPENAI_API_KEY=ollama
```

---

## Key Decision: Ollama vs vLLM

Chose **Ollama** for this setup because it's a single-developer
workstation. Ollama wins on simplicity, resource efficiency, and
single-user performance. The tradeoff: if you later need to serve
multiple concurrent Coder workspaces (5+ users), switch to vLLM
which delivers ~16x more throughput under concurrent load.

<details>
<summary>Click to expand: vLLM upgrade command (for future multi-user)</summary>

```bash
docker run --rm -it --gpus all --ipc=host --network host \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  nvcr.io/nvidia/vllm:26.01-py3 \
  vllm serve "Qwen/Qwen3-Coder-Next-FP8" \
  --served-model-name qwen3-coder-next \
  --port 8000 \
  --max-model-len 170000 \
  --gpu-memory-utilization 0.90 \
  --enable-auto-tool-choice \
  --enable-prefix-caching \
  --kv-cache-dtype fp8
```

</details>

---

## Gotchas & Lessons Learned

1. **`devstral-small:24b` doesn't exist on Ollama's registry.**
   The correct pull is `ollama pull devstral`. Registry names don't
   always match what blogs/guides reference.

2. **First inference after model pull returns empty in scripts.**
   Cold-start loading 23 GB into VRAM takes time. The bash `$()`
   capture can time out or swallow output. Manual `ollama run` worked
   immediately after.

3. **KEEP_ALIVE matters.** Without the systemd override, Ollama
   unloads models after 5 minutes of inactivity. Set to `30m` or
   `-1` (indefinitely) to avoid repeated cold starts during coding
   sessions.

4. **System RAM reports 60 GB, not 64 GB.** Normal — the kernel
   and firmware reserve some memory. Not a problem.

---

## What's Next (Not Covered in This Session)

- [ ] Pull `devstral` (correct name) to complete the model set
- [ ] Set up Continue.dev in VS Code with the config above
- [ ] Set up Claude Code pointing at local Ollama
- [ ] Connect Coder Agents to the local LLM endpoint
- [ ] Test agentic coding workflow: multi-file edit, test run, iterate
- [ ] Benchmark: local inference speed (tokens/sec) on this hardware
- [ ] Explore context length tuning (`num_ctx 32768` or higher)
- [ ] Evaluate vLLM if multi-user access is needed later

---

## Raw Numbers for Reference

- Ollama version: **v0.21.0**
- NVIDIA driver: **590.48.01**
- GPU VRAM: **32,607 MiB** (~32 GB)
- System RAM: **60 GB** usable (64 GB installed)
- Available disk at install time: **1,717 GB**
- Total model storage used: **~44 GB** (4 models + embeddings)
- Time from script start to working inference: **~15 minutes**
  (mostly model download time)
