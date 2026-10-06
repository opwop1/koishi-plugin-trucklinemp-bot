const { h } = require('koishi')
const { FONT } = require('./constant')
const { KeyPool } = require('./keypool')

// 🎨 共享卡片主题（公路玻璃拟态 / Highway Glass）
//   - 底色：柔和公路色系极光渐变（琥珀 / 天蓝 / 薄荷 / 靛），直接画在 body 上
//   - 卡面：白色磨砂玻璃（半透明 + backdrop-filter 强模糊 + 白色描边 + 内外双高光 + 柔和投影）
//   - 签名元素：顶部彩色路带 + 下方一条路面虚线（.lane），呼应卡车/公路主题；两团柔光 orb
//   - 每张卡保留各自强调色（--ac / --ac2）
function cardTheme(accent, accent2, width) {
  const a2 = accent2 || accent
  return `:root{--ac:${accent};--ac2:${a2};--glass:rgba(255,255,255,.68);--glass-2:rgba(255,255,255,.52);--glass-3:rgba(255,255,255,.34);--stroke:rgba(255,255,255,.95);--edge:rgba(124,144,196,.22);--edge-2:rgba(124,144,196,.13);--t1:#16203a;--t2:#48587a;--t3:#7b8aa5;--card-shadow:0 26px 64px -24px rgba(58,76,140,.50);--panel-shadow:0 12px 30px -16px rgba(58,76,140,.36),inset 0 1px 0 rgba(255,255,255,.95)}
*{margin:0;padding:0;box-sizing:border-box}
body{background-color:#eef2fc;background-image:radial-gradient(48% 42% at 8% 2%,rgba(251,191,36,.58),transparent 64%),radial-gradient(44% 40% at 94% 6%,rgba(56,189,248,.50),transparent 62%),radial-gradient(50% 46% at 90% 94%,rgba(52,211,153,.44),transparent 64%),radial-gradient(46% 40% at 6% 98%,rgba(129,140,248,.46),transparent 62%),radial-gradient(40% 36% at 50% 50%,rgba(244,114,182,.26),transparent 66%),radial-gradient(34% 30% at 62% 12%,rgba(167,139,250,.36),transparent 64%);background-repeat:no-repeat;font-family:${FONT}}
#card{position:relative;overflow:hidden;width:${width || 720}px;padding:30px 28px 16px;color:var(--t2);border-radius:26px;background:linear-gradient(150deg,rgba(255,255,255,.60),rgba(248,251,255,.38) 48%,rgba(255,255,255,.54));border:1px solid var(--stroke);box-shadow:var(--card-shadow),inset 0 1px 0 rgba(255,255,255,.98),inset 0 -1px 0 rgba(255,255,255,.35);backdrop-filter:saturate(190%) blur(26px);-webkit-backdrop-filter:saturate(190%) blur(26px)}
#card::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.55),transparent 24%),linear-gradient(115deg,rgba(255,255,255,.42) 0%,rgba(255,255,255,.06) 34%,transparent 58%)}
#card>*{position:relative;z-index:1}
#card>.lane,#card>.orb{z-index:0}
#card>.lane{position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--ac),var(--ac2) 78%,transparent);opacity:.92;box-shadow:0 7px 22px -6px var(--ac)}
#card>.lane::after{content:'';position:absolute;left:0;right:0;top:9px;height:2px;background-image:repeating-linear-gradient(90deg,var(--ac) 0 16px,transparent 16px 32px);opacity:.30}
#card>.orb{position:absolute;border-radius:50%;filter:blur(72px);pointer-events:none}
#card>.orb1{width:330px;height:330px;background:var(--ac);top:-180px;right:-120px;opacity:.32}
#card>.orb2{width:270px;height:270px;background:var(--ac2);bottom:-160px;left:-100px;opacity:.24}`
}

const CARD_DECO = '<div class="lane"></div><div class="orb orb1"></div><div class="orb orb2"></div>'

let httpReady = false

function setupHttp() {
  if (httpReady) return
  httpReady = true
  try {
    const { Agent, setGlobalDispatcher } = require('undici')
    setGlobalDispatcher(new Agent({
      keepAliveTimeout: 5 * 60 * 1000,
      keepAliveMaxTimeout: 5 * 60 * 1000,
      connections: 4,
      connect: { timeout: 6000 },
    }))
  } catch (e) { /* 环境无 undici 时退回默认 fetch */ }
}

// —— API Key 池（多把轮换） ——
// 平台限速**按 Key 计、不按 IP**，每把 Key 120 次/小时，所以多把 Key 轮换可线性扩容。
// 获取 Key：https://trucklinemp.com/developer/keys
const pool = new KeyPool()

