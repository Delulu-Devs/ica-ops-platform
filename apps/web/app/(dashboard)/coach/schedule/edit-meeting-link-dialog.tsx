'use client';

import { Link, Loader2 } from 'lucide-react';
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
import { trpc } from '@/lib/trpc';

interface EditMeetingLinkDialogProps {
  demoId: string;
  currentLink: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditMeetingLinkDialog({
  demoId,
  currentLink,
  open,
  onOpenChange,
  onSuccess,
}: EditMeetingLinkDialogProps) {
  const [meetingLink, setMeetingLink] = useState(currentLink || '');

  const updateLinkMutation = trpc.demo.updateMeetingLink.useMutation({
    onSuccess: () => {
      toast.success('Meeting link updated');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingLink) return;

    updateLinkMutation.mutate({
      id: demoId,
      meetingLink,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Meeting Link</DialogTitle>
          <DialogDescription>
            Update the meeting link for this session. The student will be notified if you change
            this before the session starts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="meetingLink">Meeting URL</Label>
            <div className="relative">
              <Link className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://meet.google.com/..."
                className="pl-9"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateLinkMutation.isPending}>
              {updateLinkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
