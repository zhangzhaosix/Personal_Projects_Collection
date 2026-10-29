function formatProjectDescription(value) {
  const text = String(value || '暂无简介')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return text.replace(
    /(?:同比增长\s*|约\s*)?\d+(?:\.\d+)?\s*(?:%\s*以上|%|万元|条|位)/g,
    '<strong>$&</strong>'
  );
}

function requiresProjectAccess(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      ['feishu.cn', 'larksuite.com'].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
