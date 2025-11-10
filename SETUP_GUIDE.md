# Quick Setup Guide

## Step-by-Step Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
- Install PostgreSQL on your machine
- Create a new database:
```sql
CREATE DATABASE symptom_checker;
```
- Update DATABASE_URL in .env with your credentials

**Option B: Neon (Free Cloud PostgreSQL)**
1. Visit [neon.tech](https://neon.tech)
2. Sign up for free
3. Create a new project
4. Copy the connection string
5. Paste into .env as DATABASE_URL

**Option C: Supabase**
1. Visit [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string (Direct Connection)
5. Paste into .env as DATABASE_URL

### 3. Get OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy and add to .env as OPENAI_API_KEY

**Note**: You'll need to add billing information to OpenAI. GPT-4 costs:
- GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
- For testing: Start with $5-10 credit

### 4. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
DATABASE_URL="postgresql://user:password@host:5432/symptom_checker"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
OPENAI_API_KEY="sk-..."

# Optional (for full functionality)
EMAIL_FROM="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"
TWILIO_ACCOUNT_SID="your-sid"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

**Generate NEXTAUTH_SECRET**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 5. Set Up Email (Optional but Recommended)

**Gmail Setup**:
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account > Security > App Passwords
3. Generate a new app password
4. Use this password in EMAIL_PASSWORD

### 6. Set Up SMS (Optional)

**Twilio Setup**:
1. Visit [twilio.com](https://twilio.com)
2. Sign up for free trial ($15 credit)
3. Get a phone number
4. Copy Account SID, Auth Token, and Phone Number
5. Add to .env

### 7. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) View database
npx prisma studio
```

### 8. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Testing the Application

### Create Test Accounts

1. **Register as Patient**:
   - Go to http://localhost:3000/auth/register
   - Fill in details
   - Select "Patient" role

2. **Register as Doctor**:
   - Create another account
   - Select "Doctor" role

### Test Symptom Checker

1. Login as patient
2. Click "Check Symptoms"
3. Describe symptoms (e.g., "I have a headache and fever for 2 days")
4. Follow the AI conversation
5. Get assessment
6. Book appointment

### Test Doctor Dashboard

1. Logout
2. Login as doctor
3. Go to http://localhost:3000/doctor/dashboard
4. View appointments
5. Confirm/complete appointments

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Reset database
npx prisma db push --force-reset
```

### OpenAI API Errors
- Check API key is valid
- Ensure billing is set up
- Check quota/rate limits

### Email Not Sending
- Verify Gmail app password
- Check email in .env matches Gmail account
- Test with console.log to see errors

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database Migration

For production, use proper migrations:

```bash
# Create migration
npx prisma migrate dev --name init

# Apply to production
npx prisma migrate deploy
```

## Common Issues

**"Module not found" errors**:
```bash
npm install
```

**Prisma Client errors**:
```bash
npx prisma generate
```

**Session errors**:
- Ensure NEXTAUTH_SECRET is set
- Clear browser cookies

**API rate limits**:
- OpenAI: Upgrade plan or wait
- Twilio: Upgrade from trial

## Need Help?

- Check console for errors
- Review .env file
- Check database connection
- Verify API keys
- Review README.md

## Quick Start Commands

```bash
# Full setup from scratch
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma generate
npx prisma db push
npm run dev
```

Happy coding! 🚀
