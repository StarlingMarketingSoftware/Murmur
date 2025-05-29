# Murmur

AI-powered marketing automation platform that helps you create, manage, and optimize your email campaigns effortlessly.

## Initial Setup

- Install Node version 20 or above. Using nvm (Node Version Manager) is recommended in case you eventually having to handle multiple versions locally for different applications.
- In the folder where you want to clone the repo, run `git clone https://github.com/StarlingMarketingSoftware/Murmur.git`
- cd into the murmur folder.
- Get localhost environment variables from a team member and paste it into .env file in the root directory.
- Run `npm i` to install packages.
- Install PostgreSQL https://www.postgresql.org/download/ and create a new database.
- Make sure that the POSTGRES_PRISMA_URL environment variable matches the user, password, host, port information of the database you just created.
- Run `npx prisma migrate dev`
- Run `npx prisma db seed` Requires .csv file with contact seed information to be in the /public folder. Ask a team member.
- Run `npm run dev` and access the server on localhost:3000.
- Make sure the Clerk webhook is running, and create a user in the application. If you have an existing user on Clerk and are installing on a new computer, copy the user data from the old computer's local database for consistency.
- The local database can be managed using Prisma Studio `npx prisma studio` or with your preferred database manager, such as DBeaver or pgAdmin.
- If working from China, your VPN must be configured as follows:
  - Use Astrill's StealthVPN or similar VPN with protocol/port selection
  - Configure to use TCP protocol instead of UDP for more reliable connection
  - Try different ports (443, 8443, 80) if experiencing connection issues
  - Connect to servers in nearby countries (Japan, South Korea, Singapore) for better latency
  - Test API connectivity before starting development work

## Vercel

- Staging and other preview deployments are protected by Vercel authentication. The user must be logged into the Starling Vercel account to access these deployments.
- It is possible to get around this authentication with a URL param for webhooks as follows: https://staging.murmurpro.com?x-vercel-protection-bypass=VERCEL_AUTOMATION_BYPASS_SECRET
- This key can be found in /settings/deployment-protection VERCEL_AUTOMATION_BYPASS_SECRET. It is necessary to append this to the URL for any webhooks that need access to preview environments.
- Staging database: https://console.neon.tech/app/projects/crimson-leaf-81578145/branches/br-red-bonus-a4v2bw9y/tables?database=neondb

## Stripe

- For each deployment, in order for users to be able to use "Manage Your Subscription" button, the Stripe billing portal must be set up via /settings/billing/portal https://dashboard.stripe.com/test/settings/billing/portal. Products you want to be displayed must be manually added.

### Stripe Webhook Setup

For Stripe subscription functionality, set up a webhook:

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Create a new webhook with the following settings:
   - URL: `https://your-domain.com/api/webhook` (use your actual domain)
   - Events: Select `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
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
3. Run localhost on port 3000 (npm run dev).
4. There is a static url set up on ngrok which forwards clerk webhooks to a static url https://marmot-modest-prawn.ngrok-free.app | the static url remains active without the tunnel, but you may have to run `ngrok http --url=marmot-modest-prawn.ngrok-free.app 3000` again if the url expires.
5. The api URL is therefore https://marmot-modest-prawn.ngrok-free.app/api/webhooks/clerk
6. Test directly via clerk or on localhost:3000. localhost:3000 works because this connects to Clerk, then Clerk sends the webhook to the ngrok static url.

## Versioning

Murmur uses Semantic Versioning (SemVer) – (MAJOR.MINOR.PATCH). In this system:

- A major version change (e.g., 9.x → 10.0) happens when there are backward-incompatible changes.
- A minor version change (e.g., 9.4 → 9.5) includes new features but remains backward-compatible.
- A patch version change (e.g., 9.4.1 → 9.4.2) contains bug fixes and security updates.

## License

This project is licensed under the MIT License.
