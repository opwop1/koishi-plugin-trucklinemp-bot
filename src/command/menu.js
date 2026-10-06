const { cardTheme, CARD_DECO, isText, deliver } = require('../util/common')

const SECTIONS = [
  ['账号', [
    ['绑定t [ID]', '绑定 TrucklineMP 账号（handle / webId / SteamID / 官网链接）'],
    ['我的绑定t', '查看当前绑定'],
    ['解绑t', '解除绑定'],
  ]],
  ['查询', [
    ['查询t [@群友|名字|ID]', '玩家资料卡：车队 / 职位 / 社交 / 在线状态'],
    ['车队t [名字|ID]', '车队搜索与详情：等级 / 成员 / 简介 / 联系方式'],
    ['车队成员t [ID]', '车队成员名单'],
    ['招募t [ID]', '车队招募要求与申请表'],
  ]],
  ['排行', [
    ['车队排行t', '车队榜单（按成员数）'],
    ['排行t', '全站游玩时长排行榜'],
  ]],
  ['平台', [
    ['服务器t', '实时服务器状态与在线人数'],
    ['服务器曲线t [range]', '人口曲线 + 历史峰值（24h/7d/30d/90d/all）'],
    ['统计t', '平台总量 / 增长 / 活跃 / 管理数据'],
    ['版本t', 'API 版本与平台运行状态'],
  ]],
  ['内容', [
    ['活动t [upcoming|past]', '活动列表（可按关键字搜索）'],
    ['活动详情t [ID]', '活动详情 + 规划路线 + 联合主办'],
    ['新闻t', '官方新闻列表'],
    ['封禁t [关键字]', '公开封禁记录查询'],
    ['合作伙伴t', '平台合作伙伴'],
    ['规则t', '官方规则链接'],
  ]],
]

function menuCard() {
  const sections = SECTIONS.map(([title, items]) => {
    const rows = items
      .map(([cmd, desc]) => `<div class="mrow"><span class="cmd">${cmd}</span><span class="desc">${desc}</span></div>`)
      .join('')
    return `<div class="mtitle">${title}</div>${rows}`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${cardTheme('#f59e0b', '#0ea5e9', 800)}
.head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:15px;border-bottom:1px solid var(--edge)}
.title{font-size:24px;font-weight:700;color:var(--t1);letter-spacing:1px}
.brand{color:#b0740a;font-size:13px;font-weight:700;letter-spacing:2px}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}
.mtitle{grid-column:1 / -1;display:flex;align-items:center;gap:9px;font-size:12.5px;color:#a2690d;font-weight:700;letter-spacing:2px;margin-top:10px}
.mtitle:first-child{margin-top:0}
.mtitle::before{content:'';width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,var(--ac),var(--ac2))}
.mrow{background:var(--glass-2);border:1px solid var(--stroke);border-radius:16px;padding:9px 12px;min-width:0;box-shadow:var(--panel-shadow)}
.cmd{display:block;font-size:13px;color:#8a5a08;font-weight:700;font-family:Consolas,"Cascadia Mono",monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.desc{display:block;font-size:11.5px;color:var(--t3);margin-top:3px;line-height:1.45}
.foot{margin-top:17px;padding-top:12px;border-top:1px solid var(--edge);display:flex;justify-content:space-between;font-size:11.5px;color:var(--t3)}
</style></head><body><div id="card">${CARD_DECO}
<div class="head"><span class="title">TrucklineMP 功能菜单</span><span class="brand">MENU</span></div>
<div class="mgrid">${sections}</div>
<div class="foot"><span>TrucklineMP · 指令末尾 t / T 通用</span><span>发送「菜单t」查看本菜单</span></div>
</div></body></html>`
}

function menuText() {
  const lines = ['📖 TrucklineMP 功能菜单', '━━━━━━━━━━━━']
  for (const [title, items] of SECTIONS) {
    lines.push(`【${title}】`)
    for (const [cmd, desc] of items) lines.push(` · ${cmd} — ${desc}`)
  }
  lines.push('━━━━━━━━━━━━')
  lines.push('（指令末尾 t / T 通用；看本菜单请发送「菜单t」）')
  return lines.join('\n')
}

function apply(ctx, config) {
  // 只注册「菜单t」一个名字，不设裸「菜单」以避免和其它插件撞车
  ctx.command('菜单t', 'TrucklineMP 功能菜单')
    .action(async ({ session }) => {
      if (!session) return
      return deliver(ctx, config, 'menu', menuCard(), menuText())
    })
}

module.exports = { apply, menuCard, menuText }
