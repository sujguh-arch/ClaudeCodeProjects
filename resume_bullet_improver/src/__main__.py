#!/usr/bin/env python3
"""Resume Bullet Improver - launches Streamlit app via: python -m src"""

import subprocess
import sys
from pathlib import Path

def main():
    app_path = Path(__file__).parent / "app.py"
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(app_path), "--server.headless=true"])

if __name__ == "__main__":
    main()
