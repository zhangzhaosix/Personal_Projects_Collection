/* 首屏成形一次，内容进场一次；默认样式始终可读。 */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 600px)');
  const played = new WeakSet();
  const active = new Map();
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
  let observer;

  function play(element, frames, duration, delay = 0) {
    if (reduced.matches || typeof element.animate !== 'function') return;
    const animation = element.animate(frames, { duration, delay, easing: ease, fill: 'backwards' });
    active.set(animation, element);
    const finish = () => {
      active.delete(animation);
      element.classList.remove('is-motion-entering');
    };
    animation.addEventListener('finish', finish, { once: true });
    animation.addEventListener('cancel', finish, { once: true });
    if (document.hidden) animation.pause();
  }

  function reveal(element) {
    if (played.has(element)) return;
    played.add(element);
    observer?.unobserve(element);
    if (reduced.matches) return;
    const compact = mobile.matches;
    let distance = compact ? 24 : 40;
    let duration = compact ? 520 : 640;
    let delay = 0;
    let transform = `translateY(${distance}px)`;
    let opacity = 0.25;

    if (element.classList.contains('home-project-card')) {
      const index = Array.from(element.parentElement.children).indexOf(element);
      delay = compact ? 0 : index % 2 * 80;
      transform += ' scale(0.985)';
    } else if (element.classList.contains('home-note-row')) {
      transform = `translateX(-${compact ? 10 : 16}px)`;
      duration = 440;
      opacity = 0.5;
    } else if (element.classList.contains('home-section-heading')) {
      transform = `translateY(${compact ? 16 : 24}px)`;
      opacity = 0.5;
      element.classList.add('is-motion-entering');
    } else {
      transform = `translateY(${compact ? 10 : 16}px)`;
      duration = 420;
      opacity = 0.5;
    }
    play(element, [{ opacity, transform }, { opacity: 1, transform: 'none' }], duration, delay);
  }

  function initSections() {
    const elements = document.querySelectorAll('.home-block .reveal');
    if (!observer && !reduced.matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
      }, { threshold: 0, rootMargin: '0px 0px 64px 0px' });
    }
    elements.forEach((element) => {
      element.classList.add('visible');
      element.classList.remove('is-reveal-pending');
      if (played.has(element)) return;
      const bounds = element.getBoundingClientRect();
      if (reduced.matches || !observer || bounds.bottom <= 0) played.add(element);
      else if (bounds.top < window.innerHeight) reveal(element);
      else observer.observe(element);
    });
  }

  function initHero() {
    if (reduced.matches) return;
    const items = document.querySelectorAll('.hero-intro > *');
    items.forEach((element, index) => {
      if (element.getBoundingClientRect().bottom <= 0) return;
      const name = element.classList.contains('hero-name');
      const distance = name ? (mobile.matches ? 26 : 44) : (mobile.matches ? 14 : 24);
      const start = { opacity: name ? 0.35 : 0.2, transform: `translateY(${distance}px)` };
      const end = { opacity: 1, transform: 'none' };
      if (name) {
        start.clipPath = 'inset(0 0 100% 0)';
        end.clipPath = 'inset(0 0 0% 0)';
      }
      play(element, [start, end], name ? 760 : 620, index * (mobile.matches ? 65 : 90));
    });
  }

  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    active.forEach((_, animation) => animation.cancel());
    active.clear();
    observer?.disconnect();
    observer = null;
    document.querySelectorAll('.home-block .reveal').forEach((element) => {
      played.add(element);
      element.classList.remove('is-reveal-pending', 'is-motion-entering');
    });
  });
  document.addEventListener('visibilitychange', () => {
    active.forEach((_, animation) => { if (document.hidden) animation.pause(); else animation.play(); });
  });
  window.HomeMotion = { initHero, initSections };
})();
