#!/usr/bin/env python3
"""
Resume Bullet Improver - Rule-based rewriting of resume bullets.

Usage:
    python -m src.improve --in data/input.txt
    python -m src.improve --in data/input.txt --out data/output.txt
    python -m src.improve --in data/input.txt --style pm --max-chars 160
    python -m src.improve --in data/input.txt --dry-run
"""

import argparse
import re
import sys
from typing import List


# Strong action verbs for PM work (past tense)
# Base verbs that are acceptable across all styles
BASE_VERBS = {
    "Led", "Launched", "Defined", "Drove", "Delivered", "Designed",
    "Prioritized", "Analyzed", "Optimized", "Streamlined", "Spearheaded",
    "Championed", "Coordinated", "Executed", "Improved", "Increased",
    "Reduced", "Built", "Established", "Managed", "Owned", "Shipped",
    "Developed", "Implemented", "Created", "Achieved", "Expanded",
}

# Style-specific preferred verbs (used for verb selection, not validation)
VERB_BANK = {
    "pm": [
        "Led", "Launched", "Defined", "Drove", "Delivered", "Designed",
        "Prioritized", "Analyzed", "Optimized", "Streamlined", "Spearheaded",
        "Championed", "Coordinated", "Executed", "Improved", "Increased",
        "Reduced", "Built", "Established", "Managed", "Owned", "Shipped",
    ],
    "compact": [
        "Led", "Built", "Shipped", "Cut", "Grew", "Drove", "Ran", "Set",
        "Won", "Fixed", "Made", "Hit", "Beat", "Saved", "Sold", "Improved",
        "Launched", "Managed", "Delivered", "Reduced", "Owned", "Analyzed",
    ],
    "impact": [
        "Delivered", "Achieved", "Generated", "Accelerated", "Maximized",
        "Transformed", "Revolutionized", "Captured", "Unlocked", "Scaled",
        "Boosted", "Surpassed", "Exceeded", "Tripled", "Doubled", "Led",
        "Launched", "Built", "Improved", "Optimized", "Managed", "Analyzed",
    ],
}

# Filler phrases to remove (case-insensitive)
FILLER_PHRASES = [
    r"\bresponsible\s+for\b",
    r"\bworked\s+on\b",
    r"\bhelped\s+with\b",
    r"\bhelped\s+to\b",
    r"\bwas\s+involved\s+in\b",
    r"\bparticipated\s+in\b",
    r"\bassisted\s+with\b",
    r"\btasked\s+with\b",
    r"\bin\s+charge\s+of\b",
]

# Impact clause templates by style
IMPACT_TEMPLATES = {
    "pm": [
        ", increasing [metric] by [+X%]",
        ", resulting in [+X%] improvement in [metric]",
        ", driving [N] [unit] growth",
    ],
    "compact": [
        " ([+X%])",
        ", +[X%] [metric]",
    ],
    "impact": [
        ", generating [+X%] lift in [metric]",
        ", supporting [N users]",
        ", saving [$X] annually",
        ", accelerating [metric] by [+X%]",
    ],
}


def parse_arguments() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Rewrite resume bullets into stronger, metric-driven statements.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    # Note: using dest='input_file' because 'in' is a Python keyword
    parser.add_argument(
        "--in",
        dest="input_file",
        required=True,
        help="Input file path containing bullets (one per line)",
    )
    parser.add_argument(
        "--out",
        dest="output_file",
        help="Optional output file path to write improved bullets",
    )
    parser.add_argument(
        "--style",
        choices=["pm", "compact", "impact"],
        default="pm",
        help="Writing style: pm (default), compact, or impact",
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=180,
        help="Maximum characters per bullet (default: 180)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print numbered original and improved bullets side by side",
    )
    return parser.parse_args()


