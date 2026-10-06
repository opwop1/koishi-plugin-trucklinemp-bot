const { failMsg } = require('../util/common')
const {
  esc, richText, fmtTime, fmtDate, fmtNum, resolveImage, cardTheme, CARD_DECO, deliver,
} = require('../util/common')
const api = require('../api/trucklineApi')
const { CATEGORY_ZH, GAME_ZH, LANGUAGE_ZH } = require('../util/constant')

const BASE_CSS = `
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand{color:#b0740a;font-size:13px;font-weight:700;letter-spacing:2px;flex:none;margin-left:12px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.chip{font-size:12.5px;color:#3f4f7a;background:var(--glass-2);border:1px solid var(--stroke);border-radius:999px;padding:4px 12px;box-shadow:var(--panel-shadow)}
.chip.gold{color:#9a5b06;border-color:rgba(217,119,6,.4);background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(255,248,232,.62))}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
.stat{position:relative;overflow:hidden;background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:13px 8px 11px;text-align:center;box-shadow:var(--panel-shadow)}
.stat::before{content:'';position:absolute;top:0;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.stat b{display:block;font-size:19px;color:var(--t1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat span{display:block;font-size:12px;color:var(--t3);margin-top:4px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.kv{font-size:13.5px;line-height:1.9}
.kv b{color:var(--t2);font-weight:600;margin-right:8px}
.desc{font-size:13px;line-height:1.75;color:var(--t2);background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:12px 14px;box-shadow:var(--panel-shadow);word-break:break-word}
.list{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;overflow:hidden;box-shadow:var(--panel-shadow)}
.lrow{display:flex;align-items:center;gap:12px;padding:10px 14px}
.lrow + .lrow{border-top:1px solid var(--edge-2)}
.lidx{flex:none;width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#8a5a08;background:var(--glass-3);border:1px solid var(--stroke)}
.lmain{flex:1;min-width:0}
.lname{font-size:13.5px;color:var(--t1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lsub{font-size:12px;color:var(--t3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lmeta{flex:none;text-align:right;font-size:12px;color:var(--t3);line-height:1.55}
.empty{color:var(--t3);font-size:13px;padding:12px 14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
`

function eventMeta(e) {
  const cat = CATEGORY_ZH[e.category] || e.category || '活动'
  const game = GAME_ZH[e.game] || e.game || ''
  const org = e.vtcName || (e.organizerType === 'personal' ? '个人组织' : '')
  const right = `${fmtNum(e.attendeeCount || 0)}${e.maxAttendees ? ' / ' + fmtNum(e.maxAttendees) : ''}\n人报名`
  const parts = [`${fmtDate(e.startAt)} ${String(e.startAt || '').slice(11, 16)}`, cat]
  if (game) parts.push(game)
  if (e.server) parts.push(e.server)
  if (org) parts.push(org)
  return { sub: parts.join(' · '), right }
}

