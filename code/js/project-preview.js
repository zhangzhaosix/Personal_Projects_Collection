/* 悬浮按需加载轻量局部图，点击后加载完整成果，不连接外部文档服务。 */
(() => {
  'use strict';

  const previews = {
    p_1780814882051_z593: {
      title: '电商数据治理与报表搭建',
      peek: 'sheet',
      file: 'sheet-overview.png',
      alt: '达人种草报表整体概览'
    },
    p_1780841238422_ic9b: {
      title: '电商种草数据监控与归因分析',
      peek: 'bi',
      file: 'bi-overview.png',
      alt: '种草监控 BI 看板整体概览'
    },
    p_1780841697010_p9ip: {
      title: '抖音电商达人效能评估与投放策略优化',
      peek: 'analysis',
      initialFit: 'width',
      pages: [
        { file: 'analysis-report/page-01.png', title: '种草核心结论', alt: '达人种草洞察分析报告封面、种草效果、竞品对比、待优化点与优化策略。' },
        { file: 'analysis-report/page-02.png', title: '效果对比与数据洞察', alt: '核心结论总览、全链路数据对标及付费加热分析。' },
        { file: 'analysis-report/summary-table.png', title: '全链路数据对比总览表', alt: '种草核心结论中的完整全链路数据对比总览表。' },
        { file: 'analysis-report/page-03.png', title: '效率洞察与优质内容定义', alt: '无效种草率与规模效率对比，以及优质内容分析的重点赛道和筛选定义。' },
        { file: 'analysis-report/page-04.png', title: '优质内容筛选与达人下钻', alt: '优质内容衡量、筛选标准、旅行和美女穿搭数据，以及 TOP 达人分析。' },
        { file: 'analysis-chart.png', title: '优质内容完整图表', alt: '优质内容筛选部分的完整图表。' },
        { file: 'analysis-report/page-05.png', title: '旅行达人内容分析', alt: '旅行达人 kkkkkisum 的转化表现、内容风格、成功原因与产品实用性表达优化建议，续至下一页。' },
        { file: 'analysis-report/page-06.png', title: '旅行达人分析续页', alt: '旅行达人精准定位、高审美构图和产品展示分析，以及美女穿搭达人案例的开头。' },
        { file: 'analysis-report/page-07.png', title: '美女穿搭达人内容分析', alt: '美女穿搭达人煜甜儿的风格、视频活力、审美价值、产品展示与动态视频优化建议。' },
        { file: 'analysis-report/page-08.png', title: '优质内容策略总结', alt: '美女穿搭内容质感与种草适配分析续页，以及视觉美感建立停留、极端场景建立信任的策略总结。' },
        { file: 'analysis-report/page-09.png', title: '内容策略与高性价比定义', alt: '颜控停留、功能可视化、情绪种草和动态叙事策略，以及高性价比达人业务定义。' },
        { file: 'analysis-report/page-10.png', title: '高性价比筛选与达人分析', alt: '高性价比达人选择原因、筛选标准和黑皮 couple 案例开头。' },
        { file: 'analysis-report/chart-cost.png', title: '高性价比达人完整图表', alt: '高性价比达人筛选部分的完整图表。' },
        { file: 'analysis-report/page-11.png', title: '黑皮 couple 分析续页', alt: '黑皮 couple 的高难度动作、视觉记忆点、情绪价值与户外场景和情侣动作优化建议。' },
        { file: 'analysis-report/page-12.png', title: '77在路上内容分析', alt: '77在路上的转化表现、风格与成功原因，以及服装环境反差、产品特写和植入效率优化建议。' },
        { file: 'analysis-report/page-13.png', title: '高性价比达人策略总结', alt: '77在路上分析续页，以及保留原有内容模式、放大动作、升级场景和提高产品露出效率的策略总结。' },
        { file: 'analysis-report/page-14.png', title: '潜力股达人定义与筛选', alt: '潜力股达人业务定义、衡量方式、粉丝量级、转化率、每千人转化成本标准与标杆达人。' },
        { file: 'analysis-report/chart-potential.png', title: '潜力股达人完整图表', alt: '潜力股达人筛选部分的完整图表。' },
        { file: 'analysis-report/page-15.png', title: '潜力股达人 kkkkkisum', alt: 'kkkkkisum 的粉丝数、转化效率、氛围感内容优势与高光画面、动态细节和场景转场优化建议。' },
        { file: 'analysis-report/page-16.png', title: '潜力股达人 Soii', alt: 'kkkkkisum 案例结尾，以及 Soii 的转化效率、场景表达、成功原因与场景动机和轻量功能表达优化建议。' },
        { file: 'analysis-report/page-17.png', title: '潜力股达人最终策略总结', alt: 'Soii 案例结尾和原报告最终策略总结，包含高光画面前置、静态内容补动态细节、场景转场升级、场景动机补强及功能细节轻量露出。' }
      ]
    },
    p_1780843960501_2nmq: {
      title: '抖音电商直播用户行为分析',
      peek: 'mindmap',
      file: 'mindmap-complete.png',
      alt: '直播用户行为分析完整思维导图。',
      initialFit: 'width'
    }
  };

  let dialog;
  let viewer;
  let stage;
  let status;
  let retry;
  let zoomLabel;
  let activePreview;
  let activePages;
  let pageIndex = 0;
  let pageSelect;
  let pageCounter;
  let previousPage;
  let nextPage;
  let activeImage;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let lastSize;
  let loadId = 0;
  let motionId = 0;
  let shellAnimation;
  let returnFocus;
  const pointers = new Map();
  const padding = 16;
  const maxScale = 4;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const has = (id) => Object.prototype.hasOwnProperty.call(previews, id);
  const hoverPointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let peek;
  let peekButton;
  let peekTimer;
  let peekImage;
  let suppressedPeekButton;

  function hidePeek() {
    clearTimeout(peekTimer);
    peekImage = null;
    if (peek) peek.hidden = true;
    if (peekButton) {
      const description = (peekButton.getAttribute('aria-describedby') || '')
        .split(/\s+/).filter((id) => id && id !== 'projectPreviewPeek').join(' ');
      if (description) peekButton.setAttribute('aria-describedby', description);
      else peekButton.removeAttribute('aria-describedby');
    }
    peekButton = null;
  }

  function hidePeekSoon() {
    clearTimeout(peekTimer);
    peekTimer = setTimeout(hidePeek, 160);
  }

  function showPeek(button) {
    if (!button.isConnected || dialog?.open) return;
    hidePeek();
    peekButton = button;
    if (!peek) {
      peek = document.createElement('div');
      peek.id = 'projectPreviewPeek';
      peek.className = 'project-preview-peek';
      peek.setAttribute('role', 'tooltip');
      peek.innerHTML = '<div class="project-preview-peek-media"></div><p>局部预览 · 点击「预览成果」查看完整内容</p>';
      peek.addEventListener('pointerenter', () => clearTimeout(peekTimer));
      peek.addEventListener('pointerleave', (event) => {
        if (!peekButton?.contains(event.relatedTarget)) hidePeekSoon();
      });
      document.body.append(peek);
    }
    const media = peek.querySelector('.project-preview-peek-media');
    media.textContent = '正在加载局部预览…';
    const image = new Image();
    peekImage = image;
    image.alt = `${previews[button.dataset.projectPreview].title}的成果局部`;
    image.width = 800;
    image.height = 468;
    image.decoding = 'async';
    image.onload = () => {
      if (peekImage === image) media.replaceChildren(image);
    };
    image.onerror = () => {
      if (peekImage === image) media.textContent = '局部预览暂不可用，点击按钮查看完整成果。';
    };
    image.src = `assets/previews/peek/${previews[button.dataset.projectPreview].peek}.webp`;
    peek.hidden = false;
    const rect = button.getBoundingClientRect();
    const box = peek.getBoundingClientRect();
    peek.style.left = `${Math.max(12, Math.min(innerWidth - box.width - 12, rect.left))}px`;
    const top = rect.top >= box.height + 22 ? rect.top - box.height - 10 : rect.bottom + 10;
    peek.style.top = `${Math.max(12, Math.min(innerHeight - box.height - 12, top))}px`;
    button.setAttribute('aria-describedby', `${button.getAttribute('aria-describedby') || ''} projectPreviewPeek`.trim());
  }

  function queuePeek(button) {
    if (button === suppressedPeekButton) return;
    clearTimeout(peekTimer);
    if (peekButton === button && !peek.hidden) return;
    hidePeek();
    peekTimer = setTimeout(() => showPeek(button), 180);
  }

  document.addEventListener('pointerover', (event) => {
    const button = event.target.closest('button[data-project-preview]');
    if (event.pointerType === 'mouse' && hoverPointer.matches && button && has(button.dataset.projectPreview)) queuePeek(button);
  });
  document.addEventListener('pointerout', (event) => {
    const button = event.target.closest('button[data-project-preview]');
    if (button && button === suppressedPeekButton && !button.contains(event.relatedTarget)) suppressedPeekButton = null;
    if (button && !button.contains(event.relatedTarget) && !peek?.contains(event.relatedTarget)) hidePeekSoon();
  });
  document.addEventListener('focusin', (event) => {
    const button = event.target.closest('button[data-project-preview]');
    if (hoverPointer.matches && button?.matches(':focus-visible') && has(button.dataset.projectPreview)) queuePeek(button);
  });
  document.addEventListener('focusout', (event) => {
    if (event.target === suppressedPeekButton) suppressedPeekButton = null;
    if (event.target.closest('button[data-project-preview]')) hidePeek();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hidePeek(); });
  document.addEventListener('scroll', hidePeek, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hidePeek(); });
  window.addEventListener('resize', hidePeek);
  window.addEventListener('blur', hidePeek);
  hoverPointer.addEventListener('change', hidePeek);

  function fitScale(width = viewer.clientWidth, height = viewer.clientHeight) {
    return Math.min(1,
      Math.max(1, width - padding * 2) / activeImage.naturalWidth,
      Math.max(1, height - padding * 2) / activeImage.naturalHeight);
  }

  function render() {
    const width = activeImage.naturalWidth * scale;
    const height = activeImage.naturalHeight * scale;
    offsetX = width <= viewer.clientWidth - padding * 2
      ? (viewer.clientWidth - width) / 2
      : Math.min(padding, Math.max(viewer.clientWidth - width - padding, offsetX));
    offsetY = height <= viewer.clientHeight - padding * 2
      ? (viewer.clientHeight - height) / 2
      : Math.min(padding, Math.max(viewer.clientHeight - height - padding, offsetY));
    stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    dialog.querySelector('[data-preview-zoom="in"]').disabled = scale >= maxScale;
    dialog.querySelector('[data-preview-zoom="out"]').disabled = scale <= Math.min(0.1, fitScale());
  }

  function zoomAt(value, x = viewer.clientWidth / 2, y = viewer.clientHeight / 2) {
    if (!activeImage) return;
    const nextScale = Math.min(maxScale, Math.max(Math.min(0.1, fitScale()), value));
    const ratio = nextScale / scale;
    offsetX = x - (x - offsetX) * ratio;
    offsetY = y - (y - offsetY) * ratio;
    scale = nextScale;
    render();
  }

  function fitImage(widthOnly = false) {
    if (!activeImage) return;
    scale = widthOnly
      ? Math.min(1, Math.max(1, viewer.clientWidth - padding * 2) / activeImage.naturalWidth)
      : fitScale();
    offsetX = (viewer.clientWidth - activeImage.naturalWidth * scale) / 2;
    offsetY = widthOnly ? padding : (viewer.clientHeight - activeImage.naturalHeight * scale) / 2;
    render();
  }

  function clearPointers() {
    const ids = [...pointers.keys()];
    pointers.clear();
    ids.forEach((id) => {
      if (viewer.hasPointerCapture(id)) viewer.releasePointerCapture(id);
    });
    viewer.classList.remove('is-dragging');
  }

  function pointerPosition(event) {
    const rect = viewer.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * viewer.clientWidth / rect.width,
      y: (event.clientY - rect.top) * viewer.clientHeight / rect.height
    };
  }

  function pinchPosition() {
    const [first, second] = [...pointers.values()];
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.hypot(first.x - second.x, first.y - second.y)
    };
  }

  function cancelShellAnimation() {
    shellAnimation?.cancel();
    shellAnimation = null;
  }

  function animateEntrance(from) {
    if (reducedMotion.matches || !dialog.animate) return;
    const animation = dialog.animate([
      from || { opacity: 0, transform: matchMedia('(max-width: 640px)').matches
        ? 'translateY(14px)' : 'translateY(28px) scale(0.97)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    shellAnimation = animation;
    animation.finished.then(() => {
      if (shellAnimation === animation) shellAnimation = null;
    }).catch(() => {});
  }

  function requestClose() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    const id = ++motionId;
    ++loadId;
    clearPointers();
    const current = getComputedStyle(dialog);
    const from = { opacity: current.opacity, transform: current.transform };
    cancelShellAnimation();
    if (reducedMotion.matches || !dialog.animate) {
      dialog.close();
      return;
    }
    dialog.classList.add('is-closing');
    const animation = dialog.animate([
      from,
      { opacity: 0, transform: matchMedia('(max-width: 640px)').matches
        ? 'translateY(8px)' : 'translateY(12px) scale(0.99)' }
    ], { duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
    shellAnimation = animation;
    animation.finished.then(() => {
      if (id === motionId && dialog.open) dialog.close();
    }).catch(() => {});
  }

  function showPage(index) {
    if (!Number.isInteger(index) || index < 0 || index >= activePages.length) return;
    pageIndex = index;
    pageSelect.value = String(index);
    pageCounter.textContent = `${index + 1} / ${activePages.length}`;
    previousPage.disabled = index === 0;
    nextPage.disabled = index === activePages.length - 1;
    loadImage();
  }

  function loadImage() {
    const requestId = ++loadId;
    const page = activePages[pageIndex];
    const image = new Image();
    clearPointers();
    viewer.scrollTo(0, 0);
    activeImage = null;
    viewer.setAttribute('aria-busy', 'true');
    viewer.classList.remove('is-ready');
    stage.hidden = true;
    stage.replaceChildren();
    status.hidden = false;
    status.textContent = activePages.length > 1 ? `正在加载第 ${pageIndex + 1} 页…` : '正在加载高清预览…';
    retry.hidden = true;
    zoomLabel.textContent = '—';
    dialog.querySelectorAll('[data-preview-zoom]').forEach((button) => { button.disabled = true; });
    image.alt = page.alt || page.title || activePreview.title;
    image.draggable = false;
    image.decoding = 'async';
    image.onload = () => {
      if (requestId !== loadId || !dialog.open) return;
      activeImage = image;
      stage.style.width = `${image.naturalWidth}px`;
      stage.style.height = `${image.naturalHeight}px`;
      stage.replaceChildren(image);
      stage.hidden = false;
      status.hidden = true;
      viewer.setAttribute('aria-busy', 'false');
      viewer.classList.add('is-ready');
      dialog.querySelectorAll('[data-preview-zoom]').forEach((button) => { button.disabled = false; });
      lastSize = { width: viewer.clientWidth, height: viewer.clientHeight };
      fitImage(activePreview.initialFit === 'width');
    };
    image.onerror = () => {
      if (requestId !== loadId || !dialog.open) return;
      status.textContent = '预览图片加载失败，请重试。也可以关闭预览后查看完整项目。';
      viewer.setAttribute('aria-busy', 'false');
      retry.hidden = false;
    };
    image.src = `assets/previews/${page.file}`;
  }

  function createDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'project-preview';
    dialog.setAttribute('aria-labelledby', 'projectPreviewTitle');
    dialog.setAttribute('aria-describedby', 'projectPreviewHint');
    dialog.innerHTML = `
      <header class="project-preview-header">
        <h2 id="projectPreviewTitle"></h2>
        <button class="project-preview-close" type="button" aria-label="关闭成果预览" autofocus>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="project-preview-toolbar">
        <span class="project-preview-view-label">整体概览</span>
        <div class="project-preview-pages" role="group" aria-label="报告页面" hidden>
          <select class="project-preview-page-select" aria-label="选择报告页面"></select>
          <button type="button" data-preview-page="previous" aria-label="上一页"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
          <output class="project-preview-page-count" aria-label="当前报告页码" aria-live="polite"></output>
          <button type="button" data-preview-page="next" aria-label="下一页"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
        </div>
        <div class="project-preview-zoom" role="group" aria-label="图片缩放">
          <button type="button" data-preview-zoom="out" aria-label="缩小图片"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14"/></svg></button>
          <output class="project-preview-scale" aria-label="当前缩放比例">—</output>
          <button type="button" data-preview-zoom="in" aria-label="放大图片"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button>
          <button type="button" data-preview-zoom="native">100%</button>
          <button type="button" data-preview-zoom="fit">适应窗口</button>
        </div>
      </div>
      <div class="project-preview-viewer" tabindex="0" aria-label="成果图片，可拖动平移、滚轮缩放，方向键移动">
        <div class="project-preview-stage" hidden></div>
        <p class="project-preview-status" role="status"></p>
        <button class="project-preview-retry" type="button" hidden>重新加载</button>
      </div>
      <p class="project-preview-hint" id="projectPreviewHint">拖动移动 · 滚轮缩放 · 100% 查看原始像素</p>`;
    document.body.append(dialog);
    viewer = dialog.querySelector('.project-preview-viewer');
    stage = dialog.querySelector('.project-preview-stage');
    status = dialog.querySelector('.project-preview-status');
    retry = dialog.querySelector('.project-preview-retry');
    zoomLabel = dialog.querySelector('.project-preview-scale');
    pageSelect = dialog.querySelector('.project-preview-page-select');
    pageCounter = dialog.querySelector('.project-preview-page-count');
    previousPage = dialog.querySelector('[data-preview-page="previous"]');
    nextPage = dialog.querySelector('[data-preview-page="next"]');

    dialog.querySelector('.project-preview-close').addEventListener('click', requestClose);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      requestClose();
    });
    retry.addEventListener('click', loadImage);
    pageSelect.addEventListener('change', () => showPage(Number(pageSelect.value)));
    previousPage.addEventListener('click', () => showPage(pageIndex - 1));
    nextPage.addEventListener('click', () => showPage(pageIndex + 1));
    dialog.querySelectorAll('[data-preview-zoom]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.previewZoom;
        if (action === 'in') zoomAt(scale * 1.25);
        if (action === 'out') zoomAt(scale / 1.25);
        if (action === 'native') zoomAt(1);
        if (action === 'fit') fitImage();
      });
    });

    viewer.addEventListener('wheel', (event) => {
      if (!activeImage) return;
      event.preventDefault();
      const point = pointerPosition(event);
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewer.clientHeight : 1;
      zoomAt(scale * Math.exp(-event.deltaY * unit * 0.0015), point.x, point.y);
    }, { passive: false });
    viewer.addEventListener('pointerdown', (event) => {
      if (!activeImage || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      viewer.focus({ preventScroll: true });
      pointers.set(event.pointerId, pointerPosition(event));
      viewer.setPointerCapture(event.pointerId);
      viewer.classList.add('is-dragging');
    });
    viewer.addEventListener('pointermove', (event) => {
      if (!activeImage || !pointers.has(event.pointerId)) return;
      event.preventDefault();
      const before = pointers.size > 1 ? pinchPosition() : pointers.get(event.pointerId);
      const point = pointerPosition(event);
      pointers.set(event.pointerId, point);
      if (pointers.size > 1) {
        const after = pinchPosition();
        if (before.distance > 0) zoomAt(scale * after.distance / before.distance, before.x, before.y);
        offsetX += after.x - before.x;
        offsetY += after.y - before.y;
      } else {
        offsetX += point.x - before.x;
        offsetY += point.y - before.y;
      }
      render();
    });
    const endPointer = (event) => {
      pointers.delete(event.pointerId);
      if (viewer.hasPointerCapture(event.pointerId)) viewer.releasePointerCapture(event.pointerId);
      viewer.classList.toggle('is-dragging', pointers.size > 0);
    };
    viewer.addEventListener('pointerup', endPointer);
    viewer.addEventListener('pointercancel', endPointer);
    viewer.addEventListener('lostpointercapture', endPointer);
    window.addEventListener('blur', clearPointers);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearPointers();
    });
    viewer.addEventListener('keydown', (event) => {
      if (!activeImage || event.target !== viewer) return;
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        showPage(pageIndex + (event.key === 'PageDown' ? 1 : -1));
        return;
      }
      const distance = event.shiftKey ? 120 : 40;
      if (event.key === 'ArrowLeft') offsetX += distance;
      else if (event.key === 'ArrowRight') offsetX -= distance;
      else if (event.key === 'ArrowUp') offsetY += distance;
      else if (event.key === 'ArrowDown') offsetY -= distance;
      else if (event.key === '+' || event.key === '=') zoomAt(scale * 1.25);
      else if (event.key === '-') zoomAt(scale / 1.25);
      else if (event.key === '0') fitImage();
      else if (event.key === '1') zoomAt(1);
      else return;
      event.preventDefault();
      render();
    });
    new ResizeObserver(() => {
      if (!dialog.open || !activeImage) return;
      const width = viewer.clientWidth;
      const height = viewer.clientHeight;
      const wasFitted = Math.abs(scale - fitScale(lastSize.width, lastSize.height)) < 0.001;
      if (wasFitted) fitImage();
      else {
        offsetX += (width - lastSize.width) / 2;
        offsetY += (height - lastSize.height) / 2;
        render();
      }
      lastSize = { width, height };
    }).observe(viewer);
    dialog.addEventListener('close', () => {
      // 原生 close 事件可能晚于下一次打开，保留新预览的加载与焦点状态。
      if (dialog.open) return;
      ++motionId;
      cancelShellAnimation();
      dialog.classList.remove('is-closing');
      ++loadId;
      clearPointers();
      activeImage = null;
      stage.replaceChildren();
      document.documentElement.classList.remove('project-preview-open');
      // 关闭弹层会同时恢复焦点和按钮悬浮，离开按钮后再允许局部预览。
      suppressedPeekButton = returnFocus;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      hidePeek();
    });
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches || !dialog.open) return;
      ++motionId;
      cancelShellAnimation();
      if (dialog.classList.contains('is-closing')) dialog.close();
    });
  }

  function open(id, opener) {
    if (!has(id)) return false;
    hidePeek();
    if (!dialog) createDialog();
    const wasClosing = dialog.classList.contains('is-closing');
    const current = wasClosing ? getComputedStyle(dialog) : null;
    const from = current ? { opacity: current.opacity, transform: current.transform } : null;
    const wasOpen = dialog.open;
    ++motionId;
    cancelShellAnimation();
    dialog.classList.remove('is-closing');
    returnFocus = opener || document.activeElement;
    activePreview = previews[id];
    activePages = activePreview.pages || [activePreview];
    pageSelect.replaceChildren(...activePages.map((page, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${index + 1}. ${page.title || `第 ${index + 1} 页`}`;
      return option;
    }));
    dialog.querySelector('.project-preview-pages').hidden = activePages.length < 2;
    dialog.querySelector('.project-preview-view-label').hidden = activePages.length > 1;
    dialog.querySelector('h2').textContent = `${activePreview.title} · 成果预览`;
    dialog.querySelector('.project-preview-hint').textContent = activePreview.initialFit === 'width'
      ? (matchMedia('(max-width: 640px)').matches
        ? '单指拖动 · 双指缩放 · 适应窗口查看全图'
        : '拖拽移动 · 滚轮缩放 · 适应窗口查看全图')
      : (matchMedia('(max-width: 640px)').matches
        ? '单指拖动 · 双指缩放 · 100% 查看原始像素'
        : '拖动移动 · 滚轮缩放 · 100% 查看原始像素');
    document.documentElement.classList.add('project-preview-open');
    if (!dialog.open) dialog.showModal();
    showPage(0);
    if (!wasOpen || wasClosing) animateEntrance(from);
    return true;
  }

  document.addEventListener('click', (event) => {
    hidePeek();
    const button = event.target.closest('button[data-project-preview]');
    if (button && has(button.dataset.projectPreview)) open(button.dataset.projectPreview, button);
  });

  window.ProjectPreview = { has, open };
})();
