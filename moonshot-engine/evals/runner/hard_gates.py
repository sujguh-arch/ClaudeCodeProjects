"""
Programmatic hard gate checks for Artifact and Outbound evals.
Each gate returns a GateResult with pass/fail status and diagnostic detail.
"""

import re
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class GateResult:
    gate_id: str
    name: str
    passed: bool
    detail: str
    data: dict = field(default_factory=dict)


# ─────────────────────────────────────────────
# Utility functions
# ─────────────────────────────────────────────

def load_file(path: str) -> str:
    """Load a file and return its contents, or empty string if missing."""
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def word_count(text: str) -> int:
    return len(text.split())


def char_count(text: str) -> int:
    return len(text)


def extract_metrics(text: str) -> list[str]:
    """Extract all numbers, percentages, and dollar amounts from text."""
    patterns = [
        r'\d+%',              # percentages
        r'\d+\+%',            # 60%+
        r'\$[\d,.]+[MBK]?',   # dollar amounts
        r'\d+[xX]',           # multipliers (10x, 3x)
        r'\d{1,3}(?:,\d{3})+', # large numbers with commas
        r'\b\d+(?:\.\d+)?\s*(?:billion|million|thousand)\b',  # written numbers
        r'\b\d+K\+?\b',       # 7K+, 40K
        r'\b\d+M\+?\b',       # 4M+, 20M
    ]
    found = []
    for p in patterns:
        found.extend(re.findall(p, text, re.IGNORECASE))
    return list(set(found))


def extract_sections(outbound_text: str) -> dict[str, str]:
    """Parse an outbound-email.md into named sections."""
    sections = {}
    current_section = None
    current_lines = []

    for line in outbound_text.split('\n'):
        if line.startswith('## '):
            if current_section:
                sections[current_section] = '\n'.join(current_lines).strip()
            current_section = line[3:].strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_section:
        sections[current_section] = '\n'.join(current_lines).strip()

    return sections


# ─────────────────────────────────────────────
# ARTIFACT HARD GATES
# ─────────────────────────────────────────────

def artifact_hg01_fact_set_traceability(artifact_dir: str, fact_set_path: str) -> GateResult:
    """HG-01: Every metric in the artifact must trace to fact-set.md."""
    fact_set = load_file(fact_set_path)
    if not fact_set:
        return GateResult("HG-01", "Fact-Set Traceability", False, "fact-set.md not found", {})

    # Collect all text from artifact directory
    artifact_text = ""
    for root, _, files in os.walk(artifact_dir):
        for f in files:
            if f.endswith(('.md', '.py', '.txt')):
                artifact_text += load_file(os.path.join(root, f)) + "\n"

    metrics = extract_metrics(artifact_text)
    if not metrics:
        return GateResult("HG-01", "Fact-Set Traceability", True,
                         "No metrics found in artifact (nothing to trace)", {"metrics": []})

    orphans = []
    traced = []
    for m in metrics:
        # Normalize for matching: strip trailing +, %, etc.
        search_term = m.rstrip('+').rstrip('%').rstrip('x').rstrip('X')
        if search_term in fact_set or m in fact_set:
            traced.append(m)
        else:
            # Try without commas
            if search_term.replace(',', '') in fact_set.replace(',', ''):
                traced.append(m)
            else:
                orphans.append(m)

    # Filter: only flag orphan metrics that appear near experience-claim context
    # Domain-specific numbers (incidents, fleet sizes, simulation output) are NOT claims about Sujoy
    experience_orphans = []
    # Markers that indicate a metric is about Sujoy's experience (should be in fact-set)
    experience_context = ['duetto', 'capital one', 'wayfair', 'jpmc', 'j.p. morgan',
                         'i shipped', 'i built', 'i led', 'my team', 'we achieved',
                         'sujoy', 'acceptance', 'revpar', 'arr growth']
    artifact_lower = artifact_text.lower()
    for orphan in orphans:
        # Find the orphan in text and check surrounding context (±200 chars)
        pos = artifact_lower.find(orphan.lower())
        if pos == -1:
            pos = artifact_lower.find(orphan.replace(',', '').lower())
        if pos >= 0:
            context_window = artifact_lower[max(0, pos - 200):pos + 200]
            is_experience_claim = any(marker in context_window for marker in experience_context)
            if is_experience_claim:
                experience_orphans.append(orphan)
            # else: domain fact (Waymo incidents, fleet sizes, etc.) — OK to not trace

    passed = len(experience_orphans) == 0
    detail = f"{len(traced)}/{len(metrics)} metrics traced"
    if experience_orphans:
        detail += f"; orphans: {experience_orphans}"

    return GateResult("HG-01", "Fact-Set Traceability", passed, detail,
                     {"traced": traced, "orphans": experience_orphans, "total": len(metrics)})


