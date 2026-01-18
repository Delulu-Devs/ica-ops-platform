'use client';

import { Activity, Award, Calendar, Clock, DollarSign, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = trpc.analytics.getDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of the academy's performance and daily activities.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeStudents || 0}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Active Coaches</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalCoaches || 0}</div>
            <p className="text-xs text-muted-foreground">Available for sessions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Demos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingDemos || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation/action</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Recent activity and student enrollment trends.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-md">
              Chart Placeholder (Recharts)
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>Tasks requiring immediate attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.pendingDemos ? (
                <div className="flex items-center">
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Process New Demos</p>
                    <p className="text-sm text-muted-foreground">
                      You have {dashboard.pendingDemos} pending demo requests.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending actions.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
