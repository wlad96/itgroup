(() => {
  const NAME = 'itg_consent';
  const VERSION = 1;
  const MAX_AGE = 60 * 60 * 24 * 365;
  const OPTIONAL = ['analytics', 'marketing'];
  const PATTERNS = {
    analytics: [/^_ga/, /^_gid$/, /^_gat/],
    marketing: [/^_fbp$/, /^_fbc$/, /^_gcl_/],
  };

  const CATEGORIES = [
    {
      key: 'necessary',
      name: 'Necessary',
      locked: true,
      text: 'Needed for the site to work, for example to remember your cookie choice. They don’t track you and can’t be switched off.',
      cookies: [['itg_consent', 'IT Group', 'Remembers your cookie choices', '12 months']],
    },
    {
      key: 'analytics',
      name: 'Analytics',
      text: 'Help us understand which pages people visit and how they use the site, so we can make it better. The data is collected in aggregated form.',
      cookies: [
        ['_ga', 'Google Analytics', 'Tells visitors apart', '2 years'],
        ['_ga_*', 'Google Analytics', 'Keeps the visit session', '2 years'],
      ],
    },
    {
      key: 'marketing',
      name: 'Marketing',
      text: 'Used to measure our ad campaigns and to show you relevant ads on other websites.',
      cookies: [
        ['_fbp', 'Meta', 'Measures ad results', '3 months'],
        ['_gcl_au', 'Google Ads', 'Measures ad conversions', '3 months'],
      ],
    },
  ];

  const ARROW = '<svg class="btn__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8h11M9 3.5 13.5 8 9 12.5"/></svg>';
  const COOKIE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 4.5 4.5 0 0 1-4.5-4.5A4.5 4.5 0 0 1 12 3Z"/><path d="M8.6 9h.01M15.3 15.4h.01M11.8 12.3h.01M11.2 16.8h.01M7.6 14h.01"/></svg>';

  const read = () => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${NAME}=([^;]*)`));
    if (!match) return null;

    try {
      const data = JSON.parse(decodeURIComponent(match[1]));
      return data && data.v === VERSION ? data : null;
    } catch (error) {
      return null;
    }
  };

  const makeId = () => {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  };

  const write = (choice) => {
    const prev = read();
    const data = {
      v: VERSION,
      id: prev ? prev.id : makeId(),
      date: new Date().toISOString(),
    };

    OPTIONAL.forEach((key) => {
      data[key] = !!choice[key];
    });

    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${NAME}=${encodeURIComponent(JSON.stringify(data))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    return data;
  };

  const clearCookies = (key) => {
    const host = location.hostname;
    const parts = host.split('.');
    const domains = ['', host, `.${host}`];
    if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`);

    document.cookie.split(';').forEach((item) => {
      const name = item.split('=')[0].trim();
      if (!PATTERNS[key].some((pattern) => pattern.test(name))) return;

      domains.forEach((domain) => {
        const attr = domain ? `; Domain=${domain}` : '';
        document.cookie = `${name}=; Max-Age=0; Path=/${attr}`;
      });
    });
  };

  const activateScripts = (consent) => {
    document.querySelectorAll('script[type="text/plain"][data-cookie-category]').forEach((blocked) => {
      if (!consent[blocked.dataset.cookieCategory]) return;

      const script = document.createElement('script');
      [...blocked.attributes].forEach(({ name, value }) => {
        if (name === 'type' || name === 'data-cookie-category' || name === 'data-src') return;
        script.setAttribute(name, value);
      });

      if (blocked.dataset.src) script.src = blocked.dataset.src;
      else script.textContent = blocked.textContent;

      blocked.replaceWith(script);
    });
  };

  const apply = (consent) => {
    if (typeof window.gtag === 'function') {
      const state = (on) => (on ? 'granted' : 'denied');
      window.gtag('consent', 'update', {
        analytics_storage: state(consent.analytics),
        ad_storage: state(consent.marketing),
        ad_user_data: state(consent.marketing),
        ad_personalization: state(consent.marketing),
      });
    }

    activateScripts(consent);
    document.dispatchEvent(new CustomEvent('itg:consent', { detail: consent }));
  };

  const categoryHtml = (cat) => {
    const id = `cookie-cat-${cat.key}`;
    const cookies = cat.cookies.map(([name, provider, purpose, time]) => `
            <li class="cookie-list__item">
              <p class="cookie-list__top"><span class="cookie-list__name">${name}</span><span class="cookie-list__time">${time}</span></p>
              <p class="cookie-list__purpose">${provider} · ${purpose}</p>
            </li>`).join('');

    return `
      <div class="cookie-cat">
        <div class="cookie-cat__row">
          <button class="cookie-cat__toggle" type="button" aria-expanded="false" aria-controls="${id}">
            <svg class="cookie-cat__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            <span class="cookie-cat__name">${cat.name}</span>
            ${cat.locked ? '<span class="cookie-cat__note">Always on</span>' : ''}
          </button>
          <label class="switch${cat.locked ? ' switch--locked' : ''}">
            <input class="switch__input" type="checkbox" role="switch" data-cookie-switch="${cat.key}" aria-label="${cat.name} cookies"${cat.locked ? ' checked disabled' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>
        <div class="cookie-cat__panel" id="${id}">
          <div class="cookie-cat__inner">
            <div class="cookie-cat__content">
              <p class="cookie-cat__text">${cat.text}</p>
              <ul class="cookie-list" role="list">${cookies}
              </ul>
            </div>
          </div>
        </div>
      </div>`;
  };

  const banner = document.createElement('section');
  banner.className = 'cookie';
  banner.hidden = true;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-labelledby', 'cookie-title');
  banner.innerHTML = `
    <div class="cookie__head">
      <span class="cookie__icon">${COOKIE}</span>
      <h2 class="cookie__title" id="cookie-title">We use cookies</h2>
    </div>
    <p class="cookie__text">Necessary cookies keep the site working. With your consent, we’d also use analytics and marketing cookies to see how the site is used and improve it. You can change your choice at any time. <a class="cookie__link" href="cookie-policy.html">Cookie Policy</a></p>
    <div class="cookie__actions">
      <button class="btn btn--sm cookie-btn-line" type="button" data-cookie-action="reject">Reject all</button>
      <button class="btn btn--dark btn--sm" type="button" data-cookie-action="accept">Accept all</button>
    </div>
    <button class="cookie__more" type="button" data-cookie-settings>Customize settings${ARROW}</button>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'cookie-dialog';
  dialog.setAttribute('aria-labelledby', 'cookie-dialog-title');
  dialog.innerHTML = `
    <div class="cookie-dialog__box" tabindex="-1">
      <button class="cookie-dialog__close" type="button" data-cookie-close aria-label="Close cookie settings">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>
      </button>

      <div class="cookie-dialog__head">
        <p class="cookie-dialog__pill">Privacy</p>
        <h2 class="cookie-dialog__title" id="cookie-dialog-title">Cookie settings</h2>
        <p class="cookie-dialog__text">Choose which cookies we can use. Your choice is saved for 12 months, and you can change it at any time via “Cookie settings” at the bottom of any page. Read more in our <a class="cookie__link" href="cookie-policy.html">Cookie Policy</a>.</p>
      </div>

      <div class="cookie-dialog__body">${CATEGORIES.map(categoryHtml).join('')}
      </div>

      <div class="cookie-dialog__foot">
        <button class="btn btn--sm cookie-btn-line cookie-dialog__save" type="button" data-cookie-action="save">Save choices</button>
        <button class="btn btn--sm cookie-btn-line" type="button" data-cookie-action="reject">Reject all</button>
        <button class="btn btn--dark btn--sm" type="button" data-cookie-action="accept">Accept all</button>
      </div>
    </div>`;

  document.body.prepend(banner);
  document.body.append(dialog);

  const box = dialog.querySelector('.cookie-dialog__box');
  const switches = [...dialog.querySelectorAll('[data-cookie-switch]:not(:disabled)')];
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let bannerTimer;
  let closing = false;
  let lockedY = 0;

  const showBanner = () => {
    clearTimeout(bannerTimer);
    banner.hidden = false;
    banner.offsetHeight;
    banner.classList.add('cookie--visible');
  };

  const hideBanner = () => {
    if (banner.hidden) return;
    banner.classList.remove('cookie--visible');
    bannerTimer = setTimeout(() => {
      banner.hidden = true;
    }, reduced ? 0 : 450);
  };

  const lock = () => {
    lockedY = window.scrollY;
    document.body.style.cssText += `position:fixed;top:${-lockedY}px;left:0;right:0;width:100%;`;
  };

  const unlock = () => {
    ['position', 'top', 'left', 'right', 'width'].forEach((prop) => {
      document.body.style.removeProperty(prop);
    });
    document.body.offsetHeight;
    window.scrollTo({ top: lockedY, behavior: 'instant' });
  };

  const openDialog = () => {
    if (dialog.open || typeof dialog.showModal !== 'function') return;

    const consent = read() || {};
    switches.forEach((input) => {
      input.checked = !!consent[input.dataset.cookieSwitch];
    });

    dialog.querySelectorAll('.cookie-cat').forEach((cat) => {
      cat.classList.remove('cookie-cat--open');
      cat.querySelector('.cookie-cat__toggle').setAttribute('aria-expanded', 'false');
    });

    dialog.showModal();
    lock();
    box.focus({ preventScroll: true });
    requestAnimationFrame(() => dialog.classList.add('cookie-dialog--open'));
  };

  const closeDialog = () => {
    if (!dialog.open || closing) return;
    closing = true;

    dialog.classList.remove('cookie-dialog--open');
    dialog.classList.add('cookie-dialog--closing');

    setTimeout(() => {
      dialog.close();
      dialog.classList.remove('cookie-dialog--closing');
      unlock();
      closing = false;
    }, reduced ? 0 : 260);
  };

  const save = (choice) => {
    const prev = read();
    const consent = write(choice);

    hideBanner();
    closeDialog();

    const revoked = OPTIONAL.filter((key) => prev && prev[key] && !consent[key]);
    revoked.forEach(clearCookies);

    if (revoked.length) {
      setTimeout(() => location.reload(), reduced ? 0 : 300);
      return;
    }

    apply(consent);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-cookie-settings]');
    if (trigger) {
      event.preventDefault();
      openDialog();
      return;
    }

    const action = event.target.closest('[data-cookie-action]');
    if (!action) return;

    const type = action.dataset.cookieAction;
    const choice = {};

    OPTIONAL.forEach((key) => {
      if (type === 'accept') choice[key] = true;
      else if (type === 'reject') choice[key] = false;
      else choice[key] = !!dialog.querySelector(`[data-cookie-switch="${key}"]`).checked;
    });

    save(choice);
  });

  dialog.querySelectorAll('.cookie-cat__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.closest('.cookie-cat').classList.toggle('cookie-cat--open', open);
    });
  });

  dialog.querySelector('[data-cookie-close]').addEventListener('click', closeDialog);

  dialog.addEventListener('click', (event) => {
    if (!event.target.closest('.cookie-dialog__box')) closeDialog();
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });

  window.itgCookies = {
    has: (key) => key === 'necessary' || !!(read() || {})[key],
    open: openDialog,
  };

  const current = read();

  if (current) {
    apply(current);
  } else {
    bannerTimer = setTimeout(showBanner, reduced ? 0 : 900);
  }
})();
