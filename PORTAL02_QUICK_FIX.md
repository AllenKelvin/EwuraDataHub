# Portal-02 Quick Reference - 5 Minute Fix

**Based on Partner's Troubleshooting Guide**

---

## 🚨 If Orders Aren't Updating Status:

### Most Likely (80% of cases): Missing BACKEND_URL on Render

**Fix in 2 minutes:**

1. Go to: https://dashboard.render.com
2. Select service: `allen-data-hub-api`
3. Click **Environment** tab
4. Search for `BACKEND_URL`
5. If missing or shows `localhost`:
   - Add/Update: `BACKEND_URL` = `https://ewura-hub-api.onrender.com`
   - Set dropdown to: **Runtime** 
   - Click "Save Changes"
   - Click **Restart Instance** button
   - Wait 2-3 minutes

---

## 🔧 Quick Test Commands

### Test 1: Verify Environment (via SSH)
```bash
env | grep BACKEND_URL
# Should show: BACKEND_URL=https://ewura-hub-api.onrender.com
```

### Test 2: Check Webhook Endpoint
```bash
curl https://ewura-hub-api.onrender.com/api/vendor/webhook \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"data": {"event": "order.status.updated", "orderId": "test_id", "status": "delivered"}}'
  
# Should return: {"received":true}
```

### Test 3: Check Render Logs
```
Go to Render Dashboard → Logs tab → Search for: [Portal02]
```

---

## ✅ The Checklist (Before Contacting Support)

- [ ] `BACKEND_URL` is set to `https://ewura-hub-api.onrender.com` (not localhost)
- [ ] `BACKEND_URL` scope is "Runtime"
- [ ] Service has been restarted
- [ ] No [Portal02] errors in Render logs
- [ ] Webhook test returns 200 OK

---

## 📞 Support Contact Info

**For Portal-02 API issues:** Portal-02 support at https://portal-02.com  
**Include:** Your API key (first/last 8 chars), webhook URL, test order reference

