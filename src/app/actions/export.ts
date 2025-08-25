
'use server';

/**
 * NOTE: The exportTable server action was removed because it was complex and
 * prone to server-side errors. The logic has been moved directly into the
 * client component `src/app/(app)/tables/[tableId]/page.tsx`.
 *
 * This new approach handles the file generation entirely in the browser,
 * which is faster, more reliable, and eliminates the need for reCAPTCHA
 * or server-side rate limiting for exports.
 */
