
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, writeBatch, increment, query, getDocs } from "firebase/firestore";
import type { Preset } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const formSchema = z.object({
  name: z.string().min(3, {
    message: "Table name must be at least 3 characters.",
  }).max(50),
  presetId: z.string({ required_error: "Please select a preset." }).min(1, "Please select a preset."),
});

function CreateTablePageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [userPresets, setUserPresets] = useState<Preset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUserPresets = async () => {
      setIsLoadingPresets(true);
      const presetsCollection = collection(db, 'users', user.uid, 'presets');
      const presetsSnapshot = await getDocs(query(presetsCollection));
      const presetsData = presetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Preset));
      setUserPresets(presetsData);
      setIsLoadingPresets(false);
    };
    fetchUserPresets();
  }, [user]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      presetId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const presetRef = doc(db, 'users', user.uid, 'presets', values.presetId);
      const presetSnap = await getDoc(presetRef);
      if (!presetSnap.exists()) {
        toast({ variant: "destructive", title: "Preset not found", description: "The selected preset could not be loaded." });
        setIsSubmitting(false);
        return;
      }
      const preset = presetSnap.data() as Preset;
      
      const fileTypeMatch = preset.presetString.match(/EXPORT-AS:(\.\w+)/);
      const fileType = fileTypeMatch ? fileTypeMatch[1] : '.txt';

      const tablesCollection = collection(db, 'users', user.uid, 'tables');
      const newTableRef = await addDoc(tablesCollection, {
        name: values.name,
        presetString: preset.presetString,
        fileType: fileType,
        tags: preset.tags,
        createdAt: serverTimestamp(),
        lastEdited: serverTimestamp(),
        data: [],
        size: 0,
      });
      
      if (preset.isPublic) {
          const batch = writeBatch(db);
          const communityPresetRef = doc(db, 'community-presets', preset.id);
          batch.update(communityPresetRef, { downloadCount: increment(1) });
          
          const authorRef = doc(db, 'users', preset.authorId);
          batch.update(authorRef, { totalDownloads: increment(1) });

          await batch.commit();
      }
      
      toast({
        title: "Table Created!",
        description: `Redirecting you to your new table "${values.name}".`,
      });
      router.push(`/tables/${newTableRef.id}`);

    } catch (error) {
      console.error("Error creating table:", error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "There was a problem creating your table.",
      });
      setIsSubmitting(false);
    }
  }
  
  if (isLoadingPresets) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Create a new table</CardTitle>
              <CardDescription>
                Give your new table a name and choose a preset from your saved presets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Customer List" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="presetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preset</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select from your saved presets..." />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                        {userPresets.length > 0 ? (
                           userPresets.map(p => (
                             <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                           ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">No presets found.</div>
                        )}
                       </SelectContent>
                     </Select>
                     <FormDescription>
                       Need a different preset? <Link href="/presets" className="text-primary underline">Browse presets</Link>.
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || userPresets.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Table
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}


export default function CreateTablePage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <CreateTablePageContent />
        </Suspense>
    )
}

    
