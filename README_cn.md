# Hugging Face 保活服务 - Cloudflare Workers 版本

一个功能完整的 Hugging Face Space 保活服务，支持多链接管理、自动保活、Web 界面和 RESTful API。

## ✨ 功能特性

- 🔄 **自动保活**：定时自动唤醒所有启用的 HF Space
- 📊 **Web 管理界面**：可视化管理 Space，支持增删改查
- 🔌 **RESTful API**：完整的 API 接口，支持程序化操作
- 📝 **保活日志**：详细记录每次保活的结果和耗时
- ⚙️ **灵活配置**：可自定义每个 Space 的保活间隔
- 🎯 **状态控制**：可随时启用/禁用特定 Space
- 💾 **数据持久化**：使用 Cloudflare D1 数据库存储数据
- 🆓 **完全免费**：基于 Cloudflare Workers 免费额度

## 📋 前置条件

- Cloudflare 账户（免费账户即可）
- Node.js 18+（用于本地开发，可选）
- Wrangler CLI（用于部署，可选）

## 🚀 快速部署

### 方法一：使用 Cloudflare Dashboard 部署（推荐新手）

#### 步骤 1：创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **D1**
3. 点击 **创建数据库**
4. 输入数据库名称：`hf-keepalive-db`
5. 点击 **创建**

#### 步骤 2：初始化数据库表

1. 在刚创建的数据库页面，点击 **控制台**
2. 复制 `schema.sql` 文件的内容
3. 粘贴到控制台输入框中
4. 点击 **执行**
5. 确认表创建成功

#### 步骤 3：创建 Worker

1. 进入 **Workers & Pages** → **创建应用程序** → **创建 Worker**
2. 输入服务名称：`hf-keepalive`
3. 点击 **部署**

#### 步骤 4：部署代码

1. 进入刚创建的 Worker
2. 点击 **编辑代码**
3. 将 `index.js` 的内容粘贴到编辑器中
4. 点击 **部署**

#### 步骤 5：绑定数据库

1. 在 Worker 页面，点击 **设置** → **变量**
2. 在 **D1 数据库绑定** 部分，点击 **添加绑定**
3. 配置：
   - **变量名称**：`DB`
   - **D1 数据库**：选择 `hf-keepalive-db`
4. 点击 **保存并部署**

#### 步骤 6：配置定时触发器

1. 在 Worker 页面，点击 **触发器**
2. 在 **Cron Triggers** 部分，点击 **添加 Cron Trigger**
3. 配置：
   - **名称**：`keepalive-trigger`
   - **调度**：`0 */30 * * *`（每 30 分钟执行一次）
4. 点击 **添加触发器**

#### 步骤 7：完成部署

1. 复制你的 Worker URL（格式：`https://hf-keepalive.你的用户名.workers.dev`）
2. 在浏览器中打开该 URL
3. 开始添加你的 HF Space！

---

### 方法二：使用 Wrangler CLI 部署（推荐开发者）

#### 步骤 1：安装 Wrangler

```bash
npm install -g wrangler
```

#### 步骤 2：登录 Cloudflare

```bash
wrangler login
```

#### 步骤 3：创建 D1 数据库

```bash
wrangler d1 create hf-keepalive-db
```

#### 步骤 4：初始化数据库

```bash
# 替换为你的数据库 ID
wrangler d1 execute hf-keepalive-db --file=schema.sql
```

#### 步骤 5：配置 wrangler.toml

编辑 `wrangler.toml`，将 `your-database-id` 替换为实际的数据库 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "hf-keepalive-db"
database_id = "你的实际数据库ID"
```

#### 步骤 6：部署 Worker

```bash
wrangler deploy
```

#### 步骤 7：配置 Cron Trigger

```bash
wrangler cron schedule "0 */30 * * *"
```

---

## 📖 使用指南

### Web 界面使用

1. **添加 Space**：
   - 在首页表单中输入名称和 URL
   - 设置保活间隔（默认 30 分钟）
   - 点击"添加"按钮

2. **管理 Space**：
   - 查看所有 Space 的状态
   - 启用/禁用特定 Space
   - 删除不需要的 Space

3. **手动保活**：
   - 点击"手动保活"按钮
   - 立即触发所有启用的 Space 保活

4. **查看日志**：
   - 在页面底部查看最近的保活日志
   - 包含时间、状态、耗时等信息

### RESTful API 使用

#### 获取所有 Space

```bash
curl https://hf-keepalive.你的用户名.workers.dev/api/spaces
```

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Crypto Monitor",
      "url": "https://xxx.hf.space",
      "interval": 30,
      "enabled": 1,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 添加 Space

```bash
curl -X POST https://hf-keepalive.你的用户名.workers.dev/api/spaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Space",
    "url": "https://my-space.hf.space",
    "interval": 30
  }'
