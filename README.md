# Hugging Face Keepalive Service - Cloudflare Workers

A fully-featured Hugging Face Space keepalive service that supports multiple links management, automatic keepalive, web interface, and RESTful API.

## ✨ Features

- 🔄 **Automatic Keepalive**：Automatically wake up all enabled HF Spaces on schedule
- 📊 **Web Management Interface**：Visually manage Spaces with CRUD operations
- 🔌 **RESTful API**：Complete API interface for programmatic operations
- 📝 **Keepalive Logs**：Detailed logging of every keepalive attempt and duration
- ⚙️ **Flexible Configuration**：Customize keepalive intervals per Space
- 🎯 **Status Control**：Enable/disable specific Spaces anytime
- 💾 **Data Persistence**：Data stored in Cloudflare D1 database
- 🆓 **Completely Free**：Built on Cloudflare Workers free tier

## 📋 Prerequisites

- Cloudflare account (free tier works)
- Node.js 18+ (for local development, optional)
- Wrangler CLI (for deployment, optional)

## 🚀 Quick Deployment

### Method 1: Deploy via Cloudflare Dashboard (Recommended for Beginners)

#### Step 1: Create D1 Database

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **D1**
3. Click **Create Database**
4. Enter database name: `hf-keepalive-db`
5. Click **Create**

#### Step 2: Initialize Database Tables

1. On the newly created database page, click **Console**
2. Copy contents from `schema.sql`
3. Paste into the console input
4. Click **Run**
5. Confirm table creation is successful

#### Step 3: Create Worker

1. Go to **Workers & Pages** → **Create Application** → **Create Worker**
2. Enter service name: `hf-keepalive`
3. Click **Deploy**

#### Step 4: Deploy Code

1. Go to the newly created Worker
2. Click **Edit Code**
3. Paste contents from `index.js` into the editor
4. Click **Deploy**

#### Step 5: Bind Database

1. On Worker page, click **Settings** → **Variables**
2. In the **D1 Database Bindings** section, click **Add Binding**
3. Configure:
   - **Variable Name**：`DB`
   - **D1 Database**：Select `hf-keepalive-db`
4. Click **Save and Deploy**

#### Step 6: Configure Cron Trigger

1. On Worker page, click **Triggers**
2. In the **Cron Triggers** section, click **Add Cron Trigger**
3. Configure:
   - **Name**：`keepalive-trigger`
   - **Schedule**：`0 */30 * * *` (every 30 minutes)
4. Click **Add Trigger**

#### Step 7: Complete Deployment

1. Copy your Worker URL (format: `https://hf-keepalive.your-username.workers.dev`)
2. Open the URL in your browser
3. Start adding your HF Spaces!

---

### Method 2: Deploy via Wrangler CLI (Recommended for Developers)

#### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

#### Step 2: Log in to Cloudflare

```bash
wrangler login
```

#### Step 3: Create D1 Database

```bash
wrangler d1 create hf-keepalive-db
```

#### Step 4: Initialize Database

```bash
# Replace with your database ID
wrangler d1 execute hf-keepalive-db --file=schema.sql
```

#### Step 5: Configure wrangler.toml

Edit `wrangler.toml`, replace `your-database-id` with your actual database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hf-keepalive-db"
database_id = "your-actual-database-id"
```

#### Step 6: Deploy Worker

```bash
wrangler deploy
```

#### Step 7: Configure Cron Trigger

```bash
wrangler cron schedule "0 */30 * * *"
```

---

## 📖 Usage Guide

### Using the Web Interface

1. **Add a Space**：
   - Enter name and URL in the homepage form
   - Set keepalive interval (default 30 minutes)
   - Click "Add" button

2. **Manage Spaces**：
   - View status of all Spaces
   - Enable/disable specific Spaces
   - Delete unwanted Spaces

3. **Manual Keepalive**：
   - Click "Manual Keepalive" button
   - Immediately trigger keepalive for all enabled Spaces

4. **View Logs**：
   - View recent keepalive logs at the bottom of the page
   - Includes timestamp, status, duration, etc.

### Using the RESTful API

#### Get All Spaces

```bash
curl https://hf-keepalive.your-username.workers.dev/api/spaces
```

Response:
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

#### Add a Space

```bash
curl -X POST https://hf-keepalive.your-username.workers.dev/api/spaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Space",
    "url": "https://my-space.hf.space",
    "interval": 30
  }'
```

#### Update a Space

```bash
curl -X PUT https://hf-keepalive.your-username.workers.dev/api/spaces/1 \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "interval": 45
  }'
