'use client';

import { format } from 'date-fns';
import {
  BookOpen,
  CheckCircle,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'ALL'>(
    'ALL'
  );
  const [typeFilter, setTypeFilter] = useState<'1-1' | 'GROUP' | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Edit & View State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state for new student (Add)
  const [addFormData, setAddFormData] = useState({
    studentName: '',
    studentAge: '',
    parentName: '',
    parentEmail: '',
    timezone: '',
    country: '',
    studentType: '1-1' as '1-1' | 'GROUP',
    level: '',
  });

  // Form state for editing student
  const [editFormData, setEditFormData] = useState({
    id: '',
    studentName: '',
    studentAge: '',
    parentName: '',
    timezone: '',
    country: '',
    level: '',
  });

  // Main List Query
  const { data, isLoading, refetch } = trpc.student.list.useQuery({
    limit: 10,
    offset: page * 10,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    studentType: typeFilter === 'ALL' ? undefined : typeFilter,
  });

  // Stats Queries
  const { data: totalStudentsData } = trpc.student.list.useQuery(
    { limit: 1 },
    { trpc: { context: { skipBatch: true } } }
  );
  const { data: activeStudentsData } = trpc.student.list.useQuery({
    limit: 1,
    status: 'ACTIVE',
  });
  const { data: pausedStudentsData } = trpc.student.list.useQuery({
    limit: 1,
    status: 'PAUSED',
  });
  const { data: privateStudentsData } = trpc.student.list.useQuery({
    limit: 1,
    studentType: '1-1',
  });

  // Get coaches for assignment lookup
  const { data: coachesData } = trpc.coach.list.useQuery({
    limit: 100, // Fetch more to ensure coverage
    offset: 0,
  });

  // Fetch full details for selected student (for Edit/View)
  const { data: studentDetails, isLoading: isDetailsLoading } = trpc.student.getById.useQuery(
    { id: selectedStudentId || '' },
    {
      enabled: !!selectedStudentId && (isEditDialogOpen || isViewDialogOpen),
    }
  );

  // Update Student Mutation
  const updateStudentMutation = trpc.student.update.useMutation({
    onSuccess: () => {
      toast.success('Student updated successfully');
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to update student', { description: err.message });
    },
  });

  // Update Status Mutation
  const updateStatusMutation = trpc.student.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(`Student status updated `);
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to update status', { description: err.message });
    },
  });

  // Helper to open edit dialog and prefill data
  const openEditDialog = (student: {
    id: string;
    studentName: string;
    studentAge?: number | string | null;
    parentName: string;
    timezone?: string | null;
    country?: string | null;
    level?: string | null;
  }) => {
    setSelectedStudentId(student.id);
    setEditFormData({
      id: student.id,
      studentName: student.studentName,
      studentAge: student.studentAge?.toString() || '',
      parentName: student.parentName,
      timezone: student.timezone || '',
      country: student.country || '',
      level: student.level || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;

    updateStudentMutation.mutate({
      id: editFormData.id,
      studentName: editFormData.studentName,
      studentAge: editFormData.studentAge ? parseInt(editFormData.studentAge, 10) : undefined,
      parentName: editFormData.parentName,
      timezone: editFormData.timezone,
      country: editFormData.country,
      level: editFormData.level,
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.studentName || !addFormData.parentName || !addFormData.parentEmail) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Stub behavior as per original requirement
    toast.error('Student creation requires linking to an existing account', {
      description:
        'Students are typically created during demo conversion. Please use the demo pipeline to add new students.',
    });
  };

  const getCoachName = (coachId: string | null) => {
    if (!coachId) return 'Unassigned';
    const coaches = coachesData?.coaches || [];
    const coach = coaches.find((c) => c.id === coachId);
    return coach ? coach.name : 'Unknown Coach';
  };

  const getInitials = (name: string) => {
    return (name || '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const students = data?.students || [];

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Students</h2>
          <p className="text-muted-foreground mt-1">
            Manage student enrollments, progress, and assignments.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudentsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total registered students</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudentsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently enrolled and active</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paused</CardTitle>
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pausedStudentsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Temporarily on hold</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              1-1 Coaching
            </CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{privateStudentsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Private sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students by name..." className="pl-9 bg-background" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(val) =>
              setStatusFilter(val as 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'ALL')
            }
          >
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(val) => setTypeFilter(val as '1-1' | 'GROUP' | 'ALL')}
          >
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="1-1">1-1</SelectItem>
              <SelectItem value="GROUP">Group</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle>Student Directory</CardTitle>
          <CardDescription>Showing {students.length} results</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No students found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {getInitials(student.studentName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{student.studentName}</span>
                          <span className="text-xs text-muted-foreground">
                            {student.parentName}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-normal',
                          student.studentType === '1-1'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}
                      >
                        {student.studentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {student.level || (
                        <span className="text-muted-foreground text-xs italic">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'font-medium border shadow-none',
                          student.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
                            : student.status === 'PAUSED'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                              : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
                        )}
                      >
                        {student.status.charAt(0) + student.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm',
                            !student.assignedCoachId && 'text-muted-foreground italic text-xs'
                          )}
                        >
                          {getCoachName(student.assignedCoachId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(student)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ShieldAlert className="mr-2 h-4 w-4" /> Set Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: student.id,
                                    status: 'ACTIVE',
                                  })
                                }
                                disabled={student.status === 'ACTIVE'}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: student.id,
                                    status: 'PAUSED',
                                  })
                                }
                                disabled={student.status === 'PAUSED'}
                              >
                                <PauseCircle className="mr-2 h-4 w-4 text-yellow-500" /> Paused
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: student.id,
                                    status: 'CANCELLED',
                                  })
                                }
                                disabled={student.status === 'CANCELLED'}
                              >
                                <XCircle className="mr-2 h-4 w-4 text-red-500" /> Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <div className="flex items-center space-x-2">
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
          </div>
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student profile linked to a parent account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Reused fields from original file, kept simpler for brevity as logic is stubbed */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-studentName">Student Name *</Label>
                <Input
                  id="add-studentName"
                  value={addFormData.studentName}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      studentName: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-parentName">Parent Name *</Label>
                <Input
                  id="add-parentName"
                  value={addFormData.parentName}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      parentName: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-parentEmail">Parent Email *</Label>
              <Input
                id="add-parentEmail"
                type="email"
                value={addFormData.parentEmail}
                onChange={(e) =>
                  setAddFormData({
                    ...addFormData,
                    parentEmail: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Students are typically created when a demo is converted to a
                paid enrollment. Use the{' '}
                <Link href="/admin/demos" className="underline font-medium">
                  Demo Pipeline
                </Link>{' '}
                for the standard enrollment flow.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Student</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>Update student information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-studentName">Student Name</Label>
                <Input
                  id="edit-studentName"
                  value={editFormData.studentName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      studentName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-studentAge">Age</Label>
                <Input
                  id="edit-studentAge"
                  type="number"
                  value={editFormData.studentAge}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      studentAge: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-parentName">Parent Name</Label>
              <Input
                id="edit-parentName"
                value={editFormData.parentName}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    parentName: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-level">Level</Label>
                <Select
                  value={editFormData.level}
                  onValueChange={(val) => setEditFormData({ ...editFormData, level: val })}
                >
                  <SelectTrigger id="edit-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="Expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={editFormData.country}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-timezone">Timezone</Label>
              <Input
                id="edit-timezone"
                value={editFormData.timezone}
                onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStudentMutation.isPending}>
                {updateStudentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {isDetailsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : studentDetails ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(studentDetails.studentName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{studentDetails.studentName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {studentDetails.studentType}
                    </Badge>
                    <Badge
                      variant={studentDetails.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {studentDetails.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Parent Name</span>
                  <p className="font-medium">{studentDetails.parentName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Age</span>
                  <p className="font-medium">{studentDetails.studentAge || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Level</span>
                  <p className="font-medium">{studentDetails.level || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Location</span>
                  <p className="font-medium">{studentDetails.country || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-muted-foreground text-sm">Assigned Coach</span>
                <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {getCoachName(studentDetails.assignedCoachId)}
                  </span>
                  {studentDetails.assignedCoachId && (
                    <Badge variant="outline" className="text-xs">
                      Coach
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-2 text-xs text-muted-foreground">
                Joined {format(new Date(studentDetails.createdAt), 'MMMM d, yyyy')}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Student details not available.</p>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
