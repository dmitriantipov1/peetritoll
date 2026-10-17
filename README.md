# Peetri Toll — лендинг (вёрстка-прототип)

Чистые HTML / CSS / JS, без фреймворков и сборки. Открывается двойным кликом по `index.html`
или через встроенный сервер WebStorm.

## Картинки

Экспортируйте из Figma в папку `images/` с такими именами. Пока файла нет,
на его месте показывается заглушка с именем файла.

| Файл | Что это в макете |
|---|---|
| logo.svg | логотип в шапке |
| hero.jpg | фон первого экрана (картина с застольем), ~2400 px по ширине |
| restaurant-hall.jpg | 01 Restoran: большое фото зала (photo tavern) |
| restaurant-house.jpg | 01 Restoran: здание с красной крышей (Rectangle 12) |
| restaurant-terrace.jpg | 01 Restoran: маленькое фото (Frame 48) |
| weapons-1.jpg | 02: сабли на стене |
| weapons-2.jpg | 02: манекен в мундире |
| weapons-3.jpg | 02: историческое фото (великан) |
| book-1.jpg … book-4.jpg | 03 Raamatud: обложки книг |
| audioguide.jpg | 04 Audiogiid: девушка у маяка с QR-кодом |
| pakri-express.jpg | 05 Pakri Express: фото электромобиля |
| event-poster.jpg | 06 Üritused: афиша концерта |
| footer.png | футер: логотип с птицами |

Фото лучше выгружать в JPG 2x, логотипы в PNG.

## Публикация на GitHub Pages

1. Создайте публичный репозиторий и залейте содержимое папки (index.html в корне).
2. Settings → Pages → Deploy from a branch → `main` / `(root)`.
3. Через 1–2 минуты сайт будет на `https://<логин>.github.io/<репозиторий>/`.

Все пути относительные (`./css/...`), поэтому в подпапке Pages всё работает.
В `<head>` стоит `noindex`, чтобы прототип не попал в поисковики. Перед запуском боевой версии его надо убрать.
