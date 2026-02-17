# Murmur

AI-powered marketing automation platform that helps you create, manage, and optimize your email campaigns effortlessly.

## Initial Setup

- Install Node version 20 or above. Using nvm (Node Version Manager) is recommended in case you eventually have to handle multiple versions locally for different applications.
- In the folder where you want to clone the repo, run `git clone https://github.com/StarlingMarketingSoftware/Murmur.git`
- cd into the murmur folder.
- Get localhost environment variables from a team member and paste it into .env file in the root directory.
- Run `npm i` to install packages.
- Install Docker Desktop https://www.docker.com/products/docker-desktop/
- Make sure Docker is running, and in your terminal for the repo, run `docker-compose up -d` to create and start a Docker container with PostgreSQL and Elastic Search vector databases.
- Run `npx prisma migrate dev` to apply all database migrations.
- Run `npx prisma db seed` Requires .csv file with contact seed information to be in the /public folder. Ask a team member.
- Run `npm run dev` and access the server on localhost:3000.
- If you don't have a Clerk user created for local Development, make sure the Clerk webhook is running, and create a user in the application. If you have an existing user on Clerk and are setting up local development environment on a new computer, copy the user data from the old computer's local database for consistency. Your newly created user can be added to the seed.ts file for quick setup on new computers and in cases where database reset is necessary (create a new branch for this change).
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
- For testing subscription payments use Stripe's designated testing credit card numbers: https://docs.stripe.com/testing

### Stripe Webhook Setup

For Stripe subscription functionality, set up a webhook:

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Create a new webhook with the following settings:
   - URL: `https://your-domain.com/api/webhook` (use your actual domain)
   - Events: Select `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
   - Create a signing secret and copy it
3. Add the signing secret to your `.env` file as `STRIPE_WEBHOOK_SECRET`
4. For testing locally, install and use the Stripe CLI (https://docs.stripe.com/stripe-cli?install-method=homebrew), instead of ngrok.

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

   - If the Stripe CLI API key has expired, run `stripe login` and authenticate via browser.

5. For testing Klarna payments, reference these docs: https://docs.stripe.com/payments/klarna/accept-a-payment?platform=web&ui=API&country=united-states#testmode-guide

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

## PR Checklist

- Create a branch based on an issue.
-
- run `npm run build`
- Have your PR reviewed by Github Copilot.
- Request a review from a team member before merging.

## Code Style

- When possible, write descriptions of functions in the following style:

````/**
 * Extracts email addresses from transformed contacts
 */
export function extractEmailsFromContacts(contacts: Partial<Contact>[]): string[] {
	return contacts
		.map((contact) => contact.email)
		.filter((email): email is string => email !== null && email !== undefined);
}```
````

## Git Branching Workflow

### main/production branch (current production code)

- Only contains released, production-ready code
- Hotfixes are merged here

### develop branch (integration branch)

- Where feature branches merge for testing
- Your main development baseline

###feature/your-feature branch (your long-running feature)

- Create this off develop
- Work here for several weeks
- Regularly merge develop into this to stay current

### hotfix/xxx branches (for production fixes)

- Created from main
- After fixing, merge to both main and develop

### Database Migrations

- Renaming: Avoid migrations when possible when renaming a field is required. For example:

```
message String?  @db.Text
```

- Can be renamed to:

```
fullAiPrompt String?  @map("message") @db.Text
```

- By using @map without running any migrations.

### Local Scripts

- Create a .tsx file in the scripts folder following the format of export-embeddings.tsx.
- Run with `npx tsx scripts/export-embeddings.tsx`
- US map state geometry is derived from `public/geo/us-states.geojson`.
- If you update that source GeoJSON, run `npm run preprocess-geo` to regenerate the derived files in `public/geo/`.
- `npm run build` and `npm run vercel-build` run this preprocessing step automatically.

### Generating Seed Data for Local Vector Embeddings

- If you don't need to generate new vector embeddings, just run 'npx prisma db seed'. If you have a new list of contacts to embed, follow the next steps:
- Prepare a .csv of contacts.
- Seed only the contacts (comment out the line that seeds embeddings)
- Call POST /api/vector-search/generate-embeddings
- Run /scripts/export-embeddings.tsx `npx tsx scripts/export-embeddings.tsx`
- Paste the generated .txt file's contents to /prisma/seed-data/contactEmbeddings1.ts and contactEmbeddings2.ts. The reason the files are split is to avoid the 100MB limit per file for Github.
- 'docker compose down -v' to reset postgres and elastic search databases.
- If you only want to reset the vector db, run `curl.exe -X DELETE "http://localhost:9200/contacts"`
- 'docker compose up -d' to get fresh databases running.
- Migrate and run all seed functions 'npx prisma migrate dev'

## Testing API Endpoints with Postman

- Use this guide to generate a token for Clerk authentication: https://clerk.com/docs/testing/postman-or-insomnia

## Comprehensive Testing Guide

### Subscriptions

- Subscription renewal for each tier
- Subscription cancellation for each tier
- Subscription initial signup for each tier
- Subscription switch: The next subscription should begin immediately, and credits should be replaced with the new tier's credits (not cumulative)

### Not logged in users

- Can they send from the contact from
- What happens when they try to sign up for a subscription.
- What happens when they try to search for a contact?
