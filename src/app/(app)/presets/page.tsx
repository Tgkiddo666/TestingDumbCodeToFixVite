
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, orderBy, where, limit, addDoc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Preset, User } from "@/lib/types";
import { PlusCircle, Bot, CheckCircle, Search, Trash2, Loader2, UploadCloud, Link2, Download, Heart, ExternalLink, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AIPresetGenerator } from "@/components/ai-preset-generator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { parsePresetString } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


const publishSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(50),
  description: z.string().min(10, "Description must be at least 10 characters.").max(150),
  tags: z.string().refine(tags => {
    const parts = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    return parts.length > 0 && parts.length <= 5;
  }, {
    message: 'Please provide between 1 and 5 tags, separated by commas.',
  }),
});


function PublishPresetDialog({ preset, onOpenChange }: { preset: Preset, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof publishSchema>>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      name: preset.name || '',
      description: preset.description || '',
      tags: preset.tags ? preset.tags.join(', ') : '',
    }
  });

  async function handlePublish(values: z.infer<typeof publishSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to publish a preset.' });
      return;
    }

    setIsSubmitting(true);
    const { name, description } = values;
    const tagsArray = values.tags.split(',').map(t => t.trim().toLowerCase());

    try {
      const userPresetRef = doc(db, 'users', user.uid, 'presets', preset.id);
      const userPresetSnap = await getDoc(userPresetRef);

      if (!userPresetSnap.exists()) {
        throw new Error('Original preset not found.');
      }
      const originalPreset = userPresetSnap.data();

      if (!originalPreset.presetString) {
        throw new Error('Preset content (presetString) is missing and could not be published.');
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
          throw new Error('Author data could not be found.');
      }
      const userData = userDocSnap.data() as User;

      const batch = writeBatch(db);

      batch.update(userPresetRef, { isPublic: true, name, description, tags: tagsArray });

      const communityPresetRef = doc(db, 'community-presets', preset.id);
      
      const publicPresetData = {
        id: preset.id,
        name: name,
        description: description,
        tags: tagsArray,
        presetString: originalPreset.presetString,
        isPublic: true,
        isOfficial: originalPreset.isOfficial || false,
        authorId: user.uid,
        authorName: userData.name || 'Anonymous',
        downloadCount: originalPreset.downloadCount || 0,
        authorUsername: userData.username || '',
        authorAvatarUrl: userData.avatarUrl || null,
        authorFavoriteLink: userData.favoriteLink || null,
        authorSocialLinks: userData.socialLinks || { koFi: '', patreon: '', paypal: '', customLink: '' },
      };
      
      batch.set(communityPresetRef, publicPresetData);
      
      await batch.commit();

      toast({ title: 'Success!', description: `"${name}" has been published to the community!` });
      router.refresh();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error publishing preset:', error);
      toast({ variant: 'destructive', title: 'Publishing Failed', description: error.message || 'An unexpected error occurred. Could not publish the preset.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Publish Preset</DialogTitle>
        <DialogDescription>
          Review and confirm the details before making your preset available to the community.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handlePublish)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preset Name</FormLabel>
                <FormControl><Input {...field} required /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} required /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (comma-separated, up to 5)</FormLabel>
                <FormControl><Input {...field} required /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Publish
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function CommunityPresetCard({ preset }: { preset: Preset }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMonomind = preset.authorUsername === 'monomindai';

  const handleAddToMyPresets = async (presetToAdd: Preset) => {
    if (!user) return;
    try {
      const presetRef = doc(db, 'users', user.uid, 'presets', presetToAdd.id);
      await setDoc(presetRef, { ...presetToAdd, isPublic: false });
      toast({ title: "Preset Added!", description: `"${presetToAdd.name}" has been added to your presets.` });
    } catch (error) {
      console.error("Error adding preset: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add the preset." });
    }
  };

  const tipLink = preset.authorFavoriteLink && preset.authorSocialLinks?.[preset.authorFavoriteLink];
  const monomindLink = 'https://www.monomindai.com';
  const canTip = tipLink || isMonomind;

  const authorName = preset.authorName || "Anonymous";
  const authorUsername = preset.authorUsername || "anonymous";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{preset.name}</CardTitle>
        <CardDescription>{preset.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 border-t mt-auto">
          <Link href={`/u/${authorUsername}`} className="flex items-center gap-3 w-full group">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={preset.authorAvatarUrl || undefined} alt={authorName} />
              <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
                <p className="font-semibold group-hover:underline flex items-center gap-1.5">
                  {authorName}
                  {isMonomind && <CheckCircle className="h-4 w-4 text-foreground" />}
                </p>
                <p className="text-xs text-muted-foreground">@{authorUsername}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
                <Download className="h-4 w-4" /> {preset.downloadCount || 0}
            </div>
          </Link>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
          <div className="w-full flex gap-2">
             {canTip && (
                <Button variant="outline" size="sm" asChild>
                    <a href={isMonomind ? monomindLink : tipLink!} target="_blank" rel="noopener noreferrer">
                       {isMonomind ? <ExternalLink className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}
                       {isMonomind ? 'Website' : 'Tip Creator'}
                    </a>
                </Button>
            )}
            <Button size="sm" className="w-full flex-1" onClick={() => handleAddToMyPresets(preset)}>
              Save Preset
            </Button>
          </div>
      </CardFooter>
    </Card>
  )
}