```

#### Delete a Space

```bash
curl -X DELETE https://hf-keepalive.your-username.workers.dev/api/spaces/1
```

#### Trigger Keepalive Manually

```bash
# Keepalive all enabled Spaces
curl -X POST https://hf-keepalive.your-username.workers.dev/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{}'

# Keepalive a specific Space
curl -X POST https://hf-keepalive.your-username.workers.dev/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

#### Get Keepalive Logs

```bash
curl https://hf-keepalive.your-username.workers.dev/api/logs?limit=50
```

---

## ⚙️ Configuration

### Cron Expression

| Expression | Meaning |
|------------|---------|
| `0 */30 * * *` | Every 30 minutes (recommended) |
| `*/20 * * * *` | Every 20 minutes |
| `0 */15 * * *` | Every 15 minutes |
| `0 */60 * * *` | Every 60 minutes |

### Keepalive Interval

- **Minimum**：5 minutes
- **Recommended**：30 minutes
- **Maximum**：Unlimited

> Note：Keepalive interval should be less than or equal to the Cron trigger interval.

---

## 📊 Database Schema

### spaces Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| name | TEXT | Space name |
| url | TEXT | Space URL |
| interval | INTEGER | Keepalive interval (minutes) |
| enabled | INTEGER | Enabled status (0/1) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Update time |

### logs Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| space_id | INTEGER | Space ID |
| space_name | TEXT | Space name |
| status | TEXT | Status (success/error) |
| message | TEXT | Message |
| http_status | INTEGER | HTTP status code |
| duration | INTEGER | Duration (milliseconds) |
| created_at | TIMESTAMP | Creation time |

---

## 🔧 Advanced Features

### Bulk Import Spaces

```bash
# Create a JSON file spaces.json
[
  {"name": "Space 1", "url": "https://space1.hf.space", "interval": 30},
  {"name": "Space 2", "url": "https://space2.hf.space", "interval": 45}
]

# Bulk import
for space in $(cat spaces.json | jq -c '.[]'); do
  curl -X POST https://hf-keepalive.your-username.workers.dev/api/spaces \
    -H "Content-Type: application/json" \
    -d "$space"
done
```

### Monitoring & Alerts

You can implement monitoring alerts by checking the logs API:

```bash
# Get recent error logs
curl https://hf-keepalive.your-username.workers.dev/api/logs?limit=100 | \
  jq '.data[] | select(.status == "error")'
```

### Custom Domain

1. Add custom domain in Worker settings
2. Configure DNS record pointing to Worker
3. Access via custom domain

---

## 📈 Free Tier Limits

Cloudflare Workers free tier:

| Resource | Free Limit | Usage |
|----------|------------|-------|
| Daily Requests | 100,000 | ✅ More than enough |
| CPU Time | 10ms/request | ✅ Only takes a few ms |
| D1 Reads | 5,000,000/day | ✅ More than enough |
| D1 Writes | 100,000/day | ✅ More than enough |
| Storage | 5GB | ✅ Sufficient |

---

## 🐛 Troubleshooting

### Issue: Database Binding Failed

**Solution**：
1. Confirm database ID is correct
2. Check that binding name in Worker config is `DB`
3. Redeploy Worker

### Issue: Keepalive Failing

**Solution**：
1. Check if Space URL is correct
2. Confirm Space is publicly accessible
3. Check logs for detailed error info

### Issue: Cron Trigger Not Executing

**Solution**：
1. Check that Cron expression format is correct
2. Confirm trigger is enabled
3. Check Worker logs

---

## 📝 Notes

1. **HTTPS Required**：Hugging Face Spaces use HTTPS by default, ensure URL starts with `https://`
2. **Avoid Over-frequent**：Minimum interval of 10 minutes recommended, too frequent may be rate-limited
3. **Log Cleanup**：Periodically clean up logs to avoid excessive storage
4. **Security**：Do not share Worker URL with untrusted parties

---

## 🎯 Best Practices

1. **Reasonable Intervals**：Set different intervals based on Space importance
2. **Regular Log Checks**：Detect and resolve issues early
3. **Use Custom Domain**：More professional and easier to manage
4. **Monitor Usage**：Keep an eye on Cloudflare free tier usage

---

## 📄 License

MIT License

---

## 🤝 Contributing

Issues and Pull Requests welcome!

---

## 📧 Contact

For questions, reach out via:
- Submit GitHub Issue
- Email: [your-email]

---

## 🌟 Star History

If this project helps you, please give it a Star! ⭐
