'use client';

import { CalendarClock, Link as LinkIcon, Loader2, MoreHorizontal, Search } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { ManageScheduleDialog } from './manage-schedule-dialog';

interface Student {
  id: string;
  studentName: string;
  parentName: string;
  studentAge: number | string | null;
  level?: string | null;
  studentType: string;
  status: string;
  meetingLink?: string | null;
}

export default function CoachStudentsPage() {
  const [page] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const { data, isLoading } = trpc.student.list.useQuery({
    limit: 10,
    offset: page * 10,
    search: searchQuery,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">My Students</h2>
        <p className="text-muted-foreground">Track progress and manage your students.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>Students currently assigned to you or your batches.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Student</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${student.studentName}`}
                            />
                            <AvatarFallback>
                              {student.studentName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.studentName}</div>
                            <div className="text-xs text-muted-foreground">
                              Parent: {student.parentName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.studentAge ? (
                          <span className="font-medium">{student.studentAge}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.level || 'Beginner'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {student.studentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            student.status === 'ACTIVE'
                              ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20 border-green-200 shadow-none'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200 shadow-none'
                          }
                          variant="outline"
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {student.studentType === '1-1' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsScheduleDialogOpen(true);
                                }}
                              >
                                <CalendarClock className="mr-2 h-4 w-4" />
                                Manage Schedule
                              </DropdownMenuItem>
                            )}
                            {student.meetingLink && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={student.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <LinkIcon className="mr-2 h-4 w-4" />
                                  Join Meeting
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No students found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <ManageScheduleDialog
          open={isScheduleDialogOpen}
          onOpenChange={setIsScheduleDialogOpen}
          student={selectedStudent}
          onSuccess={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
