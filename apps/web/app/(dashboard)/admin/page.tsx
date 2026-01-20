'use client';

import { format } from 'date-fns';
import {
  Activity,
  Calendar,
  CalendarClock,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function AdminDashboard() {
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: dashboard, isLoading: isDashboardLoading } = trpc.analytics.getDashboard.useQuery();
  const { data: funnel, isLoading: isFunnelLoading } = trpc.analytics.getFunnel.useQuery({});

  // Get today's demos with proper date range
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data: todayDemosData, isLoading: isDemosLoading } = trpc.demo.list.useQuery({
    startDate: startOfDay,
    endDate: endOfDay,
    limit: 10,
  });

  // Get demo details query
  const { data: demoDetails, isLoading: isDetailsLoading } = trpc.demo.getById.useQuery(
    { id: selectedDemoId || '' },
    {
      enabled: !!selectedDemoId && isDetailsDialogOpen,
    }
  );

  const isLoading = isDashboardLoading || isFunnelLoading || isDemosLoading;

  const openDetailsDialog = (id: string) => {
    setSelectedDemoId(id);
    setIsDetailsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayDemos = todayDemosData?.demos || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200';
      case 'ATTENDED':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-yellow-200';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200';
      case 'INTERESTED':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-100/80 border-purple-200';
      case 'CONVERTED':
        return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200';
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            {getTimeBasedGreeting()}, Admin
          </h2>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at the academy today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/demos">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> New Demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Demos
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.todayDemos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-blue-600 font-medium mr-1">Scheduled</span> for today
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Actions
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingDemos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnel?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Interested to Enrolled</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Students
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeStudents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total enrolled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Today's Demos Table */}
        <Card className="col-span-1 md:col-span-4 shadow-sm border-t-4 border-t-primary/20">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-5">
            <div className="space-y-1">
              <CardTitle className="text-xl">Today's Schedule</CardTitle>
              <CardDescription className="text-sm">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            <Link href="/admin/demos">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {todayDemos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20">
                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-lg">No demos scheduled</h3>
                <p className="text-muted-foreground text-sm max-w-xs mt-1">
                  There are no demos scheduled for today.
                </p>
                <Link href="/admin/demos" className="mt-6">
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Schedule Demo
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Parent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayDemos.map((demo) => (
                    <TableRow key={demo.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6 font-medium whitespace-nowrap">
                        {format(new Date(demo.scheduledStart), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(demo.studentName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{demo.studentName}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {demo.parentName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(demo.status)} font-medium border text-xs py-0.5 px-2.5 rounded-full shadow-sm`}
                        >
                          {demo.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailsDialog(demo.id)}>
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                              View Details
                            </DropdownMenuItem>
                            <Link href="/admin/demos">
                              <DropdownMenuItem>
                                <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
                                Reschedule
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Action Items & Quick Stats */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          <Card className="shadow-sm border-t-4 border-t-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Action Items
              </CardTitle>
              <CardDescription>Tasks requiring immediate attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard?.pendingDemos && dashboard.pendingDemos > 0 ? (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/50 transition-all hover:bg-orange-50 dark:hover:bg-orange-950/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-background border border-orange-200 shadow-sm">
                    <span className="text-orange-600 font-bold text-sm">
                      {dashboard.pendingDemos}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">Pending Demos</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You have demos waiting for confirmation or outcome submission.
                    </p>
                    <Link
                      href="/admin/demos"
                      className="inline-flex items-center text-xs font-medium text-orange-600 hover:text-orange-700 mt-2"
                    >
                      Process now <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center border rounded-xl border-dashed bg-muted/10">
                  <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No pending actions required.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Funnel Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Booked</span>
                    <span className="font-medium">{funnel?.booked || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-full rounded-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Attended</span>
                    <span className="font-medium">{funnel?.attended || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((funnel?.attended || 0) / (funnel?.booked || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Converted</span>
                    <span className="font-medium text-green-600">{funnel?.converted || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((funnel?.converted || 0) / (funnel?.booked || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
