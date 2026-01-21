'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';

export type Batch = {
  id: string;
  name: string;
  coachId: string;
  level: string | null;
  timezone: string | null;
  schedule: string | null;
  maxStudents: number | null;
};

interface BatchDialogProps {
  batch: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchDialog({ batch, open, onOpenChange, onSuccess }: BatchDialogProps) {
  const isEditing = !!batch;
  const [formData, setFormData] = useState({
    name: batch?.name || '',
    coachId: batch?.coachId || '',
    level: batch?.level || '',
    timezone: batch?.timezone || '',
    schedule: batch?.schedule || '',
    maxStudents: batch?.maxStudents || 10,
  });

  const utils = trpc.useUtils();
  const { data: coachesData, isLoading: isLoadingCoaches } = trpc.coach.list.useQuery({
    limit: 100,
  });

  const createMutation = trpc.batch.create.useMutation({
    onSuccess: () => {
      toast.success('Batch created successfully');
      utils.batch.list.invalidate();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.batch.update.useMutation({
    onSuccess: () => {
      toast.success('Batch updated successfully');
      utils.batch.list.invalidate();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate({
        id: batch.id,
        name: formData.name,
        level: formData.level || undefined,
        timezone: formData.timezone || undefined,
        schedule: formData.schedule || undefined,
        maxStudents: Number(formData.maxStudents),
      });
      // Handle coach reassignment separately if needed, but for now allow editing only basic info
      // Reassigning coach is a separate mutation in the backend, we can trigger it if changed
      if (formData.coachId !== batch.coachId) {
        reassignMutation.mutate({
          id: batch.id,
          coachId: formData.coachId,
        });
      }
    } else {
      createMutation.mutate({
        name: formData.name,
        coachId: formData.coachId,
        level: formData.level || undefined,
        timezone: formData.timezone || undefined,
        schedule: formData.schedule || undefined,
        maxStudents: Number(formData.maxStudents),
      });
    }
  };

  const reassignMutation = trpc.batch.reassignCoach.useMutation({
    onSuccess: () => {
      // Silent success or separate toast
    },
    onError: (error) => toast.error(`Failed to reassign coach: ${error.message}`),
  });

  const isPending =
    createMutation.isPending || updateMutation.isPending || reassignMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Batch' : 'Create New Batch'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the batch details below.'
              : 'Fill in the details to create a new batch.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Beginners Batch A"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="coach">Assign Coach</Label>
              <Select
                value={formData.coachId}
                onValueChange={(value) => setFormData({ ...formData, coachId: value })}
                disabled={isLoadingCoaches}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coachesData?.coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxStudents">Max Students</Label>
                <Input
                  id="maxStudents"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.maxStudents}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxStudents: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule">Schedule (e.g., "Mon, Wed 10am")</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="Mon, Wed 10:00 AM"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
