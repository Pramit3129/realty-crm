import stripe from "stripe";
import { Subscription } from "./subscription.model";
const Stripe = new stripe(process.env.STRIPE_SECRET_KEY!);

interface Price {
     amountInCents: number;
     interval: "month" | "year";
     currency: string;
}

interface stripeProducts {
     name: string;
     description: string;
     prices: Price[];
}

const createSubscriptions = async (products: stripeProducts[]) => {
     try {
          const subscriptionDocs = [];

          for (const product of products) {
               const subscription = await Stripe.products.create({
                    name: product.name,
                    description: product.description,
               });

               for (const price of product.prices) {
                    const subscriptionPrice = await Stripe.prices.create({
                         product: subscription.id,
                         unit_amount: price.amountInCents,
                         currency: price.currency,
                         recurring: {
                              interval: price.interval,
                         },
                    });

                    subscriptionDocs.push({
                         planName: product.name,
                         planId: subscription.id,
                         priceId: subscriptionPrice.id,
                    });
               }
          }

          if (subscriptionDocs.length > 0) {
               await Subscription.insertMany(subscriptionDocs);
               console.log(`Bulk inserted ${subscriptionDocs.length} subscriptions successfully`);
          }
     } catch (error) {
          console.error("Error in creating subscriptions:", error);
     }
};

const products: stripeProducts[] = [
     {
          name: "Pro Subscription of Realty CRM",
          description: "Pro Subscription of Realty CRM (TIER-1)",
          prices: [
               {
                    amountInCents: 6500,
                    interval: "month",
                    currency: "usd",
               },
          ],
     },
];

createSubscriptions(products);
