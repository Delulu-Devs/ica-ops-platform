'use client';

import { format } from 'date-fns';
import { Activity, Calendar, Clock, Loader2, Percent, Plus, Users } from 'lucide-react';
import Link from 'next/link';
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

export default function AdminDashboard() {
  const { data: dashboard, isLoading: isDashboardLoading } = trpc.analytics.getDashboard.useQuery();
  const { data: funnel, isLoading: isFunnelLoading } = trpc.analytics.getFunnel.useQuery({});

  // Get today's demos
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0
  ).toISOString();
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  ).toISOString();

  const { data: todayDemosData, isLoading: isDemosLoading } = trpc.demo.list.useQuery({
    startDate: startOfDay,
    endDate: endOfDay,
    limit: 10,
  });

  const isLoading = isDashboardLoading || isFunnelLoading || isDemosLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayDemos = todayDemosData?.demos || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ATTENDED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'INTERESTED':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'CONVERTED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of the academy's performance.
          </p>
        </div>
        <Link href="/admin/demos">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Demo
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Demos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.todayDemos || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingDemos || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnel?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">From interested to converted</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeStudents || 0}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Today's Demos Table */}
        <Card className="col-span-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Demos</CardTitle>
              <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
            </div>
            <Link href="/admin/demos">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayDemos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No demos scheduled for today.</p>
                <Link href="/admin/demos" className="mt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Schedule Demo
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayDemos.map((demo) => (
                    <TableRow key={demo.id}>
                      <TableCell className="font-medium">
                        {format(new Date(demo.scheduledStart), 'h:mm a')}
                      </TableCell>
                      <TableCell>{demo.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{demo.parentName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(demo.status)} font-medium`}
                        >
                          {demo.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Action Items & Quick Stats */}
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>Tasks requiring immediate attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard?.pendingDemos && dashboard.pendingDemos > 0 ? (
              <div className="flex items-start gap-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Process Pending Demos</p>
                  <p className="text-xs text-muted-foreground">
                    You have {dashboard.pendingDemos} demos waiting for action.
                  </p>
                </div>
                <Link href="/admin/demos">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>
            ) : null}

            {/* Demo Funnel Summary */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Demo Funnel Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Booked</span>
                  <span className="font-medium">{funnel?.booked || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Attended</span>
                  <span className="font-medium">{funnel?.attended || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interested</span>
                  <span className="font-medium">{funnel?.interested || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Converted</span>
                  <span className="font-medium text-green-600">{funnel?.converted || 0}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Quick Overview</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {dashboard?.totalCoaches || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Coaches</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {funnel?.attendanceRate || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Attendance Rate</div>
                </div>
              </div>
            </div>

            {!dashboard?.pendingDemos && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                <Activity className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-700">All caught up! No pending actions.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
