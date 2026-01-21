'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  /* const router = useRouter(); */
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const mutation = trpc.auth.login.useMutation({
    onSuccess: async (data: {
      user: { id: string; email: string; role: 'ADMIN' | 'COACH' | 'CUSTOMER' };
      accessToken: string;
      refreshToken: string;
    }) => {
      login(data.user, data.accessToken);
      // Store refresh token for sliding expiration
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      await queryClient.invalidateQueries();
      toast.success('Welcome back!');

      switch (data.user.role) {
        case 'ADMIN':
          window.location.href = '/admin';
          break;
        case 'COACH':
          window.location.href = '/coach';
          break;
        case 'CUSTOMER':
          window.location.href = '/dashboard';
          break;
        default:
          window.location.href = '/';
      }
    },
    onError: (err: { message: string }) => {
      toast.error('Login Failed', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    mutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Column - Form */}
      <div className="flex flex-col h-full bg-background p-6 lg:p-12 relative overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>

          <div className="mb-10 text-center lg:text-left">
            <div className="h-16 w-16 relative mb-6 mx-auto lg:mx-0">
              <Image src="/logo.png" alt="ICA Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-primary mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-lg">Sign in to your ICA Operations account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-muted-foreground">
              Don't have an account yet?{' '}
              <Link
                href="/demo"
                className="font-semibold text-primary hover:underline transition-colors"
              >
                Book a Free Demo
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} ICA Ops</span>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary">
              Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Visual/Testimonial */}
      <div className="hidden lg:flex relative bg-muted p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-primary/95 z-0"></div>
        <div className="absolute inset-0 bg-[url('/chess-bg-pattern.png')] opacity-10 bg-repeat z-0"></div>

        {/* Decorative Circles */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-secondary mr-2 animate-pulse"></span>
            Elevating Chess Education
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">
            Master the Game. <br />
            <span className="text-secondary">Build Character.</span>
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Join the community of aspiring grandmasters and experience standard-setting coaching.
          </p>
        </div>

        <div className="relative z-10">
          <Card className="bg-white/10 border-white/10 backdrop-blur-md text-white">
            <CardContent className="pt-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static array
                  <CheckCircle2 key={i} className="h-5 w-5 text-secondary fill-secondary/20" />
                ))}
              </div>
              <blockquote className="text-lg font-medium leading-relaxed mb-4">
                "The platform makes managing classes and tracking progress incredibly smooth for
                both coaches and students."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                  VP
                </div>
                <div>
                  <div className="font-semibold">Viraj Pandit</div>
                  <div className="text-sm text-white/60">Founder, Indian Chess Academy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
