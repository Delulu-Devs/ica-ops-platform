'use client';

import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type Subscription = {
  id: string;
  accountEmail: string | null;
  planName: string | null;
  amount: string;
  billingCycle: string;
  status: string;
  nextDueAt: string;
};

export default function AdminFinancePage() {
  const [page] = useState(0);
  const utils = trpc.useUtils();
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = trpc.subscription.list.useQuery({
    limit: 50,
    offset: page * 50,
  });

  const { data: stats, isLoading: isStatsLoading } = trpc.subscription.getStats.useQuery();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const { subscriptions } = await utils.subscription.list.fetch({
        limit: 1000,
        offset: 0,
      });

      if (!subscriptions || subscriptions.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Convert to CSV
      const headers = ['ID', 'Email', 'Plan', 'Amount', 'Billing Cycle', 'Status', 'Next Due'];
      const rows = subscriptions.map((sub) => [
        sub.id,
        sub.accountEmail || '',
        sub.planName || '',
        sub.amount,
        sub.billingCycle,
        sub.status,
        format(new Date(sub.nextDueAt), 'yyyy-MM-dd'),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `subscriptions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Failed to export CSV');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Finance & Subscriptions
          </h2>
          <p className="text-muted-foreground">
            Monitor revenue, subscription status, and billing cycles.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Monthly)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `$${stats?.monthlyRevenue.toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">Est. from active subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                stats?.activeSubscriptions
              )}
            </div>
            <p className="text-xs text-muted-foreground">Current active students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div
              className={cn('text-2xl font-bold', (stats?.pastDue || 0) > 0 && 'text-destructive')}
            >
              {isStatsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.pastDue}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.activePlans}
            </div>
            <p className="text-xs text-muted-foreground">Pricing tiers active</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Subscriptions</CardTitle>
          <CardDescription>
            A list of all student subscriptions and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data?.subscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No subscriptions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subscriptions.map((sub: Subscription) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.accountEmail}</TableCell>
                    <TableCell>{sub.planName}</TableCell>
                    <TableCell>${sub.amount}</TableCell>
                    <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                    <TableCell>
                      <Badge
                        variant={sub.status === 'ACTIVE' ? 'default' : 'destructive'}
                        className={cn(sub.status === 'ACTIVE' && 'bg-green-600 hover:bg-green-700')}
                      >
                        {sub.status === 'ACTIVE' && <CheckCircle className="mr-1 h-3 w-3" />}
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(sub.nextDueAt), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
