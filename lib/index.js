const { Schema } = require('koishi')
const { setupHttp, setApiKeys, keyStats, onRateLimited, warm } = require('./util/common')
const { API_BASE } = require('./util/constant')
const model = require('./database/model')
const menu = require('./command/menu')
const bind = require('./command/bind')
const user = require('./command/user')
const vtc = require('./command/vtc')
const event = require('./command/event')
const stats = require('./command/stats')
const server = require('./command/server')
const ranking = require('./command/ranking')
const news = require('./command/news')
const ban = require('./command/ban')
const misc = require('./command/misc')

const name = 'trucklinemp-bot'
const inject = ['database', 'puppeteer']

const CARD_MODES = [
  Schema.const('image').description('图片'),
  Schema.const('text').description('文字'),
]
const cardMode = (desc) => Schema.union(CARD_MODES).default('image').description(desc)

// 🔑 获取 API Key：https://trucklinemp.com/developer/keys
const KEY_URL = 'https://trucklinemp.com/developer/keys'

const Config = Schema.object({
  apiBase: Schema.string()
    .default(API_BASE)
    .description('TrucklineMP 公共 API 根地址（必须用 api 子域，官网域名有 Cloudflare 校验）'),
  apiKeys: Schema.array(Schema.string().role('secret'))
    .default([])
    .comment(`API Key 获取地址：${KEY_URL}（可填多把，每把 120 次/小时，插件会自动轮换扩容）`)
    .description(`TrucklineMP 开发者 API Key（tlmp_api_...），可填多把。`
      + `平台限速按 Key 计，每把 120 次/小时 —— 多填几把即可线性扩容；某把被限速会自动切到下一把。`
      + `留空则匿名查询（额度更低）。获取地址：${KEY_URL}`),
  allowAnonymous: Schema.boolean()
    .default(true)
    .description('所有 Key 都处于限速冷却时，是否回退到匿名请求（匿名额度独立于 Key）'),
  output: Schema.object({
    menu: cardMode('功能菜单'),
    bind: cardMode('绑定结果'),
    user: cardMode('玩家查询'),
    vtc: cardMode('车队详情'),
    vtcRank: cardMode('车队排行'),
    vtcMember: cardMode('车队成员'),
    recruit: cardMode('车队招募'),
    event: cardMode('活动列表'),
    eventDetail: cardMode('活动详情'),
    server: cardMode('服务器状态'),
    serverCurve: cardMode('服务器曲线'),
    stats: cardMode('平台统计'),
    ranking: cardMode('时长排行'),
    news: cardMode('官方新闻'),
    ban: cardMode('封禁记录'),
    partner: cardMode('合作伙伴'),
    rules: cardMode('规则链接'),
    version: cardMode('版本信息'),
  }).description('各功能输出方式（图片 / 文字）'),
})

// 黏连命令修正：把「查询tScania」这类没空格的写法自动补一个空格
const GLUED_BASE = [
  '我的绑定', '解绑', '查询', '车队成员', '车队排行', '车队', '招募',
  '活动详情', '活动', '服务器曲线', '服务器', '统计', '排行', '新闻',
  '封禁', '合作伙伴', '规则', '版本', '菜单', '绑定',
]
const GLUED_VARIANTS = GLUED_BASE
  .flatMap((n) => [n + 't', n + 'T'])
  .sort((a, b) => b.length - a.length)

function apply(ctx, config) {
  setupHttp()

  const keys = (config.apiKeys || []).map((k) => String(k || '').trim()).filter(Boolean)
  setApiKeys(keys, { anonymousFallback: config.allowAnonymous !== false })
  ctx.logger('tlmp').info(
    keys.length
      ? '已载入 %d 把 API Key（限速按 Key 计，每把 120 次/小时，自动轮换）'
      : '未配置 API Key，将使用匿名查询（额度较低，建议在 %s 获取）',
    keys.length || KEY_URL,
  )
  onRateLimited((entry, retryAfter) => {
    const snap = keyStats()
    const cooling = snap.filter((s) => s.cooling > 0).length
    ctx.logger('tlmp').warn('API Key %s 已达限速，冷却 %d 秒（当前 %d/%d 个凭据冷却中）', entry.label, Math.round(retryAfter), cooling, snap.length)
  })

  // ⚠️ TrucklineMP 限额为「每小时 120 次」，因此只在启动后预热一次，
  // 不做周期性预热（周期性预热会白白吃掉本就很紧张的配额）
  ctx.setTimeout(() => warm(config.apiBase + '/status').catch(() => {}), 20 * 1000)

  ctx.middleware((session, next) => {
    try {
      const content = session.content
      if (content && content.length > 2) {
        for (const cmd of GLUED_VARIANTS) {
          if (content.startsWith(cmd)) {
            const rest = content.slice(cmd.length)
            if (rest && !/^[\s\u3000]/.test(rest)) {
              session.content = cmd + ' ' + rest
            }
            break
          }
        }
      }
    } catch (e) { /* ignore */ }
    return next()
  }, true)

  model(ctx)

  menu.apply(ctx, config)
  bind.apply(ctx, config)
  user.apply(ctx, config)
  vtc.apply(ctx, config)
  event.apply(ctx, config)
  stats.apply(ctx, config)
  server.apply(ctx, config)
  ranking.apply(ctx, config)
  news.apply(ctx, config)
  ban.apply(ctx, config)
  misc.apply(ctx, config)
}

module.exports = { name, inject, Config, apply }
