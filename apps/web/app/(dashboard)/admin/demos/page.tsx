'use client';

import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle,
  Clock,
  MoreHorizontal,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import { OutcomeDialog } from './outcome-dialog';

export default function DemosPage() {
  const [page, setPage] = useState(0);
  const [outcomeDemoId, setOutcomeDemoId] = useState<string | null>(null);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const limit = 10;

  const { data, isLoading, refetch } = trpc.demo.list.useQuery({
    limit,
    offset: page * limit,
  });

  const updateStatusMutation = trpc.demo.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated successfully');
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to update status', { description: err.message });
    },
  });

  const handleStatusUpdate = (id: string, status: any) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  const openOutcomeDialog = (id: string) => {
    setOutcomeDemoId(id);
    setOutcomeDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80';
      case 'ATTENDED':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80';
      case 'INTERESTED':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100/80';
      case 'CONVERTED':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Demos Management</h2>
          <p className="text-muted-foreground">
            Manage scheduled demos, track attendance, and monitor conversions.
          </p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Demo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Demos</CardTitle>
          <CardDescription>
            A list of all demos including student details and current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Scheduled Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading demos...
                  </TableCell>
                </TableRow>
              ) : data?.demos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No demos found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.demos.map((demo) => (
                  <TableRow key={demo.id}>
                    <TableCell className="font-medium">{demo.studentName}</TableCell>
                    <TableCell>{demo.parentName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(demo.scheduledStart), 'PPP')}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(demo.scheduledStart), 'p')} -{' '}
                          {format(new Date(demo.scheduledEnd), 'p')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('font-medium', getStatusColor(demo.status))}
                      >
                        {demo.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(demo.id, 'ATTENDED')}
                            disabled={demo.status === 'ATTENDED'}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Mark Attended
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openOutcomeDialog(demo.id)}
                            disabled={demo.status !== 'ATTENDED'}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                            Submit Outcome
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(demo.id, 'NO_SHOW')}
                            disabled={demo.status === 'NO_SHOW'}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Mark No Show
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(demo.id, 'CANCELLED')}
                            disabled={['CANCELLED', 'CONVERTED'].includes(demo.status)}
                          >
                            <Clock className="mr-2 h-4 w-4 text-gray-600" />
                            Cancel Demo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || data.demos.length < limit || isLoading}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <OutcomeDialog
        open={outcomeDialogOpen}
        onOpenChange={setOutcomeDialogOpen}
        demoId={outcomeDemoId}
        onSuccess={refetch}
      />
    </div>
  );
}
