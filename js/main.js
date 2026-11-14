// Мобильное меню
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');

function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  nav.classList.toggle('is-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

burger.addEventListener('click', () => {
  setMenu(burger.getAttribute('aria-expanded') !== 'true');
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false);
});

// Выпадающее меню у «Меню» (созвон 12.11.2026): по нажатию, закрывается кликом мимо и Esc.
// На компьютере открывается и при наведении — это в CSS
document.querySelectorAll('.nav__item--sub').forEach((item) => {
  const toggle = item.querySelector('.nav__toggle');
  const setOpen = (open) => {
    item.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!item.classList.contains('is-open')));
  document.addEventListener('click', (e) => {
    if (!item.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && item.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
});

// Переключатель языка (пока только визуально)
document.querySelectorAll('.lang__btn').forEach((btn, _, all) => {
  btn.addEventListener('click', () => {
    all.forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  });
});

// Заглушки для картинок, которые ещё не положили в /images
function markMissing(img) {
  const box = img.closest('.photo__frame, .card__img, .product__img, .events__poster, .dish__img');
  if (box) {
    box.classList.add('is-missing');
    box.dataset.ph = img.dataset.ph;
  } else if (img.classList.contains('hero__bg')) {
    img.remove();
  } else {
    const text = document.createElement('span');
    text.textContent = img.alt;
    text.className = 'img-fallback ' + img.className;
    img.replaceWith(text);
  }
}

document.querySelectorAll('img[data-ph]').forEach((img) => {
  if (img.complete && img.naturalWidth === 0) markMissing(img);
  else img.addEventListener('error', () => markMissing(img), { once: true });
});

// Фото блюда крупно: клик по миниатюре в меню открывает окно с фото, названием и ценой.
// Стрелки листают блюда, у которых есть фото; Esc и клик мимо окна закрывают.
const lightbox = document.querySelector('.lightbox');
if (lightbox) {
  const thumbs = document.querySelectorAll('.menu-root .dish__img');
  const img = lightbox.querySelector('.lightbox__img');
  const nameEl = lightbox.querySelector('.lightbox__name');
  const descEl = lightbox.querySelector('.lightbox__desc');
  const priceEl = lightbox.querySelector('.lightbox__price');
  let list = [];
  let current = 0;

  function show(i) {
    current = (i + list.length) % list.length;
    const dish = list[current].closest('.dish');
    const photo = list[current].querySelector('img');
    const desc = dish.querySelector('.dish__desc');
    // Цена одна или по порциям — переносим как есть, со своей разметкой
    const price = dish.querySelector('.dish__sizes') || dish.querySelector('.dish__price');
    img.src = photo.currentSrc || photo.src;
    img.alt = photo.alt;
    nameEl.textContent = dish.querySelector('.dish__name').textContent;
    descEl.textContent = desc ? desc.textContent : '';
    descEl.hidden = !desc;
    priceEl.replaceChildren(price.cloneNode(true));
  }

  function open(thumb) {
    list = [...thumbs].filter((t) => !t.classList.contains('is-missing') && !t.closest('[data-diet-hidden]'));
    if (!list.includes(thumb)) return;
    show(list.indexOf(thumb));
    lightbox.classList.toggle('is-single', list.length < 2);
    lightbox.showModal();
  }

  thumbs.forEach((thumb) => {
    const name = thumb.closest('.dish').querySelector('.dish__name').textContent;
    thumb.tabIndex = 0;
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('aria-label', 'Открыть фото: ' + name);
    thumb.addEventListener('click', () => open(thumb));
    thumb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(thumb); }
    });
  });

  lightbox.querySelector('.lightbox__nav--prev').addEventListener('click', () => show(current - 1));
  lightbox.querySelector('.lightbox__nav--next').addEventListener('click', () => show(current + 1));
  // Клик по затемнению: у <dialog> он приходит на сам элемент, а не на содержимое
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
}