def artifact_hg03_earned_secret_presence(artifact_dir: str, secrets_path: str) -> GateResult:
    """HG-03: At least one earned secret must be woven into the artifact."""
    secrets_text = load_file(secrets_path)
    if not secrets_text:
        return GateResult("HG-03", "Earned Secret Presence", False, "earned-secrets.md not found", {})

    # Extract secret identifiers
    secret_markers = [
        ("ICP Pivot", ["ICP pivot", "ICP Pivot", "wrong buyer", "Revenue Manager",
                       "General Manager", "selling motion", "go-to-market problem"]),
        ("RL Optimizer Pattern", ["RL-as-optimizer", "optimizer pattern", "prove equivalence",
                                  "prove parity", "optimizer over", "500 years"]),
        ("Edge Cases Are the Product", ["edge cases are the product", "weird 20%",
                                        "long tail", "human-in-the-loop"]),
        ("Pivot Framework", ["pivot framework", "aspirational state", "model readiness",
                            "smallest provable", "user truth", "smallest proof"]),
    ]

    artifact_text = ""
    for root, _, files in os.walk(artifact_dir):
        for f in files:
            if f.endswith(('.md', '.py', '.txt')):
                artifact_text += load_file(os.path.join(root, f)) + "\n"

    artifact_lower = artifact_text.lower()
    found_secrets = []
    for name, markers in secret_markers:
        hits = sum(1 for m in markers if m.lower() in artifact_lower)
        if hits >= 2:  # Need multiple markers to count as "woven in" vs just mentioned
            found_secrets.append((name, hits))

    passed = len(found_secrets) >= 1
    if passed:
        detail = f"{len(found_secrets)} secret(s) woven: {', '.join(s[0] for s in found_secrets)}"
    else:
        detail = "No earned secrets found with sufficient depth (need ≥2 marker matches per secret)"

    return GateResult("HG-03", "Earned Secret Presence", passed, detail,
                     {"found": found_secrets})


def artifact_hg04_code_executes(artifact_dir: str) -> GateResult:
    """HG-04: Code must execute without errors."""
    main_py = os.path.join(artifact_dir, "src", "main.py")
    if not os.path.exists(main_py):
        return GateResult("HG-04", "Code Executes", True,
                         "N/A — no src/main.py (strategy memo?)", {"na": True})

    try:
        result = subprocess.run(
            ["python3", main_py],
            capture_output=True, text=True, timeout=60,
            cwd=artifact_dir
        )
        passed = result.returncode == 0
        output_lines = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
        detail = f"exit {result.returncode}, {output_lines} lines output"
        if not passed:
            detail += f"\nstderr: {result.stderr[:500]}"
        return GateResult("HG-04", "Code Executes", passed, detail,
                         {"returncode": result.returncode, "output_lines": output_lines})
    except subprocess.TimeoutExpired:
        return GateResult("HG-04", "Code Executes", False, "Timed out after 60s", {})
    except Exception as e:
        return GateResult("HG-04", "Code Executes", False, f"Error: {e}", {})


def artifact_hg05_word_bounds(artifact_dir: str) -> GateResult:
    """HG-05: Files must be within word count bounds."""
    bounds = {
        "README.md": (400, 2000),
        "docs/architecture.md": (300, 1500),
        "memo.md": (2000, 4000),
        "executive-summary.md": (200, 500),
    }

    results = {}
    violations = []

    for filename, (lo, hi) in bounds.items():
        filepath = os.path.join(artifact_dir, filename)
        if os.path.exists(filepath):
            wc = word_count(load_file(filepath))
            results[filename] = wc
            if wc < lo or wc > hi:
                violations.append(f"{filename}: {wc}w (expected {lo}-{hi})")

    if not results:
        return GateResult("HG-05", "Word/Length Bounds", True,
                         "No countable files found", {"files": results})

    passed = len(violations) == 0
    detail = ", ".join(f"{k}: {v}w" for k, v in results.items())
    if violations:
        detail += f" | VIOLATIONS: {'; '.join(violations)}"

    return GateResult("HG-05", "Word/Length Bounds", passed, detail, {"files": results})


