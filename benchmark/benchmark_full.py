#!/usr/bin/env python3
"""
Full Local Model Shootout (Round 2)
All local models, same prompt, fixes applied from Round 1.

Fixes from Round 1:
- Token limit raised from 4,096 to 16,384 (Qwen truncation fix)
- Prompt explicitly says "argparse or sys.argv, NOT interactive input"
- Context window set to 16,384 for all models

Usage:
  python3 benchmark_full.py                # Run all local models
  python3 benchmark_full.py gemma4         # Run single model
  python3 benchmark_full.py kimi-k2        # Run Kimi via llama.cpp
"""

import sys
import os
import time
import json
import subprocess
import tempfile
import ast
import re
import urllib.request
import urllib.error

# ── The Prompt (same task, clarified CLI requirement) ─────────────────────────
PROMPT = """Write a Python CLI todo app with the following requirements:
- SQLite persistence (using sqlite3)
- Commands: add, list, complete, delete (using argparse or sys.argv, NOT interactive input)
- Timestamps on creation
- Pretty terminal output
- Error handling
- A __main__ block

Respond with ONLY the Python code, no explanation."""

# ── Models to test ────────────────────────────────────────────────────────────
OLLAMA_MODELS = [
    {"name": "gemma4:latest",       "label": "Gemma 4 27B"},
    {"name": "devstral:latest",     "label": "Devstral 24B"},
    {"name": "codestral:22b",       "label": "Codestral 22B"},
    {"name": "deepseek-r1:14b",     "label": "DeepSeek R1 14B"},
    {"name": "qwen3.5:35b-a3b",     "label": "Qwen 3.5 MoE 35B"},
]

# ── Ollama settings (fixes from Round 1) ──────────────────────────────────────
OLLAMA_OPTIONS = {
    "num_predict": 16384,   # Was 4096 in Round 1 — caused Qwen truncation
    "num_ctx": 16384,       # Consistent context window for all models
    "temperature": 0.0,
}

# ── Feature checklist (10 items, identical to Round 1) ────────────────────────
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
    """Extract Python code from model output, handling markdown fences."""
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
    """Check if code is valid Python."""
    try:
        ast.parse(code)
        return True, None
    except SyntaxError as e:
        return False, str(e)


def check_features(code):
    """Run feature checklist."""
    results = []
    passed = 0
    for name, check in FEATURE_CHECKS:
        ok = check(code)
        results.append((name, ok))
        if ok:
            passed += 1
    return passed, len(FEATURE_CHECKS), results


def run_functional_tests(code):
    """Run the 7-operation functional test suite."""
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