// Мероприятия по очереди: выделяется одно событие, вместе с ним плавно меняется его афиша.
// Интервал — data-interval в секундах (в админке «Настройки сайта»). Наведение или фокус
// на событии ставит смену на паузу и показывает его афишу. При «уменьшить движение» — без автосмены.
document.querySelectorAll('[data-rotate]').forEach((box) => {
  const items = [...box.querySelectorAll('.event')];
  const posters = [...box.querySelectorAll('.events__poster img')];
  if (!items.length) return;
  const seconds = Number(box.dataset.interval) || 10;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timer = null;

  function show(i, run) {
    current = i;
    items.forEach((item, k) => {
      item.classList.toggle('is-active', k === i);
      // Полоска под событием показывает, сколько осталось до следующего
      const bar = item.querySelector('.event__progress');
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.width = '0';
      if (k === i && run) {
        bar.getBoundingClientRect();
        bar.style.transition = 'width ' + seconds + 's linear';
        bar.style.width = '100%';
      }
    });
    const poster = Number(items[i].dataset.poster);
    posters.forEach((img, k) => img.classList.toggle('is-active', k === poster));
  }

  function play() {
    clearTimeout(timer);
    if (still || items.length < 2) return;
    show(current, true);
    timer = setTimeout(() => {
      current = (current + 1) % items.length;
      play();
    }, seconds * 1000);
  }

  function pause(i) {
    clearTimeout(timer);
    show(i, false);
  }

  items.forEach((item, i) => {
    item.addEventListener('mouseenter', () => pause(i));
    item.addEventListener('focusin', () => pause(i));
  });
  box.querySelector('.events__list').addEventListener('mouseleave', play);
  box.addEventListener('focusout', (e) => {
    // Фокус ушёл в окно с афишей — смена должна стоять, пока его не закроют
    if (posterBox && posterBox.open) return;
    if (!box.contains(e.relatedTarget)) play();
  });

  // Клик по афише — открыть её крупно; пока окно открыто, смена стоит
  const figure = box.querySelector('.events__poster');
  if (figure) {
    figure.tabIndex = 0;
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', 'Открыть афишу крупно');
    const open = () => {
      const item = items[current];
      const img = posters[Number(item.dataset.poster)];
      pause(current);
      openPoster(img, item, play);
    };
    figure.addEventListener('click', open);
    figure.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }

  show(0, false);
  play();
});

// Галерея: клик по фото открывает его крупно. Стрелки листают фото, видимые
// в текущем фильтре; закрывается кликом мимо фото или Esc
document.querySelectorAll('.gallery').forEach((gallery) => {
  const frames = [...gallery.querySelectorAll('.photo__frame')];
  let box = null;
  let list = [];
  let current = 0;

  function show(i) {
    current = (i + list.length) % list.length;
    const img = list[current].querySelector('img');
    box.querySelector('.lightbox__img').src = img.currentSrc || img.src;
    box.querySelector('.lightbox__img').alt = img.alt;
    box.querySelector('.lightbox__name').textContent = img.alt;
  }

  function open(frame) {
    if (!box) {
      box = document.createElement('dialog');
      box.className = 'lightbox';
      box.setAttribute('aria-label', 'Фото из галереи');
      box.innerHTML = '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Предыдущее фото">‹</button>'
        + '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Следующее фото">›</button>'
        + '<figure class="lightbox__figure"><div class="lightbox__frame"><img class="lightbox__img" src="" alt=""></div>'
        + '<figcaption class="lightbox__caption"><p class="lightbox__name"></p></figcaption></figure>';
      document.body.appendChild(box);
      box.querySelector('.lightbox__nav--prev').addEventListener('click', () => show(current - 1));
      box.querySelector('.lightbox__nav--next').addEventListener('click', () => show(current + 1));
      box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
      });
    }
    list = frames.filter((f) => !f.closest('[hidden]') && !f.classList.contains('is-missing'));
    if (!list.includes(frame)) return;
    box.classList.toggle('is-single', list.length < 2);
    show(list.indexOf(frame));
    box.showModal();
  }

  frames.forEach((frame) => {
    const img = frame.querySelector('img');
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', 'Открыть фото: ' + (img ? img.alt : ''));
    frame.addEventListener('click', () => open(frame));
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(frame); }
    });
  });
});

