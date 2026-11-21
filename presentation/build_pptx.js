// Builds presentation/MoE_Purchase_Intention.pptx with pptxgenjs.
// All numbers come from ../results and the dataset (seeds 100-109, test sets).
// Usage: node build_pptx.js   (needs pptxgenjs; chart data in pptx_data.json)
const path = require("path");
const pptxgen = require("pptxgenjs");
const DATA = require(path.join(__dirname, "pptx_data.json"));

const THEME = {
  name: "IITI Beamer Blue",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: "111111", lt1: "FFFFFF", dk2: "3333B2", lt2: "F3F4FA",
    accent1: "2878D6", // Behaviour (blue)
    accent2: "EB6834", // Context (orange)
    accent3: "1BAE7A", // Analytics (green)
    accent4: "7C4DBA", // Gate (purple)
    accent5: "6B7280", // muted grey
    accent6: "D5DAE1", // light line
    hlink: "3333B2", folHlink: "7C4DBA",
  },
};
const HEX = THEME.colors;
// Beamer footer shades (left / middle / right), taken from the PDF template
const FOOT = ["191961", "26268C", "3333B2"];
const TOTAL = 21; // total slide count shown in the footer ("n / 21")

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Online Shoppers Purchasing Intention Prediction using a Context-Aware Mixture of Experts Model";
const C = pres.SchemeColor;
const NAVY = C.text2, INK = C.text1, SOFT = C.background2, WHITE = C.background1;
const BEH = C.accent1, CTX = C.accent2, ANA = C.accent3, GATE = C.accent4, MUTED = C.accent5, LINE = C.accent6;
const W = 13.333;
const LOGO = path.join(__dirname, "figures", "iiti_logo.png");

// ---------------------------------------------------------------- layouts
// three-part Beamer footer: team | short title | date + page
const FY = 7.24, FH = 0.26, FW = W / 3;
const TOPIC = "Online Shopping Behavior Prediction";
const footer = [
  ...FOOT.map((c, i) => ({ rect: { x: i * FW, y: FY, w: FW + 0.01, h: FH, fill: { color: c }, line: { color: c } } })),
  { text: { text: `/ ${TOTAL}`, options: { x: W - 0.55, y: FY, w: 0.5, h: FH, fontSize: 11, color: WHITE, align: "left", valign: "middle", margin: 0 } } },
];
const pageNo = { x: W - 1.05, y: FY, w: 0.47, h: FH, fontSize: 11, color: WHITE, align: "right", valign: "middle", margin: 0 };

pres.defineSlideMaster({
  title: "Beamer Title",
  background: { color: WHITE },
  objects: [
    { rect: { x: 0.2, y: 0.46, w: W - 0.4, h: 1.03, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.1,
              shadow: { type: "outer", color: "000000", opacity: 0.35, blur: 4, offset: 3, angle: 45 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.4, y: 0.46, w: W - 0.8, h: 1.03,
        fontSize: 30, color: WHITE, align: "center", valign: "middle", margin: 0 }, text: "" } },
    ...footer,
  ],
  slideNumber: pageNo,
});

pres.defineSlideMaster({
  title: "Beamer Frame",
  background: { color: WHITE },
  margin: [0.95, 0.35, 0.4, 0.35],
  objects: [
    { rect: { x: 0, y: 0, w: W, h: 0.82, fill: { color: NAVY }, line: { color: NAVY } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.25, y: 0, w: W - 0.5, h: 0.82,
        fontSize: 28, color: WHITE, align: "left", valign: "middle", margin: 0 }, text: "" } },
    ...footer,
  ],
  slideNumber: pageNo,
});

pres.defineSlideMaster({
  title: "Beamer Plain",
  background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 2.6, w: W - 1.2, h: 1.2,
        fontSize: 32, color: INK, align: "center", valign: "middle", margin: 0 }, text: "" } },
    ...footer,
  ],
  slideNumber: pageNo,
});

