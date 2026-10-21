import re, html, sys, pathlib

src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
out = pathlib.Path(sys.argv[2])

def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'`(.+?)`', r'<code>\1</code>', t)
    return t

lines = src.split('\n')
body, i = [], 0
para, ul, ol = [], [], []

def flush():
    global para, ul, ol
    if para:
        body.append('<p>' + inline(' '.join(para)) + '</p>'); para = []
    if ul:
        body.append('<ul>' + ''.join('<li>' + inline(x) + '</li>' for x in ul) + '</ul>'); ul = []
    if ol:
        body.append('<ol>' + ''.join('<li>' + inline(x) + '</li>' for x in ol) + '</ol>'); ol = []

while i < len(lines):
    ln = lines[i]
    st = ln.strip()

    if st.startswith('|'):
        flush()
        rows = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
            rows.append(cells); i += 1
        sep = next((k for k, r in enumerate(rows)
                    if r and all(re.fullmatch(r':?-{2,}:?', c) for c in r)), None)
        head = rows[:sep] if sep is not None else []
        data = rows[sep + 1:] if sep is not None else rows
        t = ['<table>']
        if head:
            t.append('<thead>' + ''.join(
                '<tr>' + ''.join('<th>' + inline(c) + '</th>' for c in r) + '</tr>' for r in head) + '</thead>')
        t.append('<tbody>' + ''.join(
            '<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in r) + '</tr>' for r in data) + '</tbody></table>')
        body.append(''.join(t))
        continue

    if re.fullmatch(r'-{3,}', st):
        flush(); body.append('<hr>'); i += 1; continue

    m = re.match(r'^(#{1,4})\s+(.*)', st)
    if m:
        flush(); lv = len(m.group(1))
        body.append(f'<h{lv}>' + inline(m.group(2)) + f'</h{lv}>'); i += 1; continue

    m = re.match(r'^-\s+(.*)', st)
    if m:
        if para: flush()
        ul.append(m.group(1)); i += 1
        while i < len(lines) and lines[i].startswith('  ') and lines[i].strip() \
                and not re.match(r'^\s*[-|]', lines[i]):
            ul[-1] += ' ' + lines[i].strip(); i += 1
        continue

    m = re.match(r'^(\d+)\.\s+(.*)', st)
    if m:
        if para: flush()
        ol.append(m.group(2)); i += 1
        while i < len(lines) and lines[i].startswith('   ') and lines[i].strip():
            ol[-1] += ' ' + lines[i].strip(); i += 1
        continue

    if not st:
        flush(); i += 1; continue

    if ul or ol: flush()
    para.append(st); i += 1

flush()
content = '\n'.join(body)

CSS = """
@page { size: A4; margin: 18mm 16mm 16mm; }
:root {
  --gold:#CBAA58; --gold-dark:#A66E0E; --gold-text:#8A5B0B;
  --red:#993122; --brown:#3C1F0C; --bg2:#F4EFE6; --grey:#6b645c;
}
* { box-sizing:border-box; }
body {
  margin:0; background:#fff; color:#2b2621;
  font-family:'PT Sans','Helvetica Neue',Arial,sans-serif;
  font-size:10.2pt; line-height:1.55; -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
h1,h2,h3,h4 { font-family:'PT Serif',Georgia,serif; color:var(--brown); break-after:avoid; }
h1 { font-size:26pt; line-height:1.15; margin:0 0 4pt; }
h2 {
  font-size:15pt; margin:20pt 0 7pt; padding-bottom:4pt;
  border-bottom:1.5px solid var(--gold); color:var(--gold-text); break-before:auto;
}
h3 { font-size:11.6pt; margin:14pt 0 5pt; color:var(--red); }
h4 { font-size:10.4pt; margin:11pt 0 4pt; }
p { margin:0 0 7pt; }
strong { color:var(--brown); }
code {
  font-family:'SF Mono',Menlo,monospace; font-size:.88em;
  background:var(--bg2); padding:1px 4px; border-radius:2px; color:var(--gold-text);
}
ul,ol { margin:0 0 8pt; padding-left:17pt; }
li { margin-bottom:3pt; }
hr { border:0; border-top:1px solid #e0d8c8; margin:16pt 0; }
table { width:100%; border-collapse:collapse; margin:6pt 0 11pt; font-size:9.2pt; }
th {
  background:var(--bg2); color:var(--brown); text-align:left; font-weight:600;
  padding:5pt 7pt; border:1px solid #ddd3c0;
}
td { padding:5pt 7pt; border:1px solid #e6ded0; vertical-align:top; }
tr { break-inside:avoid; }
thead { display:table-header-group; }
.cover {
  border-top:5px solid var(--red); padding-top:14pt; margin-bottom:22pt;
}
.cover .brand {
  font-family:'Kurale','PT Serif',Georgia,serif; font-size:11pt; letter-spacing:.14em;
  text-transform:uppercase; color:var(--gold-dark); margin-bottom:10pt;
}
.cover .meta { color:var(--grey); font-size:9.5pt; margin-top:6pt; }
h2 + p, h3 + p { margin-top:0; }
"""

doc = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<title>Peetri Toll — объём разработки сайта</title>
<style>{CSS}</style></head>
<body><div class="cover"><div class="brand">Tavern Peetri Toll</div></div>
{content}
</body></html>"""

out.write_text(doc, encoding='utf-8')
print('HTML:', out, len(doc), 'байт')
