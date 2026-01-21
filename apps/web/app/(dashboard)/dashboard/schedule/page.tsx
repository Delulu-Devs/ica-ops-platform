'use client';

import { Calendar, Clock, Loader2, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

// Define types locally for now since we don't have shared types easily accessible
// Define types locally for now since we don't have shared types easily accessible
interface ScheduleItem {
  day?: string;
  time?: string;
}

function StudentScheduleCard({
  student,
}: {
  student: {
    id: string;
    studentName: string;
    studentType: '1-1' | 'GROUP';
    status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
    level?: string | null;
    assignedBatchId?: string | null;
  };
}) {
  const { data: batch, isLoading } = trpc.batch.getById.useQuery(
    { id: student.assignedBatchId! },
    { enabled: !!student.assignedBatchId }
  );

  const handleJoinClass = () => {
    // In a real app, this would redirect to Zoom/Meet
    // Or fetch a link from the backend
    toast.info('Class link is not active yet', {
      description: 'Please check back 5 minutes before class time.',
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{student.studentName}</CardTitle>
          </div>
          <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {student.status}
          </Badge>
        </div>
        <CardDescription>
          {student.studentType === 'GROUP' ? 'Group Batch' : '1-1 Coaching'} •{' '}
          {student.level ?? 'Beginner'} Level
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {student.studentType === 'GROUP' ? (
          isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : batch ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-card shadow-sm">
                <Users className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-full" />
                <div>
                  <h4 className="font-semibold text-base">{batch.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Coach: {batch.coach?.name ?? 'Assigned Coach'}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Clock className="h-4 w-4" />
                    <span>
                      {(() => {
                        try {
                          if (!batch.schedule) return 'No schedule set';
                          const schedule = JSON.parse(batch.schedule);
                          if (Array.isArray(schedule)) {
                            return schedule
                              .map((s: ScheduleItem) => `${s.day || ''} ${s.time || ''}`)
                              .join(', ');
                          }
                          // If it's an object, try to format it or return string rep
                          if (typeof schedule === 'object') {
                            const schedObj = schedule as ScheduleItem;
                            return (
                              `${schedObj.day || ''} ${schedObj.time || ''}`.trim() ||
                              'Custom Schedule'
                            );
                          }
                          return String(schedule);
                        } catch {
                          return batch.schedule || 'Custom Schedule';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleJoinClass}>
                  Join Class
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No batch assigned yet.</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>1-1 Scheduling is managed directly with your coach.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentSchedulePage() {
  const { data, isLoading } = trpc.student.list.useQuery({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Class Schedule</h2>
        <p className="text-muted-foreground">View upcoming classes for all students.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data?.students.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active students found in your account.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.students.map((student) => (
            <StudentScheduleCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
}