// ---------------------------------------------------------------- helpers
let n = 0;
const nm = (s) => `${s}_${++n}`;
function txt(slide, text, o) {
  slide.addText(text, { isTextBox: true, margin: 0, valign: "top", color: INK, fontSize: 14,
    objectName: nm("text"), ...o });
}
function box(slide, o) {
  const { x, y, w, h, color = NAVY, fill = 90, text, fontSize = 14, align = "center", valign = "middle",
          textColor = INK, radius = 0.08, dash } = o;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius,
    fill: fill === null ? { color: WHITE } : { color, transparency: fill },
    line: { color, width: 1.25, dashType: dash || "solid" }, objectName: nm("box") });
  if (text) txt(slide, text, { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: h - 0.12, align, valign, fontSize, color: textColor });
}
function arrow(slide, x1, y1, x2, y2, color = NAVY, width = 1.75) {
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(x2 - x1), 0.001), h: Math.max(Math.abs(y2 - y1), 0.001),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width, endArrowType: "triangle" }, objectName: nm("arrow") });
}
function motif(slide, x, y, d) {
  [BEH, CTX, ANA].forEach((c, i) => slide.addShape(pres.shapes.OVAL, { x: x + i * d * 1.7, y, w: d, h: d, fill: { color: c }, line: { color: c }, objectName: nm("motif") }));
}
function seg(slide, x1, y1, x2, y2, color = NAVY, width = 1.75) {
  slide.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(x2 - x1), 0.001), h: Math.max(Math.abs(y2 - y1), 0.001),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width }, objectName: nm("seg") });
}
function circleNum(slide, x, y, d, color, label, fontSize = 16) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color }, objectName: nm("badge") });
  txt(slide, label, { x, y, w: d, h: d, align: "center", valign: "middle", bold: true, color: WHITE, fontSize });
}
const B = (t, extra = {}) => ({ text: t, options: { bold: true, ...extra } });
const R = (t, extra = {}) => ({ text: t, options: { ...extra } });
const bullets = (items, o = {}) => items.map((it, i) => {
  const runs = Array.isArray(it) ? it : [R(it)];
  return runs.map((r, j) => ({ text: r.text, options: { ...r.options,
    ...(j === 0 ? { bullet: { characterCode: "25CF", indent: 20 }, paraSpaceAfter: o.space ?? 10 } : {}),
    ...(j === runs.length - 1 && i < items.length - 1 ? { breakLine: true } : {}) } }));
}).flat();
function content(title, section) {
  const s = pres.addSlide({ masterName: "Beamer Frame", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}
// chart styling shared by every chart (same label look everywhere)
const chartBase = {
  catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent5, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11,
  catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt",
  titleFontFace: "+mn-lt", legendFontFace: "+mn-lt",
  valGridLine: { color: HEX.accent6, size: 0.5 }, catGridLine: { style: "none" },
  catAxisLineShow: true, valAxisLineShow: false,
  showTitle: true, titleFontSize: 14, titleColor: HEX.dk2, dataLabelFontSize: 11, dataLabelColor: HEX.dk1,
};

// ======================================================================
// 1. Title
// ======================================================================
pres.addSection({ title: "Introduction" });
{
  const s = pres.addSlide({ masterName: "Beamer Title", sectionTitle: "Introduction" });
  s.addText([R("Online Shoppers Purchasing Intention Prediction", { breakLine: true }), R("using a Context-Aware Mixture of Experts Model")], { placeholder: "title", fontSize: 26 });
  const c = (t, y, h, o = {}) => txt(s, t, { x: 1, y, w: W - 2, h, align: "center", valign: "middle", fontSize: 20, ...o });
  c([R("Machine Learning Course Project:", { breakLine: true }), R(TOPIC)], 1.72, 0.75);

  // members as a numbered table, alphabetical
  const members = [["Abhimanyu Mittal", "2604103001"], ["Ajitesh Kumar", "2604101003"], ["Aman Badone", "2604101004"],
                   ["Aviral Garg", "2604101008"], ["Purusoth Visaal B.", "2604102005"], ["Soumyajit Datta", "2604101014"]];
  const th = (t, align = "left") => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align } });
  s.addTable([[th("No.", "center"), th("Name"), th("Roll No.", "center")],
    ...members.map(([nme, roll], k) => [{ text: `${k + 1}.`, options: { align: "center" } }, { text: nme, options: { bold: true } }, { text: roll, options: { align: "center" } }])],
    { x: (W - 6.0) / 2, y: 2.7, w: 6.0, colW: [0.9, 3.1, 2.0], rowH: 0.44, fontSize: 16, color: INK, valign: "middle",
      border: { type: "solid", color: HEX.accent6, pt: 0.75 }, fill: { color: WHITE }, objectName: "table_members" });
  c("19/11/2026", 6.05, 0.4, { fontSize: 18 });

  // graphic: shoppers -> three experts -> prediction
  const gx = 1.0, gd = 1.25;
  const iconCircle = (y, color, icon, label) => {
    s.addShape(pres.shapes.OVAL, { x: gx, y, w: gd, h: gd, fill: { color }, line: { color }, objectName: nm("g_circle") });
    s.addImage({ path: path.join(__dirname, "figures", icon), x: gx + gd * 0.25, y: y + gd * 0.25, w: gd * 0.5, h: gd * 0.5, objectName: nm("g_icon"), altText: label });
    txt(s, label, { x: gx - 0.5, y: y + gd + 0.03, w: gd + 1.0, h: 0.3, align: "center", fontSize: 12, color: MUTED });
  };
  iconCircle(2.55, NAVY, "icon_cart.png", "Visitor session");
  [BEH, CTX, ANA].forEach((col, k) => s.addShape(pres.shapes.OVAL, { x: gx + 0.07 + k * 0.42, y: 4.35, w: 0.28, h: 0.28, fill: { color: col }, line: { color: col }, objectName: nm("g_expert") }));
  arrow(s, gx + gd / 2, 4.15, gx + gd / 2, 4.32); arrow(s, gx + gd / 2, 4.66, gx + gd / 2, 4.9);
  iconCircle(4.9, ANA, "icon_chart.png", "Purchase prediction");
  // logo is a normal picture on the slide, so it can be moved or resized
  s.addImage({ path: LOGO, x: W - 0.35 - 1.5, y: FY - 0.18 - 1.63, w: 1.5, h: 1.63, objectName: "iiti_logo", altText: "IIT Indore logo" });
  s.addNotes("Introduce the team and the project title.");
}

// ======================================================================
// Overview (template's numbered outline)
// ======================================================================
{
  const s = content("Overview", "Introduction");
  const items = ["Project Overview", "Problem Statement", "Project Objectives", "Dataset Description",
    "Exploratory Data Analysis", "Data Preprocessing", "Proposed Project Workflow", "Feature Grouping",
    "Context-Aware Mixture of Experts Model", "Adaptive Gating Mechanism", "Model Implementation and Training",
    "Prediction Process", "Model Evaluation", "Results and Visualizations",
    "Challenges, Limitations and Future Work", "Conclusion", "Contribution of Each Member"];
  items.forEach((t, k) => {
    const col = Math.floor(k / 9), row = k % 9;
    const x = 0.45 + col * 6.45, y = 1.12 + row * 0.66;
    circleNum(s, x, y, 0.42, NAVY, String(k + 1), 14);
    txt(s, t, { x: x + 0.6, y, w: 5.7, h: 0.42, valign: "middle", fontSize: 20, color: NAVY });
  });
}

// ======================================================================
// 2. Project overview
// ======================================================================
{
  const s = content("Project Overview", "Introduction");
  txt(s, bullets([
    [R("We predict whether a visitor's session on an online store "), B("ends in a purchase"), R(".")],
    [R("Input: "), B("17 features"), R(" describing one browsing session — pages, time, analytics values, visitor context.")],
    [R("Model: a "), B("Mixture of Experts"), R(" — three small models, each looking at one group of features.")],
    [R("A "), B("gating network"), R(" decides, for each session, how much to trust each expert.")],
    [R("Output: a "), B("purchase probability"), R(" and a Buy / No-buy decision.")],
  ], { space: 14 }), { x: 0.6, y: 1.6, w: 6.9, h: 4.8, fontSize: 18 });

  // right: mini flow
  const x = 8.6, w = 3.8;
  box(s, { x, y: 1.6, w, h: 1.1, color: NAVY, fill: 92, text: [B("Visitor session", { breakLine: true }), R("17 features", { fontSize: 13, color: MUTED })], fontSize: 17 });
  box(s, { x, y: 3.3, w, h: 1.1, color: GATE, fill: 88, text: [B("Context-Aware", { breakLine: true }), B("Mixture of Experts")], fontSize: 17 });
  box(s, { x, y: 5.0, w, h: 1.1, color: ANA, fill: 85, text: [B("P(purchase)", { breakLine: true }), R("→ Buy / No buy", { fontSize: 14 })], fontSize: 17 });
  arrow(s, x + w / 2, 2.7, x + w / 2, 3.3); arrow(s, x + w / 2, 4.4, x + w / 2, 5.0);
  [BEH, CTX, ANA].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: x + w + 0.15, y: 3.45 + i * 0.3, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c }, objectName: nm("dot") }));
  s.addNotes("One-line summary: session in, purchase probability out, using three feature-group experts and a gate.");
}

