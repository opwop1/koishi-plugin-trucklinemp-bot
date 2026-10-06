// 多 API Key 轮换池
//
// 背景（2026-10-06 实测）：TrucklineMP 的限速是**按 Key（token）计的，不按来源 IP** ——
// 同一 IP 同一时刻，key#78 已 429 而 key#79 仍正常。因此多把 Key 轮换可以线性扩容。
//
// 平台真实额度：**每把 Key 120 次/小时**（`/rate-limits` 自报的 1000/分钟不准确）。
// 匿名请求额度更低，但独立于 Key —— 所以全部 Key 冷却时可以回退到匿名再撑一会儿。

const WINDOW = 60 * 60 * 1000
const SOFT_LIMIT = 110 // 本地软阈值（平台为 120）：到量后优先换别的 Key，而不是等到被 429
const MIN_COOLDOWN = 5 * 1000

function mask(key) {
  const s = String(key || '')
  if (!s) return '匿名'
  if (s.length <= 14) return s
  return s.slice(0, 9) + '…' + s.slice(-4)
}

class KeyPool {
  constructor() {
    this.entries = []
    this.cursor = 0
    // 由插件注入：某把 Key 被限速时回调，便于打日志
    this.onRateLimited = null
  }

  /**
   * @param {string[]} keys 配置里的 Key 列表
   * @param {{ anonymousFallback?: boolean }} opts
   */
  setKeys(keys, opts) {
    const o = opts || {}
    const seen = new Set()
    const uniq = []
    for (const raw of keys || []) {
      const k = String(raw || '').trim()
      if (!k || seen.has(k)) continue
      seen.add(k)
      uniq.push(k)
    }
    this.entries = uniq.map((k, i) => ({
      key: k,
      index: i,
      label: mask(k),
      anonymous: false,
      cooldownUntil: 0,
      windowStart: 0,
      used: 0,
      last429At: 0,
    }))
    if (o.anonymousFallback !== false) {
      this.entries.push({
        key: '',
        index: this.entries.length,
        label: '匿名',
        anonymous: true,
        cooldownUntil: 0,
        windowStart: 0,
        used: 0,
        last429At: 0,
      })
    }
    this.cursor = 0
    return this.entries.length
  }

  /** 实际配置的 Key 数量（不含匿名） */
  keyCount() {
    return this.entries.filter((e) => !e.anonymous).length
  }

  count() {
    return this.entries.length
  }

  _roll(entry, now) {
    if (!entry.windowStart || now - entry.windowStart >= WINDOW) {
      entry.windowStart = now
      entry.used = 0
    }
  }

  _usable(entry, now) {
    return entry.cooldownUntil <= now
  }

  /** 有额度余量的（未到软阈值） */
  _preferred(entry, now) {
    if (!this._usable(entry, now)) return false
    if (entry.anonymous) return true
    this._roll(entry, now)
    return entry.used < SOFT_LIMIT
  }

  /**
   * 取一把可用 Key。
   * @param {Set<string>} [exclude] 本次请求已经试过的 Key（避免重复）
   * @returns {{key:string|null,label:string,anonymous:boolean,exhausted:boolean,retryAfter:number}}
   */
  pick(exclude) {
    const now = Date.now()
    for (const e of this.entries) this._roll(e, now)

    const n = this.entries.length
    if (!n) return { key: '', label: '匿名', anonymous: true, exhausted: false, retryAfter: 0 }

    const skip = exclude || null
    const usable = (e) => this._usable(e, now) && !(skip && skip.has(e.key))

    // ⚠️ 关键：在**完整 entries 列表**上做环形扫描（而不是在一个「缩小后的过滤池」上
    // 用 cursor 取模）——否则当某把 Key 在请求过程中进入冷却、可用集合变小时，
    // 同一个 cursor 会**跳过**下一把本来可用的 Key（实测会直接从 key#2 漏到匿名）。
    const start = ((this.cursor % n) + n) % n
    let chosen = null
    let fallback = null // 没有「有额度余量」的可用项时的兜底（软阈值不做硬阻断）
    for (let i = 0; i < n; i++) {
      const e = this.entries[(start + i) % n]
      if (!usable(e)) continue
      if (fallback === null) fallback = e
      if (this._preferred(e, now)) { chosen = e; break }
    }
    if (!chosen) chosen = fallback

    if (chosen) {
      this.cursor = (this.entries.indexOf(chosen) + 1) % n
      return { key: chosen.key, label: chosen.label, anonymous: chosen.anonymous, exhausted: false, retryAfter: 0 }
    }

    // 全部处于冷却：不再发请求（发了也是 429，白白浪费额度），直接给出最早恢复时间
    let best = null
    for (const e of this.entries) {
      if (!best || e.cooldownUntil < best.cooldownUntil) best = e
    }
    const retryAfter = best ? Math.max(1, Math.ceil((best.cooldownUntil - now) / 1000)) : 60
    return { key: null, label: best ? best.label : '—', anonymous: false, exhausted: true, retryAfter }
  }

  /** 该 Key 命中 429：进入冷却 */
  markRateLimited(key, retryAfterSec) {
    const entry = this.entries.find((e) => e.key === key)
    if (!entry) return
    const now = Date.now()
    entry.cooldownUntil = now + Math.max(MIN_COOLDOWN, (Number(retryAfterSec) || 60) * 1000)
    entry.used = SOFT_LIMIT
    entry.last429At = now
    if (this.onRateLimited) {
      try { this.onRateLimited(entry, Math.max(MIN_COOLDOWN, (Number(retryAfterSec) || 60) * 1000) / 1000) } catch (e) { /* ignore */ }
    }
  }

  /** 请求成功：计入本地用量 */
  markUsed(key) {
    const entry = this.entries.find((e) => e.key === key)
    if (!entry) return
    const now = Date.now()
    this._roll(entry, now)
    entry.used++
  }

  /** 供日志 / 排查用 */
  snapshot() {
    const now = Date.now()
    return this.entries.map((e) => ({
      label: e.label,
      anonymous: e.anonymous,
      cooling: Math.max(0, Math.ceil((e.cooldownUntil - now) / 1000)),
      used: e.used,
    }))
  }

  reset() {
    this.entries = []
    this.cursor = 0
  }
}

module.exports = { KeyPool, mask, SOFT_LIMIT, WINDOW }
