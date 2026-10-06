// 数据库模型定义（对齐 haulmp-tools 的 database/model 职责）
function model(ctx) {
  // TrucklineMP 账号绑定：把某平台用户与一个 TrucklineMP 用户（handle / webId / uuid）关联
  ctx.model.extend('tlmp_binding', {
    id: 'unsigned',
    platform: 'string',
    userId: 'string',
    // 查询关键字（handle / webId / uuid / SteamID64，用于再次 API 查询）
    key: 'string',
    // TrucklineMP 内部 id（uuid）
    tlmpId: 'string',
    // 站点内 webId（数字）
    webId: 'unsigned',
    handle: 'string',
    displayName: 'string',
    steamId: 'string',
    image: 'string',
    vtcName: 'string',
    boundAt: 'timestamp',
  }, { autoInc: true })
}

module.exports = model