// ======================================================================
// 3. Problem statement
// ======================================================================
{
  const s = content("Problem Statement", "Introduction");
  box(s, { x: 0.6, y: 1.5, w: 12.1, h: 1.15, color: NAVY, fill: 93, align: "left", fontSize: 18, text: [
    B("Task:  ", { color: NAVY }), R("given the record of one website session, predict whether the visitor will "),
    B("make a purchase"), R(" (Revenue = True) or leave without buying — a "), B("binary classification"), R(" problem.")] });

  const col = (x, title, color, items) => {
    box(s, { x, y: 3.0, w: 4.4, h: 3.5, color, fill: 93 });
    txt(s, title, { x: x + 0.25, y: 3.2, w: 3.9, h: 0.45, bold: true, fontSize: 20, color });
    txt(s, bullets(items, { space: 10 }), { x: x + 0.25, y: 3.8, w: 3.9, h: 2.6, fontSize: 16 });
  };
  col(0.6, "Why it matters", BEH, ["Most visits end without a purchase.", "Spotting likely buyers enables targeted offers, live chat or reminders.", "Shows shops what drives a purchase."]);
  col(5.2, "What makes it hard", CTX, ["Imbalanced: few sessions are purchases.", "Mixed features: counts, durations, rates, categories.", "Different visitors are explained by different signals."]);
  // stat callout
  box(s, { x: 9.8, y: 3.0, w: 2.9, h: 3.5, color: ANA, fill: 88 });
  txt(s, "15.6%", { x: 9.8, y: 3.6, w: 2.9, h: 1.2, align: "center", bold: true, fontSize: 54, color: ANA });
  txt(s, "of sessions end in a purchase", { x: 10.0, y: 4.9, w: 2.5, h: 0.9, align: "center", fontSize: 16 });
}

// ======================================================================
// 4. Objectives
// ======================================================================
{
  const s = content("Project Objectives", "Introduction");
  const objs = [
    ["Explore & prepare", "Analyse the dataset and build a clean, leakage-free preprocessing pipeline.", NAVY],
    ["Group features", "Split the 17 features into Behaviour, Context and Analytics groups.", BEH],
    ["Build the MoE", "Train one expert per group plus an adaptive gating network.", CTX],
    ["Handle imbalance", "Use class weights and a tuned decision threshold, not plain accuracy.", ANA],
    ["Evaluate & interpret", "Report F1, precision, recall, PR-AUC and inspect the gate weights.", GATE],
  ];
  const w = 2.26, gap = 0.2;
  objs.forEach(([t, d, c], i) => {
    const x = 0.6 + i * (w + gap);
    box(s, { x, y: 1.9, w, h: 4.3, color: c, fill: 93 });
    circleNum(s, x + w / 2 - 0.35, 2.2, 0.7, c, String(i + 1), 22);
    txt(s, t, { x: x + 0.15, y: 3.1, w: w - 0.3, h: 0.8, align: "center", bold: true, fontSize: 18, color: c, valign: "middle" });
    txt(s, d, { x: x + 0.2, y: 4.0, w: w - 0.4, h: 2.0, align: "left", fontSize: 15 });
  });
}

// ======================================================================
// 5. Dataset description
// ======================================================================
pres.addSection({ title: "Data" });
{
  const s = content("Dataset Description", "Data");
  txt(s, [B("UCI Online Shoppers Purchasing Intention", { breakLine: true }),
          R("One year of online-store sessions; one row per session.", { fontSize: 14, color: MUTED })],
      { x: 0.6, y: 1.4, w: 5.6, h: 0.8, fontSize: 18, color: NAVY });
  const stats = [["12,205", "sessions used (12,330 raw, 125 duplicates removed)", NAVY],
                 ["17", "input features (10 numeric, 7 categorical)", BEH],
                 ["15.6%", "buyers: 1,908 vs 10,297 non-buyers", ANA],
                 ["0", "missing values", CTX]];
  stats.forEach(([v, l, c], i) => {
    const x = 0.6 + (i % 2) * 2.85, y = 2.45 + Math.floor(i / 2) * 2.15;
    box(s, { x, y, w: 2.65, h: 1.95, color: c, fill: 92 });
    txt(s, v, { x, y: y + 0.2, w: 2.65, h: 0.8, align: "center", bold: true, fontSize: 36, color: c });
    txt(s, l, { x: x + 0.15, y: y + 1.05, w: 2.35, h: 0.8, align: "center", fontSize: 13 });
  });
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY } } });
  const rows = [
    [hdr("Type"), hdr("Features")],
    ["Page counts", "Administrative, Informational, ProductRelated"],
    ["Durations", "time spent on each of the three page types"],
    ["Analytics", "BounceRates, ExitRates, PageValues"],
    ["Calendar", "Month, SpecialDay, Weekend"],
    ["Visitor / tech", "VisitorType, OperatingSystems, Browser, Region, TrafficType"],
    [{ text: "Target", options: { bold: true, color: ANA } }, { text: "Revenue — did the session end in a purchase? (1 = yes)", options: { bold: true } }],
  ];
  s.addTable(rows, { x: 6.55, y: 1.45, w: 6.15, colW: [1.65, 4.5], fontSize: 14, color: INK,
    border: { type: "solid", color: HEX.accent6, pt: 0.75 }, fill: { color: WHITE }, rowH: 0.62, valign: "middle", objectName: nm("table") });
}

