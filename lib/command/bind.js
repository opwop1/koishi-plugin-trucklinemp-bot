const { failMsg } = require('../util/common')
const { bindingQuery, esc, resolveImage, cardTheme, CARD_DECO, fmtDate, deliver, normalizeKey } = require('../util/common')
const { findUser } = require('../api/trucklineApi')
const { ROLE_ZH } = require('../util/constant')

// 🎨 设计提示词（绑定成功）：发车凭证。琥珀→天蓝路带压顶，头像居中浮起，
// 像一张刚打印出来的行车通行证；文字深色、干净明亮。
function successCard(user, session, avatarSrc) {
  const src = avatarSrc || ''
  const avatarEl = src
    ? `<img class="avatar" src="${esc(src)}">`
    : `<div class="avatar ph">${esc((user.name || '?').slice(0, 1))}</div>`
  const vtc = user.vtc
  const roleText = vtc ? `${esc(vtc.name)}${vtc.role ? ` · ${esc(ROLE_ZH[vtc.role] || vtc.role)}` : ''}` : '未加入车队'
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#f59e0b', '#0ea5e9', 640)}
.hero{position:relative;height:150px;margin:-30px -28px 0;background:linear-gradient(120deg,rgba(245,158,11,.26),rgba(14,165,233,.20) 60%,rgba(255,255,255,.06));overflow:hidden}
.hero::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 132%,rgba(255,255,255,.78),transparent 62%)}
.avatar{width:104px;height:104px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,.95);background:#eef3f9;box-shadow:0 16px 34px -14px rgba(13,124,88,.5),0 0 0 1px rgba(124,144,196,.14)}
.avatar.ph{display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:40px;font-weight:700;color:#b0740a;background:linear-gradient(150deg,rgba(245,158,11,.34),rgba(14,165,233,.26))}
h1{color:var(--t1);font-size:26px;margin-top:16px;letter-spacing:6px;text-align:center}
.uline{width:60px;height:3px;margin:11px auto 0;border-radius:2px;background:linear-gradient(90deg,transparent,var(--ac),transparent)}
.name{margin-top:16px;font-size:25px;color:var(--t1);font-weight:700;text-align:center}
.sub{font-size:14px;color:#3d7fbe;text-align:center;margin-top:4px}
.ribbon{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.rchip{font-size:12.5px;color:#42536f;background:var(--glass-2);border:1px solid var(--stroke);border-radius:999px;padding:5px 14px;box-shadow:var(--panel-shadow)}
.rchip b{color:var(--t1)}
.hint{margin-top:18px;font-size:13px;color:var(--t3);line-height:1.85;text-align:center}
.hint b{color:var(--t2)}
.foot{margin-top:22px;padding-top:13px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="hero"></div>
<div style="text-align:center;margin-top:-72px;position:relative;z-index:3">${avatarEl}</div>
<h1>绑定成功</h1>
<div class="uline"></div>
<div class="name">${esc(user.name || '—')}</div>
<div class="sub">${user.handle ? '@' + esc(user.handle) : 'WebID ' + esc(user.webId)}</div>
<div class="ribbon">
<span class="rchip">QQ <b>${esc(session.userId)}</b></span>
<span class="rchip">车队 <b>${vtcText(vtc)}</b></span>
</div>
<div class="hint">发送「查询t」查看完整资料 · 发送「解绑t」解除绑定</div>
<div class="foot"><span>TrucklineMP</span><span>trucklinemp.com</span></div>
</div></body></html>`
}

function vtcText(vtc) {
  if (!vtc) return '未加入'
  return esc(vtc.name) + (vtc.role ? ` · ${esc(ROLE_ZH[vtc.role] || vtc.role)}` : '')
}

function bindText(user, session) {
  const lines = [`✅ 绑定成功！`, `👤 ${user.name || '—'}${user.handle ? `（@${user.handle}）` : ''}`]
  if (user.webId != null) lines.push(`🆔 WebID：${user.webId}`)
  if (user.vtc) lines.push(`🏢 车队：${user.vtc.name}${user.vtc.role ? ` · ${ROLE_ZH[user.vtc.role] || user.vtc.role}` : ''}`)
  if (user.createdAt) lines.push(`🗓 注册：${fmtDate(user.createdAt)}`)
  lines.push('发送「查询t」查看完整资料，发送「解绑t」解除绑定')
  return lines.join('\n')
}

function apply(ctx, config) {
  ctx.command('绑定t <key>', '绑定 TrucklineMP 账号')
    .usage('示例：绑定t ScaniaFan / 绑定t 5211 / 绑定t 76561198973396100')
    .action(async ({ session }, key) => {
      if (!session) return
      const target = normalizeKey(key)
      if (!target) return '请提供要绑定的账号，例如：绑定t 你的handle 或 WebID 或 SteamID'

      const [exist] = await ctx.database.get('tlmp_binding', bindingQuery(session))
      if (exist) {
        return `你已经绑定过 ${exist.displayName}${exist.handle ? `（@${exist.handle}）` : ''} 了，如需更换请先发送「解绑t」`
      }

      let user
      try {
        user = await findUser(config, target)
      } catch (e) {
        ctx.logger('tlmp').warn('绑定查询失败: %s', e.message)
        return failMsg(e)
      }
      if (!user) return `没找到用户「${target}」，请检查 handle / WebID / SteamID 是否正确`

      await ctx.database.create('tlmp_binding', {
        ...bindingQuery(session),
        key: target,
        tlmpId: user.id || '',
        webId: Number(user.webId) || 0,
        handle: user.handle || '',
        displayName: user.name || user.handle || target,
        steamId: user.steamId || '',
        image: user.image || '',
        vtcName: (user.vtc && user.vtc.name) || '',
        boundAt: new Date(),
      })

      const avatarSrc = await resolveImage(user.image).catch(() => '')
      return deliver(ctx, config, 'bind', successCard(user, session, avatarSrc), bindText(user, session))
    })

  ctx.command('我的绑定t', '查看已绑定的 TrucklineMP 账号')
    .action(async ({ session }) => {
      if (!session) return
      const [b] = await ctx.database.get('tlmp_binding', bindingQuery(session))
      if (!b) return '你还没有绑定，发送「绑定t 你的ID」即可绑定'
      const bits = [b.displayName]
      if (b.handle) bits.push(`@${b.handle}`)
      if (b.webId) bits.push(`WebID ${b.webId}`)
      if (b.vtcName) bits.push(`车队 ${b.vtcName}`)
      return `你绑定的是 ${bits.join(' · ')}`
    })

  ctx.command('解绑t', '解除 TrucklineMP 账号绑定')
    .action(async ({ session }) => {
      if (!session) return
      const res = await ctx.database.remove('tlmp_binding', bindingQuery(session))
      return res && res.removed ? '已解绑' : '你还没有绑定'
    })
}

module.exports = { apply, successCard, bindText }
