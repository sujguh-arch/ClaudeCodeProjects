#!/usr/bin/env python3
"""
Resume Bullet Improver - Package entry point.

Launches the GUI by default when running: python -m src
For CLI usage, run: python -m src.improve --in <file>
"""

from src.gui import main

if __name__ == "__main__":
    main()
