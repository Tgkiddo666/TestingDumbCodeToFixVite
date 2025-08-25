
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import LoadingSpinner from '@/components/loading-spinner';

export default function ProfileRedirectPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return; // Wait until auth state is resolved

        if (user?.username) {
            router.replace(`/u/${user.username}`);
        } else {
            // If there's no user, redirect to login.
            router.replace('/login');
        }
    }, [user, loading, router]);

    return <LoadingSpinner />;
}