// Окно с афишей крупно: одно на страницу, создаётся при первом открытии.
// Закрывается кликом мимо афиши или Esc, как фото блюда в меню
let posterBox = null;
function openPoster(img, item, onClose) {
  if (!posterBox) {
    posterBox = document.createElement('dialog');
    posterBox.className = 'lightbox lightbox--poster';
    posterBox.setAttribute('aria-labelledby', 'poster-name');
    posterBox.innerHTML = '<figure class="lightbox__figure"><div class="lightbox__frame"><img class="lightbox__img" src="" alt=""></div>'
      + '<figcaption class="lightbox__caption"><p class="lightbox__name" id="poster-name"></p><p class="lightbox__desc"></p></figcaption></figure>';
    document.body.appendChild(posterBox);
    posterBox.addEventListener('click', (e) => { if (e.target === posterBox) posterBox.close(); });
  }
  const meta = item.querySelector('.event__meta');
  const big = posterBox.querySelector('.lightbox__img');
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;
  posterBox.querySelector('.lightbox__name').textContent = item.querySelector('.event__title').textContent;
  posterBox.querySelector('.lightbox__desc').textContent = meta
    ? [...meta.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(' · ')
    : '';
  posterBox.onclose = onClose;
  posterBox.showModal();
}

// Вкладки «Предстоящие / Архив».
// Каждая группа .tabs живёт отдельно — на странице их может быть несколько.
document.querySelectorAll('.tabs').forEach((group) => {
  const tabs = group.querySelectorAll('.tabs__btn');
  if (!tabs.length) return;

  function selectTab(tab) {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
  }

  // Меню дня: сразу открыть вкладку сегодняшнего дня (в выходные остаётся понедельник)
  if (group.hasAttribute('data-today')) {
    const today = group.querySelector('[data-weekday="' + new Date().getDay() + '"]');
    if (today) selectTab(today);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });
});

// Фильтр по категориям (галерея, магазин)
document.querySelectorAll('[data-filter-group]').forEach((group) => {
  const target = document.getElementById(group.dataset.filterGroup);
  const buttons = group.querySelectorAll('[data-filter]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      buttons.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      target.querySelectorAll('[data-cat]').forEach((item) => {
        item.hidden = cat !== 'all' && item.dataset.cat !== cat;
      });
    });
  });
  // Ссылка сразу на категорию: shop.html#books
  const fromHash = group.querySelector('[data-filter="' + location.hash.slice(1) + '"]');
  if (location.hash && fromHash) fromHash.click();
});

// Переключатель вариантов блоков на elements.html.
// Группа: <div data-variants="имя">, внутри кнопки [data-variant] и блоки [data-v].
// Ссылка на конкретный вариант: elements.html#имя-v2
document.querySelectorAll('[data-variants]').forEach((group) => {
  const name = group.dataset.variants;
  const buttons = group.querySelectorAll('[data-variant]');
  const items = group.querySelectorAll('[data-v]');
  // Вариант может не прятать блоки, а менять класс на одном контейнере:
  // так устроены карточки блюд — разметка одна, вид задаёт menu--v1…menu--v5.
  // В атрибуте лежит префикс класса, номер дописывается.
  const root = group.querySelector('[data-v-class]');
  const desc = group.querySelector('.variant-panel__desc');
  if (!buttons.length || (!items.length && !root)) return;

  function show(n, push) {
    let found = false;
    items.forEach((item) => {
      const match = item.dataset.v === n;
      item.hidden = !match;
      if (match) found = true;
    });
    if (root) {
      const base = root.dataset.vClass;
      Array.prototype.slice.call(root.classList).forEach((c) => {
        if (c.indexOf(base) === 0) root.classList.remove(c);
      });
      root.classList.add(base + n);
      found = true;
    }
    if (!found) return;
    buttons.forEach((b) => {
      const active = b.dataset.variant === n;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
      if (active && desc) desc.textContent = b.dataset.desc || '';
    });
    if (push) history.replaceState(null, '', '#' + name + '-v' + n);
  }

  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.variant, true)));

  function fromHash() {
    const m = new RegExp('^#' + name + '-v(\\d+)$').exec(location.hash);
    return m ? m[1] : null;
  }

  // Ссылка вида elements.html#mero-v3 работает и при открытии, и при смене хэша
  window.addEventListener('hashchange', () => {
    const n = fromHash();
    if (n) show(n, false);
  });

  show(fromHash() || buttons[0].dataset.variant, false);
});

