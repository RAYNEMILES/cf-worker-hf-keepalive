/**
 * Hugging Face Space 保活服务 - 完整版
 * 支持多链接管理、自动保活、RESTful API 和 Web 界面
 * 
 * 功能：
 * - 增删改查 HF Space 链接
 * - 定时自动保活所有链接
 * - Web 界面管理
 * - RESTful API 接口
 * - 保活日志记录
 * - Turnstile 验证
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Turnstile 验证 API
    if (path === '/api/verify') {
      const body = await request.json();
      const token = body.token;
      
      if (!token) {
        return new Response(JSON.stringify({ success: false, error: 'No token' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const formData = new FormData();
      formData.append('secret', env.TURNSTILE_SECRET_KEY);
      formData.append('response', token);
      
      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      });
      
      const outcome = await result.json();
      
      if (outcome.success) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: 'Verification failed' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    try {
      // API 路由
      if (path.startsWith('/api/')) {
        return await handleAPI(request, env);
      }
      
      // Web 界面
      if (path === '/' || path === '/index.html') {
        return await renderWebInterface(env);
      }
      
      // 静态资源
      if (path === '/style.css') {
        return new Response(STYLES, { headers: { 'Content-Type': 'text/css' } });
      }
      
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // 定时保活任务
  async scheduled(event, env, ctx) {
    console.log('⏰ 开始定时保活任务');
    
    try {
      const spaces = await env.DB.prepare('SELECT id, url, name FROM spaces WHERE enabled = 1').all();
      
      if (!spaces.results || spaces.results.length === 0) {
        console.log('📭 没有需要保活的 Space');
        return;
      }
      
      console.log(`📊 开始保活 ${spaces.results.length} 个 Space`);
      
      for (const space of spaces.results) {
        await keepAlive(space.url, space.name, env);
      }
      
      console.log('✅ 定时保活任务完成');
    } catch (error) {
      console.error('❌ 定时保活任务失败:', error);
    }
  }
};

// API 处理
async function handleAPI(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 获取所有 Space
  if (path === '/api/spaces' && method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM spaces ORDER BY created_at DESC').all();
    return new Response(JSON.stringify({ success: true, data: result.results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 添加 Space
  if (path === '/api/spaces' && method === 'POST') {
    const body = await request.json();
    const { url, name, interval } = body;
    
    if (!url || !name) {
      return new Response(JSON.stringify({ success: false, error: 'URL 和名称不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare(
      'INSERT INTO spaces (url, name, interval, enabled) VALUES (?, ?, ?, 1)'
    ).bind(url, name, interval || 30).run();
    
    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 更新 Space
  if (path.match(/^\/api\/spaces\/\d+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    const body = await request.json();
    const { url, name, interval, enabled } = body;
    
    const updates = [];
    const values = [];
    
    if (url !== undefined) { updates.push('url = ?'); values.push(url); }
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (interval !== undefined) { updates.push('interval = ?'); values.push(interval); }
    if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0); }
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({ success: false, error: '没有更新内容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    values.push(id);
    await env.DB.prepare(`UPDATE spaces SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 删除 Space
  if (path.match(/^\/api\/spaces\/\d+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    
    await env.DB.prepare('DELETE FROM spaces WHERE id = ?').bind(id).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 手动触发保活
  if (path === '/api/keepalive' && method === 'POST') {
    const body = await request.json();
    const { id } = body;
    
    if (id) {
      const space = await env.DB.prepare('SELECT * FROM spaces WHERE id = ?').bind(id).first();
      if (!space) {
        return new Response(JSON.stringify({ success: false, error: 'Space 不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await keepAlive(space.url, space.name, env);
    } else {
      const spaces = await env.DB.prepare('SELECT id, url, name FROM spaces WHERE enabled = 1').all();
      for (const space of spaces.results) {
        await keepAlive(space.url, space.name, env);
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取保活日志
  if (path === '/api/logs' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const result = await env.DB.prepare(
      'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all();
    
    return new Response(JSON.stringify({ success: true, data: result.results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ success: false, error: 'Invalid API endpoint' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 保活函数
async function keepAlive(url, name, env) {
  const startTime = Date.now();
  let status = 'success';
  let message = '';
  let httpStatus = 0;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'HuggingFace-Keepalive/2.0 (Cloudflare Workers)',
        'Accept': 'text/html,application/json'
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false
      }
    });
    
    httpStatus = response.status;
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      message = `保活成功 [HTTP ${httpStatus}]`;
      console.log(`✅ ${name}: ${message} (${duration}ms)`);
    } else {
      status = 'error';
      message = `保活失败 [HTTP ${httpStatus}]`;
      console.log(`⚠️ ${name}: ${message} (${duration}ms)`);
    }
  } catch (error) {
    status = 'error';
    message = `保活异常: ${error.message}`;
    console.error(`❌ ${name}: ${message}`);
  }
  
  // 记录日志
  try {
    await env.DB.prepare(
      'INSERT INTO logs (space_id, space_name, status, message, http_status, duration) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, name, status, message, httpStatus, Date.now() - startTime).run();
  } catch (error) {
    console.error('日志记录失败:', error);
  }
}

// Web 界面
async function renderWebInterface(env) {
  const spaces = await env.DB.prepare('SELECT * FROM spaces ORDER BY created_at DESC').all();
  const logs = await env.DB.prepare(
    'SELECT * FROM logs ORDER BY created_at DESC LIMIT 20'
  ).all();
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hugging Face 保活服务</title>
  <link rel="stylesheet" href="/style.css">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <style>
    #verifyPage {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    #verifyPage.show { display: flex; }
    #verifyBox {
      background: white;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      max-width: 400px;
      width: 90%;
    }
    #verifyBox h2 {
      margin-bottom: 20px;
      color: #333;
    }
    #turnstileWidget {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    #verifyStatus {
      margin-top: 12px;
      font-size: 14px;
    }
    #verifyStatus.error { color: #dc3545; }
    #verifyStatus.success { color: #28a745; }
    #mainContent { display: none; }
    #mainContent.show { display: block; }
    #turnstileLoading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      color: #666;
    }
    .turnstile-error {
      color: #dc3545;
      font-size: 14px;
      margin-top: 8px;
    }
    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="verifyPage" class="show">
    <div id="verifyBox">
      <h2>🔐 安全验证</h2>
      <div id="turnstileLoading">
        <div class="loading-spinner"></div>
        <span>加载验证组件...</span>
      </div>
      <div id="turnstileWidget"></div>
      <div id="verifyStatus"></div>
    </div>
  </div>
  
  <div id="mainContent">
    <div class="container">
      <header>
        <h1>🚀 Hugging Face 保活服务</h1>
        <p class="subtitle">管理你的 HF Space，确保服务永不休眠</p>
      </header>
      
      <div class="grid">
        <div class="card">
          <h2>➕ 添加 Space</h2>
          <form id="addForm" class="form">
            <input type="text" id="name" placeholder="名称（如：Crypto Monitor）" required>
            <input type="url" id="url" placeholder="URL（如：https://xxx.hf.space）" required>
            <input type="number" id="interval" placeholder="保活间隔（分钟，默认30）" value="30" min="5">
            <button type="submit">添加</button>
          </form>
        </div>
        
        <div class="card">
          <h2>📊 统计信息</h2>
          <div class="stats">
            <div class="stat-item">
              <span class="stat-value">${spaces.results.length}</span>
              <span class="stat-label">Space 数量</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${spaces.results.filter(s => s.enabled).length}</span>
              <span class="stat-label">启用中</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${logs.results.filter(l => l.status === 'success').length}</span>
              <span class="stat-label">成功次数</span>
            </div>
          </div>
          <button onclick="manualKeepAlive()" class="btn-primary">🔄 手动保活</button>
        </div>
      </div>
      
      <div class="card">
        <h2>📋 Space 列表</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>URL</th>
                <th>间隔</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="spacesTable">
              ${spaces.results.map(space => `
                <tr>
                  <td>${escapeHtml(space.name)}</td>
                  <td><a href="${escapeHtml(space.url)}" target="_blank">${escapeHtml(space.url)}</a></td>
                  <td>${space.interval} 分钟</td>
                  <td>
                    <span class="status ${space.enabled ? 'enabled' : 'disabled'}">
                      ${space.enabled ? '✅ 启用' : '🔇 禁用'}
                    </span>
                  </td>
                  <td>
                    <button onclick="toggleSpace(${space.id}, ${!space.enabled})" class="btn-sm">
                      ${space.enabled ? '禁用' : '启用'}
                    </button>
                    <button onclick="deleteSpace(${space.id})" class="btn-sm btn-danger">删除</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <h2>📝 保活日志</h2>
        <div class="logs" id="logsContainer">
          ${logs.results.map(log => `
            <div class="log-item ${log.status}">
              <span class="log-time">${new Date(log.created_at).toLocaleString('zh-CN')}</span>
              <span class="log-name">${escapeHtml(log.space_name)}</span>
              <span class="log-message">${escapeHtml(log.message)}</span>
              <span class="log-duration">${log.duration}ms</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const TOKEN_KEY = 'hf_keepalive_token';
    const TOKEN_TIME = 'hf_keepalive_time';
    const TOKEN_VALIDITY = 60 * 60 * 1000;
    
    function checkStoredToken() {
      const token = sessionStorage.getItem(TOKEN_KEY);
      const time = sessionStorage.getItem(TOKEN_TIME);
      if (!token || !time) return false;
      if ((Date.now() - parseInt(time)) >= TOKEN_VALIDITY) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_TIME);
        return false;
      }
      return token;
    }
    
    async function init() {
      const main = document.getElementById('mainContent');
      main.classList.add('show');
    }
    
    function initTurnstile() {
      const storedToken = checkStoredToken();
      if (storedToken) {
        init();
        return;
      }
      
      // Timeout fallback
      const timeoutId = setTimeout(() => {
        const loading = document.getElementById('turnstileLoading');
        if (loading && loading.style.display !== 'none') {
          loading.innerHTML = '<div class="turnstile-error">加载超时，可能是网络问题或 sitekey 配置有误</div>';
        }
      }, 10000);
      
      const checkTurnstile = () => {
        if (typeof turnstile !== 'undefined') {
          clearTimeout(timeoutId);
          document.getElementById('turnstileLoading').style.display = 'none';
          turnstile.render('#turnstileWidget', {
            sitekey: '${env.TURNSTILE_SITE_KEY}',
            theme: 'light',
            callback: async function(token) {
              const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
              });
              const data = await res.json();
              
              if (data.success) {
                sessionStorage.setItem(TOKEN_KEY, token);
                sessionStorage.setItem(TOKEN_TIME, Date.now().toString());
                document.getElementById('verifyStatus').className = 'success';
                document.getElementById('verifyStatus').textContent = '✅ 验证成功，正在跳转...';
                setTimeout(() => {
                  document.getElementById('verifyPage').classList.remove('show');
                  init();
                }, 800);
              } else {
                document.getElementById('verifyStatus').className = 'error';
                document.getElementById('verifyStatus').textContent = '❌ 验证失败，请重试';
              }
            },
            'error-callback': function() {
              document.getElementById('verifyStatus').className = 'error';
              document.getElementById('verifyStatus').textContent = '❌ 验证组件加载失败，请刷新页面重试';
            },
            'expired-callback': function() {
              document.getElementById('verifyStatus').className = 'error';
              document.getElementById('verifyStatus').textContent = '⚠️ 验证已过期，请重新验证';
            }
          });
        } else {
          setTimeout(checkTurnstile, 200);
        }
      };
      
      // 手动加载脚本作为备用
      if (typeof turnstile === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      
      checkTurnstile();
    }
    
    async function addSpace(e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const url = document.getElementById('url').value;
      const interval = document.getElementById('interval').value;
      
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, interval })
      });
      
      if ((await res.json()).success) {
        location.reload();
      }
    }
    
    async function toggleSpace(id, enabled) {
      await fetch(\`/api/spaces/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      location.reload();
    }
    
    async function deleteSpace(id) {
      if (!confirm('确定删除此 Space？')) return;
      await fetch(\`/api/spaces/\${id}\`, { method: 'DELETE' });
      location.reload();
    }
    
    async function manualKeepAlive() {
      await fetch('/api/keepalive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      alert('保活任务已触发');
      location.reload();
    }
    
    document.getElementById('addForm').addEventListener('submit', addSpace);
    initTurnstile();
  ` + String.fromCharCode(60) + `/script>
</body>
</html>`;
  
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// CSS 样式
const STYLES = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form input:focus {
  outline: none;
  border-color: #667eea;
}

.form button {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.form button:hover {
  background: #5568d3;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #218838;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background: #f8f9fa;
  font-weight: 600;
}

tr:hover {
  background: #f8f9fa;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status.enabled {
  background: #d4edda;
  color: #155724;
}

.status.disabled {
  background: #f8d7da;
  color: #721c24;
}

.btn-sm {
  padding: 6px 12px;
  margin-right: 4px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: opacity 0.2s;
}

.btn-sm:hover {
  opacity: 0.8;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.logs {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
}

.log-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.success {
  border-left: 3px solid #28a745;
}

.log-item.error {
  border-left: 3px solid #dc3545;
}

.log-time {
  color: #666;
  min-width: 140px;
}

.log-name {
  font-weight: 600;
  min-width: 150px;
}

.log-message {
  flex: 1;
}

.log-duration {
  color: #666;
  min-width: 60px;
  text-align: right;
}

@media (max-width: 768px) {
  header h1 {
    font-size: 1.8rem;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
  
  .stats {
    grid-template-columns: 1fr;
  }
  
  table {
    font-size: 12px;
  }
  
  .log-item {
    flex-direction: column;
    gap: 4px;
  }
}`;
