# tools

Вспомогательные скрипты. К сайту отношения не имеют — на страницы ничего отсюда
не подключается, правило «только чистые HTML/CSS/JS» их не касается.

## md2pdf.py — PDF из Markdown для заказчицы

Собирает `SCOPE.pdf` в фирменном оформлении: палитра из `css/style.css`,
заголовки PT Serif, текст PT Sans. Шрифты системные, сеть не нужна.

```bash
python3 tools/md2pdf.py SCOPE.md /tmp/scope.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=SCOPE.pdf file:///tmp/scope.html
```

Поддерживает подмножество Markdown, которое есть в SCOPE.md: заголовки,
абзацы, списки, нумерованные списки, таблицы, `**жирный**`, `` `код` ``,
горизонтальные линии.

Почему не Google Fonts: в headless-прогоне внешние шрифты подтягиваются
ненадёжно, и кириллица уходит в невстроенный базовый шрифт. PT Serif и PT Sans
стоят в macOS, встраиваются в PDF субсетами и корректно копируются из него.

## md2docx.js — Word-файл из Markdown

Собирает `SCOPE.docx`. Заголовки получают встроенные стили Word (работает панель
навигации), таблицы — настоящие и редактируемые, списки — нумерованные средствами Word.
Шрифты Georgia и Calibri: есть и в macOS, и в Windows.

Нужен пакет `docx` (npm). В репозитории его нет и быть не должно — ставьте во временную
папку, чтобы не тянуть node_modules в проект:

```bash
mkdir -p /tmp/docxbuild && cd /tmp/docxbuild && npm install docx
cd /путь/к/проекту
NODE_PATH=/tmp/docxbuild/node_modules node tools/md2docx.js SCOPE.md SCOPE.docx
```

`NODE_PATH` обязателен: node ищет пакет рядом со скриптом, то есть в `tools/`,
а не в той папке, откуда запускали.

Эмодзи (галочки, кружки, крестики) из текста вырезаются: в Word они подставляются
чужим шрифтом и выглядят мусором. Смысл несут сами формулировки.

Проверить результат без Word:

```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to html --outdir /tmp/render SCOPE.docx
```
