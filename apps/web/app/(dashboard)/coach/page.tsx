'use client';

import { format } from 'date-fns';
import { Briefcase, Calendar, ChevronRight, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import { BlockTimeDialog } from './block-time-dialog';

export default function CoachDashboard() {
  const [blockTimeOpen, setBlockTimeOpen] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = trpc.coach.getProfile.useQuery();

  // Get schedule for Today
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const {
    data: schedule,
    isLoading: isScheduleLoading,
    refetch: refetchSchedule,
  } = trpc.coach.getSchedule.useQuery({
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.studentCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active 1-1 students</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Batches
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.batchCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Group classes</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Classes Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedule?.demos.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled demos/sessions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-5">
            <div className="space-y-1">
              <CardTitle className="text-xl">Today's Schedule</CardTitle>
              <CardDescription className="text-sm">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            {/* Link to the full schedule page for more details */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-primary hover:text-primary/80"
            >
              <Link href="/coach/schedule">
                View Week <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {schedule?.demos && schedule.demos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.demos.map((demo) => (
                    <TableRow key={demo.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6 font-medium whitespace-nowrap">
                        <div className="flex flex-col text-sm">
                          <span>{format(new Date(demo.scheduledStart), 'h:mm a')}</span>
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(demo.scheduledEnd), 'h:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{demo.studentName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs px-2.5 py-0.5">
                          {demo.status === 'BOOKED' ? 'Scheduled' : demo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {demo.meetingLink && !['CANCELLED', 'DROPPED'].includes(demo.status) && (
                          <Button size="sm" variant="default" asChild className="h-8">
                            <a href={demo.meetingLink} target="_blank" rel="noopener noreferrer">
                              Join
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20">
                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-lg">No sessions today</h3>
                <p className="text-muted-foreground text-sm max-w-xs mt-1">
                  You have no demos or classes scheduled for today.
                </p>
              </div>
            )}
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
