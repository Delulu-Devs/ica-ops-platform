'use client';

import { Eye, EyeOff, Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const mutation = trpc.auth.login.useMutation({
    onSuccess: (data: {
      user: { id: string; email: string; role: 'ADMIN' | 'COACH' | 'CUSTOMER' };
      accessToken: string;
    }) => {
      login(data.user, data.accessToken);
      toast.success('Welcome back!');

      switch (data.user.role) {
        case 'ADMIN':
          router.push('/admin');
          break;
        case 'COACH':
          router.push('/coach');
          break;
        case 'CUSTOMER':
          router.push('/dashboard');
          break;
        default:
          router.push('/');
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 font-sans">
      <Card className="w-full max-w-md shadow-lg border-0 bg-background">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
              <Trophy className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access the ICA Operations Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="coach@chessacademy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
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
                  className="pr-10"
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
              className="w-full font-bold text-md h-11"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center">
            <div className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/demo" className="font-medium text-primary hover:underline">
                Book a demo
              </Link>{' '}
              (Students)
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
