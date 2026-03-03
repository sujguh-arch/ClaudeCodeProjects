/*
 * Resume Builder Template — Sujoy Guha
 * 
 * USAGE: node build_resume.js [line_spacing] [bullet_spacing] [role_spacing]
 * DEFAULTS: 284 34 180
 *
 * HOW TO CUSTOMIZE:
 * 1. Modify the CONTENT section below (title, roles, bullets, skills, education)
 * 2. NEVER modify the FORMATTING section (functions r, h, bl, sc, doc structure)
 * 3. Run with default spacing first, then adjust params to hit 93-98% fill on 1 page
 *
 * OUTPUT: Writes .docx to /home/claude/ with filename set in OUTPUT_FILE
 */

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, TabStopType,
  AlignmentType, LevelFormat, BorderStyle
} = require("docx");

// ============================================================================
// SPACING PARAMS (from command line or defaults)
// ============================================================================
const LINE_SP = parseInt(process.argv[2]) || 284;
const BUL_SP = parseInt(process.argv[3]) || 34;
const ROLE_SP = parseInt(process.argv[4]) || 180;

// ============================================================================
// CONTENT — MODIFY THIS SECTION FOR EACH JD
// ============================================================================

const OUTPUT_FILE = "Sujoy_Guha_Resume"; // Change to Sujoy_Guha_[Company]_Resume

const TITLE = "SUJOY GUHA - STAFF PRODUCT MANAGER, AI/ML";

const CONTACT = "(415) 906-9812 \u2022 sujguh@gmail.com \u2022 www.linkedin.com/in/sujguha/ \u2022 San Francisco, CA";

// Each role: [title, company, location, dates, headerItalic, [bullets]]
const ROLES = [
  {
    title: "Senior Manager, Product Management, AI/ML",
    company: "Duetto",
    location: "San Francisco, CA",
    dates: "April 2025 \u2013 Present",
    header: "Set multi-year AI vision and led team of 15; shipped industry-first RL engine and 3 0-to-1 product lines",
    bullets: [
      "Defined multi-year vision to transform static revenue workflows into an autonomous AI pricing platform; shipped production RL engine, scaling to 40% of user base in 6 months with 10% RevPAR lift and 10x throughput",
      "Launched Profit-Aware Pricing (0-to-1), shifting optimization from rate-only to total property profit optimization; scaled from 0 to 7K+ properties with 15% margin improvement, 3x-ing the platform\u2019s addressable pricing surface",
      "Delivered Group-Aware ML Pricing (0-to-1), extending algorithmic pricing to conference, group, and enterprise bookings for the first time; captured previously unpriced demand segments and grew group-segment RevPAR by 8%",
      "Shipped agentic AI systems with explainability that autonomously execute revenue decisions; drove pricing acceptance from 20% to 60%+, lifted retention by 10%, outperforming industry leaders IDeaS and Lighthouse",
      "Replaced 1x batch linear programming with real-time RL inference, 4x-ing pricing optimization at 20% of cost and 10% of latency; landed enterprise clients (Hyatt, B&B Hotels) requiring faster pricing levers and granular control",
      "Mentored 4 product analysts and 2 junior PMs; hired Analytics Manager to scale team capacity and operational rigor",
    ],
  },
  {
    title: "Manager, Product Management",
    company: "Capital One Shopping",
    location: "San Francisco, CA",
    dates: "Dec 2023 \u2013 Dec 2024",
    header: "P&L owner ($8\u201312M) competing with Honey (PayPal); led 10-person cross-functional team, drove 30% ARR growth",
    bullets: [
      "Championed and launched Capital One Shopping\u2019s first mobile surface (iOS Safari Extension), selling the mobile-first bet to leadership; grew from zero to 4M+ users, establishing a net-new consumer acquisition channel",
      "Rebuilt merchant onboarding from static data feeds to AI-powered ingestion of unstructured product data, scaling coverage from 100 to 60K+ merchants and cutting onboarding from 4 days of manual QA to under 1 hour",
      "Designed personalized recommendation engine using multi-armed bandits, informed by deep user research and beta pod testing; lifted CTR by 25% and revenue per active user by 12% across email, SMS, and on-page surfaces",
      "Built attribution and incrementality frameworks from the ground up; trained a product ops function for merchant issues at scale and drove 19% conversion lift across 400+ partners (eBay, DoorDash, Walmart) during peak periods",
    ],
  },
  {
    title: "AI Product Manager II",
    company: "J.P. Morgan Chase & Co. (Digital Group)",
    location: "San Francisco, CA",
    dates: "June 2021 \u2013 Dec 2023",
    header: "Promoted from PM I; led 15-person ML team building AI search, risk, and automation for 40K+ enterprises",
    bullets: [
      "Developed semantic search engine replacing manual risk document review for 40K+ commercial banking clients; elevated search relevance and click engagement by 35% through ML-powered ranking and intent-based discovery",
      "Re-platformed KYC verification from a legacy in-house build to an integrated third-party solution, cutting processing from days to under 30 seconds; redesigned AI-driven onboarding flows that lifted user activation by 20%",
      "Deployed ML-powered expense automation and LLM-driven validations across enterprise banking workflows; drove 25%+ platform engagement lift and 8% incremental revenue through targeted workflow optimization",
    ],
  },
  {
    title: "Technical Product Manager",
    company: "Wayfair",
    location: "Boston, MA",
    dates: "Oct 2020 \u2013 June 2021",
    header: "Built 0-to-1 routing engine across 20K+ suppliers and 20M+ shipments; scaled from 1 hub to 8 domestic + intl",
    bullets: [
      "Identified root-cause supply chain failures; pivoted from dashboard build to constraint-based optimization engine, reducing failure rate by 20+%",
      "Reduced shipment shrinkage by ~15% and improved on-time delivery by ~20% across all domestic and intl hubs",
    ],
  },
];

