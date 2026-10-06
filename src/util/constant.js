// TrucklineMP 平台地址与共享常量（对齐 haulmp-tools / ets2-tools-tmp 的 util/constant 职责）

// ⚠️ 必须使用 api 子域：官网 trucklinemp.com 有 Cloudflare 人机校验，直连一律 403
const API_BASE = 'https://api.trucklinemp.com'
const SITE = 'https://trucklinemp.com'
const DOCS = 'https://docs.trucklinemp.com/web-api/public-api/doc'

const FONT = '"Segoe UI","Droid Sans Fallback","Noto Sans CJK SC","Microsoft YaHei","DejaVu Sans",sans-serif'

const GAME_ZH = { ets2: '欧卡2', ats: '美卡' }
const COMPANY_TYPE_ZH = { trucking: '货运', coach: '客运' }

const ROLE_ZH = {
  owner: '队长',
  director: '董事',
  manager: '经理',
  staff: '管理',
  driver: '司机',
  recruit: '新兵',
  member: '成员',
}

const TIER_ZH = {
  standard: '标准',
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
  elite: '精英',
  legend: '传奇',
}

const CATEGORY_ZH = {
  convoy: '联运',
  race: '竞速',
  truckfest: '卡车节',
  charity: '慈善',
  training: '培训',
  meeting: '会议',
  special: '特别活动',
  other: '其他',
}

const SEVERITY_ZH = { temporary: '临时', permanent: '永久', warning: '警告' }
const SCOPE_ZH = { game: '游戏内', website: '网站', event: '活动', vtc: '车队' }

const LANGUAGE_ZH = {
  en: '英语', pt: '葡萄牙语', de: '德语', fr: '法语', es: '西班牙语',
  it: '意大利语', pl: '波兰语', nl: '荷兰语', tr: '土耳其语', ru: '俄语',
  zh: '中文', 'pt-br': '葡萄牙语(巴西)', cs: '捷克语', sv: '瑞典语', da: '丹麦语',
  fi: '芬兰语', hu: '匈牙利语', ro: '罗马尼亚语', el: '希腊语', bg: '保加利亚语',
  uk: '乌克兰语', ja: '日语', ko: '韩语',
}

module.exports = {
  API_BASE, SITE, DOCS, FONT,
  GAME_ZH, COMPANY_TYPE_ZH, ROLE_ZH, TIER_ZH, CATEGORY_ZH,
  SEVERITY_ZH, SCOPE_ZH, LANGUAGE_ZH,
}
