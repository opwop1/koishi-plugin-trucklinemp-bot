const { failMsg } = require('../util/common')
const {
  bindingQuery, esc, fmtDate, fmtNum, resolveImage, cardTheme, CARD_DECO,
  deliver, extractAtId, normalizeKey, memberByNick,
} = require('../util/common')
const { findUser } = require('../api/trucklineApi')
const { ROLE_ZH, GAME_ZH } = require('../util/constant')

const SOCIAL_LABEL = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  twitter: 'X / Twitter',
  worldOfTrucks: 'World of Trucks',
  medal: 'Medal',
  tiktok: 'TikTok',
}

function socialList(user) {
  const s = user.social || {}
  const out = []
  for (const key of Object.keys(SOCIAL_LABEL)) {
    const v = s[key]
    if (v) out.push([SOCIAL_LABEL[key], v])
  }
  return out
}

function badgeChips(user) {
  const out = []
  for (const r of user.staffRoles || []) {
    if (r && r.name) out.push({ text: r.name, color: r.color })
  }
  return out
}

// 🎨 设计提示词（玩家资料卡）：驾驶员档案。路带压顶 + 玻璃卡面；
// 头像方形圆角浮在渐变头图上；数据块顶部细光刃；职位徽章用角色色着色。
function userCard(user, opts) {
  const o = opts || {}
  const avatarEl = o.avatarSrc
    ? `<img class="avatar" src="${esc(o.avatarSrc)}">`
    : `<div class="avatar ph">${esc((user.name || '?').slice(0, 1))}</div>`

  const vtc = user.vtc
  const days = user.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 864e5)) : null

  const stats = [
    [user.webId != null ? fmtNum(user.webId) : '—', 'WebID'],
    [days != null ? days : '—', '注册天数'],
    [vtc && vtc.name ? vtc.name : '无', '所属车队'],
    [user.gameStatus ? '游戏中' : '未在线', '状态'],
  ]

  const info = []
  info.push(['注册时间', fmtDate(user.createdAt)])
  if (user.handle) info.push(['handle', '@' + user.handle])
  if (user.steamId) info.push(['SteamID', user.steamId])
  info.push(['内部 ID', user.id || '—'])

  const vtcRows = vtc ? [
    ['车队', `${vtc.name}${vtc.handle ? ` (@${vtc.handle})` : ''}`],
    ['职位', ROLE_ZH[vtc.role] || vtc.role || '成员'],
    ['加入时间', fmtDate(vtc.joinedAt)],
  ] : []

  const social = socialList(user)
  const gs = user.gameStatus

  const chips = badgeChips(user)
  const chipsHtml = chips.length
    ? `<div class="chips">${chips.map((c) => `<span class="chip"${c.color ? ` style="border-color:${esc(c.color)}66;color:${esc(c.color)}"` : ''}>${esc(c.text)}</span>`).join('')}${o.bound ? '<span class="chip bound">已绑定</span>' : ''}</div>`
    : (o.bound ? '<div class="chips"><span class="chip bound">已绑定</span></div>' : '<div style="height:14px"></div>')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#0ea5e9', '#f59e0b', 760)}
