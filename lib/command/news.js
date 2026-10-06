const { failMsg } = require('../util/common')
const { esc, richText, fmtTime, fmtDate, fmtNum, cardTheme, CARD_DECO, deliver } = require('../util/common')
const api = require('../api/trucklineApi')

function newsCard(items) {
  const rows = items.map((n, i) => `<div class="nrow"><div class="nidx">${i + 1}</div><div class="nmain"><div class="nname">${n.pinned ? '📌 ' : ''}${esc(n.title)}</div><div class="nsub">${esc((n.author && n.author.name) || '官方')} · ${esc(fmtTime(n.createdAt))}${n.updatedAt && n.updatedAt !== n.createdAt ? ' · 已更新' : ''}</div></div></div>`).join('')
  const first = items[0]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#0ea5e9', '#6366f1', 760)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1)}
.brand{color:#3d7fbe;font-size:13px;font-weight:700;letter-spacing:2px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.desc{font-size:13px;line-height:1.75;color:var(--t2);background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:12px 14px;box-shadow:var(--panel-shadow);word-break:break-word}
.list{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;overflow:hidden;box-shadow:var(--panel-shadow)}
.nrow{display:flex;align-items:center;gap:12px;padding:10px 14px}
.nrow + .nrow{border-top:1px solid var(--edge-2)}
.nidx{flex:none;width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#3d7fbe;background:var(--glass-3);border:1px solid var(--stroke)}
.nmain{flex:1;min-width:0}
.nname{font-size:13.5px;color:var(--t1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nsub{font-size:11.5px;color:var(--t3);margin-top:3px}
.empty{color:var(--t3);font-size:13px;padding:14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">TrucklineMP 官方新闻</span><span class="brand">NEWS</span></div>
${items.length ? `<div class="section"><h3>最新 · ${esc(first.title)}</h3><div class="desc">${richText(first.content, 400)}</div></div>
<div class="section"><h3>新闻列表（${items.length}）</h3><div class="list">${rows}</div></div>` : '<div class="empty" style="margin-top:16px">官方暂未发布新闻</div>'}
<div class="foot"><span>TrucklineMP 新闻</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function newsText(items) {
  const lines = ['📰 TrucklineMP 官方新闻', '━━━━━━━━━━━━']
  if (!items.length) lines.push('  官方暂未发布新闻')
  items.forEach((n, i) => {
    lines.push(`${i + 1}. ${n.pinned ? '📌 ' : ''}${n.title}`)
    lines.push(`   ${(n.author && n.author.name) || '官方'} · ${fmtTime(n.createdAt)}`)
    if (i === 0 && n.content) lines.push(`   ${String(n.content).slice(0, 120)}…`)
  })
  return lines.join('\n')
}

function apply(ctx, config) {
  ctx.command('新闻t', 'TrucklineMP 官方新闻')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const d = await api.listNews(config, { limit: 8 })
        const items = (d && d.items) || []
        return deliver(ctx, config, 'news', newsCard(items), newsText(items))
      } catch (e) {
        ctx.logger('tlmp').warn('新闻查询失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, newsCard, newsText }
