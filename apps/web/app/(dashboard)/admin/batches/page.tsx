'use client';

import { Edit, Loader2, MessageSquare, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { type Batch, BatchDialog } from './batch-dialog';
import { BatchStudentsDialog } from './batch-students-dialog';

type BatchWithDetails = Batch & {
  coachName: string | null;
  studentCount?: number;
};

export default function AdminBatchesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Removed unused date state
  const [selectedBatch, setSelectedBatch] = useState<BatchWithDetails | null>(null);
  const [selectedBatchForStudents, setSelectedBatchForStudents] = useState<BatchWithDetails | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.batch.list.useQuery({
    limit: 100, // Fetch plenty for admin view
  });

  const deleteMutation = trpc.batch.delete.useMutation({
    onSuccess: () => {
      toast.success('Batch deleted successfully');
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (batch: BatchWithDetails) => {
    setSelectedBatch(batch);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBatch(null);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Batch Management</h2>
          <p className="text-muted-foreground">
            Create, manage, and assign coaches to student batches.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Batch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Batches</CardTitle>
          <CardDescription>Overview of all active classes and their assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data?.batches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No batches found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-center">Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {batch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.coachName ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {batch.coachName.substring(0, 2).toUpperCase()}
                          </div>
                          {batch.coachName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{batch.level || 'General'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(() => {
                        try {
                          const s = JSON.parse(batch.schedule || '{}');
                          if (s.days && Array.isArray(s.days)) {
                            // Format: "Tue, Thu, Sat at 17:00"
                            return (
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {s.days.map((d: string) => d.substring(0, 3)).join(', ')}
                                </span>
                                {s.time && (
                                  <span className="text-xs text-muted-foreground">
                                    at {s.time} {s.duration ? `(${s.duration}m)` : ''}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return batch.schedule; // Fallback
                        } catch {
                          return batch.schedule || 'Flexible';
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-medium text-sm">
                          <span
                            className={
                              (batch.studentCount || 0) > (batch.maxStudents || 0)
                                ? 'text-destructive'
                                : 'text-primary'
                            }
                          >
                            {batch.studentCount || 0}
                          </span>
                          <span className="text-muted-foreground mx-1">/</span>
                          <span>{batch.maxStudents || 0}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">Enrolled</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Message Batch"
                        >
                          <Link href={`/chat?roomId=batch:${batch.id}`}>
                            <MessageSquare className="h-4 w-4" />
                            <span className="sr-only">Message Batch</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(batch)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedBatchForStudents(batch)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Manage Students"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span className="sr-only">Manage Students</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(batch.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BatchDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedBatch(null);
        }}
        batch={selectedBatch}
        onSuccess={() => {
          refetch();
        }}
      />

      {selectedBatchForStudents && (
        <BatchStudentsDialog
          open={!!selectedBatchForStudents}
          onOpenChange={(open) => !open && setSelectedBatchForStudents(null)}
          batchId={selectedBatchForStudents.id}
          batchName={selectedBatchForStudents.name}
          onSuccess={() => refetch()}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the batch. Note: You cannot
              delete a batch that has active students assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
