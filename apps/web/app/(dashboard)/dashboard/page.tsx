'use client';

import { Calendar, Loader2, Trophy, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { RequestReviewDialog } from './request-review-dialog';

export default function CustomerDashboard() {
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const { data, isLoading } = trpc.student.list.useQuery({});

  const students = data?.students || [];

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
          <h2 className="text-3xl font-bold tracking-tight text-primary">Student Dashboard</h2>
          <p className="text-muted-foreground">Manage your profiles, schedule, and payments.</p>
        </div>
        <Button onClick={() => setRequestReviewOpen(true)}>Request Review Session</Button>
      </div>

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
              className="overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="bg-muted/20 pb-4">
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${student.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {student.status}
                  </span>
                </div>
                <CardTitle className="mt-4">{student.studentName}</CardTitle>
                <CardDescription>Level: {student.level || 'Beginner'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Coach:
                  </span>
                  <span className="font-medium">
                    {student.assignedCoachId ? 'Assigned' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Schedule:
                  </span>
                  <span className="font-medium">N/A</span>
                </div>
                <Button className="w-full" variant="outline">
                  View Progress
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RequestReviewDialog open={requestReviewOpen} onOpenChange={setRequestReviewOpen} />
    </div>
  );
}