function ManualPresetForm({ onSave }: { onSave?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [presetString, setPresetString] = useState('');

  const handleSave = async () => {
    if (!presetString) {
      toast({ variant: 'destructive', title: 'Cannot Save', description: 'Preset content cannot be empty.' });
      return;
    }
     if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to save a preset.' });
      return;
    }
    
    const parsed = parsePresetString(presetString);
    if (!parsed) {
      toast({ variant: 'destructive', title: 'Invalid Format', description: 'Invalid preset format. Please check the syntax.' });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        throw new Error('User data not found.');
      }
      const userData = userDocSnap.data() as User;

      const presetsCollection = collection(db, 'users', user.uid, 'presets');
      await addDoc(presetsCollection, {
        name: `Untitled Manual Preset`,
        description: 'A new preset saved from the manual editor.',
        tags: [],
        presetString: presetString,
        isPublic: false,
        isOfficial: false,
        authorId: user.uid,
        authorName: userData.name || 'Anonymous',
        downloadCount: 0,
      });

      toast({ title: 'Success!', description: 'Preset saved to "My Presets".' });
      if (onSave) onSave();
    } catch (error: any) {
      console.error("Error saving preset:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Editor</CardTitle>
        <CardDescription>Paste or write your preset string below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea 
          className="min-h-[200px] font-mono text-xs break-all"
          placeholder="[TABLE(EXPORT-AS:...)(WRITE-AS:...):[...]]" 
          value={presetString}
          onChange={(e) => setPresetString(e.target.value)}
        />
      </CardContent>
      <CardFooter>
        <Button className="ml-auto" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preset
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PresetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myPresets, setMyPresets] = useState<Preset[]>([]);
  const [communityPresets, setCommunityPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchMyPresets = async () => {
        const myPresetsCol = collection(db, 'users', user.uid, 'presets');
        const myPresetsSnapshot = await getDocs(query(myPresetsCol, orderBy("name")));
        const myPresetsData = myPresetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Preset));
        setMyPresets(myPresetsData);
    };
    fetchMyPresets();
  }, [user, isPublishDialogOpen, isCreateDialogOpen]);

  useEffect(() => {
    const fetchCommunityPresets = async () => {
      setIsLoading(true);
      try {
        const communityPresetsCol = collection(db, 'community-presets');
        const communityPresetsSnapshot = await getDocs(query(communityPresetsCol, orderBy("downloadCount", "desc")));
        
        const communityPresetsData = communityPresetsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Preset))
          .filter(preset => preset.name && preset.presetString && preset.authorName);
          
        setCommunityPresets(communityPresetsData);

      } catch (error) {
        console.error("Error fetching presets: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch presets." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunityPresets();
  }, [toast, isPublishDialogOpen]);

  useEffect(() => {
    const handler = setTimeout(async () => {
        if (searchQuery.trim().length > 1) {
            setIsSearchingUsers(true);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '>=', searchQuery.toLowerCase()), where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'), limit(5));
            const querySnapshot = await getDocs(q);
            const users = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            setUserResults(users);
            setIsSearchingUsers(false);
        } else {
            setUserResults([]);
        }
    }, 300); // 300ms debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);


  const handleRemoveFromMyPresets = async (presetToRemove: Preset) => {
    if (!user) return;
    try {
      const presetRef = doc(db, 'users', user.uid, 'presets', presetToRemove.id);
      await deleteDoc(presetRef);
      setMyPresets((prev) => prev.filter((p) => p.id !== presetToRemove.id));
      toast({ title: "Preset Removed", description: `"${presetToRemove.name}" has been removed from your presets.` });
    } catch (error) {
      console.error("Error removing preset: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not remove the preset." });
    }
  };

  const handlePublishClick = (preset: Preset) => {
    setSelectedPreset(preset);
    setIsPublishDialogOpen(true);
  }
  
  const filteredCommunityPresets = useMemo(() => {
    if (!user) return [];
    const presetsInMyList = new Set(myPresets.map(p => p.id));
    return communityPresets
      .filter(cp => !presetsInMyList.has(cp.id) || cp.authorId === user.uid)
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))));
  }, [communityPresets, myPresets, searchQuery, user]);


  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div><h2 className="text-3xl font-bold tracking-tight">Presets</h2><p className="text-muted-foreground">Browse, create, and manage your table presets.</p></div>
      </div>
      <Tabs defaultValue="community" className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <TabsList className="self-start"><TabsTrigger value="community">Community</TabsTrigger><TabsTrigger value="my-presets">My Presets</TabsTrigger></TabsList>
          <div className="relative w-full md:max-w-sm flex items-center">
            <Search className="absolute h-4 w-4 text-muted-foreground ml-3" />
            <Input type="search" placeholder="Search presets or users..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            <TabsContent value="community" className="space-y-4">
               {(isSearchingUsers || userResults.length > 0) && (
                  <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground px-1">USERS</h3>
                      <Card>
                          <CardContent className="p-2 space-y-1">
                              {isSearchingUsers && <div className="flex items-center gap-2 p-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Searching...</span></div>}
                              {!isSearchingUsers && userResults.length === 0 && <p className="p-2 text-sm text-muted-foreground">No users found.</p>}
                              {userResults.map(u => (
                                  <Link key={u.uid} href={`/u/${u.username}`}>
                                      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                          <Avatar className="h-10 w-10 border"><AvatarImage src={u.avatarUrl || ''} /><AvatarFallback>{u.name.charAt(0)}</AvatarFallback></Avatar>
                                          <div><p className="font-semibold">{u.name}</p><p className="text-sm text-muted-foreground">@{u.username}</p></div>
                                      </div>
                                  </Link>
                              ))}
                          </CardContent>
                      </Card>
                       <h3 className="text-sm font-semibold text-muted-foreground px-1 pt-4">PRESETS</h3>
                  </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCommunityPresets.map((preset) => (
                  <CommunityPresetCard key={preset.id} preset={preset} />
                ))}
              </div>
              {!isLoading && filteredCommunityPresets.length === 0 && userResults.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg col-span-full">
                  <h3 className="text-lg font-semibold">No Community Presets Yet</h3>
                  <p className="text-muted-foreground">
                    Create a preset in "My Presets" and make it public to get started!
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="my-presets" className="space-y-4">
              {myPresets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {myPresets.map((preset) => (
                    <Card key={preset.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {preset.name}
                          {preset.isOfficial && (<CheckCircle className="h-5 w-5 text-primary" />)}
                        </CardTitle>
                        <CardDescription>{preset.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {preset.tags.map((tag) => (<Badge key={tag} variant="secondary">{tag}</Badge>))}
                        </div>
                         {preset.isPublic && (<div className="flex items-center gap-2 text-sm text-green-600 mt-4"><Link2 className="h-4 w-4" /><span>Public</span></div>)}
                      </CardContent>
                      <CardFooter className="flex flex-col gap-2">
                        {!preset.isOfficial && !preset.isPublic && (<Button variant="secondary" className="w-full" onClick={() => handlePublishClick(preset)}><UploadCloud className="mr-2 h-4 w-4" /> Make Public</Button>)}
                        <div className="flex w-full gap-2">
                          <Button asChild className="w-full"><Link href={`/tables/new?presetId=${preset.id}`}>Use Preset</Link></Button>
                          {!preset.isOfficial && <Button variant="destructive" size="icon" onClick={() => handleRemoveFromMyPresets(preset)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <h3 className="text-lg font-semibold">No personal presets yet.</h3>
                  <p className="text-muted-foreground">Create a new preset or add one from the community.</p>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
            <Button className="fixed bottom-20 right-4 h-14 rounded-full shadow-lg md:bottom-8 md:right-8 px-5">
                <PlusCircle className="mr-2 h-5 w-5" />
                <span className="font-semibold">Create Preset</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[625px] max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader><DialogTitle>Create a new preset</DialogTitle><DialogDescription>Define a new table structure and export format.</DialogDescription></DialogHeader>
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="ai"><Bot className="mr-2 h-4 w-4" /> Generate with AI</TabsTrigger><TabsTrigger value="manual">From Scratch</TabsTrigger></TabsList>
            <TabsContent value="ai"><AIPresetGenerator onSave={() => setIsCreateDialogOpen(false)} /></TabsContent>
            <TabsContent value="manual">
              <ManualPresetForm onSave={() => setIsCreateDialogOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        {selectedPreset && <PublishPresetDialog preset={selectedPreset} onOpenChange={setIsPublishDialogOpen} />}
      </Dialog>
    </div>
  );
}

    