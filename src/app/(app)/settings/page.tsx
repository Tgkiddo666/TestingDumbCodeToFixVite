
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePaddle } from "@/components/paddle-provider";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, ImageUp } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const RESIZE_DIMENSION = 256; // Resize to 256x256

// Helper function to aggressively compress the image to a small WebP Data URL
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));

        canvas.width = RESIZE_DIMENSION;
        canvas.height = RESIZE_DIMENSION;
        ctx.drawImage(img, 0, 0, RESIZE_DIMENSION, RESIZE_DIMENSION);

        // Convert to WebP with very low quality for aggressive compression
        const dataUrl = canvas.toDataURL('image/webp', 0.1); 

        // Firestore documents have a 1MiB limit, this is a safe guard.
        if (dataUrl.length > 1024 * 500) { 
          return reject(new Error('Image is too large even after compression.'));
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Could not load image.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
};


export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { paddle } = usePaddle();
  const [isUploading, setIsUploading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || !event.target.files[0]) return;
    const file = event.target.files[0];

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.' });
      return;
    }
    
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 5MB.' });
        return;
    }
    
    setIsUploading(true);
    try {
      const dataUrl = await processImage(file);
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { avatarUrl: dataUrl }, { merge: true });

      toast({
        title: 'Avatar Updated!',
        description: "Your new profile picture has been saved.",
      });
      // The onSnapshot listener in AuthProvider will handle the UI update automatically.
      router.refresh();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsUploading(false);
      // Reset file input to allow re-uploading the same file
      event.target.value = '';
    }
  };
  
  const handleManageSubscription = async () => {
    if (!paddle || !user?.paddleCustomerId) {
        toast({
            variant: 'destructive',
            title: "Could not open portal",
            description: "The customer portal is unavailable or your customer ID is missing."
        });
        return;
    }
    setIsManaging(true);
    paddle.Customer.portal({
        customerId: user.paddleCustomerId,
        // The `onClose` callback is a good place to reset the loading state.
        onClose: () => setIsManaging(false)
    });
  };

  const isOnPass = !!user?.planExpiryDate;

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />
      <div className="space-y-6">

        <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload a new avatar. It will be aggressively compressed to ensure a fast and reliable upload.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Label htmlFor="avatar-upload" className={cn(buttonVariants({ variant: 'outline' }), "cursor-pointer", isUploading && 'opacity-50 cursor-not-allowed')}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                </Label>
                <Input id="avatar-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} disabled={isUploading} />
                <p className="text-sm text-muted-foreground mt-2">Recommended: .jpg, .png files under 5MB.</p>
            </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your billing and subscription details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>You are currently on the <strong>{user?.subscriptionPlan}{isOnPass ? ' Pass' : ''}</strong> plan.</p>
            {isOnPass && user?.planExpiryDate &&
                <p className="text-sm text-muted-foreground">Your pass expires on {user.planExpiryDate.toLocaleDateString()}.</p>
            }
             {!isOnPass && user?.subscriptionPlan !== 'Free' && user?.subscriptionEndsAt &&
                 <p className="text-sm text-muted-foreground">Your plan renews on {user.subscriptionEndsAt.toLocaleDateString()}.</p>
            }
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/pricing')}>
              {user?.subscriptionPlan === 'Free' ? 'View Plans' : 'Change Plan'}
            </Button>
            {user?.subscriptionPlan !== 'Free' && !isOnPass && user?.paddleCustomerId && (
               <Button onClick={handleManageSubscription} disabled={isManaging}>
                {isManaging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Subscription
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
            <CardDescription>
              Permanently delete your account and all of your data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" disabled>Delete My Account</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
