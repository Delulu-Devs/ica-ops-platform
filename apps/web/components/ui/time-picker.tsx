'use client';

import { Clock } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  label?: string;
  className?: string;
  shouldDisableTime?: (timeValue: string) => boolean;
}

export function TimePicker({
  value,
  onChange,
  className,
  label = 'Pick a time',
  shouldDisableTime,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Helper to generate time options (every 15 mins)
  const timeOptions = React.useMemo(() => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour = h.toString().padStart(2, '0');
        const minute = m.toString().padStart(2, '0');

        // Create 12-hour label
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 || 12;
        const displayLabel = `${displayHour}:${minute} ${period}`;

        times.push({
          value: `${hour}:${minute}`,
          label: displayLabel,
        });
      }
    }
    return times;
  }, []);

  const displayValue = React.useMemo(() => {
    if (!value) return undefined;
    const option = timeOptions.find((t) => t.value === value);
    return option ? option.label : value;
  }, [value, timeOptions]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue || label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <div className="h-64 overflow-y-auto p-2">
          {timeOptions.map((option) => {
            const isDisabled = shouldDisableTime ? shouldDisableTime(option.value) : false;
            return (
              <button
                type="button"
                key={option.value}
                className={cn(
                  'w-full text-left cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                  value === option.value && 'bg-accent text-accent-foreground',
                  isDisabled && 'pointer-events-none opacity-50'
                )}
                onClick={() => {
                  if (isDisabled) return;
                  if (onChange) onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
