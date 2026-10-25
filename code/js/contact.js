const contactCopyStatus = document.getElementById('contactCopyStatus');

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = document.getElementById(button.dataset.copyTarget).textContent.trim();
    button.disabled = true;
    contactCopyStatus.textContent = '';
    try {
      await navigator.clipboard.writeText(value);
      contactCopyStatus.textContent = `已复制${button.dataset.copyLabel}。`;
    } catch {
      contactCopyStatus.textContent = '复制失败，请选中对应内容手动复制。';
    } finally {
      button.disabled = false;
    }
  });
});
