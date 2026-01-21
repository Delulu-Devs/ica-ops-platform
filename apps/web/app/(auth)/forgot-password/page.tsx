'use client';

import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const mutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success('Reset email sent');
    },
    onError: (err: { message: string }) => {
      toast.error('Request Failed', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate({ email });
  };

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
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-primary mb-2">
              Forgot Password?
            </h1>
            <p className="text-muted-foreground text-lg">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {!isSubmitted ? (
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

              <Button
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                size="lg"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 text-green-700 p-6 rounded-lg text-center">
              <h3 className="font-semibold text-lg mb-2">Check your email</h3>
              <p>
                We have sent a password reset link to <strong>{email}</strong>. Please check your
                inbox and spam folder.
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => setIsSubmitted(false)}
              >
                Try another email
              </Button>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ICA Ops
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
          <h2 className="text-3xl font-bold mb-4">Secure & Reliable</h2>
          <p className="text-white/70 max-w-sm">
            We prioritize the security of your data. Follow the instructions sent to your email to
            regain access to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
