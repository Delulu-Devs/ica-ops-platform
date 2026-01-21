'use client';

import { format } from 'date-fns';
import {
  ArrowLeft,
  File,
  Loader2,
  MessageSquareOff,
  MessageSquareText,
  Search,
  Send,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatSocket } from '@/hooks/useChatSocket';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { CreateChatDialog } from './create-chat-dialog';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ChatContent() {
  const user = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('roomId');

  const [selectedRoom, setSelectedRoom] = useState<string | null>(initialRoomId);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update selectedRoom if URL param changes (e.g. navigation)
  useEffect(() => {
    const roomId = searchParams.get('roomId');
    if (roomId) {
      setSelectedRoom(roomId);
    }
  }, [searchParams]);

  const { data: rooms, isLoading: isRoomsLoading } = trpc.chat.getRooms.useQuery();

  const {
    data: messages,
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = trpc.chat.getMessages.useQuery(
    { roomId: selectedRoom || '' },
    {
      enabled: !!selectedRoom,
      refetchInterval: 5000,
    }
  );

  const utils = trpc.useUtils();

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput('');
      refetchMessages();
    },
  });

  const uploadFileMutation = trpc.chat.uploadFile.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success('File shared successfully');
    },
    onError: (error) => {
      toast.error(`Failed to share file: ${error.message}`);
    },
  });

  const markAsReadMutation = trpc.chat.markAsRead.useMutation({
    onSuccess: () => {
      utils.chat.getRooms.invalidate();
    },
  });

  // Track if we've already marked as read to prevent loops
  const lastMarkedRoom = useRef<string | null>(null);
  const lastMessageCount = useRef<number>(0);

  // Store mutation in ref to avoid dependency issues
  const markAsReadRef = useRef(markAsReadMutation.mutate);
  markAsReadRef.current = markAsReadMutation.mutate;

  // Mark as read when room opens or new messages arrive
  useEffect(() => {
    if (!selectedRoom || !messages) return;

    const hasUnread = messages.some((m) => !m.isRead && m.senderId !== user?.id);
    const isNewContext =
      selectedRoom !== lastMarkedRoom.current || messages.length > lastMessageCount.current;

    if (hasUnread && isNewContext) {
      lastMarkedRoom.current = selectedRoom;
      lastMessageCount.current = messages.length;
      markAsReadRef.current({ roomId: selectedRoom });
    }
  }, [selectedRoom, messages, user?.id]);

  // Real Socket.io hook for real-time updates
  const handleNewMessage = useCallback(() => {
    refetchMessages();
  }, [refetchMessages]);

  /* State to track online status overrides from socket events */
  const [onlineStatusOverrides, setOnlineStatusOverrides] = useState<Record<string, boolean>>({});

  const handlePresenceChange = useCallback(
    (event: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineStatusOverrides((prev) => ({
        ...prev,
        [event.userId]: event.status === 'online',
      }));
    },
    []
  );

  const { typingUsers } = useChatSocket({
    roomId: selectedRoom,
    onMessage: handleNewMessage,
    onPresenceChange: handlePresenceChange,
  });

  // Calculate if the other participant is online
  const selectedRoomData = rooms?.find((r) => r.roomId === selectedRoom);
  const isPeerOnline = useMemo(() => {
    if (!selectedRoomData || !selectedRoomData.otherParticipantId) return false;

    // Check override first, then fallback to initial state
    if (selectedRoomData.otherParticipantId in onlineStatusOverrides) {
      return onlineStatusOverrides[selectedRoomData.otherParticipantId];
    }

    return selectedRoomData.isOnline || false;
  }, [selectedRoomData, onlineStatusOverrides]);

  // Auto-scroll to bottom
  useEffect(() => {
    // Trigger scroll when messages or typing status changes
    if (scrollRef.current && (messages || typingUsers)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]); // Scroll when messages arrive or someone types

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !messageInput.trim()) return;
    sendMessageMutation.mutate({
      roomId: selectedRoom,
      content: messageInput,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedRoom) {
      // Simulate file upload for hackathon/demo purposes
      // In a real app, this would upload to S3/UploadThing
      // Using a random placeholder suitable for file type would be better, but generic is fine.
      // If it's an image, use placehold.co
      let fakeUrl = `https://scholar-chess-assets.s3.amazonaws.com/uploads/${file.name}`;
      if (file.type.startsWith('image/')) {
        fakeUrl = `https://placehold.co/600x400?text=${encodeURIComponent(file.name)}`;
      }

      uploadFileMutation.mutate({
        roomId: selectedRoom,
        fileName: file.name,
        fileUrl: fakeUrl,
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredRooms = rooms?.filter((room) => {
    const term = searchQuery.toLowerCase();
    const lastMsg = room.lastMessage?.content?.toLowerCase() || '';
    const roomName = room.name?.toLowerCase() || '';
    return (
      room.roomId.toLowerCase().includes(term) || lastMsg.includes(term) || roomName.includes(term)
    );
  });

  const canUpload = user?.role === 'ADMIN' || user?.role === 'COACH';

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 md:grid-cols-4 gap-4 relative">
      {/* Rooms List - Hidden on mobile if chat is selected */}
      <Card
        className={cn(
          'md:col-span-1 h-full flex flex-col border-none shadow-md transition-all duration-300',
          selectedRoom ? 'hidden md:flex' : 'flex'
        )}
      >
        <CardHeader className="p-4 border-b space-y-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-primary">Messages</CardTitle>
            <CreateChatDialog onChatCreated={setSelectedRoom} />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-9 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {isRoomsLoading ? (
              <div className="flex flex-col gap-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredRooms?.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
                <MessageSquareOff className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No conversations found.</p>
              </div>
            ) : (
              filteredRooms?.map((room) => {
                // Determine online status for list items too if possible, but for now focus on selected
                const otherId = room.otherParticipantId;
                const isOnline = otherId
                  ? (onlineStatusOverrides[otherId] ?? room.isOnline)
                  : false;

                return (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => setSelectedRoom(room.roomId)}
                    className={cn(
                      'flex flex-row items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-muted/80 group relative',
                      selectedRoom === room.roomId
                        ? 'bg-muted shadow-sm ring-1 ring-border'
                        : 'transparent'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border group-hover:border-primary/50 transition-colors">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(room.name || (room.roomId.includes('dm') ? 'DM' : 'GP'))}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator for list */}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background ring-1 ring-background"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate">
                          {room.name ||
                            (room.roomId.startsWith('dm:') ? 'Direct Message' : 'Group Chat')}
                        </span>
                        {room.unreadCount > 0 && room.roomId !== selectedRoom && (
                          <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p
                          className={cn(
                            'text-xs truncate max-w-[140px]',
                            room.unreadCount > 0
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground'
                          )}
                        >
                          {room.lastMessage?.content || 'No messages yet'}
                        </p>
                        {room.lastMessage?.createdAt && (
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                            {format(new Date(room.lastMessage.createdAt), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area - Hidden on mobile if no chat selected */}
      <Card
        className={cn(
          'md:col-span-3 h-full flex flex-col border-none shadow-md overflow-hidden bg-background/50 backdrop-blur-sm',
          !selectedRoom ? 'hidden md:flex' : 'flex'
        )}
      >
        {selectedRoom ? (
          <>
            <CardHeader className="p-3 border-b flex flex-row items-center space-y-0 gap-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="md:hidden h-8 w-8 -ml-2"
                onClick={() => setSelectedRoom(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="relative">
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(
                      selectedRoomData?.name || (selectedRoom.startsWith('dm:') ? 'DM' : 'GP')
                    )}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator for header */}
                {isPeerOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2">
                  {selectedRoomData?.name ||
                    (selectedRoom.startsWith('dm:') ? 'Direct Message' : 'Group Chat')}
                  {selectedRoomData?.otherParticipantRole && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground uppercase tracking-wide">
                      {selectedRoomData.otherParticipantRole}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {/* Status text */}
                  {selectedRoomData?.type === 'dm' ? (
                    isPeerOnline ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        Online
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Offline</span>
                    )
                  ) : (
                    // For groups, show member count or nothing
                    <span className="text-muted-foreground">Group Chat</span>
                  )}
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4 bg-muted/10">
              <div className="flex flex-col gap-6 max-w-3xl mx-auto" ref={scrollRef}>
                {isMessagesLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-primary/50" />
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 mt-10 text-muted-foreground text-center">
                    <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                      <MessageSquareText className="h-10 w-10 opacity-30" />
                    </div>
                    <h3 className="text-lg font-semibold">No messages yet</h3>
                    <p className="text-sm max-w-xs mt-1">
                      Send a message to start the conversation.
                    </p>
                  </div>
                ) : (
                  messages?.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = true;

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex w-full gap-2', isMe ? 'justify-end' : 'justify-start')}
                      >
                        {!isMe && showAvatar && (
                          <Avatar className="h-8 w-8 mt-1 border">
                            <AvatarFallback className="text-xs">U</AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={cn(
                            'flex flex-col gap-1 max-w-[75%] md:max-w-[60%]',
                            isMe ? 'items-end' : 'items-start'
                          )}
                        >
                          <div
                            className={cn(
                              'px-4 py-2.5 rounded-2xl text-sm shadow-sm',
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-white dark:bg-muted border text-foreground rounded-tl-sm'
                            )}
                          >
                            {msg.messageType === 'file' ? (
                              <a
                                href={msg.fileUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 underline visited:text-white"
                              >
                                <File className="h-4 w-4" />
                                {msg.content}
                              </a>
                            ) : (
                              <p className="leading-relaxed">{msg.content}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground px-1 select-none">
                              {format(new Date(msg.createdAt), 'h:mm a')}
                            </span>
                            {isMe && (
                              <span className="text-[10px] text-muted-foreground">
                                {msg.isRead ? 'Read' : 'Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start w-full gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Avatar className="h-8 w-8 mt-1 border">
                      <AvatarFallback>...</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1 h-[38px]">
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <CardFooter className="p-3 border-t bg-background/50 backdrop-blur-sm">
              <form
                onSubmit={handleSendMessage}
                className="flex w-full items-center gap-2 max-w-3xl mx-auto"
              >
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sendMessageMutation.isPending}
                    className="pr-10 shadow-none border-muted-foreground/20 focus-visible:ring-1"
                  />

                  {/* Attachment Button - Only for Admins and Coaches */}
                  {canUpload && (
                    <>
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.png,.jpg,.jpeg,.pgn"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadFileMutation.isPending}
                      >
                        {uploadFileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <File className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  size="icon"
                  type="submit"
                  disabled={sendMessageMutation.isPending || !messageInput.trim()}
                  className={cn(
                    'transition-all duration-300',
                    messageInput.trim()
                      ? 'translate-x-0 opacity-100'
                      : 'translate-x-2 opacity-50 scale-90'
                  )}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <MessageSquareText className="h-10 w-10 text-primary/40" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Select a Conversation</h2>
            <p className="max-w-md text-center text-muted-foreground">
              Choose a conversation from the sidebar to start chatting or start a new one.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