// Калькулятор банкета на elements.html и banquet.html, группового меню на group.html,
// предзаказа обеда на lunch.html.
// Считает прямо в браузере — отправки нет, это по-прежнему эскиз.
document.querySelectorAll('[data-calc]').forEach((calc) => {
  const rows = calc.querySelectorAll('.calc-row');
  const guests = calc.querySelector('[data-guests]');
  const chosen = calc.querySelector('[data-chosen]');
  const warn = calc.querySelector('[data-warn]');
  if (!rows.length) return;

  // 8500 → «8 500,00 €»: разряды разделены, знак евро не отрывается от суммы
  function money(n) {
    const parts = n.toFixed(2).split('.');
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ',' + parts[1] + '\u00A0€';
  }
  const qty = (row) => Number(row.querySelector('[data-qty]').value) || 0;

  // Цена сета за человека считается из цен блюд в разметке,
  // чтобы не держать одно и то же число в двух местах
  const sets = Array.prototype.slice.call(calc.querySelectorAll('[data-preset]'));
  const priceOf = {};
  rows.forEach((row) => { priceOf[row.dataset.dish] = Number(row.dataset.price); });

  function setQty(row, n) {
    const input = row.querySelector('[data-qty]');
    input.value = Math.max(0, Math.round(n));
    const q = qty(row);
    row.classList.toggle('is-picked', q > 0);
    row.querySelector('[data-sum]').textContent = q ? money(q * Number(row.dataset.price)) : '—';
  }

  function recalc() {
    let total = 0;
    const picked = [];
    const pickedKeys = [];
    rows.forEach((row) => {
      // Меню дня: в расчёт идёт только выбранный день, остальные дни не считаем
      if (row.closest('[role="tabpanel"][hidden], .lunch-day[hidden]')) return;
      const q = qty(row);
      total += q * Number(row.dataset.price);
      if (q) {
        picked.push({ name: row.querySelector('.calc-row__name').textContent, q });
        pickedKeys.push(row.dataset.dish);
      }
    });

    const people = Number(guests && guests.value) || 0;
    calc.querySelectorAll('[data-total]').forEach((el) => { el.textContent = money(total); });
    calc.querySelectorAll('[data-per-guest]').forEach((el) => {
      el.textContent = people ? money(total / people) : '—';
    });

    if (chosen) {
      chosen.innerHTML = '';
      if (!picked.length) {
        const li = document.createElement('li');
        li.className = 'calc-chosen__empty';
        li.textContent = 'Пока ничего не выбрано';
        chosen.appendChild(li);
      } else {
        picked.forEach((p) => {
          const li = document.createElement('li');
          li.innerHTML = '<span></span><b></b>';
          li.firstChild.textContent = p.name;
          li.lastChild.textContent = p.q + ' шт.';
          chosen.appendChild(li);
        });
      }
    }

    // Подсказка, а не запрет: заявка — не заказ, отправить можно всегда
    if (warn) {
      let hot = 0;
      rows.forEach((row) => { if (row.closest('.calc-cat').querySelector('.calc-cat__name').textContent === 'Горячее') hot += qty(row); });
      const few = people && picked.length && hot < people / 2;
      warn.hidden = !few;
      if (few) warn.textContent = 'На ' + people + ' гостей выбрано ' + hot + ' порций горячего — проверьте, достаточно ли.';
    }

    // Сет остаётся отмеченным, пока состав совпадает: количество порций не в счёт,
    // иначе отметка слетала бы от любой ручной правки
    const now = pickedKeys.sort().join(',');
    sets.forEach((b) => {
      const match = b.dataset.preset.split(',').sort().join(',') === now;
      b.classList.toggle('is-active', match);
      b.setAttribute('aria-pressed', match ? 'true' : 'false');
    });

    calc.querySelectorAll('[data-reset], [data-fill]').forEach((b) => { b.disabled = !picked.length; });
  }

  calc.addEventListener('click', (e) => {
    // Переключили день в меню дня — пересчитать по новой вкладке
    if (e.target.closest('[role="tab"]')) { recalc(); return; }
    const btn = e.target.closest('[data-step]');
    if (btn) {
      const row = btn.closest('.calc-row');
      setQty(row, qty(row) + Number(btn.dataset.step));
      recalc();
      return;
    }
    const preset = e.target.closest('[data-preset]');
    if (preset) {
      const keys = preset.dataset.preset.split(',');
      const people = Number(guests && guests.value) || 1;
      rows.forEach((row) => setQty(row, keys.includes(row.dataset.dish) ? people : 0));
      recalc();
      return;
    }
    if (e.target.closest('[data-reset]')) {
      rows.forEach((row) => setQty(row, 0));
      recalc();
      return;
    }
    if (e.target.closest('[data-fill]')) {
      const people = Number(guests && guests.value) || 1;
      rows.forEach((row) => { if (qty(row) > 0) setQty(row, people); });
      recalc();
    }
  });

  calc.addEventListener('input', (e) => {
    if (e.target.matches('[data-qty]')) setQty(e.target.closest('.calc-row'), Number(e.target.value));
    recalc();
  });

  sets.forEach((b) => {
    const el = b.querySelector('[data-set-price]');
    if (el) el.textContent = money(b.dataset.preset.split(',').reduce((sum, k) => sum + (priceOf[k] || 0), 0));
  });
  recalc();
});

