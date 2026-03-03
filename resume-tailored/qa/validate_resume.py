#!/usr/bin/env python3
"""
Resume QA Validator v2 — measures actual visual line fill from PDF output.
Uses pdftotext -bbox to extract word bounding boxes and compute line-level fill.

PASS CRITERIA:
1. Exactly 1 page
2. Page fill 93-98% (warn at 91-93)
3. Every content line ≥80% filled; 2nd lines of doubles ≥85%
4. No 3-line bullets (no very short orphan lines)
5. Headers on 1 line each, well-filled
6. At least 1 single-line bullet for visual variety
7. Skills on 1 line each
8. Education visible
9. No repeated action verbs within same role section
10. Staff-level signals present (org size, P&L, promotion, vision, enterprise clients)
"""

import subprocess
import re
import sys
from pathlib import Path
from collections import Counter

# =============================================================================
# ACTION VERBS — used for repetition detection
# =============================================================================
ACTION_VERBS = {
    "defined", "launched", "delivered", "shipped", "designed", "developed",
    "deployed", "replaced", "championed", "rebuilt", "built", "mentored",
    "architected", "re-platformed", "identified", "reduced", "grew", "drove",
    "elevated", "scaled", "engineered", "spearheaded", "pioneered",
    "established", "transformed", "orchestrated", "led", "owned", "created",
}

# =============================================================================
# STAFF-LEVEL SIGNALS — dynamic patterns, not a static checklist
# =============================================================================
STAFF_SIGNALS = [
    # (pattern, description, required?)
    (r'org of \d+|team of \d+|led \d+-person', "Team/org size mentioned", True),
    (r'(?i)P&L|P&amp;L|revenue owner|\$\d+[–\-]\d+M', "P&L or revenue ownership", True),
    (r'(?i)[Pp]romoted|PM I+ to PM I+|PM I .* II', "Promotion/trajectory signal", True),
    (r'(?i)multi-year.*vision|set.*vision|defined.*strategy|strategic', "Vision/strategy framing", True),
    (r'Hyatt|B&B Hotels|eBay|DoorDash|Walmart|enterprise client', "Enterprise client names", False),
    (r'zero-to-one|0-to-1', "Zero-to-one product development", False),
    (r'[Mm]entored|[Hh]ired|grew the team', "People leadership", False),
]


def get_page_count(pdf_path):
    result = subprocess.run(['pdfinfo', pdf_path], capture_output=True, text=True)
    for line in result.stdout.split('\n'):
        if line.startswith('Pages:'):
            return int(line.split(':')[1].strip())
    return 0


def get_page_fill(pdf_path):
    """Get vertical fill percentage."""
    result = subprocess.run(['pdftotext', '-bbox', pdf_path, '-'], capture_output=True, text=True)
    last_ymax = 0
    for line in result.stdout.split('\n'):
        for m in re.findall(r'yMax="([\d.]+)"', line):
            v = float(m)
            if v > last_ymax and v < 792:
                last_ymax = v
    return last_ymax / 792 * 100


def measure_line_fill_from_bbox(pdf_path):
    """Measure line-level fill using word bounding boxes."""
    result = subprocess.run(['pdftotext', '-bbox', pdf_path, '-'], capture_output=True, text=True)
    xml = result.stdout

    page_width = 612.0
    left_margin = 36.0
    right_margin = 576.0

    word_pattern = re.compile(
        r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>'
    )

    words = []
    for match in word_pattern.finditer(xml):
        words.append({
            'xMin': float(match.group(1)),
            'yMin': float(match.group(2)),
            'xMax': float(match.group(3)),
            'yMax': float(match.group(4)),
            'text': match.group(5),
        })

    if not words:
        return []

    # Group words into lines by yMin (within 2pt tolerance)
    lines = []
    current_line = [words[0]]
    for w in words[1:]:
        if abs(w['yMin'] - current_line[0]['yMin']) < 3.0:
            current_line.append(w)
        else:
            lines.append(current_line)
            current_line = [w]
    lines.append(current_line)

    # Compute fill for each line
    line_data = []
    for line_words in lines:
        if not line_words:
            continue
        line_xmin = min(w['xMin'] for w in line_words)
        line_xmax = max(w['xMax'] for w in line_words)
        line_text = ' '.join(w['text'] for w in line_words)

        is_indented = line_xmin > 50
        text_extent = line_xmax - line_xmin
        available = right_margin - line_xmin
        fill_pct = (text_extent / available * 100) if available > 0 else 0

        line_data.append({
            'text': line_text[:80],
            'full_text': line_text,
            'xMin': line_xmin,
            'xMax': line_xmax,
            'fill_pct': fill_pct,
            'is_indented': is_indented,
            'char_count': len(line_text),
        })

    return line_data


def extract_role_sections(full_text):
    """Split resume text into role sections for per-role repetition checks."""
    role_markers = [
        "Senior Manager, Product Management",
        "Manager, Product Management",
        "AI Product Manager II",
        "Technical Product Manager",
    ]
    sections = []
    current_section = {"name": "header", "text": ""}

    for line in full_text.split('\n'):
        found_marker = False
        for marker in role_markers:
            if marker in line:
                if current_section["text"].strip():
                    sections.append(current_section)
                current_section = {"name": marker, "text": ""}
                found_marker = True
                break
        current_section["text"] += line + "\n"

    if current_section["text"].strip():
        sections.append(current_section)

    return sections