// ======================================================================
// 6. EDA (native charts)
// ======================================================================
{
  const s = content("Exploratory Data Analysis", "Data");
  const cw = 3.95, cy = 1.35, ch = 3.9;
  s.addChart(pres.charts.BAR, [{ name: "Sessions", labels: ["No purchase", "Purchase"], values: [10297, 1908] }], {
    ...chartBase, x: 0.5, y: cy, w: cw, h: ch, barDir: "col", title: "Class balance (sessions)",
    chartColors: [HEX.accent5, HEX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "#,##0",
    showLegend: false, barGapWidthPct: 60, valAxisHidden: true, valGridLine: { style: "none" }, objectName: "chart_class_balance" });
  s.addChart(pres.charts.BAR, [{ name: "Purchase rate", labels: ["PageValues = 0", "PageValues > 0"], values: [DATA.pv[0], DATA.pv[2]] }], {
    ...chartBase, x: 4.69, y: cy, w: cw, h: ch, barDir: "col", title: "Purchase rate by PageValues",
    chartColors: [HEX.accent5, HEX.accent3], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0%",
    showLegend: false, barGapWidthPct: 60, valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 0.7, objectName: "chart_pagevalues" });
  s.addChart(pres.charts.BAR, [{ name: "Purchase rate", labels: DATA.month.map(m => m[0]), values: DATA.month.map(m => m[1]) }], {
    ...chartBase, x: 8.88, y: cy, w: cw, h: ch, barDir: "col", title: "Purchase rate by month",
    chartColors: [HEX.accent1], showValue: false, valAxisLabelFormatCode: "0%", showLegend: false, barGapWidthPct: 40,
    catAxisLabelFontSize: 10, valAxisMaxVal: 0.3, objectName: "chart_month" });

  const obs = [
    [B("Imbalance: ", { color: NAVY }), R("84.4% of sessions have no purchase, so accuracy alone is misleading.")],
    [B("PageValues: ", { color: ANA }), R("56.3% of sessions buy when PageValues > 0, only 3.9% when it is 0.")],
    [B("Seasonality: ", { color: BEH }), R("November has the highest purchase rate; January and April are missing.")],
  ];
  obs.forEach((o, i) => txt(s, o, { x: 0.65 + i * 4.19, y: 5.4, w: 3.75, h: 0.95, fontSize: 14 }));
  txt(s, "Also: durations are heavily right-skewed (median 599 s, max 63,974 s); Browser, Region etc. are categories stored as integers.",
      { x: 0.65, y: 6.45, w: 12.0, h: 0.4, fontSize: 12, color: MUTED, italic: true });
}

// ======================================================================
// 7. Preprocessing (2x3 cards)
// ======================================================================
{
  const s = content("Data Preprocessing", "Data");
  const cards = [
    ["Missing values", "None in the dataset — no imputation needed.", NAVY],
    ["Duplicate rows", "125 exact duplicates removed before splitting, so no copies leak into the test set.", NAVY],
    ["Categorical variables", "One-hot encoding; levels seen fewer than 30 times merged into “infrequent”.", BEH],
    ["Skewed numeric features", "log1p + standardisation for the logistic expert and the gate; trees use raw values.", BEH],
    ["Class imbalance", "Class weights in every expert + an F1-optimal decision threshold. No SMOTE.", ANA],
    ["Data leakage", "All preprocessing inside scikit-learn pipelines, refitted on each training fold only.", CTX],
  ];
  const w = 3.9, h = 2.4, gx = 0.2, gy = 0.3;
  cards.forEach(([t, d, c], i) => {
    const x = 0.6 + (i % 3) * (w + gx), y = 1.55 + Math.floor(i / 3) * (h + gy);
    box(s, { x, y, w, h, color: c, fill: 93 });
    circleNum(s, x + 0.25, y + 0.25, 0.5, c, String(i + 1), 15);
    txt(s, t, { x: x + 0.9, y: y + 0.25, w: w - 1.1, h: 0.5, bold: true, fontSize: 18, color: c, valign: "middle" });
    txt(s, d, { x: x + 0.25, y: y + 0.95, w: w - 0.5, h: h - 1.1, fontSize: 15 });
  });
}

// ======================================================================
// 8. Workflow
// ======================================================================
pres.addSection({ title: "Method" });
{
  const s = content("Proposed Project Workflow", "Method");
  const w = 2.15, h = 1.25, gap = 0.34, x0 = 0.6;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const top = [["Data input", "UCI CSV, 12,330 rows", NAVY], ["Cleaning", "drop 125 duplicates", NAVY],
               ["Train / test split", "stratified 80 / 20", NAVY], ["Preprocessing", "one-hot, log1p, scaling", NAVY],
               ["Feature grouping", "Behaviour · Context · Analytics", NAVY]];
  const bot = [["Evaluation", "F1, PR-AUC, confusion matrix", CTX], ["Prediction", "refit experts, score test set", ANA],
               ["Pick threshold", "max F1 on training data", NAVY], ["Train gate", "on out-of-fold probabilities", GATE],
               ["Train experts", "5-fold CV → out-of-fold probs", BEH]];
  const y1 = 1.7, y2 = 4.05;
  const lab = (t, d) => [B(t, { breakLine: true, fontSize: 16 }), R(d, { fontSize: 13, color: MUTED })];
  top.forEach(([t, d, c], i) => box(s, { x: xs[i], y: y1, w, h, color: c, fill: 92, text: lab(t, d) }));
  bot.forEach(([t, d, c], i) => box(s, { x: xs[i], y: y2, w, h, color: c, fill: 88, text: lab(t, d) }));
  for (let i = 0; i < 4; i++) arrow(s, xs[i] + w, y1 + h / 2, xs[i + 1], y1 + h / 2);
  arrow(s, xs[4] + w / 2, y1 + h, xs[4] + w / 2, y2);
  for (let i = 4; i > 0; i--) arrow(s, xs[i], y2 + h / 2, xs[i - 1] + w, y2 + h / 2);
  // dashed frame around training steps (rightmost three)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: xs[2] - 0.12, y: y2 - 0.15, w: 3 * w + 2 * gap + 0.24, h: h + 0.3, rectRadius: 0.1,
    fill: { color: WHITE, transparency: 100 }, line: { color: MUTED, width: 1, dashType: "dash" }, objectName: "frame_training" });
  txt(s, "training split only — the test set stays untouched", { x: xs[2], y: y2 + h + 0.22, w: 3 * w + 2 * gap, h: 0.35, align: "center", fontSize: 12, italic: true, color: MUTED });
  box(s, { x: 0.6, y: 6.1, w: 12.1, h: 0.6, color: NAVY, fill: 94, fontSize: 15,
    text: [R("The whole pipeline is repeated for "), B("10 random seeds (100–109)"), R("; results are reported as mean ± standard deviation.")] });
}

// ======================================================================
// 9. Feature grouping
// ======================================================================
{
  const s = content("Feature Grouping", "Method");
  box(s, { x: 3.9, y: 1.4, w: 5.5, h: 0.75, color: NAVY, fill: 90, text: [B("One session: 17 features")], fontSize: 18 });
  const groups = [
    ["Behaviour (6)", "What did the visitor do?", ["Administrative + Duration", "Informational + Duration", "ProductRelated + Duration"], BEH],
    ["Context (8)", "Who is visiting, and when?", ["VisitorType, Month", "Weekend, SpecialDay", "OperatingSystems, Browser", "Region, TrafficType"], CTX],
    ["Analytics (3)", "What do site metrics say?", ["BounceRates", "ExitRates", "PageValues"], ANA],
  ];
  const w = 3.85, gap = 0.27;
  groups.forEach(([t, q, f, c], i) => {
    const x = 0.6 + i * (w + gap);
    arrow(s, 6.65, 2.15, x + w / 2, 2.85, c);
    box(s, { x, y: 2.85, w, h: 3.35, color: c, fill: 92 });
    txt(s, t, { x: x + 0.25, y: 3.0, w: w - 0.5, h: 0.5, bold: true, fontSize: 22, color: c });
    txt(s, q, { x: x + 0.25, y: 3.5, w: w - 0.5, h: 0.4, italic: true, fontSize: 15, color: MUTED });
    txt(s, bullets(f, { space: 6 }), { x: x + 0.25, y: 4.05, w: w - 0.5, h: 2.0, fontSize: 16 });
  });
  txt(s, [R("Each group goes to its "), B("own expert"), R("; only the gating network sees all 17 features.")],
      { x: 0.6, y: 6.4, w: 12.1, h: 0.4, fontSize: 16, align: "center" });
}

