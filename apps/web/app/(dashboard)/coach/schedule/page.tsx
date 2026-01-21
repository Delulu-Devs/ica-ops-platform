'use client';

import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MessageSquare, Pencil, Users, Video } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { EditMeetingLinkDialog } from './edit-meeting-link-dialog';

export default function CoachSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingDemo, setEditingDemo] = useState<{
    id: string;
    link: string | null;
  } | null>(null);

  // Calculate start and end of the week for the query
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data, isLoading } = trpc.coach.getSchedule.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">My Schedule</h2>
          <p className="text-muted-foreground">
            Manage your classes and demos for the week of {format(startDate, 'MMM d')} -{' '}
            {format(endDate, 'MMM d, yyyy')}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
            Previous Week
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
            Next Week
          </Button>
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
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading...
              </CardContent>
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
                <Card key={demo.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{demo.studentName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(demo.scheduledStart), 'EEEE, MMM d')}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(demo.scheduledStart), 'h:mm a')} -{' '}
                        {format(new Date(demo.scheduledEnd), 'h:mm a')}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={demo.status === 'BOOKED' ? 'default' : 'secondary'}>
                        {demo.status}
                      </Badge>

                      <div className="flex items-center gap-1">
                        {!['CANCELLED', 'DROPPED'].includes(demo.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit Meeting Link"
                            onClick={() =>
                              setEditingDemo({
                                id: demo.id,
                                link: demo.meetingLink,
                              })
                            }
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                          </Button>
                        )}

                        {demo.meetingLink && !['CANCELLED', 'DROPPED'].includes(demo.status) ? (
                          <Button size="sm" asChild className="h-7 text-xs">
                            <a
                              href={demo.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <Video className="h-3 w-3" />
                              Join
                            </a>
                          </Button>
                        ) : (
                          !['CANCELLED', 'DROPPED'].includes(demo.status) && (
                            <span className="text-[10px] text-muted-foreground mr-1">No Link</span>
                          )
                        )}
                      </div>
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
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading...
              </CardContent>
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
                <Card key={batch.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">{batch.name}</CardTitle>
                      <CardDescription>{batch.level} Level</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                      <Link href={`/chat?roomId=batch:${batch.id}`} title="Message Batch">
                        <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        <span className="sr-only">Message Batch</span>
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>Schedule:</strong>{' '}
                      {batch.schedule ? (
                        // Attempt to pretty print JSON schedule if simple string
                        // But assuming it might be a string like "Mon, Wed 10am" for now based on context
                        // Actually DB schema says JSON, but let's just display it.
                        // In real app, we'd parse the recurring rules.
                        <span className="ml-1">
                          {(() => {
                            try {
                              const schedule = JSON.parse(batch.schedule);
                              // Handle { days: string[], time: string, duration: number } structure
                              if (schedule.days && Array.isArray(schedule.days) && schedule.time) {
                                return `${schedule.days.join(', ')} at ${schedule.time} (${schedule.duration || 60} mins)`;
                              }
                              // Fallback for simple array of objects
                              if (Array.isArray(schedule)) {
                                return schedule
                                  .map((s: { day: string; time: string }) => `${s.day} ${s.time}`)
                                  .join(', ');
                              }
                              return batch.schedule;
                            } catch {
                              return batch.schedule;
                            }
                          })()}
                        </span>
                      ) : (
                        'No schedule set'
                      )}
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
      <EditMeetingLinkDialog
        open={!!editingDemo}
        onOpenChange={(open) => !open && setEditingDemo(null)}
        demoId={editingDemo?.id || ''}
        currentLink={editingDemo?.link || null}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
