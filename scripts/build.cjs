const fs = require('node:fs');
const path = require('node:path');
const { readDocument, publicData } = require('../lib/publication.cjs');

function writePublicFiles(snapshot) {
  const file = path.resolve(__dirname, '../code/published.json');
  if (!snapshot.version || !snapshot.publishedAt || !Number.isFinite(Date.parse(snapshot.publishedAt))) throw new Error('发布版本信息不完整。');
  const output = { version: snapshot.version, publishedAt: snapshot.publishedAt, data: publicData(snapshot.data) };
  const scriptFile = path.resolve(__dirname, '../code/js/firebase-portfolio.js');
  const script = fs.readFileSync(scriptFile, 'utf8');
  const marker = /\/\* published:start \*\/[^\r\n]*\/\* published:end \*\//;
  if (!marker.test(script)) throw new Error('公开内容脚本缺少构建标记。');
  const bundled = script.replace(marker, () => `/* published:start */ ${JSON.stringify(output)} /* published:end */`);
  fs.writeFileSync(file, JSON.stringify(output, null, 2) + '\n');
  fs.writeFileSync(scriptFile, bundled);
  console.log(`公开内容已准备：${output.data.categories.reduce((n, c) => n + c.projects.length, 0)} 个作品，${output.data.notes.length} 条笔记。`);
}

async function build() {
  const source = await readDocument();
  const snapshot = source.data._publication || JSON.parse(fs.readFileSync(path.resolve(__dirname, '../code/published.json'), 'utf8'));
  writePublicFiles(snapshot);
}

if (require.main === module) build().catch(() => { console.error('无法准备发布内容，已停止部署；线上旧版保留。'); process.exitCode = 1; });
module.exports = { build, writePublicFiles };
