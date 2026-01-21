'use client';

import { format } from 'date-fns';
import { CheckCircle, FileText, Filter, Loader2, MoreHorizontal, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export default function ReviewRequestsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog State
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    studentName: string;
    status: ReviewStatus;
    adminNotes?: string | null;
  } | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const limit = 20;

  const { data, isLoading, refetch } = trpc.student.listReviewRequests.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter !== 'ALL' ? (statusFilter as ReviewStatus) : undefined,
  });

  const updateStatusMutation = trpc.student.updateReviewRequestStatus.useMutation({
    onSuccess: () => {
      toast.success('Request updated successfully');
      setNotes('');
      setIsNotesDialogOpen(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to update request', { description: err.message });
    },
  });

  const handleStatusUpdate = (id: string, status: ReviewStatus, notes?: string) => {
    updateStatusMutation.mutate({ id, status, adminNotes: notes });
  };

  const openNotesDialog = (req: {
    id: string;
    studentName: string;
    status: ReviewStatus;
    adminNotes?: string | null;
  }) => {
    setSelectedRequest(req);
    setNotes(req.adminNotes || '');
    setIsNotesDialogOpen(true);
  };

  const handleNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    // If we're just editing notes, keep status same.
    // Usually notes are added when changing status or just adding info.
    // For now, let's assume this dialog allows updating notes without changing status,
    // OR we could use it for approval flow.
    // Let's just update notes and keep status same for now.
    handleStatusUpdate(selectedRequest.id, selectedRequest.status, notes);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Review Requests</h2>
          <p className="text-muted-foreground mt-1">Manage student review session requests.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle>Requests</CardTitle>
          <CardDescription>List of student requests for review sessions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Review Reason</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin Notes</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No requests found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-medium">{req.studentName}</TableCell>
                    <TableCell className="max-w-xs truncate" title={req.reason || ''}>
                      {req.reason || '-'}
                    </TableCell>
                    <TableCell>{format(new Date(req.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('font-normal border', getStatusColor(req.status))}
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground italic">
                      {req.adminNotes || '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
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
                            onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                            disabled={req.status === 'APPROVED' || req.status === 'COMPLETED'}
                            className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(req.id, 'COMPLETED')}
                            disabled={req.status !== 'APPROVED'}
                            className="text-green-600 focus:text-green-700 focus:bg-green-50"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                            disabled={req.status === 'REJECTED' || req.status === 'COMPLETED'}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openNotesDialog(req)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Add/Edit Notes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Notes</DialogTitle>
            <DialogDescription>
              Add internal notes for {selectedRequest?.studentName}'s request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNotesSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notes</Label>
              <Textarea
                id="adminNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes here..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Save Notes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
