#!/usr/bin/env python3
"""
Cover Letter QA Validator — anti-template checks, AI-tell detection, variety check.

HARD FAILS:
  1. Pages != 1
  2. Word count outside 130-200
  3. Any paragraph > 4 sentences
  4. Banned phrase hit (AI tell / cliche from anti-patterns.md)
  5. Generic opener ("I am", "I'm writing", "I'm excited", "As a...")
  6. POV paragraph has zero company-specific nouns
  7. Metric cited that is not in fact-set.md
  8. Variety collision: opener or POV n-gram matches letter in last 30 days

WARNINGS:
  - "I" count > 8
  - Sentence-length variance too low
  - Adverb density > 5%
  - Em-dash density > 3
  - POV paragraph missing hedged-claim verb
  - POV paragraph lacks opinion verb

USAGE:
  python3 validate_cover_letter.py <pdf_path> --company <CompanyName> [--detail]
  python3 validate_cover_letter.py <pdf_path> --company <CompanyName> --commit  # save to history on pass
"""

import argparse
import json
import re
import subprocess
import sys
import hashlib
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

# =============================================================================
# PATHS
# =============================================================================
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
ANTI_PATTERNS_FILE = PROJECT_ROOT / "references" / "anti-patterns.md"
FACT_SET_FILE = PROJECT_ROOT / "references" / "fact-set.md"
HISTORY_FILE = PROJECT_ROOT / "history" / "letter-history.json"

# =============================================================================
# LOAD BANNED PHRASES FROM anti-patterns.md
# =============================================================================
def load_banned_phrases():
    """Parse anti-patterns.md. Hard-fail bullets are in sections marked 'hard fail'.
    Soft-warning bullets are in sections marked 'flagged, not failed'."""
    if not ANTI_PATTERNS_FILE.exists():
        return [], []
    text = ANTI_PATTERNS_FILE.read_text()
    hard = []
    soft = []
    current = None
    for line in text.split("\n"):
        lower = line.lower().strip()
        if lower.startswith("##"):
            if "hard fail" in lower:
                current = hard
            elif "flagged, not failed" in lower or "soft warning" in lower:
                current = soft
            else:
                current = None
            continue
        if current is None:
            continue
        m = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if m:
            phrase = m.group(1).strip()
            if phrase.startswith("Sentences starting with") or phrase.startswith("Paragraph"):
                continue  # handled by structural checks
            if phrase.startswith("Lists of") or phrase.startswith("Em-dashes"):
                continue
            if phrase.startswith("First-person") or phrase.startswith("Any word"):
                continue
            if phrase.startswith("Adverb") or phrase.startswith("Starting"):
                continue
            # Strip trailing parenthetical notes
            phrase = re.sub(r"\s*—.*$", "", phrase).strip()
            if phrase:
                current.append(phrase)
    return hard, soft


# =============================================================================
# LOAD FACT-SET NUMBERS
# =============================================================================
def load_fact_numbers():
    """Extract all metrics/numbers from fact-set.md so we can cross-check."""
    if not FACT_SET_FILE.exists():
        return set()
    text = FACT_SET_FILE.read_text()
    # Grab percentages, dollar amounts, counts with K/M/x/+ suffixes
    numbers = set()
    for m in re.finditer(r"(\$?\d+(?:\.\d+)?[KMkm]?\+?|\d+(?:\.\d+)?\s*%|\d+x)", text):
        numbers.add(m.group(0).lower())
    return numbers


# =============================================================================
# PDF → TEXT
# =============================================================================
def get_page_count(pdf_path):
    r = subprocess.run(["pdfinfo", str(pdf_path)], capture_output=True, text=True)
    for line in r.stdout.split("\n"):
        if line.startswith("Pages:"):
            return int(line.split(":")[1].strip())
    return 0


def get_text(pdf_path):
    r = subprocess.run(["pdftotext", "-layout", str(pdf_path), "-"],
                       capture_output=True, text=True)
    return r.stdout


# =============================================================================
# TEXT PARSING
# =============================================================================
def split_paragraphs(text):
    """Split letter text into paragraphs: Dear..., hook, role_fit, pov, close, sign-off."""
    # Collapse >1 newline into paragraph break
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    # Flatten internal newlines within a paragraph
    paras = [re.sub(r"\s+", " ", p) for p in paras]
    return paras


