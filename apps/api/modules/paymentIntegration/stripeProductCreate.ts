import stripe from "stripe";
import { Subscription } from "./subscription.model";
import { SubscriptionPrice } from "./subscriptionPrice.model";

const Stripe = new stripe(process.env.STRIPE_SECRET_KEY!);

interface Price {
     amountInCents: number;
     interval: "month" | "year";
     intervalCount?: number;
     currency: string;
}

interface stripeProducts {
     name: string;
     description: string;
     prices: Price[];
}

const createSubscriptions = async (products: stripeProducts[]): Promise<void> => {
     try {
          const subscriptionDocs: { planName: string; planId: string }[] = [];
          const priceDocs: {
               priceId: string;
               price: number;
               currency: string;
               interval: string;
               intervalCount: number;
               _productId: string;
          }[] = [];

          for (const product of products) {
               const stripeProduct = await Stripe.products.create({
                    name: product.name,
                    description: product.description,
               });

               subscriptionDocs.push({
                    planName: product.name,
                    planId: stripeProduct.id,
               });

               for (const price of product.prices) {
                    const stripePrice = await Stripe.prices.create({
                         product: stripeProduct.id,
                         unit_amount: price.amountInCents,
                         currency: price.currency,
                         recurring: {
                              interval: price.interval,
                              interval_count: price.intervalCount ?? 1,
                         },
                    });

                    priceDocs.push({
                         priceId: stripePrice.id,
                         price: price.amountInCents,
                         currency: price.currency,
                         interval: price.interval,
                         intervalCount: price.intervalCount ?? 1,
                         _productId: stripeProduct.id, // link by Stripe product ID
                    });
               }
          }

          if (subscriptionDocs.length === 0) {
               console.log("No products to insert.");
               return;
          }

          const insertedSubscriptions = await Subscription.insertMany(subscriptionDocs);
          console.log(`Bulk inserted ${insertedSubscriptions.length} subscription(s).`);

          const productIdMap = new Map<string, string>(
               insertedSubscriptions.map((sub) => [sub.planId, String(sub._id)])
          );

          const subscriptionPriceDocs = priceDocs.map(({ _productId, ...rest }) => ({
               ...rest,
               subscriptionId: productIdMap.get(_productId),
          }));

          const insertedPrices = await SubscriptionPrice.insertMany(subscriptionPriceDocs);
          console.log(`Bulk inserted ${insertedPrices.length} subscription price(s).`);
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
                    intervalCount: 1,
                    currency: "usd",
               },
          ],
     },
];

createSubscriptions(products);
