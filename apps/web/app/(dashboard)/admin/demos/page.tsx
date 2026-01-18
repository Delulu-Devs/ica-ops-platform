'use client';

import { format } from 'date-fns';
import {
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  XCircle,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const limit = 10;

  // Form state for scheduling demo
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    parentEmail: '',
    timezone: 'Asia/Kolkata',
    scheduledDate: '',
    scheduledTime: '',
    duration: '30',
  });

  // Reschedule form state
  const [rescheduleData, setRescheduleData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    duration: '30',
  });

  const { data, isLoading, refetch } = trpc.demo.list.useQuery({
    limit,
    offset: page * limit,
  });

  // Get demo details query
  const { data: demoDetails, isLoading: isDetailsLoading } = trpc.demo.getById.useQuery(
    { id: selectedDemoId || '' },
    {
      enabled: !!selectedDemoId && (isDetailsDialogOpen || isRescheduleDialogOpen),
    }
  );

  const updateStatusMutation = trpc.demo.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated successfully');
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to update status', { description: err.message });
    },
  });

  // Create demo mutation
  const createDemoMutation = trpc.demo.create.useMutation({
    onSuccess: () => {
      toast.success('Demo scheduled successfully!');
      setIsScheduleDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to schedule demo', { description: error.message });
    },
  });

  // Reschedule demo mutation
  const rescheduleDemoMutation = trpc.demo.reschedule.useMutation({
    onSuccess: () => {
      toast.success('Demo rescheduled successfully!');
      setIsRescheduleDialogOpen(false);
      setSelectedDemoId(null);
      resetRescheduleForm();
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to reschedule demo', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      studentName: '',
      parentName: '',
      parentEmail: '',
      timezone: 'Asia/Kolkata',
      scheduledDate: '',
      scheduledTime: '',
      duration: '30',
    });
  };

  const resetRescheduleForm = () => {
    setRescheduleData({
      scheduledDate: '',
      scheduledTime: '',
      duration: '30',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.studentName ||
      !formData.parentName ||
      !formData.parentEmail ||
      !formData.scheduledDate ||
      !formData.scheduledTime
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60 * 1000);

    if (startDateTime < new Date()) {
      toast.error('Cannot schedule demo in the past');
      return;
    }

    createDemoMutation.mutate({
      studentName: formData.studentName,
      parentName: formData.parentName,
      parentEmail: formData.parentEmail,
      timezone: formData.timezone,
      scheduledStart: startDateTime.toISOString(),
      scheduledEnd: endDateTime.toISOString(),
    });
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDemoId || !rescheduleData.scheduledDate || !rescheduleData.scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDateTime = new Date(
      `${rescheduleData.scheduledDate}T${rescheduleData.scheduledTime}`
    );
    const endDateTime = new Date(
      startDateTime.getTime() + parseInt(rescheduleData.duration) * 60 * 1000
    );

    if (startDateTime < new Date()) {
      toast.error('Cannot schedule demo in the past');
      return;
    }

    rescheduleDemoMutation.mutate({
      id: selectedDemoId,
      scheduledStart: startDateTime.toISOString(),
      scheduledEnd: endDateTime.toISOString(),
    });
  };

  const handleStatusUpdate = (id: string, status: any) => {
    updateStatusMutation.mutate({ id, status });
  };

  const openOutcomeDialog = (id: string) => {
    setOutcomeDemoId(id);
    setOutcomeDialogOpen(true);
  };

  const openDetailsDialog = (id: string) => {
    setSelectedDemoId(id);
    setIsDetailsDialogOpen(true);
  };

  const openRescheduleDialog = (id: string) => {
    setSelectedDemoId(id);
    setIsRescheduleDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80';
      case 'ATTENDED':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80';
      case 'RESCHEDULED':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100/80';
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
        <Button onClick={() => setIsScheduleDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
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
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
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
                            onClick={() => openRescheduleDialog(demo.id)}
                            disabled={!['BOOKED', 'NO_SHOW', 'RESCHEDULED'].includes(demo.status)}
                          >
                            <CalendarClock className="mr-2 h-4 w-4 text-orange-600" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(demo.id, 'CANCELLED')}
                            disabled={['CANCELLED', 'CONVERTED'].includes(demo.status)}
                          >
                            <Clock className="mr-2 h-4 w-4 text-gray-600" />
                            Cancel Demo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDetailsDialog(demo.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
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

      {/* View Demo Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Demo Details</DialogTitle>
            <DialogDescription>Complete information about this demo session.</DialogDescription>
          </DialogHeader>
          {isDetailsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : demoDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-medium">{demoDetails.studentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Parent Name</p>
                  <p className="font-medium">{demoDetails.parentName}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Parent Email</p>
                <p className="font-medium">{demoDetails.parentEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Scheduled Date</p>
                  <p className="font-medium">
                    {format(new Date(demoDetails.scheduledStart), 'PPP')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(new Date(demoDetails.scheduledStart), 'p')} -{' '}
                    {format(new Date(demoDetails.scheduledEnd), 'p')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={cn(getStatusColor(demoDetails.status))}>
                    {demoDetails.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-medium">{demoDetails.timezone || 'Not specified'}</p>
                </div>
              </div>

              {demoDetails.recommendedStudentType && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recommended Type</p>
                    <p className="font-medium">{demoDetails.recommendedStudentType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recommended Level</p>
                    <p className="font-medium">{demoDetails.recommendedLevel || 'N/A'}</p>
                  </div>
                </div>
              )}

              {demoDetails.adminNotes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p className="text-sm p-3 bg-muted rounded-lg">{demoDetails.adminNotes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t">
                Created: {format(new Date(demoDetails.createdAt), 'PPp')}
                {demoDetails.updatedAt && (
                  <> • Updated: {format(new Date(demoDetails.updatedAt), 'PPp')}</>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Demo Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Reschedule Demo</DialogTitle>
            <DialogDescription>Select a new date and time for this demo session.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReschedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rescheduleDate">New Date *</Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  value={rescheduleData.scheduledDate}
                  onChange={(e) =>
                    setRescheduleData({
                      ...rescheduleData,
                      scheduledDate: e.target.value,
                    })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleTime">New Time *</Label>
                <Input
                  id="rescheduleTime"
                  type="time"
                  value={rescheduleData.scheduledTime}
                  onChange={(e) =>
                    setRescheduleData({
                      ...rescheduleData,
                      scheduledTime: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescheduleDuration">Duration (minutes)</Label>
              <Input
                id="rescheduleDuration"
                type="number"
                value={rescheduleData.duration}
                onChange={(e) =>
                  setRescheduleData({
                    ...rescheduleData,
                    duration: e.target.value,
                  })
                }
                min={15}
                max={120}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRescheduleDialogOpen(false);
                  setSelectedDemoId(null);
                  resetRescheduleForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={rescheduleDemoMutation.isPending}>
                {rescheduleDemoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  <>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Reschedule
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Demo Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Schedule New Demo</DialogTitle>
            <DialogDescription>
              Book a demo session for a prospective student. They will receive a confirmation email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Enter student name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentName">Parent Name *</Label>
                <Input
                  id="parentName"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder="Enter parent name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email *</Label>
              <Input
                id="parentEmail"
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                placeholder="parent@email.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Time *</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  min={15}
                  max={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="e.g., Asia/Kolkata"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsScheduleDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDemoMutation.isPending}>
                {createDemoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Demo
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
