#!/usr/bin/env python3
"""
Resume Bullet Improver - Rule-based rewriting of resume bullets.

Public API:
    improve_bullet(text: str, style: str, max_chars: int) -> str
"""

import re

# Style-specific preferred verbs (past tense)
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
    "pm": ", increasing [metric] by [+X%]",
    "compact": " ([+X%])",
    "impact": ", generating [+X%] lift in [metric]",
}

# Irregular gerund conversions (common cases only)
GERUND_TO_PAST = {
    "leading": "led",
    "building": "built",
    "driving": "drove",
    "growing": "grew",
    "running": "ran",
    "setting": "set",
    "cutting": "cut",
    "hitting": "hit",
    "winning": "won",
    "shipping": "shipped",
}


def _remove_filler_phrases(text: str) -> str:
    """Remove filler phrases like 'responsible for', 'worked on', etc."""
    for pattern in FILLER_PHRASES:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", text).strip()


def _has_numbers(text: str) -> bool:
    """Check if text contains any numbers (metrics)."""
    return bool(re.search(r"\d", text))


def _is_strong_verb(word: str) -> bool:
    """Check if word is a strong action verb (from any style)."""
    title = word.capitalize()
    for verbs in VERB_BANK.values():
        if title in verbs:
            return True
    return False


def _get_best_verb(text: str, style: str) -> str:
    """Determine the best action verb based on content keywords."""
    text_lower = text.lower()
    verbs = VERB_BANK.get(style, VERB_BANK["pm"])

    keyword_map = {
        ("team", "cross-functional", "stakeholder"): ["Led", "Coordinated", "Spearheaded"],
        ("launch", "release", "ship", "deploy"): ["Launched", "Shipped", "Delivered"],
        ("build", "create", "develop", "implement"): ["Built", "Developed", "Designed"],
        ("improve", "optimize", "enhance"): ["Improved", "Optimized", "Streamlined"],
        ("reduce", "cut", "decrease"): ["Reduced", "Cut", "Eliminated"],
        ("increase", "grow", "expand"): ["Increased", "Grew", "Expanded"],
        ("analyze", "research", "study"): ["Analyzed", "Researched", "Assessed"],
        ("manage", "own", "oversee"): ["Managed", "Owned", "Directed"],
        ("define", "establish", "set"): ["Defined", "Established", "Set"],
        ("prioritize", "roadmap", "plan"): ["Prioritized", "Planned", "Drove"],
    }

    for keywords, candidates in keyword_map.items():
        if any(w in text_lower for w in keywords):
            for verb in candidates:
                if verb in verbs:
                    return verb

    return verbs[0]


def _convert_gerund_to_past(word: str) -> str:
    """Convert a gerund (-ing) to past tense."""
    lower = word.lower()

    # Check irregular cases
    if lower in GERUND_TO_PAST:
        result = GERUND_TO_PAST[lower]
        return result.capitalize() if word[0].isupper() else result

    # Generic: remove -ing, add -ed
    if lower.endswith("ing") and len(lower) > 4:
        base = lower[:-3]
        # Double consonant: shipping -> ship -> shipped
        if len(base) > 1 and base[-1] == base[-2]:
            result = base + "ed"
        else:
            result = base + "ed"
        return result.capitalize() if word[0].isupper() else result

    return word


def _force_strong_verb_lead(text: str, style: str) -> str:
    """Ensure the bullet starts with a strong action verb."""
    if not text:
        return text

    words = text.split()
    if not words:
        return text

    first_word = words[0]
    first_lower = first_word.lower()

    # Already starts with strong verb
    if _is_strong_verb(first_word):
        words[0] = first_word.capitalize()
        return " ".join(words)

    # Convert gerund to past tense
    if first_lower.endswith("ing") and len(first_word) > 4:
        words[0] = _convert_gerund_to_past(first_word).capitalize()
        return " ".join(words)

    # Handle weak verbs
    weak_verbs = {"was", "been", "being", "had", "did", "got", "made", "used", "helped", "worked", "handled"}
    if first_lower in weak_verbs:
        words = words[1:]
        if words:
            words[0] = words[0].capitalize()
            return _force_strong_verb_lead(" ".join(words), style)

    # Handle articles - prepend a verb
    if first_lower in {"a", "an", "the"}:
        best_verb = _get_best_verb(text, style)
        return f"{best_verb} {text[0].lower()}{text[1:]}"

    # Default: prepend best verb
    best_verb = _get_best_verb(text, style)
    return f"{best_verb} {text[0].lower()}{text[1:]}"


def _add_impact_clause(text: str, style: str) -> str:
    """Add an impact clause with metric placeholders if no numbers exist."""
    if _has_numbers(text) or re.search(r"\[[^\]]+\]", text):
        return text
    return text.rstrip(".") + IMPACT_TEMPLATES.get(style, IMPACT_TEMPLATES["pm"])


def _trim_to_max_length(text: str, max_chars: int) -> str:
    """Trim text to max length at clause boundaries."""
    if len(text) <= max_chars:
        return text

    truncated = text[:max_chars]

    # Find best break point
    for sep in [". ", ", ", "; ", " "]:
        pos = truncated.rfind(sep)
        if pos > max_chars * 0.5:
            result = text[:pos].rstrip(",:;")
            return result if result.endswith(".") else result + "."

    return text[:max_chars - 3].rstrip() + "..."


def improve_bullet(text: str, style: str = "pm", max_chars: int = 180) -> str:
    """
    Apply all improvement rules to a single bullet.

    Args:
        text: The bullet text to improve
        style: One of "pm", "compact", or "impact"
        max_chars: Maximum characters (default 180)

    Returns:
        Improved bullet text
    """
    # Remove filler phrases
    improved = _remove_filler_phrases(text)

    # Capitalize and force strong verb
    if improved:
        improved = improved[0].upper() + improved[1:]
    improved = _force_strong_verb_lead(improved, style)

    # Add impact clause if no metrics
    improved = improved.rstrip(".")
    improved = _add_impact_clause(improved, style)

    # Ensure proper ending
    if not improved.endswith(".") and not improved.endswith("]"):
        improved += "."

    # Trim to max length
    return _trim_to_max_length(improved, max_chars)
