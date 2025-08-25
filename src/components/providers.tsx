"use client";

import { AuthProvider } from '@/components/auth-provider';
import { PaddleProvider } from '@/components/paddle-provider';
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <PaddleProvider>
                {children}
                <Toaster />
            </PaddleProvider>
        </AuthProvider>
    );
}