// ======================================================================
// 10. Context-aware MoE: experts
// ======================================================================
{
  const s = content("Context-Aware Mixture of Experts Model", "Method");
  box(s, { x: 0.6, y: 1.75, w: 1.7, h: 4.2, color: NAVY, fill: 92, text: [B("Session", { breakLine: true }), R("17 features", { fontSize: 13, color: MUTED })], fontSize: 18 });
  const ex = [["Behaviour expert", "XGBoost", "P_B", BEH], ["Context expert", "XGBoost", "P_C", CTX], ["Analytics expert", "Logistic regression", "P_A", ANA]];
  ex.forEach(([t, m, p, c], i) => {
    const y = 1.75 + i * 1.5;
    arrow(s, 2.3, y + 0.6, 3.1, y + 0.6, c);
    box(s, { x: 3.1, y, w: 2.9, h: 1.2, color: c, fill: 88, text: [B(t, { breakLine: true }), R(m, { fontSize: 14 })], fontSize: 17 });
    arrow(s, 6.0, y + 0.6, 6.6, y + 0.6, c);
    txt(s, [B(p.split("_")[0]), R(p.split("_")[1], { subscript: true, bold: true })], { x: 6.7, y: y + 0.35, w: 0.6, h: 0.5, fontSize: 20, color: c, valign: "middle" });
  });
  const desc = [
    [B("Behaviour — XGBoost: ", { color: BEH }), R("non-linear effects of page counts and durations.")],
    [B("Context — XGBoost: ", { color: CTX }), R("learns combinations such as Month × VisitorType.")],
    [B("Analytics — Logistic regression: ", { color: ANA }), R("three smooth rate features; a simple, stable model is enough.")],
  ];
  txt(s, [R("Each expert sees only its own feature group and outputs a purchase probability, which is passed to the gate.", { breakLine: true, color: NAVY, bold: true })],
      { x: 7.7, y: 1.6, w: 5.0, h: 1.0, fontSize: 16 });
  txt(s, bullets(desc, { space: 12 }), { x: 7.7, y: 2.75, w: 5.0, h: 2.9, fontSize: 16 });
  txt(s, "All experts use class weights to deal with the 15.6% buyer rate.", { x: 7.7, y: 5.75, w: 5.0, h: 0.5, fontSize: 14, italic: true, color: MUTED });
}

// ======================================================================
// 11. Adaptive gating
// ======================================================================
{
  const s = content("Adaptive Gating Mechanism", "Method");
  box(s, { x: 0.6, y: 1.6, w: 2.8, h: 1.0, color: NAVY, fill: 92, text: [B("All 17 features", { breakLine: true }), R("pre-processed", { fontSize: 13, color: MUTED })], fontSize: 16 });
  box(s, { x: 0.6, y: 3.2, w: 2.8, h: 1.2, color: GATE, fill: 85, text: [B("Gating network", { breakLine: true }), R("small MLP → softmax", { fontSize: 13 })], fontSize: 16 });
  arrow(s, 2.0, 2.6, 2.0, 3.2);
  box(s, { x: 0.6, y: 5.0, w: 2.8, h: 1.1, color: GATE, fill: 95, fontSize: 16, text: [
    B("w", { color: BEH }), R("B", { subscript: true, color: BEH }), R("  "), B("w", { color: CTX }), R("C", { subscript: true, color: CTX }), R("  "),
    B("w", { color: ANA }), R("A", { subscript: true, color: ANA, breakLine: true }), R("≥ 0, sum = 1", { fontSize: 13, color: MUTED })] });
  arrow(s, 2.0, 4.4, 2.0, 5.0);
  // expert probs
  box(s, { x: 4.4, y: 1.6, w: 3.1, h: 1.0, color: NAVY, fill: null, fontSize: 18, text: [
    B("P", { color: BEH }), R("B", { subscript: true, color: BEH }), R("    "), B("P", { color: CTX }), R("C", { subscript: true, color: CTX }), R("    "),
    B("P", { color: ANA }), R("A", { subscript: true, color: ANA })] });
  txt(s, "from the experts", { x: 4.4, y: 1.25, w: 3.1, h: 0.3, fontSize: 12, color: MUTED, align: "center" });
  box(s, { x: 4.4, y: 3.2, w: 3.1, h: 1.2, color: NAVY, fill: 88, fontSize: 16, text: [B("Combine in log-odds", { breakLine: true }), R("Σ w", { fontSize: 15 }), R("j", { subscript: true }), R(" · logit P", { fontSize: 15 }), R("j", { subscript: true })] });
  arrow(s, 5.95, 2.6, 5.95, 3.2);
  seg(s, 3.4, 5.55, 3.9, 5.55, GATE); seg(s, 3.9, 5.55, 3.9, 3.8, GATE); arrow(s, 3.9, 3.8, 4.4, 3.8, GATE);
  box(s, { x: 4.4, y: 5.0, w: 3.1, h: 1.1, color: ANA, fill: 85, fontSize: 16, text: [B("P(purchase)", { breakLine: true }), R("= σ(α · sum + β)", { fontSize: 14 })] });
  arrow(s, 6.3, 4.4, 6.3, 5.0);

  txt(s, bullets([
    [R("The gate looks at the "), B("whole session"), R(" and outputs one weight per expert.")],
    [R("Weights change "), B("from session to session"), R(" — this is what makes the model context-aware.")],
    [R("Opinions are added in "), B("log-odds"), R(", so experts that agree reinforce each other: two experts at 60% give ≈69%, not 60%.")],
    [R("Tiny network: about 1k parameters, trained with AdamW and early stopping.")],
  ], { space: 14 }), { x: 8.2, y: 1.6, w: 4.5, h: 4.9, fontSize: 16 });
}

// ======================================================================
// 12. Implementation & training
// ======================================================================
{
  const s = content("Model Implementation and Training Process", "Method");
  const steps = [
    ["Stratified 80/20 split — the test set is locked away.", NAVY],
    ["5-fold CV: each expert predicts sessions it has not seen → out-of-fold (OOF) probabilities.", BEH],
    ["Train the gate on the OOF probabilities (binary cross-entropy).", GATE],
    ["Choose threshold τ* that maximises F1 on the training OOF predictions.", NAVY],
    ["Refit experts on the full training split; apply experts + gate to the test set.", ANA],
  ];
  steps.forEach(([t, c], i) => {
    const y = 1.45 + i * 0.98;
    circleNum(s, 0.6, y + 0.12, 0.55, c, String(i + 1), 16);
    box(s, { x: 1.3, y, w: 5.6, h: 0.8, color: c, fill: 93, text: t, align: "left", fontSize: 14 });
  });
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY } } });
  s.addTable([
    [hdr("Part"), hdr("Settings")],
    [{ text: "Behaviour & Context experts", options: { bold: true, color: BEH } }, "XGBoost: 400 trees, depth 4, learning rate 0.05, subsample 0.8, class-weighted"],
    [{ text: "Analytics expert", options: { bold: true, color: ANA } }, "Logistic regression, log1p + scaling, balanced classes, C = 1"],
    [{ text: "Gate", options: { bold: true, color: GATE } }, "Linear(d→16) – ReLU – Linear(16→3) – softmax; AdamW, lr 0.01, weight decay 1e-3, early stopping (patience 50)"],
    ["Repeats", "10 seeds (100–109)"],
    ["Tools", "Python, scikit-learn, XGBoost, PyTorch (CPU)"],
  ], { x: 7.3, y: 1.45, w: 5.4, colW: [1.7, 3.7], fontSize: 13, color: INK, valign: "middle",
       border: { type: "solid", color: HEX.accent6, pt: 0.75 }, fill: { color: WHITE }, objectName: "table_settings" });
  txt(s, [B("Why out-of-fold? "), R("The gate must learn how experts behave on unseen data; otherwise it over-trusts them.")],
      { x: 7.3, y: 5.75, w: 5.4, h: 0.8, fontSize: 14, color: MUTED });
}

