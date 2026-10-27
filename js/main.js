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
  const box = img.closest('.photo__frame, .card__img, .events__poster, .dish__img');
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
});

// Переключатель вариантов карточек меню (для согласования с заказчиком)
const menuRoot = document.getElementById('menu-root');
if (menuRoot) {
  const desc = document.querySelector('.variant-panel__desc');
  const variantBtns = document.querySelectorAll('[data-variant]');
  variantBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      menuRoot.className = menuRoot.className.replace(/menu--v\d/, 'menu--v' + btn.dataset.variant);
      variantBtns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      desc.textContent = btn.dataset.desc;
      history.replaceState(null, '', '#v' + btn.dataset.variant);
    });
  });
  const fromHash = location.hash.match(/^#v([1-5])$/);
  if (fromHash) document.querySelector('[data-variant="' + fromHash[1] + '"]').click();
}


// Переключатель вариантов блоков на elements.html.
// Группа: <div data-variants="имя">, внутри кнопки [data-variant] и блоки [data-v].
// Ссылка на конкретный вариант: elements.html#имя-v2
document.querySelectorAll('[data-variants]').forEach((group) => {
  const name = group.dataset.variants;
  const buttons = group.querySelectorAll('[data-variant]');
  const items = group.querySelectorAll('[data-v]');
  const desc = group.querySelector('.variant-panel__desc');
  if (!buttons.length || !items.length) return;

  function show(n, push) {
    let found = false;
    items.forEach((item) => {
      const match = item.dataset.v === n;
      item.hidden = !match;
      if (match) found = true;
    });
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

// Калькулятор банкета на elements.html.
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
