
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Bot, Code, FileText, ShieldCheck, Sigma, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth-provider";


const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <Card className="text-left">
    <CardHeader className="flex flex-row items-center gap-4">
      {icon}
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const TestimonialCard = ({ quote, name, title, avatarSrc }: { quote: string, name: string, title: string, avatarSrc: string }) => (
    <Card className="flex flex-col">
        <CardContent className="pt-6 flex-grow">
             <div className="flex mb-2">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-primary text-primary" />)}
            </div>
            <p className="text-muted-foreground">"{quote}"</p>
        </CardContent>
        <CardFooter className="flex items-center gap-4">
            <Avatar className="h-12 w-12" data-ai-hint="avatar">
                <AvatarImage src={avatarSrc} alt={name} />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">{title}</p>
            </div>
        </CardFooter>
    </Card>
);


export default function LandingPage() {
  const { user } = useAuth();
  const getStartedLink = user ? "/dashboard" : "/login";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Sigma className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold">Data Weaver</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href={getStartedLink}>Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4">
            Structure Your Data, Unleashed
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
            Data Weaver is an intuitive tool that helps you create structured data files with a flexible GUI and the power of generative AI. Go from idea to data in seconds.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
                <Link href={getStartedLink}>Get Started for Free</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Why Data Weaver?</h2>
              <p className="max-w-xl mx-auto text-muted-foreground mt-4">
                Stop fighting with manual data formatting. Start creating with intelligent tools.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               <FeatureCard 
                icon={<Bot size={32} className="text-primary" />}
                title="AI-Powered Presets"
                description="Describe the data structure you need in plain English, and let our AI generate a reusable preset for you instantly."
              />
              <FeatureCard 
                icon={<FileText size={32} className="text-primary" />}
                title="Flexible Exports"
                description="Define custom export templates. Generate JSONL for AI training, Markdown for your notes, CSV for spreadsheets, and more."
              />
              <FeatureCard 
                icon={<ShieldCheck size={32} className="text-primary" />}
                title="Secure and Reliable"
                description="Your data is stored securely with industry-standard encryption. Rely on our robust infrastructure for consistent performance."
              />
            </div>
          </div>
        </section>
        
        {/* How it works */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left">
                    <h2 className="text-3xl md:text-4xl font-bold">Simple Steps, Powerful Results</h2>
                    <p className="text-muted-foreground mt-4 mb-8 max-w-xl mx-auto lg:mx-0">
                        Our intuitive workflow makes data generation a breeze.
                    </p>
                    <ul className="space-y-6 text-left">
                        <li className="flex items-start">
                            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold mr-4">1</div>
                            <div>
                                <h3 className="font-semibold">Choose or Create a Preset</h3>
                                <p className="text-muted-foreground">Select from community presets or generate your own with AI to define your data schema.</p>
                            </div>
                        </li>
                         <li className="flex items-start">
                            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold mr-4">2</div>
                            <div>
                                <h3 className="font-semibold">Add Your Data</h3>
                                <p className="text-muted-foreground">Use our clean, responsive table editor to populate your dataset quickly.</p>
                            </div>
                        </li>
                         <li className="flex items-start">
                            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold mr-4">3</div>
                            <div>
                                <h3 className="font-semibold">Export Your File</h3>
                                <p className="text-muted-foreground">Download your structured data in the format you defined, ready for use anywhere.</p>
                            </div>
                        </li>
                    </ul>
                </div>
                 <div className="relative h-80 md:h-96">
                   <Image src="https://placehold.co/600x400.png" layout="fill" objectFit="contain" alt="Data Weaver Screenshot" className="rounded-lg shadow-xl" data-ai-hint="data interface" />
                </div>
            </div>
        </section>
        
        {/* Testimonials Section */}
        <section id="testimonials" className="bg-muted py-20 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">Loved by Creators and Developers</h2>
                    <p className="max-w-xl mx-auto text-muted-foreground mt-4">Don't just take our word for it. Here's what our users are saying.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <TestimonialCard 
                        name="Alex Rivera"
                        title="AI Researcher"
                        avatarSrc="https://placehold.co/100x100.png"
                        quote="Data Weaver saved me countless hours preparing datasets. The AI preset generator is pure magic."
                    />
                     <TestimonialCard 
                        name="Samantha Chen"
                        title="Indie Developer"
                        avatarSrc="https://placehold.co/100x100.png"
                        quote="I needed a flexible way to generate structured text for my app. Data Weaver was the perfect, no-fuss solution."
                    />
                     <TestimonialCard 
                        name="David Lee"
                        title="Content Strategist"
                        avatarSrc="https://placehold.co/100x100.png"
                        quote="The ability to define my own export templates is a game-changer for my content workflows. Highly recommended!"
                    />
                </div>
            </div>
        </section>
        
        {/* FAQ Section */}
        <section id="faq" className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
             <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
              <p className="max-w-xl mx-auto text-muted-foreground mt-4">
                Have questions? We have answers.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>What file formats can I export?</AccordionTrigger>
                        <AccordionContent>
                           You can export to any text-based format! The power of Data Weaver is that you define the export structure yourself. Popular choices include JSONL, CSV, Markdown, plain text, and even custom code scaffolds.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>How does the AI preset generator work?</AccordionTrigger>
                        <AccordionContent>
                            You simply describe the data you want to create in plain English (e.g., "a list of users with a name, email, and age, exported as CSV"). Our AI model then analyzes your description and automatically generates the corresponding preset string for you to use or customize further.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>Is my data secure?</AccordionTrigger>
                        <AccordionContent>
                           Yes, security is our top priority. All your data is stored securely and is encrypted at rest and in transit. We use industry-standard practices to ensure your information remains safe.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-4">
                        <AccordionTrigger>What are credits and how are they used?</AccordionTrigger>
                        <AccordionContent>
                           Credits are used for data-intensive operations. Primarily, 1 credit is used for each line of data you export. Higher-tier plans come with more credits, and the Enterprise plan offers unlimited usage.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>

         {/* CTA Section */}
        <section className="bg-muted">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Weave Your Data?</h2>
            <p className="max-w-xl mx-auto text-muted-foreground mb-8">
              Sign up today and go from idea to structured data in minutes.
            </p>
            <Button size="lg" asChild>
              <Link href={getStartedLink}>Start for Free</Link>
            </Button>
          </div>
        </section>

      </main>

      <footer className="bg-background border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Data Weaver. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