def preload_model(model_name):
    """Send a dummy request to load the model into VRAM before benchmarking."""
    print(f"  Preloading {model_name} into VRAM...")
    url = "http://127.0.0.1:11434/api/generate"
    payload = json.dumps({
        "model": model_name,
        "prompt": "hi",
        "stream": False,
        "options": {"num_predict": 1},
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            resp.read()
        print(f"  {model_name} loaded.\n")
        time.sleep(2)  # Let VRAM settle
    except Exception as e:
        print(f"  Warning: preload failed: {e}\n")


def unload_model(model_name):
    """Unload a model from VRAM."""
    try:
        subprocess.run(["ollama", "stop", model_name], capture_output=True, timeout=30)
        time.sleep(3)
    except Exception:
        pass


def benchmark_ollama(model_name, label):
    """Benchmark a model via Ollama's API with streaming."""
    print(f"\n{'='*70}")
    print(f"  BENCHMARKING: {label} ({model_name})")
    print(f"{'='*70}\n")

    # Unload any other models, then preload this one
    for m in OLLAMA_MODELS:
        if m["name"] != model_name:
            unload_model(m["name"])
    preload_model(model_name)

    url = "http://127.0.0.1:11434/api/generate"
    payload = json.dumps({
        "model": model_name,
        "prompt": PROMPT,
        "stream": True,
        "options": OLLAMA_OPTIONS,
    }).encode("utf-8")

    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    print("Sending request...")
    start_time = time.time()
    ttft = None
    full_response = ""
    total_tokens = 0
    prompt_tokens = 0

    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            for line in resp:
                chunk = json.loads(line.decode("utf-8"))
                if ttft is None and chunk.get("response"):
                    ttft = time.time() - start_time
                if chunk.get("response"):
                    full_response += chunk["response"]
                    print(chunk["response"], end="", flush=True)
                if chunk.get("done"):
                    total_tokens = chunk.get("eval_count", 0)
                    prompt_tokens = chunk.get("prompt_eval_count", 0)
    except Exception as e:
        print(f"\nERROR: {e}")
        return None

    end_time = time.time()
    total_time = end_time - start_time
    if total_tokens == 0:
        total_tokens = len(full_response.split())
    tok_per_sec = total_tokens / total_time if total_time > 0 else 0

    print(f"\n\n{'─'*70}")
    print(f"  TTFT:          {ttft:.2f}s")
    print(f"  Total Time:    {total_time:.2f}s")
    print(f"  Output Tokens: {total_tokens}")
    print(f"  Tok/s:         {tok_per_sec:.1f}")
    print(f"  Prompt Tokens: {prompt_tokens}")
    print(f"{'─'*70}\n")

    return {
        "model": label,
        "model_id": model_name,
        "type": "Local (Ollama)",
        "ttft": round(ttft, 2) if ttft else None,
        "total_time": round(total_time, 2),
        "output_tokens": total_tokens,
        "prompt_tokens": prompt_tokens,
        "tok_per_sec": round(tok_per_sec, 1),
        "raw_output": full_response,
    }


def benchmark_llamacpp(
    model_path="~/models/kimi-k2/Q4_K_M/Kimi-K2-Instruct-Q4_K_M-00001-of-00013.gguf",
    n_gpu_layers=0,
    label="Kimi K2 1T (Q4_K_M)"
):
    """Benchmark Kimi K2 via llama.cpp server API."""
    print(f"\n{'='*70}")
    print(f"  BENCHMARKING: {label} (via llama.cpp)")
    print(f"{'='*70}\n")

    model_path = os.path.expanduser(model_path)
    llama_server = os.path.expanduser("~/llama.cpp/build/bin/llama-server")
    llama_cli = os.path.expanduser("~/llama.cpp/build/bin/llama-cli")

    # Use llama-cli in non-interactive mode
    cmd = [
        llama_cli,
        "-m", model_path,
        "--n-gpu-layers", str(n_gpu_layers),
        "--mmap",
        "-c", "4096",
        "-n", "8192",
        "--temp", "0",
        "--no-conversation",
        "-e",
        "-p", PROMPT,
    ]

    print(f"  GPU layers: {n_gpu_layers}")
    print(f"  Model: {model_path}")
    print()

    start_time = time.time()
    ttft = None
    full_output = ""
    prompt_seen = False

    try:
        process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1
        )

        while True:
            char = process.stdout.read(1)
            if not char:
                break
            full_output += char

            # Skip echoed prompt
            if not prompt_seen:
                if "Respond with ONLY the Python code, no explanation." in full_output:
                    prompt_seen = True
                    full_output = ""
                continue

            if ttft is None and char.strip():
                ttft = time.time() - start_time

            print(char, end="", flush=True)

        process.wait(timeout=3600)
        stderr = process.stderr.read()

    except subprocess.TimeoutExpired:
        process.kill()
        print("\nERROR: Timed out after 60 minutes")
        return None
    except Exception as e:
        print(f"\nERROR: {e}")
        return None

    end_time = time.time()
    total_time = end_time - start_time

    # Parse llama.cpp timing stats from stderr
    tok_per_sec = 0
    total_tokens = 0
    prompt_eval_time = 0

    for line in stderr.split("\n"):
        if "eval time" in line and "prompt" not in line:
            match = re.search(r'eval time\s*=\s*([\d.]+)\s*ms\s*/\s*(\d+)\s*tokens', line)
            if match:
                eval_ms = float(match.group(1))
                total_tokens = int(match.group(2))
                tok_per_sec = (total_tokens / eval_ms) * 1000 if eval_ms > 0 else 0
        if "prompt eval time" in line:
            match = re.search(r'prompt eval time\s*=\s*([\d.]+)\s*ms', line)
            if match:
                prompt_eval_time = float(match.group(1)) / 1000

    if total_tokens == 0:
        total_tokens = len(full_output.split())
    if tok_per_sec == 0 and total_time > 0:
        tok_per_sec = total_tokens / total_time
    if ttft is None:
        ttft = prompt_eval_time if prompt_eval_time > 0 else total_time

    print(f"\n\n{'─'*70}")
    print(f"  TTFT:          {ttft:.2f}s")
    print(f"  Total Time:    {total_time:.2f}s")
    print(f"  Output Tokens: {total_tokens}")
    print(f"  Tok/s:         {tok_per_sec:.1f}")
    print(f"{'─'*70}")

    if stderr:
        for line in stderr.split("\n"):
            if "timings" in line.lower() or "eval" in line.lower():
                print(f"  {line.strip()}")
    print()

    return {
        "model": label,
        "model_id": "kimi-k2:1t-q4km",
        "type": "Local (llama.cpp / NVMe)",
        "ttft": round(ttft, 2) if ttft else None,
        "total_time": round(total_time, 2),
        "output_tokens": total_tokens,
        "tok_per_sec": round(tok_per_sec, 1),
        "raw_output": full_output,
    }


def validate_and_score(result):
    """Run full validation suite."""
    if not result:
        return None

    print(f"\n{'='*70}")
    print(f"  VALIDATION: {result['model']}")
    print(f"{'='*70}\n")

    code = extract_code(result["raw_output"])

    os.makedirs(os.path.expanduser("~/benchmark/outputs"), exist_ok=True)
    safe_name = result["model"].replace(" ", "_").replace("/", "_").replace(":", "_")
    code_file = os.path.expanduser(f"~/benchmark/outputs/{safe_name}.py")
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

    result["syntax_valid"] = syntax_ok
    result["features"] = f"{feat_passed}/{feat_total}"
    result["functional"] = f"{func_passed}/{func_total}"
    result["score"] = total_score
    result["lines"] = len(code.splitlines())

    return result


def print_summary(results):
    """Print final comparison tables."""
    print(f"\n\n{'='*90}")
    print("  FULL LOCAL MODEL SHOOTOUT — ROUND 2 RESULTS")
    print(f"{'='*90}\n")

    print("  Performance:")
    print(f"  {'Model':<22} {'TTFT':>8} {'Total':>10} {'Tokens':>8} {'Tok/s':>8} {'Lines':>6}")
    print(f"  {'─'*66}")
    for r in results:
        print(f"  {r['model']:<22} {r['ttft']:>7.2f}s {r['total_time']:>9.2f}s {r['output_tokens']:>8} {r['tok_per_sec']:>7.1f} {r.get('lines','?'):>6}")

    print()
    print("  Quality:")
    print(f"  {'Model':<22} {'Syntax':<8} {'Features':<10} {'Functional':<12} {'Score':>6}")
    print(f"  {'─'*60}")
    for r in results:
        print(f"  {r['model']:<22} {'Yes' if r['syntax_valid'] else 'No':<8} {r['features']:<10} {r['functional']:<12} {r['score']:>6}")

    # Save results
    results_file = os.path.expanduser("~/benchmark/results_round2_full.json")
    with open(results_file, "w") as f:
        clean = [{k: v for k, v in r.items() if k != "raw_output"} for r in results]
        json.dump(clean, f, indent=2)
    print(f"\n  Results saved to: {results_file}")

    # Save raw outputs
    raw_file = os.path.expanduser("~/benchmark/raw_outputs_round2.json")
    with open(raw_file, "w") as f:
        raw = {r["model"]: r["raw_output"] for r in results}
        json.dump(raw, f, indent=2)
    print(f"  Raw outputs saved to: {raw_file}")


def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    results = []

    # Run Ollama models
    for m in OLLAMA_MODELS:
        if target == "all" or target in m["name"].lower() or target in m["label"].lower():
            result = benchmark_ollama(m["name"], m["label"])
            if result:
                result = validate_and_score(result)
                if result:
                    results.append(result)

    # Run Kimi K2 via llama.cpp
    if target in ("all", "kimi-k2", "kimi"):
        # Unload all Ollama models first
        print("\n  Unloading all Ollama models for Kimi K2...")
        for m in OLLAMA_MODELS:
            unload_model(m["name"])
        time.sleep(5)

        result = benchmark_llamacpp(
            model_path="~/models/kimi-k2/Q4_K_M/Kimi-K2-Instruct-Q4_K_M-00001-of-00013.gguf",
            n_gpu_layers=3,
            label="Kimi K2 1T (Q4_K_M)"
        )
        if result:
            result = validate_and_score(result)
            if result:
                results.append(result)

    if not results:
        print(f"No models matched target: {target}")
        print("Usage: python3 benchmark_full.py [all|gemma4|devstral|codestral|deepseek|qwen|kimi-k2]")
        sys.exit(1)

    print_summary(results)


if __name__ == "__main__":
    main()
