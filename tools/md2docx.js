const fs = require('fs');
const D = require('docx');

const srcPath = process.argv[2];
const outPath = process.argv[3];
const md = fs.readFileSync(srcPath, 'utf8');

const CONTENT_W = 9638;            // A4 минус поля по 2 см
const GOLD = 'CBAA58', GOLD_TXT = '8A5B0B', RED = '993122', BROWN = '3C1F0C', BG2 = 'F4EFE6';

// В Word эмодзи подставляются чужим шрифтом и выглядят мусором — убираем,
// смысл и так несут сами формулировки.
const clean = (t) => t
  .replace(/[✅❌❓]\s*/g, '')
  .replace(/🟡\s*/g, '')
  .trim();

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new D.TextRun({ ...base, text: text.slice(last, m.index) }));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new D.TextRun({ ...base, text: tok.slice(2, -2), bold: true, color: base.color || BROWN }));
    else out.push(new D.TextRun({ ...base, text: tok.slice(1, -1), font: 'Consolas', color: GOLD_TXT }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new D.TextRun({ ...base, text: text.slice(last) }));
  return out.length ? out : [new D.TextRun({ ...base, text: '' })];
}

function colWidths(n) {
  const p = n === 2 ? [0.38, 0.62] : n === 3 ? [0.3, 0.35, 0.35] : Array(n).fill(1 / n);
  const w = p.map((x) => Math.round(CONTENT_W * x));
  w[w.length - 1] = CONTENT_W - w.slice(0, -1).reduce((a, b) => a + b, 0);
  return w;
}

function makeTable(head, body) {
  const n = (head[0] || body[0]).length;
  const widths = colWidths(n);
  const row = (cells, isHead) => new D.TableRow({
    tableHeader: isHead,
    children: cells.map((c, i) => new D.TableCell({
      width: { size: widths[i], type: D.WidthType.DXA },
      shading: isHead ? { type: D.ShadingType.CLEAR, fill: BG2, color: 'auto' } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new D.Paragraph({
        spacing: { after: 0, line: 260 },
        children: runs(clean(c), isHead ? { bold: true, color: BROWN } : {}),
      })],
    })),
  });
  return new D.Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: D.WidthType.DXA },
    borders: {
      top: { style: D.BorderStyle.SINGLE, size: 2, color: 'D6CCBA' },
      bottom: { style: D.BorderStyle.SINGLE, size: 2, color: 'D6CCBA' },
      left: { style: D.BorderStyle.SINGLE, size: 2, color: 'D6CCBA' },
      right: { style: D.BorderStyle.SINGLE, size: 2, color: 'D6CCBA' },
      insideHorizontal: { style: D.BorderStyle.SINGLE, size: 2, color: 'E6DED0' },
      insideVertical: { style: D.BorderStyle.SINGLE, size: 2, color: 'E6DED0' },
    },
    rows: [...head.map((r) => row(r, true)), ...body.map((r) => row(r, false))],
  });
}

// ---------- разбор markdown ----------
const lines = md.split('\n');
const kids = [];
let i = 0, para = [];

const flushPara = () => {
  if (!para.length) return;
  kids.push(new D.Paragraph({ spacing: { after: 140, line: 276 }, children: runs(clean(para.join(' '))) }));
  para = [];
};

while (i < lines.length) {
  const raw = lines[i], st = raw.trim();

  if (st.startsWith('|')) {
    flushPara();
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      i++;
    }
    const sep = rows.findIndex((r) => r.length && r.every((c) => /^:?-{2,}:?$/.test(c)));
    const head = sep >= 0 ? rows.slice(0, sep) : [];
    const body = sep >= 0 ? rows.slice(sep + 1) : rows;
    kids.push(makeTable(head, body));
    kids.push(new D.Paragraph({ spacing: { after: 160 }, children: [] }));
    continue;
  }

  if (/^-{3,}$/.test(st)) {
    flushPara();
    kids.push(new D.Paragraph({
      spacing: { before: 120, after: 200 },
      border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: GOLD, space: 1 } },
      children: [],
    }));
    i++; continue;
  }

  let m = st.match(/^(#{1,4})\s+(.*)/);
  if (m) {
    flushPara();
    const lv = m[1].length, txt = clean(m[2]);
    if (lv === 1) kids.push(new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: runs(txt, { font: 'Georgia', size: 44, bold: true, color: BROWN }) }));
    else kids.push(new D.Paragraph({
      heading: lv === 2 ? D.HeadingLevel.HEADING_1 : lv === 3 ? D.HeadingLevel.HEADING_2 : D.HeadingLevel.HEADING_3,
      children: runs(txt),
    }));
    i++; continue;
  }

  m = st.match(/^-\s+(.*)/);
  if (m) {
    flushPara();
    let txt = m[1]; i++;
    while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-|#]/.test(lines[i])) { txt += ' ' + lines[i].trim(); i++; }
    kids.push(new D.Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 80, line: 276 }, children: runs(clean(txt)) }));
    continue;
  }

  m = st.match(/^(\d+)\.\s+(.*)/);
  if (m) {
    flushPara();
    let txt = m[2]; i++;
    while (i < lines.length && /^\s{3,}\S/.test(lines[i])) { txt += ' ' + lines[i].trim(); i++; }
    kids.push(new D.Paragraph({ numbering: { reference: 'num', level: 0 }, spacing: { after: 100, line: 276 }, children: runs(clean(txt)) }));
    continue;
  }

  if (!st) { flushPara(); i++; continue; }
  para.push(st); i++;
}
flushPara();

const doc = new D.Document({
  creator: 'Tavern Peetri Toll',
  title: 'Сайт Peetri Toll — что входит в разработку',
  description: 'Документ для согласования объёма разработки',
  numbering: {
    config: [
      { reference: 'bul', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] },
      { reference: 'num', levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21, color: '2B2621' }, paragraph: { spacing: { after: 140, line: 276 } } },
      title: { run: { font: 'Georgia', size: 44, bold: true, color: BROWN }, paragraph: { spacing: { after: 120 } } },
      heading1: {
        run: { font: 'Georgia', size: 30, bold: true, color: GOLD_TXT },
        paragraph: { spacing: { before: 360, after: 160 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } }, keepNext: true },
      },
      heading2: { run: { font: 'Georgia', size: 24, bold: true, color: RED }, paragraph: { spacing: { before: 260, after: 110 }, keepNext: true } },
      heading3: { run: { font: 'Georgia', size: 21, bold: true, color: BROWN }, paragraph: { spacing: { before: 200, after: 90 }, keepNext: true } },
    },
  },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    children: [
      new D.Paragraph({
        spacing: { after: 240 },
        border: { bottom: { style: D.BorderStyle.SINGLE, size: 18, color: RED, space: 8 } },
        children: [new D.TextRun({ text: 'TAVERN PEETRI TOLL', font: 'Georgia', size: 20, bold: true, color: GOLD_TXT, characterSpacing: 60 })],
      }),
      ...kids,
    ],
  }],
});

D.Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log('записан', outPath, (buf.length / 1024).toFixed(0) + ' КБ');
});