def identify_beats(paras):
    """Identify salutation, hook, role_fit, pov, close, signoff."""
    beats = {"salutation": None, "hook": None, "role_fit": None,
             "pov": None, "close": None, "signoff": None}
    if not paras:
        return beats
    # Salutation
    if re.match(r"^Dear\b", paras[0], re.IGNORECASE):
        beats["salutation"] = paras[0]
        paras = paras[1:]
    # Signoff = last short paragraph (<=3 words)
    if paras and len(paras[-1].split()) <= 3:
        beats["signoff"] = paras[-1]
        paras = paras[:-1]
    # Close = second-to-last if short
    if paras and len(paras[-1].split()) <= 15:
        beats["close"] = paras[-1]
        paras = paras[:-1]
    # Remaining: hook, role_fit, pov in order
    if len(paras) >= 1:
        beats["hook"] = paras[0]
    if len(paras) >= 2:
        beats["role_fit"] = paras[1]
    if len(paras) >= 3:
        beats["pov"] = paras[2]
    if len(paras) > 3:
        # Extra paragraphs: merge into pov for counting but flag
        beats["pov"] = " ".join(paras[2:])
        beats["_extra_paras"] = len(paras) - 3
    return beats


def count_sentences(para):
    if not para:
        return 0
    return len(re.findall(r"[.!?]+(?:\s|$)", para))


def count_words(text):
    return len(re.findall(r"\b\w+\b", text))


# =============================================================================
# CHECKS
# =============================================================================
def check_banned_phrases(body, hard_phrases, soft_phrases):
    hits_hard, hits_soft = [], []
    low = body.lower()
    for p in hard_phrases:
        # Word-boundary regex on lowered phrase
        pat = r"\b" + re.escape(p.lower()) + r"\b"
        if re.search(pat, low):
            hits_hard.append(p)
    for p in soft_phrases:
        pat = r"\b" + re.escape(p.lower()) + r"\b"
        if re.search(pat, low):
            hits_soft.append(p)
    return hits_hard, hits_soft


def check_generic_opener(hook):
    if not hook:
        return False, None
    first = hook.strip()
    patterns = [
        (r"^I am\b", "'I am'"),
        (r"^I'm writing\b", "'I'm writing'"),
        (r"^I am writing\b", "'I am writing'"),
        (r"^I'm excited\b", "'I'm excited'"),
        (r"^I am excited\b", "'I am excited'"),
        (r"^As a\b", "'As a...'"),
        (r"^With \d+ years\b", "'With N years of experience'"),
    ]
    for pat, label in patterns:
        if re.match(pat, first, re.IGNORECASE):
            return True, label
    # First five words should not contain "I"
    first_five = first.split()[:5]
    if any(w.strip(",.") == "I" for w in first_five):
        return True, "first 5 words contain 'I'"
    return False, None


def check_company_nouns(pov, company):
    """POV must mention at least one company-specific noun.
    We accept: company name, or a proper noun that's not in a stoplist."""
    if not pov:
        return False, []
    # Direct company-name mention
    nouns_found = []
    if re.search(rf"\b{re.escape(company)}\b", pov, re.IGNORECASE):
        nouns_found.append(company)
    # Proper nouns (capitalized words not at sentence start)
    stopwords = {"I", "I'd", "I'm", "I've", "The", "A", "An", "And", "But",
                 "If", "When", "Where", "Why", "How", "What", "Who"}
    for m in re.finditer(r"(?<=[.!?]\s)([A-Z][a-zA-Z]+)|(?<!^)(?<=[ \-])([A-Z][a-zA-Z]{2,})", pov):
        w = m.group(0)
        if w not in stopwords and w.lower() != company.lower():
            nouns_found.append(w)
    return len(nouns_found) > 0, nouns_found[:5]


def check_hedged_claims(pov):
    """POV should have hedged-claim register, not declarative."""
    if not pov:
        return False
    markers = [
        r"\bI'd\b", r"\bI would\b", r"\bI think\b", r"\bI'd push\b",
        r"\bthe bet\b", r"\bthe risk\b", r"\bwhere I'd\b",
        r"\bIf I were\b", r"\bI'd argue\b", r"\bI'd be watching\b",
        r"\bI'd lean\b", r"\bThe move\b", r"\bmy read\b",
    ]
    return any(re.search(m, pov, re.IGNORECASE) for m in markers)


def check_opinion_verb(pov):
    """POV should contain at least one verb that marks opinion, not description."""
    if not pov:
        return False
    verbs = [
        r"\bpush\b", r"\bkill\b", r"\bdouble down\b", r"\bbet\b",
        r"\blean\b", r"\bargue\b", r"\bwatch\b", r"\bwager\b",
        r"\bshould\b", r"\bmatters\b", r"\bkills\b", r"\bchanges\b",
    ]
    return any(re.search(m, pov, re.IGNORECASE) for m in verbs)


def check_metric_provenance(body, fact_numbers):
    """Any metric in the letter must appear in fact-set.md."""
    metrics = re.findall(r"(\$?\d+(?:\.\d+)?[KMkm]?\+?|\d+(?:\.\d+)?\s*%|\d+x)", body)
    unverified = []
    for m in metrics:
        if m.lower() not in fact_numbers:
            unverified.append(m)
    return unverified


