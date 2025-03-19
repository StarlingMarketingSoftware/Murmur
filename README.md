# Flock - Next.js 14 Application

A Next.js 14 application with Clerk, Prisma, Tailwind, shadcn, and Stripe.

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in the required environment variables
4. Run the development server:

```bash
npm run dev
```

## Clerk Webhook Setup

To ensure users are created in your database when they sign up with Clerk, follow these steps:

1. Go to your [Clerk Dashboard](https://dashboard.clerk.dev/)
2. Navigate to the "Webhooks" section
3. Create a new webhook with the following settings:
   - URL: `https://your-domain.com/api/webhooks/clerk` (use your actual domain)
   - Events: Select `user.created`
   - Version: Choose the latest version
   - Create a signing secret and copy it
4. Add the signing secret to your `.env` file as `CLERK_WEBHOOK_SECRET`

This webhook will automatically create a user record in your database whenever a new user signs up through Clerk.

## Stripe Webhook Setup

For Stripe subscription functionality, set up a webhook:

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Create a new webhook with the following settings:
   - URL: `https://your-domain.com/api/webhook` (use your actual domain)
   - Events: Select `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `product.created`
   - Create a signing secret and copy it
3. Add the signing secret to your `.env` file as `STRIPE_WEBHOOK_SECRET`
4. For testing locally, use Stripe CLI, instead of ngrok.

   - https://docs.stripe.com/webhooks
   - Run the following command:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   - Keep this terminal running and in a separate terminal, run

   ```bash
   stripe trigger payment_intent.succeeded
   ```

   - Customize the webhook type.
     - checkout.session.completed
     - customer.subscription.created
     - customer.subscription.deleted
     - customer.subscription.updated
   - See full list of webhooks by running:

   ```bash
   stripe trigger
   ```

## Clerk Webhook Setup

1. https://clerk.com/docs/webhooks/sync-data
2. https://dashboard.ngrok.com/get-started/setup/windows
3. ngrok http --url=marmot-modest-prawn.ngrok-free.app 3000
4. Go to https://dashboard.ngrok.com/endpoints to see your url
5. Add /api/webhooks/clerk to this url
6. Test directly via clerk, or use the ngrok url to create a user.

## Features

- Authentication with Clerk
- Subscription management with Stripe
- Database integration with Prisma
- UI components with shadcn/ui
- Responsive design with Tailwind CSS

## Tech Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Clerk**: Authentication with Google OAuth
- **Prisma**: ORM for PostgreSQL
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable UI components
- **Stripe**: Payment processing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/flock.git
cd flock
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

   - Copy `.env.example` to `.env`
   - Update the environment variables with your own values

4. Set up the database:

```bash
npx prisma migrate dev --name init
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/flock?schema=public"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Project Structure

```
flock/
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
├── src/
│   ├── app/              # App Router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── (dashboard)/  # Dashboard pages
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Home page
│   ├── lib/              # Utility functions
│   │   ├── prisma/       # Prisma client
│   │   └── stripe/       # Stripe client
│   └── middleware.ts     # Clerk middleware
├── .env                  # Environment variables
├── next.config.ts        # Next.js configuration
└── package.json          # Dependencies
```

## License

This project is licensed under the MIT License.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
