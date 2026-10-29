const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/project-text.js'), 'utf8'), context);
for (const value of ['https://vcnnr111xqu6.feishu.cn/docx/example', 'https://FEISHU.CN/docx/a', 'https://team.larksuite.com/wiki/a']) {
  assert.equal(context.requiresProjectAccess(value), true, value);
}
for (const value of ['', 'invalid', 'javascript:alert(1)', 'https://task-list-chi-rust.vercel.app/', 'https://feishu.cn.evil.test/', 'https://evil-feishu.cn/', 'https://example.com/?url=feishu.cn']) {
  assert.equal(context.requiresProjectAccess(value), false, value);
}
console.log('Project access notices: Feishu/Lark host matching and false positives passed.');
