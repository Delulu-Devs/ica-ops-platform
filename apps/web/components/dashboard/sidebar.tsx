'use client';

import {
  BarChart3,
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);

  const links = [
    {
      href: role === 'ADMIN' ? '/admin' : role === 'COACH' ? '/coach' : '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'COACH', 'CUSTOMER'],
    },
    {
      href: '/admin/students',
      label: 'Students',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      href: '/admin/coaches',
      label: 'Coaches',
      icon: GraduationCap,
      roles: ['ADMIN'],
    },
    {
      href: '/admin/demos',
      label: 'Demos',
      icon: Calendar,
      roles: ['ADMIN'],
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: BarChart3,
      roles: ['ADMIN'],
    },
    {
      href: '/coach/schedule',
      label: 'Schedule',
      icon: Calendar,
      roles: ['COACH'],
    },
    {
      href: '/coach/students',
      label: 'My Students',
      icon: Users,
      roles: ['COACH'],
    },
    {
      href: '/dashboard/schedule',
      label: 'Schedule',
      icon: Calendar,
      roles: ['CUSTOMER'],
    },
    {
      href: '/dashboard/payments',
      label: 'Payments',
      icon: CreditCard,
      roles: ['CUSTOMER'],
    },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(role || ''));

  return (
    <div className="hidden border-r bg-card md:block w-64 flex-shrink-0">
      <div className="flex h-16 items-center border-b px-6">
        <Trophy className="h-6 w-6 text-primary mr-2" />
        <span className="font-bold text-lg text-primary">ICA Platform</span>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {filteredLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                pathname === link.href ? 'bg-muted text-primary' : 'text-muted-foreground'
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
