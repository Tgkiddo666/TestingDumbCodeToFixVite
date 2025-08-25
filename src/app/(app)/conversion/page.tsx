'use client';

import React, { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';
import { convertFile } from '@/app/actions/convert';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileCog,
  Loader2,
  Upload,
  Download,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { ConvertFileOutput } from '@/ai/flows/convert-file-flow';

function ConversionTool() {
  const { user } = useAuth();
  const [initialState, action] = useActionState(convertFile, { error: undefined, data: undefined });
  const [result, setResult] = useState<ConvertFileOutput | undefined>();
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();
  const isPaidUser = user?.subscriptionPlan !== 'Free';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName('');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.convertedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Download Started', description: `Downloading ${result.fileName}` });
  };
  
  React.useEffect(() => {
    if (initialState.error) {
       toast({ variant: 'destructive', title: 'Conversion Failed', description: initialState.error });
    }
    if(initialState.data) {
        setResult(initialState.data);
        toast({ title: 'Conversion Successful!', description: 'Your file is ready for download.' });
    }
  }, [initialState, toast]);

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">AI File Converter</h2>
            {!isPaidUser && (
              <Badge variant="outline" className="border-primary text-primary">Premium</Badge>
            )}
        </div>
      </div>
       <p className="text-muted-foreground">
            Transform any text file into structured data with AI.
        </p>
        
      <form action={action}>
        <Card>
          <fieldset disabled={!isPaidUser}>
            <CardHeader>
              <CardTitle>1. Upload Your File</CardTitle>
              <CardDescription>
                Select any text-based file (.txt, .csv, .md, etc.) from your
                computer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPaidUser && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Upgrade to Unlock</AlertTitle>
                  <AlertDescription>
                    This is a premium feature. Please <Link href="/pricing" className="font-bold text-primary hover:underline">upgrade your plan</Link> to use the AI File Converter.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="file-upload">File</Label>
                <div className="flex items-center gap-2">
                  <Input id="file-upload" name="file" type="file" required onChange={handleFileChange} />
                </div>
                {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">2. Describe the Output</Label>
                <Textarea
                  id="prompt"
                  name="prompt"
                  required
                  className="min-h-[100px]"
                  placeholder={
                    'e.g., "Create a JSONL file for AI training. Use the content from lines starting with Q: as the \'prompt\' and lines starting with A: as the \'completion\'."'
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              <SubmitButton />
            </CardFooter>
          </fieldset>
        </Card>
      </form>
      
      {result && (
         <Card>
            <CardHeader>
                <CardTitle>3. Download Your File</CardTitle>
                <CardDescription>Your file has been successfully converted and is ready for download.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Download className="h-4 w-4" />
                    <AlertTitle>{result.fileName}</AlertTitle>
                    <AlertDescription>
                        Click the button below to save the converted file to your device.
                    </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter>
                <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
            </CardFooter>
        </Card>
      )}

    </div>
  );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="ml-auto">
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Convert File
        </Button>
    )
}

export default function ConversionPage() {
  return <ConversionTool />;
}
