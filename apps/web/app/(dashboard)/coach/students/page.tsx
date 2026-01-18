'use client';

import { Loader2, Search, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useState } from 'react';

export default function CoachStudentsPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = trpc.student.list.useQuery({
    limit: 10,
    offset: page * 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">My Students</h2>
        <p className="text-muted-foreground">Track progress and manage your students.</p>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                Students currently assigned to you or your batches.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-8" />
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
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
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
                      <TableCell>{student.studentAge ?? 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.level ?? 'Beginner'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{student.studentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            student.status === 'ACTIVE'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-500'
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
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
    </div>
  );
}
