'use client';

import { format } from 'date-fns';
import { CreditCard, Download, Loader2 } from 'lucide-react';
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

export default function PaymentsPage() {
  const { data: subscriptions, isLoading } = trpc.subscription.getMySubscriptions.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Payments & Plans</h2>
        <p className="text-muted-foreground">Manage your subscriptions and billing history.</p>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>Your current learning plans.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          {sub.plan?.name || 'Custom Plan'}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(Number(sub.amount))}
                      </TableCell>
                      <TableCell>{format(new Date(sub.nextDueAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sub.status === 'ACTIVE'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-yellow-600'
                          }
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Download className="h-3 w-3" /> Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscriptions?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No active subscriptions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage your saved cards and billing details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Payment method management is handled securely via our payment provider.
            <Button
              variant="link"
              className="p-0 h-auto ml-1"
              onClick={() =>
                toast.info('Payment settings managed by provider', {
                  description: 'Please contact support to update payment methods.',
                })
              }
            >
              Manage Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
