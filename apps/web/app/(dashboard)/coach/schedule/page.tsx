'use client';

import { addDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, Video } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';

export default function CoachSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Calculate start and end of the week for the query
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data, isLoading } = trpc.coach.getSchedule.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">My Schedule</h2>
          <p className="text-muted-foreground">
            Manage your classes and demos for the week of {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, -7))}>Previous Week</Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, 7))}>Next Week</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Demos Section */}
        <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Upcoming Demos
            </h3>
            {isLoading ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
                </Card>
            ) : data?.demos.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No demos scheduled for this week.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {data?.demos.map((demo) => (
                        <Card key={demo.id} className="overflow-hidden border-l-4 border-l-primary">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">{demo.studentName}</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <CalendarIcon className="h-3 w-3" />
                                        {format(new Date(demo.scheduledStart), 'EEEE, MMM d')}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(demo.scheduledStart), 'h:mm a')} - {format(new Date(demo.scheduledEnd), 'h:mm a')}
                                    </div>
                                </div>
                                <div>
                                    <Badge variant={demo.status === 'BOOKED' ? 'default' : 'secondary'}>
                                        {demo.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>

        {/* Batches Section */}
        <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                My Batches
            </h3>
             {isLoading ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
                </Card>
            ) : data?.batches.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No active batches assigned.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {data?.batches.map((batch) => (
                        <Card key={batch.id} className="overflow-hidden border-l-4 border-l-secondary">
                             <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{batch.name}</CardTitle>
                                <CardDescription>{batch.level} Level</CardDescription>
                             </CardHeader>
                            <CardContent className="pb-4">
                                <div className="text-sm text-muted-foreground mb-2">
                                    <strong>Schedule:</strong> {batch.schedule ? (
                                        // Attempt to pretty print JSON schedule if simple string
                                        // But assuming it might be a string like "Mon, Wed 10am" for now based on context
                                        // Actually DB schema says JSON, but let's just display it.
                                        // In real app, we'd parse the recurring rules.
                                        <span className="ml-1">{(() => {
                                            try {
                                                // Assuming simple JSON or string
                                                return JSON.parse(batch.schedule).map((s: any) => `${s.day} ${s.time}`).join(', ');
                                            } catch {
                                                return batch.schedule;
                                            }
                                        })()}</span>
                                    ) : 'No schedule set'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <strong>Students:</strong> {batch.maxStudents} max
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
