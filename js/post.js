(() => {
  const content = document.querySelector('.ps-content');
  if (!content) return;

  const bar = document.querySelector('.ps-progress__bar');
  const toc = document.querySelector('.ps-toc');
  const links = [...toc.querySelectorAll('.ps-toc__link')];
  const heads = links.map((link) => document.querySelector(link.getAttribute('href')));
  const fillLine = toc.querySelector('.ps-toc__fill');
  const current = toc.querySelector('.ps-toc__current');
  const left = toc.querySelector('.ps-toc__left-value');
  const toggle = toc.querySelector('.ps-toc__toggle');
  const minutes = Number(content.dataset.minutes) || 8;

  let active = -1;
  let ticking = false;

  const setActive = (index) => {
    if (index === active) return;
    active = index;

    links.forEach((link, i) => {
      link.classList.toggle('ps-toc__link--active', i === index);
      link.classList.toggle('ps-toc__link--done', i < index);
      if (i === index) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

    const link = links[index];
    if (!link) return;

    current.textContent = link.lastChild.textContent;
    fillLine.style.height = `${link.offsetTop + link.offsetHeight}px`;
  };

  const update = () => {
    ticking = false;

    const rect = content.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height - vh * 0.6;
    const progress = Math.min(1, Math.max(0, (vh * 0.4 - rect.top) / total));

    bar.style.transform = `scaleX(${progress.toFixed(4)})`;

    const remaining = Math.ceil(minutes * (1 - progress));
    left.textContent = progress >= 0.99 ? 'Finished — nice!' : `${Math.max(1, remaining)} min left`;

    const line = vh * 0.3;
    let index = 0;
    heads.forEach((head, i) => {
      if (head && head.getBoundingClientRect().top <= line) index = i;
    });

    setActive(index);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  const setToc = (open) => {
    toc.classList.toggle('ps-toc--open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setToc(!toc.classList.contains('ps-toc--open')));

  links.forEach((link) => {
    link.addEventListener('click', () => setToc(false));
  });

  update();

  const url = encodeURIComponent(location.href.split('#')[0]);
  const heading = document.querySelector('h1');
  const title = encodeURIComponent((heading && heading.getAttribute('aria-label')) || document.title);
  const targets = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://x.com/intent/post?url=${url}&text=${title}`,
  };

  document.querySelectorAll('[data-share]').forEach((item) => {
    const type = item.dataset.share;

    if (targets[type]) {
      item.href = targets[type];
      return;
    }

    let timer;

    item.addEventListener('click', async () => {
      const link = location.href.split('#')[0];

      try {
        await navigator.clipboard.writeText(link);
      } catch (error) {
        const field = document.createElement('textarea');
        field.value = link;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;opacity:0;';
        document.body.append(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }

      item.classList.add('ps-share__btn--copied');
      clearTimeout(timer);
      timer = setTimeout(() => item.classList.remove('ps-share__btn--copied'), 1800);
    });
  });

  const rate = document.querySelector('#ps-rate');

  if (rate) {
    const buttons = [...rate.querySelectorAll('.ps-rate__btn')];
    const thanks = rate.querySelector('.ps-rate__thanks');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((item) => {
          const on = item === button;
          item.classList.toggle('ps-rate__btn--active', on);
          item.setAttribute('aria-pressed', String(on));
        });

        thanks.hidden = false;
      });
    });
  }

  const glow = document.querySelector('.ps-cover');

  if (glow && window.IntersectionObserver) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => glow.classList.toggle('is-still', !entry.isIntersecting));
    }).observe(glow);
  }
})();
