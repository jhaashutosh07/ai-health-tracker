# 🚀 Deployment Guide - Vercel + Vercel Postgres

This guide will walk you through deploying your AI-Powered Job Tracker to Vercel with PostgreSQL.

## Prerequisites

- [x] GitHub account
- [x] Vercel account (sign up at https://vercel.com)
- [x] All environment variables from `.env` file

## Step 1: Push to GitHub

1. **Initialize Git repository** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - ready for deployment"
```

2. **Create a new GitHub repository**:
   - Go to https://github.com/new
   - Name it (e.g., "ai-health-tracker")
   - Don't initialize with README (we already have code)
   - Click "Create repository"

3. **Push your code**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Vercel Project

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Import your GitHub repository**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Build Settings**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (leave as default)
   - Build Command: Leave default (`next build`)
   - Output Directory: Leave default (`.next`)

4. **Don't deploy yet** - click "Cancel" or go back
   - We need to set up the database first

## Step 3: Create Vercel Postgres Database

1. **In your Vercel project dashboard**:
   - Go to "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose a name (e.g., "health-tracker-db")
   - Select region (closest to your users)
   - Click "Create"

2. **Wait for database creation** (~1 minute)

3. **Database environment variables will be automatically added**:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` (use this as DATABASE_URL)
   - `POSTGRES_URL_NON_POOLING` (use this as DIRECT_URL)

## Step 4: Configure Environment Variables

1. **Go to your Vercel project**:
   - Settings → Environment Variables

2. **Add the following variables** (use values from your `.env` file):

### Required Variables:

```env
# Database (automatically set by Vercel Postgres - verify they exist)
DATABASE_URL=<from Vercel Postgres - use POSTGRES_PRISMA_URL>
DIRECT_URL=<from Vercel Postgres - use POSTGRES_URL_NON_POOLING>

# NextAuth Configuration
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=<generate new: openssl rand -base64 32>

# Google OAuth (same from .env or create production credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Google Maps API (mark as public/exposed)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Optional Variables:
```env
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Important Notes:**
- For `NEXTAUTH_SECRET`: Generate a new one with `openssl rand -base64 32`
- For `NEXTAUTH_URL`: Use your actual Vercel deployment URL
- For `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Mark it as "Exposed to all branches"
- For Google OAuth: Update authorized redirect URIs in Google Console:
  - Add: `https://your-app-name.vercel.app/api/auth/callback/google`

## Step 5: Update Google OAuth Settings

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-app-name.vercel.app/api/auth/callback/google
   ```
5. Click **Save**

## Step 6: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to your project in Vercel
2. Click "Deployments"
3. Click "Deploy"
4. Wait for build to complete

### Option B: Deploy via Git Push

1. Push to your main branch:
```bash
git push origin main
```

2. Vercel will automatically deploy

## Step 7: Run Database Migrations

After first deployment:

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Link your project**:
```bash
vercel link
```

4. **Pull environment variables**:
```bash
vercel env pull .env.production
```

5. **Run migrations**:
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

Or use Vercel's built-in terminal:
- Go to your project → Settings → General
- Scroll to "Project Settings"
- Use the terminal to run migrations

## Step 8: Seed Production Database

1. **Connect to production database**:
```bash
# Use the DATABASE_URL from Vercel
export DATABASE_URL="<your-production-database-url>"
```

2. **Run seed script**:
```bash
npm run db:seed
```

Or use Vercel's SQL editor:
- Go to Storage → Your Database → Data → SQL Editor
- Run seed queries manually if needed

## Step 9: Update NEXTAUTH_URL

After deployment, update the `NEXTAUTH_URL` environment variable:

1. Copy your deployment URL (e.g., `https://your-app-name.vercel.app`)
2. Go to Settings → Environment Variables
3. Update `NEXTAUTH_URL` with your actual URL
4. Redeploy the project

## Step 10: Test Your Deployment

1. **Visit your deployed app**: https://your-app-name.vercel.app
2. **Test functionality**:
   - ✅ User registration/login
   - ✅ Google OAuth sign-in
   - ✅ Find doctors (location-based search)
   - ✅ Symptom checker (AI chat)
   - ✅ Book appointments
   - ✅ Upload medical records
   - ✅ View medical history

## Post-Deployment Checklist

- [ ] Custom domain setup (optional)
- [ ] Enable automatic deployments on push
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Configure CORS if using external APIs
- [ ] Enable error tracking (Sentry integration)
- [ ] Set up backup strategy for database
- [ ] Configure CDN for static assets
- [ ] Enable Web Analytics
- [ ] Set up logging (Vercel Logs)

## Common Issues & Solutions

### Issue: Database connection errors
**Solution**: Check that `DATABASE_URL` and `DIRECT_URL` are correctly set from Vercel Postgres

### Issue: NextAuth errors
**Solution**:
- Verify `NEXTAUTH_URL` matches your deployment URL
- Check `NEXTAUTH_SECRET` is set correctly
- Update Google OAuth redirect URIs

### Issue: Build fails with Prisma errors
**Solution**:
- Ensure `prisma generate` runs before build
- Check that schema.prisma uses `postgresql` provider

### Issue: API routes timeout
**Solution**:
- Vercel serverless functions have a 10s timeout on free tier
- Consider upgrading or optimizing long-running operations

### Issue: Environment variables not working
**Solution**:
- Redeploy after adding/changing environment variables
- For `NEXT_PUBLIC_*` variables, they must start with `NEXT_PUBLIC_`

## Monitoring & Maintenance

1. **View Logs**: Vercel Dashboard → Your Project → Logs
2. **Monitor Performance**: Vercel Dashboard → Analytics
3. **Database Management**: Vercel Dashboard → Storage → Your Database
4. **Automatic Deployments**: Push to `main` branch = auto-deploy

## Updating Your Deployment

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main

# Vercel will automatically deploy
```

## Rolling Back

If something goes wrong:
1. Go to Vercel Dashboard → Deployments
2. Find a previous working deployment
3. Click "..." → "Promote to Production"

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Quick Commands Reference

```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Pull environment variables
vercel env pull

# Run migrations on production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# View production database
npx prisma studio
```

---

🎉 **Congratulations!** Your AI-Powered Health Tracker is now live on Vercel!