function setApiKeys(keys, opts) {
  return pool.setKeys(keys, opts)
}

function keyStats() {
  return pool.snapshot()
}

function onRateLimited(cb) {
  pool.onRateLimited = cb
}

function apiHeaders(extra, key) {
  const headers = Object.assign({
    Accept: 'application/json',
    'User-Agent': 'koishi-plugin-trucklinemp-bot',
  }, extra || {})
  if (key) headers.Authorization = 'Bearer ' + key
  return headers
}

async function hedgedFetch(url, options) {
  const opts = Object.assign({ signal: AbortSignal.timeout(12000) }, options || {})
  return new Promise((resolve, reject) => {
    let done = false
    let failures = 0
    let lastErr = null
    const timers = []
    const settle = (fn, v) => {
      if (done) return
      done = true
      for (const t of timers) clearTimeout(t)
      fn(v)
    }
    const launch = () => {
      if (done) return
      fetch(url, opts)
        .then((res) => {
          if (done) {
            try { res.body && res.body.cancel && res.body.cancel().catch(() => {}) } catch (e) { /* ignore */ }
            return
          }
          settle(resolve, res)
        })
        .catch((e) => {
          if (done) return
          failures++
          lastErr = e
          if (failures >= 3) settle(reject, lastErr)
        })
    }
    for (const delay of [0, 1800, 4500]) timers.push(setTimeout(launch, delay))
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function makeError(message, status, retryAfter) {
  const e = new Error(message)
  if (status != null) e.status = status
  if (retryAfter != null) e.retryAfter = retryAfter
  return e
}

// ⚠️ TrucklineMP 的实际配额是「每把 Key 每小时 120 次」（/rate-limits 自报的 1000/分钟并不真实）。
// 这里刻意「一次调用只发一个请求」：不做并发对冲；命中 429 自动换下一把 Key；
// 所有 Key 都在冷却时直接短路失败（不再空发请求白白消耗额度）。
async function fetchJson(url, options) {
  const base = options || {}
  const attempts = Math.max(1, pool.count())
  const tried = new Set()
  let lastErr = null

  for (let a = 0; a < attempts; a++) {
    const pick = pool.count() > 0 ? pool.pick(tried) : { key: '', label: '匿名', anonymous: true, exhausted: false, retryAfter: 0 }
    if (pick.exhausted) {
      // 全部 Key 都在冷却：立刻失败，省下一次必然会 429 的请求
      throw makeError('RATE_LIMITED', 429, pick.retryAfter)
    }
    if (pick.key) tried.add(pick.key)
    const headers = apiHeaders(base.headers, pick.key)

    let keyErr = null
    for (let r = 0; r < 3; r++) {
      if (r) await sleep(r === 1 ? 700 : 1600)
      try {
        const res = await fetch(url, Object.assign({}, base, { headers, signal: AbortSignal.timeout(12000) }))
        if (res.status === 429) {
          let retryAfter = Number(res.headers.get('retry-after')) || 0
          try {
            const b = await res.json()
            if (b && b.error && b.error.details && b.error.details.retryAfter) retryAfter = b.error.details.retryAfter
          } catch (e) { /* ignore */ }
          pool.markRateLimited(pick.key, retryAfter)
          keyErr = makeError('RATE_LIMITED', 429, retryAfter)
          break // 换下一把 Key
        }
        if (!res.ok) {
          let detail = ''
          try {
            const b = await res.json()
            detail = (b && b.error && b.error.code) || ''
          } catch (e) { /* ignore */ }
          const err = makeError(`HTTP ${res.status}${detail ? ' ' + detail : ''}`, res.status)
          if (res.status < 500) throw err
          keyErr = err
          continue
        }
        const data = await res.json()
        pool.markUsed(pick.key)
        return data
      } catch (e) {
        if (e && e.status === 429) { keyErr = e; break }
        if (e && e.status && e.status < 500) throw e
        keyErr = e
      }
    }
    lastErr = keyErr || lastErr
    if (!pick.key) break // 匿名也失败，无需再循环
  }

  throw lastErr || makeError('NETWORK')
}

// 面向用户的失败提示（尤其把限速说清楚）
function failMsg(e) {
  if (e && e.status === 429) {
    const sec = Math.max(1, Math.round(Number(e.retryAfter) || 0))
    const tip = sec > 90 ? `${Math.ceil(sec / 60)} 分钟` : `${sec} 秒`
    const n = pool.keyCount()
    const who = n > 1 ? `${n} 把 API Key 均已` : n === 1 ? '当前 API Key 已' : '匿名额度已'
    return `⏳ ${who}达到平台限速（每把 120 次/小时），约 ${tip}后恢复，请稍后再试`
  }
  return '查询失败，请稍后再试'
}

const memoStore = new Map()

async function fetchJsonMemo(url, ttl) {
  const now = Date.now()
  const hit = memoStore.get(url)
  if (hit && now - hit.at < (ttl || 30000)) return hit.data
  const data = await fetchJson(url)
  memoStore.set(url, { at: now, data })
  return data
}

async function warm(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const data = await fetchJson(url) // 走 Key 池，会计入本地用量
      memoStore.set(url, { at: Date.now(), data })
      return true
    } catch (e) {
      if (e && e.status === 429) return false // 限速中就别反复试，省额度
      await sleep(i === 0 ? 1200 : 3000)
    }
  }
  return false
}

function bindingQuery(session) {
  return { platform: session.platform, userId: session.userId }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtNum(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US')
}

// 秒 → "12 小时 34 分" / "3 天 4 小时"
function fmtDuration(sec) {
  const s = Number(sec) || 0
  if (s <= 0) return '0 分'
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const parts = []
  if (days) parts.push(`${days} 天`)
  if (hours) parts.push(`${hours} 小时`)
  if (!days && mins) parts.push(`${mins} 分`)
  return parts.join(' ') || '0 分'
}

function esc(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => map[c])
}

// 描述文本可能含 Markdown（** 粗体、* 斜体、# 标题、换行）；转成安全 HTML
function richText(s, limit) {
  let t = String(s == null ? '' : s)
  if (limit && t.length > limit) t = t.slice(0, limit) + '…'
  return esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|\n)#{1,6}\s*([^\n]+)/g, '$1<b>$2</b>')
    .replace(/\n/g, '<br>')
}