def artifact_hg06_ai_slop(artifact_dir: str) -> GateResult:
    """HG-06: Detect AI-generated patterns."""
    artifact_text = ""
    for root, _, files in os.walk(artifact_dir):
        for f in files:
            if f.endswith(('.md', '.py', '.txt')):
                artifact_text += load_file(os.path.join(root, f)) + "\n"

    text_lower = artifact_text.lower()

    # Hedging language
    hedges = [
        "this could potentially", "it's worth noting", "it's important to consider",
        "there are several", "in today's rapidly", "at its core", "fundamentally",
        "in conclusion", "moving forward", "it should be noted",
        "the key takeaway is", "in today's landscape",
    ]
    hedge_count = sum(1 for h in hedges if h in text_lower)

    # "Leveraging" as verb (common AI tell)
    leverage_count = len(re.findall(r'\bleveraging\b', text_lower))
    hedge_count += leverage_count

    # Structural tells
    structural_tells = []

    # Check for uniform bullet counts per section
    sections = re.split(r'^##\s', artifact_text, flags=re.MULTILINE)
    bullet_counts = []
    for s in sections:
        bullets = len(re.findall(r'^[-*]\s', s, re.MULTILINE))
        if bullets > 0:
            bullet_counts.append(bullets)
    if len(bullet_counts) >= 3 and len(set(bullet_counts)) == 1:
        structural_tells.append(f"All sections have exactly {bullet_counts[0]} bullets")

    # Check for "The [Noun] [Noun]" pattern in headers — only flag if excessive (5+)
    fancy_headers = re.findall(r'^#+\s+The\s+[A-Z]\w+\s+[A-Z]\w+', artifact_text, re.MULTILINE)
    if len(fancy_headers) >= 5:
        structural_tells.append(f"{len(fancy_headers)} 'The X Y' headers")

    # Missing signals (want these PRESENT)
    missing_signals_present = 0
    contrarian_markers = ["everyone gets wrong", "counterintuitive", "surprising",
                         "against conventional", "most people think", "commonly believed",
                         "the real issue", "the actual problem", "not what you'd expect"]
    if any(m in text_lower for m in contrarian_markers):
        missing_signals_present += 1

    failure_markers = ["went wrong", "learned the hard way", "mistake", "failed",
                      "didn't work", "broke", "lesson", "pivot", "changed my mind",
                      "I was wrong", "do differently"]
    if any(m in text_lower for m in failure_markers):
        missing_signals_present += 1

    tradeoff_markers = ["trade-off", "tradeoff", "downside", "cost of", "at the expense",
                       "limitation", "drawback", "however", "on the other hand",
                       "the catch", "not without"]
    if any(m in text_lower for m in tradeoff_markers):
        missing_signals_present += 1

    differently_markers = ["do differently", "in hindsight", "looking back",
                          "if I could", "next time", "knowing what I know"]
    if any(m in text_lower for m in differently_markers):
        missing_signals_present += 1

    specific_failure_markers = ["at duetto", "at capital one", "at wayfair", "at jpmc",
                               "at j.p. morgan"]
    has_experience_ref = any(m in text_lower for m in specific_failure_markers)
    if has_experience_ref:
        missing_signals_present += 1

    passed = hedge_count <= 2 and len(structural_tells) == 0 and missing_signals_present >= 2
    detail = f"{hedge_count} hedges, {len(structural_tells)} structural tells, {missing_signals_present}/5 missing signals present"
    if structural_tells:
        detail += f" | Tells: {'; '.join(structural_tells)}"

    return GateResult("HG-06", "AI Slop Detection", passed, detail,
                     {"hedges": hedge_count, "structural": structural_tells,
                      "missing_signals_present": missing_signals_present})


