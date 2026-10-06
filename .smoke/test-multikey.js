/* eslint-disable */
// 多 Key 轮换 + 配置面板 验证（离线、确定性、不消耗真实额度）
//
// 轮换逻辑本身用本地 mock 服务器验证：mock 按 Authorization 头决定回 429 还是 200，
// 从而精确复现「key A 被限速 → 自动切 key B → 成功」「全部冷却 → 短路不发请求」两条路径，
// 不依赖任何真实 Key，也不烧平台配额。
const http = require('http')
const path = require('path')
const SRC = path.resolve(__dirname, '..', 'src')
const KEY_URL = 'https://trucklinemp.com/developer/keys'

const OUT = []
const log = (...a) => { const s = a.join(' '); OUT.push(s); console.log(s) }
function assert(cond, msg) { if (!cond) throw new Error('断言失败: ' + msg); return true }

// —— 本地 mock API ——
//   key A  → 429（模拟已达 120 次/小时）
//   key B  → 200（可用）
//   匿名    → 200
//   key Z  → 始终 429（用于「全部冷却短路」用例）
function startMock() {
  const hits = { A: 0, B: 0, Z: 0, anon: 0 }
  const server = http.createServer((req, res) => {
    const auth = String(req.headers.authorization || '')
    const key = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const send = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (key === 'KEY_A') { hits.A++; return send(429, { error: { code: 'RATE_LIMITED', details: { retryAfter: 37 } } }) }
    if (key === 'KEY_Z') { hits.Z++; return send(429, { error: { code: 'RATE_LIMITED', details: { retryAfter: 61 } } }) }
    if (key === 'KEY_B') { hits.B++; return send(200, { api: 'trucklinemp', version: 'v1', via: 'KEY_B' }) }
    hits.anon++
    return send(200, { api: 'trucklinemp', version: 'v1', via: 'anonymous' })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, hits, base: `http://127.0.0.1:${server.address().port}` }))
  })
}