// Заявки с ответом гостю (банкет, группа, обед, бронь стола, запись на мероприятие): отправки нет,
// показываем гостю ответ, который он увидит. Важно, что это запрос, а не бронь, — так и написано в ответе.
document.querySelectorAll('[data-request]').forEach((requestForm) => {
  // Ответ лежит рядом с формой — в том же блоке
  const done = requestForm.parentElement.querySelector('[data-request-done]');
  if (!done) return;
  requestForm.addEventListener('submit', () => {
    requestForm.hidden = true;
    done.hidden = false;
    done.focus();
  });
  done.querySelector('[data-request-again]').addEventListener('click', () => {
    done.hidden = true;
    requestForm.hidden = false;
    requestForm.scrollIntoView();
  });
});

// Фильтр меню по отметкам: можно выбрать несколько, показываем блюда, у которых есть все выбранные.
// Пустые разделы прячем, их кнопки в строке разделов приглушаем.
// Значок отметки на карточке блюда: подпись по нажатию — на телефоне нет наведения, title не видно
document.querySelectorAll('.diet__icon').forEach((icon) => {
  icon.addEventListener('click', () => {
    const open = !icon.hasAttribute('data-open');
    document.querySelectorAll('.diet__icon[data-open]').forEach((i) => i.removeAttribute('data-open'));
    if (open) icon.setAttribute('data-open', '');
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.diet__icon')) {
    document.querySelectorAll('.diet__icon[data-open]').forEach((i) => i.removeAttribute('data-open'));
  }
});

const dietFilter = document.querySelector('[data-diet-filter]');
if (dietFilter) {
  // Ограничения (data-diet-tag): можно несколько, блюдо должно подходить под все.
  // Подборки (data-diet-pick: новинки, сезонное): одна за раз, вместе с ограничениями
  const btns = [...dietFilter.querySelectorAll('[data-diet-tag]')];
  const picks = [...dietFilter.querySelectorAll('[data-diet-pick]')];
  const root = document.querySelector('.menu-root');
  const items = [...root.querySelectorAll('.dishes > li, .price-list > li')];
  const empty = document.querySelector('[data-diet-empty]');
  const resetTop = dietFilter.querySelector('[data-diet-reset]');

  const apply = () => {
    const on = btns.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.dietTag);
    const pick = picks.find((b) => b.getAttribute('aria-pressed') === 'true');
    items.forEach((li) => {
      const tags = (li.dataset.diet || '').split(' ');
      const inPick = !pick || (li.dataset.pick || '').split(' ').includes(pick.dataset.dietPick);
      li.toggleAttribute('data-diet-hidden', !on.every((t) => tags.includes(t)) || !inPick);
    });
    root.querySelectorAll('.dishes, .price-list').forEach((ul) => {
      const none = !ul.querySelector(':scope > li:not([data-diet-hidden])');
      ul.toggleAttribute('data-diet-hidden', none);
      const label = ul.previousElementSibling;
      if (label && label.classList.contains('price-list__label')) label.toggleAttribute('data-diet-hidden', none);
    });
    let shown = 0;
    root.querySelectorAll('.menu-cat').forEach((cat) => {
      const none = !cat.querySelector('.dishes > li:not([data-diet-hidden]), .price-list > li:not([data-diet-hidden])');
      cat.toggleAttribute('data-diet-hidden', none);
      if (!none) shown++;
      const chip = document.querySelector(`.chip[href="#${cat.id}"]`);
      if (chip) chip.classList.toggle('is-dim', none);
    });
    empty.hidden = shown > 0;
    resetTop.hidden = on.length === 0 && !pick;
  };

  btns.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    apply();
  }));
  picks.forEach((b) => b.addEventListener('click', () => {
    const turnOn = b.getAttribute('aria-pressed') !== 'true';
    picks.forEach((p) => p.setAttribute('aria-pressed', String(p === b && turnOn)));
    apply();
  }));
  document.querySelectorAll('[data-diet-reset]').forEach((r) => r.addEventListener('click', () => {
    btns.concat(picks).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    apply();
  }));
}