const imageCache = new Map()

// 把远程图片内联为 base64，避免 puppeteer 截图时因外链图片未加载而留白
async function resolveImage(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  let abs = raw
  if (raw.startsWith('//')) abs = 'https:' + raw
  else if (raw.startsWith('/')) abs = 'https://trucklinemp.com' + raw
  const hit = imageCache.get(abs)
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit.data
  try {
    const res = await hedgedFetch(abs, { headers: { 'User-Agent': 'koishi-plugin-trucklinemp-bot' }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return abs
    const buf = Buffer.from(await res.arrayBuffer())
    const ct = (res.headers.get('content-type') || 'image/png').split(';')[0]
    const data = `data:${ct};base64,${buf.toString('base64')}`
    imageCache.set(abs, { at: Date.now(), data })
    return data
  } catch (e) {
    return abs
  }
}

// 折线图（内联 SVG，用于卡片内渲染）
function lineChartSvg(values, w, h, opts) {
  const o = opts || {}
  const vals = (values || []).map((v) => Number(v) || 0)
  if (vals.length < 2) return ''
  const max = Math.max(1, ...vals)
  const step = w / (vals.length - 1)
  const coords = vals.map((v, i) => [i * step, h - (v / max) * h * 0.94])
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w} ${h} L0 ${h} Z`
  const gid = o.gradientId || 'lcgrad'
  const stroke = o.stroke || '#0ea5e9'
  const grid = [0.25, 0.5, 0.75]
    .map((g) => `<line x1="0" y1="${(h * g).toFixed(1)}" x2="${w}" y2="${(h * g).toFixed(1)}" stroke="#7b8aa5" stroke-opacity="0.14" stroke-width="1"/>`)
    .join('')
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${grid}<path d="${area}" fill="url(#${gid})" opacity="0.85"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.38"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0.02"/></linearGradient></defs></svg>`
}

// 柱状图（内联 SVG）
function barChartSvg(values, w, h, opts) {
  const o = opts || {}
  const vals = (values || []).map((v) => Number(v) || 0)
  if (!vals.length) return ''
  const max = Math.max(1, ...vals)
  const gap = 3
  const bw = Math.max(2, (w - gap * (vals.length - 1)) / vals.length)
  const bars = vals.map((v, i) => {
    const bh = Math.max(1, (v / max) * (h - 4))
    return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${o.fill || '#0ea5e9'}" fill-opacity="0.75"/>`
  }).join('')
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}</svg>`
}

let cardPage = null
let cardPageAt = 0
let cardPageUses = 0
let cardQueue = Promise.resolve()

function renderCard(ctx, html) {
  const run = cardQueue.then(
    () => doRenderCard(ctx, html),
    () => doRenderCard(ctx, html),
  )
  cardQueue = run.catch(() => {})
  return run
}

async function doRenderCard(ctx, html) {
  let puppeteer = null
  try {
    puppeteer = ctx.get('puppeteer')
  } catch (e) { /* ignore */ }
  if (!puppeteer) return null
  try {
    if (cardPage && !cardPage.isClosed() && (cardPageUses > 30 || Date.now() - cardPageAt > 10 * 60 * 1000)) {
      try { await cardPage.close() } catch (e) { /* ignore */ }
      cardPage = null
    }
    if (!cardPage || cardPage.isClosed()) {
      cardPage = await puppeteer.page()
      cardPageAt = Date.now()
      cardPageUses = 0
      await cardPage.setViewport({ width: 1200, height: 700, deviceScaleFactor: 1.5 })
    }
    cardPageUses++
    const t0 = Date.now()
    await cardPage.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await cardPage.waitForFunction(() => Array.from(document.images).every((img) => img.complete), { timeout: 8000 }).catch(() => {})
    const el = await cardPage.$('#card')
    if (!el) return null
    const box = await el.boundingBox()
    if (!box) return null
    const scale = 1.5
    if (cardPage._tlmpScale !== scale) {
      cardPage._tlmpScale = scale
      await cardPage.setViewport({ width: 1200, height: 700, deviceScaleFactor: scale })
    }
    const buffer = await cardPage.screenshot({
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      encoding: 'binary',
      type: 'jpeg',
      quality: 92,
    })
    ctx.logger('tlmp').info('卡片渲染 %dms %dx%d @%sx', Date.now() - t0, Math.round(box.width), Math.round(box.height), scale)
    return h.image(buffer, 'image/jpeg')
  } catch (e) {
    ctx.logger('tlmp').warn('卡片渲染失败: %s', e.message)
    if (cardPage) {
      try { cardPage.close().catch(() => {}) } catch (err) { /* ignore */ }
      cardPage = null
    }
    return null
  }
}

async function memberByNick(bot, guildId, key) {
  if (!bot || !guildId || !key) return null
  try {
    const res = await bot.getGuildMemberList(guildId)
    const list = (res && res.data) || (Array.isArray(res) ? res : [])
    const k = String(key).toLowerCase()
    const qqOf = (m) => (m && m.user && m.user.id != null ? String(m.user.id) : m && m.id != null ? String(m.id) : '')
    const nameOf = (m) => String((m && (m.nick || (m.user && m.user.name) || m.name)) || '')
    let hit = list.find((m) => nameOf(m).toLowerCase() === k)
    if (!hit) hit = list.find((m) => nameOf(m).replace(/^@+/, '').toLowerCase() === k)
    return hit && qqOf(hit) ? { id: qqOf(hit), nick: nameOf(hit) } : null
  } catch (e) {
    return null
  }
}

function isText(config, key) {
  try {
    return !!(config && config.output && config.output[key] === 'text')
  } catch (e) {
    return false
  }
}

// 统一的「图片卡片优先、失败回落文字」输出
async function deliver(ctx, config, key, html, text) {
  if (!isText(config, key)) {
    try {
      const card = await renderCard(ctx, typeof html === 'function' ? html() : html)
      if (card) return card
    } catch (e) {
      ctx.logger('tlmp').warn('渲染失败，回落文字: %s', e.message)
    }
  }
  return typeof text === 'function' ? text() : text
}

// 从会话消息中解析被 @ 的用户 QQ 号
function extractAtId(session) {
  let atId = null
  const content = String((session && session.content) || '')
  const m = content.match(/<at id="([^"]+)"/)
  if (m) atId = m[1]
  if (!atId && session && session.event && Array.isArray(session.event.message)) {
    for (const el of session.event.message) {
      if (el.type === 'at' && el.attrs && el.attrs.id != null) atId = String(el.attrs.id)
    }
  }
  if (atId && String(atId) === String(session.selfId)) atId = String(session.userId)
  return atId
}

// 归一化用户输入：去掉 @ 前缀，支持直接粘贴官网链接
function normalizeKey(raw) {
  let k = String(raw == null ? '' : raw).trim().replace(/^@+/, '')
  if (/^https?:\/\//i.test(k)) {
    const m = k.match(/trucklinemp\.com\/[^\s]*?\/([^/?#\s]+)\/?$/i)
    if (m) k = m[1]
    else k = k.split(/[?#]/)[0].split('/').filter(Boolean).pop() || k
  }
  return k.replace(/[),，。]+$/, '').trim()
}

module.exports = {
  cardTheme, CARD_DECO, setupHttp, setApiKeys, keyStats, onRateLimited, apiHeaders,
  hedgedFetch, fetchJson, fetchJsonMemo, warm, failMsg, sleep,
  bindingQuery, fmtTime, fmtDate, fmtNum, fmtDuration, esc, richText,
  resolveImage, renderCard, memberByNick, isText, deliver, extractAtId, normalizeKey,
  lineChartSvg, barChartSvg,
}