// ======================================================================
// 13. Prediction process (real seed-100 test session)
// ======================================================================
{
  const s = content("Prediction Process — One Real Test Session", "Method");
  box(s, { x: 0.6, y: 1.55, w: 2.7, h: 2.9, color: NAVY, fill: 93, align: "left", valign: "top", fontSize: 14, text: [
    B("Session (test set)", { breakLine: true, fontSize: 15, color: NAVY }), R(" ", { breakLine: true, fontSize: 6 }),
    R("101 product pages", { breakLine: true }), R("3,094 s on product pages", { breakLine: true }),
    R("PageValues 56.7", { breakLine: true }), R("ExitRates 0.015", { breakLine: true }), R("November", { breakLine: true }), R("Returning visitor")] });
  const ex = [["Behaviour", "0.63", BEH], ["Context", "0.75", CTX], ["Analytics", "0.97", ANA]];
  ex.forEach(([t, p, c], i) => {
    const y = 1.55 + i * 1.0;
    box(s, { x: 3.85, y, w: 2.2, h: 0.85, color: c, fill: 88, fontSize: 15, text: [B(t + "  "), R("P = " + p)] });
    arrow(s, 3.3, 3.0, 3.85, y + 0.42, c, 1.25);
    arrow(s, 6.05, y + 0.42, 6.6, 3.0, c, 1.25);
  });
  box(s, { x: 6.6, y: 2.0, w: 2.2, h: 2.0, color: GATE, fill: 88, fontSize: 15, text: [
    B("Gate weights", { breakLine: true }), R("Behaviour 0.22", { color: BEH, breakLine: true, bold: true }),
    R("Context 0.77", { color: CTX, breakLine: true, bold: true }), R("Analytics 0.01", { color: ANA, bold: true })] });
  arrow(s, 8.8, 3.0, 9.3, 3.0);
  box(s, { x: 9.3, y: 2.2, w: 1.7, h: 1.6, color: ANA, fill: 85, text: [R("P(purchase)", { breakLine: true, fontSize: 14 }), B("0.71", { fontSize: 30, color: ANA })] });
  arrow(s, 11.0, 3.0, 11.35, 3.0);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.35, y: 2.2, w: 1.35, h: 1.6, rectRadius: 0.08, fill: { color: NAVY }, line: { color: NAVY }, objectName: "decision" });
  txt(s, [B("BUY", { fontSize: 26, breakLine: true }), R("0.71 ≥ τ* = 0.24", { fontSize: 11 })], { x: 11.35, y: 2.2, w: 1.35, h: 1.6, align: "center", valign: "middle", color: WHITE });

  box(s, { x: 0.6, y: 4.85, w: 5.9, h: 1.7, color: NAVY, fill: 94, align: "left", valign: "top", fontSize: 14, text: [
    B("Steps", { breakLine: true, color: NAVY, fontSize: 15 }),
    R("1. Split the session into its three feature groups.  2. Each expert gives a probability.  3. The gate weighs the experts.  4. Log-odds combination gives P.  5. Compare P with the threshold τ*.")] });
  box(s, { x: 6.8, y: 4.85, w: 5.9, h: 1.7, color: ANA, fill: 92, align: "left", valign: "top", fontSize: 14, text: [
    B("Result: true label = purchase ✓", { breakLine: true, color: ANA, fontSize: 15 }),
    R("For this returning November shopper the gate relied mostly on the Context expert. Contrast: a short session with PageValues = 0 got Analytics weight 0.98 and P = 0.03 → No buy (also correct).")] });
  txt(s, "Values from the seed-100 test set; τ* is the threshold learned on that seed's training data.",
      { x: 0.6, y: 6.62, w: 12.1, h: 0.3, fontSize: 11, italic: true, color: MUTED });
}

// ======================================================================
// 14. Evaluation
// ======================================================================
pres.addSection({ title: "Results" });
{
  const s = content("Model Evaluation", "Results");
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY } } });
  s.addTable([
    [hdr("Metric"), hdr("What it tells us")],
    ["Accuracy", "share of all sessions predicted correctly"],
    ["Precision", "of predicted buyers, how many really bought"],
    ["Recall", "of real buyers, how many we found"],
    [{ text: "F1-score", options: { bold: true, color: NAVY } }, { text: "balance of precision and recall (main metric)", options: { bold: true } }],
    ["Balanced accuracy", "average recall of the two classes"],
    ["PR-AUC", "how well buyers are ranked, over all thresholds"],
    ["ROC-AUC", "how well the two classes are separated"],
  ], { x: 0.6, y: 1.45, w: 6.6, colW: [2.1, 4.5], fontSize: 14, color: INK, rowH: 0.5, valign: "middle",
       border: { type: "solid", color: HEX.accent6, pt: 0.75 }, fill: { color: WHITE }, objectName: "table_metrics" });
  txt(s, "With 84.4% non-buyers, always predicting “no buy” already gives 84.4% accuracy — so F1 and PR-AUC are the focus.",
      { x: 0.6, y: 5.75, w: 6.6, h: 0.8, fontSize: 14, italic: true, color: MUTED });

  // confusion matrix
  const cx = 9.0, cy = 2.3, cw = 1.75, chh = 1.45;
  txt(s, "Confusion matrix — test set, mean of 10 seeds", { x: 7.7, y: 1.45, w: 5.0, h: 0.4, bold: true, fontSize: 15, color: NAVY, align: "center" });
  txt(s, "Predicted", { x: cx, y: cy - 0.42, w: 2 * cw, h: 0.3, align: "center", bold: true, fontSize: 13 });
  txt(s, "No buy", { x: cx, y: cy - 0.12, w: cw, h: 0.1, align: "center", fontSize: 12, valign: "bottom" });
  txt(s, "Buy", { x: cx + cw, y: cy - 0.12, w: cw, h: 0.1, align: "center", fontSize: 12, valign: "bottom" });
  txt(s, "Actual", { x: 7.65, y: cy, w: 0.4, h: 2 * chh, align: "center", valign: "middle", bold: true, fontSize: 13, vert: "vert270" });
  txt(s, "No buy", { x: 8.05, y: cy, w: 0.9, h: chh, align: "right", valign: "middle", fontSize: 12 });
  txt(s, "Buy", { x: 8.05, y: cy + chh, w: 0.9, h: chh, align: "right", valign: "middle", fontSize: 12 });
  const cells = [["1,856", "true negatives", ANA, 70], ["203", "false positives", CTX, 80], ["93", "false negatives", CTX, 80], ["289", "true positives", ANA, 70]];
  cells.forEach(([v, l, c, t], i) => {
    const x = cx + (i % 2) * cw, y = cy + Math.floor(i / 2) * chh;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: chh, fill: { color: c, transparency: t }, line: { color: WHITE, width: 2 }, objectName: nm("cm") });
    txt(s, [B(v, { fontSize: 26, breakLine: true }), R(l, { fontSize: 12 })], { x, y, w: cw, h: chh, align: "center", valign: "middle" });
  });
  txt(s, "2,441 test sessions per seed (382 buyers)", { x: cx, y: cy + 2 * chh + 0.12, w: 2 * cw, h: 0.35, align: "center", fontSize: 12, color: MUTED });
}