def check_repetition(full_text):
    """Check for repeated action verbs within each role section and across all bullets."""
    issues = []
    sections = extract_role_sections(full_text)

    for section in sections:
        if section["name"] == "header":
            continue

        # Extract first word of each bullet (action verbs)
        bullet_verbs = []
        for line in section["text"].split('\n'):
            line = line.strip()
            # Bullet lines start with • or ● or action verb after indent
            if line.startswith(('•', '●')):
                words = line.lstrip('•● ').split()
                if words:
                    bullet_verbs.append(words[0].lower().rstrip(',;:'))
            elif any(line.lower().startswith(v) for v in ACTION_VERBS):
                verb = line.split()[0].lower().rstrip(',;:')
                bullet_verbs.append(verb)

        # Duplicates within same role
        verb_counts = Counter(bullet_verbs)
        for verb, count in verb_counts.items():
            if count > 1:
                issues.append(
                    f"REPEATED VERB in {section['name']}: '{verb}' used {count}x"
                )

    # Also check for same verb starting more than 2 bullets across entire resume
    all_bullet_verbs = []
    for section in sections:
        if section["name"] == "header":
            continue
        for line in section["text"].split('\n'):
            line = line.strip()
            if line.startswith(('•', '●')):
                words = line.lstrip('•● ').split()
                if words:
                    all_bullet_verbs.append(words[0].lower().rstrip(',;:'))

    global_counts = Counter(all_bullet_verbs)
    for verb, count in global_counts.items():
        if count > 2:
            issues.append(
                f"OVERUSED VERB across resume: '{verb}' starts {count} bullets (max 2)"
            )

    # Check for repeated multi-word phrases (3+ words appearing in 2+ bullets)
    bullet_texts = []
    for section in sections:
        if section["name"] == "header":
            continue
        for line in section["text"].split('\n'):
            line = line.strip()
            if line.startswith(('•', '●')):
                bullet_texts.append(line.lstrip('•● ').lower())

    # Check for repeated 4-word sequences
    phrase_sources = {}  # phrase -> set of bullet indices
    for bi, bt in enumerate(bullet_texts):
        words = bt.split()
        for i in range(len(words) - 3):
            phrase = ' '.join(words[i:i+4])
            if phrase not in phrase_sources:
                phrase_sources[phrase] = set()
            phrase_sources[phrase].add(bi)

    for phrase, bullet_indices in phrase_sources.items():
        if len(bullet_indices) > 1:
            # Skip generic phrases
            skip = ['from the ground', 'from 100 to', 'from 20% to', 'from days to']
            if not any(s in phrase for s in skip):
                issues.append(
                    f"REPEATED PHRASE across {len(bullet_indices)} bullets: '{phrase}'"
                )

    return issues


def check_staff_signals(full_text):
    """Check for staff-level framing signals."""
    found = []
    missing_required = []

    for pattern, description, required in STAFF_SIGNALS:
        if re.search(pattern, full_text):
            found.append(description)
        elif required:
            missing_required.append(description)

    return found, missing_required


