# 🚀 MovieHub Deployment Guide

## Overview
This guide covers deploying your MovieHub platform using free hosting services.

## Architecture
- **Frontend**: Next.js → Vercel
- **Backend**: Node.js/Express → Railway  
- **Database**: PostgreSQL → Railway

## Prerequisites
- GitHub account
- OMDB API key (free from http://www.omdbapi.com/)
- TMDB API key (free from https://www.themoviedb.org/settings/api)

## Step 1: Prepare Your Repository

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Environment Files**: Use the provided `.env.production` templates

## Step 2: Deploy Backend (Railway)

### 2.1 Setup Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your repository

### 2.2 Configure Backend Service
1. **Root Directory**: Set to `backend`
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`
4. **Port**: Railway auto-detects port 3001

### 2.3 Add PostgreSQL Database
1. In your Railway project, click "Add Service"
2. Select "PostgreSQL"
3. Railway will automatically provide `DATABASE_URL`

### 2.4 Set Environment Variables
Add these in Railway's Variables section:
```
NODE_ENV=production
OMDB_API_KEY=your_omdb_key_here
TMDB_API_KEY=your_tmdb_key_here
JWT_SECRET=your_32_char_secret_here
API_KEY=your_superadmin_key_here
FRONTEND_URL=https://your-app.vercel.app
```

### 2.5 Deploy
Railway will automatically deploy. Note your backend URL (e.g., `https://your-app.railway.app`)

## Step 3: Deploy Frontend (Vercel)

### 3.1 Setup Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Import Project"
4. Select your repository

### 3.2 Configure Frontend
1. **Framework**: Next.js (auto-detected)
2. **Root Directory**: Leave as `/` (project root)
3. **Build Command**: `npm run build` (auto-detected)

### 3.3 Set Environment Variables
Add these in Vercel's Environment Variables:
```
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
NEXT_PUBLIC_APP_NAME=MovieHub
```

### 3.4 Deploy
Vercel will automatically deploy. Your app will be available at `https://your-app.vercel.app`

## Step 4: Database Setup

### 4.1 Run Migrations
1. In Railway, go to your PostgreSQL service
2. Connect via the provided connection string
3. Run the schema from `backend/database/schema.sql`

**Option A: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and connect
railway login
railway connect

# Run migrations
railway run npm run db:migrate
```

**Option B: Direct SQL**
1. Copy content from `backend/database/schema.sql`
2. Execute in Railway's PostgreSQL console

## Step 5: Final Configuration

### 5.1 Update CORS
Ensure your backend allows your Vercel domain:
- Update `FRONTEND_URL` in Railway environment variables
- Use your actual Vercel URL

### 5.2 Test Deployment
1. Visit your Vercel URL
2. Test movie browsing functionality
3. Test admin panel at `/admin` with your API key

## Step 6: Custom Domain (Optional)

### 6.1 Frontend Domain
1. In Vercel, go to your project settings
2. Add your custom domain
3. Configure DNS records as instructed

### 6.2 Backend Domain
1. In Railway, go to your service settings
2. Add custom domain
3. Update `NEXT_PUBLIC_API_URL` in Vercel

## Monitoring & Maintenance

### Free Tier Limits
- **Railway**: $5 credit/month (usually sufficient)
- **Vercel**: 100GB bandwidth, unlimited builds
- **PostgreSQL**: Included with Railway

### Monitoring
- Railway provides built-in metrics
- Vercel provides analytics dashboard
- Check logs in both platforms for issues

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check `FRONTEND_URL` in backend env vars
2. **Database Connection**: Verify `DATABASE_URL` in Railway
3. **API Keys**: Ensure OMDB/TMDB keys are valid
4. **Build Failures**: Check Node.js version compatibility

### Logs
- **Railway**: View in service dashboard
- **Vercel**: View in function logs section

## Alternative Deployment Options

### Option B: Render + Supabase
- **Backend**: Render (free tier with sleep)
- **Database**: Supabase (500MB free)
- **Frontend**: Vercel

### Option C: Heroku Alternative
- **Backend**: Fly.io or Render
- **Database**: PlanetScale (MySQL)
- **Frontend**: Netlify or Vercel

## Security Checklist

- [ ] Environment variables set correctly
- [ ] API keys not exposed in frontend
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Database credentials secure

## Support

For deployment issues:
- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Check platform status pages for outages