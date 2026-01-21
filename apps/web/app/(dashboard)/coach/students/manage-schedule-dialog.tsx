'use client';

import { Calendar, Link as LinkIcon, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';

interface ManageScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    studentName: string;
    meetingLink?: string | null;
    recurringSchedule?: string | null;
  };
  onSuccess: () => void;
}

export function ManageScheduleDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: ManageScheduleDialogProps) {
  const [meetingLink, setMeetingLink] = useState(student.meetingLink || '');
  const [schedule, setSchedule] = useState(student.recurringSchedule || '');

  const utils = trpc.useUtils();
  const mutation = trpc.student.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success('Schedule updated successfully');
      utils.student.list.invalidate();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('Failed to update schedule', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      id: student.id,
      meetingLink: meetingLink || '',
      recurringSchedule: schedule || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Schedule for {student.studentName}</DialogTitle>
          <DialogDescription>
            Update the meeting link and recurring schedule details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meetingLink" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" /> Meeting Link
            </Label>
            <Input
              id="meetingLink"
              placeholder="https://zoom.us/j/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The permanent link for your 1-1 sessions.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Recurring Schedule
            </Label>
            <Textarea
              id="schedule"
              placeholder="e.g. Every Monday at 4:00 PM EST"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Describe when your sessions usually take place.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
