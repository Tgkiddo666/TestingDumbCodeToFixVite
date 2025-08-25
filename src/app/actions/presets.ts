
'use server';

/**
 * NOTE: The publishPreset server action was removed because server actions
 * cannot use the client-side Firebase SDK's authentication context, leading to
 * persistent "permission denied" errors.
 *
 * The logic has been moved directly into the client component that needs it
 * (src/app/(app)/presets/page.tsx) where the user's auth state is
 * available. This ensures all database operations are properly authenticated.
 */
