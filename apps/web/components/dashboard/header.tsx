'use client';

import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/useAuthStore';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Optional: Pre-fetch or sync user state if needed, but Zustand persistence handles most

  const handleLogout = () => {
    logout();
    router.push('/login'); // or root
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-xl">
          {user?.role === 'ADMIN'
            ? 'Admin Dashboard'
            : user?.role === 'COACH'
              ? 'Coach Portal'
              : 'Student Dashboard'}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden md:inline-block">{user?.email}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/01.png" alt={user?.email || 'User'} />
                <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