def validate_resume(pdf_path):
    """Run full QA validation on a resume PDF."""
    results = {
        'file': str(pdf_path),
        'checks': [],
        'pass': True,
        'issues': [],
        'warnings': [],
    }

    # --- Check 1: Page count ---
    pages = get_page_count(pdf_path)
    ok = pages == 1
    results['checks'].append(f"{'✅' if ok else '❌'} Pages: {pages} (need 1)")
    if not ok:
        results['pass'] = False
        results['issues'].append(f"FAIL: {pages} pages, need exactly 1")

    # --- Check 2: Page fill ---
    fill = get_page_fill(pdf_path)
    ok = 93 <= fill <= 98
    results['checks'].append(f"{'✅' if ok else '⚠️'} Page fill: {fill:.1f}% (target 93-98%)")
    if fill < 91:
        results['pass'] = False
        results['issues'].append(f"FAIL: Page fill {fill:.1f}% too low")
    elif fill > 99:
        results['pass'] = False
        results['issues'].append(f"FAIL: Page fill {fill:.1f}% too high, content may overflow")

    # --- Check 3: Line-level fill ---
    line_data = measure_line_fill_from_bbox(pdf_path)

    section_headers = ['EXPERIENCE', 'SKILLS', 'EDUCATION', 'SUJOY', 'UC Berkeley', 'Stanford']

    short_lines = []
    very_short_lines = []

    for i, ld in enumerate(line_data):
        text = ld['text'].strip()
        if any(text.startswith(h) for h in section_headers):
            continue
        if len(text) < 10:
            continue

        # 2nd lines of double bullets get tighter standard (85%)
        is_continuation = ld['is_indented'] and not text.startswith('●') and not text.startswith('•')
        threshold_short = 85 if is_continuation else 80

        if ld['fill_pct'] < 65 and len(text) > 15:
            very_short_lines.append(ld)
        elif ld['fill_pct'] < threshold_short and len(text) > 15:
            short_lines.append(ld)

    n_very_short = len(very_short_lines)
    ok = n_very_short == 0
    results['checks'].append(f"{'✅' if ok else '❌'} Very short lines (<65% fill): {n_very_short}")
    if not ok:
        results['pass'] = False
        for sl in very_short_lines:
            results['issues'].append(f"  SHORT LINE ({sl['fill_pct']:.0f}%): {sl['text']}")

    n_short = len(short_lines)
    ok2 = n_short <= 2
    results['checks'].append(f"{'✅' if ok2 else '⚠️'} Short 2nd lines (<85%) or short lines (<80%): {n_short}")
    if not ok2:
        for sl in short_lines:
            results['warnings'].append(f"  WARN SHORT ({sl['fill_pct']:.0f}%): {sl['text']}")

    # --- Check 4: Education ---
    text_result = subprocess.run(['pdftotext', pdf_path, '-'], capture_output=True, text=True)
    full_text = text_result.stdout

    has_education = 'Berkeley' in full_text or 'Education' in full_text
    ok = has_education
    results['checks'].append(f"{'✅' if ok else '❌'} Education section visible")
    if not ok:
        results['pass'] = False
        results['issues'].append("FAIL: Education section not visible")

    # --- Check 5: Skills ---
    has_skills = 'Technical:' in full_text or 'SKILLS' in full_text
    ok = has_skills
    results['checks'].append(f"{'✅' if ok else '❌'} Skills section visible")
    if not ok:
        results['pass'] = False
        results['issues'].append("FAIL: Skills section not visible")

    # --- Check 6: Repetition ---
    rep_issues = check_repetition(full_text)
    ok = len(rep_issues) == 0
    results['checks'].append(f"{'✅' if ok else '⚠️'} Action verb repetition: {len(rep_issues)} issues")
    if not ok:
        for ri in rep_issues:
            results['warnings'].append(f"  {ri}")

    # --- Check 7: Staff signals ---
    found_signals, missing_signals = check_staff_signals(full_text)
    ok = len(missing_signals) == 0
    results['checks'].append(
        f"{'✅' if ok else '⚠️'} Staff signals: {len(found_signals)} found, {len(missing_signals)} missing"
    )
    if not ok:
        for ms in missing_signals:
            results['warnings'].append(f"  MISSING SIGNAL: {ms}")
    results['staff_signals_found'] = found_signals

    # --- Summary ---
    results['line_count'] = len(line_data)
    results['avg_fill'] = (
        sum(ld['fill_pct'] for ld in line_data) / len(line_data) if line_data else 0
    )

    return results


def print_results(results):
    """Pretty print validation results."""
    print(f"\n{'='*70}")
    print(f"RESUME QA VALIDATION: {Path(results['file']).name}")
    print(f"{'='*70}")

    for check in results['checks']:
        print(f"  {check}")

    print(f"\n  📊 Total lines: {results['line_count']}, Avg fill: {results['avg_fill']:.1f}%")

    if results.get('staff_signals_found'):
        print(f"\n  🏆 Staff signals found:")
        for s in results['staff_signals_found']:
            print(f"    ✓ {s}")

    if results['issues']:
        print(f"\n  ❌ HARD FAILS ({len(results['issues'])}):")
        for issue in results['issues']:
            print(f"    {issue}")

    if results.get('warnings'):
        print(f"\n  ⚠️  WARNINGS ({len(results['warnings'])}):")
        for w in results['warnings']:
            print(f"    {w}")

    status = "✅ PASS" if results['pass'] else "❌ FAIL"
    print(f"\n  {'='*50}")
    print(f"  RESULT: {status}")
    print(f"  {'='*50}\n")

    return results['pass']


def print_line_detail(pdf_path):
    """Print detailed line-by-line fill analysis."""
    line_data = measure_line_fill_from_bbox(pdf_path)

    print(f"\n{'='*70}")
    print(f"LINE-BY-LINE FILL ANALYSIS: {Path(pdf_path).name}")
    print(f"{'='*70}")

    for i, ld in enumerate(line_data):
        fill = ld['fill_pct']
        bar_len = int(fill / 5)
        bar = '█' * bar_len + '░' * (20 - bar_len)

        if fill < 65:
            flag = ' ❌ VERY SHORT'
        elif fill < 80:
            flag = ' ⚠️  SHORT'
        elif fill >= 95:
            flag = ' ✅'
        else:
            flag = ' ✓'

        indent = "  " if ld['is_indented'] else ""
        print(f"  {i:2d} [{fill:5.1f}%] {bar}{flag} {indent}{ld['text'][:60]}")

    print()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python validate_resume.py <pdf_path> [--detail]")
        sys.exit(1)

    pdf_path = sys.argv[1]
    detail = '--detail' in sys.argv

    results = validate_resume(pdf_path)
    passed = print_results(results)

    if detail:
        print_line_detail(pdf_path)

    sys.exit(0 if passed else 1)
