(() => {
  const stage = document.querySelector('.nf__stage');
  const art = document.querySelector('.nf__art');
  if (!stage || !art) return;

  const motion = document.documentElement.classList.contains('has-anim');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (motion && fine) {
    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      art.style.setProperty('--rx', `${(x * 10).toFixed(2)}deg`);
      art.style.setProperty('--ry', `${(y * -8).toFixed(2)}deg`);
      art.style.setProperty('--tx', `${(x * 18).toFixed(1)}px`);
      art.style.setProperty('--ty', `${(y * 12).toFixed(1)}px`);
    };

    window.addEventListener('pointermove', (event) => {
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    });
  }

  if (fine) {
    document.querySelectorAll('.nf-link').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });
  }
})();
