
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { processPaddleWebhook } from '@/lib/paddle-webhook-handler';

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const requestHeaders = headers();
        return await processPaddleWebhook(rawBody, requestHeaders);
    } catch (error: any) {
        console.error('[/api/paddle-webhook] - Unhandled error in POST handler:', error);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
    }
}
