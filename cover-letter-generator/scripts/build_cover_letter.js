/*
 * Cover Letter Builder — Sujoy Guha
 *
 * USAGE: node build_cover_letter.js
 *
 * STRUCTURE (v5, per user feedback):
 *   Salutation
 *   Opener: "Super interested in [role] because [market reason] and [company reason]"
 *   Bullet 1: relevant experience (strong preference for 0-1)
 *   Bullet 2: one thing the role wants + how I did it
 *   Close
 *   Sign-off
 *
 * HOW TO CUSTOMIZE:
 * 1. Modify the CONTENT section
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
const ROLE = "Staff PM, Agents";
const RECIPIENT = null; // null -> "Hiring Team". Otherwise "Jane Doe".
const OUTPUT_FILE = `Sujoy_Guha_${COMPANY.replace(/\s+/g, "_")}_Cover_Letter`;

// Opener: ONE sentence, TWO reasons. Market reason + company-specific reason.
// Heuristic register — hard facts, not creative analysis.
const OPENER =
  "Super interested in the Staff PM, Agents role because enterprise agent adoption is gated by trust infrastructure — latency, explainability, audit — more than model accuracy, and Anthropic is the only foundation lab shipping product surfaces against that reality.";

// Bullet 1: relevant experience — STRONG PREFERENCE for 0-to-1.
// Compact. Hard numbers. Clear on value delivered.
const BULLET_1 =
  "Shipped the industry's first agentic RL pricing engine from 0-to-1 at Duetto. Scaled to 40% of user base in 6 months, 10% RevPAR lift, 10x throughput. Landed Hyatt and B&B Hotels as anchor enterprise clients on explainability and millisecond latency.";

// Bullet 2: one thing the role wants + how I did it. Same register as bullet 1.
const BULLET_2 =
  "The hardest problem in shipping agents is getting operators to trust autonomous decisions on real money. Drove pricing acceptance from 20% to 60%+ by making every agent decision explainable and reversible; retention up 10%, competitive wins vs IDeaS and Lighthouse.";

const CLOSE = "Happy to dig in.";

// ============================================================================
// FORMATTING — DO NOT MODIFY BELOW THIS LINE
// ============================================================================

const PAGE_MARGIN = 72; // 1 inch
const FONT_SIZE = 11;
const LINE_GAP = 3;
const PARA_GAP = 12;
const BULLET = "•"; // •

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

  const writePara = (text, { gap = PARA_GAP, indent = 0 } = {}) => {
    doc.text(text, {
      align: "left",
      lineGap: LINE_GAP,
      indent,
    });
    doc.moveDown(gap / FONT_SIZE);
  };

  const writeBullet = (text) => {
    writePara(`${BULLET}  ${text}`, { gap: PARA_GAP });
  };

  const salutation = `Dear ${RECIPIENT || `${COMPANY} Hiring Team`},`;

  writePara(salutation);
  writePara(OPENER);
  writeBullet(BULLET_1);
  writeBullet(BULLET_2);
  writePara(CLOSE, { gap: PARA_GAP * 2 });
  writePara("Sujoy", { gap: 0 });

  doc.end();
  return outPath;
}

const out = build();
console.log(`Wrote ${out}`);
