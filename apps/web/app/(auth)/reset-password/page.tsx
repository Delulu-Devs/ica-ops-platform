'use client';

import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success('Password Reset Successfully');
      router.push('/login');
    },
    onError: (err: { message: string }) => {
      toast.error('Reset Failed', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid token');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    mutation.mutate({ token, newPassword: password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or missing a token.
          </p>
          <Link href="/forgot-password">
            <Button>Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Column - Form */}
      <div className="flex flex-col h-full bg-background p-6 lg:p-12 relative overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>

          <div className="mb-10 text-center lg:text-left">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 mx-auto lg:mx-0">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-primary mb-2">
              Set New Password
            </h1>
            <p className="text-muted-foreground text-lg">
              Please choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button
              className="w-full h-12 text-base font-semibold"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Column - Visual */}
      <div className="hidden lg:flex relative bg-muted p-12 flex-col justify-end overflow-hidden">
        <div className="absolute inset-0 bg-primary/95 z-0"></div>
        <div className="absolute inset-0 bg-[url('/chess-bg-pattern.png')] opacity-10 bg-repeat z-0"></div>

        {/* Decorative Circles */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl"></div>

        <div className="relative z-10 text-white">
          <div className="mb-6">
            <Image
              src="/logo.png"
              alt="ICA Logo"
              width={80}
              height={80}
              className="opacity-80 brightness-0 invert"
            />
          </div>
          <h2 className="text-3xl font-bold mb-4">Almost There</h2>
          <p className="text-white/70 max-w-sm">
            Secure your account with a new password and get back to mastering the game.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
