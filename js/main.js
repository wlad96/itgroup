document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const burger = document.querySelector('.header__burger');

  let scrollLocks = 0;
  let lockedScrollY = 0;

  const lockScroll = () => {
    scrollLocks += 1;
    if (scrollLocks > 1) return;

    lockedScrollY = window.scrollY;
    document.body.style.cssText += `position:fixed;top:${-lockedScrollY}px;left:0;right:0;width:100%;`;
  };

  const unlockScroll = () => {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks) return;

    ['position', 'top', 'left', 'right', 'width'].forEach((prop) => {
      document.body.style.removeProperty(prop);
    });

    document.body.offsetHeight;
    window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
  };

  const navmenu = document.querySelector('.navmenu');
  let menuOpen = false;
  let mountTimer;
  let openFrame;

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

    if (open) lockScroll();
    else unlockScroll();

    clearTimeout(mountTimer);
    cancelAnimationFrame(openFrame);

    if (open) {
      navmenu.classList.add('navmenu--mounted');
      openFrame = requestAnimationFrame(() => {
        if (menuOpen) navmenu.classList.add('navmenu--open');
      });
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

    if (!event.target.closest('.navmenu__pane') || event.target.closest('a')) setMenu(false);
  });

  window.matchMedia('(min-width: 1025px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  const headerInner = header.querySelector('.header__inner');

  const measureHeader = () => {
    if (scrollLocks > 0) return;

    const isCompact = header.classList.contains('header--compact');
    header.classList.add('header--measuring');

    header.classList.remove('header--compact');
    const fullWidth = headerInner.getBoundingClientRect().width;

    header.classList.add('header--compact');
    const compactWidth = headerInner.getBoundingClientRect().width;

    header.classList.toggle('header--compact', isCompact);

    if (fullWidth > 160 && compactWidth > 120) {
      header.style.setProperty('--header-full-width', `${fullWidth}px`);

      header.style.setProperty('--header-compact-width', `${Math.ceil(compactWidth) + 2}px`);
    }

    headerInner.getBoundingClientRect();
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

  const lang = document.querySelector('.lang');
  const langBtn = document.querySelector('.lang__btn');

  const setLang = (open) => {
    lang.classList.toggle('lang--open', open);
    langBtn.setAttribute('aria-expanded', String(open));
  };

  langBtn.addEventListener('click', () => {
    setLang(!lang.classList.contains('lang--open'));
  });

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

  const progressed = [...document.querySelectorAll('[data-reveal], [data-progress], [data-count]')];

  if (progressed.length) {
    const DEFAULT_RANGE = [0.95, 0.6];

    const ranges = new Map(progressed.map((el) => {
      const parts = (el.dataset.reveal || el.dataset.progress || el.dataset.count || '')
        .split(' ')
        .map(Number)
        .filter((value) => !Number.isNaN(value));

      return [el, parts.length === 2 ? parts : DEFAULT_RANGE];
    }));

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

        decimals: fraction.length,
        point: digits.includes(',') ? ',' : '.',
        target: Number(digits.replace(/[\s,]/g, (char) => (char === ',' ? '.' : ''))),
      });
    });

    const showCount = (el, progress) => {
      const { prefix, suffix, separator, decimals, point, target } = counters.get(el);

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

      if (el.textContent !== text) el.textContent = text;
    };

    const staggerLists = [...document.querySelectorAll('[data-reveal-stagger]')];

    const setStagger = (list) => {
      let rowTop = null;
      let index = 0;

      [...list.children].forEach((item) => {
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

    const shown = new Map();

    const onceQuery = window.matchMedia('(max-width: 1024px)');
    const peak = new Map();

    onceQuery.addEventListener('change', () => peak.clear());

    const updateProgress = () => {
      const vh = window.innerHeight;
      const scrolled = window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

      const tops = progressed.map((el) => el.getBoundingClientRect().top);

      progressed.forEach((el, index) => {
        const [from, to] = ranges.get(el);
        const top = tops[index];
        const docTop = top + scrolled;

        const end = Math.max(vh * to, docTop - maxScroll);

        const start = Math.max(Math.min(vh * from, docTop), end + 1);
        let progress = Math.min(1, Math.max(0, (start - top) / (start - end)));

        if (onceQuery.matches && !el.hasAttribute('data-progress-live')) {
          if (peak.has(el)) progress = 1;
          else if (progress > 0.9) {
            peak.set(el, 1);
            progress = 1;
          }
        }

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

  const heroFrame = document.querySelector('.hero__frame');

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
    const { width: w, height: h } = heroFrame.getBoundingClientRect();
    if (!w || !h) return;

    const styles = getComputedStyle(heroFrame);
    const radius = parseFloat(styles.getPropertyValue('--hero-radius')) || 0;
    const slant = parseFloat(styles.getPropertyValue('--hero-slant')) || 0;
    const slantRight = parseFloat(styles.getPropertyValue('--hero-slant-right')) || 0;

    const path = roundedPolygon([
      [h * slant, 0],
      [w, 0],
      [w - h * slantRight, h],
      [0, h],
    ], radius);

    heroFrame.style.setProperty('--hero-clip', `path('${path}')`);
  };

  if (heroFrame) {
    new ResizeObserver(updateHeroShape).observe(heroFrame);
  }

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

  const blurBar = document.querySelector('.blur-bar');
  const blurSection = blurBar?.closest('section');

  if (blurBar && blurSection) {
    const FADE = 220;
    const clamp = (value) => Math.min(Math.max(value, 0), 1);
    let barFrame;

    const updateBlurBar = () => {
      const rect = blurSection.getBoundingClientRect();

      const appear = clamp((window.innerHeight - rect.top) / FADE);
      const disappear = clamp((rect.bottom - window.innerHeight) / FADE);

      const value = Math.min(appear, disappear);

      blurBar.style.opacity = value.toFixed(3);

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

  const stackItems = [...document.querySelectorAll('.advantages__item')];
  const stackQuery = window.matchMedia('(min-width: 1025px)');

  if (stackItems.length > 1) {
    const SCALE_STEP = 0.05;
    const clampUnit = (value) => Math.min(Math.max(value, 0), 1);
    let stackFrame;

    const updateStack = () => {
      if (!stackQuery.matches) {
        stackItems.forEach((item) => {
          item.style.transform = '';
        });
        return;
      }

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
        void first.offsetWidth;
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

      const onEnd = (event) => {
        if (event.target === track && event.propertyName === 'transform') finish();
      };

      if (direction === 'prev') {
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

  const modal = document.querySelector('.modal');

  if (modal && typeof modal.showModal === 'function') {
    const modalBox = modal.querySelector('.modal__box');
    const modalForm = modal.querySelector('.modal__form');
    const modalSuccess = modal.querySelector('.modal__success');
    const CLOSE_TIME = 260;
    let closing = false;
    let modalOpen = false;

    const openModal = () => {
      if (modal.open) return;

      modalForm.hidden = false;
      modalSuccess.hidden = true;
      modalForm.classList.remove('modal__form--checked');
      modalForm.reset();

      modal.showModal();
      lockScroll();
      modalOpen = true;

      modalBox.focus({ preventScroll: true });

      requestAnimationFrame(() => modal.classList.add('modal--open'));
    };

    const closeModal = () => {
      if (!modal.open || closing) return;
      closing = true;

      modalOpen = false;
      modal.classList.remove('modal--open');
      modal.classList.add('modal--closing');

      setTimeout(() => {
        modal.close();
        modal.classList.remove('modal--closing');
        unlockScroll();
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

    modal.addEventListener('click', (event) => {
      if (!event.target.closest('.modal__box')) closeModal();
    });

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

      modalForm.hidden = true;
      modalSuccess.hidden = false;
    });
  }

  document.addEventListener('click', (event) => {
    if (!lang.contains(event.target)) setLang(false);

    if (!header.contains(event.target) && !navmenu.contains(event.target)) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setLang(false);
    setMenu(false);
  });
});