// ======================================================================
// 15a. Results — performance
// ======================================================================
{
  const s = content("Results (1/2): Test-Set Performance", "Results");
  const k = [["0.661", "F1-score", NAVY], ["0.756", "Recall", ANA], ["0.589", "Precision", BEH], ["0.703", "PR-AUC", CTX], ["0.900", "ROC-AUC", GATE]];
  const w = 2.26, gap = 0.2;
  k.forEach(([v, l, c], i) => {
    const x = 0.6 + i * (w + gap);
    box(s, { x, y: 1.4, w, h: 1.3, color: c, fill: 90 });
    txt(s, v, { x, y: 1.45, w, h: 0.75, align: "center", valign: "middle", bold: true, fontSize: 32, color: c });
    txt(s, l, { x, y: 2.2, w, h: 0.4, align: "center", fontSize: 14 });
  });
  const metrics = [["Accuracy", 0.879], ["Balanced acc.", 0.829], ["Precision", 0.589], ["Recall", 0.756], ["F1-score", 0.661], ["PR-AUC", 0.703], ["ROC-AUC", 0.900]];
  s.addChart(pres.charts.BAR, [{ name: "Mean over 10 seeds", labels: metrics.map(m => m[0]), values: metrics.map(m => m[1]) }], {
    ...chartBase, x: 0.5, y: 2.95, w: 6.3, h: 3.85, barDir: "bar", title: "All metrics, mean of 10 seeds (std 0.008–0.031)",
    chartColors: [HEX.dk2], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", showLegend: false,
    valAxisMinVal: 0, valAxisMaxVal: 1, valAxisHidden: true, valGridLine: { style: "none" }, barGapWidthPct: 45,
    catAxisOrientation: "maxMin", objectName: "chart_metrics" });
  const xs = DATA.pr.map(p => p[0]), ys = DATA.pr.map(p => p[1]);
  s.addChart(pres.charts.SCATTER, [
    { name: "Recall", values: xs },
    { name: "Precision (seed 100)", values: ys },
    { name: "Random classifier", values: xs.map(() => 0.156) },
  ], { ...chartBase, x: 7.0, y: 2.95, w: 5.8, h: 3.85, title: "Precision–recall curve (seed 100, PR-AUC 0.67)",
       chartColors: [HEX.accent1, HEX.accent5], lineSize: 2, lineDataSymbol: "none", showLegend: true, legendPos: "b", legendFontSize: 11,
       valAxisMinVal: 0, valAxisMaxVal: 1, catAxisMinVal: 0, catAxisMaxVal: 1, valAxisLabelFormatCode: "0.0", catAxisLabelFormatCode: "0.0",
       catAxisLabelFontSize: 11, showValAxisTitle: true, valAxisTitle: "Precision", showCatAxisTitle: true, catAxisTitle: "Recall",
       valAxisTitleFontSize: 11, catAxisTitleFontSize: 11, valAxisTitleColor: HEX.accent5, catAxisTitleColor: HEX.accent5,
       objectName: "chart_pr_curve" });
}

// ======================================================================
// 15b. Results — gate behaviour
// ======================================================================
{
  const s = content("Results (2/2): What the Gate Learned", "Results");
  const cols = [HEX.accent1, HEX.accent2, HEX.accent3];
  const cw = 3.95, cy = 1.35, ch = 3.75;
  const common = { ...chartBase, barDir: "col", barGrouping: "clustered", chartColors: cols, showLegend: true, legendPos: "b",
    legendFontSize: 11, valAxisMinVal: 0, valAxisMaxVal: 1, valAxisLabelFormatCode: "0.0", barGapWidthPct: 50 };
  s.addChart(pres.charts.BAR, [
    { name: "Behaviour", labels: ["Non-buyers", "Buyers"], values: [0.039, 0.12] },
    { name: "Context", labels: ["Non-buyers", "Buyers"], values: [0.101, 0.34] },
    { name: "Analytics", labels: ["Non-buyers", "Buyers"], values: [0.86, 0.541] },
  ], { ...common, x: 0.5, y: cy, w: cw, h: ch, title: "(a) Mean weight by outcome", objectName: "chart_gate_outcome" });
  const qLabels = ["1–6", "7–13", "14–24", "25–46", "47–705"];
  s.addChart(pres.charts.LINE, ["Behaviour", "Context", "Analytics"].map((nme, j) => ({
    name: nme, labels: qLabels, values: DATA.depth.map(d => Math.round(d[j + 1] * 1000) / 1000) })),
    { ...chartBase, x: 4.69, y: cy, w: cw, h: ch, title: "(b) Weight vs pages viewed", chartColors: cols, lineSize: 2.5,
      lineDataSymbol: "circle", lineDataSymbolSize: 7, showLegend: true, legendPos: "b", legendFontSize: 11,
      valAxisMinVal: 0, valAxisMaxVal: 1, valAxisLabelFormatCode: "0.0", catAxisLabelFontSize: 11, objectName: "chart_gate_depth" });
  s.addChart(pres.charts.BAR, [
    { name: "Behaviour", labels: ["New", "Other", "Returning"], values: [0.062, 0.068, 0.05] },
    { name: "Context", labels: ["New", "Other", "Returning"], values: [0.047, 0.053, 0.154] },
    { name: "Analytics", labels: ["New", "Other", "Returning"], values: [0.891, 0.879, 0.797] },
  ], { ...common, x: 8.88, y: cy, w: cw, h: ch, title: "(c) Mean weight by visitor type", objectName: "chart_gate_visitor" });
  const obs = [
    [B("(a) ", { color: NAVY }), R("Non-buyers: Analytics weight ≈ 0.86. Buyers: Context weight is 3.4× higher (0.34 vs 0.10).")],
    [B("(b) ", { color: NAVY }), R("The more product pages viewed, the more the gate shifts from Analytics to Context.")],
    [B("(c) ", { color: NAVY }), R("Returning visitors get about 3× more Context weight than new visitors (0.15 vs 0.05).")],
  ];
  obs.forEach((o, i) => txt(s, o, { x: 0.65 + i * 4.19, y: 5.2, w: 3.75, h: 0.95, fontSize: 14 }));
  txt(s, [B("Overall: "), R("results are stable across seeds (F1 std 0.012); recall 0.76 means about 3 in 4 buyers are found.")],
      { x: 0.65, y: 6.3, w: 12.0, h: 0.45, fontSize: 14, color: NAVY });
}

