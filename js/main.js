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
