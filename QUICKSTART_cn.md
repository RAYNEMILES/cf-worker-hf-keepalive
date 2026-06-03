# 快速开始指南

## 5 分钟快速部署

### 步骤 1：创建数据库（2 分钟）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **D1** → **创建数据库**
3. 名称输入：`hf-keepalive-db` → **创建**
4. 点击 **控制台**，粘贴 `schema.sql` 内容 → **执行**

### 步骤 2：创建 Worker（2 分钟）

1. 进入 **Workers & Pages** → **创建应用程序** → **创建 Worker**
2. 名称输入：`hf-keepalive` → **部署**
3. 点击 **编辑代码**，粘贴 `index.js` 内容 → **部署**

### 步骤 3：绑定数据库（1 分钟）

1. Worker 页面 → **设置** → **变量**
2. **D1 数据库绑定** → **添加绑定**
3. 变量名称：`DB`，数据库：选择 `hf-keepalive-db`
4. **保存并部署**

### 步骤 4：配置定时器（1 分钟）

1. Worker 页面 → **触发器**
2. **Cron Triggers** → **添加 Cron Trigger**
3. 调度：`0 */30 * * *` → **添加触发器**

### 完成！🎉

访问你的 Worker URL 开始使用！

---

## API 快速参考

### 添加 Space
```bash
curl -X POST https://你的worker.workers.dev/api/spaces \
  -H "Content-Type: application/json" \
  -d '{"name":"我的Space","url":"https://xxx.hf.space","interval":30}'
```

### 获取所有 Space
```bash
curl https://你的worker.workers.dev/api/spaces
```

### 删除 Space
```bash
curl -X DELETE https://你的worker.workers.dev/api/spaces/1
```

### 手动保活
```bash
curl -X POST https://你的worker.workers.dev/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 常见问题

**Q: 如何获取我的 Worker URL？**
A: 在 Worker 页面顶部可以看到，格式为 `https://hf-keepalive.你的用户名.workers.dev`

**Q: 如何修改保活间隔？**
A: 在 Web 界面中编辑 Space，或通过 API 更新 `interval` 字段

**Q: 为什么保活失败？**
A: 检查 Space URL 是否正确，确认 Space 可公开访问，查看日志获取详细信息

**Q: 可以添加多少个 Space？**
A: 没有限制，但建议不超过 100 个以保持性能

---

## 下一步

- 查看 [README.md](README.md) 了解完整功能
- 自定义 Cron 表达式调整保活频率
- 配置自定义域名
- 集成监控告警
