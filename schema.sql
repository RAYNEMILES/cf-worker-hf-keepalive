-- Hugging Face 保活服务数据库初始化脚本
-- 使用方法：在 Cloudflare Workers Dashboard 中创建 D1 数据库，然后执行此脚本

-- 创建 spaces 表（存储 HF Space 信息）
CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval INTEGER DEFAULT 30,
  enabled INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建 logs 表（存储保活日志）
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER,
  space_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  http_status INTEGER,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_spaces_enabled ON spaces(enabled);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_space_id ON logs(space_id);

-- 插入示例数据（可选）
INSERT INTO spaces (name, url, interval, enabled) VALUES 
  ('示例 Space', 'https://example.hf.space', 30, 1);