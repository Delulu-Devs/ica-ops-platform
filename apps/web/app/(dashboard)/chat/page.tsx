"use client";

import { format } from "date-fns";
import { Send, File, Loader2, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatSocket } from "@/hooks/useChatSocket";
import { CreateChatDialog } from "./create-chat-dialog";

export default function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: rooms, isLoading: isRoomsLoading } =
    trpc.chat.getRooms.useQuery();

  const {
    data: messages,
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = trpc.chat.getMessages.useQuery(
    { roomId: selectedRoom || "" },
    {
      enabled: !!selectedRoom,
      refetchInterval: 5000,
    },
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
  });

  // Real Socket.io hook for real-time updates
  const handleNewMessage = useCallback(() => {
    refetchMessages();
  }, [refetchMessages]);

  const { isConnected, typingUsers } = useChatSocket({
    roomId: selectedRoom,
    onMessage: handleNewMessage,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !messageInput.trim()) return;
    sendMessageMutation.mutate({
      roomId: selectedRoom,
      content: messageInput,
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Rooms List */}
      <Card className="md:col-span-1 h-full flex flex-col border-none shadow-md">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <CreateChatDialog onChatCreated={setSelectedRoom} />
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {isRoomsLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin h-5 w-5" />
              </div>
            ) : rooms?.length === 0 ? (
              <div className="text-center text-muted-foreground p-4 text-sm">
                No conversations yet.
              </div>
            ) : (
              rooms?.map((room) => (
                <button
                  key={room.roomId}
                  onClick={() => setSelectedRoom(room.roomId)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
                    selectedRoom === room.roomId ? "bg-muted" : "",
                  )}
                >
                  <div className="font-medium truncate w-full">
                    {room.roomId.startsWith("dm:")
                      ? "Direct Message"
                      : "Batch Chat"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate w-full">
                    {room.lastMessage?.content || "No messages"}
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                      {room.unreadCount} new
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-3 h-full flex flex-col border-none shadow-md">
        {selectedRoom ? (
          <>
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
              <div className="font-semibold flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>C</AvatarFallback>
                </Avatar>
                <span>
                  {selectedRoom.startsWith("dm:")
                    ? "Direct Message"
                    : "Group Chat"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {isConnected ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Wifi className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <WifiOff className="h-3 w-3" /> Connecting...
                  </span>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-4" ref={scrollRef}>
                {isMessagesLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-6 w-6" />
                  </div>
                ) : (
                  messages?.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                          isMe
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p>{msg.content}</p>
                        <span
                          className={cn(
                            "text-[10px]",
                            isMe
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <CardFooter className="p-4 border-t">
              <form
                onSubmit={handleSendMessage}
                className="flex w-full items-center gap-2"
              >
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  size="icon"
                  type="submit"
                  disabled={
                    sendMessageMutation.isPending || !messageInput.trim()
                  }
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
