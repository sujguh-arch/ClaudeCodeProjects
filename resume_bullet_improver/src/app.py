"""Resume Bullet Improver - Streamlit UI"""

import re
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import streamlit as st
from src.improve import improve_bullet

st.set_page_config(page_title="Resume Bullet Improver", page_icon="📝", layout="centered")

st.title("📝 Resume Bullet Improver")
st.caption("Transform weak resume bullets into strong, metric-driven statements")

# Sidebar options
with st.sidebar:
    st.header("Options")
    style = st.selectbox("Style", ["pm", "compact", "impact"],
                         format_func=lambda x: {"pm": "PM (Product Manager)",
                                                "compact": "Compact (Short & punchy)",
                                                "impact": "Impact (Metrics-focused)"}[x])
    max_chars = st.slider("Max characters", 60, 250, 180,
                          help="Bullets longer than this will be trimmed at clause boundaries")

    st.divider()
    st.markdown("**Styles explained:**")
    st.markdown("- **PM**: Professional product manager tone")
    st.markdown("- **Compact**: Shorter, punchier bullets")
    st.markdown("- **Impact**: Aggressive metrics focus")

# Sample bullets
SAMPLE = """- responsible for improving customer onboarding
- worked on a cross-functional team to launch new payment feature
- helped with the migration of legacy systems to cloud
- was involved in sprint planning and backlog grooming
- Created roadmap for mobile app features"""

# Load sample button
if st.button("Load Sample"):
    st.session_state.input_text = SAMPLE

# Input area
input_text = st.text_area("Enter your resume bullets (one per line):",
                          value=st.session_state.get("input_text", ""),
                          height=200,
                          placeholder="- responsible for managing team projects\n- worked on improving sales pipeline")

# Parse bullets
def parse_bullets(text):
    bullets = []
    for line in text.strip().split("\n"):
        line = re.sub(r"^[-•*]\s*", "", line.strip())
        if line:
            bullets.append(line)
    return bullets

# Auto-improve when input exists (makes slider reactive)
bullets = parse_bullets(input_text) if input_text.strip() else []

if bullets:
    st.divider()
    st.subheader("Improved Bullets")

    improved_lines = []
    for original in bullets:
        improved = improve_bullet(original, style, max_chars)
        if improved:  # Skip empty results
            improved_lines.append(f"- {improved}")

    if not improved_lines:
        st.warning("No valid bullets to improve.")
    else:
        # Display in a nice code block
        result = "\n".join(improved_lines)
        st.code(result, language=None)

        # Show character counts
        st.caption(f"Max: {max_chars} chars | Longest bullet: {max(len(line) - 2 for line in improved_lines)} chars")

        # Copy button workaround
        with st.expander("📋 Copy to clipboard"):
            st.text_area("Select all and copy:", value=result, height=150, label_visibility="collapsed")

        # Before/after comparison (only show bullets that produced output)
        with st.expander("🔍 See before & after"):
            idx = 0
            for original in bullets:
                improved = improve_bullet(original, style, max_chars)
                if improved:
                    idx += 1
                    col1, col2 = st.columns(2)
                    with col1:
                        st.markdown(f"**{idx}. Original:**")
                        st.markdown(f"> {original}")
                    with col2:
                        st.markdown(f"**Improved:**")
                        st.markdown(f"> {improved}")
                    st.divider()