def parse_bullets(filepath: str) -> List[str]:
    """
    Parse bullets from input file.
    - Ignore blank lines
    - Strip leading "-", "•", "*" and extra whitespace
    """
    bullets = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # Remove leading bullet characters
            line = re.sub(r"^[-•*]\s*", "", line)
            line = line.strip()
            if line:
                bullets.append(line)
    return bullets


def remove_filler_phrases(text: str) -> str:
    """Remove filler phrases like 'responsible for', 'worked on', etc."""
    result = text
    for pattern in FILLER_PHRASES:
        result = re.sub(pattern, "", result, flags=re.IGNORECASE)
    # Clean up extra whitespace
    result = re.sub(r"\s+", " ", result).strip()
    return result


def has_numbers(text: str) -> bool:
    """Check if text contains any numbers (metrics)."""
    return bool(re.search(r"\d", text))


def starts_with_strong_verb(text: str, style: str) -> bool:
    """Check if text starts with a strong action verb."""
    first_word = text.split()[0] if text.split() else ""
    return first_word in VERB_BANK.get(style, VERB_BANK["pm"])


def get_best_verb(text: str, style: str) -> str:
    """
    Determine the best action verb based on content.
    Uses simple keyword matching to pick contextually appropriate verbs.
    """
    text_lower = text.lower()
    verbs = VERB_BANK.get(style, VERB_BANK["pm"])

    # Context-based verb selection
    if any(w in text_lower for w in ["team", "cross-functional", "stakeholder", "collaborate"]):
        candidates = ["Led", "Coordinated", "Spearheaded", "Championed"]
    elif any(w in text_lower for w in ["launch", "release", "ship", "deploy"]):
        candidates = ["Launched", "Shipped", "Delivered", "Released"]
    elif any(w in text_lower for w in ["build", "create", "develop", "implement"]):
        candidates = ["Built", "Developed", "Designed", "Established"]
    elif any(w in text_lower for w in ["improve", "optimize", "enhance", "streamline"]):
        candidates = ["Improved", "Optimized", "Streamlined", "Enhanced"]
    elif any(w in text_lower for w in ["reduce", "cut", "decrease", "eliminate"]):
        candidates = ["Reduced", "Cut", "Eliminated", "Decreased"]
    elif any(w in text_lower for w in ["increase", "grow", "expand", "boost"]):
        candidates = ["Increased", "Grew", "Expanded", "Boosted"]
    elif any(w in text_lower for w in ["analyze", "research", "study", "investigate"]):
        candidates = ["Analyzed", "Researched", "Investigated", "Assessed"]
    elif any(w in text_lower for w in ["manage", "own", "oversee", "handle"]):
        candidates = ["Managed", "Owned", "Oversaw", "Directed"]
    elif any(w in text_lower for w in ["define", "specify", "establish", "set"]):
        candidates = ["Defined", "Established", "Set", "Specified"]
    elif any(w in text_lower for w in ["prioritize", "roadmap", "plan", "strategy"]):
        candidates = ["Prioritized", "Planned", "Strategized", "Drove"]
    else:
        candidates = verbs[:5]

    # Return the first candidate that's in the verb bank for this style
    for verb in candidates:
        if verb in verbs:
            return verb
    return verbs[0]


def capitalize_first_word(text: str) -> str:
    """Ensure first word is capitalized."""
    if not text:
        return text
    return text[0].upper() + text[1:]


