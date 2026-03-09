#!/usr/bin/env python3
"""
Moonshot Engine Eval Orchestrator

Runs programmatic hard gates + generates LLM judge prompts for artifact and outbound evals.

Usage:
    python run_eval.py --target waymo --stage artifact
    python run_eval.py --target waymo --stage outbound
    python run_eval.py --target waymo --stage both
    python run_eval.py --target waymo --stage both --json  # machine-readable output
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from hard_gates import (
    run_artifact_gates,
    run_outbound_gates,
    load_file,
    GateResult,
)
from llm_judge import (
    artifact_judge_prompts,
    outbound_judge_prompts,
)


# ─────────────────────────────────────────────
# Path resolution
# ─────────────────────────────────────────────

def resolve_paths(target: str, engine_root: str = None) -> dict:
    """Resolve all file paths for a given target company."""
    if engine_root is None:
        engine_root = str(Path(__file__).parent.parent.parent / "moonshot-engine")
        if not os.path.exists(engine_root):
            engine_root = str(Path(__file__).parent.parent)

    target_dir = os.path.join(engine_root, "targets", target)
    return {
        "engine_root": engine_root,
        "target_dir": target_dir,
        "artifact_dir": os.path.join(target_dir, "artifact"),
        "outbound_path": os.path.join(target_dir, "outbound-email.md"),
        "fact_set": os.path.join(engine_root, "references", "fact-set.md"),
        "earned_secrets": os.path.join(engine_root, "references", "earned-secrets.md"),
        "profile": os.path.join(engine_root, "references", "profile.md"),
        "intel": os.path.join(target_dir, "intel.md"),
        "role_analysis": os.path.join(target_dir, "role-analysis.md"),
        "artifact_readme": os.path.join(target_dir, "artifact", "README.md"),
    }


# ─────────────────────────────────────────────
# Display formatting
# ─────────────────────────────────────────────

def format_gate_result(g: GateResult) -> str:
    """Format a single gate result for terminal output."""
    icon = "✅" if g.passed else "❌"
    na = g.data.get("na", False)
    if na:
        icon = "⬜"
    return f"  {g.gate_id} {g.name:<28} {icon} {'PASS' if g.passed else 'FAIL' if not na else 'N/A'}  ({g.detail})"


def print_header(title: str):
    print(f"\n{'═' * 55}")
    print(f" {title}")
    print(f"{'═' * 55}\n")


def print_section(title: str):
    print(f"{title}")
    print(f"{'─' * 45}")


def bar_chart(score: float, max_score: float = 5.0, width: int = 22) -> str:
    """Generate a simple bar chart."""
    filled = int((score / max_score) * width)
    return '█' * filled + '░' * (width - filled)


# ─────────────────────────────────────────────
# Artifact eval
# ─────────────────────────────────────────────

def run_artifact_eval(paths: dict, output_json: bool = False) -> dict:
    """Run complete artifact evaluation."""
    print_header(f"ARTIFACT EVAL: {os.path.basename(paths['target_dir'])}")

    # 1. Run hard gates
    print_section("HARD GATES")
    gates = run_artifact_gates(
        paths["artifact_dir"],
        paths["fact_set"],
        paths["earned_secrets"],
    )

    all_passed = True
    for g in gates:
        print(format_gate_result(g))
        if not g.passed and not g.data.get("na", False):
            all_passed = False

    gate_status = "ALL PASS" if all_passed else "BLOCKED"
    print(f"\n  Gate status: {gate_status}")

    if not all_passed:
        print(f"\n  ⚠️  Fix failing gates before subjective scoring.\n")

    # 2. Generate LLM judge prompts
    print(f"\n")
    print_section("LLM JUDGE PROMPTS")

    # Collect artifact text
    artifact_text = ""
    for root, _, files in os.walk(paths["artifact_dir"]):
        for f in files:
            if f.endswith(('.md', '.py', '.txt')):
                artifact_text += f"\n--- {f} ---\n"
                artifact_text += load_file(os.path.join(root, f))

    prompts = artifact_judge_prompts(
        artifact_text=artifact_text,
        fact_set=load_file(paths["fact_set"]),
        earned_secrets=load_file(paths["earned_secrets"]),
        company_intel=load_file(paths["intel"]),
        role_analysis=load_file(paths["role_analysis"]),
    )

    print(f"  Generated {len(prompts)} dimension prompts:")
    for p in prompts:
        print(f"    • {p.dimension} (weight: {p.weight}x) — {len(p.criteria)} criteria")

    # 3. Save prompts for LLM execution
    prompts_dir = os.path.join(paths["target_dir"], "eval-prompts")
    os.makedirs(prompts_dir, exist_ok=True)

    for i, p in enumerate(prompts):
        prompt_file = os.path.join(prompts_dir, f"artifact-dim-{p.criteria[0]['id'][0].lower()}.json")
        with open(prompt_file, 'w') as f:
            json.dump({
                "dimension": p.dimension,
                "weight": p.weight,
                "system_prompt": p.system_prompt,
                "user_prompt": p.user_prompt_template,
                "criteria": p.criteria,
            }, f, indent=2)

    print(f"\n  Prompts saved to: {prompts_dir}/")
    print(f"  → Send each prompt to Claude/GPT-4 to get subjective scores")
    print(f"  → Or use: python run_eval.py --target {os.path.basename(paths['target_dir'])} --score artifact-scores.json")

    result = {
        "stage": "artifact",
        "target": os.path.basename(paths["target_dir"]),
        "gates": {g.gate_id: {"passed": g.passed, "detail": g.detail, "data": g.data} for g in gates},
        "all_gates_passed": all_passed,
        "prompt_count": len(prompts),
        "prompts_dir": prompts_dir,
    }

    if output_json:
        print(f"\n{json.dumps(result, indent=2)}")

    return result


# ─────────────────────────────────────────────
# Outbound eval
# ─────────────────────────────────────────────

def run_outbound_eval(paths: dict, output_json: bool = False) -> dict:
    """Run complete outbound evaluation."""
    print_header(f"OUTBOUND EVAL: {os.path.basename(paths['target_dir'])}")

    # 1. Run hard gates
    print_section("HARD GATES")
    gates = run_outbound_gates(
        paths["outbound_path"],
        paths["fact_set"],
    )

    all_passed = True
    for g in gates:
        print(format_gate_result(g))
        if not g.passed and not g.data.get("na", False):
            all_passed = False

    gate_status = "ALL PASS" if all_passed else "BLOCKED"
    print(f"\n  Gate status: {gate_status}")

    if not all_passed:
        print(f"\n  ⚠️  Fix failing gates before subjective scoring.\n")

    # 2. Generate LLM judge prompts
    print(f"\n")
    print_section("LLM JUDGE PROMPTS")

    prompts = outbound_judge_prompts(
        outbound_text=load_file(paths["outbound_path"]),
        artifact_readme=load_file(paths["artifact_readme"]),
        fact_set=load_file(paths["fact_set"]),
        earned_secrets=load_file(paths["earned_secrets"]),
        company_intel=load_file(paths["intel"]),
    )

    print(f"  Generated {len(prompts)} dimension prompts:")
    for p in prompts:
        print(f"    • {p.dimension} (weight: {p.weight}x) — {len(p.criteria)} criteria")

    # 3. Save prompts
    prompts_dir = os.path.join(paths["target_dir"], "eval-prompts")
    os.makedirs(prompts_dir, exist_ok=True)

    for i, p in enumerate(prompts):
        prompt_file = os.path.join(prompts_dir, f"outbound-dim-{p.criteria[0]['id'][0].lower()}.json")
        with open(prompt_file, 'w') as f:
            json.dump({
                "dimension": p.dimension,
                "weight": p.weight,
                "system_prompt": p.system_prompt,
                "user_prompt": p.user_prompt_template,
                "criteria": p.criteria,
            }, f, indent=2)

    print(f"\n  Prompts saved to: {prompts_dir}/")

    result = {
        "stage": "outbound",
        "target": os.path.basename(paths["target_dir"]),
        "gates": {g.gate_id: {"passed": g.passed, "detail": g.detail, "data": g.data} for g in gates},
        "all_gates_passed": all_passed,
        "prompt_count": len(prompts),
        "prompts_dir": prompts_dir,
    }

    if output_json:
        print(f"\n{json.dumps(result, indent=2)}")

    return result


# ─────────────────────────────────────────────
# Score aggregation (after LLM judge runs)
# ─────────────────────────────────────────────

def aggregate_scores(scores_file: str, stage: str) -> dict:
    """Aggregate LLM judge scores and compute final grade."""
    with open(scores_file) as f:
        scores = json.load(f)

    # Define weights per dimension
    if stage == "artifact":
        weights = {"A": 3.0, "B": 2.0, "C": 2.0, "D": 1.5, "E": 2.0, "F": 2.0}
        max_weighted = 62.5 * 5  # 312.5
    else:  # outbound
        weights = {"A": 3.0, "B": 2.5, "C": 2.0, "D": 2.0, "E": 1.5, "F": 2.0}
        max_weighted = 65.0 * 5  # 325.0

    total_weighted = 0
    min_score = 5
    flagged = []

    print(f"\n")
    print_section("SUBJECTIVE SCORES")

    for dim_key, weight in weights.items():
        dim_scores = scores.get(dim_key, {})
        if not dim_scores:
            continue

        dim_name = dim_scores.get("dimension", dim_key)
        criteria_scores = dim_scores.get("scores", [])
        avg = sum(s["score"] for s in criteria_scores) / len(criteria_scores)

        weighted = avg * weight * 5  # 5 criteria per dimension
        total_weighted += weighted

        bar = bar_chart(avg)
        print(f"  {dim_name:<30} [{avg:.1f}/5.0]  {bar}  ({weight}x weight)")

        for s in criteria_scores:
            if s["score"] < min_score:
                min_score = s["score"]
            if s["score"] < 4:
                flagged.append((s["id"], s["score"], s.get("justification", "")))

    pct = (total_weighted / max_weighted) * 100

    # Determine grade
    if pct >= 88 and min_score >= 4:
        grade = "EXCEPTIONAL"
    elif pct >= 70 and min_score >= 3:
        grade = "PRODUCTION-READY"
    elif pct >= 56 and sum(1 for _, s, _ in flagged if s < 3) <= 3:
        grade = "NEEDS POLISH"
    else:
        grade = "NEEDS REWORK"

    print(f"\n  Weighted score: {total_weighted:.1f} / {max_weighted:.1f} ({pct:.1f}%)")
    print(f"  Grade: {grade}")

    if flagged:
        print(f"\n")
        print_section("FLAGGED ITEMS (score < 4)")
        for cid, score, just in flagged:
            print(f"  {cid} ({score}): {just}")

    return {
        "total_weighted": total_weighted,
        "max_weighted": max_weighted,
        "percentage": pct,
        "grade": grade,
        "min_score": min_score,
        "flagged": [{"id": c, "score": s, "justification": j} for c, s, j in flagged],
    }


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Moonshot Engine Eval Runner")
    parser.add_argument("--target", required=True, help="Target company (e.g., waymo)")
    parser.add_argument("--stage", required=True, choices=["artifact", "outbound", "both"],
                       help="Which stage to evaluate")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    parser.add_argument("--score", help="Path to LLM judge scores JSON for aggregation")
    parser.add_argument("--root", help="Override moonshot-engine root directory")

    args = parser.parse_args()
    paths = resolve_paths(args.target, args.root)

    # Verify target exists
    if not os.path.exists(paths["target_dir"]):
        print(f"❌ Target directory not found: {paths['target_dir']}")
        sys.exit(1)

    results = {}

    if args.score:
        # Score aggregation mode
        stage = args.stage if args.stage != "both" else "artifact"
        aggregate_scores(args.score, stage)
        return

    if args.stage in ("artifact", "both"):
        if os.path.exists(paths["artifact_dir"]):
            results["artifact"] = run_artifact_eval(paths, args.json)
        else:
            print(f"⚠️  No artifact directory found at {paths['artifact_dir']}")

    if args.stage in ("outbound", "both"):
        if os.path.exists(paths["outbound_path"]):
            results["outbound"] = run_outbound_eval(paths, args.json)
        else:
            print(f"⚠️  No outbound file found at {paths['outbound_path']}")

    # Summary
    if len(results) > 0:
        print(f"\n{'═' * 55}")
        print(f" SUMMARY")
        print(f"{'═' * 55}")
        for stage, r in results.items():
            status = "✅ Gates passed" if r["all_gates_passed"] else "❌ Gates BLOCKED"
            print(f"  {stage.upper()}: {status} | {r['prompt_count']} LLM judge prompts generated")
        print()


if __name__ == "__main__":
    main()
