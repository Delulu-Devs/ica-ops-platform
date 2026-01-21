"use client";

import { format } from "date-fns";
import {
  Calendar,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: batch, isLoading: isBatchLoading } =
    trpc.batch.getById.useQuery({ id: batchId });
  const { data: students, isLoading: isStudentsLoading } =
    trpc.batch.getStudents.useQuery({
      batchId,
    });

  // We reuse the chat messages to show "Materials" (files shared in chat)
  const { data: messages, refetch: refetchMessages } =
    trpc.chat.getMessages.useQuery(
      { roomId: `batch:${batchId}` },
      { enabled: !!batchId },
    );

  const materials = useMemo(() => {
    return messages?.filter((m) => m.messageType === "file") || [];
  }, [messages]);

  const uploadFileMutation = trpc.chat.uploadFile.useMutation({
    onSuccess: () => {
      toast.success("Material shared successfully");
      refetchMessages();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let fakeUrl = `https://scholar-chess-assets.s3.amazonaws.com/uploads/${file.name}`;
      if (file.type.startsWith("image/")) {
        fakeUrl = `https://placehold.co/600x400?text=${encodeURIComponent(file.name)}`;
      }

      uploadFileMutation.mutate({
        roomId: `batch:${batchId}`,
        fileName: file.name,
        fileUrl: fakeUrl,
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isBatchLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return <div>Batch not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/coach/schedule"
              className="text-muted-foreground hover:text-primary text-sm flex items-center"
            >
              <Users className="h-3 w-3 mr-1" /> Back to Schedule
            </Link>
          </div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {batch.name}
            <Badge variant="outline" className="text-base font-normal ml-2">
              {batch.level}
            </Badge>
          </h2>
          <div className="flex items-center gap-4 text-muted-foreground mt-2 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {batch.studentCount} / {batch.maxStudents} Students
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {batch.schedule || "Flexible Schedule"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/chat?roomId=batch:${batch.id}`}>Open Chat</Link>
          </Button>
          <Button>
            <Video className="mr-2 h-4 w-4" />
            Start Class
          </Button>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Student Roster</TabsTrigger>
          <TabsTrigger value="materials">Class Materials</TabsTrigger>
        </TabsList>

        {/* Student Roster Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                Manage and track students in this batch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isStudentsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : students?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students enrolled yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {students?.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {student.studentName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{student.studentName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Rating: {student.rating || "N/A"}</span>
                            <span>•</span>
                            <span className="capitalize">
                              {student.status.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Message Parent</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Class Materials</CardTitle>
                <CardDescription>
                  Files and resources shared with this batch.
                </CardDescription>
              </div>
              <div>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.pgn"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadFileMutation.isPending}
                >
                  {uploadFileMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Upload Material
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-dashed border-2">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No materials uploaded yet.</p>
                  <p className="text-sm">
                    Upload PDFs, PGNs, or images for your students.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((file) => (
                    <a
                      key={file.id}
                      href={file.fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all group"
                    >
                      <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-medium truncate pr-2"
                          title={file.content}
                        >
                          {file.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Shared{" "}
                          {format(new Date(file.createdAt), "MMM d, yyyy"
        </TabsContent>
      </Tabs>
    </div>
  );
}
