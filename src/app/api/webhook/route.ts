import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();
  const signature = headersList.get("Stripe-Signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  switch (event.type) {
    case "checkout.session.completed":
      if (session.mode === "subscription") {
        try {
          // Get the subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Get the product details
          const product = await prisma.product.findUnique({
            where: {
              stripeProductId: subscription.items.data[0].price.product as string,
            },
          });

          if (!product) {
            return new NextResponse("Product not found", { status: 404 });
          }

          // Create a new subscription in the database
          await prisma.subscription.create({
            data: {
              userId: session.metadata?.userId as string,
              productId: product.id,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer as string,
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        } catch (error) {
          console.error("Error processing subscription:", error);
          return new NextResponse("Error processing subscription", { status: 500 });
        }
      }
      break;
    case "customer.subscription.updated":
      try {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update the subscription in the database
        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
      } catch (error) {
        console.error("Error updating subscription:", error);
        return new NextResponse("Error updating subscription", { status: 500 });
      }
      break;
    case "customer.subscription.deleted":
      try {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Delete the subscription from the database
        await prisma.subscription.delete({
          where: {
            stripeSubscriptionId: subscription.id,
          },
        });
      } catch (error) {
        console.error("Error deleting subscription:", error);
        return new NextResponse("Error deleting subscription", { status: 500 });
      }
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 