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
3. Run the ngrok tunnel: ngrok http --url=marmot-modest-prawn.ngrok-free.app 3000
4. The static url is https://marmot-modest-prawn.ngrok-free.app | the static url remains active without the tunnel, once it's set up once.
5. The api URL is therefore https://marmot-modest-prawn.ngrok-free.app/api/webhooks/clerk
6. Test directly via clerk, or use the ngrok url to create a user.
7. When you create a user using the UI, you use localhost:3000 because this connects to Clerk, then Clerk sends the webhook to the ngrok api.

## Stripe Management

- The billing portal settings can be found here: https://dashboard.stripe.com/settings/billing/portal
- This is where customers can manage their existing subscription.

## License

This project is licensed under the MIT License.