// Страница товара: миниатюры меняют большое фото
document.querySelectorAll('.pdp-gallery').forEach((gallery) => {
  const main = gallery.querySelector('.pdp-gallery__main img');
  const box = main.closest('.product__img');
  const thumbs = gallery.querySelectorAll('.pdp-gallery__thumb');
  thumbs.forEach((thumb) => thumb.addEventListener('click', () => {
    const img = thumb.querySelector('img');
    thumbs.forEach((t) => t.setAttribute('aria-current', String(t === thumb)));
    box.classList.remove('is-missing');
    main.alt = img.alt;
    main.dataset.ph = img.dataset.ph;
    main.addEventListener('error', () => markMissing(main), { once: true });
    main.src = img.getAttribute('src');
  }));
});

// Меню дня (lunch.html): в таблице недели подсвечен сегодняшний день.
// Предзаказ — только на сегодня и на завтра: в пятницу только сегодня, в выходные — понедельник
// (на сайте в выходные предзаказа не будет; в эскизе понедельник, чтобы было что показать)
document.querySelectorAll('[data-lunch-week]').forEach((table) => {
  // В таблице «суп / горячее» у дня две строки — подсвечиваем обе, отметку ставим в первую
  const rows = table.querySelectorAll('tr[data-weekday="' + new Date().getDay() + '"]');
  const row = rows[0];
  if (!row) return;
  rows.forEach((r) => r.classList.add('is-today'));
  const mark = document.createElement('span');
  mark.className = 'lunch-week__today';
  mark.textContent = 'Сегодня';
  row.querySelector('th').appendChild(mark);
});

document.querySelectorAll('[data-lunch-pick]').forEach((pick) => {
  const form = pick.closest('form');
  const label = form.querySelector('[data-lunch-day-label]');
  const radios = [...pick.querySelectorAll('input[type="radio"]')];
  const today = new Date().getDay();
  let open = [today, today + 1].filter((n) => n >= 1 && n <= 5);
  if (!open.length) open = [1];

  radios.forEach((r) => {
    const n = Number(r.value);
    const chip = r.closest('label');
    chip.hidden = !open.includes(n);
    chip.querySelector('.lunch-pick__when').textContent = n === today ? 'сегодня' : n === today + 1 ? 'завтра' : '';
  });

  function show() {
    const checked = radios.find((r) => r.checked);
    radios.forEach((r) => r.closest('label').classList.toggle('is-active', r === checked));
    form.querySelectorAll('.lunch-day').forEach((day) => { day.hidden = day.dataset.weekday !== checked.value; });
    if (label) label.textContent = checked.closest('label').firstChild.nextSibling.textContent.trim();
    // калькулятор пересчитывает по событию input — теперь уже по новому дню
    form.dispatchEvent(new Event('input', { bubbles: true }));
  }

  radios.find((r) => Number(r.value) === open[0]).checked = true;
  pick.addEventListener('change', show);
  show();
});

// ---------- Корзина и оформление заказа (эскиз флоу покупки, 14.11.2026) ----------
// Без сервера: корзина хранится в браузере (localStorage), заказ никуда не уходит.
// Кнопка с data-add кладёт товар: data-id, data-name, data-price («12.00»), data-img,
// data-kind (physical | digital), data-pickup — только самовывоз (антиквариат, он один).
const CART_KEY = 'pt-cart';
const DELIVERY = { pickup: 0, parcel: 4, eu: 12 }; // по Эстонии и в ЕС — из настроек магазина

