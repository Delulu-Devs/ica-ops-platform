'use client';

import {
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  Loader2,
  Sparkles,
  Trophy,
  User,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { RequestReviewDialog } from './request-review-dialog';

export default function CustomerDashboard() {
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const { data, isLoading } = trpc.student.list.useQuery({});
  const { data: subscriptions } = trpc.subscription.getMySubscriptions.useQuery();

  const students = data?.students || [];
  const activeSubs = subscriptions?.filter((s) => s.status === 'ACTIVE') || [];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-primary to-blue-600 p-8 text-primary-foreground shadow-lg">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back!</h2>
          <p className="max-w-xl text-primary-foreground/90">
            Track your progress, manage schedules, and grow your chess skills with our expert master
            classes.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button
              variant="secondary"
              onClick={() => setRequestReviewOpen(true)}
              className="font-semibold shadow-sm w-full sm:w-auto flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-orange-500" />
              Request Review Session
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto"
              asChild
            >
              <Link href="/dashboard/schedule">View Schedule</Link>
            </Button>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
          <Trophy className="h-full w-full rotate-12 transform" />
        </div>
      </div>

      {/* Stats / Quick Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Active profiles</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubs.length}</div>
            <p className="text-xs text-muted-foreground">Active plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Student Cards */}
      <div>
        <h3 className="text-xl font-bold tracking-tight text-primary mb-4">Your Profiles</h3>
        {students.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Students Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You haven't enrolled any students yet.
              </p>
              <Button>Enroll a Student</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Card
                key={student.id}
                className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group"
              >
                <CardHeader className="bg-linear-to-br from-muted/50 to-muted/10 pb-4 border-b">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trophy className="h-6 w-6 text-orange-500" />
                    </div>
                    <Badge
                      className={cn(
                        student.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {student.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{student.studentName}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <GraduationCap className="h-3 w-3" />
                    Level: {student.level || 'Beginner'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" /> Coach
                      </span>
                      <span className="font-medium">
                        {student.assignedCoachId ? 'Assigned' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Type
                      </span>
                      <span className="font-medium capitalize">
                        {student.studentType.toLowerCase().replace('-', ' ')}
                      </span>
                    </div>
                    {student.recurringSchedule && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Schedule</p>
                        <p className="text-sm font-medium">{student.recurringSchedule}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/5 p-4 pt-0 flex flex-col gap-2">
                  {student.meetingLink && (
                    <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                      <a href={student.meetingLink} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-4 w-4" />
                        Join 1-1 Session
                      </a>
                    </Button>
                  )}
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/dashboard/schedule">
                      <Calendar className="mr-2 h-4 w-4" />
                      View Full Schedule
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RequestReviewDialog open={requestReviewOpen} onOpenChange={setRequestReviewOpen} />
    </div>
  );
}
