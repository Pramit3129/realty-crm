import stripe from 'stripe';
import {Subscription} from './subscription.model';
export class PaymentService {
     static Stripe = new stripe(process.env.STRIPE_SECRET_KEY!);

     static async createSessionURL(userId: string, priceId: string){
        const FRONTEND_URL : string = process.env.FRONTEND_URL!;
        const  Plan = await Subscription.findOne({priceId});
        if(!Plan){
                throw new Error("Plan not found");
        }
        const PlanName:string = Plan.planName;     
        if(!PlanName){
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
                  },
                  success_url: `${FRONTEND_URL}/success`,
                  cancel_url: `${FRONTEND_URL}/cancel`,
             });

             return session.url;
     }
}