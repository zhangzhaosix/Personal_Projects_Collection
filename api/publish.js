const { randomUUID } = require('node:crypto');
const deployed = require('../code/published.json');
const { publicData, contentHash, readDocument, writePublication, verifyAdmin } = require('../lib/publication.cjs');

module.exports = async function publish(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: '不支持的请求方式。' });
  }
  const token = /^Bearer (\S+)$/.exec(request.headers.authorization || '')?.[1];
  if (!token) return response.status(401).json({ error: '请先登录管理员账号。' });
  if (request.headers.origin && request.headers.origin !== 'https://' + request.headers.host) {
    return response.status(403).json({ error: '请求来源不正确。' });
  }
  try {
    await verifyAdmin(token);
    const current = await readDocument();
    const data = publicData(current.data);
    const previous = current.data._publication;
    if (request.method === 'GET') {
      return response.status(200).json({
        version: previous?.version || deployed.version,
        publishedAt: previous?.publishedAt || deployed.publishedAt,
        pending: Boolean(previous && previous.version !== deployed.version),
        changed: contentHash(data) !== contentHash(publicData(previous?.data || deployed.data)),
        configured: Boolean(process.env.PORTFOLIO_DEPLOY_HOOK)
      });
    }
    const hook = process.env.PORTFOLIO_DEPLOY_HOOK;
    if (!hook) return response.status(503).json({ error: '发布服务尚未配置，云端修改已保存，线上内容未变。' });
    const hookURL = new URL(hook);
    if (hookURL.origin !== 'https://api.vercel.com' || !hookURL.pathname.startsWith('/v1/integrations/deploy/')) throw new Error('发布服务配置不正确。');
    if (previous && previous.version !== deployed.version && Date.now() - Date.parse(previous.publishedAt) < 120000) {
      return response.status(409).json({ error: '已有发布正在处理中，请等待上线后再发布。' });
    }
    const publication = { version: randomUUID(), publishedAt: new Date().toISOString(), data };
    const frozenTime = await writePublication(publication, token, current.updateTime);
    try {
      const trigger = await fetch(hookURL, { method: 'POST', signal: AbortSignal.timeout(15000) });
      if (!trigger.ok) {
        await writePublication(previous || null, token, frozenTime);
        return response.status(502).json({ error: '发布请求未成功，请稍后重试。线上内容未变。' });
      }
    } catch (error) {
      // 请求超时也可能已经触发部署，交由页面核对实际上线版本。
      return response.status(202).json({ version: publication.version, publishedAt: publication.publishedAt, uncertain: true });
    }
    return response.status(202).json({ version: publication.version, publishedAt: publication.publishedAt });
  } catch (error) {
    return response.status(error.status || 502).json({ error: error.message || '发布服务暂时不可用，请稍后重试。' });
  }
};
