'use client';

import { Check, ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CreateChatDialogProps {
  onChatCreated: (roomId: string) => void;
}

export function CreateChatDialog({ onChatCreated }: CreateChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const { data: contacts, isLoading } = trpc.chat.getContacts.useQuery(undefined, {
    enabled: open,
  });

  const createDMMutation = trpc.chat.createDM.useMutation({
    onSuccess: (data) => {
      setOpen(false);
      onChatCreated(data.roomId);
      toast.success('Conversation started');
    },
    onError: (err) => {
      toast.error('Failed to start conversation', { description: err.message });
    },
  });

  const handleStartChat = () => {
    if (!selectedContact) return;
    createDMMutation.mutate({ targetAccountId: selectedContact });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Start a conversation with a coach, student, or admin.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4">
            <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Search people..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {isLoading ? (
                    <div className="p-4 flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div>
                ) : (
                    <CommandGroup heading="Contacts">
                    {contacts?.map((contact) => (
                        <CommandItem
                        key={contact.accountId}
                        value={contact.name + ' ' + contact.email}
                        onSelect={() => {
                            setSelectedContact(contact.accountId);
                        }}
                        className="cursor-pointer"
                        >
                        <div className="flex items-center gap-3 w-full">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{contact.name.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium">{contact.name}</span>
                                <span className="text-xs text-muted-foreground">{contact.role}</span>
                            </div>
                            {selectedContact === contact.accountId && (
                                <Check className="ml-auto h-4 w-4 text-primary" />
                            )}
                        </div>
                        </CommandItem>
                    ))}
                    </CommandGroup>
                )}
            </CommandList>
            </Command>
        </div>

        <div className="p-4 bg-muted/50 flex justify-end">
             <Button onClick={handleStartChat} disabled={!selectedContact || createDMMutation.isPending}>
                {createDMMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Chat
             </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
