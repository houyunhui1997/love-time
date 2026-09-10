# 测试库初始化与数据创建顺序

当前开发阶段不使用任何演示种子数据。清空数据库后，所有业务记录都由真实用户操作按需创建。

## 一、重置测试数据

在 uniCloud Web 控制台依次清空以下集合的数据（保留集合和 Schema）：

1. `moments`
2. `anniversaries`
3. `love-profiles`
4. `uni-id-log`
5. `uni-id-users`

如需完全重置头像测试文件，可另外清理云存储中的 `user/avatar/` 与 `partner/avatar/`。这一步不会影响数据库结构。

## 二、上传当前数据库结构

在 HBuilderX 的 `uniCloud-aliyun/database` 目录中上传以下 Schema：

- `uni-id-users.schema.json`
- `uni-id-log.schema.json`
- `love-profiles.schema.json`
- `anniversaries.schema.json`
- `moments.schema.json`
- `media-assets.schema.json`（需要上传图片或视频时使用）

建议在云控制台给 `love-profiles.ownerUid` 建立唯一索引，保证每个账号最多只有一份恋爱档案。

## 三、上传云对象

上传并部署：

- `uni-id-co`
- `profile-co`
- `anniversary-co`
- `moment-co`
- 公共模块 `love-common`

更新 `profile-co` 后应选择“上传部署”，确保云端不再执行旧版默认数据逻辑。

## 四、正常的数据创建顺序

### 1. 微信静默登录

小程序首次打开时调用 `uni-id-co.loginByWeixin`，根据 OpenID 自动恢复或创建 `uni-id-users` 账号。该过程不读取微信头像、昵称、手机号等资料，也不要求用户填写表单。

用户后续主动完善账号资料时，`profile-co.saveLoginProfile` 只补充以下字段：

- `nickname`
- `avatar`
- `gender`

此时 `love-profiles` 必须仍然为空。

### 2. 建立恋爱档案

用户进入“建立恋爱档案”页面，填写：

- 我的称呼
- 对方称呼
- 在一起日期
- 对方头像（选填）

保存后调用 `profile-co.saveLoveProfile`，首次创建 `love-profiles`。这份档案仅归当前账号所有；不填写档案也可以正常使用纪念日与时光记录。

### 3. 创建业务数据

- 用户添加纪念日时创建 `anniversaries`。
- 用户发布时光记录时创建 `moments`。
- 不创建任何默认纪念日或默认时光记录。

## 五、初始化验收

按以下顺序检查：

1. 清空后打开小程序，应通过 OpenID 自动建立服务端身份，无需登录弹窗。
2. 静默登录后，`uni-id-users` 应有一条账号记录，`love-profiles` 应为零条。
3. 首页可直接添加纪念日；未填写档案时只显示非强制引导，不得阻断使用或填充假数据。
4. 完成恋爱档案表单后，`love-profiles` 应新增一条记录，首页按填写日期计算相伴天数。
5. 从“我的 → 恋爱资料”修改后，首页和我的页面应在再次显示时读取最新数据。

## 六、禁止的初始化行为

- 查询接口不得创建数据。
- 静默登录接口不得创建恋爱档案。
- 前端不得使用虚构姓名、虚构日期或固定相伴天数作为登录态兜底。
- 恋爱档案不存在时应使用可跳过的引导状态，不使用假数据填充页面。
