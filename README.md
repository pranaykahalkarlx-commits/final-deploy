# AI Receptionist Server

## Deploy on Railway — Exact Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "fresh deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-receptionist-server.git
git push -u origin main
```

### 2. Deploy on Railway
1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select your repo → Railway auto-detects Node.js

### 3. Set Environment Variables
In Railway → your service → Variables tab, add:
- RESEND_API_KEY = re_xxxxxxxxxxxx
- FROM_EMAIL = onboarding@resend.dev  (use this if you haven't verified a domain on Resend)

### 4. Generate Domain
Railway → your service → Settings → Networking → Generate Domain

### 5. Test
Visit: https://YOUR-DOMAIN.up.railway.app
Should show: {"status":"ok","message":"AI Receptionist Server is running ✅"}

### 6. Update your frontend
In index.html find:
  const WORKER_URL = "..."
Replace with your Railway URL.
