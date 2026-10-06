const { failMsg } = require('../util/common')
const {
  esc, richText, fmtDate, fmtNum, resolveImage, cardTheme, CARD_DECO,
  deliver, normalizeKey,
} = require('../util/common')
const api = require('../api/trucklineApi')
const { ROLE_ZH, TIER_ZH, GAME_ZH, COMPANY_TYPE_ZH, LANGUAGE_ZH } = require('../util/constant')

const BASE_CSS = `
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--edge)}
.title{font-size:22px;font-weight:700;color:var(--t1);letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand{color:#b0740a;font-size:13px;font-weight:700;letter-spacing:2px;flex:none;margin-left:12px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.chip{font-size:12.5px;color:#3f4f7a;background:var(--glass-2);border:1px solid var(--stroke);border-radius:999px;padding:4px 12px;box-shadow:var(--panel-shadow)}
.chip.gold{color:#9a5b06;border-color:rgba(217,119,6,.4);background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(255,248,232,.62))}
.chip.green{color:#0b7a5b;border-color:rgba(16,185,129,.45)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
.stat{position:relative;overflow:hidden;background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:13px 8px 11px;text-align:center;box-shadow:var(--panel-shadow)}
.stat::before{content:'';position:absolute;top:0;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.stat b{display:block;font-size:20px;color:var(--t1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat span{display:block;font-size:12px;color:var(--t3);margin-top:4px;letter-spacing:.5px}
.section{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.kv{font-size:13.5px;line-height:1.9}
.kv .row{word-break:break-all}
.kv b{color:var(--t2);font-weight:600;margin-right:8px}
.desc{font-size:13px;line-height:1.75;color:var(--t2);background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:12px 14px;box-shadow:var(--panel-shadow)}
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

function badges(v) {
  const out = []
  if (v.official) out.push({ t: '官方', c: 'gold' })
  if (v.partnered) out.push({ t: '合作伙伴', c: 'gold' })
  if (v.verified) out.push({ t: '认证', c: 'green' })
  if (v.validated) out.push({ t: '已审核', c: '' })
  if (v.recruitmentOpen) out.push({ t: '招募中', c: 'green' })
  return out
}

function gamesText(games) {
  if (!Array.isArray(games) || !games.length) return '—'
  return games.map((g) => GAME_ZH[g] || g).join(' / ')
}

// 🎨 设计提示词（车队详情）：车队名片。顶图 banner 打底 + 玻璃卡面，头像圆角浮起；
// 徽章区分官方/认证；数据块细光刃；整体明亮、有车队涂装感。
function vtcDetailCard(v, opts) {
  const o = opts || {}
  const bannerEl = o.bannerSrc
    ? `<div class="banner" style="background-image:url('${esc(o.bannerSrc)}')"></div>`
    : '<div class="banner banner-ph"></div>'
  const avatarEl = o.avatarSrc
    ? `<img class="avatar" src="${esc(o.avatarSrc)}">`
    : `<div class="avatar ph">${esc((v.name || '?').slice(0, 1))}</div>`

  const chips = badges(v).map((b) => `<span class="chip ${b.c}">${b.t}</span>`)
  chips.push(`<span class="chip">${esc(TIER_ZH[v.tier] || v.tier || '标准')}</span>`)

  const stats = [
    [fmtNum(v.memberCount || 0), '成员数'],
    [fmtNum(v.activityScore || 0), '活跃度'],
    [esc(TIER_ZH[v.tier] || v.tier || '—'), '车队等级'],
    [esc(COMPANY_TYPE_ZH[v.companyType] || v.companyType || '—'), '类型'],
  ]

  const base = []
  if (v.handle) base.push(['handle', '@' + v.handle])
  base.push(['车队 ID', String(v.id)])
  if (v.inGameTag) base.push(['游戏内标签', v.inGameTag])
  base.push(['支持游戏', gamesText(v.games)])
  base.push(['主要语言', LANGUAGE_ZH[v.language] || v.language || '—'])
  if (v.country) base.push(['国家/地区', v.country])
  if (v.timezone) base.push(['时区', v.timezone])
  base.push(['成立时间', fmtDate(v.createdAt)])

  const contact = []
  if (v.website) contact.push(['官网', v.website])
  if (v.discord) contact.push(['Discord', v.discord])
  if (v.email) contact.push(['邮箱', v.email])
  if (v.twitter) contact.push(['X / Twitter', v.twitter])
  if (v.instagram) contact.push(['Instagram', v.instagram])
  if (v.facebook) contact.push(['Facebook', v.facebook])
  if (v.youtube) contact.push(['YouTube', v.youtube])
  if (v.twitch) contact.push(['Twitch', v.twitch])
  if (v.tiktok) contact.push(['TikTok', v.tiktok])

  const recruit = v.recruitmentOpen
    ? `开放招募${v.recruitmentLink ? ` · ${v.recruitmentLink}` : ''}`
    : '当前未开放招募'

  const events = Array.isArray(v.upcomingEvents) ? v.upcomingEvents : []
  const eventsHtml = events.length
    ? `<div class="list">${events.slice(0, 4).map((e) => `<div class="lrow"><div class="lmain"><div class="lname">${esc(e.name)}</div><div class="lsub">${esc(fmtDate(e.startAt))}${e.server ? ' · ' + esc(e.server) : ''}${e.departure ? ' · ' + esc(e.departure) : ''}</div></div><div class="lmeta">${fmtNum(e.attendeeCount || 0)}<br>人报名</div></div>`).join('')}</div>`
    : '<div class="empty">暂无即将开始的活动</div>'

  const members = Array.isArray(v.memberPreviews) ? v.memberPreviews : []
  const membersHtml = members.length
    ? `<div class="list">${members.slice(0, 8).map((m) => `<div class="lrow"><div class="lidx">${esc((m.name || '?').slice(0, 1))}</div><div class="lmain"><div class="lname">${esc(m.name)}${m.isOwner ? ' 👑' : ''}</div><div class="lsub">${esc(ROLE_ZH[m.role] || m.role || '成员')}${m.webId ? ' · WebID ' + esc(m.webId) : ''}</div></div><div class="lmeta">加入<br>${esc(fmtDate(m.joinedAt))}</div></div>`).join('')}</div>`
    : '<div class="empty">暂无可展示的成员</div>'

  const dlcs = Array.isArray(v.requiredDlcs) ? v.requiredDlcs : []
  const dlcHtml = dlcs.length
    ? `<div class="chips">${dlcs.map((d) => `<span class="chip">${esc(d.name || d.appId)}</span>`).join('')}</div>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#f59e0b', '#0ea5e9', 800)}
