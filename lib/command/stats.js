const { failMsg } = require('../util/common')
const {
  esc, fmtNum, fmtDate, fmtTime, cardTheme, CARD_DECO, deliver, lineChartSvg, barChartSvg,
} = require('../util/common')
const api = require('../api/trucklineApi')

function statCard(totals, growth, activity, mod, status) {
  const t = totals || {}
  const tiles = [
    [fmtNum(t.totalUsers), '注册用户'],
    [fmtNum(t.totalVtcs), '车队数量'],
    [fmtNum(t.totalEvents), '活动数量'],
    [fmtNum(t.playersOnline), '当前在线'],
    [fmtNum(t.activeServers), '在服服务器'],
    [fmtNum(t.newUsers30d), '近 30 天新增'],
    [fmtNum(t.activeBans), '生效封禁'],
    [fmtNum(t.networkLoad), '网络负载'],
  ]

  const gPoints = (growth && growth.points) || []
  const growthChart = gPoints.length > 1
    ? lineChartSvg(gPoints.map((p) => Number(p.users) || 0), 700, 130, { gradientId: 'growthgrad', stroke: '#6366f1' })
    : '<div class="empty">暂无增长数据</div>'

  const regs = (activity && activity.registrations) || []
  const regBars = regs.length
    ? barChartSvg(regs.map((r) => Number(r.value) || 0), 700, 90, { fill: '#10b981' })
    : '<div class="empty">暂无注册数据</div>'
  const regTotal = regs.reduce((s, r) => s + (Number(r.value) || 0), 0)

  const mods = (activity && activity.moderation) || []
  const modTotal = mods.reduce((s, m) => s + (Number(m.value) || 0), 0)

  const modRows = []
  if (mod) {
    modRows.push(['最近封禁', fmtTime(mod.lastBanAt)])
    modRows.push(['最近踢出', fmtTime(mod.lastKickAt)])
    modRows.push(['最近处理举报', fmtTime(mod.lastReportCompletedAt)])
    modRows.push(['生效封禁', String(mod.activeBanCount || 0)])
  }

  const modules = (status && status.modules) || {}
  const modChips = [['events', '活动'], ['forum', '论坛'], ['recruitment', '招募'], ['notifications', '通知']]
    .map(([k, label]) => `<span class="chip ${modules[k] ? 'on' : 'off'}">${label} ${modules[k] ? '开' : '关'}</span>`)
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#6366f1', '#f59e0b', 780)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1)}
.brand{color:#5b5fc0;font-size:13px;font-weight:700;letter-spacing:2px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
.tile{position:relative;overflow:hidden;background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:13px 8px 11px;text-align:center;box-shadow:var(--panel-shadow)}
.tile::before{content:'';position:absolute;top:0;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.tile b{display:block;font-size:23px;color:var(--t1);font-weight:700}
.tile span{display:block;font-size:12px;color:var(--t3);margin-top:4px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.section h3 span{flex:1;margin-left:9px}
.section h3 em{font-style:normal;font-weight:400;color:var(--t3);letter-spacing:0}
.chartbox{background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:12px 10px 8px;box-shadow:var(--panel-shadow)}
.chartbox svg{display:block;width:100%;height:130px}
.chartbox.bars svg{height:90px}
.kv{font-size:13.5px;line-height:1.9}
.kv b{color:var(--t2);font-weight:600;margin-right:8px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.chip{font-size:12.5px;border-radius:999px;padding:4px 12px;border:1px solid var(--stroke);background:var(--glass-2);box-shadow:var(--panel-shadow)}
.chip.on{color:#0b7a5b;border-color:rgba(16,185,129,.45)}
.chip.off{color:#94a3b8}
.empty{color:var(--t3);font-size:13px;padding:12px 14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">TrucklineMP 平台统计</span><span class="brand">STATS</span></div>
<div class="tiles">${tiles.map(([v, k]) => `<div class="tile"><b>${esc(v)}</b><span>${k}</span></div>`).join('')}</div>
<div class="section"><h3><span>用户增长</span><em>共 ${fmtNum(gPoints.length ? gPoints[gPoints.length - 1].users : t.totalUsers)} 人</em></h3><div class="chartbox">${growthChart}</div></div>
<div class="section"><h3><span>每日注册（近 30 天）</span><em>合计 ${fmtNum(regTotal)}</em></h3><div class="chartbox bars">${regBars}</div></div>
<div style="display:flex;gap:24px;align-items:flex-start">
<div style="flex:1;min-width:0"><div class="section"><h3><span>管理动态</span></h3>${modRows.length ? `<div class="kv">${modRows.map(([k, v]) => `<div><b>${k}</b>${esc(v)}</div>`).join('')}</div>` : '<div class="empty">暂无</div>'}</div></div>
<div style="flex:1;min-width:0"><div class="section"><h3><span>模块状态</span></h3><div class="chips">${modChips}</div>${status ? `<div class="kv" style="margin-top:10px"><div><b>平台</b>${status.status === 'ok' ? '正常' : esc(status.status)} · v${esc(status.version)}</div></div>` : ''}</div></div>
</div>
${modTotal ? `<div class="section"><h3><span>近 30 天管理操作</span><em>${fmtNum(modTotal)} 次</em></h3><div class="chartbox bars">${barChartSvg(mods.map((m) => Number(m.value) || 0), 700, 90, { fill: '#f59e0b' })}</div></div>` : ''}
<div class="foot"><span>TrucklineMP 平台</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function statText(totals, growth, activity, mod, status) {
  const t = totals || {}
  const lines = ['📊 TrucklineMP 平台统计', '━━━━━━━━━━━━']
  lines.push(`👥 注册用户：${t.totalUsers || 0}（近 30 天新增 ${t.newUsers30d || 0}）`)
  lines.push(`🏢 车队：${t.totalVtcs || 0} · 🎪 活动：${t.totalEvents || 0}`)
  lines.push(`🟢 当前在线：${t.playersOnline || 0} 人 · 在服服务器：${t.activeServers || 0}`)
  lines.push(`⛔ 生效封禁：${t.activeBans || 0}`)
  if (mod) {
    lines.push(`🛡 最近封禁：${fmtTime(mod.lastBanAt)} · 最近举报处理：${fmtTime(mod.lastReportCompletedAt)}`)
  }
  if (status) {
    const m = status.modules || {}
    lines.push(`⚙️ 平台：${status.status === 'ok' ? '正常' : status.status} · v${status.version} · 活动${m.events ? '开' : '关'} 招募${m.recruitment ? '开' : '关'}`)
  }
  return lines.join('\n')
}

function apply(ctx, config) {
  ctx.command('统计t', 'TrucklineMP 平台统计')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const [totals, growth, activity, mod, status] = await Promise.all([
          api.platformTotals(config),
          api.platformGrowth(config).catch(() => null),
          api.platformActivity(config).catch(() => null),
          api.moderationStats(config).catch(() => null),
          api.platformStatus(config).catch(() => null),
        ])
        return deliver(ctx, config, 'stats', statCard(totals, growth, activity, mod, status), statText(totals, growth, activity, mod, status))
      } catch (e) {
        ctx.logger('tlmp').warn('平台统计失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, statCard, statText }
