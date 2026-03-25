import stripe from "stripe";
import { Subscription, FREE_PLAN } from "./subscription.model";
import { SubscriptionPrice } from "./subscriptionPrice.model";
import { User } from "../user/user.model";
import type { Buffer } from "buffer";
export class PaymentService {
     static SECRET_KEY: string;
     static Stripe: stripe;

     static {
          if (!process.env.STRIPE_SECRET_KEY) {
               throw new Error(
                    "Stripe secret key not found in environment variables",
               );
          }
          PaymentService.SECRET_KEY = process.env.STRIPE_SECRET_KEY;
          PaymentService.Stripe = new stripe(PaymentService.SECRET_KEY);
     }

     static async createSessionURL(userId: string, priceId: string) {
          const FRONTEND_URL: string = process.env.FRONTEND_URL!;
          const priceRecord = await SubscriptionPrice.findOne({ priceId }).populate('subscriptionId');
          if (!priceRecord) {
               throw new Error("Price not found");
          }
          const Plan: any = priceRecord.subscriptionId;
          if (!Plan) {
               throw new Error("Plan not found");
          }
          const PlanName: string = Plan.planName;
          if (!PlanName) {
               throw new Error("Plan name not found");
          }
          const session = await this.Stripe.checkout.sessions.create({
               mode: "subscription",
               //   payment_method_types: ["card"],
               line_items: [
                    {
                         price: priceId,
                         quantity: 1,
                    },
               ],
               client_reference_id: userId,
               metadata: {
                    userId: userId,
                    planType: PlanName,
                    planId: Plan._id.toString(),
               },
               success_url: `${FRONTEND_URL}/success`,
               cancel_url: `${FRONTEND_URL}/`,
          });

          return session.url;
     }

     static async createPortalSession(stripeCustomerId: string) {
          const FRONTEND_URL: string = process.env.FRONTEND_URL!;
          const session = await this.Stripe.billingPortal.sessions.create({
               customer: stripeCustomerId,
               return_url: `${FRONTEND_URL}/dashboard`, // Where they go when they click "Back to app"
          });

          return session.url;
     }

     static async handleWebhook(
          rawBody: Buffer,
          signature: string,
     ): Promise<void> {
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
          if (!webhookSecret) {
               throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
          }

          let event: stripe.Event;
          try {
               event = await PaymentService.Stripe.webhooks.constructEventAsync(
                    rawBody,
                    signature,
                    webhookSecret,
               );
          } catch (err: any) {
               throw {
                    status: 400,
                    message: `Webhook signature verification failed: ${err.message}`,
               };
          }

          switch (event.type) {
               case "checkout.session.completed": {
                    const session = event.data
                         .object as stripe.Checkout.Session;
                    const userId = session.metadata?.userId;
                    const planId = session.metadata?.planId;
                    if (!userId || !planId) {
                         console.error(
                              "Webhook: Missing userId or planId in session metadata",
                              session.id,
                         );
                         break;
                    }

                    const plan = await Subscription.findById(planId);
                    if (!plan) {
                         console.error(
                              `Webhook: Subscription plan not found for planId=${planId}`,
                         );
                         break;
                    }

                    const stripeCustomerId = session.customer as string;

                    await User.findByIdAndUpdate(userId, {
                         subscriptionId: plan._id,
                         stripeCustomerId: stripeCustomerId,
                         isSubscribed: true,
                    });
                    console.log(
                         `Webhook: User ${userId} upgraded to plan "${plan.planName}" (${plan.planId})`,
                    );
                    break;
               }
               case "invoice.paid": {
                    const invoice = event.data.object as stripe.Invoice;
                    const stripeCustomerId = invoice.customer as string;

                    const user = await User.findOne({
                         stripeCustomerId: stripeCustomerId,
                    });

                    if (!user) {
                         console.error(
                              `Webhook: User not found for stripeCustomerId=${stripeCustomerId}`,
                         );
                         break;
                    }

                    await User.findByIdAndUpdate(user._id, {
                         isSubscribed: true,
                    });

                    console.log(
                         `Webhook: User ${user._id} monthly renewal successful!`,
                    );
                    break;
               }

               case "invoice.payment_failed": {
                    const invoice = event.data.object as stripe.Invoice;
                    const stripeCustomerId = invoice.customer as string;

                    const user = await User.findOne({
                         stripeCustomerId: stripeCustomerId,
                    });

                    if (!user) {
                         console.error(
                              `Webhook: User not found for stripeCustomerId=${stripeCustomerId}`,
                         );
                         break;
                    }

                    await User.findByIdAndUpdate(user._id, {
                         isSubscribed: false,
                    });

                    console.log(
                         `Webhook: User ${user._id} payment failed. Account locked.`,
                    );
                    break;
               }

               case "customer.subscription.deleted": {
                    const subscription = event.data
                         .object as stripe.Subscription;
                    const stripeCustomerId = subscription.customer as string;

                    const user = await User.findOne({
                         stripeCustomerId: stripeCustomerId,
                    });

                    if (user) {
                         // Find the free plan so we can assign them back to it
                         const freePlan = await Subscription.findOne({ planId: FREE_PLAN.planId });

                         await User.findByIdAndUpdate(user._id, {
                              isSubscribed: false,
                              subscriptionId: freePlan?._id, // Back to free 
                         });
                         console.log(
                              `Webhook: User ${user._id} canceled their subscription. Reverted to Free Plan.`,
                         );
                    }
                    break;
               }

               default:
                    console.log(
                         `Webhook: Unhandled event type "${event.type}"`,
                    );
          }
     }
}
