const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadCopy(clipboard) {
  const values = {
    contactQqEmail: '1801327763@qq.com',
    contactGmail: 'zhangzhaosix@gmail.com',
    contactWechat: 'zhangzhaosix'
  };
  const labels = ['QQ 邮箱', 'Gmail 邮箱', '微信号'];
  const status = { textContent: '' };
  const buttons = Object.keys(values).map((target, index) => ({
    dataset: { copyTarget: target, copyLabel: labels[index] },
    disabled: false,
    addEventListener(_, handler) { this.click = handler; }
  }));
  const context = vm.createContext({
    navigator: { clipboard },
    document: {
      getElementById(id) { return id === 'contactCopyStatus' ? status : { textContent: values[id] }; },
      querySelectorAll() { return buttons; }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/contact.js'), 'utf8'), context);
  return { buttons, status, values };
}

test('三个复制按钮分别复制对应联系方式并显示成功提示', async () => {
  const written = [];
  const { buttons, status, values } = loadCopy({ async writeText(value) { written.push(value); } });
  for (const button of buttons) {
    await button.click();
    assert.equal(status.textContent, `已复制${button.dataset.copyLabel}。`);
    assert.equal(button.disabled, false);
  }
  assert.deepEqual(written, Object.values(values));
});

test('拒绝复制后显示手动复制提示，并允许重试', async () => {
  let reject = true;
  const { buttons, status } = loadCopy({ async writeText() { if (reject) throw new Error('denied'); } });
  await buttons[1].click();
  assert.match(status.textContent, /手动复制/);
  assert.equal(buttons[1].disabled, false);
  reject = false;
  await buttons[1].click();
  assert.equal(status.textContent, '已复制Gmail 邮箱。');
});

test('浏览器不支持剪贴板接口时仍可手动复制', async () => {
  const { buttons, status } = loadCopy(undefined);
  await buttons[0].click();
  assert.match(status.textContent, /手动复制/);
  assert.equal(buttons[0].disabled, false);
});
