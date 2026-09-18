document.addEventListener('DOMContentLoaded', () => {
  /* ===== Burger menu ===== */
  const header = document.querySelector('.header');
  const burger = document.querySelector('.header__burger');
  const navmenu = document.querySelector('.navmenu');
  let menuOpen = false;
  let mountTimer;

  const setSub = (open) => {
    navmenu.classList.toggle('navmenu--sub', open);
    navmenu.querySelector('[data-nav-sub]').setAttribute('aria-expanded', String(open));
  };

  const setMenu = (open) => {
    if (open === menuOpen) return;
    menuOpen = open;

    header.classList.toggle('header--menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navmenu.setAttribute('aria-hidden', String(!open));
    document.documentElement.style.overflow = open ? 'hidden' : '';

    clearTimeout(mountTimer);

    if (open) {
      // сначала показываем панель, потом запускаем анимацию — иначе перехода не будет
      navmenu.classList.add('navmenu--mounted');
      requestAnimationFrame(() => navmenu.classList.add('navmenu--open'));
      return;
    }

    navmenu.classList.remove('navmenu--open');
    mountTimer = setTimeout(() => {
      navmenu.classList.remove('navmenu--mounted');
      setSub(false);
    }, 400);
  };

  burger.addEventListener('click', () => setMenu(!menuOpen));

  navmenu.addEventListener('click', (event) => {
    if (event.target.closest('[data-nav-close]')) {
      setMenu(false);
      return;
    }

    if (event.target.closest('[data-nav-sub]')) {
      setSub(true);
      return;
    }

    if (event.target.closest('[data-nav-back]')) {
      setSub(false);
      return;
    }

    // клик мимо панели или по обычной ссылке — закрываем
    if (!event.target.closest('.navmenu__pane') || event.target.closest('a')) setMenu(false);
  });

  window.matchMedia('(min-width: 1025px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  /* ===== Sticky header ===== */
  const headerInner = header.querySelector('.header__inner');

  // Замеряем ширину шапки в обычном и компактном виде,
  // чтобы CSS мог плавно анимировать max-width между ними
  const measureHeader = () => {
    const isCompact = header.classList.contains('header--compact');
    header.classList.add('header--measuring');

    header.classList.remove('header--compact');
    const fullWidth = headerInner.getBoundingClientRect().width;

    header.classList.add('header--compact');
    const compactWidth = headerInner.getBoundingClientRect().width;

    header.classList.toggle('header--compact', isCompact);
    header.style.setProperty('--header-full-width', `${fullWidth}px`);
    // +2px запаса на субпиксельное округление, чтобы ничего не сжималось
    header.style.setProperty('--header-compact-width', `${Math.ceil(compactWidth) + 2}px`);

    headerInner.getBoundingClientRect(); // применяем стили до включения анимаций
    header.classList.remove('header--measuring');
  };

  const updateHeader = () => {
    header.classList.toggle('header--compact', window.scrollY > 40);
  };

  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measureHeader);
  });
  window.addEventListener('scroll', updateHeader, { passive: true });

  measureHeader();
  updateHeader();
  document.fonts?.ready.then(measureHeader);

  /* ===== Language dropdown ===== */
  const lang = document.querySelector('.lang');
  const langBtn = document.querySelector('.lang__btn');

  const setLang = (open) => {
    lang.classList.toggle('lang--open', open);
    langBtn.setAttribute('aria-expanded', String(open));
  };

  langBtn.addEventListener('click', () => {
    setLang(!lang.classList.contains('lang--open'));
  });

  /* ===== Появление контента =====
     data-split разбивает текст на слова или буквы (каждая часть едет из-под маски),
     data-animate задаёт тип появления. Запускается, когда элемент попал в экран. */
  const splitText = (el) => {
    const byChars = el.dataset.split === 'chars';
    const source = [...el.childNodes];
    const label = [...el.childNodes]
      .map((node) => (node.nodeName === 'BR' ? ' ' : node.textContent))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    let index = 0;

    el.textContent = '';
    el.setAttribute('aria-label', label);

    source.forEach((node) => {
      // переносы строк из вёрстки сохраняем
      if (node.nodeName === 'BR') {
        el.append(document.createElement('br'));
        return;
      }

      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      const parts = byChars ? [...text] : text.split(' ');

      parts.forEach((part, partIndex) => {
        if (part === ' ') {
          el.append(' ');
          index += 1;
          return;
        }

        const box = document.createElement('span');
        box.className = 'split__part';
        box.setAttribute('aria-hidden', 'true');
        box.style.setProperty('--i', String(index));
        index += 1;

        const inner = document.createElement('span');
        inner.className = 'split__inner';
        inner.textContent = part;

        box.append(inner);
        el.append(box);

        // между словами нужен обычный пробел, чтобы строка переносилась
        if (!byChars && partIndex < parts.length - 1) el.append(' ');
      });
    });
  };

  document.querySelectorAll('[data-split]').forEach(splitText);

  const animated = [...document.querySelectorAll('[data-animate]')];

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animated.forEach((el) => el.classList.add('is-inview'));
  } else {
    const animObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        animObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

    animated.forEach((el) => animObserver.observe(el));
  }

  /* ===== Появление по скролу =====
     Элементу считается прогресс --p (0…1): 0 — он только входит снизу экрана,
     1 — полностью показан. Значение наследуется вниз по дереву, поэтому
     дети могут брать свой отрезок прогресса. Крутим вверх — прогресс падает,
     и элементы так же плавно уходят.
     data-reveal — элемент появляется сам, data-progress — только считает прогресс. */
  const progressed = [...document.querySelectorAll('[data-reveal], [data-progress], [data-count]')];

  if (progressed.length) {
    const DEFAULT_RANGE = [0.95, 0.6];

    // «0.95 0.55» — от какой доли высоты экрана начинать и на какой закончить
    const ranges = new Map(progressed.map((el) => {
      const parts = (el.dataset.reveal || el.dataset.progress || el.dataset.count || '')
        .split(' ')
        .map(Number)
        .filter((value) => !Number.isNaN(value));

      return [el, parts.length === 2 ? parts : DEFAULT_RANGE];
    }));

    // счётчики: запоминаем итоговое число и то, что написано вокруг него («50+», «100%»)
    const counters = new Map();

    document.querySelectorAll('[data-count]').forEach((el) => {
      const match = el.textContent.trim().match(/^(\D*?)([\d\s.,]+)(.*)$/);
      if (!match) return;

      const [, prefix, digits, suffix] = match;
      const separator = digits.includes(' ') ? ' ' : '';
      const fraction = digits.split(/[.,]/)[1] || '';

      counters.set(el, {
        prefix,
        suffix,
        separator,
        // дробные значения («4.9/5») докручиваем с тем же числом знаков
        decimals: fraction.length,
        point: digits.includes(',') ? ',' : '.',
        target: Number(digits.replace(/[\s,]/g, (char) => (char === ',' ? '.' : ''))),
      });
    });

    const showCount = (el, progress) => {
      const { prefix, suffix, separator, decimals, point, target } = counters.get(el);
      // к концу замедляемся, чтобы последние цифры «докручивались»
      const eased = 1 - (1 - progress) ** 3;
      const value = target * eased;

      let shownValue;

      if (decimals) {
        shownValue = value.toFixed(decimals).replace('.', point);
      } else if (separator) {
        shownValue = Math.round(value).toLocaleString('ru-RU').replace(/ /g, ' ');
      } else {
        shownValue = String(Math.round(value));
      }

      const text = prefix + shownValue + suffix;

      // цифра меняется реже, чем идёт прокрутка — лишний раз текст не трогаем
      if (el.textContent !== text) el.textContent = text;
    };

    // в ряду сетки карточки выходят по очереди: каждой свой сдвиг старта
    const staggerLists = [...document.querySelectorAll('[data-reveal-stagger]')];

    const setStagger = (list) => {
      let rowTop = null;
      let index = 0;

      [...list.children].forEach((item) => {
        // offsetTop, а не getBoundingClientRect: карточки уже сдвинуты
        // собственным появлением, и ряды бы определялись неверно
        const top = item.offsetTop;

        if (rowTop === null || Math.abs(top - rowTop) > 8) {
          rowTop = top;
          index = 0;
        } else {
          index += 1;
        }

        item.style.setProperty('--a', (index * 0.12).toFixed(2));
      });
    };

    const setAllStaggers = () => staggerLists.forEach(setStagger);

    // последнее записанное значение, чтобы не трогать стили зря
    const shown = new Map();

    const updateProgress = () => {
      const vh = window.innerHeight;
      const scrolled = window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

      // сначала только читаем геометрию, потом только пишем стили:
      // вперемешку браузер пересчитывал бы layout на каждом элементе
      const tops = progressed.map((el) => el.getBoundingClientRect().top);

      progressed.forEach((el, index) => {
        const [from, to] = ranges.get(el);
        const top = tops[index];
        const docTop = top + scrolled;

        // у нижних блоков страница может закончиться раньше, чем они дойдут
        // до своей отметки — тогда финишем считаем то место, куда они реально доедут
        const end = Math.max(vh * to, docTop - maxScroll);

        // если при открытии страницы блок уже виден (высокий экран),
        // начинаем отсчёт с его исходного места — иначе он покажется наполовину
        const start = Math.max(Math.min(vh * from, docTop), end + 1);
        const progress = Math.min(1, Math.max(0, (start - top) / (start - end)));

        if (shown.get(el) === progress.toFixed(3)) return;
        shown.set(el, progress.toFixed(3));

        el.style.setProperty('--p', progress.toFixed(3));

        if (counters.has(el)) showCount(el, progress);
      });
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progressed.forEach((el) => el.style.setProperty('--p', '1'));
    } else {
      let progressTicking = false;

      const onProgressScroll = () => {
        if (progressTicking) return;
        progressTicking = true;

        requestAnimationFrame(() => {
          updateProgress();
          progressTicking = false;
        });
      };

      window.addEventListener('scroll', onProgressScroll, { passive: true });
      window.addEventListener('resize', onProgressScroll);

      // сетка перестраивается не только при resize (шрифты, картинки) —
      // следим за самим списком
      if (window.ResizeObserver) {
        const staggerObserver = new ResizeObserver(() => {
          setAllStaggers();
          onProgressScroll();
        });

        staggerLists.forEach((list) => staggerObserver.observe(list));
      }

      setAllStaggers();
      updateProgress();
    }
  }

  /* ===== Фоновые анимации останавливаются за экраном =====
     Спирали, свечение и блики крутятся бесконечно. Пока их не видно,
     это чистый расход процессора, поэтому ставим их на паузу. */
  const idleTargets = [...document.querySelectorAll(
    '.services__visual, .process__visual, .reviews__visual, .cta__spiral, .reviews__viewport',
  )];

  if (idleTargets.length) {
    const idleObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-still', !entry.isIntersecting);
      });
    }, { rootMargin: '15% 0px' });

    idleTargets.forEach((el) => {
      el.classList.add('is-still');
      idleObserver.observe(el);
    });
  }

  /* ===== Hero image shape ===== */
  const heroImage = document.querySelector('.hero__image');

  // Путь многоугольника со скруглёнными углами для clip-path: path()
  const roundedPolygon = (points, radius) => {
    const corners = points.map((point, i) => {
      const prev = points[(i - 1 + points.length) % points.length];
      const next = points[(i + 1) % points.length];
      const toPrev = [prev[0] - point[0], prev[1] - point[1]];
      const toNext = [next[0] - point[0], next[1] - point[1]];
      const lenPrev = Math.hypot(...toPrev);
      const lenNext = Math.hypot(...toNext);
      const r = Math.min(radius, lenPrev / 2, lenNext / 2);
      return {
        point,
        start: [point[0] + (toPrev[0] / lenPrev) * r, point[1] + (toPrev[1] / lenPrev) * r],
        end: [point[0] + (toNext[0] / lenNext) * r, point[1] + (toNext[1] / lenNext) * r],
      };
    });

    const f = (n) => n.toFixed(1);
    return corners
      .map(({ point, start, end }, i) =>
        `${i === 0 ? 'M' : 'L'}${f(start[0])} ${f(start[1])} Q${f(point[0])} ${f(point[1])} ${f(end[0])} ${f(end[1])}`)
      .join(' ') + ' Z';
  };

  const updateHeroShape = () => {
    const { width: w, height: h } = heroImage.getBoundingClientRect();
    if (!w || !h) return;

    const styles = getComputedStyle(heroImage);
    const radius = parseFloat(styles.getPropertyValue('--hero-radius')) || 0;
    const slant = parseFloat(styles.getPropertyValue('--hero-slant')) || 0;
    const slantRight = parseFloat(styles.getPropertyValue('--hero-slant-right')) || 0;

    const path = roundedPolygon([
      [h * slant, 0],
      [w, 0],
      [w - h * slantRight, h],
      [0, h],
    ], radius);

    heroImage.style.setProperty('--hero-clip', `path('${path}')`);
  };

  if (heroImage) {
    new ResizeObserver(updateHeroShape).observe(heroImage);
  }

  /* ===== Service card: свет за курсором (+ параллакс лучей у тёмной) ===== */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.service-card, .case-card, .step-card, .advantage-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        card.style.setProperty('--px', `${(x / rect.width - 0.5) * -24}px`);
        card.style.setProperty('--py', `${(y / rect.height - 0.5) * -24}px`);
      });

      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--px');
        card.style.removeProperty('--py');
      });
    });
  }

  /* ===== Blur bar: плавно появляется и растворяется вместе с секцией ===== */
  const blurBar = document.querySelector('.blur-bar');
  const blurSection = blurBar?.closest('section');

  if (blurBar && blurSection) {
    const FADE = 220; // на какой дистанции (px) полоса успевает раствориться
    const clamp = (value) => Math.min(Math.max(value, 0), 1);
    let barFrame;

    const updateBlurBar = () => {
      const rect = blurSection.getBoundingClientRect();

      // появление — пока секция въезжает снизу, исчезновение — когда её низ доходит до низа экрана
      const appear = clamp((window.innerHeight - rect.top) / FADE);
      const disappear = clamp((rect.bottom - window.innerHeight) / FADE);

      const value = Math.min(appear, disappear);

      blurBar.style.opacity = value.toFixed(3);
      // полностью убираем слои размытия, пока полоса не нужна:
      // прозрачный backdrop-filter всё равно считался бы на каждом кадре
      blurBar.style.visibility = value < 0.01 ? 'hidden' : '';
    };

    const requestBlurBarUpdate = () => {
      cancelAnimationFrame(barFrame);
      barFrame = requestAnimationFrame(updateBlurBar);
    };

    window.addEventListener('scroll', requestBlurBarUpdate, { passive: true });
    window.addEventListener('resize', requestBlurBarUpdate);
    updateBlurBar();
  }

  /* ===== Колода карточек: пока следующая наезжает, предыдущая уменьшается ===== */
  const stackItems = [...document.querySelectorAll('.advantages__item')];
  const stackQuery = window.matchMedia('(min-width: 1025px)');

  if (stackItems.length > 1) {
    const SCALE_STEP = 0.05; // насколько уменьшается карточка под каждой следующей
    const clampUnit = (value) => Math.min(Math.max(value, 0), 1);
    let stackFrame;

    const updateStack = () => {
      if (!stackQuery.matches) {
        stackItems.forEach((item) => {
          item.style.transform = '';
        });
        return;
      }

      // насколько каждая карточка «доехала» до своего места в колоде
      const arrival = stackItems.map((item) => {
        const travel = item.offsetHeight || 1;
        const stuckTop = parseFloat(getComputedStyle(item).top) || 0;
        return clampUnit(1 - (item.getBoundingClientRect().top - stuckTop) / travel);
      });

      stackItems.forEach((item, index) => {
        const covered = arrival.slice(index + 1).reduce((sum, value) => sum + value, 0);
        const scale = 1 - SCALE_STEP * covered;

        item.style.transform = covered ? `scale(${scale.toFixed(4)})` : '';
      });
    };

    const requestStackUpdate = () => {
      cancelAnimationFrame(stackFrame);
      stackFrame = requestAnimationFrame(updateStack);
    };

    window.addEventListener('scroll', requestStackUpdate, { passive: true });
    window.addEventListener('resize', requestStackUpdate);
    stackQuery.addEventListener('change', requestStackUpdate);
    updateStack();
  }

  /* ===== Слайдер отзывов =====
     Лента сдвигается трансформом и продублирована, поэтому справа всегда есть
     следующая карточка, а перестановка происходит вне экрана. Классы позиций
     ставятся в момент старта сдвига — подсветка идёт вместе с движением. */
  const track = document.querySelector('.reviews__track');

  if (track) {
    const viewport = track.closest('.reviews__viewport');
    const dotsBox = document.querySelector('.reviews__dots');
    const prevBtn = document.querySelector('.reviews__arrow--prev');
    const nextBtn = document.querySelector('.reviews__arrow--next');
    const originals = [...track.children];
    const total = originals.length;
    const POSITIONS = ['reviews__item--p0', 'reviews__item--p1', 'reviews__item--p2', 'reviews__item--p3'];
    const DURATION = 600;
    let busy = false;

    originals.forEach((item, i) => {
      item.dataset.index = String(i);

      // копия ленты: справа всегда видна следующая карточка
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.append(clone);
    });

    const step = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return track.children[0].getBoundingClientRect().width + gap;
    };

    const dots = originals.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'reviews__dot';
      dot.setAttribute('aria-label', `Отзыв ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsBox.append(dot);
      return dot;
    });

    // раскрашиваем ленту по будущему порядку — до того, как она поедет
    const applyState = (order, animateEnter) => {
      order.forEach((item, i) => {
        item.classList.toggle('reviews__item--active', i === 0);
        POSITIONS.forEach((cls, pos) => item.classList.toggle(cls, pos === i));
      });

      const first = order[0];
      const index = Number(first.dataset.index);

      dots.forEach((dot, i) => {
        dot.classList.toggle('reviews__dot--active', i === index);
        dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      });

      if (animateEnter) {
        first.classList.remove('reviews__item--enter');
        void first.offsetWidth; // перезапуск анимации разворота
        first.classList.add('reviews__item--enter');
      }
    };

    const currentIndex = () => Number(track.children[0].dataset.index);

    const shiftBy = (count, direction) => {
      if (busy || !count) return;
      busy = true;

      const order = [...track.children];
      const rotated = direction === 'next'
        ? [...order.slice(count), ...order.slice(0, count)]
        : [...order.slice(-count), ...order.slice(0, -count)];

      const finish = () => {
        if (!busy) return;
        track.removeEventListener('transitionend', onEnd);
        clearTimeout(failsafe);
        track.classList.remove('reviews__track--animated');

        if (direction === 'next') {
          for (let i = 0; i < count; i += 1) track.append(track.firstElementChild);
        }

        track.style.setProperty('--shift', '0px');
        busy = false;
      };

      // ловим только собственный переход ленты: переходы карточек всплывают сюда же
      const onEnd = (event) => {
        if (event.target === track && event.propertyName === 'transform') finish();
      };

      if (direction === 'prev') {
        // карточки приезжают слева: сначала переставляем, потом «отпускаем» ленту
        for (let i = 0; i < count; i += 1) track.prepend(track.lastElementChild);
        track.classList.remove('reviews__track--animated');
        track.style.setProperty('--shift', `${-step() * count}px`);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            applyState(rotated, true);
            track.classList.add('reviews__track--animated');
            track.style.setProperty('--shift', '0px');
          });
        });
      } else {
        applyState(rotated, true);
        track.classList.add('reviews__track--animated');
        track.style.setProperty('--shift', `${step() * count}px`);
      }

      track.addEventListener('transitionend', onEnd);
      const failsafe = setTimeout(finish, DURATION + 250);
    };

    const goTo = (index) => {
      const forward = (index - currentIndex() + total) % total;
      const backward = (currentIndex() - index + total) % total;
      if (!forward) return;

      if (forward <= backward) shiftBy(forward, 'next');
      else shiftBy(backward, 'prev');
    };

    nextBtn.addEventListener('click', () => shiftBy(1, 'next'));
    prevBtn.addEventListener('click', () => shiftBy(1, 'prev'));

    // свайп пальцем / мышью
    let startX = null;
    viewport.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
    });

    viewport.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const delta = event.clientX - startX;
      startX = null;

      if (Math.abs(delta) > 60) shiftBy(1, delta < 0 ? 'next' : 'prev');
    });

    window.addEventListener('resize', () => track.style.setProperty('--shift', '0px'));
    applyState([...track.children], false);
  }

  /* ===== Выпадающее меню услуг =====
     На десктопе открывается наведением (с небольшой задержкой на уход мыши),
     на узких экранах — обычным раскрытием внутри мобильного меню. */
  const megaItem = document.querySelector('.header__nav-item--mega');

  if (megaItem) {
    const megaToggle = megaItem.querySelector('.header__nav-toggle');
    const hoverQuery = window.matchMedia('(min-width: 1025px) and (hover: hover)');
    let hoverTimer;

    const setMega = (open) => {
      megaItem.classList.toggle('is-open', open);
      megaToggle.setAttribute('aria-expanded', String(open));
    };

    megaToggle.addEventListener('click', () => {
      setMega(!megaItem.classList.contains('is-open'));
    });

    megaItem.addEventListener('mouseenter', () => {
      if (!hoverQuery.matches) return;
      clearTimeout(hoverTimer);
      setMega(true);
    });

    megaItem.addEventListener('mouseleave', () => {
      if (!hoverQuery.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => setMega(false), 180);
    });

    // переход по ссылке внутри меню закрывает его
    megaItem.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMega(false));
    });

    document.addEventListener('click', (event) => {
      if (!megaItem.contains(event.target)) setMega(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMega(false);
    });

    hoverQuery.addEventListener('change', () => setMega(false));
  }

  /* ===== Модальное окно с заявкой =====
     Нативный <dialog>: фокус, Esc и блокировка страницы — его забота.
     Нам остаётся проиграть анимацию до реального закрытия. */
  const modal = document.querySelector('.modal');

  if (modal && typeof modal.showModal === 'function') {
    const modalBox = modal.querySelector('.modal__box');
    const modalForm = modal.querySelector('.modal__form');
    const modalSuccess = modal.querySelector('.modal__success');
    const CLOSE_TIME = 260;
    let closing = false;

    const openModal = () => {
      if (modal.open) return;

      // при повторном открытии возвращаем форму
      modalForm.hidden = false;
      modalSuccess.hidden = true;
      modalForm.classList.remove('modal__form--checked');
      modalForm.reset();

      modal.showModal();
      document.documentElement.style.overflow = 'hidden';

      // фокус — на самом окне, а не на крестике: иначе при открытии
      // сразу видно кольцо фокуса. С Tab дальше всё работает как надо
      modalBox.focus({ preventScroll: true });

      requestAnimationFrame(() => modal.classList.add('modal--open'));
    };

    const closeModal = () => {
      if (!modal.open || closing) return;
      closing = true;

      modal.classList.remove('modal--open');
      modal.classList.add('modal--closing');

      setTimeout(() => {
        modal.close();
        modal.classList.remove('modal--closing');
        document.documentElement.style.overflow = '';
        closing = false;
      }, CLOSE_TIME);
    };

    document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        setMenu(false);
        openModal();
      });
    });

    modal.querySelectorAll('[data-modal-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    // клик по затемнению — за пределами белой карточки
    modal.addEventListener('click', (event) => {
      if (!event.target.closest('.modal__box')) closeModal();
    });

    // Esc: закрываем сами, чтобы окно успело уехать
    modal.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeModal();
    });

    modalForm.addEventListener('submit', (event) => {
      event.preventDefault();
      modalForm.classList.add('modal__form--checked');

      if (!modalForm.checkValidity()) {
        modalForm.reportValidity();
        return;
      }

      // здесь позже будет отправка на сервер
      modalForm.hidden = true;
      modalSuccess.hidden = false;
    });
  }

  /* ===== Close on outside click / Escape ===== */
  document.addEventListener('click', (event) => {
    if (!lang.contains(event.target)) setLang(false);
    // клики внутри полноэкранного меню обрабатывает оно само
    if (!header.contains(event.target) && !navmenu.contains(event.target)) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setLang(false);
    setMenu(false);
  });
});
