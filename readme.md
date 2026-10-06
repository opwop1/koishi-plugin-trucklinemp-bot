# koishi-plugin-trucklinemp-bot

[![npm](https://img.shields.io/npm/v/koishi-plugin-trucklinemp-bot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-trucklinemp-bot)

欧卡 TrucklineMP 联机平台信息查询机器人（车队 / 玩家 / 活动 / 服务器 / 统计）。

数据来自 TrucklineMP 公共 API：`https://api.trucklinemp.com`（**只读**）。

## 指令（末尾 `t` / `T` 通用）

| 分类 | 指令 | 说明 |
| --- | --- | --- |
| 账号 | `绑定t [ID]` / `我的绑定t` / `解绑t` | 绑定 TrucklineMP 账号（handle / WebID / SteamID / 官网链接） |
| 查询 | `查询t [@群友\|名字\|ID]` | 玩家资料卡：车队 / 职位 / 社交链接 / 在线状态 |
| 查询 | `车队t [名字\|ID]` | 车队搜索与详情（等级 / 成员 / 简介 / 联系方式）；不填参数展示活跃车队榜 |
| 查询 | `车队成员t [ID]` | 车队成员名单 |
| 查询 | `招募t [ID]` | 车队招募要求与申请表 |
| 排行 | `车队排行t [sort]` | 车队榜（members 默认 / activity / newest） |
| 排行 | `排行t` | 全站游玩时长排行榜 + 每日活跃曲线 |
| 平台 | `服务器t` | 实时服务器状态与在线人数 |
| 平台 | `服务器曲线t [range]` | 人口曲线（24h / 7d / 30d / 90d / all）+ 历史峰值 |
| 平台 | `统计t` | 平台总量 / 增长 / 每日注册 / 管理动态 |
| 平台 | `版本t` | API 版本与平台运行状态 |
| 内容 | `活动t [upcoming\|past] [关键字]` | 活动列表 |
| 内容 | `活动详情t [ID]` | 活动详情 + 规划路线 + 联合主办 |
| 内容 | `新闻t` | 官方新闻 |
| 内容 | `封禁t [关键字]` | 公开封禁记录 |
| 内容 | `合作伙伴t` / `规则t` | 平台合作伙伴 / 规则链接 |
| — | `菜单t` | 功能菜单 |

## 配置项

| 项 | 说明 |
| --- | --- |
| `apiBase` | API 根地址，默认 `https://api.trucklinemp.com` |
| `apiKeys` | 开发者 API Key（`tlmp_api_...`），**可填多把**。获取地址：<https://trucklinemp.com/developer/keys> |
| `allowAnonymous` | 所有 Key 都限速时是否回退匿名请求，默认 `true`（匿名额度独立于 Key） |
| `output.*` | 每个功能的输出方式：`image`（默认，图片卡片）/ `text`（纯文本） |

### 多 Key 轮换（为什么可以填多把）

平台限速**按 Key（token）计，不按来源 IP** —— 同一 IP 同一时刻，一把 Key 已 429 时另一把仍可正常请求。
因此每把 Key 各自有 **120 次/小时** 的额度，**多填几把即可线性扩容**。

插件会自动轮换：

- 启动时把配置的 Key 全部载入 Key 池，请求时按序轮转使用；
- 某把 Key 命中 429 → 自动标记冷却、**切换下一把**，当前请求继续，用户无感；
- 某把接近额度（本地软阈值 110 次）→ 优先换别的 Key；
- **所有** Key 都在冷却 → 直接短路失败（不再空发请求白白浪费额度），并给出最早的恢复时间；
- 若 `allowAnonymous` 为真，全部 Key 冷却时会回退到匿名额度再撑一会儿。

> 获取 Key：<https://trucklinemp.com/developer/keys>（免费注册开发者账号即可创建）。

## 注意事项

- **必须使用 `api.trucklinemp.com`**：官网 `trucklinemp.com` 有 Cloudflare 人机校验，直连返回 403。
- **限速：每把 Key 每小时 120 次**（`/rate-limits` 自报的 1000/分钟并不准确）。插件已内置较长的结果缓存来节省配额，
  并会在命中限速时提示「约 X 后恢复」；配置多把 Key 可成倍提升可用额度。
- 平台**没有**个人里程 / 行驶记录 / 足迹类接口，本插件因此定位为「社区查询」，不做里程绑定。
- 已知接口缺陷（插件已规避）：`/stats/players/leaderboard?limit=` 与 `/stats/players/daily-active?days=`
  会返回 400 参数校验失败，故这两个端点一律不传参、使用默认值。
- `/stats/servers/history` 目前返回空数组（平台尚未积累历史数据），`服务器曲线t` 会显示空状态提示。

## 预览

`preview/` 目录下为各指令的实际渲染效果图。

## License

MIT