async function main() {
  // ===== 1. 配置面板（真实 schemastery / koishi） =====
  const entry = require(path.join(SRC, 'index.js'))
  assert(entry.name === 'trucklinemp-bot', 'name')
  const cfg = entry.Config({})
  log('=== 1. 配置默认值 ===')
  log(JSON.stringify({ apiBase: cfg.apiBase, apiKeys: cfg.apiKeys, allowAnonymous: cfg.allowAnonymous }))

  const dict = entry.Config.dict || {}
  assert(dict.apiKeys, 'apiKeys 配置项存在')
  assert(dict.allowAnonymous, 'allowAnonymous 配置项存在')
  const desc = (dict.apiKeys.meta && dict.apiKeys.meta.description) || ''
  const comment = (dict.apiKeys.meta && dict.apiKeys.meta.comment) || ''
  log('apiKeys.description =', desc)
  log('apiKeys.comment     =', comment)
  assert(desc.includes(KEY_URL), '描述里有取 Key 的链接')
  assert(comment.includes(KEY_URL), '注释里有取 Key 的链接')
  assert(Array.isArray(cfg.apiKeys), 'apiKeys 是数组类型')
  const ok1 = entry.Config({ apiKeys: ['a', 'b', 'c'] })
  assert(ok1.apiKeys.length === 3, 'apiKeys 可填多把')
  log('PASS  配置面板：多 key 字段 + 取 key 链接已写入')

  // ===== 2. 用 mock ctx 真实 apply（验证全部指令注册） =====
  const commands = []
  const chain = () => {
    const o = { alias: () => o, usage: () => o, action: () => o }
    return o
  }
  const ctx = {
    logger: () => ({ info: () => {}, warn: () => {}, debug: () => {} }),
    setTimeout: () => 0,
    setInterval: () => 0,
    middleware: () => {},
    command: (n) => { commands.push(n); return chain() },
    model: { extend: () => {} },
    get: () => { throw new Error('no service') },
    on: () => {},
  }
  entry.apply(ctx, entry.Config({ apiKeys: ['KEY_A'], allowAnonymous: true }))
  log('=== 2. 指令注册 ===')
  log(commands.join(' / '))
  const has = (c) => commands.some((n) => n === c || n.startsWith(c + ' '))
  for (const c of ['菜单t', '绑定t', '我的绑定t', '解绑t', '查询t', '车队t', '车队排行t', '车队成员t', '招募t', '活动t', '活动详情t', '服务器t', '服务器曲线t', '统计t', '排行t', '新闻t', '封禁t', '合作伙伴t', '规则t', '版本t']) {
    assert(has(c), `缺少指令 ${c}`)
  }
  log(`PASS  已注册 ${commands.length} 条指令（含带参数指令）`)

  // ===== 3. 多 Key 轮换：key A 已限速 → 自动切 key B =====
  const { setApiKeys, keyStats, fetchJson, failMsg } = require(path.join(SRC, 'util/common'))
  const mock = await startMock()
  log('=== 3. 轮换测试（mock：KEY_A=429 / KEY_B=200） ===')
  setApiKeys(['KEY_A', 'KEY_B'], { anonymousFallback: false })
  const d1 = await fetchJson(mock.base + '/version')
  assert(d1 && d1.api, '轮换后仍成功返回')
  assert(d1.via === 'KEY_B', '最终由 KEY_B 返回')
  log('第一次请求结果:', JSON.stringify(d1))
  log('mock 命中:', JSON.stringify(mock.hits))
  assert(mock.hits.A === 1, 'KEY_A 被试了一次（429）')
  assert(mock.hits.B === 1, 'KEY_B 被用了一次（成功）')
  let snap = keyStats()
  log('Key 状态:', JSON.stringify(snap))
  assert(snap[0].cooling > 0, 'KEY_A 已被标记为冷却')
  assert(snap[1].used >= 1 && snap[1].cooling === 0, 'KEY_B 已使用且未冷却')
  log('PASS  遇到 429 自动切换到下一把 Key 并成功')

  // 第二次：A 仍在冷却，应直接命中 B，不再骚扰 A
  const beforeA = mock.hits.A
  const d2 = await fetchJson(mock.base + '/version')
  assert(d2 && d2.via === 'KEY_B', '第二次仍由 KEY_B 返回')
  assert(mock.hits.A === beforeA, '冷却中的 KEY_A 被跳过（未被再次请求）')
  log('PASS  冷却中的 Key 被跳过')

  // ===== 3b. 回归：某把 Key 冷却后「池缩小」不得跳号漏到匿名 =====
  // 旧实现用「一个 cursor 对过滤后的可用池取模」，当第一把 Key 在请求中途冷却、
  // 可用集合从 [A,B,anon] 缩到 [B,anon] 时，cursor=1 会取到 anon 而非 B —— 漏掉真实可用 Key。
  log('=== 3b. 回归：冷却后不得跳过下一把可用 Key ===')
  setApiKeys(['KEY_A', 'KEY_B'], { anonymousFallback: true })
  const anonBefore = mock.hits.anon
  const rb = await fetchJson(mock.base + '/version')
  assert(rb && rb.via === 'KEY_B', `应命中 KEY_B，实际 via=${rb && rb.via}`)
  assert(mock.hits.anon === anonBefore, '不得漏到匿名（anon 命中数应不变）')
  log('PASS  池缩小时仍命中下一把真实 Key，未漏到匿名')

  // ===== 4. 全部 Key 冷却 → 短路（不发请求） =====
  log('=== 4. 全部冷却 → 短路（不空发请求） ===')
  setApiKeys(['KEY_Z'], { anonymousFallback: false })
  let firstErr = null
  try { await fetchJson(mock.base + '/version') } catch (e) { firstErr = e }
  assert(firstErr && firstErr.status === 429, '第一次得到 429')
  const t0 = Date.now()
  let secondErr = null
  try { await fetchJson(mock.base + '/version') } catch (e) { secondErr = e }
  const dt = Date.now() - t0
  assert(secondErr && secondErr.status === 429, '第二次也是 429')
  assert(dt < 300, `短路应瞬时返回（实际 ${dt}ms）`)
  assert(mock.hits.Z === 1, `冷却后不再发请求（KEY_Z 总命中 ${mock.hits.Z} 次）`)
  log(`PASS  全冷却短路：${dt}ms 直接返回，未发网络请求`)
  log('用户看到的提示:', failMsg(secondErr))

  // ===== 5. 匿名回退：所有 Key 冷却时若允许匿名则用匿名 =====
  log('=== 5. 匿名回退（allowAnonymous） ===')
  setApiKeys(['KEY_Z'], { anonymousFallback: true })
  const anonHitsBefore = mock.hits.anon
  const d3 = await fetchJson(mock.base + '/version')
  assert(d3 && d3.via === 'anonymous', '回退到匿名并成功')
  assert(mock.hits.anon === anonHitsBefore + 1, '匿名额度被使用一次')
  log('PASS  全部 Key 冷却时回退匿名（额度独立）')

  mock.server.close()
  log('\n全部通过 ✅')
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