def artifact_hg07_dependencies(artifact_dir: str) -> GateResult:
    """HG-07: Only standard/common libraries allowed."""
    approved = {
        'numpy', 'np', 'gymnasium', 'gym', 'pandas', 'pd', 'matplotlib',
        'plt', 'scipy', 'sklearn', 'json', 'os', 'sys', 'math', 'random',
        'collections', 'dataclasses', 'typing', 'pathlib', 'itertools',
        'functools', 'abc', 'enum', 'datetime', 'time', 're', 'io',
        'csv', 'argparse', 'logging', 'unittest', 'textwrap', 'copy',
        'statistics', 'heapq', 'bisect', 'operator', 'string',
        'seaborn', 'plotly', 'networkx', 'requests', 'httpx',
    }

    src_dir = os.path.join(artifact_dir, "src")
    if not os.path.exists(src_dir):
        return GateResult("HG-07", "Dependency Check", True,
                         "N/A — no src/ directory", {"na": True})

    # Collect local module names (files in src/) to exclude from check
    local_modules = set()
    for f in os.listdir(src_dir):
        if f.endswith('.py') and f != '__init__.py':
            local_modules.add(f[:-3])  # strip .py

    imports = set()
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith('.py'):
                content = load_file(os.path.join(root, f))
                # Match 'import X' and 'from X import ...'
                for match in re.findall(r'^(?:import|from)\s+([\w.]+)', content, re.MULTILINE):
                    top_level = match.split('.')[0]
                    imports.add(top_level)

    unapproved = imports - approved - local_modules
    passed = len(unapproved) == 0
    detail = f"{len(imports)} imports, {len(unapproved)} unapproved"
    if unapproved:
        detail += f": {unapproved}"

    return GateResult("HG-07", "Dependency Check", passed, detail,
                     {"imports": list(imports), "unapproved": list(unapproved)})


# ─────────────────────────────────────────────
# OUTBOUND HARD GATES
# ─────────────────────────────────────────────

def outbound_hg01_word_counts(outbound_path: str) -> GateResult:
    """HG-01: Word count limits per variant."""
    text = load_file(outbound_path)
    sections = extract_sections(text)

    checks = {}
    violations = []

    # Primary email — extract body only (skip subject and signature)
    if "Primary Email" in sections:
        body = sections["Primary Email"]
        # Remove subject line and signature
        body_lines = body.split('\n')
        body_lines = [l for l in body_lines if not l.startswith('**Subject:')
                     and l.strip() != 'Sujoy Guha'
                     and 'linkedin.com' not in l]
        body_text = '\n'.join(body_lines).strip()
        wc = word_count(body_text)
        checks["email"] = f"{wc}w"
        if wc > 200:
            violations.append(f"email: {wc}w (max 200)")

    # LinkedIn connection request
    for key in sections:
        if "Connection Request" in key:
            cc = char_count(sections[key])
            checks["linkedin_req"] = f"{cc}c"
            if cc > 300:
                violations.append(f"linkedin request: {cc}c (max 300)")

    # LinkedIn InMail
    for key in sections:
        if "InMail" in key:
            wc = word_count(sections[key])
            checks["inmail"] = f"{wc}w"
            if wc > 150:
                violations.append(f"inmail: {wc}w (max 150)")

    # Follow-up email
    for key in sections:
        if "Follow-up" in key or "Follow up" in key:
            body = sections[key]
            body_lines = body.split('\n')
            body_lines = [l for l in body_lines if not l.startswith('**Subject:')]
            body_text = '\n'.join(body_lines).strip()
            wc = word_count(body_text)
            checks["followup"] = f"{wc}w"
            if wc > 100:
                violations.append(f"follow-up: {wc}w (max 100)")

    passed = len(violations) == 0
    detail = ", ".join(f"{k}: {v}" for k, v in checks.items())
    if violations:
        detail += f" | VIOLATIONS: {'; '.join(violations)}"

    return GateResult("HG-01", "Word Count Limits", passed, detail, {"checks": checks})


def outbound_hg02_anti_patterns(outbound_path: str) -> GateResult:
    """HG-02: Scan for banned phrases."""
    text = load_file(outbound_path).lower()

    banned = [
        "i'm passionate about",
        "with x years of experience",
        "i believe i'd be a great fit",
        "i believe i would be a great fit",
        "unique combination of",
        "at your convenience",
        "i'm excited to apply",
        "i love what you're building",
        "don't want to take too much of your time",
        "i hope this email finds you well",
        "just following up",
        "bumping this to the top",
        "i'm reaching out because",
        "i'd love the opportunity",
    ]

    # Also check for credential parade pattern: "As a [title] with [N] years"
    credential_pattern = r"as a \w+ (?:manager|director|lead|engineer|pm) with \d+ years"

    found = []
    for phrase in banned:
        if phrase in text:
            found.append(phrase)

    if re.search(credential_pattern, text):
        found.append("[credential parade pattern]")

    passed = len(found) == 0
    detail = f"{len(found)} banned phrases found"
    if found:
        detail += f": {found}"

    return GateResult("HG-02", "Anti-Pattern Scan", passed, detail, {"found": found})


