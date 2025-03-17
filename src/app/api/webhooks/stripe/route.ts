import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: Request) {
  console.log('Received webhook for stripe!!!');
  
  const body = await req.text();
  const headersList = await headers();

  const signature = headersList.get("stripe-signature") || "";
  console.log("🚀 ~ POST ~ signature:", signature)

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process subscription checkouts
      if (session.mode === "subscription") {
        // Get the subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Get the product details from your database
        const product = await prisma.product.findUnique({
          where: {
            stripeProductId: subscription.items.data[0].price.product as string,
          },
        });

        if (!product) {
          console.error("Product not found in database");
          return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Get the user ID from the session metadata
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error("User ID not found in session metadata");
          return NextResponse.json({ error: "User ID not found" }, { status: 400 });
        }

        // Create a new subscription in the database
        const newSubscription = await prisma.subscription.create({
          data: {
            userId: userId,
            productId: product.id,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        console.log(`Subscription created: ${newSubscription.id}`);
      }
    } else if (event.type === "customer.subscription.updated") {
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

      console.log(`Subscription updated: ${subscription.id}`);
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Delete the subscription from the database
      await prisma.subscription.delete({
        where: {
          stripeSubscriptionId: subscription.id,
        },
      });

      console.log(`Subscription deleted: ${subscription.id}`);
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 
