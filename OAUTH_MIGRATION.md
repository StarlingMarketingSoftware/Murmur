# OAuth Migration Guide

This document explains how we migrated from a custom password-based authentication system to Google OAuth using NextAuth.js.

## Changes Made

1. **Installed Required Packages**
   - NextAuth.js
   - Prisma adapter for NextAuth

2. **Updated Prisma Schema**
   - Added NextAuth-specific models (Account, Session, VerificationToken)
   - Made passwordHash optional in the User model
   - Added emailVerified and image fields to User model

3. **Created NextAuth API Route**
   - Set up the NextAuth handler at `/api/auth/[...nextauth]/route.ts`
   - Configured Google as the only authentication provider
   - Added callbacks to handle team creation for new users

4. **Updated Authentication Middleware**
   - Replaced custom middleware with NextAuth-based middleware
   - Protected dashboard routes
   - Redirected authenticated users away from auth pages

5. **Created New Sign-In Page**
   - Removed password-based login form
   - Added Google OAuth sign-in button
   - Handled authentication errors

6. **Updated Session Management**
   - Replaced custom JWT-based session with NextAuth sessions
   - Updated session utilities to use NextAuth
   - Kept stubs of old functions for backward compatibility

7. **Added Session Provider**
   - Created a SessionProvider component
   - Updated root layout to use the SessionProvider

8. **Updated User Interface**
   - Added sign-out button to dashboard
   - Displayed user information from session

## How to Use

1. Set up Google OAuth credentials in the Google Cloud Console
2. Add the credentials to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_key
   ```
3. Run the application and sign in with Google

## Benefits

- More secure authentication (no password storage)
- Simpler user experience (one-click sign-in)
- Reduced development overhead (no password reset flows)
- Access to user profile information from Google
- Built-in session management

## Potential Future Improvements

- Add additional OAuth providers (GitHub, Microsoft, etc.)
- Implement email verification
- Add account linking
- Enhance user profile with information from OAuth providers 