```

#### 更新 Space

```bash
curl -X PUT https://hf-keepalive.你的用户名.workers.dev/api/spaces/1 \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "interval": 45
  }'
```

#### 删除 Space

```bash
curl -X DELETE https://hf-keepalive.你的用户名.workers.dev/api/spaces/1
```

#### 手动触发保活

```bash
# 保活所有启用的 Space
curl -X POST https://hf-keepalive.你的用户名.workers.dev/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{}'

# 保活特定 Space
curl -X POST https://hf-keepalive.你的用户名.workers.dev/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

#### 获取保活日志

```bash
curl https://hf-keepalive.你的用户名.workers.dev/api/logs?limit=50
```

---

## ⚙️ 配置说明

### Cron 表达式

| 表达式 | 含义 |
|--------|------|
| `0 */30 * * *` | 每 30 分钟执行一次（推荐） |
| `*/20 * * * *` | 每 20 分钟执行一次 |
| `0 */15 * * *` | 每 15 分钟执行一次 |
| `0 */60 * * *` | 每 60 分钟执行一次 |

### 保活间隔

- **最小值**：5 分钟
- **推荐值**：30 分钟
- **最大值**：无限制

> 注意：保活间隔应小于或等于 Cron 触发器的执行间隔。

---

## 📊 数据库结构

### spaces 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | Space 名称 |
| url | TEXT | Space URL |
| interval | INTEGER | 保活间隔（分钟） |
| enabled | INTEGER | 是否启用（0/1） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| space_id | INTEGER | Space ID |
| space_name | TEXT | Space 名称 |
| status | TEXT | 状态（success/error） |
| message | TEXT | 消息 |
| http_status | INTEGER | HTTP 状态码 |
| duration | INTEGER | 耗时（毫秒） |
| created_at | TIMESTAMP | 创建时间 |

---

## 🔧 高级功能

### 批量导入 Space

```bash
# 创建一个 JSON 文件 spaces.json
[
  {"name": "Space 1", "url": "https://space1.hf.space", "interval": 30},
  {"name": "Space 2", "url": "https://space2.hf.space", "interval": 45}
]

# 批量导入
for space in $(cat spaces.json | jq -c '.[]'); do
  curl -X POST https://hf-keepalive.你的用户名.workers.dev/api/spaces \
    -H "Content-Type: application/json" \
    -d "$space"
done
```

### 监控告警

你可以通过检查日志 API 实现监控告警：

```bash
# 获取最近的错误日志
curl https://hf-keepalive.你的用户名.workers.dev/api/logs?limit=100 | \
  jq '.data[] | select(.status == "error")'
```

### 自定义域名

1. 在 Worker 设置中添加自定义域名
2. 配置 DNS 记录指向 Worker
3. 使用自定义域名访问

---

## 📈 免费额度

Cloudflare Workers 免费额度：

| 资源 | 免费额度 | 使用情况 |
|------|----------|----------|
| 每日请求次数 | 100,000 | ✅ 完全够用 |
| CPU 时间 | 10ms/请求 | ✅ 单次请求仅需几毫秒 |
| D1 读取 | 5,000,000/天 | ✅ 完全够用 |
| D1 写入 | 100,000/天 | ✅ 完全够用 |
| 存储 | 5GB | ✅ 足够使用 |

---

## 🐛 故障排查

### 问题：数据库绑定失败

**解决方案**：
1. 确认数据库 ID 正确
2. 检查 Worker 配置中的绑定名称是否为 `DB`
3. 重新部署 Worker

### 问题：保活失败

**解决方案**：
1. 检查 Space URL 是否正确
2. 确认 Space 是否可公开访问
3. 查看日志获取详细错误信息

### 问题：Cron 触发器不执行

**解决方案**：
1. 检查 Cron 表达式格式是否正确
2. 确认触发器已启用
3. 查看 Worker 日志

---

## 📝 注意事项

1. **HTTPS 必须启用**：Hugging Face Space 默认使用 HTTPS，请确保 URL 以 `https://` 开头
2. **避免过于频繁**：建议最小间隔为 10 分钟，过于频繁可能被限制
3. **日志清理**：建议定期清理日志，避免占用过多存储空间
4. **安全性**：不要将 Worker URL 泄露给不信任的人

---

## 🎯 最佳实践

1. **合理设置间隔**：根据 Space 的重要性设置不同的保活间隔
2. **定期检查日志**：及时发现和解决问题
3. **使用自定义域名**：更专业，便于管理
4. **监控资源使用**：关注 Cloudflare 免费额度的使用情况

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📧 联系方式

如有问题，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至 [your-email]

---

## 🌟 Star History

如果这个项目对你有帮助，请给个 Star！⭐
