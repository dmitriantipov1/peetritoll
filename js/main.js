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
  const box = img.closest('.photo__frame, .card__img, .events__poster');
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

// Вкладки «Предстоящие / Архив»
const tabs = document.querySelectorAll('.tabs__btn');

function selectTab(tab) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
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