def outbound_hg03_fact_set(outbound_path: str, fact_set_path: str) -> GateResult:
    """HG-03: Metrics must trace to fact-set.md."""
    fact_set = load_file(fact_set_path)
    text = load_file(outbound_path)

    metrics = extract_metrics(text)
    orphans = []
    traced = []

    for m in metrics:
        search_term = m.rstrip('+').rstrip('%').rstrip('x').rstrip('X')
        if search_term in fact_set or m in fact_set:
            traced.append(m)
        elif search_term.replace(',', '') in fact_set.replace(',', ''):
            traced.append(m)
        else:
            orphans.append(m)

    passed = len(orphans) == 0
    detail = f"{len(traced)}/{len(metrics)} metrics traced"
    if orphans:
        detail += f"; orphans: {orphans}"

    return GateResult("HG-03", "Fact-Set Traceability", passed, detail,
                     {"traced": traced, "orphans": orphans})


def outbound_hg05_subject_line(outbound_path: str) -> GateResult:
    """HG-05: Subject line checks."""
    text = load_file(outbound_path)

    # Find subject line
    subject_match = re.search(r'\*\*Subject:\*\*\s*(.+)', text)
    if not subject_match:
        return GateResult("HG-05", "Subject Line Check", False, "No subject line found", {})

    subject = subject_match.group(1).strip()

    violations = []
    if len(subject) > 60:
        violations.append(f"too long: {len(subject)} chars (max 60)")

    blacklist = ["application for", "interested in", "job", "resume", "opportunity"]
    for word in blacklist:
        if word in subject.lower():
            violations.append(f"contains blacklisted word: '{word}'")

    passed = len(violations) == 0
    detail = f'"{subject}" ({len(subject)} chars)'
    if violations:
        detail += f" | {'; '.join(violations)}"

    return GateResult("HG-05", "Subject Line Check", passed, detail,
                     {"subject": subject, "length": len(subject)})


def outbound_hg06_ai_slop(outbound_path: str) -> GateResult:
    """HG-06: AI slop detection for outbound."""
    text = load_file(outbound_path).lower()

    # Hedging (zero tolerance for short-form — these are dead giveaways in cold email)
    hedges = [
        "it's worth noting", "there are several reasons",
        "at its core", "in today's landscape",
        "moving forward", "it should be noted",
    ]
    hedge_hits = [h for h in hedges if h in text]

    # Credential parade: first paragraph mentions degree/title/company
    sections = extract_sections(load_file(outbound_path))
    credential_flags = []
    if "Primary Email" in sections:
        email = sections["Primary Email"]
        # Get first paragraph (after subject)
        paras = [p.strip() for p in email.split('\n\n') if p.strip()
                and not p.strip().startswith('**Subject:')]
        if paras:
            first_para = paras[0].lower()
            # Check for degree mentions
            if any(d in first_para for d in ['bachelor', 'master', 'phd', 'mba',
                                             'uc berkeley', 'stanford']):
                credential_flags.append("degree in first paragraph")
            # Check for title mentions (Sujoy's titles)
            if any(t in first_para for t in ['senior manager', 'product manager',
                                             'technical product manager']):
                credential_flags.append("title in first paragraph")

    # Multiple metric listing
    metric_in_bridge = 0
    if "Primary Email" in sections:
        email_lower = sections["Primary Email"].lower()
        bridge_metrics = extract_metrics(sections["Primary Email"])
        if len(bridge_metrics) > 2:
            credential_flags.append(f"too many metrics ({len(bridge_metrics)})")

    # Em-dash overuse — check per variant, not total (em-dashes are part of Sujoy's style)
    structural_flags = []
    if "Primary Email" in sections:
        email_dashes = sections["Primary Email"].count('—')
        if email_dashes > 4:  # More than 4 in a single email variant is excessive
            structural_flags.append(f"em-dash overuse in email ({email_dashes})")

    # Semicolons in email
    if "Primary Email" in sections:
        semicolons = sections["Primary Email"].count(';')
        if semicolons > 0:
            structural_flags.append(f"semicolons in email ({semicolons})")

    passed = len(hedge_hits) == 0 and len(structural_flags) == 0 and len(credential_flags) == 0
    detail = f"{len(hedge_hits)} hedges, {len(structural_flags)} structural, {len(credential_flags)} credential"
    if hedge_hits:
        detail += f" | hedges: {hedge_hits}"
    if structural_flags:
        detail += f" | structural: {structural_flags}"
    if credential_flags:
        detail += f" | credential: {credential_flags}"

    return GateResult("HG-06", "AI Slop Detection", passed, detail, {})


