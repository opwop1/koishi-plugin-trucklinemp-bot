const { failMsg } = require('../util/common')
const { esc, fmtTime, fmtDate, fmtNum, cardTheme, CARD_DECO, deliver } = require('../util/common')
const api = require('../api/trucklineApi')
const { SEVERITY_ZH, SCOPE_ZH } = require('../util/constant')

const SEV_CLASS = { temporary: 'warn', permanent: 'danger', warning: 'info' }

function banCard(items, keyword) {
  const rows = items.map((b, i) => {
    const sev = SEV_CLASS[b.severity] || 'info'
    const active = b.expiresAt ? new Date(b.expiresAt).getTime() > Date.now() : true
    return `<div class="brow">
<div class="bidx">${i + 1}</div>
<div class="bmain">
<div class="bname">${esc(b.userName || b.userHandle || '未知')}<span class="sev ${sev}">${esc(SEVERITY_ZH[b.severity] || b.severity || '—')}</span><span class="scope">${esc(SCOPE_ZH[b.scope] || b.scope || '—')}</span>${active ? '<span class="act">生效中</span>' : '<span class="exp">已结束</span>'}</div>
<div class="breason">${esc(b.reasonShort || '—')}</div>
</div>
<div class="bmeta"><div>${esc(fmtTime(b.issuedAt))}</div><div>${b.expiresAt ? '至 ' + esc(fmtTime(b.expiresAt)) : '永久'}</div></div>
</div>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#f43f5e', '#f59e0b', 780)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1)}
.brand{color:#c02a45;font-size:13px;font-weight:700;letter-spacing:2px}
.section{margin-top:14px}
.list{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;overflow:hidden;box-shadow:var(--panel-shadow)}
.brow{display:flex;align-items:flex-start;gap:12px;padding:11px 14px}
.brow + .brow{border-top:1px solid var(--edge-2)}
.bidx{flex:none;width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#c02a45;background:var(--glass-3);border:1px solid var(--stroke)}
.bmain{flex:1;min-width:0}
.bname{font-size:13.5px;color:var(--t1);font-weight:600;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.sev,.scope,.act,.exp{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px;border:1px solid var(--stroke)}
.sev.warn{color:#b45309;border-color:rgba(217,119,6,.4)}
.sev.danger{color:#b91c1c;border-color:rgba(220,38,38,.45)}
.sev.info{color:#475569}
.scope{color:var(--t3)}
.act{color:#b91c1c;border-color:rgba(220,38,38,.35);background:rgba(254,226,226,.5)}
.exp{color:#64748b}
.breason{font-size:12.5px;color:var(--t2);margin-top:6px;line-height:1.6;word-break:break-word}
.bmeta{flex:none;text-align:right;font-size:11.5px;color:var(--t3);line-height:1.6}
.empty{color:var(--t3);font-size:13px;padding:14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">公开封禁记录</span><span class="brand">BANS</span></div>
<div style="font-size:12.5px;color:var(--t3);margin-top:10px">${keyword ? `关键字「${esc(keyword)}」 · ` : ''}共 ${fmtNum(items.length)} 条</div>
<div class="section"><div class="list">${rows || '<div class="empty">没有相关封禁记录</div>'}</div></div>
<div class="foot"><span>TrucklineMP 处罚公示</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function banText(items, keyword) {
  const lines = [`⛔ TrucklineMP 公开封禁记录${keyword ? `（${keyword}）` : ''}`, '━━━━━━━━━━━━']
  if (!items.length) lines.push('  没有相关封禁记录')
  items.forEach((b, i) => {
    const active = b.expiresAt ? new Date(b.expiresAt).getTime() > Date.now() : true
    lines.push(`${i + 1}. ${b.userName || b.userHandle || '未知'} [${SEVERITY_ZH[b.severity] || b.severity}｜${SCOPE_ZH[b.scope] || b.scope}${active ? '｜生效中' : '｜已结束'}]`)
    lines.push(`   原因：${b.reasonShort || '—'}`)
    lines.push(`   时间：${fmtTime(b.issuedAt)}${b.expiresAt ? ` → ${fmtTime(b.expiresAt)}` : '（永久）'}`)
  })
  return lines.join('\n')
}

function apply(ctx, config) {
  ctx.command('封禁t [keyword]', '查询 TrucklineMP 公开封禁记录')
    .usage('示例：封禁t / 封禁t 玩家名')
    .action(async ({ session }, keyword) => {
      if (!session) return
      const kw = String(keyword || '').trim()
      try {
        const d = await api.listBans(config, { limit: 10, q: kw })
        const items = (d && d.items) || (d && d.data) || []
        return deliver(ctx, config, 'ban', banCard(items, kw), banText(items, kw))
      } catch (e) {
        ctx.logger('tlmp').warn('封禁查询失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, banCard, banText }
