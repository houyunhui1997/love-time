# 云对象开发状态

## 已完成

- `love-common`：统一响应、业务错误和基础字符串校验。
- `system-co`：无需登录的 `ping()` 健康检查，用于验证客户端与当前 uniCloud 服务空间是否真正连通。
- `profile-co`：恋爱档案读写（getMine / saveLoginProfile）。
- `anniversary-co`：纪念日增删改查（list / detail / create / update / remove，乐观锁 revision）。
- `moment-co`：时光轴时刻增删改查（list 按月筛选 / detail / create / update / remove，乐观锁 revision）。

## 下一阶段

- `couple-co`：情侣关系绑定。
- `reminder-co`：提醒推送。
- `account-co`：账号与数据管理。

不要在 uni-id 尚未配置完成时，通过客户端传入 UID 模拟登录。这样会导致越权漏洞。