def convert_gerund_to_past(word: str) -> str:
    """Convert a gerund (-ing) to past tense."""
    gerund_to_past = {
        "improving": "improved",
        "managing": "managed",
        "leading": "led",
        "launching": "launched",
        "building": "built",
        "creating": "created",
        "developing": "developed",
        "designing": "designed",
        "analyzing": "analyzed",
        "optimizing": "optimized",
        "reducing": "reduced",
        "increasing": "increased",
        "implementing": "implemented",
        "establishing": "established",
        "driving": "drove",
        "delivering": "delivered",
        "shipping": "shipped",
        "coordinating": "coordinated",
        "prioritizing": "prioritized",
        "planning": "planned",
        "executing": "executed",
        "streamlining": "streamlined",
        "defining": "defined",
        "supporting": "supported",
        "maintaining": "maintained",
        "growing": "grew",
        "scaling": "scaled",
        "migrating": "migrated",
        "deploying": "deployed",
        "releasing": "released",
    }
    lower = word.lower()
    if lower in gerund_to_past:
        # Preserve capitalization
        result = gerund_to_past[lower]
        if word[0].isupper():
            return result.capitalize()
        return result
    # Generic conversion for -ing words
    if lower.endswith("ing") and len(lower) > 4:
        base = lower[:-3]
        # Double consonant cases: running -> ran (skip), shipping -> shipped
        if len(base) > 1 and base[-1] == base[-2]:
            return (base + "ed").capitalize() if word[0].isupper() else base + "ed"
        # -e ending: improving -> improved (improve + d)
        return (base + "ed").capitalize() if word[0].isupper() else base + "ed"
    return word


def is_strong_verb(word: str) -> bool:
    """Check if word is a strong action verb (from any style)."""
    title = word.capitalize()
    if title in BASE_VERBS:
        return True
    for verbs in VERB_BANK.values():
        if title in verbs:
            return True
    return False


def force_strong_verb_lead(text: str, style: str) -> str:
    """
    Ensure the bullet starts with a strong action verb.
    If it doesn't, convert or replace to use a strong verb.
    """
    if not text:
        return text

    words = text.split()
    if not words:
        return text

    first_word = words[0]
    verbs = VERB_BANK.get(style, VERB_BANK["pm"])

    # Check if already starts with a strong verb (from any style)
    first_word_title = first_word.capitalize()
    if is_strong_verb(first_word_title):
        # Already good, just ensure proper capitalization
        words[0] = first_word_title
        return " ".join(words)

    # Check for gerunds and convert to past tense
    if first_word.lower().endswith("ing") and len(first_word) > 4:
        converted = convert_gerund_to_past(first_word)
        converted_title = converted.capitalize()
        # Use converted form - it's past tense which is preferred
        words[0] = converted_title
        return " ".join(words)

    # Check for common weak verb patterns and replace
    weak_verbs = {
        "created": "Built",
        "made": "Developed",
        "did": "Executed",
        "got": "Achieved",
        "had": "Managed",
        "was": None,  # Will be removed with context
        "been": None,
        "being": None,
        "worked": "Executed",
        "helped": "Supported",
        "used": "Leveraged",
        "handled": "Managed",
    }

    first_lower = first_word.lower()
    if first_lower in weak_verbs:
        replacement = weak_verbs[first_lower]
        if replacement and replacement in verbs:
            words[0] = replacement
            return " ".join(words)
        elif replacement:
            # Use the replacement even if not in verb bank
            words[0] = replacement
            return " ".join(words)
        else:
            # Remove the weak verb (was, been, being) and continue
            words = words[1:]
            if words:
                text = " ".join(words)
                return force_strong_verb_lead(capitalize_first_word(text), style)

    # If first word is "a", "an", "the" or similar, try to restructure
    articles = {"a", "an", "the"}
    if first_lower in articles:
        # Pick verb based on context and restructure
        best_verb = get_best_verb(text, style)
        # "a cross-functional team to launch" -> "Led a cross-functional team to launch"
        return f"{best_verb} {text[0].lower()}{text[1:]}"

    # Need to add a verb - pick one based on context
    best_verb = get_best_verb(text, style)
    return f"{best_verb} {text[0].lower()}{text[1:]}"


def add_impact_clause(text: str, style: str) -> str:
    """Add an impact clause with metric placeholders if no numbers exist."""
    if has_numbers(text):
        return text

    # Don't add if already ends with a metric placeholder
    if re.search(r"\[[^\]]+\]", text):
        return text

    templates = IMPACT_TEMPLATES.get(style, IMPACT_TEMPLATES["pm"])
    # Pick first template for consistency
    impact = templates[0]

    return text.rstrip(".") + impact


