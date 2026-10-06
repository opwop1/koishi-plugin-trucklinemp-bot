const { failMsg } = require('../util/common')
const { esc, fmtNum, fmtDate, cardTheme, CARD_DECO, deliver, lineChartSvg } = require('../util/common')
const api = require('../api/trucklineApi')
const { GAME_ZH } = require('../util/constant')

const BASE_CSS = `
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand{color:#b0740a;font-size:13px;font-weight:700;letter-spacing:2px;flex:none;margin-left:12px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.kv{font-size:13.5px;line-height:1.9}
.kv b{color:var(--t2);font-weight:600;margin-right:8px}
.empty{color:var(--t3);font-size:13px;padding:12px 14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
`

// —— 服务器实时状态 ——
function serverCard(d) {
  const servers = (d && d.servers) || []
  const total = servers.reduce((s, x) => s + (Number(x.current) || 0), 0)
  const capacity = servers.reduce((s, x) => s + (Number(x.limit) || 0), 0)
  const onlineCount = servers.filter((s) => s.status === 'online').length

  const rows = servers.map((s) => {
    const cur = Number(s.current) || 0
    const lim = Number(s.limit) || 0
    const pct = lim > 0 ? Math.min(100, Math.round((cur / lim) * 100)) : 0
    const tags = []
    if (s.game) tags.push(GAME_ZH[s.game] || s.game)
    if (s.region) tags.push(s.region)
    if (s.collisions) tags.push('碰撞开')
    if (s.syncEnvironment) tags.push('同步天气')
    return `<div class="srow"><div class="shead"><span class="sname">${esc(s.name)}<span class="son${s.status === 'online' ? ' on' : ''}"></span></span><span class="snum">${fmtNum(cur)} / ${fmtNum(lim)}</span></div><div class="bar"><i style="width:${pct}%"></i></div><div class="stags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>`
  }).join('')

  const byGame = ((d && d.byGame) || []).map((g) => `${GAME_ZH[g.game] || g.game} ${g.players}`).join(' · ')
  const settings = (d && d.settings) || {}

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#0ea5e9', '#10b981', 760)}
.hero-num{text-align:center;padding:18px 0 4px}
.big{font-size:64px;font-weight:800;line-height:1.02;background:linear-gradient(150deg,#0369a1,#0ea5e9);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.cap{color:var(--t3);font-size:13px;margin-top:6px;letter-spacing:2px}
.hstate{margin-top:8px;font-size:12.5px;color:#0b6a8a;letter-spacing:2px;font-weight:600}
.srow{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:11px 14px;box-shadow:var(--panel-shadow)}
.srow + .srow{margin-top:10px}
.shead{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sname{font-size:14px;color:var(--t1);font-weight:600;display:flex;align-items:center;gap:8px}
.son{display:inline-block;width:9px;height:9px;border-radius:50%;background:#a8b3c7}
.son.on{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.18)}
.snum{font-size:13.5px;color:var(--t2);font-weight:600}
.bar{margin-top:8px;height:8px;border-radius:5px;background:var(--glass-3);border:1px solid var(--stroke);overflow:hidden}
.bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--ac),var(--ac2))}
.stags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.tag{font-size:11.5px;color:var(--t3);border:1px solid var(--stroke);background:var(--glass-3);border-radius:999px;padding:2px 9px}
${BASE_CSS}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">TrucklineMP 服务器状态</span><span class="brand">SERVERS</span></div>
<div class="hero-num"><div class="big">${fmtNum(total)}</div><div class="cap">当前在线玩家${capacity ? ` / 总容量 ${fmtNum(capacity)}` : ''}</div><div class="hstate">${onlineCount} / ${servers.length} 个服务器在线${byGame ? ` · ${esc(byGame)}` : ''}</div></div>
<div class="section"><h3>服务器列表（${servers.length}）</h3>${rows || '<div class="empty">暂无服务器数据</div>'}</div>
${Object.keys(settings).length ? `<div class="section"><h3>环境设置</h3><div class="kv"><div><b>碰撞</b>开启 ${settings.collisionsOn || 0} · 关闭 ${settings.collisionsOff || 0}</div><div><b>天气</b>同步 ${settings.syncedWeather || 0} · 自由 ${settings.freeWeather || 0}</div></div></div>` : ''}
<div class="foot"><span>TrucklineMP 实时数据</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function serverText(d) {
  const servers = (d && d.servers) || []
  const total = servers.reduce((s, x) => s + (Number(x.current) || 0), 0)
  const lines = ['🖥 TrucklineMP 服务器状态', '━━━━━━━━━━━━', `👥 总在线：${total} 人（${servers.length} 个服务器）`]
  servers.forEach((s) => {
    const tags = []
    if (s.game) tags.push(GAME_ZH[s.game] || s.game)
    if (s.collisions) tags.push('碰撞开')
    lines.push(`· ${s.name}：${s.current}/${s.limit} 人 ${s.status === 'online' ? '🟢' : '⚫'}${tags.length ? `（${tags.join(' · ')}）` : ''}`)
  })
  return lines.join('\n')
}

// —— 人口曲线 ——
const RANGE_ZH = { '24h': '24 小时', '7d': '7 天', '30d': '30 天', '90d': '90 天', all: '全部' }

function curveEmptyCard(range, peak) {
  const allTime = (peak && peak.allTimePeak) || {}
  const hasAll = allTime.value != null && allTime.value > 0
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#6366f1', '#0ea5e9', 760)}
${BASE_CSS}
.center{text-align:center;padding:34px 0 12px}
.ico{font-size:44px}
.msg{font-size:16px;color:var(--t1);font-weight:700;margin-top:12px}
.sub{font-size:13px;color:var(--t3);margin-top:9px;line-height:1.8}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">服务器人口曲线 · ${esc(RANGE_ZH[range] || range)}</span><span class="brand">HISTORY</span></div>
<div class="center"><div class="ico">📈</div><div class="msg">暂无人口历史数据</div><div class="sub">TrucklineMP 尚未积累该时间段的服务器人口记录${hasAll ? `<br>历史最高在线：${fmtNum(allTime.value)} 人` : ''}<br>可先用「服务器t」查看实时在线人数</div></div>
<div class="foot"><span>TrucklineMP 统计</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function curveCard(hist, peak, range) {
  const points = (hist && hist.points) || []
  if (points.length < 2) return curveEmptyCard(range, peak)
  const last = points.length ? Number(points[points.length - 1].players) || 0 : 0
  const peakVal = points.length ? Math.max(...points.map((p) => Number(p.players) || 0)) : 0
  const avg = points.length ? Math.round(points.reduce((s, p) => s + (Number(p.players) || 0), 0) / points.length) : 0
  const first = points.length ? points[0].date : ''
  const end = points.length ? points[points.length - 1].date : ''

  const wins = (peak && peak.windows) || []
  const allTime = (peak && peak.allTimePeak) || {}
  const winRows = wins.map((w) => {
    const label = { today: '今日', week: '本周', month: '本月' }[w.key] || w.key
    return `<div class="pcell"><div class="pk">${esc(label)}</div><div class="pv">${fmtNum(w.peak)}</div><div class="pa">均 ${fmtNum(Math.round(w.average || 0))}</div></div>`
  }).join('')

  const chart = points.length > 1
    ? lineChartSvg(points.map((p) => Number(p.players) || 0), 700, 160, { gradientId: 'histgrad' })
    : '<div class="empty">暂无历史数据</div>'

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#6366f1', '#0ea5e9', 760)}
.chartbox{background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:14px 12px 8px;box-shadow:var(--panel-shadow);overflow:hidden}
.chartbox svg{display:block;width:100%;height:160px}
.xaxis{display:flex;justify-content:space-between;font-size:11.5px;color:var(--t3);margin-top:6px;padding:0 4px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.stat{position:relative;overflow:hidden;background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:13px 8px 11px;text-align:center;box-shadow:var(--panel-shadow)}
.stat::before{content:'';position:absolute;top:0;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.stat b{display:block;font-size:24px;color:var(--t1);font-weight:700}
.stat span{display:block;font-size:12px;color:var(--t3);margin-top:4px}
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.pcell{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:11px;text-align:center;box-shadow:var(--panel-shadow)}
.pk{font-size:12px;color:var(--t3)}
.pv{font-size:21px;color:var(--t1);font-weight:700;margin-top:3px}
.pa{font-size:11.5px;color:var(--t3);margin-top:2px}
${BASE_CSS}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">服务器人口曲线 · ${esc(RANGE_ZH[range] || range)}</span><span class="brand">HISTORY</span></div>
<div class="section"><h3>在线玩家变化</h3><div class="chartbox">${chart}<div class="xaxis"><span>${esc(first)}</span><span>${esc(end)}</span></div></div></div>
<div class="stats">
<div class="stat"><b>${fmtNum(last)}</b><span>最新在线</span></div>
<div class="stat"><b>${fmtNum(peakVal)}</b><span>区间峰值</span></div>
<div class="stat"><b>${fmtNum(avg)}</b><span>区间均值</span></div>
</div>
<div class="section"><h3>历史峰值</h3><div class="pgrid">${winRows || '<div class="empty">暂无</div>'}</div>
${allTime && allTime.value != null ? `<div class="kv" style="margin-top:10px"><div><b>历史最高</b>${fmtNum(allTime.value)} 人${allTime.at ? ` · ${esc(fmtDate(allTime.at))}` : ''}</div></div>` : ''}</div>
<div class="foot"><span>TrucklineMP 统计</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function curveText(hist, peak, range) {
  const points = (hist && hist.points) || []
  if (points.length < 2) {
    const allTime = (peak && peak.allTimePeak) || {}
    const lines = [`📈 服务器人口曲线（${RANGE_ZH[range] || range}）`, '━━━━━━━━━━━━', '暂无人口历史数据（平台尚未积累该时间段记录）']
    if (allTime.value) lines.push(`历史最高在线：${fmtNum(allTime.value)} 人`)
    lines.push('可先用「服务器t」查看实时在线人数')
    return lines.join('\n')
  }
  const last = points.length ? Number(points[points.length - 1].players) || 0 : 0
  const peakVal = points.length ? Math.max(...points.map((p) => Number(p.players) || 0)) : 0
  const avg = points.length ? Math.round(points.reduce((s, p) => s + (Number(p.players) || 0), 0) / points.length) : 0
  const lines = [`📈 服务器人口曲线（${RANGE_ZH[range] || range}）`, '━━━━━━━━━━━━']
  lines.push(`最新在线：${last} 人 · 区间峰值：${peakVal} · 均值：${avg}`)
  const wins = (peak && peak.windows) || []
  wins.forEach((w) => {
    const label = { today: '今日', week: '本周', month: '本月' }[w.key] || w.key
    lines.push(`${label}：峰值 ${w.peak} · 均值 ${Math.round(w.average || 0)}`)
  })
  if (peak && peak.allTimePeak && peak.allTimePeak.value != null) {
    lines.push(`历史最高：${peak.allTimePeak.value} 人${peak.allTimePeak.at ? ` · ${fmtDate(peak.allTimePeak.at)}` : ''}`)
  }
  if (points.length > 1) lines.push(`区间：${points[0].date} ~ ${points[points.length - 1].date}`)
  return lines.join('\n')
}

function apply(ctx, config) {
  ctx.command('服务器t', 'TrucklineMP 服务器实时状态')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const d = await api.serverBreakdown(config)
        return deliver(ctx, config, 'server', serverCard(d), serverText(d))
      } catch (e) {
        ctx.logger('tlmp').warn('服务器状态失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('服务器曲线t [range]', 'TrucklineMP 服务器人口曲线')
    .usage('range 可选：24h / 7d（默认）/ 30d / 90d / all')
    .action(async ({ session }, range) => {
      if (!session) return
      const r = ['24h', '7d', '30d', '90d', 'all'].includes(String(range || '').trim()) ? String(range).trim() : '7d'
      try {
        const [hist, peak] = await Promise.all([
          api.serverHistory(config, r),
          api.serverPeak(config).catch(() => null),
        ])
        return deliver(ctx, config, 'serverCurve', curveCard(hist, peak, r), curveText(hist, peak, r))
      } catch (e) {
        ctx.logger('tlmp').warn('人口曲线失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, serverCard, serverText, curveCard, curveText }