.hero{position:relative;margin:-30px -28px 0;height:120px;background:linear-gradient(120deg,rgba(14,165,233,.26),rgba(245,158,11,.20) 62%,rgba(255,255,255,.06))}
.hero::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% -30%,rgba(255,255,255,.82),transparent 58%)}
.avatar{position:absolute;left:28px;top:14px;width:96px;height:96px;border-radius:24px;object-fit:cover;border:4px solid rgba(255,255,255,.95);background:#eef3f9;box-shadow:0 16px 32px -14px rgba(49,60,120,.5)}
.avatar.ph{display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;color:#0b5f8a;background:linear-gradient(150deg,rgba(14,165,233,.34),rgba(245,158,11,.26))}
.hero-who{position:absolute;left:142px;right:28px;top:50%;transform:translateY(-50%);min-width:0}
.name{font-size:25px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{font-size:13.5px;color:#5a7099;margin-top:5px}
.brand{position:absolute;top:16px;right:28px;color:rgba(60,74,120,.55);font-size:13px;font-weight:700;letter-spacing:2px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.chip{font-size:12.5px;color:#3f4f7a;background:var(--glass-2);border:1px solid var(--stroke);border-radius:999px;padding:4px 12px;box-shadow:var(--panel-shadow)}
.chip.bound{color:#0b7a5b;border-color:rgba(16,185,129,.45)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
.stat{position:relative;overflow:hidden;background:var(--glass-2);border:1px solid var(--stroke);border-radius:18px;padding:13px 8px 11px;text-align:center;box-shadow:var(--panel-shadow)}
.stat::before{content:'';position:absolute;top:0;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)}
.stat b{display:block;font-size:19px;color:var(--t1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat span{display:block;font-size:12px;color:var(--t3);margin-top:4px;letter-spacing:.5px}
.cols{display:flex;gap:24px;margin-top:18px;align-items:flex-start}
.col{flex:1;min-width:0}
.section{margin-top:18px}
.col .section:first-child{margin-top:18px}
.section h3{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#3f4f7a;font-weight:700;letter-spacing:2px;margin-bottom:10px}
.section h3::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.kv{font-size:13.5px;line-height:1.9}
.kv .row{word-break:break-all}
.kv b{color:var(--t2);font-weight:600;margin-right:8px}
.empty{color:var(--t3);font-size:13px;padding:12px 14px;background:var(--glass-3);border:1px solid var(--stroke);border-radius:14px}
.foot{margin-top:18px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="hero">${avatarEl}<div class="hero-who"><div class="name">${esc(user.name || '—')}</div><div class="sub">${user.handle ? '@' + esc(user.handle) : 'WebID ' + esc(user.webId)}${user.steamId ? ' · Steam 已绑定' : ''}</div></div><span class="brand">TrucklineMP</span></div>
${chipsHtml}
<div class="stats">${stats.map(([v, k]) => `<div class="stat"><b>${esc(v)}</b><span>${k}</span></div>`).join('')}</div>
<div class="cols">
<div class="col"><div class="section"><h3>账号资料</h3><div class="kv">${info.map(([k, v]) => `<div class="row"><b>${k}</b>${esc(v)}</div>`).join('')}</div></div></div>
<div class="col"><div class="section"><h3>车队履历</h3>${vtcRows.length ? `<div class="kv">${vtcRows.map(([k, v]) => `<div class="row"><b>${k}</b>${esc(v)}</div>`).join('')}</div>` : '<div class="empty">未加入任何车队</div>'}</div></div>
</div>
<div class="cols">
<div class="col"><div class="section"><h3>社交链接</h3>${social.length ? `<div class="kv">${social.map(([k, v]) => `<div class="row"><b>${k}</b>${esc(v)}</div>`).join('')}</div>` : '<div class="empty">未公开社交链接</div>'}</div></div>
<div class="col"><div class="section"><h3>游戏状态</h3>${gs ? `<div class="kv"><div class="row"><b>服务器</b>${esc(gs.server || '—')}</div><div class="row"><b>附近</b>${esc(gs.near || '—')}</div><div class="row"><b>游戏</b>${esc(GAME_ZH[gs.gameId] || gs.gameId || '—')}</div></div>` : '<div class="empty">当前不在游戏中</div>'}</div></div>
</div>
<div class="foot"><span>TrucklineMP 玩家档案</span><span>${esc(fmtDate(Date.now()))}</span></div>
</div></body></html>`
}

function userText(user, opts) {
  const o = opts || {}
  const lines = []
  lines.push(`🚛 ${user.name || '—'}${o.bound ? ' · 已绑定' : ''}`)
  lines.push('━━━━━━━━━━━━')
  lines.push(`🆔 WebID：${user.webId != null ? user.webId : '—'}`)
  if (user.handle) lines.push(`🔗 handle：@${user.handle}`)
  if (user.steamId) lines.push(`🎮 SteamID：${user.steamId}`)
  lines.push(`🗓 注册：${fmtDate(user.createdAt)}`)
  const vtc = user.vtc
  if (vtc && vtc.name) {
    lines.push(`🏢 车队：${vtc.name}${vtc.role ? ` · ${ROLE_ZH[vtc.role] || vtc.role}` : ''}`)
    lines.push(`   加入：${fmtDate(vtc.joinedAt)}`)
  } else lines.push('🏢 车队：未加入')
  const staff = (user.staffRoles || []).map((r) => r.name).filter(Boolean)
  if (staff.length) lines.push(`🎖 官方职位：${staff.join(' · ')}`)
  const social = socialList(user)
  if (social.length) lines.push(`🌐 社交：${social.map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  const gs = user.gameStatus
  lines.push(`📡 游戏状态：${gs ? `在线（${gs.server || '—'}）` : '不在游戏中'}`)
  return lines.join('\n')
}

async function resolveBinding(ctx, session, atId) {
  if (atId) {
    const [b] = await ctx.database.get('tlmp_binding', { platform: session.platform, userId: atId })
    return b || null
  }
  const [b] = await ctx.database.get('tlmp_binding', bindingQuery(session))
  return b || null
}

function apply(ctx, config) {
  ctx.command('查询t [target]', '查询 TrucklineMP 玩家资料')
    .usage('不填时查询已绑定的账号；例如：查询t / 查询t @群友 / 查询t ScaniaFan')
    .action(async ({ session }, target) => {
      if (!session) return

      const atId = extractAtId(session)
      let key = normalizeKey(target)
      let bound = false

      if (atId) {
        const b = await resolveBinding(ctx, session, atId)
        if (!b) return 'TA 还没有绑定，让 TA 发送「绑定t 账号」后即可查询'
        key = b.key || b.handle || String(b.webId || '')
        bound = true
      } else if (!key) {
        const b = await resolveBinding(ctx, session, null)
        if (!b) return '你还没有绑定，发送「绑定t 你的ID」，或直接用「查询t 别人的ID」/「查询t @群友」'
        key = b.key || b.handle || String(b.webId || '')
        bound = true
      } else if (session.guildId && session.bot && !/^[\d]/.test(key)) {
        // 支持直接写群昵称
        const m = await memberByNick(session.bot, session.guildId, key).catch(() => null)
        if (m) {
          const [b] = await ctx.database.get('tlmp_binding', { platform: session.platform, userId: m.id })
          if (b) {
            key = b.key || b.handle || String(b.webId || '')
            bound = true
          }
        }
      }

      if (!key) return '未指定查询对象'

      let user
      try {
        user = await findUser(config, key)
      } catch (e) {
        ctx.logger('tlmp').warn('查询玩家失败: %s', e.message)
        return failMsg(e)
      }
      if (!user) return `没找到「${key}」。可试试「查询t 完整handle / WebID / SteamID」`

      const avatarSrc = await resolveImage(user.image).catch(() => '')
      return deliver(ctx, config, 'user', userCard(user, { avatarSrc, bound }), userText(user, { bound }))
    })
}

module.exports = { apply, userCard, userText }
