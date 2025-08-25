
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithRedirect,
  GoogleAuthProvider,
  GithubAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sigma, Github, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/loading-spinner";

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
      <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-67.4 64.8C334.6 112.3 294.2 96 248 96c-106.1 0-192 85.9-192 192s85.9 192 192 192c112.3 0 174.5-85.4 180.3-131.1H248v-95.6h239.3c4.8 25.5 7.7 52.8 7.7 81.5z"></path>
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If auth is no longer loading and a user object exists, we are logged in.
    if (!authLoading && user) {
        router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSignIn = async (providerName: 'google' | 'github') => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError(null);
    
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
    
    try {
        // Set persistence to LOCAL to ensure session survives redirect in all browsers.
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
        // The redirect will navigate away, so no further code here will execute
        // until the user returns to the app.
    } catch (err: any) {
        let description = "Could not start the sign-in process. Please try again.";
        if (err.code === 'auth/unauthorized-domain') {
            description = "This app's domain is not authorized for sign-in. Please contact the administrator.";
        }
        console.error("Sign-in redirect error:", err);
        setError(description);
        toast({ variant: "destructive", title: "Authentication Failed", description });
        setIsSigningIn(false);
    }
  };

  // While auth state is loading, or if the user is already logged in, show a spinner.
  // The AuthProvider and the useEffect hook will handle the redirect.
  if (authLoading || user) {
      return <LoadingSpinner />;
  }
  
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Sigma className="w-8 h-8 text-primary" />
            <CardTitle>Data Weaver</CardTitle>
        </div>
        <CardDescription>
          Sign in to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
                <AlertDescription className="text-center text-xs">
                    {error}
                </AlertDescription>
            </Alert>
        )}
        <Button
            className="w-full"
            variant="outline"
            onClick={() => handleSignIn('google')}
            disabled={isSigningIn}
        >
            {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Sign in with Google
        </Button>
        <Button
            className="w-full"
            variant="outline"
            onClick={() => handleSignIn('github')}
            disabled={isSigningIn}
        >
            {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
            Sign in with GitHub
        </Button>
      </CardContent>
    </Card>
  );
}
