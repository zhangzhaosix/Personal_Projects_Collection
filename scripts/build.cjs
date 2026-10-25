const fs = require('node:fs');
const path = require('node:path');
const { readDocument, publicData } = require('../lib/publication.cjs');

async function build() {
  const file = path.resolve(__dirname, '../code/published.json');
  const source = await readDocument();
  const frozen = source.data._publication;
  const snapshot = frozen || JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!snapshot.version || !snapshot.publishedAt || !Number.isFinite(Date.parse(snapshot.publishedAt))) throw new Error('发布版本信息不完整。');
  const output = { version: snapshot.version, publishedAt: snapshot.publishedAt, data: publicData(snapshot.data) };
  fs.writeFileSync(file, JSON.stringify(output, null, 2) + '\n');
  console.log(`公开内容已准备：${output.data.categories.reduce((n, c) => n + c.projects.length, 0)} 个作品，${output.data.notes.length} 条笔记。`);
}

if (require.main === module) build().catch(() => { console.error('无法准备发布内容，已停止部署；线上旧版保留。'); process.exitCode = 1; });
module.exports = { build };
