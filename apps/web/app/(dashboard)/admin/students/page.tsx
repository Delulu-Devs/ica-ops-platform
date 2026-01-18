'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';

export default function StudentsPage() {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'ALL'>(
    'ACTIVE'
  );
  const [typeFilter, setTypeFilter] = useState<'1-1' | 'GROUP' | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  const { data, isLoading } = trpc.student.list.useQuery({
    limit: 10,
    offset: page * 10,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    studentType: typeFilter === 'ALL' ? undefined : typeFilter,
  });

  const students = data?.students || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Students</h2>
          <p className="text-muted-foreground">Manage all students, enrollments, and status.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="1-1">1-1</SelectItem>
            <SelectItem value="GROUP">Group</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Showing {students.length} of {total} students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{student.studentName}</span>
                          <span className="text-xs text-muted-foreground">
                            {student.parentName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            student.studentType === '1-1'
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}
                        >
                          {student.studentType}
                        </span>
                      </TableCell>
                      <TableCell>{student.level || '-'}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : student.status === 'PAUSED'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {student.status}
                        </span>
                      </TableCell>
                      <TableCell>{student.assignedCoachId ? 'Assigned' : 'Unassigned'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={students.length < 10 || isLoading}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
