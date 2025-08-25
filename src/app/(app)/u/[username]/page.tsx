
'use client';

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, limit } from "firebase/firestore";
import type { Table, Preset, User, FavoriteLink, SocialLinks } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { useParams, useRouter } from "next/navigation";
import { differenceInDays } from 'date-fns';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Coffee, Heart, Wallet, Download, Table as TableIcon, Loader2, Pencil, ExternalLink, CheckCircle, Link2, ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";

const profileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.').max(50).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters.').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.').or(z.literal('')).optional(),
  bio: z.string().max(120, 'Bio must be 120 characters or less.').optional(),
  koFi: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
  patreon: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
  paypal: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
  customLink: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
  favoriteLink: z.enum(['koFi', 'patreon', 'paypal', '']).nullable().optional(),
});


export default function PublicProfilePage() {
  const { user: loggedInUser, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [publicPresets, setPublicPresets] = useState<Preset[]>([]);
  const [userTables, setUserTables] = useState<Table[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", username: "", bio: "", koFi: "", patreon: "", paypal: "", customLink: "", favoriteLink: null }
  });
  
  const isOwnProfile = loggedInUser?.username === username;

  const canChangeName = useMemo(() => {
    if (!profileUser?.lastNameUpdate) return { canChange: true, remaining: '' };
    const daysSinceUpdate = differenceInDays(new Date(), profileUser.lastNameUpdate);
    if (daysSinceUpdate >= 7) return { canChange: true, remaining: '' };
    return { canChange: false, remaining: `${7 - daysSinceUpdate} days` };
  }, [profileUser]);

  const canChangeUsername = useMemo(() => {
    if (!profileUser?.lastUsernameUpdate) return { canChange: true, remaining: '' };
    const daysSinceUpdate = differenceInDays(new Date(), profileUser.lastUsernameUpdate);
    if (daysSinceUpdate >= 14) return { canChange: true, remaining: `${14 - daysSinceUpdate} days` };
    return { canChange: false, remaining: `You can change this again in ${14 - daysSinceUpdate} days` };
  }, [profileUser]);

  useEffect(() => {
    if (profileUser && isEditDialogOpen) {
      form.reset({
        name: profileUser.name || "",
        username: profileUser.username || "",
        bio: profileUser.bio || "",
        koFi: profileUser.socialLinks?.koFi || "",
        patreon: profileUser.socialLinks?.patreon || "",
        paypal: profileUser.socialLinks?.paypal || "",
        customLink: profileUser.username === 'monomindai' ? 'https://www.monomindai.com' : (profileUser.socialLinks?.customLink || ""),
        favoriteLink: profileUser.favoriteLink || null,
      });
    }
  }, [profileUser, form, isEditDialogOpen]);
  
  useEffect(() => {
    if (!username) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      setError(null);
      try {
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("username", "==", username), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            setError("User not found.");
            setIsLoadingData(false);
            return;
        }

        const userDoc = userSnapshot.docs[0];
        const data = userDoc.data();
        const foundUser: User = {
            uid: userDoc.id,
            name: data.name,
            email: data.email,
            avatarUrl: data.avatarUrl,
            username: data.username,
            isVerified: data.isVerified,
            subscriptionPlan: data.subscriptionPlan,
            creditsUsed: data.creditsUsed,
            storageUsed: data.storageUsed,
            planDetails: data.planDetails,
            paypalSubscriptionId: data.paypalSubscriptionId,
            bio: data.bio,
            socialLinks: data.socialLinks,
            favoriteLink: data.favoriteLink,
            totalDownloads: data.totalDownloads,
            lastNameUpdate: data.lastNameUpdate ? data.lastNameUpdate.toDate() : undefined,
            lastUsernameUpdate: data.lastUsernameUpdate ? data.lastUsernameUpdate.toDate() : undefined,
        };
        setProfileUser(foundUser);
        
        const presetsQuery = query(collection(db, "community-presets"), where("authorId", "==", foundUser.uid));
        const presetSnap = await getDocs(presetsQuery);
        setPublicPresets(presetSnap.docs.map(d => d.data() as Preset));

        if (loggedInUser?.uid === foundUser.uid) {
            const tablesSnap = await getDocs(collection(db, "users", foundUser.uid, "tables"));
            const tablesData = tablesSnap.docs
                .filter(d => d.data().createdAt && d.data().lastEdited)
                .map(d => {
                    const tableDocData = d.data();
                    return {
                        id: d.id,
                        name: tableDocData.name,
                        fileType: tableDocData.fileType,
                        presetString: tableDocData.presetString,
                        tags: tableDocData.tags,
                        data: tableDocData.data,
                        size: tableDocData.size,
                        createdAt: tableDocData.createdAt.toDate(),
                        lastEdited: tableDocData.lastEdited.toDate(),
                        lastExported: tableDocData.lastExported ? tableDocData.lastExported.toDate() : undefined,
                    } as Table;
                });
            setUserTables(tablesData);
        }

      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("An error occurred while fetching this profile.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [username, loggedInUser?.uid]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!loggedInUser || !isOwnProfile) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    setIsSubmitting(true);
    try {
        const userDocRef = doc(db, "users", loggedInUser.uid);
        const updateData: Record<string, any> = {};
        const socialLinks: Partial<SocialLinks> = {};
        let hasNewSocial = false;
        const now = new Date();
        const isVerified = loggedInUser.isVerified || loggedInUser.username === 'monomindai';

        if (values.name && values.name !== loggedInUser.name) {
            if (!canChangeName.canChange) throw new Error(`You can update your display name again in ${canChangeName.remaining}.`);
            updateData.name = values.name;
            updateData.lastNameUpdate = serverTimestamp();
        }
        const newUsername = values.username === '' ? null : values.username;
        if (newUsername !== undefined && newUsername !== (loggedInUser.username || null)) {
            if (!canChangeUsername.canChange) throw new Error(`You can update your username again in ${canChangeUsername.remaining}.`);
            updateData.username = newUsername;
            updateData.lastUsernameUpdate = serverTimestamp();
        }
        if (values.bio !== undefined) updateData.bio = values.bio;
        if (values.favoriteLink !== undefined) updateData.favoriteLink = values.favoriteLink || null;
        const socialKeys: (keyof SocialLinks)[] = ['koFi', 'patreon', 'paypal', 'customLink'];
        for (const key of socialKeys) {
            if (values[key as keyof typeof values] !== undefined) {
                socialLinks[key as keyof SocialLinks] = values[key as keyof typeof values] || '';
                hasNewSocial = true;
            }
        }
        if (hasNewSocial) updateData.socialLinks = { ...loggedInUser.socialLinks, ...socialLinks };
        if (!isVerified && updateData.socialLinks) delete updateData.socialLinks.customLink;
        if (Object.keys(updateData).length === 0) {
            toast({ title: 'No changes', description: 'No new information was saved.' });
            setIsEditDialogOpen(false);
            return;
        }
        await setDoc(userDocRef, updateData, { merge: true });
        toast({ title: 'Profile Updated!', description: 'Your changes have been saved.' });
        setIsEditDialogOpen(false);
        if (updateData.username) {
            router.push(`/u/${updateData.username}`);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message, duration: 9000 });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (authLoading || isLoadingData) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6 text-center">
        <Card className="max-w-md mx-auto">
            <CardHeader><CardTitle>Profile Not Found</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{error}</p></CardContent>
            <CardFooter>
                 <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                 </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  if (!profileUser) return <LoadingSpinner />;
  
  const isVerified = profileUser.isVerified || profileUser.username === 'monomindai';

  const socialIcons: { [key in FavoriteLink]: React.ReactNode } = {
    koFi: <Coffee className="h-4 w-4 mr-2" />,
    patreon: <Heart className="h-4 w-4 mr-2" />,
    paypal: <Wallet className="h-4 w-4 mr-2" />,
  };
  
  const favoriteSocialLink = profileUser.favoriteLink && profileUser.socialLinks?.[profileUser.favoriteLink];
  const customLinkToDisplay = profileUser.username === 'monomindai' ? 'https://www.monomindai.com' : profileUser.socialLinks?.customLink;


  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 border" data-ai-hint="avatar">
              <AvatarImage src={profileUser.avatarUrl || ''} alt={profileUser.name} />
              <AvatarFallback>{profileUser.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
                <CardTitle className="text-3xl flex items-center gap-2">
                  {profileUser.name}
                  {isVerified && <CheckCircle className="h-6 w-6 text-foreground" />}
                </CardTitle>
                {isOwnProfile && <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4"/>Edit Profile</Button>}
              </div>
              {profileUser.username && <p className="text-muted-foreground">@{profileUser.username}</p>}
              <p className="text-foreground whitespace-pre-wrap">{profileUser.bio || "This user hasn't written a bio yet."}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {favoriteSocialLink && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={favoriteSocialLink} target="_blank" rel="noopener noreferrer">
                      {socialIcons[profileUser.favoriteLink!]}Support Me<ExternalLink className="h-4 w-4 ml-2"/>
                    </a>
                  </Button>
                )}
                {customLinkToDisplay && (
                  <Button asChild variant="outline" size="sm">
                    <a href={customLinkToDisplay} target="_blank" rel="noopener noreferrer">
                      <Link2 className="h-4 w-4 mr-2"/>Website<ExternalLink className="h-4 w-4 ml-2"/>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t pt-4">
              <div className="space-y-1"><p className="text-2xl font-bold">{publicPresets.length}</p><p className="text-sm text-muted-foreground">Public Presets</p></div>
              <div className="space-y-1"><p className="text-2xl font-bold">{profileUser.totalDownloads || 0}</p><p className="text-sm text-muted-foreground">Total Downloads</p></div>
              {isOwnProfile && <div className="space-y-1"><p className="text-2xl font-bold">{userTables.length}</p><p className="text-sm text-muted-foreground">Tables Created</p></div>}
              <div className="space-y-1"><p className="text-2xl font-bold">{profileUser.subscriptionPlan}</p><p className="text-sm text-muted-foreground">Plan</p></div>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="public-presets" className="space-y-4">
          <TabsList>
              <TabsTrigger value="public-presets">Public Presets</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="my-tables">My Tables</TabsTrigger>}
          </TabsList>
          <TabsContent value="public-presets">
               <Card>
                  <CardHeader><CardTitle>Public Presets</CardTitle><CardDescription>Presets shared with the community.</CardDescription></CardHeader>
                  <CardContent>
                      {publicPresets.length > 0 ? (
                           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {publicPresets.map(p => (
                                 <Card key={p.id}>
                                   <CardHeader><CardTitle>{p.name}</CardTitle><CardDescription>{p.description}</CardDescription></CardHeader>
                                   <CardContent className="flex flex-wrap gap-2">{p.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}</CardContent>
                                   <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
                                       <div className="flex items-center gap-1"><Download className="h-4 w-4" /> {p.downloadCount || 0}</div>
                                       <Button variant="ghost" asChild><Link href={`/tables/new?presetId=${p.id}`}>Use</Link></Button>
                                   </CardFooter>
                                 </Card>
                              ))}
                           </div>
                      ) : (
                          <p className="text-muted-foreground text-center py-8">This user hasn't published any presets yet.</p>
                      )}
                  </CardContent>
               </Card>
          </TabsContent>
          {isOwnProfile && <TabsContent value="my-tables">
               <Card>
                  <CardHeader><CardTitle>My Tables</CardTitle><CardDescription>A list of all tables you have created.</CardDescription></CardHeader>
                  <CardContent>
                       {userTables.length > 0 ? (
                           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {userTables.map(t => (
                                 <Card key={t.id}>
                                   <CardHeader>
                                      <CardTitle className="flex items-center gap-2"><TableIcon className="h-5 w-5 text-primary" />{t.name}</CardTitle>
                                      <CardDescription>Last edited: {t.lastEdited.toLocaleDateString()}</CardDescription>
                                   </CardHeader>
                                   <CardContent className="flex flex-wrap gap-2">{t.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}</CardContent>
                                   <CardFooter><Button className="w-full" asChild><Link href={`/tables/${t.id}`}>Open Table</Link></Button></CardFooter>
                                 </Card>
                              ))}
                           </div>
                      ) : (
                          <p className="text-muted-foreground text-center py-8">You haven't created any tables yet. <Link href="/presets" className="text-primary underline">Create one</Link> from a preset to get started.</p>
                      )}
                  </CardContent>
               </Card>
          </TabsContent>}
        </Tabs>
      </div>

      {isOwnProfile && <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle><DialogDescription>Make changes to your public profile here. Click save when you're done.</DialogDescription></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
            <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border"><AvatarImage src={loggedInUser?.avatarUrl || ''} alt={loggedInUser?.name} /><AvatarFallback>{loggedInUser?.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                        <Button type="button" variant="outline" asChild><Link href="/settings">Change Picture</Link></Button>
                    </div>
                </div>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} disabled={!canChangeName.canChange} /></FormControl>{!canChangeName.canChange && <FormDescription>You can change this again in {canChangeName.remaining}.</FormDescription>}<FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="your_unique_username" {...field} value={field.value ?? ''} disabled={!canChangeUsername.canChange}/></FormControl>{!canChangeUsername.canChange && <FormDescription>You can change this again in {canChangeUsername.remaining}.</FormDescription>}<FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem><FormLabel>Bio (120 characters)</FormLabel><FormControl><Textarea maxLength={120} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Social Links</h3>
                  <FormField control={form.control} name="koFi" render={({ field }) => (<FormItem><FormLabel>Ko-fi</FormLabel><FormControl><Input placeholder="https://ko-fi.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="patreon" render={({ field }) => (<FormItem><FormLabel>Patreon</FormLabel><FormControl><Input placeholder="https://patreon.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="paypal" render={({ field }) => (<FormItem><FormLabel>PayPal.Me</FormLabel><FormControl><Input placeholder="https://paypal.me/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  {isVerified && (<FormField control={form.control} name="customLink" render={({ field }) => (<FormItem><FormLabel>Custom Link</FormLabel><FormControl><Input placeholder="https://your-website.com" {...field} value={field.value ?? ''} disabled={loggedInUser?.username === 'monomindai'} /></FormControl><FormMessage /></FormItem>)} />)}
                </div>
                <FormField control={form.control} name="favoriteLink" render={({ field }) => (
                  <FormItem><FormLabel>Favorite Link</FormLabel><FormDescription>Select one link to be highlighted on your profile.</FormDescription>
                    <FormControl><RadioGroup onValueChange={field.onChange} value={field.value || ""} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="koFi" id="r-kofi" /><Label htmlFor="r-kofi" className="cursor-pointer p-2 rounded-md hover:bg-accent"><Coffee className="h-4 w-4" /></Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="patreon" id="r-patreon" /><Label htmlFor="r-patreon" className="cursor-pointer p-2 rounded-md hover:bg-accent"><Heart className="h-4 w-4" /></Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="paypal" id="r-paypal" /><Label htmlFor="r-paypal" className="cursor-pointer p-2 rounded-md hover:bg-accent"><Wallet className="h-4 w-4" /></Label></div>
                    </RadioGroup></FormControl><FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pr-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ?  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}</Button>
                </DialogFooter>
            </form></Form>
          </div>
        </DialogContent>
      </Dialog>}
    </>
  );
}
