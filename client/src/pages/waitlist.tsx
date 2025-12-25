import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Check, ArrowLeft, Users, Zap, BarChart3, Warehouse } from "lucide-react";
import { Link } from "wouter";

const platforms = [
  { value: "amazon_vine", label: "Amazon Vine" },
  { value: "amazon_influencer", label: "Amazon Influencer Program" },
  { value: "tiktok_shop", label: "TikTok Shop" },
  { value: "youtube", label: "YouTube Reviews" },
  { value: "instagram", label: "Instagram Creator" },
  { value: "other", label: "Other Platform" },
];

const features = [
  { icon: Package, title: "Inventory Tracking", description: "Track items from order to review completion" },
  { icon: Warehouse, title: "Smart Storage", description: "Optimize your storage space with AI suggestions" },
  { icon: BarChart3, title: "Analytics", description: "Track trends, values, and review performance" },
  { icon: Zap, title: "AI Assistant", description: "Get pricing suggestions and review reminders" },
];

export default function WaitlistPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [interestedFeatures, setInterestedFeatures] = useState("");

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; platform: string; interestedFeatures?: string }) => {
      const response = await apiRequest("POST", "/api/waitlist", data);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "You're on the list!", description: "We'll notify you when ReviewTrack launches." });
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !platform) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    signupMutation.mutate({ email, platform, interestedFeatures: interestedFeatures || undefined });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're on the list!</h2>
            <p className="text-muted-foreground mb-6">
              Thanks for your interest in ReviewTrack. We'll email you when we launch.
            </p>
            <Button asChild variant="outline" data-testid="button-back-home">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">ReviewTrack</span>
          </Link>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </header>

        <main className="relative z-10 px-6 py-12 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  Join the Waitlist
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Be the first to know when ReviewTrack launches. Get early access and exclusive launch discounts.
                </p>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Join 500+ creators waiting for launch</span>
                  </div>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {features.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3 rounded-lg border p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Get Early Access</CardTitle>
                    <CardDescription>
                      Sign up to be notified when we launch and receive exclusive early access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          data-testid="input-waitlist-email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="platform">Which platform do you use? *</Label>
                        <Select value={platform} onValueChange={setPlatform} required>
                          <SelectTrigger id="platform" data-testid="select-waitlist-platform">
                            <SelectValue placeholder="Select your platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {platforms.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="features">What features are most important to you? (optional)</Label>
                        <Textarea
                          id="features"
                          placeholder="Tell us what features would help your workflow..."
                          value={interestedFeatures}
                          onChange={(e) => setInterestedFeatures(e.target.value)}
                          className="min-h-[100px]"
                          data-testid="input-waitlist-features"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={signupMutation.isPending}
                        data-testid="button-waitlist-submit"
                      >
                        {signupMutation.isPending ? "Joining..." : "Join the Waitlist"}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        We'll never spam you. Unsubscribe anytime.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>

        <footer className="relative z-10 border-t px-6 py-8 text-center text-sm text-muted-foreground md:px-12">
          <p>ReviewTrack - Inventory Management for Product Reviewers & Creators</p>
        </footer>
      </div>
    </div>
  );
}