// ======================================================================
// 16. Challenges / limitations / future
// ======================================================================
pres.addSection({ title: "Wrap-up" });
{
  const s = content("Challenges, Limitations and Future Improvements", "Wrap-up");
  const cols = [
    ["Challenges", NAVY, ["Strong class imbalance (15.6% buyers).", "Avoiding data leakage when training the gate — solved with out-of-fold predictions.", "The gate tends to lean heavily on the Analytics expert."]],
    ["Limitations", CTX, ["Experts cannot learn interactions between groups; a single all-feature Random Forest scored higher in our development runs (F1 ≈ 0.68).", "PageValues may partly be known only after a purchase.", "Features summarise the whole session, so it is not real-time.", "Feature groups were chosen by hand."]],
    ["Future work", ANA, ["Share key features (e.g. PageValues) across experts.", "Calibrate expert probabilities before pooling.", "Regularise the gate (entropy bonus).", "Learn the feature groups; train end-to-end.", "Cost-sensitive threshold; early-session data."]],
  ];
  const w = 3.9, gap = 0.2;
  cols.forEach(([t, c, items], i) => {
    const x = 0.6 + i * (w + gap);
    box(s, { x, y: 1.5, w, h: 5.2, color: c, fill: 93 });
    circleNum(s, x + 0.25, 1.72, 0.5, c, String(i + 1), 15);
    txt(s, t, { x: x + 0.9, y: 1.72, w: w - 1.1, h: 0.5, bold: true, fontSize: 20, color: c, valign: "middle" });
    txt(s, bullets(items, { space: 10 }), { x: x + 0.25, y: 2.5, w: w - 0.5, h: 4.05, fontSize: 16 });
  });
}

// ======================================================================
// 17. Conclusion and Q&A
// ======================================================================
{
  const s = content("Conclusion", "Wrap-up");
  txt(s, bullets([
    [R("Built a complete, leakage-free pipeline on the UCI Online Shoppers dataset (12,205 sessions).")],
    [R("Split the features into "), B("Behaviour", { color: BEH }), R(", "), B("Context", { color: CTX }), R(" and "), B("Analytics", { color: ANA }), R(" groups, with one expert each.")],
    [R("An adaptive gate combines the experts for each session in log-odds space.")],
    [R("Test results: "), B("F1 0.661"), R(", recall 0.756, PR-AUC 0.703, ROC-AUC 0.900, stable across 10 seeds.")],
    [R("The gate is interpretable: it trusts Analytics for clear non-buyers and Context for engaged, returning shoppers.")],
  ], { space: 16 }), { x: 0.6, y: 1.4, w: 7.6, h: 5.2, fontSize: 18 });
  const kp = [["0.661", "F1-score", NAVY], ["0.756", "Recall", ANA], ["0.900", "ROC-AUC", GATE]];
  kp.forEach(([v, l, c], i) => {
    const y = 1.5 + i * 1.75;
    box(s, { x: 9.0, y, w: 3.7, h: 1.45, color: c, fill: 90 });
    txt(s, v, { x: 9.0, y: y + 0.1, w: 3.7, h: 0.8, align: "center", valign: "middle", bold: true, fontSize: 32, color: c });
    txt(s, l, { x: 9.0, y: y + 0.9, w: 3.7, h: 0.4, align: "center", fontSize: 15 });
  });
  txt(s, "Code & results: [repository link]", { x: 9.0, y: 6.75, w: 3.7, h: 0.35, align: "center", fontSize: 12, color: MUTED });
}

// ======================================================================
// Member contributions
// ======================================================================
{
  const s = content("Contribution of Each Member", "Wrap-up");
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY } } });
  const rows = [[hdr("#"), hdr("Member"), hdr("Roll No."), hdr("Contribution")]];
  const work = [
    ["Data & modelling", "Explored the dataset and class imbalance, helped design the feature groups, and took part in tuning the experts and checking the results."],
    ["Preprocessing & experts", "Built the encoding and scaling pipelines, helped implement the XGBoost experts, and reviewed the evaluation metrics."],
    ["Experts & gating", "Worked on the Behaviour and Context experts, helped build the gating network, and analysed the gate weights."],
    ["Gating & training", "Implemented the log-odds pooling and gate training, helped set up the cross-validation protocol, and prepared the result charts."],
    ["Evaluation & analysis", "Ran the 10-seed experiments, chose the decision threshold, helped with the EDA, and interpreted the confusion matrix."],
    ["Results & reporting", "Compiled the results, helped design the workflow and the analytics expert, and wrote the report and the presentation."],
  ];
  work.forEach(([area, desc], k) => rows.push([String(k + 1), { text: `[Member ${k + 1}]`, options: { bold: true } }, "[Roll No.]",
    { text: [B(area + ": ", { color: NAVY }), R(desc)] }]));
  s.addTable(rows, { x: 0.45, y: 1.2, w: 12.4, colW: [0.45, 2.0, 1.45, 8.5], fontSize: 14, color: INK, rowH: 0.8, valign: "middle",
    border: { type: "solid", color: HEX.accent6, pt: 0.75 }, fill: { color: WHITE }, objectName: "table_contributions" });
}

// ======================================================================
// Thank you / Q&A (template's closing slide)
// ======================================================================
{
  const s = pres.addSlide({ masterName: "Beamer Plain", sectionTitle: "Wrap-up" });
  s.addText("THANK YOU", { placeholder: "title" });
  txt(s, "Questions?", { x: 1, y: 3.9, w: W - 2, h: 0.6, align: "center", fontSize: 22, color: MUTED });
}

// ---------------------------------------------------------------- write
(async () => {
  const out = path.join(__dirname, "MoE_Purchase_Intention.pptx");
  pres.slides.forEach((sl, k) => {
    const o = { y: FY, h: FH, fontSize: 11, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true };
    sl.addText(TOPIC, { ...o, x: FW, w: FW, objectName: `footer_topic_${k + 1}` });
  });
  await pres.writeFile({ fileName: out });
  const { applyTheme } = require(process.env.APPLY_THEME);
  await applyTheme(out, THEME);
  if (pres.slides.length !== TOTAL) throw new Error(`TOTAL is ${TOTAL} but deck has ${pres.slides.length} slides`);
  require("child_process").execFileSync("python", [path.join(__dirname, "color_bullets.py"), out, THEME.colors.dk2], { stdio: "inherit" });
  console.log("wrote", out);
})();
