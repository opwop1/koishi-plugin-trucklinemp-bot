const { failMsg } = require('../util/common')
const {
  esc, fmtNum, fmtDate, fmtDuration, cardTheme, CARD_DECO, deliver, lineChartSvg,
} = require('../util/common')
const api = require('../api/trucklineApi')

function rankCard(entries, daily) {
  const list = entries || []
  const top = list.slice(0, 3)
  const rest = list.slice(3)

  const podium = top.map((e, i) => {
    const medal = ['🥇', '🥈', '🥉'][i] || ''
    const cls = ['p1', 'p2', 'p3'][i]
    return `<div class="pod ${cls}"><div class="pname">${esc(e.name)}${medal ? ' ' + medal : ''}</div><div class="phours">${esc(fmtDuration(e.totalSecondsPlayed))}</div><div class="pmeta">${fmtNum(e.totalSessions)} 次 · ${fmtNum(e.daysActive)} 天</div></div>`
  }).join('')

  const rows = rest.map((e, i) => `<div class="lrow"><div class="lidx">${i + 4}</div><div class="lmain"><div class="lname">${esc(e.name)}</div><div class="lsub">${fmtNum(e.totalSessions)} 次会话 · ${fmtNum(e.daysActive)} 天活跃</div></div><div class="lmeta">${esc(fmtDuration(e.totalSecondsPlayed))}</div></div>`).join('')

  const points = (daily && daily.points) || []
  const chart = points.length > 1
    ? lineChartSvg(points.map((p) => Number(p.players) || 0), 700, 110, { gradientId: 'dailygrad', stroke: '#10b981' })
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#6366f1', '#10b981', 720)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1)}
.brand{color:#5b5fc0;font-size:13px;font-weight:700;letter-spacing:2px}
.podium{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.pod{position:relative;overflow:hidden;border-radius:18px;padding:14px 10px;text-align:center;border:1px solid var(--stroke);box-shadow:var(--panel-shadow)}
.pod::before{content:'';position:absolute;top:0;left:20%;right:20%;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.p1{background:linear-gradient(180deg,rgba(250,204,21,.26),rgba(255,255,255,.5))}
.p2{background:linear-gradient(180deg,rgba(148,163,184,.24),rgba(255,255,255,.5))}
.p3{background:linear-gradient(180deg,rgba(217,119,6,.20),rgba(255,255,255,.5))}
.pname{font-size:14px;color:var(--t1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.phours{font-size:17px;color:var(--t1);font-weight:700;margin-top:6px}
.pmeta{font-size:11.5px;color:var(--t3);margin-top:4px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.list{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;overflow:hidden;box-shadow:var(--panel-shadow)}
.lrow{display:flex;align-items:center;gap:12px;padding:9px 14px}
.lrow + .lrow{border-top:1px solid var(--edge-2)}
.lidx{flex:none;width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#5b5fc0;background:var(--glass-3);border:1px solid var(--stroke)}
.lmain{flex:1;min-width:0}
.lname{font-size:13.5px;color:var(--t1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lsub{font-size:11.5px;color:var(--t3);margin-top:3px}
.lmeta{flex:none;font-size:13px;color:var(--t2);font-weight:600}
.chartbox{background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:12px 10px 8px;box-shadow:var(--panel-shadow)}
.chartbox svg{display:block;width:100%;height:110px}
.empty{color:var(--t3);font-size:13px;padding:12px 14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">游玩时长排行榜</span><span class="brand">RANKING</span></div>
${list.length ? `<div class="podium">${podium}</div>` : '<div class="empty" style="margin-top:16px">暂无排行数据</div>'}
${rest.length ? `<div class="section"><h3>第 4 - ${list.length} 名</h3><div class="list">${rows}</div></div>` : ''}
${chart ? `<div class="section"><h3>每日活跃玩家（近 30 天）</h3><div class="chartbox">${chart}</div></div>` : ''}
<div class="foot"><span>TrucklineMP 玩家统计</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function rankText(entries, daily) {
  const list = entries || []
  const lines = ['🏆 TrucklineMP 游玩时长排行榜', '━━━━━━━━━━━━']
  if (!list.length) lines.push('  暂无排行数据')
  list.forEach((e) => {
    lines.push(`#${e.rank} ${e.name} — ${fmtDuration(e.totalSecondsPlayed)}（${e.totalSessions} 次 · ${e.daysActive} 天）`)
  })
  const points = (daily && daily.points) || []
  if (points.length) {
    const latest = points[points.length - 1]
    lines.push('━━━━━━━━━━━━')
    lines.push(`📈 最新日活：${latest.players} 人（${latest.date}）`)
  }
  return lines.join('\n')
}

function apply(ctx, config) {
  ctx.command('排行t', 'TrucklineMP 游览时长排行榜')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const [lb, daily] = await Promise.all([
          api.leaderboard(config),
          api.dailyActive(config).catch(() => null),
        ])
        const entries = (lb && lb.entries) || []
        return deliver(ctx, config, 'ranking', rankCard(entries, daily), rankText(entries, daily))
      } catch (e) {
        ctx.logger('tlmp').warn('排行榜失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, rankCard, rankText }
