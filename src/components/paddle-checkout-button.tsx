
"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePaddle } from "./paddle-provider";


interface PaddleCheckoutButtonProps {
    priceId: string;
    planName: string;
    buttonText: string;
    disabled?: boolean;
}

export function PaddleCheckoutButton({ priceId, planName, buttonText, disabled }: PaddleCheckoutButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const { isCheckingOut, openCheckout } = usePaddle();

    const handleCheckout = () => {
        if (!user) {
            toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to purchase." });
            router.push('/login');
            return;
        }
        if (!priceId) {
             toast({ variant: "destructive", title: "Configuration Error", description: "This plan is not configured for purchase." });
            return;
        }
        
        openCheckout([{ priceId, quantity: 1 }]);
    };

    if (disabled) {
        return <Button className="w-full" variant="outline" disabled>Current Plan</Button>;
    }
    
    if (!priceId) {
        return <Button className="w-full" disabled>Not Available</Button>;
    }

    return (
        <Button onClick={handleCheckout} className="w-full" disabled={isCheckingOut}>
            {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
        </Button>
    );
}
