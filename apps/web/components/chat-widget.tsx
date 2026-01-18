'use client';

import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ChatPage from '@/app/(dashboard)/chat/page';

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 hover:scale-105 transition-transform"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Messages</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden p-6 pt-2">
            {/* Reusing the ChatPage logic but in a compact view if needed */}
            <ChatPage />
        </div>
      </SheetContent>
    </Sheet>
  );
}