.banner{position:absolute;left:0;right:0;top:0;height:132px;background-size:cover;background-position:center;filter:saturate(1.05)}
.banner-ph{background:linear-gradient(120deg,rgba(245,158,11,.30),rgba(14,165,233,.24),rgba(255,255,255,.06))}
.banner::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.78))}
.herowrap{position:relative;margin:-30px -28px 0;height:132px;overflow:hidden}
.who{position:absolute;left:130px;right:24px;bottom:14px;z-index:3;min-width:0}
.who .name{font-size:23px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who .sub{font-size:13px;color:#5a7099;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.avatar{position:absolute;left:28px;bottom:12px;width:88px;height:88px;border-radius:22px;object-fit:cover;border:4px solid rgba(255,255,255,.95);background:#eef3f9;box-shadow:0 16px 32px -14px rgba(49,60,120,.5);z-index:3}
.avatar.ph{display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;color:#b0740a;background:linear-gradient(150deg,rgba(245,158,11,.36),rgba(14,165,233,.28))}
.brandtag{position:absolute;top:14px;right:24px;z-index:3;color:rgba(60,74,120,.5);font-size:12.5px;font-weight:700;letter-spacing:2px}
${BASE_CSS}
</style></head><body><div id="card">${CARD_DECO}
<div class="herowrap">${bannerEl}${avatarEl}<div class="who"><div class="name">${esc(v.name)}</div><div class="sub">${v.slogan ? esc(v.slogan) : (v.handle ? '@' + esc(v.handle) : '')}</div></div><span class="brandtag">VTC</span></div>
<div class="chips">${chips.join('')}</div>
<div class="stats">${stats.map(([a, b]) => `<div class="stat"><b>${a}</b><span>${b}</span></div>`).join('')}</div>
<div class="section"><h3>车队简介</h3><div class="desc">${v.description ? richText(v.description, 460) : '（车队未填写简介）'}</div></div>
<div style="display:flex;gap:24px;align-items:flex-start">
<div style="flex:1;min-width:0"><div class="section"><h3>基本信息</h3><div class="kv">${base.map(([k, val]) => `<div class="row"><b>${k}</b>${esc(val)}</div>`).join('')}</div></div></div>
<div style="flex:1;min-width:0"><div class="section"><h3>联系方式</h3>${contact.length ? `<div class="kv">${contact.map(([k, val]) => `<div class="row"><b>${k}</b>${esc(val)}</div>`).join('')}</div>` : '<div class="empty">未公开联系方式</div>'}</div></div>
</div>
<div class="section"><h3>招募</h3><div class="kv"><div class="row">${esc(recruit)}</div>${v.minPlaytime || v.minAccountAge ? `<div class="row"><b>门槛</b>${v.minPlaytime ? `游玩 ≥ ${v.minPlaytime} 分钟` : ''}${v.minPlaytime && v.minAccountAge ? ' · ' : ''}${v.minAccountAge ? `账号 ≥ ${v.minAccountAge} 天` : ''}</div>` : ''}</div>${dlcHtml}</div>
<div class="section"><h3>近期活动</h3>${eventsHtml}</div>
<div class="section"><h3>成员（预览 ${members.length}）</h3>${membersHtml}</div>
<div class="foot"><span>TrucklineMP 车队 · ID ${esc(String(v.id))}</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function vtcDetailText(v) {
  const lines = []
  lines.push(`🏢 ${v.name}${v.handle ? `（@${v.handle}）` : ''}`)
  lines.push('━━━━━━━━━━━━')
  const bd = badges(v).map((b) => b.t)
  bd.push(TIER_ZH[v.tier] || v.tier || '标准')
  lines.push(`🏷 ${bd.join(' · ')}`)
  lines.push(`👥 成员 ${v.memberCount || 0} · 活跃度 ${v.activityScore || 0} · ID ${v.id}`)
  lines.push(`🎮 ${gamesText(v.games)}${v.inGameTag ? ` · 标签「${v.inGameTag}」` : ''}`)
  lines.push(`🌍 ${LANGUAGE_ZH[v.language] || v.language || '—'}${v.country ? ` · ${v.country}` : ''}${v.timezone ? ` · ${v.timezone}` : ''}`)
  lines.push(`🗓 成立：${fmtDate(v.createdAt)}`)
  if (v.slogan) lines.push(`💬 ${v.slogan}`)
  if (v.description) lines.push(`📝 ${String(v.description).slice(0, 200)}${String(v.description).length > 200 ? '…' : ''}`)
  const contact = []
  if (v.website) contact.push(`官网 ${v.website}`)
  if (v.discord) contact.push(`Discord ${v.discord}`)
  if (v.twitter) contact.push(`X ${v.twitter}`)
  if (v.email) contact.push(`邮箱 ${v.email}`)
  if (contact.length) lines.push(`🌐 ${contact.join(' · ')}`)
  lines.push(`📣 招募：${v.recruitmentOpen ? '开放中' : '未开放'}`)
  const events = Array.isArray(v.upcomingEvents) ? v.upcomingEvents : []
  if (events.length) {
    lines.push(`📅 近期活动（${events.length}）：`)
    events.slice(0, 4).forEach((e) => lines.push(`   ${fmtDate(e.startAt)} · ${e.name}${e.server ? ` · ${e.server}` : ''} · ${e.attendeeCount || 0} 人`))
  }
  return lines.join('\n')
}

function vtcListCard(title, sub, items, metaOf) {
  const rows = items.map((it, i) => {
    const meta = metaOf(it)
    return `<div class="lrow"><div class="lidx">${i + 1}</div><div class="lmain"><div class="lname">${esc(it.name)}${it.handle ? ` <span style="color:var(--t3);font-weight:400">@${esc(it.handle)}</span>` : ''}</div><div class="lsub">${esc(meta.sub)}</div></div><div class="lmeta">${esc(meta.right)}</div></div>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#f59e0b', '#0ea5e9', 720)}${BASE_CSS}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">${esc(title)}</span><span class="brand">VTC</span></div>
<div style="font-size:12.5px;color:var(--t3);margin-top:10px">${esc(sub)}</div>
<div class="section"><div class="list">${rows || '<div class="empty">没有结果</div>'}</div></div>
<div class="foot"><span>TrucklineMP 车队目录</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function vtcListText(title, sub, items, metaOf) {
  const lines = [`🏢 ${title}`, sub, '━━━━━━━━━━━━']
  if (!items.length) lines.push('  没有结果')
  items.forEach((it, i) => {
    const meta = metaOf(it)
    lines.push(`${i + 1}. ${it.name}${it.handle ? ` (@${it.handle})` : ''}`)
    lines.push(`   ${meta.sub} · ${meta.right}`)
  })
  return lines.join('\n')
}

function vtcRowMeta(it) {
  const bits = []
  bits.push(`${it.memberCount || 0} 人`)
  bits.push(TIER_ZH[it.tier] || it.tier || '标准')
  if (it.recruitmentOpen) bits.push('招募中')
  if (it.official) bits.push('官方')
  if (it.verified) bits.push('认证')
  return {
    sub: `${bits.join(' · ')}${it.slogan ? ` · ${it.slogan}` : ''}`,
    right: `活跃度 ${it.activityScore || 0}\n${gamesText(it.games)}`,
  }
}

async function resolveVtc(config, rawKey) {
  const k = normalizeKey(rawKey)
  if (!k) return { vtc: null, via: 'empty' }
  if (/^\d+$/.test(k) || /^[a-zA-Z0-9_.-]+$/.test(k)) {
    const d = await api.getVtc(config, k).catch(() => null)
    if (d && d.id) return { vtc: d, via: 'direct' }
  }
  const items = await api.listVtcs(config, { search: k, limit: 8 }).then((d) => (d && d.items) || []).catch(() => [])
  if (!items.length) return { vtc: null, via: 'none' }
  const lower = k.toLowerCase()
  const exact = items.find((i) => String(i.name || '').toLowerCase() === lower)
    || items.find((i) => String(i.handle || '').toLowerCase() === lower)
  if (exact) {
    const d = await api.getVtc(config, exact.id).catch(() => null)
    if (d && d.id) return { vtc: d, via: 'search' }
  }
  return { vtc: null, via: 'list', items }
}

function apply(ctx, config) {
  ctx.command('车队t [keyword]', '查询 TrucklineMP 车队（VTC）')
    .usage('示例：车队t Scania / 车队t 70 ; 不填则展示活跃车队榜')
    .action(async ({ session }, keyword) => {
      if (!session) return
      const k = normalizeKey(keyword)

      try {
        if (!k) {
          const d = await api.listVtcs(config, { sort: 'activity', limit: 10 })
          const items = (d && d.items) || []
          return deliver(ctx, config, 'vtcRank',
            vtcListCard('活跃车队榜', '按活跃度排序 · 前 10', items, vtcRowMeta),
            vtcListText('活跃车队榜', '按活跃度排序 · 前 10', items, vtcRowMeta))
        }

        const r = await resolveVtc(config, k)
        if (r.vtc) {
          const avatarSrc = await resolveImage(r.vtc.profilePicture).catch(() => '')
          const bannerSrc = await resolveImage(r.vtc.banner).catch(() => '')
          return deliver(ctx, config, 'vtc', vtcDetailCard(r.vtc, { avatarSrc, bannerSrc }), vtcDetailText(r.vtc))
        }
        if (r.via === 'list') {
          return deliver(ctx, config, 'vtc',
            vtcListCard(`车队搜索：${k}`, `找到 ${r.items.length} 个匹配车队`, r.items, vtcRowMeta),
            vtcListText(`车队搜索：${k}`, `找到 ${r.items.length} 个匹配车队`, r.items, vtcRowMeta))
        }
        return `没找到车队「${k}」，可试试「车队t 车队ID」或更完整的关键字`
      } catch (e) {
        ctx.logger('tlmp').warn('车队查询失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('车队排行t [sort]', 'TrucklineMP 车队排行榜')
    .usage('排序可选：members（默认，按成员数）/ activity（按活跃度）/ newest（最新）')
    .action(async ({ session }, sort) => {
      if (!session) return
      const SORTS = { members: '成员数', activity: '活跃度', newest: '最新创建' }
      const key = SORTS[sort] ? sort : 'members'
      try {
        const d = await api.listVtcs(config, { sort: key, limit: 10 })
        const items = (d && d.items) || []
        const title = `车队排行 · 按${SORTS[key]}`
        const sub = `共收录 ${fmtNum(d && d.total)} 个车队 · 展示前 10`
        return deliver(ctx, config, 'vtcRank',
          vtcListCard(title, sub, items, vtcRowMeta),
          vtcListText(title, sub, items, vtcRowMeta))
      } catch (e) {
        ctx.logger('tlmp').warn('车队排行失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('车队成员t <keyword>', '查看车队成员名单')
    .usage('示例：车队成员t 70 / 车队成员t alpha7group')
    .action(async ({ session }, keyword) => {
      if (!session) return
      try {
        const r = await resolveVtc(config, keyword)
        if (!r.vtc) return `没找到车队「${normalizeKey(keyword)}」`
        const d = await api.vtcMembers(config, r.vtc.id, { limit: 30 })
        const members = (d && d.items) || []
        const title = `成员名单 · ${r.vtc.name}`
        const sub = `共 ${fmtNum((d && d.total) || r.vtc.memberCount || members.length)} 人 · 展示前 30`
        const metaOf = (m) => ({
          sub: `${ROLE_ZH[m.role] || m.role || '成员'}${(m.roles || []).length ? ' · ' + m.roles.map((x) => x.name).join('/') : ''}${m.webId ? ' · WebID ' + m.webId : ''}`,
          right: `${m.isOwner ? '队长\n' : ''}${fmtDate(m.joinedAt)}`,
        })
        return deliver(ctx, config, 'vtcMember',
          vtcListCard(title, sub, members, metaOf),
          vtcListText(title, sub, members, metaOf))
      } catch (e) {
        ctx.logger('tlmp').warn('车队成员查询失败: %s', e.message)
        return failMsg(e)
      }
    })

  ctx.command('招募t <keyword>', '查看车队招募要求')
    .usage('示例：招募t 70')
    .action(async ({ session }, keyword) => {
      if (!session) return
      try {
        const r = await resolveVtc(config, keyword)
        if (!r.vtc) return `没找到车队「${normalizeKey(keyword)}」`
        const v = r.vtc
        const d = await api.vtcRecruitment(config, v.id).catch(() => null)
        const rec = d && d.recruitment
        const req = v.joinRequirements || {}
        const avatarSrc = await resolveImage(v.profilePicture).catch(() => '')

        const questions = (rec && rec.questions) || []
        const written = (req.writtenRequirements || []).filter((x) => x && x.enabled)

        const reqRows = []
        if (req.enforcePlaytime && v.minPlaytime) reqRows.push(['游玩时长', `≥ ${v.minPlaytime} 分钟`])
        if (req.enforceAccountAge && v.minAccountAge) reqRows.push(['账号年龄', `≥ ${v.minAccountAge} 天`])
        if (req.enforceDlcOwnership && (v.requiredDlcs || []).length) reqRows.push(['必需 DLC', (v.requiredDlcs || []).map((x) => x.name || x.appId).join(' / ')])
        written.forEach((w) => reqRows.push(['要求', w.text]))

        const avatarEl = avatarSrc
          ? `<img class="avatar" src="${esc(avatarSrc)}">`
          : `<div class="avatar ph">${esc((v.name || '?').slice(0, 1))}</div>`

        const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#10b981', '#0ea5e9', 720)}${BASE_CSS}
.hero{display:flex;align-items:center;gap:16px;margin-top:16px}
.avatar{width:64px;height:64px;border-radius:18px;object-fit:cover;border:3px solid rgba(255,255,255,.95);background:#eef3f9;box-shadow:0 12px 26px -12px rgba(49,60,120,.5);flex:none}
.avatar.ph{display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#0b7a5b;background:linear-gradient(150deg,rgba(16,185,129,.34),rgba(14,165,233,.26))}
.hero .nm{font-size:19px;font-weight:700;color:var(--t1)}
.hero .st{font-size:12.5px;color:var(--t3);margin-top:4px}
.qbox{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:12px 16px;box-shadow:var(--panel-shadow);font-size:13.5px;line-height:1.9}
.qbox ol{margin:0;padding-left:18px}
.qbox li{margin:3px 0}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">车队招募</span><span class="brand">RECRUIT</span></div>
<div class="hero">${avatarEl}<div><div class="nm">${esc(v.name)}</div><div class="st">${v.recruitmentOpen ? '🟢 招募开放中' : '⚫ 当前未开放招募'}${v.recruitmentLink ? ` · ${esc(v.recruitmentLink)}` : ''}</div></div></div>
${reqRows.length ? `<div class="section"><h3>加入要求</h3><div class="qbox">${reqRows.map(([k, val]) => `<div><b style="color:var(--t2)">${esc(k)}</b>：${esc(val)}</div>`).join('')}</div></div>` : ''}
${rec ? `<div class="section"><h3>${esc(rec.title || '申请表')}</h3>${rec.description ? `<div class="desc" style="margin-bottom:10px">${richText(rec.description, 300)}</div>` : ''}<div class="qbox">${questions.length ? `<ol>${questions.map((q) => `<li>${esc(q.question)}${q.required ? ' <span style="color:#dc2626">*</span>' : ''}${(q.options || []).length ? `（${esc(q.options.join(' / '))}）` : ''}</li>`).join('')}</ol>` : '该车队未设置申请问题'}</div></div>` : ''}
${!reqRows.length && !rec ? '<div class="empty" style="margin-top:16px">该车队未公开招募信息</div>' : ''}
<div class="foot"><span>TrucklineMP 车队 · ID ${esc(String(v.id))}</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`

        const lines = [`📣 ${v.name} 招募信息`, '━━━━━━━━━━━━', `状态：${v.recruitmentOpen ? '🟢 开放中' : '⚫ 未开放'}`]
        reqRows.forEach(([k, val]) => lines.push(`· ${k}：${val}`))
        if (rec) {
          lines.push(`📝 ${rec.title || '申请表'}`)
          if (rec.description) lines.push(`   ${String(rec.description).slice(0, 160)}`)
          questions.forEach((q, i) => lines.push(`   ${i + 1}. ${q.question}${q.required ? ' *' : ''}`))
        }
        if (!reqRows.length && !rec) lines.push('（未公开招募信息）')

        return deliver(ctx, config, 'recruit', html, lines.join('\n'))
      } catch (e) {
        ctx.logger('tlmp').warn('招募查询失败: %s', e.message)
        return failMsg(e)
      }
    })
}

module.exports = { apply, vtcDetailCard, vtcDetailText, vtcListCard, vtcListText, vtcRowMeta, resolveVtc }
