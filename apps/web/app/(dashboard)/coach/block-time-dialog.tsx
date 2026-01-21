'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import { TimePicker } from '@/components/ui/time-picker';
import { trpc } from '@/lib/trpc';

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BlockTimeDialog({ open, onOpenChange, onSuccess }: BlockTimeDialogProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [reason, setReason] = useState('');

  const blockTimeMutation = trpc.coach.blockTime.useMutation({
    onSuccess: () => {
      toast.success('Time blocked successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      toast.error('Failed to block time', { description: err.message });
    },
  });

  const resetForm = () => {
    setDate(undefined);
    setStartTime('09:00');
    setEndTime('10:00');
    setReason('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    // Combine date and time
    const startDateTime = new Date(date);
    const [startH = 0, startM = 0] = startTime.split(':').map(Number);
    startDateTime.setHours(startH, startM);

    const endDateTime = new Date(date);
    const [endH = 0, endM = 0] = endTime.split(':').map(Number);
    endDateTime.setHours(endH, endM);

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time');
      return;
    }

    blockTimeMutation.mutate({
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Block Personal Time</DialogTitle>
          <DialogDescription>Mark time as unavailable on your calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Date</Label>
            <DatePicker
              date={date}
              setDate={setDate}
              disabledDates={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start Time</Label>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div className="grid gap-2">
              <Label>End Time</Label>
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g. Doctor appointment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={blockTimeMutation.isPending}>
              {blockTimeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block Time
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
