
"use client";

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import type { Paddle, CheckoutCompletedEvent } from "@paddle/paddle-js";
import { initializePaddle } from "@paddle/paddle-js";
import { useAuth } from './auth-provider';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { PRICING_PLANS } from '@/lib/constants';

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "test_7aa749eb45b36505119015dfbc9";

type PaddleCheckoutItems = {
    priceId: string;
    quantity: number;
}[];

type PaddleContextType = {
  paddle: Paddle | undefined;
  isCheckingOut: boolean;
  openCheckout: (items: PaddleCheckoutItems) => void;
};

const PaddleContext = createContext<PaddleContextType>({
  paddle: undefined,
  isCheckingOut: false,
  openCheckout: () => {},
});

export const PaddleProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckoutCompleted = useCallback(async (data: CheckoutCompletedEvent['data']) => {
    if (!user) {
        console.error("Checkout completed but no user is logged in.");
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not find logged-in user to apply purchase.' });
        return;
    }
    
    const purchasedItem = data.items[0];
    const priceId = purchasedItem.price?.id || (purchasedItem as any).price_id;

    if (!priceId) {
        console.error("Could not determine priceId from checkout.completed event.", data);
        toast({ variant: 'destructive', title: 'Purchase Error', description: 'Could not identify the purchased item.' });
        setIsCheckingOut(false);
        return;
    }

    let purchasedPlan = null;
    let purchaseType: 'monthly' | 'annual' | 'oneTime' | null = null;
      
    for (const plan of PRICING_PLANS) {
        if (plan.monthly?.paddlePriceId === priceId) {
            purchasedPlan = plan;
            purchaseType = 'monthly';
            break;
        }
        if (plan.annual?.paddlePriceId === priceId) {
            purchasedPlan = plan;
            purchaseType = 'annual';
            break;
        }
        if (plan.oneTime?.paddlePriceId === priceId) {
            purchasedPlan = plan;
            purchaseType = 'oneTime';
            break;
        }
    }

    if (!purchasedPlan) {
        console.error(`Could not find a plan for Price ID: ${priceId} in checkout.completed event.`);
        toast({ variant: 'destructive', title: 'Purchase Error', description: 'Could not match your purchase to a plan.' });
        setIsCheckingOut(false);
        return;
    }

    try {
        const userRef = doc(db, 'users', user.uid);
        if (purchaseType === 'monthly' || purchaseType === 'annual') {
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30); // Simulate renewal date for local dev

            await updateDoc(userRef, {
                subscriptionPlan: purchasedPlan.name,
                'planDetails.creditLimit': purchasedPlan.creditLimit,
                'planDetails.storageLimit': purchasedPlan.storageLimit,
                creditsUsed: 0,
                planExpiryDate: null,
                subscriptionEndsAt: Timestamp.fromDate(subscriptionEndsAt),
            });
            toast({ title: 'Plan Updated!', description: `You are now on the "${purchasedPlan.name}" plan.` });
        } else if (purchaseType === 'oneTime' && purchasedPlan.oneTime) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            await updateDoc(userRef, {
                subscriptionPlan: purchasedPlan.name,
                'planDetails.creditLimit': purchasedPlan.creditLimit,
                'planDetails.storageLimit': purchasedPlan.storageLimit,
                creditsUsed: 0, // A pass gives you the full credits of that plan for a month
                planExpiryDate: Timestamp.fromDate(expiryDate),
            });
            toast({ title: 'Plan Pass Activated!', description: `You now have the ${purchasedPlan.name} plan for 30 days.` });
        }
    } catch (error: any) {
        console.error("Failed to update user document after purchase:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Your payment was successful, but we failed to update your account. Please contact support.' });
    } finally {
        setIsCheckingOut(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN) {
        console.error("Paddle Client Token is not configured.");
        return;
    }
    
    // Using a stable callback function for the event listener.
    const eventCallback = (data: any) => {
        switch(data.name) {
            case 'checkout.completed':
                handleCheckoutCompleted(data.data);
                break;
            case 'checkout.closed':
                setIsCheckingOut(false);
                break;
        }
    };
    
    initializePaddle({
        environment: "sandbox",
        token: PADDLE_CLIENT_TOKEN,
        eventCallback: eventCallback,
    }).then((paddleInstance: Paddle | undefined) => {
        if (paddleInstance) {
            setPaddle(paddleInstance);
        }
    });
  }, [handleCheckoutCompleted]);

  const openCheckout = useCallback((items: PaddleCheckoutItems) => {
    if (!paddle) {
        toast({ variant: "destructive", title: "Paddle Not Ready", description: "The payment system is still loading. Please try again in a moment." });
        return;
    }
    if (!user) {
        toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to purchase." });
        return;
    }

    setIsCheckingOut(true);
    
    paddle.Checkout.open({ 
        items, 
        customer: { email: user.email },
        customData: { userId: user.uid }
    });
  }, [paddle, toast, user]);


  return (
    <PaddleContext.Provider value={{ paddle, isCheckingOut, openCheckout }}>
      {children}
    </PaddleContext.Provider>
  );
};

export const usePaddle = () => {
  const context = useContext(PaddleContext);
  if (context === undefined) {
    throw new Error('usePaddle must be used within a PaddleProvider');
  }
  return context;
};
