'use client';

import { format } from 'date-fns';
import { Briefcase, Calendar, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { BlockTimeDialog } from './block-time-dialog';

export default function CoachDashboard() {
  const [blockTimeOpen, setBlockTimeOpen] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = trpc.coach.getProfile.useQuery();

  // Get schedule for Today
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data: schedule, isLoading: isScheduleLoading, refetch: refetchSchedule } = trpc.coach.getSchedule.useQuery({
    startDate: startOfDay,
    endDate: endOfDay,
  });

  if (isProfileLoading || isScheduleLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight text-primary">Coach Portal</h2>
          <p className="text-muted-foreground">
            Welcome back, {profile?.name}. Here is your daily overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setBlockTimeOpen(true)}>Block Time</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.studentCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active 1-1 students</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.batchCount || 0}</div>
            <p className="text-xs text-muted-foreground">Group classes</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedule?.demos.length || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled demos/sessions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>
              Your upcoming sessions for {format(new Date(), 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schedule?.demos && schedule.demos.length > 0 ? (
                schedule.demos.map((demo) => (
                  <div
                    key={demo.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{demo.studentName}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">
                          {demo.status}
                        </span>
                        <span>•</span>
                        <span>
                          {format(new Date(demo.scheduledStart), 'h:mm a')} -{' '}
                          {format(new Date(demo.scheduledEnd), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center bg-muted/20 rounded-lg border-2 border-dashed">
                  No sessions scheduled for today.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <BlockTimeDialog 
        open={blockTimeOpen} 
        onOpenChange={setBlockTimeOpen}
        onSuccess={refetchSchedule}
      />
    </div>
  );
}
