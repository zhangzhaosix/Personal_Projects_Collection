const { createHash } = require('node:crypto');
const { normalizePortfolioData, FIREBASE_CONFIG, ADMIN_EMAIL } = require('../code/js/firebase-portfolio.js');

const DOCUMENT_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/portfolio/site`;

function decode(value) {
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('nullValue' in value) return null;
  if ('integerValue' in value || 'doubleValue' in value) return Number(value.integerValue ?? value.doubleValue);
  return value.stringValue ?? value.booleanValue ?? value.timestampValue;
}

function encode(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: String(value) };
}

function publicData(source) {
  if (!source || !Array.isArray(source.categories) || !Array.isArray(source.notes)) throw new Error('云端内容格式不完整，已取消发布。');
  const ids = new Set();
  for (const category of source.categories) {
    if (!category || !category.id || !category.name || !Array.isArray(category.projects)) throw new Error('作品分类数据不完整。');
    for (const item of [category, ...(category.groups || []), ...category.projects]) {
      if (!item?.id || ids.has(item.id)) throw new Error('内容存在缺失或重复的标识。');
      ids.add(item.id);
    }
  }
  for (const note of source.notes) {
    if (!note?.id || !note.title || ids.has(note.id)) throw new Error('笔记数据不完整或标识重复。');
    ids.add(note.id);
  }
  const data = normalizePortfolioData(source);
  for (const item of [...data.categories.flatMap(category => category.projects), ...data.notes]) {
    if (item.url && !/^https?:\/\//i.test(item.url)) throw new Error('作品或笔记的网址必须以 http:// 或 https:// 开头。');
  }
  if (Buffer.byteLength(JSON.stringify(data)) > 400000) throw new Error('公开内容过大，请先精简内容后再发布。');
  return data;
}

function contentHash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function readDocument(fetcher = fetch) {
  const response = await fetcher(DOCUMENT_URL, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('读取云端内容失败，请稍后重试。');
  const document = await response.json();
  return { data: decode({ mapValue: { fields: document.fields } }), updateTime: document.updateTime };
}

async function writePublication(publication, token, updateTime, fetcher = fetch) {
  const url = `${DOCUMENT_URL}?updateMask.fieldPaths=_publication&currentDocument.updateTime=${encodeURIComponent(updateTime)}`;
  const fields = publication ? { _publication: encode(publication) } : {};
  const response = await fetcher(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(15000)
  });
  if (response.status === 409 || response.status === 412) {
    const error = new Error('云端内容刚刚发生变化，请重新检查后发布。');
    error.status = 409;
    throw error;
  }
  if (!response.ok) throw new Error('保存发布版本失败，线上内容未变。');
  return (await response.json()).updateTime;
}

async function verifyAdmin(token, fetcher = fetch) {
  const response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  const user = result.users?.[0];
  if (!response.ok || !user?.localId || user.disabled || user.email !== ADMIN_EMAIL) {
    const error = new Error('管理员登录已失效，请重新登录。');
    error.status = 401;
    throw error;
  }
}

module.exports = { DOCUMENT_URL, decode, encode, publicData, contentHash, readDocument, writePublication, verifyAdmin };
