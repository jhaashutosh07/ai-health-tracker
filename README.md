# AI-Based Symptom Checker + Appointment Booking System

A comprehensive HealthTech solution that combines AI-powered symptom analysis with intelligent appointment booking, designed to improve healthcare accessibility in underserved areas.

## Features

### Core Functionality
- **AI Symptom Checker**: Interactive chat interface powered by OpenAI GPT-4 for symptom analysis
- **Severity Assessment**: Automatic evaluation of symptom severity (LOW, MEDIUM, HIGH, CRITICAL)
- **Smart Recommendations**: AI-driven suggestions for self-care, doctor visits, urgent care, or emergency services
- **Appointment Booking**: Schedule online or offline consultations based on severity
- **Multi-user Support**: Separate dashboards for patients and doctors
- **Medical History Tracking**: Comprehensive patient health records
- **Automated Notifications**: Email and SMS confirmations for appointments

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 API
- **Notifications**: Nodemailer (Email), Twilio (SMS)
- **Authentication**: NextAuth.js with credentials provider

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── auth/                     # Authentication pages
│   │   ├── signin/               # Sign in page
│   │   └── register/             # Registration page
│   ├── dashboard/                # Patient dashboard
│   ├── doctor/                   # Doctor dashboard
│   ├── symptom-check/            # Symptom checker interface
│   ├── appointments/             # Appointment management
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── providers.tsx             # Session provider
├── components/                   # React components
│   └── SymptomChat.tsx          # AI chat interface
├── lib/                          # Utilities
│   ├── prisma.ts                # Prisma client
│   ├── openai.ts                # OpenAI configuration
│   ├── notifications.ts          # Email/SMS services
│   └── utils.ts                 # Helper functions
├── pages/api/                    # API routes
│   ├── auth/                     # Authentication APIs
│   ├── symptom-check/            # Symptom checker APIs
│   ├── appointments/             # Appointment APIs
│   └── doctor/                   # Doctor APIs
├── prisma/                       # Database
│   └── schema.prisma            # Database schema
└── types/                        # TypeScript types
    └── next-auth.d.ts           # NextAuth type definitions
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key
- (Optional) Twilio account for SMS
- (Optional) Email service (Gmail, SendGrid, etc.)

### Installation

1. **Clone and Install Dependencies**
```bash
npm install
```

2. **Set Up Environment Variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/symptom_checker?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Email (Gmail example)
EMAIL_FROM="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Twilio (Optional - for SMS)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

3. **Set Up Database**

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

4. **Run Development Server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Usage Guide

### For Patients

1. **Register**: Create an account as a Patient
2. **Check Symptoms**:
   - Go to "Check Symptoms" from dashboard
   - Chat with AI assistant about your symptoms
   - Receive severity assessment and recommendations
3. **Book Appointment**:
   - After symptom check, book an appointment if recommended
   - Choose online or in-person consultation
   - Select date and time
   - Receive email/SMS confirmation
4. **Track History**: View all appointments and past symptom checks

### For Doctors

1. **Register**: Create an account as a Doctor
2. **View Appointments**: Access all scheduled appointments
3. **Review Patient Data**:
   - View AI symptom assessments
   - Check patient symptoms and severity
   - Review patient contact information
4. **Manage Appointments**:
   - Confirm pending appointments
   - Mark appointments as completed
   - Cancel if necessary

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Symptom Checker
- `POST /api/symptom-check/chat` - Chat with AI symptom checker

### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments/create` - Create new appointment
- `POST /api/appointments/send-notification` - Send appointment notification

### Doctor
- `GET /api/doctor/appointments` - Get doctor's appointments
- `PATCH /api/doctor/appointments` - Update appointment status

## Database Schema

### Key Models
- **User**: Patient and doctor accounts with role-based access
- **SymptomLog**: AI symptom analysis records with severity
- **Appointment**: Appointment bookings with status tracking
- **MedicalHistory**: Patient medical history records
- **Doctor**: Doctor profiles with specializations

## Features Breakdown

### AI Symptom Analysis
The system uses GPT-4 to:
- Ask clarifying questions about symptoms
- Assess severity on a 4-level scale
- Suggest possible conditions (not diagnose)
- Recommend appropriate action level
- Generate comprehensive reports

### Severity Levels
- **LOW**: Self-care recommendations
- **MEDIUM**: See doctor within a few days
- **HIGH**: Urgent care recommended
- **CRITICAL**: Emergency room immediately

### Notification System
Automated notifications sent for:
- Appointment confirmations
- Appointment reminders
- Status updates

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Database Hosting
- **Neon**: Free PostgreSQL hosting
- **Supabase**: PostgreSQL with additional features
- **Railway**: Simple PostgreSQL deployment

## Security Considerations

- Passwords hashed with bcryptjs
- Session-based authentication with NextAuth.js
- Role-based access control (Patient/Doctor/Admin)
- API route protection with middleware
- Environment variables for sensitive data
- HTTPS recommended for production

## Future Enhancements

- [ ] Integration with Infermedica API for medical accuracy
- [ ] Video consultation feature for online appointments
- [ ] Prescription management
- [ ] Lab report uploads
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Insurance integration
- [ ] Payment processing

## Contributing

This is an open-source project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for learning and development.

## Disclaimer

**IMPORTANT**: This system is for educational and demonstration purposes. It should NOT replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical concerns.

## Support

For issues and questions:
- Open an issue on GitHub
- Check documentation
- Review API logs for errors

## Acknowledgments

- OpenAI for GPT-4 API
- Next.js team for the amazing framework
- Prisma for the excellent ORM
- All contributors and users

---

Built with ❤️ for improving healthcare accessibility
