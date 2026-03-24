import stripe from "stripe";
import { Subscription } from "./subscription.model";
import { SubscriptionPrice } from "./subscriptionPrice.model";

const Stripe = new stripe(process.env.STRIPE_SECRET_KEY!);

interface Price {
     amountInCents: number;
     interval: "month" | "year";
     intervalCount?: number;
     currency: string;
     stripePriceId: string;
}

interface stripeProducts {
     name: string;
     description: string;
     stripeProductId: string;
     prices: Price[];
}

const createSubscriptions = async (
     products: stripeProducts[],
): Promise<void> => {
     try {
          const subscriptionDocs: { planName: string; planId: string }[] = [];
          const priceDocs: {
               priceId: string;
               price: number;
               currency: string;
               _productId: string;
          }[] = [];

          for (const product of products) {
               if (!product.stripeProductId) {
                    throw new Error(`Missing stripeProductId for product: ${product.name}`);
               }

               subscriptionDocs.push({
                    planName: product.name,
                    planId: product.stripeProductId,
               });

               for (const price of product.prices) {
                    if (!price.stripePriceId) {
                         throw new Error(`Missing stripePriceId for a price in product: ${product.name}`);
                    }

                    priceDocs.push({
                         priceId: price.stripePriceId,
                         price: price.amountInCents,
                         currency: price.currency,
                         _productId: product.stripeProductId, // link by Stripe product ID
                    });
               }
          }

          if (subscriptionDocs.length === 0) {
               console.log("No products to insert.");
               return;
          }

          const insertedSubscriptions =
               await Subscription.insertMany(subscriptionDocs);
          console.log(
               `Bulk inserted ${insertedSubscriptions.length} subscription(s).`,
          );

          const productIdMap = new Map<string, string>(
               insertedSubscriptions.map((sub) => [
                    sub.planId,
                    String(sub._id),
               ]),
          );

          const subscriptionPriceDocs = priceDocs.map(
               ({ _productId, ...rest }) => ({
                    ...rest,
                    subscriptionId: productIdMap.get(_productId),
               }),
          );

          const insertedPrices = await SubscriptionPrice.insertMany(
               subscriptionPriceDocs,
          );
          console.log(
               `Bulk inserted ${insertedPrices.length} subscription price(s).`,
          );
     } catch (error) {
          console.error("Error in creating subscriptions:", error);
     }
};

const products: stripeProducts[] = [
     {
          name: "CORE CRM",
          description: "CORE CRM Subscription",
          stripeProductId: "prod_UCeUyQeQ9Whwg6",
          prices: [
               {
                    stripePriceId: "price_1TEFBbFMnRk4uee2sDep9KIs",
                    amountInCents: 9900,
                    interval: "month",
                    intervalCount: 1,
                    currency: "cad",
               },
          ],
     },
     {
          name: "Core CRM + IDX",
          description: "Core CRM + IDX Subscription",
          stripeProductId: "prod_UCeX7nAeFQo2C6",
          prices: [
               {
                    stripePriceId: "price_1TEFESFMnRk4uee2rkUgSRHh",
                    amountInCents: 14900,
                    interval: "month",
                    intervalCount: 1,
                    currency: "cad",
               },
          ],
     },
     {
          name: "Advanced AI CRM",
          description: "Advanced AI CRM Subscription",
          stripeProductId: "prod_UCeZkyMF0bULSH",
          prices: [
               {
                    stripePriceId: "price_1TEFGLFMnRk4uee2BIxOHNpq",
                    amountInCents: 24900,
                    interval: "month",
                    intervalCount: 1,
                    currency: "cad",
               },
          ],
     },
];

createSubscriptions(products);
