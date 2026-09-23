(() => {
  const grid = document.querySelector('#bl-grid');
  const motion = document.documentElement.classList.contains('has-anim');

  const refresh = () => window.dispatchEvent(new Event('resize'));

  if (grid) {
    const cards = [...grid.children];
    const filter = document.querySelector('.bl-filter');
    const pill = filter.querySelector('.bl-filter__pill');
    const buttons = [...filter.querySelectorAll('.bl-filter__btn')];
    const search = document.querySelector('.bl-search__input');
    const more = document.querySelector('#bl-more');
    const empty = document.querySelector('#bl-empty');

    let active = 'all';
    let query = '';
    let expanded = false;
    let switchTimer;

    const fill = () => {
      const visible = cards.filter((card) => !card.classList.contains('bl-card--hidden'));
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;

      visible.forEach((card) => card.classList.remove('bl-card--fill'));
      if (cols !== 2 || !visible.length) return;

      const slots = visible.reduce((sum, card) => {
        const wide = card.classList.contains('bl-card--wide') && !card.classList.contains('bl-card--solo');
        return sum + (wide ? 2 : 1);
      }, 0);

      if (slots % 2) visible[visible.length - 1].classList.add('bl-card--fill');
    };

    const stagger = () => {
      fill();

      let rowTop = null;
      let index = 0;

      cards.forEach((card) => {
        if (card.classList.contains('bl-card--hidden')) return;

        const top = card.offsetTop;

        if (rowTop === null || Math.abs(top - rowTop) > 8) {
          rowTop = top;
          index = 0;
        } else {
          index += 1;
        }

        card.style.setProperty('--a', (index * 0.12).toFixed(2));
      });
    };

    const movePill = () => {
      const button = buttons.find((item) => item.dataset.filter === active);
      if (!button) return;

      pill.style.width = `${button.offsetWidth}px`;
      pill.style.height = `${button.offsetHeight}px`;
      pill.style.transform = `translate3d(${button.offsetLeft}px, ${button.offsetTop}px, 0)`;
    };

    const matches = (card) => {
      const cats = (card.dataset.cats || '').split(' ');
      if (active !== 'all' && !cats.includes(active)) return false;
      if (!query) return true;
      return card.textContent.toLowerCase().includes(query);
    };

    const render = (animate) => {
      const narrowed = active !== 'all' || query;
      let shown = 0;
      let hiddenMore = 0;

      cards.forEach((card) => {
        const fits = matches(card);
        const limited = !narrowed && !expanded && card.hasAttribute('data-more');
        const visible = fits && !limited;

        if (fits && limited) hiddenMore += 1;

        card.classList.toggle('bl-card--hidden', !visible);
        card.classList.toggle('bl-card--solo', Boolean(narrowed));

        if (visible && animate && motion) {
          card.style.setProperty('--e', String(Math.min(shown, 8)));
          card.classList.remove('bl-card--enter');
          card.offsetWidth;
          card.classList.add('bl-card--enter');
        }

        if (visible) shown += 1;
      });

      empty.hidden = shown > 0;
      more.parentElement.hidden = hiddenMore === 0;
      stagger();
      refresh();
    };

    const switchTo = (update) => {
      update();

      if (!motion) {
        render(false);
        return;
      }

      clearTimeout(switchTimer);
      grid.classList.add('bl-grid--out');

      switchTimer = setTimeout(() => {
        grid.classList.remove('bl-grid--out');
        render(true);
      }, 220);
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.filter === active) return;

        switchTo(() => {
          active = button.dataset.filter;

          buttons.forEach((item) => {
            const on = item === button;
            item.classList.toggle('bl-filter__btn--active', on);
            item.setAttribute('aria-pressed', String(on));
          });

          movePill();
        });
      });
    });

    let searchTimer;

    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const value = search.value.trim().toLowerCase();
        if (value === query) return;
        switchTo(() => {
          query = value;
        });
      }, 180);
    });

    more.addEventListener('click', () => {
      const first = cards.find((card) => card.hasAttribute('data-more') && matches(card));

      expanded = true;
      cards.forEach((card) => {
        if (!card.hasAttribute('data-more') || !matches(card)) return;

        card.classList.remove('bl-card--hidden');

        if (motion) {
          card.style.setProperty('--e', String(cards.filter((c) => c.hasAttribute('data-more')).indexOf(card)));
          card.classList.remove('bl-card--enter');
          card.offsetWidth;
          card.classList.add('bl-card--enter');
        }
      });

      more.parentElement.hidden = true;
      stagger();
      refresh();

      if (first) first.querySelector('a').focus({ preventScroll: true });
    });

    grid.addEventListener('animationend', (event) => {
      const card = event.target.closest('.bl-card');
      if (card && event.target === card) card.classList.remove('bl-card--enter');
    });

    document.querySelectorAll('[data-topic]').forEach((topic) => {
      topic.addEventListener('click', () => {
        const button = buttons.find((item) => item.dataset.filter === topic.dataset.topic);
        if (button) button.click();
      });
    });

    movePill();
    requestAnimationFrame(() => filter.classList.add('bl-filter--ready'));

    if (window.ResizeObserver) {
      new ResizeObserver(movePill).observe(filter);
      new ResizeObserver(stagger).observe(grid);
    } else {
      window.addEventListener('resize', movePill);
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

    render(false);
  }

  const idle = [...document.querySelectorAll('.bl-ticker, .bl-hero__media, .bl-news__media')];

  if (idle.length && window.IntersectionObserver) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-still', !entry.isIntersecting);
      });
    }, { rootMargin: '10% 0px' });

    idle.forEach((el) => observer.observe(el));
  }

  const form = document.querySelector('#bl-form');

  if (form) {
    const done = document.querySelector('#bl-done');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.classList.add('bl-form--checked');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      form.hidden = true;
      done.hidden = false;
    });
  }
})();
