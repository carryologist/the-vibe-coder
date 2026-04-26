#!/usr/bin/env python3
"""
Kimi K2 Benchmark via llama-server API

Instead of fighting llama-cli's conversation mode, we:
1. Start llama-server as a background process (OpenAI-compatible API)
2. Wait for it to load the model
3. Hit it with the same streaming HTTP request we use for Ollama
4. Capture TTFT, total time, tokens, tok/s — all programmatically
5. Shut down the server

Usage:
  python3 benchmark_kimi.py
"""

import os
import sys
import time
import json
import subprocess
import signal
import tempfile
import ast
import re
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.expanduser(
    "~/models/kimi-k2/Q4_K_M/Kimi-K2-Instruct-Q4_K_M-00001-of-00013.gguf"
)
LLAMA_SERVER = os.path.expanduser("~/llama.cpp/build/bin/llama-server")
N_GPU_LAYERS = 2
CTX_SIZE = 4096
PORT = 8090  # Avoid conflicting with Ollama on 11434
LABEL = "Kimi K2 1T (Q4_K_M)"

PROMPT = """Write a Python CLI todo app with the following requirements:
- SQLite persistence (using sqlite3)
- Commands: add, list, complete, delete (using argparse or sys.argv, NOT interactive input)
- Timestamps on creation
- Pretty terminal output
- Error handling
- A __main__ block

Respond with ONLY the Python code, no explanation."""

# ── Feature checklist (identical to Round 1) ──────────────────────────────────
FEATURE_CHECKS = [
    ("sqlite3 import", lambda code: "import sqlite3" in code or "from sqlite3" in code),
    ("argparse/sys.argv CLI", lambda code: "argparse" in code or "sys.argv" in code),
    ("add command", lambda code: "'add'" in code or '"add"' in code),
    ("list command", lambda code: "'list'" in code or '"list"' in code),
    ("complete command", lambda code: "'complete'" in code or '"complete"' in code),
    ("delete command", lambda code: "'delete'" in code or '"delete"' in code),
    ("timestamps", lambda code: "datetime" in code or "TIMESTAMP" in code or "timestamp" in code or "CURRENT_TIMESTAMP" in code or "created" in code.lower()),
    ("pretty output", lambda code: "print(" in code),
    ("error handling", lambda code: "try:" in code or "except" in code or "Error" in code),
    ("__main__ block", lambda code: '__name__' in code and '__main__' in code),
]


def extract_code(text):
    pattern = r'```python\s*\n(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    if matches:
        return matches[0].strip()
    pattern = r'```\s*\n(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    if matches:
        return matches[0].strip()
    return text.strip()


def check_syntax(code):
    try:
        ast.parse(code)
        return True, None
    except SyntaxError as e:
        return False, str(e)


def check_features(code):
    results = []
    passed = 0
    for name, check in FEATURE_CHECKS:
        ok = check(code)
        results.append((name, ok))
        if ok:
            passed += 1
    return passed, len(FEATURE_CHECKS), results


def run_functional_tests(code):
    with tempfile.TemporaryDirectory() as tmpdir:
        script = os.path.join(tmpdir, "todo.py")
        with open(script, "w") as f:
            f.write(code)
        tests = [
            ("add todo 1", ["python3", script, "add", "Buy groceries"]),
            ("add todo 2", ["python3", script, "add", "Walk the dog"]),
            ("list after adds", ["python3", script, "list"]),
            ("complete todo 1", ["python3", script, "complete", "1"]),
            ("list after complete", ["python3", script, "list"]),
            ("delete todo 2", ["python3", script, "delete", "2"]),
            ("list after delete", ["python3", script, "list"]),
        ]
        passed = 0
        details = []
        for name, cmd in tests:
            try:
                result = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=10, cwd=tmpdir
                )
                ok = result.returncode == 0
                details.append((name, ok, result.stdout[:200] if ok else result.stderr[:200]))
                if ok:
                    passed += 1
            except subprocess.TimeoutExpired:
                details.append((name, False, "TIMEOUT"))
            except Exception as e:
                details.append((name, False, str(e)[:200]))
        return passed, len(tests), details


def wait_for_server(port, timeout=600):
    """Poll the server health endpoint until it's ready."""
    url = f"http://127.0.0.1:{port}/health"
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                status = data.get("status", "")
                if status == "ok":
                    return True
                # "loading model" status — keep waiting
                print(f"  Server status: {status}...", flush=True)
        except Exception:
            pass
        time.sleep(5)
    return False


