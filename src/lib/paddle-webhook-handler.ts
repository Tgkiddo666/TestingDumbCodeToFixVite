
'use server';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PRICING_PLANS } from '@/lib/constants';
import type { DocumentReference } from 'firebase-admin/firestore';
import { lazy } from 'react';

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

// Determine if running in a Google Cloud production environment
const isProduction = !!process.env.GCP_PROJECT;

interface WebhookHeaders {
  get(header: string): string | null;
}

// Lazy-load Firebase Admin SDK only when needed (in production)
let adminDb: FirebaseFirestore.Firestore | null = null;
const getAdminDb = async () => {
  if (adminDb) return adminDb;
  if (isProduction) {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
    adminDb = admin.firestore();
    return adminDb;
  }
  return null;
};


export async function processPaddleWebhook(rawBody: string, headers: WebhookHeaders) {
  console.log('[/lib/paddle-webhook-handler] - Processing webhook.');

  if (!isProduction) {
    console.log('[/lib/paddle-webhook-handler] - DEV MODE: Skipping backend processing.');
    return NextResponse.json({ received: true, status: 'Skipped in dev environment' });
  }

  const db = await getAdminDb();
  if (!db) {
    return new NextResponse('Internal Server Error: Could not initialize database.', { status: 500 });
  }

  const isTest = headers.get('x-webhook-test') === 'true';
  if (isTest) {
    console.log('[/lib/paddle-webhook-handler] - Test webhook received and acknowledged.');
    return NextResponse.json({ received: true });
  }

  if (!PADDLE_WEBHOOK_SECRET) {
    console.error("[/lib/paddle-webhook-handler] - ERROR: Paddle webhook secret is not configured in production.");
    return new NextResponse('Internal Server Error: Webhook secret not configured.', { status: 500 });
  }

  const signature = headers.get('paddle-signature');
  if (!signature) {
    console.warn('[/lib/paddle-webhook-handler] - WARNING: Signature missing.');
    return new NextResponse('Signature missing.', { status: 400 });
  }

  try {
    const [ts, h1] = signature.split(';').map(part => part.split('=')[1]);
    const signedPayload = `${ts}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET);
    hmac.update(signedPayload);
    const h1Computed = hmac.digest('hex');
    if (h1Computed !== h1) {
      console.warn('[/lib/paddle-webhook-handler] - ERROR: Invalid webhook signature.');
      return new NextResponse('Invalid signature.', { status: 401 });
    }
    console.log('[/lib/paddle-webhook-handler] - Signature verification successful.');
  } catch (error) {
    console.error('[/lib/paddle-webhook-handler] - ERROR: Webhook signature verification failed', error);
    return new NextResponse('Invalid signature format.', { status: 400 });
  }

  const findUserByCustomerId = async (customerId: string): Promise<DocumentReference | null> => {
    if (!customerId) return null;
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('paddleCustomerId', '==', customerId).limit(1).get();
    if (snapshot.empty) {
      console.warn(`[/lib/paddle-webhook-handler] - WARNING: Could not find user with paddleCustomerId: ${customerId}`);
      return null;
    }
    return snapshot.docs[0].ref;
  };

  try {
    const event = JSON.parse(rawBody);
    console.log(`[/lib/paddle-webhook-handler] - Processing event_type: ${event.event_type}`);

    switch (event.event_type) {
      case 'transaction.completed': {
        const { customer_id, subscription_id, custom_data, items, billing_period } = event.data;
        const userId = custom_data?.userId;

        if (!userId) {
          console.warn(`[/lib/paddle-webhook-handler] - WARNING: Webhook received for transaction without a userId.`);
          return NextResponse.json({ received: true, message: 'No userId provided.' });
        }

        const userDocRef = db.collection('users').doc(userId);
        const purchasedItem = items[0];
        const priceId = purchasedItem.price_id;

        const purchasedPlan = PRICING_PLANS.find(p => 
            p.monthly?.paddlePriceId === priceId || 
            p.annual?.paddlePriceId === priceId || 
            p.oneTime?.paddlePriceId === priceId
        );
        
        if (!purchasedPlan) {
          console.error(`[/lib/paddle-webhook-handler] - ERROR: Could not find a plan for Price ID: ${priceId}`);
          return new NextResponse(`Plan for price ID ${priceId} not found`, { status: 400 });
        }

        const isSubscription = purchasedPlan.monthly?.paddlePriceId === priceId || purchasedPlan.annual?.paddlePriceId === priceId;

        if (isSubscription) {
          console.log(`[/lib/paddle-webhook-handler] - Updating user ${userId} for subscription purchase.`);
          await userDocRef.update({
            subscriptionPlan: purchasedPlan.name,
            'planDetails.creditLimit': purchasedPlan.creditLimit,
            'planDetails.storageLimit': purchasedPlan.storageLimit,
            paddleCustomerId: customer_id,
            paddleSubscriptionId: subscription_id,
            creditsUsed: 0,
            planExpiryDate: null,
            subscriptionEndsAt: billing_period ? new Date(billing_period.ends_at) : null,
          });
        } else if (purchasedPlan.oneTime) {
          console.log(`[/lib/paddle-webhook-handler] - Updating user ${userId} for one-time purchase.`);
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          await userDocRef.update({
            subscriptionPlan: purchasedPlan.name,
            'planDetails.creditLimit': purchasedPlan.creditLimit,
            'planDetails.storageLimit': purchasedPlan.storageLimit,
            creditsUsed: 0,
            planExpiryDate: expiryDate,
            paddleCustomerId: customer_id,
          });
        }
        break;
      }

      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.canceled': {
        const { customer_id, status, ends_at } = event.data;
        const userDocRef = await findUserByCustomerId(customer_id);
        if (userDocRef) {
          console.log(`[/lib/paddle-webhook-handler] - Updating subscription status (${status}) for user ${userDocRef.id}`);
          await userDocRef.update({
            subscriptionEndsAt: ends_at ? new Date(ends_at) : null,
          });
        }
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[/lib/paddle-webhook-handler] - FATAL: Error processing webhook event body:', error);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
  }
}
