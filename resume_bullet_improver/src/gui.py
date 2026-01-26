#!/usr/bin/env python3
"""
Resume Bullet Improver - Graphical User Interface

Usage:
    python -m src
"""

import re
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox

from src.improve import improve_bullet


class ResumeBulletImproverGUI:
    """GUI application for the Resume Bullet Improver."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Resume Bullet Improver")
        self.root.geometry("800x600")
        self.root.minsize(600, 400)

        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        main = ttk.Frame(root, padding="10")
        main.grid(row=0, column=0, sticky="nsew")
        main.columnconfigure(0, weight=1)
        main.rowconfigure(1, weight=1)
        main.rowconfigure(4, weight=1)

        # Input label
        ttk.Label(main, text="Input Bullets (one per line):").grid(row=0, column=0, sticky="w")

        # Input text area
        self.input_text = scrolledtext.ScrolledText(main, height=8, wrap=tk.WORD, font=("Consolas", 11))
        self.input_text.grid(row=1, column=0, sticky="nsew", pady=(5, 10))

        # Options row
        opts = ttk.Frame(main)
        opts.grid(row=2, column=0, sticky="ew", pady=(0, 10))

        ttk.Label(opts, text="Style:").pack(side=tk.LEFT)
        self.style_var = tk.StringVar(value="pm")
        ttk.Combobox(opts, textvariable=self.style_var, values=["pm", "compact", "impact"],
                     state="readonly", width=10).pack(side=tk.LEFT, padx=(5, 20))

        ttk.Label(opts, text="Max chars:").pack(side=tk.LEFT)
        self.max_chars_var = tk.StringVar(value="180")
        ttk.Spinbox(opts, from_=50, to=300, textvariable=self.max_chars_var, width=6).pack(side=tk.LEFT, padx=(5, 20))

        ttk.Button(opts, text="Load Sample", command=self._load_sample).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(opts, text="Improve", command=self._improve).pack(side=tk.LEFT)

        # Output label
        ttk.Label(main, text="Improved Bullets:").grid(row=3, column=0, sticky="w")

        # Output text area
        self.output_text = scrolledtext.ScrolledText(
            main, height=8, wrap=tk.WORD, font=("Consolas", 11),
            state=tk.DISABLED, background="#1e1e1e", foreground="#ffffff"
        )
        self.output_text.grid(row=4, column=0, sticky="nsew", pady=(5, 10))

        # Copy button
        ttk.Button(main, text="Copy Output", command=self._copy).grid(row=5, column=0, sticky="e")

    def _load_sample(self):
        """Load sample bullets."""
        sample = """- responsible for improving customer onboarding
- worked on a cross-functional team to launch new payment feature
- helped with the migration of legacy systems to cloud
- was involved in sprint planning and backlog grooming
- Created roadmap for mobile app features"""
        self.input_text.delete("1.0", tk.END)
        self.input_text.insert("1.0", sample)

    def _improve(self):
        """Process input and display improved bullets."""
        content = self.input_text.get("1.0", tk.END).strip()
        if not content:
            messagebox.showwarning("No Input", "Please enter bullets to improve.")
            return

        # Parse bullets
        bullets = []
        for line in content.split("\n"):
            line = re.sub(r"^[-•*]\s*", "", line.strip())
            if line:
                bullets.append(line)

        if not bullets:
            messagebox.showwarning("No Bullets", "No valid bullets found.")
            return

        # Get options
        style = self.style_var.get()
        try:
            max_chars = int(self.max_chars_var.get())
        except ValueError:
            max_chars = 180

        # Improve and display
        improved = [f"- {improve_bullet(b, style, max_chars)}" for b in bullets]
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete("1.0", tk.END)
        self.output_text.insert("1.0", "\n".join(improved))
        self.output_text.config(state=tk.DISABLED)

    def _copy(self):
        """Copy output to clipboard."""
        output = self.output_text.get("1.0", tk.END).strip()
        if output:
            self.root.clipboard_clear()
            self.root.clipboard_append(output)
            messagebox.showinfo("Copied", "Output copied to clipboard.")
        else:
            messagebox.showinfo("No Output", "Nothing to copy.")


def main():
    """Launch the GUI."""
    root = tk.Tk()
    try:
        ttk.Style().theme_use("clam")
    except Exception:
        pass
    ResumeBulletImproverGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
