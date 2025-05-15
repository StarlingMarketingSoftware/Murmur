# Murmur

AI-powered marketing automation platform that helps you create, manage, and optimize your email campaigns effortlessly.

## Stripe Webhook Setup

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