def i_count(body):
    return len(re.findall(r"\bI\b", body))


def em_dash_count(body):
    return body.count("—")


def adverb_density(body):
    words = re.findall(r"\b[A-Za-z]+\b", body)
    if not words:
        return 0.0
    # -ly adverbs (crude but effective)
    adverbs = [w for w in words if w.lower().endswith("ly") and len(w) > 3
               and w.lower() not in {"only", "family", "early", "italy", "ugly", "july"}]
    return len(adverbs) / len(words) * 100


def sentence_length_variance(body):
    """Coefficient of variation of sentence lengths. Low = monotone rhythm."""
    sentences = re.split(r"[.!?]+\s+", body.strip())
    lengths = [len(s.split()) for s in sentences if len(s.split()) > 2]
    if len(lengths) < 2:
        return 1.0
    mean = sum(lengths) / len(lengths)
    if mean == 0:
        return 0.0
    var = sum((x - mean) ** 2 for x in lengths) / len(lengths)
    return (var ** 0.5) / mean


# =============================================================================
# VARIETY / HISTORY
# =============================================================================
def ngram_fingerprint(text, n=4):
    """Set of lowercased n-grams from text."""
    words = re.findall(r"\b\w+\b", text.lower())
    return {" ".join(words[i:i+n]) for i in range(len(words) - n + 1)}


def load_history():
    if not HISTORY_FILE.exists():
        return []
    return json.loads(HISTORY_FILE.read_text())


def save_to_history(entry):
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    hist = load_history()
    hist.append(entry)
    HISTORY_FILE.write_text(json.dumps(hist, indent=2))


def check_variety(beats, window_days=30):
    """Compare hook & POV 4-gram fingerprints against letters sent in last N days."""
    history = load_history()
    if not history:
        return []
    cutoff = datetime.now() - timedelta(days=window_days)
    recent = [h for h in history
              if datetime.fromisoformat(h["timestamp"]) > cutoff]

    hits = []
    current_hook_ng = ngram_fingerprint(beats.get("hook") or "", n=4)
    current_pov_ng = ngram_fingerprint(beats.get("pov") or "", n=4)

    for past in recent:
        past_hook_ng = set(past.get("hook_ngrams", []))
        past_pov_ng = set(past.get("pov_ngrams", []))
        hook_overlap = current_hook_ng & past_hook_ng
        pov_overlap = current_pov_ng & past_pov_ng
        if len(hook_overlap) >= 2:
            hits.append(f"HOOK echoes letter to {past['company']} ({past['timestamp'][:10]}): "
                       f"shared phrases: {list(hook_overlap)[:2]}")
        if len(pov_overlap) >= 3:
            hits.append(f"POV echoes letter to {past['company']} ({past['timestamp'][:10]}): "
                       f"shared phrases: {list(pov_overlap)[:2]}")
    return hits


