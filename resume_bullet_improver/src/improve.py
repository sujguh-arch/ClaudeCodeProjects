#!/usr/bin/env python3
"""
Resume Bullet Improver - LLM-powered rewriting using Groq.

Public API:
    improve_bullet(text: str, style: str, max_chars: int) -> str

Requires GROQ_API_KEY environment variable.
"""

import os
from groq import Groq

# Initialize client (will raise error if GROQ_API_KEY not set)
def _get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set. Get a free key at https://console.groq.com")
    return Groq(api_key=api_key)

# Style-specific prompts
STYLE_PROMPTS = {
    "pm": """You are a resume writing expert specializing in Product Manager roles.
Rewrite the bullet point to:
- Start with a strong past-tense action verb (Led, Launched, Drove, Delivered, etc.)
- Follow structure: Verb + What + How + Impact
- Sound professional and metric-driven
- If no metrics exist, add a placeholder like [+X%] or [N users] at the end
- Remove filler phrases like "responsible for", "worked on", "helped with"
""",
    "compact": """You are a resume writing expert who writes punchy, concise bullets.
Rewrite the bullet point to:
- Start with a strong past-tense action verb
- Be as concise as possible while keeping meaning
- Use short, impactful words
- If no metrics exist, add a brief placeholder like ([+X%]) at the end
- Remove all filler phrases
""",
    "impact": """You are a resume writing expert focused on measurable business impact.
Rewrite the bullet point to:
- Start with a strong past-tense action verb emphasizing achievement (Delivered, Achieved, Generated, etc.)
- Heavily emphasize outcomes and results
- If no metrics exist, add an aggressive impact placeholder like ", generating [+X%] lift in [metric]"
- Frame everything in terms of business value
- Remove all filler phrases
""",
}

MODEL = "llama-3.3-70b-versatile"


def improve_bullet(text: str, style: str = "pm", max_chars: int = 180) -> str:
    """
    Improve a resume bullet using Groq LLM.

    Args:
        text: The bullet text to improve
        style: One of "pm", "compact", or "impact"
        max_chars: Maximum characters (default 180)

    Returns:
        Improved bullet text

    Raises:
        ValueError: If GROQ_API_KEY is not set
        Exception: If API call fails
    """
    text = text.strip()
    if not text:
        return ""

    client = _get_client()

    system_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["pm"])
    system_prompt += f"\n\nIMPORTANT: Keep the output under {max_chars} characters. Output ONLY the improved bullet, nothing else."

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Improve this resume bullet:\n{text}"}
        ],
        temperature=0.7,
        max_tokens=256,
    )

    result = response.choices[0].message.content.strip()

    # Clean up any quotes or bullet markers the LLM might add
    result = result.strip('"\'')
    if result.startswith("- "):
        result = result[2:]
    if result.startswith("• "):
        result = result[2:]

    # Enforce max length (LLM might not respect it perfectly)
    if len(result) > max_chars:
        # Trim at last sentence or clause boundary
        truncated = result[:max_chars]
        for sep in [". ", ", ", " "]:
            pos = truncated.rfind(sep)
            if pos > max_chars * 0.5:
                result = truncated[:pos].rstrip(",:;")
                if not result.endswith("."):
                    result += "."
                break
        else:
            result = truncated[:max_chars - 3].rstrip() + "..."

    return result
