'use client';

import { Loader2, Minus, Plus, Search, User } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';

interface BatchStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  batchName: string;
  onSuccess: () => void;
}

export function BatchStudentsDialog({
  open,
  onOpenChange,
  batchId,
  batchName,
  onSuccess,
}: BatchStudentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  // Get students currently in this batch
  const {
    data: currentStudents,
    isLoading: isCurrentLoading,
    refetch: refetchCurrent,
  } = trpc.batch.getStudents.useQuery({ batchId }, { enabled: open });

  // Search for potential students to add
  const { data: searchResults, isLoading: isSearchLoading } = trpc.student.list.useQuery(
    {
      search: searchQuery,
      studentType: 'GROUP',
      status: 'ACTIVE',
      limit: 10,
    },
    { enabled: open && searchQuery.length > 1 }
  );

  const addMutation = trpc.student.assignBatch.useMutation({
    onSuccess: () => {
      toast.success('Student added to batch');
      refetchCurrent();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = trpc.student.removeFromBatch.useMutation({
    onSuccess: () => {
      toast.success('Student removed from batch');
      setRemoveId(null);
      refetchCurrent();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAdd = (studentId: string) => {
    addMutation.mutate({ id: studentId, batchId });
  };

  const handleRemove = () => {
    if (removeId) {
      removeMutation.mutate({ id: removeId });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-[600px] max-w-none sm:max-w-[600px] max-h-[85vh] flex flex-col p-4 sm:p-6 gap-4">
          <DialogHeader>
            <DialogTitle>Manage Students - {batchName}</DialogTitle>
            <DialogDescription>Add or remove students from this batch.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Current Students</TabsTrigger>
              <TabsTrigger value="add">Add Student</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="flex-1 overflow-hidden flex flex-col mt-4">
              {isCurrentLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !currentStudents?.students || currentStudents.students.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[200px]">
                  <User className="h-10 w-10 mb-2 opacity-50" />
                  <p>No students in this batch.</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4 -mr-4">
                  <div className="space-y-2">
                    {currentStudents.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${student.studentName}`}
                            />
                            <AvatarFallback>
                              {student.studentName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{student.studentName}</div>
                            <div className="text-xs text-muted-foreground">
                              {student.level || 'No Level'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setRemoveId(student.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="add" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery.length < 2 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[200px]">
                  <Search className="h-10 w-10 mb-2 opacity-50" />
                  <p>Type at least 2 characters to search.</p>
                </div>
              ) : isSearchLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : searchResults?.students.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[200px]">
                  <p>No active GROUP students found matching "{searchQuery}".</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4 -mr-4">
                  <div className="space-y-2">
                    {searchResults?.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${student.studentName}`}
                            />
                            <AvatarFallback>
                              {student.studentName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{student.studentName}</div>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>{student.level || 'No Level'}</span>
                              {student.assignedBatchId && (
                                <span className="text-amber-500 font-medium">Already in batch</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          disabled={!!student.assignedBatchId || addMutation.isPending}
                          variant={student.assignedBatchId ? 'outline' : 'secondary'}
                          size="sm"
                          onClick={() => handleAdd(student.id)}
                        >
                          {addMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1" />
                          )}
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student from batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unassign the student from this batch. They will remain active but
              unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
