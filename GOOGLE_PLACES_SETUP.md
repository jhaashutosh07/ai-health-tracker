# Fetch Real Doctors from Google Places API

This guide will help you fetch real doctor data from West Bengal using Google Places API.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account
2. **Google Places API Key**: Follow the steps below to get one

## Step 1: Get Your Google Places API Key

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name it (e.g., "Doctor Finder") and click "Create"

### 1.2 Enable Places API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Places API"
3. Click on it and click "Enable"

### 1.3 Create API Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (you'll need this!)
4. (Optional but recommended) Click "Restrict Key":
   - Under "API restrictions", select "Restrict key"
   - Check "Places API"
   - Click "Save"

### 1.4 Enable Billing (Required)

⚠️ **Important**: Google Places API requires billing to be enabled, but they offer:
- **$200 free credit per month**
- First 1,000 requests are usually free with the credit

To enable billing:
1. Go to "Billing" in Google Cloud Console
2. Link a payment method
3. You won't be charged unless you exceed the free tier

**Cost Estimate for 100 doctors:**
- Nearby Search: ~10 requests × $0.032 = $0.32
- Place Details: ~100 requests × $0.017 = $1.70
- **Total: ~$2.00** (covered by free credit)

## Step 2: Set Your API Key

### Option A: Environment Variable (Recommended)

**Windows (PowerShell):**
```powershell
$env:GOOGLE_PLACES_API_KEY="your_api_key_here"
```

**Windows (Command Prompt):**
```cmd
set GOOGLE_PLACES_API_KEY=your_api_key_here
```

**Linux/Mac:**
```bash
export GOOGLE_PLACES_API_KEY="your_api_key_here"
```

### Option B: Edit the Script Directly

Open `scripts/fetch-doctors-google.ts` and replace:
```typescript
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'YOUR_API_KEY_HERE'
```

With:
```typescript
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'your_actual_api_key_here'
```

## Step 3: Run the Script

```bash
npm run fetch:doctors
```

This will:
1. Search for doctors across 10 major West Bengal cities
2. Fetch details for each doctor (name, address, phone, rating, etc.)
3. Generate two files:
   - `doctors-google-data.json` - Raw data from Google
   - `doctors-seed-format.txt` - Ready to paste into seed.ts

## Step 4: Update Your Seed File

1. Open `doctors-seed-format.txt`
2. Copy the content
3. Open `prisma/seed.ts`
4. Replace the existing `const doctors = [...]` array with the new content
5. Run: `npm run db:seed`

## What the Script Does

The script searches for doctors in these West Bengal cities:
- Kolkata
- Howrah
- Durgapur
- Asansol
- Siliguri
- Bardhaman
- Malda
- Baharampur
- Habra
- Kharagpur

For these specializations:
- General Physician
- Cardiologist
- Pediatrician
- Orthopedic
- Dermatologist
- Gynecologist
- Neurologist
- ENT Specialist
- Ophthalmologist
- Dentist

## Troubleshooting

### Error: "REQUEST_DENIED"
- Make sure Places API is enabled in your Google Cloud project
- Check that your API key is correct
- Verify billing is enabled

### Error: "OVER_QUERY_LIMIT"
- You've exceeded the API quota
- Wait a bit and try again
- The script has delays built-in to avoid this

### Getting Fewer Than 100 Doctors
- Google Places may not have 100+ doctors in all areas
- The script will fetch as many as it can find
- Try adjusting the radius or locations in the script

### "Invalid API Key"
- Double-check you copied the entire key
- Make sure there are no extra spaces
- Verify the key is not restricted to different APIs

## Alternative: Free Option

If you don't want to use Google API, I can generate realistic West Bengal doctor data with:
- Bengali names
- Real West Bengal locations
- Accurate GPS coordinates
- Realistic Indian phone numbers

Just let me know if you'd prefer this option instead!

## Support

If you encounter any issues:
1. Check the error message in the console
2. Verify your API key is set correctly
3. Make sure billing is enabled in Google Cloud
4. Check that you have remaining free credits

---

**Note**: Always keep your API key secure and never commit it to public repositories!
