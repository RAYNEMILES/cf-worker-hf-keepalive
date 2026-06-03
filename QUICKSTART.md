# Quick Start Guide

## 5-Minute Fast Deployment

### Step 1: Create Database (2 minutes)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **D1** → **Create Database**
3. Enter name: `hf-keepalive-db` → **Create**
4. Click **Console**, paste `schema.sql` contents → **Run**

### Step 2: Create Worker (2 minutes)

1. Go to **Workers & Pages** → **Create Application** → **Create Worker**
2. Enter name: `hf-keepalive` → **Deploy**
3. Click **Edit Code**, paste `index.js` contents → **Deploy**

### Step 3: Bind Database (1 minute)

1. Worker page → **Settings** → **Variables**
2. **D1 Database Bindings** → **Add Binding**
3. Variable name: `DB`, Database: select `hf-keepalive-db`
4. **Save and Deploy**

### Step 4: Configure Cron Trigger (1 minute)

1. Worker page → **Triggers**
2. **Cron Triggers** → **Add Cron Trigger**
3. Schedule: `0 */30 * * *` → **Add Trigger**

### Done! 🎉

Visit your Worker URL to start using!

---

## API Quick Reference

### Add Space
```bash
curl -X POST https://your-worker.workers.dev/api/spaces \
  -H "Content-Type: application/json" \
  -d '{"name":"My Space","url":"https://xxx.hf.space","interval":30}'
```

### Get All Spaces
```bash
curl https://your-worker.workers.dev/api/spaces
```

### Delete Space
```bash
curl -X DELETE https://your-worker.workers.dev/api/spaces/1
```

### Manual Keepalive
```bash
curl -X POST https://your-worker.workers.dev/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## FAQ

**Q: How do I get my Worker URL?**
A: You can see it at the top of the Worker page, format `https://hf-keepalive.your-username.workers.dev`

**Q: How do I change the keepalive interval?**
A: Edit the Space in the web interface, or update the `interval` field via API

**Q: Why is keepalive failing?**
A: Check if Space URL is correct, confirm Space is publicly accessible, check logs for detailed info

**Q: How many Spaces can I add?**
A: No limit, but recommend under 100 for performance

---

## Next Steps

- Check [README.md](README.md) for full features
- Customize Cron expression to adjust keepalive frequency
- Configure custom domain
- Integrate monitoring & alerts
