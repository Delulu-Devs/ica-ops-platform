'use client';

import { format } from 'date-fns';
import {
  CalendarDays,
  CheckCircle,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';

export default function CoachesPage() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // View Dialog State
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Edit Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    bio: '',
    rating: '',
    specializations: '',
  });

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [coachToDelete, setCoachToDelete] = useState<string | null>(null);

  // Form state for new coach
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    bio: '',
    rating: '',
    specializations: '',
  });

  // Queries
  const { data, isLoading, refetch } = trpc.coach.list.useQuery({
    limit: 100, // Fetch more for client-side search if needed, or stick to pagination
    offset: page * 10,
  });

  const { data: selectedCoach, isLoading: isCoachLoading } = trpc.coach.getById.useQuery(
    { id: selectedCoachId! },
    { enabled: !!selectedCoachId && isViewDialogOpen }
  );

  // Mutations
  const createAccountMutation = trpc.auth.createAccount.useMutation({
    onSuccess: () => {
      toast.success('Coach account created successfully!');
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to create coach', { description: error.message });
    },
  });

  const updateCoachMutation = trpc.coach.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success('Coach profile updated successfully!');
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to update coach', { description: error.message });
    },
  });

  const deleteCoachMutation = trpc.coach.delete.useMutation({
    onSuccess: () => {
      toast.success('Coach deleted successfully!');
      setIsDeleteDialogOpen(false);
      setCoachToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to delete coach', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      bio: '',
      rating: '',
      specializations: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    createAccountMutation.mutate({
      email: formData.email,
      password: formData.password,
      role: 'COACH',
      name: formData.name,
      bio: formData.bio,
      rating: formData.rating ? parseInt(formData.rating, 10) : undefined,
      specializations: formData.specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;

    updateCoachMutation.mutate({
      id: editFormData.id,
      name: editFormData.name,
      bio: editFormData.bio,
      rating: editFormData.rating ? parseInt(editFormData.rating, 10) : undefined,
      specializations: editFormData.specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const openViewDialog = (id: string) => {
    setSelectedCoachId(id);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (coach: {
    id: string;
    name: string;
    bio?: string | null;
    rating?: number | string | null;
    specializations?: string[] | null;
  }) => {
    setEditFormData({
      id: coach.id,
      name: coach.name,
      bio: coach.bio || '',
      rating: coach.rating?.toString() || '',
      specializations: coach.specializations?.join(', ') || '',
    });
    setIsEditDialogOpen(true);
  };

  const filteredCoaches = (data?.coaches || []).filter((coach) =>
    coach.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived stats
  const totalCoaches = data?.total || 0;
  // Assuming all listed are active for now as there's no status field in schema visible in list
  const activeCoaches = totalCoaches;

  const getInitials = (name: string) => {
    return (name || '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Coaches</h2>
          <p className="text-muted-foreground mt-1">
            Manage your team of expert chess instructors.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Add Coach
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Coaches
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoaches}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered instructors</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Status
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCoaches}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>
        {/* Placeholder stats for future expansion */}
        <Card className="shadow-sm border-l-4 border-l-purple-500 opacity-80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2200+</div>
            <p className="text-xs text-muted-foreground mt-1">Grandmaster level</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-orange-500 opacity-80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {/* TODO: Connect to real sessions data when available. 
                Currently hardcoded to 0/placeholder as per requirements/current implementation state. */}
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Completed this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coaches by name..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle>Coach Directory</CardTitle>
          <CardDescription>Showing {filteredCoaches.length} results</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Coach</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Specializations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
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
              ) : filteredCoaches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No coaches found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoaches.map((coach) => (
                  <TableRow key={coach.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${coach.name}`}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {getInitials(coach.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{coach.name}</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline-block">
                            ID: {coach.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="font-normal">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {coach.rating ?? 'N/A'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {coach.specializations?.slice(0, 2).map((spec) => (
                          <Badge
                            key={spec}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {spec}
                          </Badge>
                        ))}
                        {coach.specializations && coach.specializations.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5 bg-muted/50"
                          >
                            +{coach.specializations.length - 2}
                          </Badge>
                        )}
                        {(!coach.specializations || coach.specializations.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">None listed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 shadow-none">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coach.createdAt ? format(new Date(coach.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openViewDialog(coach.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(coach)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              setCoachToDelete(coach.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Coach
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-xs text-muted-foreground">
              Showing {filteredCoaches.length} of {totalCoaches} coaches
            </div>
            <div className="flex gap-2">
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
                disabled={!data || data.coaches.length < 100 || isLoading} // Adjusted for higher limit
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Coach Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Coach</DialogTitle>
            <DialogDescription>
              Create a new coach account. They will receive login credentials via email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter coach's full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="coach@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Initial Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Chess Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  value={formData.rating}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val) && val < 0) return;
                    setFormData({ ...formData, rating: e.target.value });
                  }}
                  placeholder="e.g., 2200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specializations">Specializations</Label>
                <Input
                  id="specializations"
                  value={formData.specializations}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specializations: e.target.value,
                    })
                  }
                  placeholder="e.g., Openings, Endgames"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description of the coach's experience and teaching style..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Coach'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Coach Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Coach Profile</DialogTitle>
            <DialogDescription>Update coach details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rating">Chess Rating</Label>
                <Input
                  id="edit-rating"
                  type="number"
                  min="0"
                  value={editFormData.rating}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val) && val < 0) return;
                    setEditFormData({
                      ...editFormData,
                      rating: e.target.value,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-specializations">Specializations</Label>
                <Input
                  id="edit-specializations"
                  value={editFormData.specializations}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      specializations: e.target.value,
                    })
                  }
                  placeholder="Comma separated"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={editFormData.bio}
                onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCoachMutation.isPending}>
                {updateCoachMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Coach Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Coach Profile</DialogTitle>
          </DialogHeader>
          {isCoachLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCoach ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/10">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCoach.name}`}
                  />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(selectedCoach.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-xl">{selectedCoach.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary" className="font-normal">
                      {selectedCoach.rating ? `Rating: ${selectedCoach.rating}` : 'No Rating'}
                    </Badge>
                    <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none">
                      Coach
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <h4 className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                    Students
                  </h4>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{selectedCoach.studentCount || 0} Active</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                    Joined
                  </h4>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">
                      {selectedCoach.createdAt
                        ? format(new Date(selectedCoach.createdAt), 'MMM yyyy')
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCoach.bio && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">About</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-md">
                    {selectedCoach.bio}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCoach.specializations && selectedCoach.specializations.length > 0 ? (
                    selectedCoach.specializations.map((spec) => (
                      <Badge key={spec} variant="outline" className="bg-background">
                        {spec}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      No specializations listed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Coach details not found.</div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the coach account, their
              profile data, and remove their access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCoachToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (coachToDelete) {
                  deleteCoachMutation.mutate({ id: coachToDelete });
                }
              }}
              disabled={deleteCoachMutation.isPending}
            >
              {deleteCoachMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
