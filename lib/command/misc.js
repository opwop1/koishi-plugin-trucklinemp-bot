const { failMsg } = require('../util/common')
const { esc, resolveImage, cardTheme, CARD_DECO, deliver } = require('../util/common')
const api = require('../api/trucklineApi')

// —— 合作伙伴 ——
function partnerCard(items) {
  const cards = items.map((p) => {
    const logo = p.logo ? `<img class="plogo" src="${esc(p.logo)}">` : '<div class="plogo ph">🤝</div>'
    return `<div class="pcard">${logo}<div class="pmain"><div class="pname">${esc(p.name)}</div>${p.description ? `<div class="pdesc">${esc(p.description)}</div>` : ''}<div class="pmeta">${p.url ? esc(p.url) : ''}${p.promoCode ? `${p.url ? ' · ' : ''}优惠码 ${esc(p.promoCode)}` : ''}</div></div></div>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#0ea5e9', '#10b981', 760)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1)}
.brand{color:#3d7fbe;font-size:13px;font-weight:700;letter-spacing:2px}
.grid{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.pcard{display:flex;align-items:center;gap:14px;background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:12px 14px;box-shadow:var(--panel-shadow)}
.plogo{flex:none;width:52px;height:52px;border-radius:14px;object-fit:contain;background:#fff;border:1px solid var(--stroke);padding:4px}
.plogo.ph{display:flex;align-items:center;justify-content:center;font-size:22px}
.pmain{min-width:0}
.pname{font-size:14.5px;color:var(--t1);font-weight:700}
.pdesc{font-size:12.5px;color:var(--t2);margin-top:4px;line-height:1.55}
.pmeta{font-size:11.5px;color:var(--t3);margin-top:5px;word-break:break-all}
.empty{color:var(--t3);font-size:13px;padding:14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">TrucklineMP 合作伙伴</span><span class="brand">PARTNERS</span></div>
<div class="grid">${cards || '<div class="empty">暂无合作伙伴</div>'}</div>
<div class="foot"><span>TrucklineMP</span><span>trucklinemp.com</span></div>
</div></body></html>`
}

function partnerText(items) {
  const lines = ['🤝 TrucklineMP 合作伙伴', '━━━━━━━━━━━━']
  if (!items.length) lines.push('  暂无合作伙伴')
  items.forEach((p) => {
    lines.push(`· ${p.name}${p.description ? ` — ${p.description}` : ''}`)
    if (p.url) lines.push(`  ${p.url}`)
    if (p.promoCode) lines.push(`  优惠码：${p.promoCode}`)
  })
  return lines.join('\n')
}

// —— 规则 ——
function rulesCard(data) {
  const url = (data && data.url) || '—'
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#6366f1', '#0ea5e9', 680)}
.center{text-align:center;padding:26px 0 10px}
.ico{font-size:46px}
.title{font-size:24px;font-weight:700;color:var(--t1);letter-spacing:3px;margin-top:12px}
.line{width:60px;height:3px;margin:12px auto 0;border-radius:2px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.url{margin-top:18px;font-size:14px;color:#3f4f7a;word-break:break-all;background:var(--glass-2);border:1px solid var(--stroke);border-radius:14px;padding:14px;box-shadow:var(--panel-shadow)}
.hint{margin-top:14px;font-size:12.5px;color:var(--t3);line-height:1.8}
.foot{margin-top:20px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="center"><div class="ico">📜</div><div class="title">平台规则</div><div class="line"></div></div>
<div class="url">${esc(url)}</div>
<div class="hint">请前往该地址查看 TrucklineMP 官方规则全文</div>
<div class="foot"><span>TrucklineMP</span><span>id.trucklinemp.com/legal</span></div>
</div></body></html>`
}

// —— 版本 ——
function versionCard(v, status) {
  const modules = (status && status.modules) || {}
  const rows = [
    ['API 版本', v && v.api ? 'v' + v.api : '—'],
    ['应用版本', v && v.app ? v.app : '—'],
    ['构建号', (v && v.build) || '—'],
    ['平台状态', status ? (status.status === 'ok' ? '正常运行' : status.status) : '—'],
    ['平台版本', (status && status.version) || '—'],
  ]
  const chips = [['events', '活动'], ['forum', '论坛'], ['recruitment', '招募'], ['notifications', '通知']]
    .map(([k, label]) => `<span class="chip ${modules[k] ? 'on' : 'off'}">${label} ${modules[k] ? '开' : '关'}</span>`)
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#0ea5e9', '#6366f1', 680)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1)}
.brand{color:#3d7fbe;font-size:13px;font-weight:700;letter-spacing:2px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.kv{font-size:14px;line-height:2}
.kv b{color:var(--t2);font-weight:600;margin-right:10px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font-size:12.5px;border-radius:999px;padding:5px 13px;border:1px solid var(--stroke);background:var(--glass-2);box-shadow:var(--panel-shadow)}
.chip.on{color:#0b7a5b;border-color:rgba(16,185,129,.45)}
.chip.off{color:#94a3b8}
.foot{margin-top:20px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">TrucklineMP 版本信息</span><span class="brand">VERSION</span></div>
<div class="section"><h3>版本</h3><div class="kv">${rows.map(([k, val]) => `<div><b>${k}</b>${esc(val)}</div>`).join('')}</div></div>
<div class="section"><h3>模块状态</h3><div class="chips">${chips}</div></div>
<div class="foot"><span>TrucklineMP Public API</span><span>api.trucklinemp.com</span></div>
</div></body></html>`
}

function apply(ctx, config) {
  ctx.command('合作伙伴t', 'TrucklineMP 合作伙伴')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const d = await api.partners(config)
        const items = (d && d.items) || []
        // 预取 logo，避免截图时外链未加载
        await Promise.all(items.slice(0, 12).map((p) => (p.logo ? resolveImage(p.logo).catch(() => '') : null)))
        return deliver(ctx, config, 'partner', partnerCard(items), partnerText(items))
      } catch (e) {
        ctx.logger('tlmp').warn('合作伙伴查询失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('规则t', 'TrucklineMP 官方规则链接')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const d = await api.rules(config).catch(() => null)
        const url = (d && d.url) || '—'
        return deliver(ctx, config, 'rules', rulesCard(d), `📜 TrucklineMP 平台规则\n${url}`)
      } catch (e) {
        ctx.logger('tlmp').warn('规则查询失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('版本t', 'TrucklineMP 版本与运行状态')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const [v, status] = await Promise.all([
          api.apiVersion(config).catch(() => null),
          api.platformStatus(config).catch(() => null),
        ])
        const lines = ['🔖 TrucklineMP 版本信息', '━━━━━━━━━━━━']
        lines.push(`· API 版本：${v && v.api ? 'v' + v.api : '—'}`)
        lines.push(`· 应用版本：${(v && v.app) || '—'}`)
        if (v && v.build) lines.push(`· 构建号：${v.build}`)
        if (status) {
          const m = status.modules || {}
          lines.push(`· 平台状态：${status.status === 'ok' ? '🟢 正常运行' : status.status} · v${status.version}`)
          lines.push(`· 模块：活动${m.events ? '开' : '关'} · 论坛${m.forum ? '开' : '关'} · 招募${m.recruitment ? '开' : '关'} · 通知${m.notifications ? '开' : '关'}`)
        }
        return deliver(ctx, config, 'version', versionCard(v, status), lines.join('\n'))
      } catch (e) {
        ctx.logger('tlmp').warn('版本查询失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, partnerCard, partnerText, rulesCard, versionCard }
