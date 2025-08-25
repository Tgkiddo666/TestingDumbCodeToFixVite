
"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Gem } from "lucide-react";
import { PRICING_PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PaddleCheckoutButton } from "@/components/paddle-checkout-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";


type BillingCycle = 'monthly' | 'annual' | 'oneTime';

export default function PricingPage() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  
  const getPlanRank = (planName: string) => {
    const order = ['Free', 'Starter', 'Creator', 'Power', 'Lifetime'];
    return order.indexOf(planName);
  }

  const userPlanRank = getPlanRank(user?.subscriptionPlan || 'Free');

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Find the Perfect Plan
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Choose a flexible subscription or a one-time credit pass. All subscriptions can be cancelled anytime.
        </p>
        <Tabs defaultValue="monthly" onValueChange={(value) => setBillingCycle(value as BillingCycle)} className="mt-6">
            <TabsList className="mx-auto">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="annual">Annual</TabsTrigger>
                <TabsTrigger value="oneTime">One-Time Pass</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-8 md:grid-cols-2 lg:grid-cols-4">
        {PRICING_PLANS.map((plan) => {
            const pricingDetails = billingCycle === 'monthly' ? plan.monthly : (billingCycle === 'annual' ? plan.annual : plan.oneTime);
            if (!pricingDetails || !pricingDetails.paddlePriceId) return null; 

            const features = billingCycle === 'oneTime' && plan.oneTime ? plan.oneTime.features : plan.features;
            const priceId = pricingDetails.paddlePriceId;
            const price = pricingDetails.price;
            const priceSuffix = billingCycle === 'monthly' ? '/ month' : (billingCycle === 'annual' ? '/ year' : ' one-time');

            const currentPlanRank = getPlanRank(plan.name);
            const isUpgrade = currentPlanRank > userPlanRank;
            
            const isCurrent = user?.subscriptionPlan === plan.name && billingCycle !== 'oneTime';
            
            let buttonText = 'Get Started';
            if(user) {
              if (billingCycle === 'oneTime') {
                buttonText = 'Purchase Pass';
              } else {
                buttonText = isUpgrade ? 'Upgrade' : 'Change Plan';
              }
            }


            return (
              <Card
                key={`${plan.name}-${billingCycle}`}
                className={cn(
                  "flex flex-col",
                  plan.isPopular && isUpgrade && billingCycle !== 'oneTime' ? "border-primary ring-2 ring-primary" : ""
                )}
              >
                {plan.isPopular && isUpgrade && billingCycle !== 'oneTime' && (
                  <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-1 rounded-t-lg relative">
                    Recommended Upgrade
                    {billingCycle === 'annual' && plan.annual.savings && (
                        <Badge variant="destructive" className="absolute top-1/2 -translate-y-1/2 right-2">{plan.annual.savings}</Badge>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-primary" />
                    {billingCycle === 'oneTime' && plan.oneTime ? plan.oneTime.name : plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div>
                    <span className="text-4xl font-bold">{price}</span>
                    <span className="text-muted-foreground">{priceSuffix}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="mr-2 h-5 w-5 flex-shrink-0 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                    {plan.name === 'Free' 
                        ? <Button className="w-full" variant="outline" disabled>Free Plan</Button>
                        : <PaddleCheckoutButton priceId={priceId} planName={plan.name} buttonText={buttonText} disabled={billingCycle !== 'oneTime' && isCurrent} />
                    }
                </CardFooter>
              </Card>
            )
        })}
      </div>
    </div>
  );
}