def outbound_hg07_variant_completeness(outbound_path: str) -> GateResult:
    """HG-07: All 5 variants must be present."""
    text = load_file(outbound_path)

    required = {
        "Primary Email": False,
        "LinkedIn Connection Request": False,
        "LinkedIn InMail": False,
        "Follow-up Email": False,
        "Warm Intro": False,
    }

    text_lower = text.lower()
    for key in required:
        if key.lower() in text_lower:
            required[key] = True

    missing = [k for k, v in required.items() if not v]
    found_count = sum(1 for v in required.values() if v)
    passed = len(missing) == 0
    detail = f"{found_count}/5 variants present"
    if missing:
        detail += f" | missing: {missing}"

    return GateResult("HG-07", "Variant Completeness", passed, detail,
                     {"found": found_count, "missing": missing})


# ─────────────────────────────────────────────
# AI DETECTION (GPTZero-style) + WRITING STYLE
# ─────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Split text into sentences (simple heuristic)."""
    # Remove markdown headers and code blocks
    clean = re.sub(r'^#+\s.*$', '', text, flags=re.MULTILINE)
    clean = re.sub(r'```[\s\S]*?```', '', clean)
    clean = re.sub(r'`[^`]+`', 'CODE', clean)
    clean = re.sub(r'\|[^\n]+\|', '', clean)  # Remove table rows

    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z"])', clean)
    return [s.strip() for s in sentences if len(s.strip().split()) >= 3]


def _burstiness(sentences: list[str]) -> float:
    """Standard deviation of sentence lengths (words per sentence)."""
    if len(sentences) < 3:
        return 10.0  # Not enough data, assume human
    lengths = [len(s.split()) for s in sentences]
    mean = sum(lengths) / len(lengths)
    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
    return variance ** 0.5