function cartRead() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
}
function cartWrite(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* приватный режим — без хранения */ }
  cartBadge();
}
function euro(n) {
  const parts = n.toFixed(2).split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + parts[1] + ' €';
}
const cartCount = (items) => items.reduce((s, i) => s + i.qty, 0);
const cartSum = (items) => items.reduce((s, i) => s + i.qty * i.price, 0);

function cartBadge() {
  const n = cartCount(cartRead());
  document.querySelectorAll('[data-cart-link]').forEach((a) => {
    a.setAttribute('aria-label', 'Корзина, товаров: ' + n);
    const c = a.querySelector('.cart-link__count');
    if (c) c.textContent = n;
  });
  // Уже в корзине: товар штучный — кнопку не нажать второй раз
  const ids = cartRead().filter((i) => i.unique).map((i) => i.id);
  document.querySelectorAll('[data-add][data-pickup]').forEach((b) => {
    const inCart = ids.includes(b.dataset.id);
    b.disabled = inCart;
    b.textContent = inCart ? 'В корзине' : 'В корзину';
  });
}

let toastTimer;
function cartToast(name) {
  let t = document.querySelector('.cart-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'cart-toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.innerHTML = '<span></span><a href="./cart.html">Перейти в корзину</a>';
  t.firstChild.textContent = 'Добавлено в корзину: ' + name;
  t.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-shown'), 4000);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (!b || b.disabled) return;
  const items = cartRead();
  const found = items.find((i) => i.id === b.dataset.id);
  if (found && !found.unique) found.qty += 1;
  else if (!found) {
    items.push({
      id: b.dataset.id,
      name: b.dataset.name,
      price: Number(b.dataset.price),
      img: b.dataset.img,
      kind: b.dataset.kind,
      pickup: b.hasAttribute('data-pickup'),
      unique: b.hasAttribute('data-pickup'),
      qty: 1,
    });
  }
  cartWrite(items);
  cartToast(b.dataset.name);
});
cartBadge();

// Строка товара: фото, название, что это, количество, сумма
function cartLine(i, editable) {
  const li = document.createElement('li');
  li.className = 'cart-line';
  li.dataset.id = i.id;
  const what = i.kind === 'digital' ? 'Цифровая копия — ссылка на e-mail' : i.pickup ? 'Только самовывоз' : 'Печатное издание или предмет';
  li.innerHTML =
    '<div class="cart-line__img"><img alt="" loading="lazy"></div>' +
    '<div class="cart-line__body"><p class="cart-line__name"></p><p class="cart-line__what"></p><p class="cart-line__price"></p></div>' +
    '<div class="cart-line__qty"></div>' +
    '<p class="cart-line__sum"></p>';
  const img = li.querySelector('img');
  // Фото ещё нет — полосатая заглушка, как у остальных картинок прототипа
  img.addEventListener('error', () => {
    const box = img.parentElement;
    box.classList.add('is-missing');
    box.dataset.ph = (i.img.split('/').pop() || '').slice(0, 24);
  });
  img.src = i.img;
  li.querySelector('.cart-line__name').textContent = i.name;
  li.querySelector('.cart-line__what').textContent = what;
  li.querySelector('.cart-line__price').textContent = euro(i.price) + ' за шт.';
  li.querySelector('.cart-line__sum').textContent = euro(i.price * i.qty);
  const q = li.querySelector('.cart-line__qty');
  if (!editable) q.textContent = i.qty + ' шт.';
  else if (i.unique) q.innerHTML = '<span class="cart-line__one">1 шт.</span>';
  else {
    q.innerHTML =
      '<div class="calc-step"><button class="calc-step__btn" type="button" data-qty-step="-1">−</button>' +
      '<span class="calc-step__input" aria-live="polite"></span>' +
      '<button class="calc-step__btn" type="button" data-qty-step="1">+</button></div>';
    q.querySelector('.calc-step__input').textContent = i.qty;
    q.querySelectorAll('button')[0].setAttribute('aria-label', 'Меньше: ' + i.name);
    q.querySelectorAll('button')[1].setAttribute('aria-label', 'Больше: ' + i.name);
  }
  if (editable) {
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'cart-line__remove';
    rm.dataset.remove = '';
    rm.textContent = 'Удалить';
    q.appendChild(rm);
  }
  return li;
}

