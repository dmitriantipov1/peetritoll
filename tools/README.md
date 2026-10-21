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