def _type_token_ratio(text: str, window: int = 100) -> float:
    """Average type-token ratio in sliding windows."""
    words = re.findall(r'\b[a-z]+\b', text.lower())
    if len(words) < window:
        if not words:
            return 1.0
        return len(set(words)) / len(words)

    ratios = []
    for i in range(0, len(words) - window + 1, window // 2):
        w = words[i:i + window]
        ratios.append(len(set(w)) / len(w))
    return sum(ratios) / len(ratios) if ratios else 1.0


def _repeated_ngrams(text: str, n: int = 3, threshold: int = 3) -> list[tuple[str, int]]:
    """Find repeated n-grams above threshold (excluding domain terms)."""
    words = re.findall(r'\b[a-z]+\b', text.lower())
    ngrams: dict[str, int] = {}
    for i in range(len(words) - n + 1):
        gram = ' '.join(words[i:i + n])
        ngrams[gram] = ngrams.get(gram, 0) + 1

    # Filter out common domain terms
    domain_exceptions = {
        'the school bus', 'school bus recall', 'confidence threshold',
        'fleet response', 'traffic light', 'dead traffic light',
        'rl in production', 'pricing acceptance', 'earned secret',
    }

    flagged = []
    for gram, count in ngrams.items():
        if count > threshold and gram not in domain_exceptions:
            flagged.append((gram, count))
    return sorted(flagged, key=lambda x: -x[1])


def _sentence_opener_variety(sentences: list[str]) -> dict[str, float]:
    """Check diversity of sentence openers."""
    if not sentences:
        return {"max_pct": 0.0, "top_word": ""}
    openers = [s.split()[0].lower() for s in sentences if s.split()]
    if not openers:
        return {"max_pct": 0.0, "top_word": ""}
    counts: dict[str, int] = {}
    for w in openers:
        counts[w] = counts.get(w, 0) + 1
    top_word = max(counts, key=counts.get)  # type: ignore
    max_pct = counts[top_word] / len(openers)
    return {"max_pct": max_pct, "top_word": top_word}


def ai_detection_check(text: str, short_form: bool = False) -> GateResult:
    """HG-08/10: AI detection resistance check (GPTZero-style signals)."""
    gate_id = "HG-10" if short_form else "HG-08"
    sentences = _split_sentences(text)

    flags = []
    data = {}

    # 1. Burstiness
    burst = _burstiness(sentences)
    burst_threshold = 3.0 if short_form else 4.0
    data["burstiness"] = round(burst, 2)
    if burst < burst_threshold:
        flags.append(f"low burstiness ({burst:.1f} < {burst_threshold})")

    # 2. Vocabulary diversity (TTR)
    ttr = _type_token_ratio(text)
    data["ttr"] = round(ttr, 3)
    if ttr < 0.55:
        flags.append(f"low vocabulary diversity (TTR {ttr:.3f} < 0.55)")

    # 3. Repeated n-grams
    repeated = _repeated_ngrams(text)
    data["repeated_ngrams"] = repeated[:5]
    if repeated:
        flags.append(f"{len(repeated)} repeated 3-grams: {repeated[:3]}")

    # 4. Sentence opener variety
    openers = _sentence_opener_variety(sentences)
    data["opener_variety"] = openers
    opener_threshold = 0.25 if short_form else 0.30
    if openers["max_pct"] > opener_threshold:
        flags.append(f"{openers['max_pct']:.0%} of sentences start with '{openers['top_word']}'")

    # Short-form extra: transition predictability
    if short_form:
        bad_transitions = ["additionally", "furthermore", "moreover", "in addition"]
        found_transitions = [t for t in bad_transitions if t in text.lower()]
        if found_transitions:
            flags.append(f"generic transitions: {found_transitions}")
            data["bad_transitions"] = found_transitions

    passed = len(flags) <= 1
    detail = f"{len(flags)} flags" + (f": {'; '.join(flags)}" if flags else " — looks human")

    return GateResult(gate_id, "AI Detection Resistance", passed, detail, data)


def writing_style_check(text: str, short_form: bool = False) -> GateResult:
    """HG-09/11: Writing style match for Sujoy's voice."""
    gate_id = "HG-11" if short_form else "HG-09"
    sentences = _split_sentences(text)
    text_lower = text.lower()

    style_markers = 0
    anti_markers = 0
    marker_details = []
    anti_details = []

    # === Style markers (want present) ===

    # 1. Sentence length variety (short + long)
    if sentences:
        lengths = [len(s.split()) for s in sentences]
        has_short = any(l <= 8 for l in lengths)
        has_long = any(l >= 20 for l in lengths)
        if has_short and has_long:
            style_markers += 1
            marker_details.append("sentence length variety")

    # 2. Em-dash usage
    if '—' in text or ' — ' in text:
        style_markers += 1
        marker_details.append("em-dash usage")

    # 3. Direct assertions (not hedged)
    direct_patterns = [r'\bThis is\b', r'\bThe .+ is\b', r'\bI shipped\b',
                      r'\bI built\b', r'\bI solved\b', r'\bThe real\b',
                      r'\bThe problem\b', r"\bThe hardest\b", r"\bisn't\b"]
    direct_count = sum(1 for p in direct_patterns if re.search(p, text))
    if direct_count >= 2:
        style_markers += 1
        marker_details.append("direct assertions")

    # 4. Concrete before abstract (starts with example/fact)
    if sentences and re.match(r'^(?:At |In |The |When |After )', sentences[0]):
        style_markers += 1
        marker_details.append("concrete-first")

    # 5. Active voice dominant
    passive_patterns = [r'\bwas \w+ed\b', r'\bwere \w+ed\b', r'\bbeen \w+ed\b',
                       r'\bis \w+ed by\b', r'\bare \w+ed by\b']
    passive_count = sum(len(re.findall(p, text)) for p in passive_patterns)
    active_ratio = 1 - (passive_count / max(len(sentences), 1))
    if active_ratio > 0.75:
        style_markers += 1
        marker_details.append(f"active voice ({active_ratio:.0%})")

    # 6. First person (natural usage)
    first_person = len(re.findall(r"\bI(?:'ve|'d|'m)?\s+\w+", text))
    if first_person >= 2:
        style_markers += 1
        marker_details.append("natural first-person")

    # === Anti-style markers (want absent) ===

    # 1. Passive voice dominance
    if active_ratio < 0.60:
        anti_markers += 1
        anti_details.append(f"passive voice dominant ({active_ratio:.0%} active)")

    # 2. Academic hedging
    academic = ["one might argue", "it is suggested", "it could be argued",
                "it is important to note", "it is worth mentioning",
                "it remains to be seen"]
    if any(h in text_lower for h in academic):
        anti_markers += 1
        anti_details.append("academic hedging")

    # 3. Corporate buzzwords
    corporate = ["synergize", "leverage", "utilize", "holistic", "paradigm",
                "best-in-class", "world-class", "cutting-edge", "state-of-the-art",
                "thought leader", "value-add"]
    corp_found = [c for c in corporate if c in text_lower]
    if corp_found:
        anti_markers += 1
        anti_details.append(f"corporate buzzwords: {corp_found}")

    # 4. Blogger transitions
    blogger = ["so, here's the thing", "let me tell you", "here's why this matters",
              "the bottom line is", "long story short"]
    if any(b in text_lower for b in blogger):
        anti_markers += 1
        anti_details.append("blogger transitions")

    # Short-form extras
    if short_form:
        # Check for "I am a..." opener
        if re.search(r'\bi am a\b', text_lower):
            anti_markers += 1
            anti_details.append("'I am a...' opener")

        # Check for sentences > 40 words in email body
        long_sentences = [s for s in sentences if len(s.split()) > 40]
        if long_sentences:
            anti_markers += 1
            anti_details.append(f"{len(long_sentences)} sentences > 40 words")

        # Passive CTA
        passive_ctas = ["would be appreciated", "would be grateful",
                       "at your earliest convenience", "if you could find the time"]
        if any(c in text_lower for c in passive_ctas):
            anti_markers += 1
            anti_details.append("passive CTA")

    # Scoring
    if short_form:
        passed = style_markers >= 3 and anti_markers == 0
    else:
        passed = style_markers >= 4 and anti_markers <= 1

    detail = f"{style_markers} style markers ({', '.join(marker_details)}), {anti_markers} anti-markers"
    if anti_details:
        detail += f" ({', '.join(anti_details)})"

    return GateResult(gate_id, "Writing Style Match", passed, detail,
                     {"style_markers": style_markers, "anti_markers": anti_markers,
                      "markers": marker_details, "anti": anti_details})


# ─────────────────────────────────────────────
# Run all gates
# ─────────────────────────────────────────────

def run_artifact_gates(artifact_dir: str, fact_set_path: str, secrets_path: str) -> list[GateResult]:
    """Run all artifact hard gates."""
    # Collect prose for AI detection + style checks
    prose_text = ""
    for root, _, files in os.walk(artifact_dir):
        for f in files:
            if f.endswith('.md'):
                prose_text += load_file(os.path.join(root, f)) + "\n"

    return [
        artifact_hg01_fact_set_traceability(artifact_dir, fact_set_path),
        artifact_hg03_earned_secret_presence(artifact_dir, secrets_path),
        artifact_hg04_code_executes(artifact_dir),
        artifact_hg05_word_bounds(artifact_dir),
        artifact_hg06_ai_slop(artifact_dir),
        artifact_hg07_dependencies(artifact_dir),
        ai_detection_check(prose_text, short_form=False),
        writing_style_check(prose_text, short_form=False),
    ]


def run_outbound_gates(outbound_path: str, fact_set_path: str) -> list[GateResult]:
    """Run all outbound hard gates."""
    text = load_file(outbound_path)
    return [
        outbound_hg01_word_counts(outbound_path),
        outbound_hg02_anti_patterns(outbound_path),
        outbound_hg03_fact_set(outbound_path, fact_set_path),
        outbound_hg05_subject_line(outbound_path),
        outbound_hg06_ai_slop(outbound_path),
        outbound_hg07_variant_completeness(outbound_path),
        ai_detection_check(text, short_form=True),
        writing_style_check(text, short_form=True),
    ]
