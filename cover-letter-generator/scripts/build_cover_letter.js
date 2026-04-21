/*
 * Cover Letter Builder — Sujoy Guha
 *
 * USAGE: node build_cover_letter.js
 *
 * HOW TO CUSTOMIZE:
 * 1. Modify the CONTENT section (COMPANY, RECIPIENT, HOOK, ROLE_FIT, POV, CLOSE)
 * 2. NEVER modify the FORMATTING section
 *
 * OUTPUT: Writes .pdf next to this script.
 */

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// ============================================================================
// CONTENT — MODIFY PER APPLICATION
// ============================================================================

const COMPANY = "Anthropic";
const RECIPIENT = null; // null -> "Hiring Team". Otherwise "Jane Doe".
const OUTPUT_FILE = `Sujoy_Guha_${COMPANY.replace(/\s+/g, "_")}_Cover_Letter`;

// Beat 1 — Hook. 1-2 sentences. Anchored in something real about the company.
// Do NOT start with "I". First words should be a concrete observation.
const HOOK =
  "Super interested in the Staff PM, Agents role — for two reasons.";

// Beat 2 — Role fit. 2 lines. What about THIS role, not the company.
const ROLE_FIT =
  "One: product scaffolding is where the real 10x is, not model size, and Computer Use proved it. Two: I've been doing the research-to-enterprise seam at Duetto — shipping an RL pricing engine for Hyatt and B&B Hotels, where latency and explainability decided whether the model got to touch revenue. Lemme deep dive on where I'd push.";

// Beat 3 — Business POV. The memo. Hedged-claim register, at least one opinion.
const POV =
  "Claude's enterprise moat runs through Bedrock and Vertex today — that's co-dependency, not a moat. If either ships a first-party agent, the GTM picture changes in a quarter. I'd bet on a first-party developer surface that's a workflow product, not a console, so the builder relationship isn't mediated by a cloud. Borrowed distribution was the lesson at Capital One Shopping: be irreplaceable at the workflow layer, not the API.";

// Beat 4 — Close. One sentence. Not "looking forward to".
const CLOSE = "Happy to dig in.";

// ============================================================================
// FORMATTING — DO NOT MODIFY BELOW THIS LINE
// ============================================================================

const PAGE_MARGIN = 72; // 1 inch
const FONT_SIZE = 11;
const LINE_GAP = 3;
const PARA_GAP = 12;

function build() {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: {
      top: PAGE_MARGIN,
      bottom: PAGE_MARGIN,
      left: PAGE_MARGIN,
      right: PAGE_MARGIN,
    },
  });

  const outPath = path.join(__dirname, `${OUTPUT_FILE}.pdf`);
  doc.pipe(fs.createWriteStream(outPath));

  doc.font("Times-Roman").fontSize(FONT_SIZE);

  const writePara = (text, { gap = PARA_GAP } = {}) => {
    doc.text(text, {
      align: "left",
      lineGap: LINE_GAP,
    });
    doc.moveDown(gap / FONT_SIZE);
  };

  const salutation = `Dear ${RECIPIENT || `${COMPANY} Hiring Team`},`;

  writePara(salutation);
  writePara(HOOK);
  writePara(ROLE_FIT);
  writePara(POV);
  writePara(CLOSE, { gap: PARA_GAP * 2 });
  writePara("Sujoy", { gap: 0 });

  doc.end();
  return outPath;
}

const out = build();
console.log(`Wrote ${out}`);