const SKILLS = {
  technical: "Python, SQL, Reinforcement Learning, LLMs/RAG, Agentic AI, NLP, Ranking & Rec Systems, MLOps",
  product: "0-to-1 Development, Vision & Strategy, Cross-Functional Leadership, Platform Strategy, Experimentation",
};

const EDUCATION = [
  {
    school: "UC Berkeley",
    detail: [
      { text: " \u2013 Dual BA in ", bold: false },
      { text: "Data Science", bold: true },
      { text: " (ML, AI, Econometrics) and ", bold: false },
      { text: "Economics", bold: true },
    ],
    location: "Berkeley, CA",
  },
  {
    school: "Stanford University",
    detail: [
      { text: " \u2013 ", bold: false },
      { text: "Y2E2 Cleantech Scholar", bold: true },
      { text: " \u2022 Cleantech and systems innovation fellowship", bold: false },
    ],
    location: "Stanford, CA",
  },
];

// ============================================================================
// FORMATTING — DO NOT MODIFY BELOW THIS LINE
// ============================================================================

const PW = 12240, M = 720, CW = PW - M * 2;
const F = "Times New Roman", B = 22, N = 28, S = 24;

const mkRole = (rt, co, loc, dt) => new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: CW }],
  spacing: { before: ROLE_SP, after: 0 },
  children: [
    new TextRun({ text: rt, bold: true, font: F, size: B }),
    new TextRun({ text: " | ", font: F, size: B }),
    new TextRun({ text: co, italics: true, font: F, size: B }),
    new TextRun({ text: "\t", font: F, size: B }),
    new TextRun({ text: `${loc} | ${dt}`, font: F, size: B }),
  ],
});

const mkHeader = t => new Paragraph({
  spacing: { before: 0, after: 40 },
  children: [new TextRun({ text: t, bold: true, italics: true, font: F, size: B })],
});

const mkBullet = t => new Paragraph({
  numbering: { reference: "bul", level: 0 },
  spacing: { before: BUL_SP, after: BUL_SP },
  children: [new TextRun({ text: t, font: F, size: B })],
});

const mkSection = t => new Paragraph({
  spacing: { before: 160, after: 40 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000", space: 1 } },
  children: [new TextRun({ text: t, bold: true, font: F, size: S })],
});

// Build role paragraphs
const roleParagraphs = [];
for (const role of ROLES) {
  roleParagraphs.push(mkRole(role.title, role.company, role.location, role.dates));
  roleParagraphs.push(mkHeader(role.header));
  for (const bullet of role.bullets) {
    roleParagraphs.push(mkBullet(bullet));
  }
}

// Build education paragraphs
const eduParagraphs = EDUCATION.map((edu, i) => {
  const children = [
    new TextRun({ text: edu.school, bold: true, font: F, size: B }),
    ...edu.detail.map(d => new TextRun({ text: d.text, bold: d.bold, font: F, size: B })),
    new TextRun({ text: "\t", font: F, size: B }),
    new TextRun({ text: edu.location, font: F, size: B }),
  ];
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    spacing: { before: i === 0 ? 30 : 0, after: 10 },
    children,
  });
});

const doc = new Document({
  styles: { default: { document: { run: { font: F, size: B }, paragraph: { spacing: { line: LINE_SP } } } } },
  numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 180 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: PW, height: 15840 }, margin: { top: 432, right: M, bottom: 432, left: M } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
        new TextRun({ text: TITLE, bold: true, font: F, size: N }),
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 30 }, children: [
        new TextRun({ text: CONTACT, font: F, size: B }),
      ]}),
      mkSection("EXPERIENCE"),
      ...roleParagraphs,
      mkSection("SKILLS"),
      new Paragraph({ spacing: { before: 30, after: 10 }, children: [
        new TextRun({ text: "Technical: ", bold: true, font: F, size: B }),
        new TextRun({ text: SKILLS.technical, font: F, size: B }),
      ]}),
      new Paragraph({ spacing: { before: 0, after: 10 }, children: [
        new TextRun({ text: "Product: ", bold: true, font: F, size: B }),
        new TextRun({ text: SKILLS.product, font: F, size: B }),
      ]}),
      mkSection("EDUCATION"),
      ...eduParagraphs,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(`/home/claude/${OUTPUT_FILE}.docx`, buf);
  console.log("OK");
});