# =============================================================================
# MAIN VALIDATE
# =============================================================================
def validate(pdf_path, company, commit=False):
    results = {
        "file": str(pdf_path),
        "company": company,
        "pass": True,
        "issues": [],
        "warnings": [],
        "checks": [],
        "beats": {},
    }

    # Page count
    pages = get_page_count(pdf_path)
    ok = pages == 1
    results["checks"].append(f"{'OK' if ok else 'FAIL'} Pages: {pages} (need 1)")
    if not ok:
        results["pass"] = False
        results["issues"].append(f"Pages != 1 ({pages})")

    # Extract text
    text = get_text(pdf_path)
    paras = split_paragraphs(text)
    beats = identify_beats(paras)
    results["beats"] = beats

    body_paras = [beats.get(k) for k in ("hook", "role_fit", "pov")
                  if beats.get(k)]
    body = " ".join(body_paras)
    full_body_with_close = " ".join(body_paras + [beats.get("close") or ""])

    # Word count (body only — exclude salutation/signoff)
    wc = count_words(full_body_with_close)
    ok = 130 <= wc <= 200
    results["checks"].append(f"{'OK' if ok else 'FAIL'} Word count: {wc} (target 130-200)")
    if not ok:
        results["pass"] = False
        results["issues"].append(f"Word count {wc} outside 130-200")

    # Paragraph sentence count
    for beat_name in ("hook", "role_fit", "pov"):
        beat = beats.get(beat_name)
        if not beat:
            continue
        sc = count_sentences(beat)
        if sc > 4:
            results["pass"] = False
            results["issues"].append(f"{beat_name} has {sc} sentences (max 4)")
    if beats.get("_extra_paras"):
        results["pass"] = False
        results["issues"].append(f"Found {beats['_extra_paras']} extra paragraphs beyond the 3 beats")

    # Banned phrases
    hard_phrases, soft_phrases = load_banned_phrases()
    hard_hits, soft_hits = check_banned_phrases(body, hard_phrases, soft_phrases)
    ok = len(hard_hits) == 0
    results["checks"].append(f"{'OK' if ok else 'FAIL'} Banned phrases (hard): {len(hard_hits)}")
    if hard_hits:
        results["pass"] = False
        for p in hard_hits:
            results["issues"].append(f"BANNED: '{p}'")
    if soft_hits:
        for p in soft_hits:
            results["warnings"].append(f"SOFT BANNED: '{p}'")

    # Generic opener
    generic, label = check_generic_opener(beats.get("hook"))
    ok = not generic
    results["checks"].append(f"{'OK' if ok else 'FAIL'} Hook opener not generic")
    if generic:
        results["pass"] = False
        results["issues"].append(f"Generic opener: {label}")

    # Company nouns in POV
    has_nouns, nouns = check_company_nouns(beats.get("pov") or "", company)
    ok = has_nouns
    results["checks"].append(f"{'OK' if ok else 'FAIL'} POV has company-specific nouns: {nouns}")
    if not ok:
        results["pass"] = False
        results["issues"].append("POV paragraph has zero company-specific nouns")

    # Metric provenance
    fact_numbers = load_fact_numbers()
    unverified = check_metric_provenance(body, fact_numbers)
    ok = len(unverified) == 0
    results["checks"].append(f"{'OK' if ok else 'FAIL'} Metric provenance: {len(unverified)} unverified")
    if unverified:
        results["pass"] = False
        for m in unverified:
            results["issues"].append(f"Metric '{m}' not in fact-set.md")

    # Variety
    variety_hits = check_variety(beats)
    ok = len(variety_hits) == 0
    results["checks"].append(f"{'OK' if ok else 'FAIL'} Variety (vs last 30 days): {len(variety_hits)} collisions")
    for h in variety_hits:
        results["pass"] = False
        results["issues"].append(h)

    # Warnings
    ic = i_count(body)
    if ic > 8:
        results["warnings"].append(f"'I' count: {ic} (target <= 8)")
    edc = em_dash_count(body)
    if edc > 3:
        results["warnings"].append(f"Em-dash count: {edc} (target <= 3)")
    ad = adverb_density(body)
    if ad > 5.0:
        results["warnings"].append(f"Adverb density: {ad:.1f}% (target <= 5%)")
    slv = sentence_length_variance(body)
    if slv < 0.35:
        results["warnings"].append(f"Sentence-length variance low ({slv:.2f}) — rhythm too even")
    if beats.get("pov"):
        if not check_hedged_claims(beats["pov"]):
            results["warnings"].append("POV missing hedged-claim verb ('I'd', 'the bet', 'the risk')")
        if not check_opinion_verb(beats["pov"]):
            results["warnings"].append("POV lacks opinion verb — reads as description")

    # Commit to history
    if commit and results["pass"]:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "company": company,
            "pdf": str(pdf_path),
            "hook_ngrams": list(ngram_fingerprint(beats.get("hook") or "", n=4)),
            "pov_ngrams": list(ngram_fingerprint(beats.get("pov") or "", n=4)),
            "word_count": wc,
        }
        save_to_history(entry)
        results["checks"].append(f"OK Saved to history ({HISTORY_FILE.name})")

    return results


def print_results(r, detail=False):
    print(f"\n{'=' * 70}")
    print(f"COVER LETTER QA: {Path(r['file']).name}  →  {r['company']}")
    print(f"{'=' * 70}")
    for c in r["checks"]:
        print(f"  {c}")
    if detail:
        print(f"\n  {'-' * 60}")
        print("  BEATS")
        print(f"  {'-' * 60}")
        for k in ("salutation", "hook", "role_fit", "pov", "close", "signoff"):
            v = r["beats"].get(k)
            if v:
                preview = v if len(v) < 120 else v[:117] + "..."
                print(f"  [{k}] {preview}")
    if r["issues"]:
        print(f"\n  HARD FAILS ({len(r['issues'])}):")
        for i in r["issues"]:
            print(f"    - {i}")
    if r["warnings"]:
        print(f"\n  WARNINGS ({len(r['warnings'])}):")
        for w in r["warnings"]:
            print(f"    - {w}")
    status = "PASS" if r["pass"] else "FAIL"
    print(f"\n  {'=' * 50}")
    print(f"  RESULT: {status}")
    print(f"  {'=' * 50}\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--company", required=True)
    ap.add_argument("--detail", action="store_true")
    ap.add_argument("--commit", action="store_true",
                    help="Save to history on pass")
    args = ap.parse_args()

    results = validate(args.pdf, args.company, commit=args.commit)
    print_results(results, detail=args.detail)
    sys.exit(0 if results["pass"] else 1)


if __name__ == "__main__":
    main()