// Корзина: cart.html
document.querySelectorAll('[data-cart-page]').forEach((page) => {
  const list = page.querySelector('[data-cart-list]');
  function render() {
    const items = cartRead();
    page.classList.toggle('is-empty', !items.length);
    list.innerHTML = '';
    items.forEach((i) => list.appendChild(cartLine(i, true)));
    page.querySelector('[data-cart-sum]').textContent = euro(cartSum(items));
    page.querySelector('[data-cart-count]').textContent = cartCount(items);
  }
  page.addEventListener('click', (e) => {
    const line = e.target.closest('.cart-line');
    if (!line) return;
    const items = cartRead();
    const item = items.find((i) => i.id === line.dataset.id);
    const step = e.target.closest('[data-qty-step]');
    if (step) item.qty = Math.max(1, Math.min(20, item.qty + Number(step.dataset.qtyStep)));
    else if (e.target.closest('[data-remove]')) items.splice(items.indexOf(item), 1);
    else return;
    cartWrite(items);
    render();
  });
  render();
});

// Оформление: checkout.html. Способы получения зависят от корзины
document.querySelectorAll('[data-checkout]').forEach((form) => {
  const items = cartRead();
  if (!items.length) { location.replace('./cart.html'); return; }
  const physical = items.filter((i) => i.kind === 'physical');
  const pickupOnly = items.some((i) => i.pickup);
  const list = form.querySelector('[data-order-list]');
  items.forEach((i) => list.appendChild(cartLine(i, false)));

  const ship = form.querySelector('[data-ship]');
  const digitalOnly = form.querySelector('[data-digital-only]');
  ship.hidden = !physical.length;
  digitalOnly.hidden = !!physical.length;
  form.querySelector('[data-has-digital]').hidden = !items.some((i) => i.kind === 'digital') || !physical.length;
  // Антиквариат почтой не отправляем — остаётся только самовывоз
  form.querySelectorAll('input[name="ship"]').forEach((r) => {
    if (r.value !== 'pickup' && pickupOnly) {
      r.disabled = true;
      r.closest('.ship-opt').classList.add('is-off');
    }
  });
  form.querySelector('[data-pickup-only]').hidden = !pickupOnly;

  function update() {
    const way = physical.length ? (form.querySelector('input[name="ship"]:checked') || {}).value : 'none';
    form.querySelectorAll('[data-ship-fields]').forEach((f) => { f.hidden = f.dataset.shipFields !== way; });
    const goods = cartSum(items);
    const delivery = DELIVERY[way] || 0;
    form.querySelector('[data-goods]').textContent = euro(goods);
    form.querySelector('[data-delivery]').textContent = !physical.length ? 'не нужна' : delivery ? euro(delivery) : 'бесплатно';
    form.querySelector('[data-total]').textContent = euro(goods + delivery);
    form.querySelector('[data-pay]').disabled = !form.querySelector('[data-terms]').checked;
  }
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const way = physical.length ? form.querySelector('input[name="ship"]:checked').value : 'none';
    // Что увидит покупатель после оплаты — запоминаем для страницы «Заказ принят» и чистим корзину
    try {
      sessionStorage.setItem('pt-order', JSON.stringify({
        no: 'PT-' + (1000 + Math.floor(Math.random() * 9000)),
        way: way,
        digital: items.some((i) => i.kind === 'digital'),
        email: form.querySelector('#o-mail').value,
        total: cartSum(items) + (DELIVERY[way] || 0),
      }));
    } catch (err) { /* без хранения — страница покажет общий текст */ }
    cartWrite([]);
    location.href = './order-done.html';
  });
  update();
});

// «Спасибо, заказ оплачен»: order-done.html
document.querySelectorAll('[data-order-done]').forEach((box) => {
  let o = null;
  try { o = JSON.parse(sessionStorage.getItem('pt-order')); } catch (e) { /* общий текст */ }
  if (!o) return;
  box.querySelector('[data-order-no]').textContent = o.no;
  box.querySelector('[data-order-total]').textContent = euro(o.total);
  if (o.email) box.querySelector('[data-order-email]').textContent = o.email;
  box.querySelectorAll('[data-next]').forEach((p) => {
    p.hidden = !(p.dataset.next === o.way || (p.dataset.next === 'digital' && o.digital));
  });
});