def main():
    print(f"\n{'='*70}")
    print(f"  KIMI K2 BENCHMARK (via llama-server API)")
    print(f"{'='*70}\n")

    # ── Step 1: Start llama-server ────────────────────────────────────────
    print(f"  Starting llama-server...")
    print(f"  Model: {MODEL_PATH}")
    print(f"  GPU layers: {N_GPU_LAYERS}")
    print(f"  Port: {PORT}")
    print()

    server_cmd = [
        LLAMA_SERVER,
        "-m", MODEL_PATH,
        "--n-gpu-layers", str(N_GPU_LAYERS),
        "--mmap",
        "-c", str(CTX_SIZE),
        "--port", str(PORT),
        "--host", "127.0.0.1",
    ]

    # Start server, capture stderr for timing stats
    server_log = open(os.path.expanduser("~/benchmark/kimi_server.log"), "w")
    server_proc = subprocess.Popen(
        server_cmd,
        stdout=server_log,
        stderr=subprocess.STDOUT,
    )

    print("  Waiting for model to load (this takes several minutes)...")
    load_start = time.time()

    if not wait_for_server(PORT, timeout=900):
        print("  ERROR: Server failed to start within 15 minutes")
        server_proc.kill()
        return
    
    load_time = time.time() - load_start
    print(f"  Model loaded in {load_time:.1f}s\n")

    # ── Step 2: Send benchmark request ────────────────────────────────────
    print("  Sending benchmark request...\n")

    url = f"http://127.0.0.1:{PORT}/v1/chat/completions"
    payload = json.dumps({
        "model": "kimi-k2",
        "messages": [{"role": "user", "content": PROMPT}],
        "max_tokens": 8192,
        "temperature": 0.0,
        "stream": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    start_time = time.time()
    ttft = None
    full_response = ""
    total_tokens = 0

    try:
        with urllib.request.urlopen(req, timeout=3600) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                choices = chunk.get("choices", [])
                if not choices:
                    continue
                delta = choices[0].get("delta", {})
                content = delta.get("content", "")

                if content:
                    if ttft is None:
                        ttft = time.time() - start_time
                    full_response += content
                    total_tokens += 1  # Approximate — each SSE chunk is ~1 token
                    print(content, end="", flush=True)

                # Check for usage in final chunk
                usage = chunk.get("usage")
                if usage:
                    total_tokens = usage.get("completion_tokens", total_tokens)

    except Exception as e:
        print(f"\n  ERROR: {e}")
        server_proc.terminate()
        return

    end_time = time.time()
    total_time = end_time - start_time
    tok_per_sec = total_tokens / total_time if total_time > 0 else 0

    print(f"\n\n{'─'*70}")
    print(f"  Model Load:    {load_time:.1f}s")
    print(f"  TTFT:          {ttft:.2f}s")
    print(f"  Total Time:    {total_time:.2f}s")
    print(f"  Output Tokens: {total_tokens}")
    print(f"  Tok/s:         {tok_per_sec:.1f}")
    print(f"{'─'*70}\n")

    # ── Step 3: Shutdown server ───────────────────────────────────────────
    print("  Shutting down llama-server...")
    server_proc.terminate()
    try:
        server_proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        server_proc.kill()
    server_log.close()
    print("  Server stopped.\n")

    # ── Step 4: Validate ──────────────────────────────────────────────────
    code = extract_code(full_response)

    os.makedirs(os.path.expanduser("~/benchmark/outputs"), exist_ok=True)
    code_file = os.path.expanduser("~/benchmark/outputs/Kimi_K2_1T_(Q4_K_M).py")
    with open(code_file, "w") as f:
        f.write(code)

    print(f"  Code saved to: {code_file}")
    print(f"  Code length: {len(code)} chars, {len(code.splitlines())} lines\n")

    syntax_ok, syntax_err = check_syntax(code)
    print(f"  Syntax Valid: {'Yes' if syntax_ok else 'No'}")
    if syntax_err:
        print(f"    Error: {syntax_err}")

    feat_passed, feat_total, feat_details = check_features(code)
    print(f"\n  Features: {feat_passed}/{feat_total}")
    for name, ok in feat_details:
        print(f"    {'✓' if ok else '✗'} {name}")

    if syntax_ok:
        func_passed, func_total, func_details = run_functional_tests(code)
        print(f"\n  Functional Tests: {func_passed}/{func_total}")
        for name, ok, output in func_details:
            print(f"    {'✓' if ok else '✗'} {name}")
            if not ok:
                print(f"      {output[:100]}")
    else:
        func_passed, func_total = 0, 7
        print(f"\n  Functional Tests: SKIPPED (syntax invalid)")

    feat_score = (feat_passed / feat_total) * 60
    func_score = (func_passed / func_total) * 40 if func_total > 0 else 0
    total_score = round(feat_score + func_score)

    print(f"\n  {'─'*60}")
    print(f"  SCORE: {total_score}/100")
    print(f"    Features:   {feat_passed}/{feat_total} ({feat_score:.0f}/60)")
    print(f"    Functional: {func_passed}/{func_total} ({func_score:.0f}/40)")
    print(f"  {'─'*60}")

    # ── Step 5: Save results ──────────────────────────────────────────────
    result = {
        "model": LABEL,
        "model_id": "kimi-k2:1t-q4km",
        "type": "Local (llama.cpp / NVMe)",
        "ttft": round(ttft, 2) if ttft else None,
        "total_time": round(total_time, 2),
        "model_load_time": round(load_time, 1),
        "output_tokens": total_tokens,
        "tok_per_sec": round(tok_per_sec, 1),
        "n_gpu_layers": N_GPU_LAYERS,
        "syntax_valid": syntax_ok,
        "features": f"{feat_passed}/{feat_total}",
        "functional": f"{func_passed}/{func_total}",
        "score": total_score,
        "lines": len(code.splitlines()),
    }

    # Merge into existing results
    results_file = os.path.expanduser("~/benchmark/results_round2_full.json")
    existing = []
    if os.path.exists(results_file):
        try:
            with open(results_file, "r") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, IOError):
            existing = []

    existing_models = {r["model"]: i for i, r in enumerate(existing)}
    if LABEL in existing_models:
        existing[existing_models[LABEL]] = result
    else:
        existing.append(result)

    with open(results_file, "w") as f:
        json.dump(existing, f, indent=2)

    # Save raw output
    raw_file = os.path.expanduser("~/benchmark/raw_outputs_round2.json")
    existing_raw = {}
    if os.path.exists(raw_file):
        try:
            with open(raw_file, "r") as f:
                existing_raw = json.load(f)
        except (json.JSONDecodeError, IOError):
            existing_raw = {}
    existing_raw[LABEL] = full_response
    with open(raw_file, "w") as f:
        json.dump(existing_raw, f, indent=2)

    print(f"\n  Results merged into: {results_file}")
    print(f"  Raw output saved to: {raw_file}")


if __name__ == "__main__":
    main()
