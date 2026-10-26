/* 保留附件的字符纹理和颜色，细小图像片段只负责动态位移。 */
(async function initAsciiPortrait() {
  const canvas = document.getElementById('asciiPortrait');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const portrait = canvas.parentElement;
  const image = portrait.querySelector('img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  try {
    await image.decode();
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const sprite = document.createElement('canvas');
    sprite.width = canvas.width;
    sprite.height = canvas.height;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] <= 18 || pixels[index] - pixels[index + 2] <= 3) pixels[index + 3] = 0;
    }
    sprite.getContext('2d').putImageData(imageData, 0, 0);
    const particles = [];
    for (let baseY = 0; baseY < canvas.height; baseY += 24) {
      for (let baseX = 0; baseX < canvas.width; baseX += 18) {
        const width = Math.min(18, canvas.width - baseX);
        const height = Math.min(24, canvas.height - baseY);
        let hasCharacter = false;
        for (let y = baseY; y < baseY + height && !hasCharacter; y++) {
          for (let x = baseX; x < baseX + width; x++) {
            const index = (y * canvas.width + x) * 4;
            if (pixels[index + 3]) {
              hasCharacter = true;
              break;
            }
          }
        }
        if (!hasCharacter) continue;
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 300;
        particles.push({
          baseX, baseY, width, height,
          x: reducedMotion.matches ? baseX : baseX + Math.cos(angle) * distance,
          y: reducedMotion.matches ? baseY : baseY + Math.sin(angle) * distance,
          weight: 0.7 + Math.random() * 0.6
        });
      }
    }
    if (!particles.length) return;

    let pointer = null;
    let frame = 0;
    let previousTime = 0;
    let visible = true;

    function draw(time) {
      frame = 0;
      const step = previousTime ? Math.min(time - previousTime, 32) : 16;
      previousTime = time;
      const ease = 1 - Math.exp(-step / 110);
      let moving = false;
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        if (reducedMotion.matches) {
          particle.x = particle.baseX;
          particle.y = particle.baseY;
        } else {
          particle.x += (particle.baseX - particle.x) * ease;
          particle.y += (particle.baseY - particle.y) * ease;
          if (pointer) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 140) {
              const force = (1 - distance / 140) * 20 * particle.weight * step / 16;
              const nx = distance ? dx / distance : 1;
              const ny = distance ? dy / distance : 0;
              particle.x += (nx - ny * 1.4) * force;
              particle.y += (ny + nx * 1.4) * force;
            }
          }
          if (Math.abs(particle.x - particle.baseX) + Math.abs(particle.y - particle.baseY) < 0.15) {
            particle.x = particle.baseX;
            particle.y = particle.baseY;
          } else {
            moving = true;
          }
        }
        context.drawImage(sprite, particle.baseX, particle.baseY, particle.width, particle.height,
          particle.x, particle.y, particle.width, particle.height);
      });
      if (!moving) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
      }
      portrait.classList.add('is-ready');
      if (moving) schedule();
    }

    function schedule() {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function resetPointer() {
      pointer = null;
      previousTime = 0;
      schedule();
    }

    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      const bounds = canvas.getBoundingClientRect();
      pointer = {
        x: (event.clientX - bounds.left) * canvas.width / bounds.width,
        y: (event.clientY - bounds.top) * canvas.height / bounds.height
      };
      schedule();
    });
    canvas.addEventListener('pointerleave', resetPointer);
    canvas.addEventListener('pointercancel', resetPointer);
    window.addEventListener('blur', resetPointer);
    reducedMotion.addEventListener('change', resetPointer);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      resetPointer();
    });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        pointer = null;
      } else {
        previousTime = 0;
        schedule();
      }
    }).observe(portrait);
    schedule();
  } catch {
    // 解码或 Canvas 不可用时，保留原图。
    portrait.classList.remove('is-ready');
  }
})();
