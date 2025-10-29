# AI Document Assistant

A modern document management and AI-powered assistant application built with Next.js, NextAuth.js, and Prisma.

## Features

- 🔐 **Authentication**: Google OAuth and email/password authentication
- 🤖 **AI Chat**: Intelligent document assistant with template generation
- 📄 **Document Management**: Create, read, and manage documents
- 🎨 **Modern UI**: Beautiful interface built with Tailwind CSS and shadcn/ui
- 💾 **Database**: PostgreSQL with Prisma ORM

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Google OAuth credentials

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd document-assistant
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables (see `.env.example` for a complete reference):

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Google Analytics (Public)
# This value is embedded in the client bundle, do not store secrets here.
NEXT_PUBLIC_GA_ID=G-884EFRLQ06
```

### 3. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

#### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required information:
   - App name: `AI Document Assistant`
   - User support email: Your email
   - Developer contact information: Your email

#### Step 3: Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure the following:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://yourdomain.com (for production)
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
https://yourdomain.com/api/auth/callback/google (for production)
```

#### Step 4: Get Your Credentials
1. Copy the **Client ID** and **Client Secret**
2. Add them to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id-here
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
   ```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) View your database
npx prisma studio
```

### 5. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Google OAuth Redirect URLs

### For Development:
```
http://localhost:3000/api/auth/callback/google
```

### For Production:
```
https://yourdomain.com/api/auth/callback/google
```

**Important Notes:**
- The redirect URL must match exactly what you configure in Google Cloud Console
- NextAuth.js automatically handles the `/api/auth/callback/google` endpoint
- Make sure to update `NEXTAUTH_URL` in your environment variables for production

## Project Structure

```
├── app/
│   ├── api/auth/          # NextAuth.js API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application pages
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   └── dashboard/         # Dashboard-specific components
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
├── prisma/
│   └── schema.prisma     # Database schema
└── .env                  # Environment variables
```

## Authentication Flow

1. **Google OAuth**: Users can sign in with their Google account
2. **Email/Password**: Traditional authentication with encrypted passwords
3. **Session Management**: JWT-based sessions with NextAuth.js
4. **Database Integration**: User data stored in PostgreSQL via Prisma

## Features Overview

### Dashboard
- Document management interface
- AI chat assistant
- User profile and settings

### AI Chat
- Template-based document generation
- Interactive chat interface
- Document file responses with download/preview

### Document Creation
- Form-based document templates
- Integration with AI chat for generation
- Multiple document types support

## Troubleshooting

### Google OAuth Issues
1. **Invalid redirect URI**: Ensure the redirect URL in Google Console matches exactly
2. **Client ID not found**: Verify your environment variables are loaded correctly
3. **Consent screen not configured**: Complete the OAuth consent screen setup

### Database Issues
1. **Connection failed**: Check your DATABASE_URL format and credentials
2. **Migration errors**: Run `npx prisma db push` to sync your schema

### Development Issues
1. **Environment variables not loaded**: Restart your development server
2. **Build errors**: Run `npm run build` to check for TypeScript errors
3. **Analytics not tracking**: Ensure `NEXT_PUBLIC_GA_ID` is set locally (`.env`) and on Vercel (Project Settings → Environment Variables), then redeploy.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and build
5. Submit a pull request

## License

This project is licensed under the MIT License.