'use client';

import { format } from 'date-fns';
import {
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
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

import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { OutcomeDialog } from './outcome-dialog';

type DemoStatus =
  | 'BOOKED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'PAYMENT_PENDING'
  | 'CONVERTED'
  | 'DROPPED';

export default function DemosPage() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog States
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
    search: searchQuery || undefined,
    status: statusFilter !== 'ALL' ? (statusFilter as DemoStatus) : undefined,
    includeStats: true, // Always fetch stats to update dashboard
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

  // Send payment link mutation
  const sendPaymentLinkMutation = trpc.demo.sendPaymentLink.useMutation({
    onSuccess: () => {
      toast.success('Payment link email sent successfully');
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to send payment link', { description: err.message });
    },
  });

  // Convert demo mutation (Simulate Payment)
  const convertDemoMutation = trpc.demo.convert.useMutation({
    onSuccess: () => {
      toast.success('Payment simulated & Student account created!');
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to process payment', { description: err.message });
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
    const endDateTime = new Date(
      startDateTime.getTime() + parseInt(formData.duration, 10) * 60 * 1000
    );

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
      startDateTime.getTime() + parseInt(rescheduleData.duration, 10) * 60 * 1000
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

  const handleStatusUpdate = (id: string, status: DemoStatus) => {
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
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300';
      case 'ATTENDED':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-300';
      case 'RESCHEDULED':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-300';
      case 'INTERESTED':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-300';
      case 'CONVERTED':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Demos Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage scheduled demos, track attendance, and monitor conversions.
          </p>
        </div>
        <Button
          onClick={() => setIsScheduleDialogOpen(true)}
          className="shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Schedule Demo
        </Button>
      </div>

      {/* Stats Overview - Placeholders for now */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Demos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">All time records</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.completed ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully attended</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.pending ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming sessions</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.stats?.completed
                ? Math.round((data.stats.converted / data.stats.completed) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Demo to Student</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search demos by student, parent..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0); // Reset page on search
            }}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0); // Reset page on filter
            }}
          >
            <SelectTrigger className="w-full md:w-[180px] bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="BOOKED">Booked</SelectItem>
              <SelectItem value="ATTENDED">Attended</SelectItem>
              <SelectItem value="NO_SHOW">No Show</SelectItem>
              <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle>All Demos</CardTitle>
          <CardDescription>
            A list of all demos including student details and current status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Scheduled Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : data?.demos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No demos found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data?.demos.map((demo) => (
                  <TableRow key={demo.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-medium">
                      <div className="flex flex-col">
                        <span>{demo.studentName}</span>
                        <span className="text-xs text-muted-foreground hidden lg:inline-block">
                          ID: {demo.id.slice(0, 6)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{demo.parentName}</span>
                        {/* Assuming we might want to show email? Keeping it simple for now */}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(demo.scheduledStart), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(demo.scheduledStart), 'h:mm a')} -{' '}
                          {format(new Date(demo.scheduledEnd), 'h:mm a')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('font-normal border', getStatusColor(demo.status))}
                      >
                        {demo.status.replace('_', ' ')}
                      </Badge>
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
                            onClick={() => handleStatusUpdate(demo.id, 'ATTENDED')}
                            disabled={['ATTENDED', 'CONVERTED', 'DROPPED', 'CANCELLED'].includes(
                              demo.status
                            )}
                            className="text-green-600 focus:text-green-700 focus:bg-green-50"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark Attended
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openOutcomeDialog(demo.id)}
                            disabled={demo.status !== 'ATTENDED'}
                            className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Submit Outcome
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => sendPaymentLinkMutation.mutate({ id: demo.id })}
                            disabled={demo.status !== 'INTERESTED'}
                            className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Send Payment Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => convertDemoMutation.mutate({ id: demo.id })}
                            disabled={demo.status !== 'PAYMENT_PENDING'}
                            className="text-purple-600 focus:text-purple-700 focus:bg-purple-50"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Simulate Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(demo.id, 'NO_SHOW')}
                            disabled={['NO_SHOW', 'CONVERTED', 'DROPPED', 'CANCELLED'].includes(
                              demo.status
                            )}
                            className="text-red-500 focus:text-red-700 focus:bg-red-50"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Mark No Show
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openRescheduleDialog(demo.id)}
                            disabled={!['BOOKED', 'NO_SHOW', 'RESCHEDULED'].includes(demo.status)}
                          >
                            <CalendarClock className="mr-2 h-4 w-4 text-orange-500" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDetailsDialog(demo.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(demo.id, 'CANCELLED')}
                            disabled={['CANCELLED', 'CONVERTED', 'DROPPED'].includes(demo.status)}
                            className="text-gray-500 focus:text-gray-900"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Cancel Demo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-xs text-muted-foreground">
              Showing {data?.demos.length || 0} of {data?.total || 0} demos
            </div>
            <div className="flex gap-2">
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
                disabled={!data || (page + 1) * limit >= data.total || isLoading}
              >
                Next
              </Button>
            </div>
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
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Student Name
                  </p>
                  <p className="font-semibold text-base">{demoDetails.studentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Parent Name
                  </p>
                  <p className="font-semibold text-base">{demoDetails.parentName}</p>
                </div>
              </div>

              <div className="space-y-1 bg-muted/30 p-3 rounded-md border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Parent Email
                </p>
                <p className="font-medium text-sm flex items-center gap-2">
                  {demoDetails.parentEmail}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Scheduled Date
                  </p>
                  <p className="font-medium text-sm">
                    {format(new Date(demoDetails.scheduledStart), 'PPP')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Time
                  </p>
                  <p className="font-medium text-sm">
                    {format(new Date(demoDetails.scheduledStart), 'p')} -{' '}
                    {format(new Date(demoDetails.scheduledEnd), 'p')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </p>
                  <Badge className={cn('w-fit', getStatusColor(demoDetails.status))}>
                    {demoDetails.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Timezone
                  </p>
                  <p className="font-medium text-sm">{demoDetails.timezone || 'Not specified'}</p>
                </div>
              </div>

              {(demoDetails.recommendedStudentType || demoDetails.recommendedLevel) && (
                <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recommended Type</p>
                    <p className="font-medium">{demoDetails.recommendedStudentType || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recommended Level</p>
                    <p className="font-medium">{demoDetails.recommendedLevel || '-'}</p>
                  </div>
                </div>
              )}

              {demoDetails.adminNotes && (
                <div className="space-y-2 mt-2">
                  <p className="text-sm font-semibold text-foreground">Admin Notes</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {demoDetails.adminNotes}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t flex justify-between">
                <span>Created: {format(new Date(demoDetails.createdAt), 'MMM d, yyyy')}</span>
                {demoDetails.updatedAt && (
                  <span>Updated: {format(new Date(demoDetails.updatedAt), 'MMM d, yyyy')}</span>
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
