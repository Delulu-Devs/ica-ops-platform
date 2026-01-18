'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';

interface OutcomeDialogProps {
  demoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OutcomeDialog({
  demoId,
  open,
  onOpenChange,
  onSuccess,
}: OutcomeDialogProps) {
  const [status, setStatus] = useState<'INTERESTED' | 'NOT_INTERESTED'>(
    'INTERESTED'
  );
  const [studentType, setStudentType] = useState<'1-1' | 'GROUP'>('GROUP');
  const [level, setLevel] = useState('');
  const [notes, setNotes] = useState('');

  const submitOutcomeMutation = trpc.demo.submitOutcome.useMutation({
    onSuccess: () => {
      toast.success('Outcome submitted successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      toast.error('Failed to submit outcome', { description: err.message });
    },
  });

  const resetForm = () => {
    setStatus('INTERESTED');
    setStudentType('GROUP');
    setLevel('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoId) return;

    submitOutcomeMutation.mutate({
      id: demoId,
      status,
      recommendedStudentType: status === 'INTERESTED' ? studentType : undefined,
      recommendedLevel: status === 'INTERESTED' ? level : undefined,
      adminNotes: notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Demo Outcome</DialogTitle>
          <DialogDescription>
            Record the result of the demo session. This will update the student's
            pipeline status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Outcome Status</Label>
              <Select
                value={status}
                onValueChange={(val: 'INTERESTED' | 'NOT_INTERESTED') =>
                  setStatus(val)
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERESTED">Interested</SelectItem>
                  <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === 'INTERESTED' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="type">Recommended Type</Label>
                  <Select
                    value={studentType}
                    onValueChange={(val: '1-1' | 'GROUP') => setStudentType(val)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GROUP">Group Batch</SelectItem>
                      <SelectItem value="1-1">1-on-1 Coaching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="level">Recommended Level</Label>
                  <Input
                    id="level"
                    placeholder="e.g. Beginner, Intermediate"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any observations or comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitOutcomeMutation.isPending}>
              {submitOutcomeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