def trim_to_max_length(text: str, max_chars: int) -> str:
    """
    Enforce max length by trimming trailing clauses cleanly.
    Does not cut mid-word.
    """
    if len(text) <= max_chars:
        return text

    # Try to find natural break points (comma, semicolon, period)
    truncated = text[:max_chars]

    # Look for last clause break within the limit
    last_comma = truncated.rfind(",")
    last_semi = truncated.rfind(";")
    last_period = truncated.rfind(".")

    # Find the latest break point
    break_point = max(last_comma, last_semi, last_period)

    if break_point > max_chars * 0.5:  # Only use if we keep at least half
        result = text[:break_point].rstrip()
        # Ensure it ends cleanly
        if not result.endswith("."):
            result = result.rstrip(",;") + "."
        return result

    # No good break point, find last space
    last_space = truncated.rfind(" ")
    if last_space > max_chars * 0.5:
        result = text[:last_space].rstrip()
        # Clean up trailing punctuation and add period
        result = result.rstrip(",:;")
        if not result.endswith("."):
            result += "."
        return result

    # Fallback: just truncate at max and add ellipsis
    return text[:max_chars - 3].rstrip() + "..."


def improve_bullet(text: str, style: str, max_chars: int) -> str:
    """
    Apply all improvement rules to a single bullet.

    Rules:
    1. Remove filler phrases
    2. Force strong action verb lead
    3. Add impact clause if no metrics
    4. Enforce max length
    """
    # Step 1: Remove filler phrases
    improved = remove_filler_phrases(text)

    # Step 2: Capitalize first letter
    improved = capitalize_first_word(improved)

    # Step 3: Force strong action verb lead
    improved = force_strong_verb_lead(improved, style)

    # Step 4: Ensure ends with period before impact clause
    improved = improved.rstrip(".")

    # Step 5: Add impact clause if no metrics
    improved = add_impact_clause(improved, style)

    # Step 6: Ensure proper ending punctuation
    if not improved.endswith(".") and not improved.endswith("]"):
        improved += "."

    # Step 7: Enforce max length
    improved = trim_to_max_length(improved, max_chars)

    return improved


def format_dry_run(
    original: List[str], improved: List[str]
) -> str:
    """Format original and improved bullets side by side for dry run."""
    lines = []
    for i, (orig, imp) in enumerate(zip(original, improved), 1):
        lines.append(f"{i}. ORIGINAL: {orig}")
        lines.append(f"   IMPROVED: {imp}")
        lines.append("")
    return "\n".join(lines)


def format_output(bullets: List[str]) -> str:
    """Format improved bullets with '- ' prefix."""
    return "\n".join(f"- {bullet}" for bullet in bullets)


def main() -> int:
    """Main entry point."""
    args = parse_arguments()

    # Parse input bullets
    try:
        original_bullets = parse_bullets(args.input_file)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input_file}", file=sys.stderr)
        return 1
    except IOError as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        return 1

    if not original_bullets:
        print("Warning: No bullets found in input file.", file=sys.stderr)
        return 0

    # Improve each bullet
    improved_bullets = [
        improve_bullet(bullet, args.style, args.max_chars)
        for bullet in original_bullets
    ]

    # Output
    if args.dry_run:
        output = format_dry_run(original_bullets, improved_bullets)
    else:
        output = format_output(improved_bullets)

    # Print to stdout
    print(output)

    # Write to file if specified (only non-dry-run)
    if args.output_file and not args.dry_run:
        try:
            with open(args.output_file, "w", encoding="utf-8") as f:
                f.write(output + "\n")
            print(f"\nOutput written to: {args.output_file}", file=sys.stderr)
        except IOError as e:
            print(f"Error writing output file: {e}", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
