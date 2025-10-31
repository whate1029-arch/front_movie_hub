# 🚀 Simple Deployment Guide - MovieHub Frontend Only

This guide covers deploying **just the Next.js frontend** (what you're currently using).

## ✅ What You're Deploying

- Next.js frontend that calls TMDB and OMDb APIs directly
- No database or backend required
- **100% FREE** hosting on Vercel

---

## 📋 Pre-Deployment Checklist

### 1. Clean Up Files

**Remove these from your project before deployment:**
```bash
# Delete build artifacts
rm -rf .next
rm -rf node_modules
rm tsconfig.tsbuildinfo

# Keep these files secure (already in .gitignore)
# .env.local (never commit this!)
```

### 2. Files You MUST Have

```
✅ pages/              (all your pages)
✅ components/         (all components)
✅ lib/               (API utilities)
✅ styles/            (CSS files)
✅ types/             (TypeScript types)
✅ next.config.js
✅ package.json
✅ tsconfig.json
✅ .env.example       (template for others)
```

### 3. Files to EXCLUDE (Optional Backend)

If you're NOT deploying the backend, you can:
- Delete the `backend/` folder entirely, OR
- Keep it but it won't be deployed (Vercel ignores it)

---

## 🌐 Deploy to Vercel (Recommended - FREE)

### Step 1: Push to GitHub

```bash
# Initialize git if not done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for deployment"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/moviehub.git
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANT:** Make sure `.env.local` is NOT pushed to GitHub!

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (free)
3. Click **"Add New Project"**
4. Select your **moviehub** repository
5. Vercel auto-detects Next.js - click **"Deploy"**

### Step 3: Add Environment Variables

In Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```
TMDB_API_KEY=6880980303d37b5e0490843b91373314
NEXT_PUBLIC_TMDB_API_KEY=6880980303d37b5e0490843b91373314
OMDB_API_KEY=98d7bf72
NEXT_PUBLIC_OMDB_API_KEY=98d7bf72
NODE_ENV=production
```

3. Set for: **Production**, **Preview**, **Development**
4. Click **Save**

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **"Redeploy"** to apply environment variables
3. Your app will be live at: `https://your-project.vercel.app`

---

## 🎯 Alternative Free Platforms

### Option B: Netlify

1. Go to [netlify.com](https://netlify.com)
2. **New site from Git** → Select your repo
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
4. Add same environment variables
5. Deploy!

### Option C: Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project** → Connect to Git
3. Framework preset: **Next.js**
4. Add environment variables
5. Deploy!

---

## 🧪 Test Production Build Locally

Before deploying, test the production build:

```bash
# Build for production
npm run build

# Start production server
npm start

# Test at http://localhost:3000
```

If it works locally, it will work on Vercel!

---

## 🔧 Common Issues & Fixes

### Issue 1: Build Fails - TypeScript Errors

**Fix:**
```bash
# Run type check locally
npx tsc --noEmit

# Fix all errors before deploying
```

### Issue 2: Images Not Loading

**Fix:** Check `next.config.js` has correct image domains:
```javascript
remotePatterns: [
  { protocol: 'https', hostname: 'image.tmdb.org' },
  { protocol: 'https', hostname: 'm.media-amazon.com' },
]
```

### Issue 3: API Key Not Working

**Fix:**
- Ensure environment variables are set in Vercel
- Variable names must match exactly
- Redeploy after adding variables

### Issue 4: Search Not Working

**Fix:**
- Check browser console for errors
- Verify TMDB API key is valid
- Check API rate limits (1000 requests/day on free tier)

---

## 📊 Performance Optimizations

### 1. Enable Image Optimization

Already configured in `next.config.js`:
```javascript
images: {
  formats: ['image/avif', 'image/webp'],
}
```

### 2. Add Caching Headers

Vercel automatically adds optimal caching headers for:
- Static pages
- Images
- CSS/JS bundles

### 3. Monitor Performance

Vercel provides:
- **Analytics** (free tier: 100k events/month)
- **Speed Insights**
- **Web Vitals** monitoring

Enable in: Dashboard → **Analytics**

---

## 🔒 Security Checklist

Before going live:

- [ ] `.env.local` is in `.gitignore` and NOT committed
- [ ] API keys are set in Vercel (not hardcoded)
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] Security headers configured (check `vercel.json`)
- [ ] No sensitive data in frontend code

---

## 📈 Post-Deployment

### Get Your Custom Domain

1. In Vercel: **Settings** → **Domains**
2. Add custom domain (e.g., `moviehub.com`)
3. Update DNS records as instructed
4. SSL certificate auto-configured!

### Monitor Your App

**Vercel Dashboard shows:**
- Deployment history
- Real-time logs
- Performance metrics
- Error tracking

### Update Your App

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys from GitHub!
```

---

## 💰 Cost Breakdown (100% FREE)

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| **Vercel Hosting** | 100GB bandwidth | $0 |
| **TMDB API** | 1000 requests/day | $0 |
| **OMDb API** | 1000 requests/day | $0 |
| **SSL Certificate** | Automatic | $0 |
| **Custom Domain** | Supported | $0* |
| **TOTAL** | | **$0** |

*Domain registration separate (~$10/year)

---

## 🆘 Need Help?

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **Deployment Issues:** Check Vercel build logs

---

## 🎉 You're Live!

Your MovieHub is now deployed at:
- **Vercel URL:** `https://your-project.vercel.app`
- **Custom Domain:** `https://your-domain.com` (optional)

Share it with the world! 🌍
