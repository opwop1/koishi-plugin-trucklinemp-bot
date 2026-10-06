// TrucklineMP 公共 API 封装（全部只读）
// 注意：base 为 https://api.trucklinemp.com，路径直挂；鉴权头由 util/common 统一注入
//
// ⚠️ 配额：平台实际限额是「每小时 120 次」（/rate-limits 自报的 1000/分钟并不准确）。
// 因此所有端点都带较长的缓存 TTL，重复查询在 TTL 内不会再次请求。
const { fetchJson, fetchJsonMemo } = require('../util/common')

const MIN = 60 * 1000

function buildUrl(config, path, params) {
  const base = (config && config.apiBase) || 'https://api.trucklinemp.com'
  const qs = []
  for (const key of Object.keys(params || {})) {
    const v = params[key]
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      for (const item of v) qs.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`)
    } else {
      qs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
    }
  }
  return base + path + (qs.length ? '?' + qs.join('&') : '')
}

function get(config, path, params, ttl) {
  const url = buildUrl(config, path, params)
  return ttl ? fetchJsonMemo(url, ttl) : fetchJson(url)
}

// —— 平台 ——
const platformStatus = (c) => get(c, '/status', null, 2 * MIN)
const apiVersion = (c) => get(c, '/version', null, 60 * MIN)
const rules = (c) => get(c, '/rules', null, 6 * 60 * MIN)
const partners = (c) => get(c, '/partners', null, 6 * 60 * MIN)
const rateLimits = (c) => get(c, '/rate-limits', null, 6 * 60 * MIN)
const moderationStats = (c) => get(c, '/stats', null, 5 * MIN)
const clientInfo = (c) => get(c, '/me', null, 10 * MIN)

// —— 统计 ——
const platformTotals = (c) => get(c, '/stats/platform/totals', null, 5 * MIN)
const platformGrowth = (c) => get(c, '/stats/platform/growth', null, 30 * MIN)
const platformActivity = (c) => get(c, '/stats/platform/activity', null, 30 * MIN)

// —— 服务器 ——
const serverBreakdown = (c) => get(c, '/stats/servers/breakdown', null, 60 * 1000)
const serverHistory = (c, range) => get(c, '/stats/servers/history', { range: range || '7d' }, 30 * MIN)
const serverPeak = (c) => get(c, '/stats/servers/peak', null, 30 * MIN)
const serverHeatmap = (c) => get(c, '/stats/servers/heatmap', null, 30 * MIN)

// —— 玩家统计 ——
// ⚠️ 这两个端点的 limit / days 参数会被服务端判为 400（参数校验 bug），因此一律不传，使用默认值
const leaderboard = (c) => get(c, '/stats/players/leaderboard', null, 15 * MIN)
const dailyActive = (c) => get(c, '/stats/players/daily-active', null, 30 * MIN)
const liveDriver = (c, accountId) => get(c, `/live-map/drivers/${encodeURIComponent(accountId)}`, null, 60 * 1000)

// —— 用户 ——
const searchUsers = (c, q, limit) => get(c, '/users/search', { q, limit: limit || 8 }, 10 * MIN)
const getUser = (c, idOrHandle) => get(c, `/users/${encodeURIComponent(idOrHandle)}`, null, 15 * MIN)
const getUserBySteam = (c, steamId) => get(c, `/users/steam/${encodeURIComponent(steamId)}`, null, 15 * MIN)

async function findUser(config, key) {
  const k = String(key || '').trim()
  if (!k) return null

  if (/^7656119\d{10}$/.test(k)) {
    const d = await getUserBySteam(config, k).catch(() => null)
    if (d && d.user) return d.user
  }
  if (/^\d+$/.test(k) || /^[0-9a-fA-F-]{16,}$/.test(k) || /^[a-zA-Z0-9_.-]+$/.test(k)) {
    const d = await getUser(config, k).catch(() => null)
    if (d && d.user) return d.user
  }

  const s = await searchUsers(config, k, 6).catch(() => null)
  const items = (s && (s.items || s.users)) || []
  if (!items.length) return null
  const lower = k.toLowerCase()
  const hit = items.find((u) => String(u.name || '').toLowerCase() === lower)
    || items.find((u) => String((u.handle || '')).toLowerCase() === lower)
    || items[0]
  const d = await getUser(config, hit.id).catch(() => null)
  return (d && d.user) || null
}

// —— 车队（VTC） ——
const listVtcs = (c, params) => get(c, '/vtcs', params, 15 * MIN)
const getVtc = (c, idOrHandle) => get(c, `/vtcs/${encodeURIComponent(idOrHandle)}`, null, 15 * MIN)
const vtcMembers = (c, id, params) => get(c, `/vtcs/${encodeURIComponent(id)}/members`, params, 15 * MIN)
const vtcNews = (c, id, params) => get(c, `/vtcs/${encodeURIComponent(id)}/news`, params, 15 * MIN)
const vtcEvents = (c, id, params) => get(c, `/vtcs/${encodeURIComponent(id)}/events`, params, 15 * MIN)
const vtcRoles = (c, id) => get(c, `/vtcs/${encodeURIComponent(id)}/roles`, null, 60 * MIN)
const vtcGallery = (c, id, params) => get(c, `/vtcs/${encodeURIComponent(id)}/gallery`, params, 15 * MIN)
const vtcPartnerships = (c, id) => get(c, `/vtcs/${encodeURIComponent(id)}/partnerships`, null, 30 * MIN)
const vtcTier = (c, id) => get(c, `/vtcs/${encodeURIComponent(id)}/tier`, null, 60 * MIN)
const vtcRecruitment = (c, id) => get(c, `/vtcs/${encodeURIComponent(id)}/recruitment`, null, 30 * MIN)

// —— 活动 ——
const listEvents = (c, params) => get(c, '/events', params, 5 * MIN)
const getEvent = (c, id) => get(c, `/events/${encodeURIComponent(id)}`, null, 10 * MIN)
const eventRoute = (c, id) => get(c, `/events/${encodeURIComponent(id)}/route`, null, 30 * MIN)
const eventCoHosts = (c, id) => get(c, `/events/${encodeURIComponent(id)}/co-hosts`, null, 30 * MIN)
const convoys = (c) => get(c, '/live-map/convoys', null, 60 * 1000)

// —— 新闻 / 封禁 ——
const listNews = (c, params) => get(c, '/news', params, 15 * MIN)
const getNews = (c, id) => get(c, `/news/${encodeURIComponent(id)}`, null, 30 * MIN)
const listBans = (c, params) => get(c, '/bans', params, 5 * MIN)
const getBan = (c, id) => get(c, `/bans/${encodeURIComponent(id)}`, null, 15 * MIN)

module.exports = {
  buildUrl, get,
  platformStatus, apiVersion, rules, partners, rateLimits, moderationStats, clientInfo,
  platformTotals, platformGrowth, platformActivity,
  serverBreakdown, serverHistory, serverPeak, serverHeatmap,
  leaderboard, dailyActive, liveDriver,
  searchUsers, getUser, getUserBySteam, findUser,
  listVtcs, getVtc, vtcMembers, vtcNews, vtcEvents, vtcRoles, vtcGallery, vtcPartnerships, vtcTier, vtcRecruitment,
  listEvents, getEvent, eventRoute, eventCoHosts, convoys,
  listNews, getNews, listBans, getBan,
}
