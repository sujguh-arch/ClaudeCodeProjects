#!/usr/bin/env python3
"""
Resume Bullet Improver - Graphical User Interface

Usage:
    python -m src.gui
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, filedialog, messagebox
from typing import List

from src.improve import improve_bullet, parse_bullets


class ResumeBulletImproverGUI:
    """Main GUI application for the Resume Bullet Improver."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Resume Bullet Improver")
        self.root.geometry("900x700")
        self.root.minsize(700, 500)

        # Configure grid weights for resizing
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Create main frame with padding
        self.main_frame = ttk.Frame(root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky="nsew")
        self.main_frame.columnconfigure(0, weight=1)
        self.main_frame.rowconfigure(1, weight=1)
        self.main_frame.rowconfigure(3, weight=1)

        self._create_widgets()
        self._bind_shortcuts()

    def _create_widgets(self):
        """Create all GUI widgets."""
        # === Input Section ===
        input_frame = ttk.LabelFrame(self.main_frame, text="Input Bullets", padding="5")
        input_frame.grid(row=0, column=0, sticky="ew", pady=(0, 5))
        input_frame.columnconfigure(0, weight=1)

        input_label = ttk.Label(
            input_frame,
            text="Enter resume bullets (one per line). Bullets can start with -, *, or bullet characters.",
        )
        input_label.grid(row=0, column=0, sticky="w")

        # Input text area
        self.input_text = scrolledtext.ScrolledText(
            self.main_frame,
            height=10,
            wrap=tk.WORD,
            font=("Consolas", 11),
        )
        self.input_text.grid(row=1, column=0, sticky="nsew", pady=(0, 10))

        # === Options Section ===
        options_frame = ttk.LabelFrame(self.main_frame, text="Options", padding="10")
        options_frame.grid(row=2, column=0, sticky="ew", pady=(0, 10))

        # Style selection
        ttk.Label(options_frame, text="Style:").grid(row=0, column=0, sticky="w", padx=(0, 5))
        self.style_var = tk.StringVar(value="pm")
        style_combo = ttk.Combobox(
            options_frame,
            textvariable=self.style_var,
            values=["pm", "compact", "impact"],
            state="readonly",
            width=12,
        )
        style_combo.grid(row=0, column=1, sticky="w", padx=(0, 20))

        # Style descriptions
        style_desc = ttk.Label(
            options_frame,
            text="(pm: Product Manager tone | compact: Short & punchy | impact: Metrics-focused)",
            foreground="gray",
        )
        style_desc.grid(row=0, column=2, sticky="w", padx=(0, 20))

        # Max characters
        ttk.Label(options_frame, text="Max chars:").grid(row=1, column=0, sticky="w", padx=(0, 5), pady=(10, 0))
        self.max_chars_var = tk.StringVar(value="180")
        max_chars_spinbox = ttk.Spinbox(
            options_frame,
            from_=50,
            to=300,
            textvariable=self.max_chars_var,
            width=10,
        )
        max_chars_spinbox.grid(row=1, column=1, sticky="w", padx=(0, 20), pady=(10, 0))

        max_chars_desc = ttk.Label(
            options_frame,
            text="(Maximum characters per bullet before trimming)",
            foreground="gray",
        )
        max_chars_desc.grid(row=1, column=2, sticky="w", pady=(10, 0))

        # === Buttons Section ===
        button_frame = ttk.Frame(self.main_frame)
        button_frame.grid(row=2, column=0, sticky="e", pady=(0, 10))

        # Improve button
        self.improve_btn = ttk.Button(
            button_frame,
            text="Improve Bullets",
            command=self.improve_bullets,
            style="Accent.TButton",
        )
        self.improve_btn.pack(side=tk.RIGHT, padx=(5, 0))

        # Clear button
        self.clear_btn = ttk.Button(
            button_frame,
            text="Clear All",
            command=self.clear_all,
        )
        self.clear_btn.pack(side=tk.RIGHT, padx=(5, 0))

        # Load file button
        self.load_btn = ttk.Button(
            button_frame,
            text="Load File",
            command=self.load_file,
        )
        self.load_btn.pack(side=tk.RIGHT, padx=(5, 0))

        # Sample button
        self.sample_btn = ttk.Button(
            button_frame,
            text="Load Sample",
            command=self.load_sample,
        )
        self.sample_btn.pack(side=tk.RIGHT)

        # Re-grid button frame to be below options
        button_frame.grid(row=2, column=0, sticky="e", pady=(60, 10))

        # === Output Section ===
        output_label_frame = ttk.LabelFrame(self.main_frame, text="Improved Bullets", padding="5")
        output_label_frame.grid(row=3, column=0, sticky="nsew", pady=(0, 5))
        output_label_frame.columnconfigure(0, weight=1)
        output_label_frame.rowconfigure(0, weight=1)

        # Output text area - dark theme for better visibility
        self.output_text = scrolledtext.ScrolledText(
            output_label_frame,
            height=10,
            wrap=tk.WORD,
            font=("Consolas", 11),
            state=tk.DISABLED,
            background="#1e1e1e",
            foreground="#ffffff",
            insertbackground="#ffffff",
        )
        self.output_text.grid(row=0, column=0, sticky="nsew")

        # === Status Bar ===
        self.status_var = tk.StringVar(value="Ready. Enter bullets and click 'Improve Bullets' to start.")
        status_bar = ttk.Label(
            self.main_frame,
            textvariable=self.status_var,
            relief=tk.SUNKEN,
            anchor=tk.W,
            padding=(5, 2),
        )
        status_bar.grid(row=4, column=0, sticky="ew", pady=(5, 0))

        # === Bottom Buttons ===
        bottom_frame = ttk.Frame(self.main_frame)
        bottom_frame.grid(row=5, column=0, sticky="e", pady=(10, 0))

        # Copy button
        self.copy_btn = ttk.Button(
            bottom_frame,
            text="Copy Output",
            command=self.copy_output,
        )
        self.copy_btn.pack(side=tk.RIGHT, padx=(5, 0))

        # Save button
        self.save_btn = ttk.Button(
            bottom_frame,
            text="Save Output",
            command=self.save_output,
        )
        self.save_btn.pack(side=tk.RIGHT)

    def _bind_shortcuts(self):
        """Bind keyboard shortcuts."""
        self.root.bind("<Control-Return>", lambda e: self.improve_bullets())
        self.root.bind("<Command-Return>", lambda e: self.improve_bullets())  # macOS
        self.root.bind("<Control-s>", lambda e: self.save_output())
        self.root.bind("<Command-s>", lambda e: self.save_output())  # macOS

    def load_sample(self):
        """Load sample bullets for testing."""
        sample_bullets = """- responsible for improving customer onboarding
- worked on a cross-functional team to launch new payment feature
- helped with the migration of legacy systems to cloud infrastructure
- was involved in sprint planning and backlog grooming
- tasked with managing vendor relationships
- Created roadmap for mobile app features"""

        self.input_text.delete("1.0", tk.END)
        self.input_text.insert("1.0", sample_bullets)
        self.status_var.set("Sample bullets loaded. Click 'Improve Bullets' to process.")

    def load_file(self):
        """Load bullets from a file."""
        filepath = filedialog.askopenfilename(
            title="Select Input File",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        if filepath:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                self.input_text.delete("1.0", tk.END)
                self.input_text.insert("1.0", content)
                self.status_var.set(f"Loaded: {filepath}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load file: {e}")

    def clear_all(self):
        """Clear both input and output text areas."""
        self.input_text.delete("1.0", tk.END)
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete("1.0", tk.END)
        self.output_text.config(state=tk.DISABLED)
        self.status_var.set("Cleared. Ready for new input.")

    def improve_bullets(self):
        """Process input bullets and display improved versions."""
        # Get input text
        input_content = self.input_text.get("1.0", tk.END).strip()

        if not input_content:
            messagebox.showwarning("No Input", "Please enter some bullets to improve.")
            return

        # Parse bullets from input
        bullets = []
        for line in input_content.split("\n"):
            line = line.strip()
            if not line:
                continue
            # Remove leading bullet characters
            import re
            line = re.sub(r"^[-•*]\s*", "", line)
            line = line.strip()
            if line:
                bullets.append(line)

        if not bullets:
            messagebox.showwarning("No Bullets", "No valid bullets found in input.")
            return

        # Get options
        style = self.style_var.get()
        try:
            max_chars = int(self.max_chars_var.get())
        except ValueError:
            max_chars = 180

        # Improve each bullet
        improved = []
        for bullet in bullets:
            improved_bullet = improve_bullet(bullet, style, max_chars)
            improved.append(f"- {improved_bullet}")

        # Display output
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete("1.0", tk.END)
        self.output_text.insert("1.0", "\n".join(improved))
        self.output_text.config(state=tk.DISABLED)

        # Update status
        self.status_var.set(f"Improved {len(bullets)} bullet(s) using '{style}' style.")

    def copy_output(self):
        """Copy output to clipboard."""
        output = self.output_text.get("1.0", tk.END).strip()
        if output:
            self.root.clipboard_clear()
            self.root.clipboard_append(output)
            self.status_var.set("Output copied to clipboard.")
        else:
            messagebox.showinfo("No Output", "Nothing to copy. Run 'Improve Bullets' first.")

    def save_output(self):
        """Save output to a file."""
        output = self.output_text.get("1.0", tk.END).strip()
        if not output:
            messagebox.showinfo("No Output", "Nothing to save. Run 'Improve Bullets' first.")
            return

        filepath = filedialog.asksaveasfilename(
            title="Save Output",
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        if filepath:
            try:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(output + "\n")
                self.status_var.set(f"Saved to: {filepath}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save file: {e}")


def main():
    """Launch the GUI application."""
    root = tk.Tk()

    # Try to set a nicer theme if available
    try:
        style = ttk.Style()
        if "clam" in style.theme_names():
            style.theme_use("clam")
    except Exception:
        pass

    app = ResumeBulletImproverGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