function eventListCard(title, sub, items) {
  const rows = items.map((e, i) => {
    const meta = eventMeta(e)
    return `<div class="lrow"><div class="lidx">${i + 1}</div><div class="lmain"><div class="lname">${esc(e.name)}</div><div class="lsub">${esc(meta.sub)}</div></div><div class="lmeta">${esc(meta.right)}</div></div>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#f59e0b', '#6366f1', 760)}${BASE_CSS}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">${esc(title)}</span><span class="brand">EVENTS</span></div>
<div style="font-size:12.5px;color:var(--t3);margin-top:10px">${esc(sub)}</div>
<div class="section"><div class="list">${rows || '<div class="empty">没有活动</div>'}</div></div>
<div class="foot"><span>TrucklineMP 活动</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function eventListText(title, sub, items) {
  const lines = [`📅 ${title}`, sub, '━━━━━━━━━━━━']
  if (!items.length) lines.push('  没有活动')
  items.forEach((e, i) => {
    const meta = eventMeta(e)
    lines.push(`${i + 1}. ${e.name}`)
    lines.push(`   ${meta.sub} · ${meta.right.replace('\n', ' ')}`)
  })
  return lines.join('\n')
}

// 🎨 设计提示词（活动详情）：赛事海报。banner 打底 + 玻璃卡面；路线信息像行程单。
function eventDetailCard(e, opts) {
  const o = opts || {}
  const bannerEl = o.bannerSrc
    ? `<div class="banner" style="background-image:url('${esc(o.bannerSrc)}')"></div>`
    : '<div class="banner banner-ph"></div>'

  const chips = []
  chips.push(`<span class="chip gold">${esc(CATEGORY_ZH[e.category] || e.category || '活动')}</span>`)
  if (e.game) chips.push(`<span class="chip">${esc(GAME_ZH[e.game] || e.game)}</span>`)
  if (e.server) chips.push(`<span class="chip">${esc(e.server)}</span>`)
  if (e.lifecycleStatus === 'cancelled') chips.push('<span class="chip" style="color:#dc2626;border-color:rgba(220,38,38,.4)">已取消</span>')
  if (e.membersOnly) chips.push('<span class="chip">仅限成员</span>')

  const stats = [
    [fmtNum(e.attendeeCount || e.goingCount || 0), '已报名'],
    [e.maxAttendees ? fmtNum(e.maxAttendees) : '不限', '人数上限'],
    [e.depotSlotsAvailable != null ? fmtNum(e.depotSlotsAvailable) : '—', '剩余车位'],
    [e.attendingVtcsCount != null ? fmtNum(e.attendingVtcsCount) : '—', '参与车队'],
  ]

  const time = []
  if (e.meetupAt) time.push(['集合', fmtTime(e.meetupAt)])
  time.push(['开始', fmtTime(e.startAt)])
  time.push(['结束', fmtTime(e.endAt)])
  if (e.vtcRegistrationDeadline) time.push(['报名截止', fmtTime(e.vtcRegistrationDeadline)])

  const route = []
  if (e.departureCity || e.departure) route.push(['出发', e.departureCity || e.departure])
  if (e.arrivalCity || e.arrival) route.push(['到达', e.arrivalCity || e.arrival])
  if (e.language) route.push(['语言', LANGUAGE_ZH[e.language] || e.language])
  if (Array.isArray(e.requiredDlcs) && e.requiredDlcs.length) route.push(['必需 DLC', e.requiredDlcs.join(' / ')])

  const organizer = []
  if (e.vtcName) organizer.push(['主办车队', `${e.vtcName}${e.vtcHandle ? ` (@${e.vtcHandle})` : ''}`])
  organizer.push(['组织类型', e.organizerType === 'personal' ? '个人' : '车队'])
  if (e.vtcOfficial) organizer.push(['资质', '官方车队'])
  else if (e.vtcVerified) organizer.push(['资质', '认证车队'])
  if (e.voiceLink) organizer.push(['语音', e.voiceLink])
  if (e.externalLink) organizer.push(['外部链接', e.externalLink])

  const rp = e.routePlan
  const routeHtml = rp
    ? `<div class="section"><h3>规划路线</h3><div class="kv">
<div><b>里程</b>${esc(fmtNum(Math.round(rp.km || 0)))} km</div>
${rp.roads ? `<div><b>途经</b>${esc(rp.roads)}</div>` : ''}
<div><b>途经点</b>${esc((rp.waypoints || []).length)} 个</div>
</div></div>`
    : ''

  const coHosts = Array.isArray(o.coHosts) ? o.coHosts : []
  const coHostHtml = coHosts.length
    ? `<div class="section"><h3>联合主办（${coHosts.length}）</h3><div class="chips">${coHosts.map((c) => `<span class="chip">${esc(c.name)}</span>`).join('')}</div></div>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#6366f1', '#f59e0b', 800)}
.herowrap{position:relative;margin:-30px -28px 0;height:128px;overflow:hidden}
.banner{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(1.05)}
.banner-ph{background:linear-gradient(120deg,rgba(99,102,241,.30),rgba(245,158,11,.24),rgba(255,255,255,.06))}
.banner::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.80))}
.who{position:absolute;left:28px;right:24px;bottom:14px;z-index:3}
.who .name{font-size:22px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who .sub{font-size:12.5px;color:#5a7099;margin-top:4px}
${BASE_CSS}
</style></head><body><div id="card">${CARD_DECO}
<div class="herowrap">${bannerEl}<div class="who"><div class="name">${esc(e.name)}</div><div class="sub">${esc(fmtTime(e.meetupAt || e.startAt))} 开始 · ID ${esc(String(e.id))}</div></div></div>
<div class="chips">${chips.join('')}</div>
<div class="stats">${stats.map(([a, b]) => `<div class="stat"><b>${esc(a)}</b><span>${b}</span></div>`).join('')}</div>
${e.description ? `<div class="section"><h3>活动说明</h3><div class="desc">${richText(e.description, 700)}</div></div>` : ''}
<div style="display:flex;gap:24px;align-items:flex-start">
<div style="flex:1;min-width:0"><div class="section"><h3>时间</h3><div class="kv">${time.map(([k, v]) => `<div><b>${k}</b>${esc(v)}</div>`).join('')}</div></div></div>
<div style="flex:1;min-width:0"><div class="section"><h3>行程</h3>${route.length ? `<div class="kv">${route.map(([k, v]) => `<div><b>${k}</b>${esc(v)}</div>`).join('')}</div>` : '<div class="empty">未填写行程信息</div>'}</div></div>
</div>
<div class="section"><h3>主办</h3><div class="kv">${organizer.map(([k, v]) => `<div><b>${k}</b>${esc(v)}</div>`).join('')}</div></div>
${routeHtml}
${coHostHtml}
${e.temporaryRules ? `<div class="section"><h3>临时规则</h3><div class="desc">${richText(e.temporaryRules, 400)}</div></div>` : ''}
${e.postEventSummary ? `<div class="section"><h3>活动总结</h3><div class="desc">${richText(e.postEventSummary, 400)}</div></div>` : ''}
<div class="foot"><span>TrucklineMP 活动 · ${esc(CATEGORY_ZH[e.category] || e.category || '')}</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function eventDetailText(e, coHosts) {
  const lines = []
  lines.push(`📅 ${e.name}`)
  lines.push('━━━━━━━━━━━━')
  lines.push(`🏷 ${CATEGORY_ZH[e.category] || e.category || '活动'}${e.game ? ` · ${GAME_ZH[e.game] || e.game}` : ''}${e.server ? ` · ${e.server}` : ''}`)
  if (e.lifecycleStatus === 'cancelled') lines.push('⛔ 已取消')
  lines.push(`🕐 时间：${fmtTime(e.startAt)} ~ ${fmtTime(e.endAt)}`)
  if (e.meetupAt) lines.push(`📍 集合：${fmtTime(e.meetupAt)}`)
  lines.push(`👥 报名：${e.attendeeCount || e.goingCount || 0}${e.maxAttendees ? ` / ${e.maxAttendees}` : ''} 人`)
  if (e.departureCity || e.departure) lines.push(`🚚 出发：${e.departureCity || e.departure}`)
  if (e.arrivalCity || e.arrival) lines.push(`🏁 到达：${e.arrivalCity || e.arrival}`)
  if (e.vtcName) lines.push(`🏢 主办：${e.vtcName}${e.vtcHandle ? ` (@${e.vtcHandle})` : ''}`)
  if (Array.isArray(e.requiredDlcs) && e.requiredDlcs.length) lines.push(`📦 必需 DLC：${e.requiredDlcs.join(' / ')}`)
  const rp = e.routePlan
  if (rp) lines.push(`🛣 规划路线：${Math.round(rp.km || 0)} km${rp.roads ? ` · 途经 ${rp.roads}` : ''}`)
  if (Array.isArray(coHosts) && coHosts.length) lines.push(`🤝 联合主办：${coHosts.map((c) => c.name).join(' · ')}`)
  if (e.voiceLink) lines.push(`🔊 语音：${e.voiceLink}`)
  if (e.externalLink) lines.push(`🔗 ${e.externalLink}`)
  if (e.description) lines.push('━━━━━━━━━━━━'), lines.push(String(e.description).slice(0, 300))
  return lines.join('\n')
}

const TAB_ALIAS = {
  upcoming: 'upcoming', past: 'past',
  '即将': 'upcoming', '往期': 'past', '过去': 'past', '历史': 'past',
}

function apply(ctx, config) {
  ctx.command('活动t [tab] [keyword]', 'TrucklineMP 活动列表')
    .usage('示例：活动t / 活动t past / 活动t upcoming race')
    .action(async ({ session }, tab, keyword) => {
      if (!session) return
      let tabKey = 'upcoming'
      let kw = ''
      const first = String(tab || '').trim()
      if (TAB_ALIAS[first]) {
        tabKey = TAB_ALIAS[first]
        kw = String(keyword || '').trim()
      } else if (first) {
        kw = first
        if (keyword) kw += ' ' + String(keyword).trim()
      }

      const params = { tab: tabKey, limit: 10 }
      if (kw) params.q = kw

      try {
        const d = await api.listEvents(config, params)
        const items = (d && d.items) || []
        const title = `${tabKey === 'past' ? '往期活动' : '即将开始的活动'}${kw ? ` · 搜索「${kw}」` : ''}`
        const sub = `共 ${fmtNum(d && d.total)} 场 · 展示前 ${items.length}`
        return deliver(ctx, config, 'event',
          eventListCard(title, sub, items),
          eventListText(title, sub, items))
      } catch (e) {
        ctx.logger('tlmp').warn('活动列表失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('活动详情t <eventId>', '查看活动详情')
    .usage('示例：活动详情t 19')
    .action(async ({ session }, eventId) => {
      if (!session) return
      const id = String(eventId || '').trim()
      if (!id) return '请提供活动 ID，例如：活动详情t 19'
      try {
        const d = await api.getEvent(config, id)
        const e = d && d.event
        if (!e) return `没找到活动「${id}」`
        const [co, routeRes] = await Promise.all([
          api.eventCoHosts(config, id).catch(() => null),
          e.routePlan ? Promise.resolve(null) : api.eventRoute(config, id).catch(() => null),
        ])
        if (!e.routePlan && routeRes && routeRes.route) e.routePlan = routeRes.route
        const coHosts = (co && co.items) || (e.coHostVtcs) || []
        const bannerSrc = await resolveImage(e.banner || e.routeImage).catch(() => '')
        return deliver(ctx, config, 'eventDetail',
          eventDetailCard(e, { bannerSrc, coHosts }),
          eventDetailText(e, coHosts))
      } catch (e) {
        ctx.logger('tlmp').warn('活动详情失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, eventListCard, eventListText, eventDetailCard, eventDetailText }
