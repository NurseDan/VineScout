import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ScanBarcode, Warehouse, BarChart3, Tag, Upload, Shield, Clock, ArrowRight, Users } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  const features = [
    {
      icon: Package,
      title: "Inventory Tracking",
      description: "Track all your review items from order to completion with ease",
    },
    {
      icon: ScanBarcode,
      title: "Barcode Scanning",
      description: "Quick item lookup using USB barcode scanners or manual entry",
    },
    {
      icon: Warehouse,
      title: "Storage Management",
      description: "Configure physical storage units and find optimal placement for packages",
    },
    {
      icon: Clock,
      title: "Review Deadlines",
      description: "Never miss a review deadline with automatic tracking and reminders",
    },
    {
      icon: Tag,
      title: "Label Printing",
      description: "Generate and print Dymo-compatible labels for organized storage",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Track your review completion rates, item values, and trends over time",
    },
  ];

  const platforms = [
    "Amazon Vine",
    "Amazon Influencer",
    "TikTok Shop",
    "YouTube Reviews",
    "Instagram Creators",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">ReviewTrack</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild data-testid="button-waitlist-header">
              <Link href="/waitlist">Join Waitlist</Link>
            </Button>
            <Button asChild data-testid="button-login-header">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </header>

        <main className="relative z-10">
          <section className="px-6 py-16 text-center md:px-12 md:py-24">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              The Ultimate Tool for
              <br />
              <span className="text-primary">Product Reviewers & Creators</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Track inventory, manage storage, generate labels, and never miss a review deadline.
              Built for Amazon Vine, Influencer Program, TikTok Shop, and more.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started Free</a>
              </Button>
            </div>
          </section>

          <section className="px-6 py-16 md:px-12">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-12 text-center text-3xl font-bold">
                Everything You Need to Stay Organized
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <Card key={feature.title} className="border-0 bg-card/50">
                    <CardHeader>
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-16 md:px-12">
            <div className="mx-auto max-w-4xl">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
                  <Shield className="h-12 w-12 text-primary" />
                  <h2 className="text-2xl font-bold md:text-3xl">
                    Secure & Private
                  </h2>
                  <p className="max-w-xl text-muted-foreground">
                    Your data is stored securely and only accessible to you. 
                    Sign in with your Replit account to get started in seconds.
                  </p>
                  <Button size="lg" asChild data-testid="button-sign-up">
                    <a href="/api/login">Create Your Account</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t px-6 py-8 text-center text-sm text-muted-foreground md:px-12">
          <p>ReviewTrack - Inventory Management for Product Reviewers & Creators</p>
        </footer>
      </div>
    </div>
  );
}
