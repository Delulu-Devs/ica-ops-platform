'use client';

import { format, isBefore, isSameDay, startOfToday } from 'date-fns';
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Mail, Star, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/time-picker';
import { trpc } from '@/lib/trpc';

export default function DemoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<{
    studentName: string;
    studentAge: string;
    country: string;
    parentName: string;
    parentEmail: string;
    date: Date | undefined;
    time: string;
  }>({
    studentName: '',
    studentAge: '',
    country: '',
    parentName: '',
    parentEmail: '',
    date: undefined,
    time: '',
  });

  const mutation = trpc.demo.create.useMutation({
    onSuccess: () => {
      toast.success('Demo Booked!', {
        description: `We have sent a confirmation email to ${formData.parentEmail}`,
      });
      router.push('/');
    },
    onError: (err: { message: string }) => {
      toast.error('Booking Failed', {
        description: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.studentName ||
      !formData.parentName ||
      !formData.parentEmail ||
      !formData.date ||
      !formData.time
    ) {
      toast.error('Missing Fields', {
        description: 'Please fill in all required fields.',
      });
      return;
    }

    try {
      const dateStr = formData.date ? format(formData.date, 'yyyy-MM-dd') : '';
      const startDateTime = new Date(`${dateStr}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour

      mutation.mutate({
        studentName: formData.studentName,
        studentAge: formData.studentAge ? parseInt(formData.studentAge, 10) : undefined,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        country: formData.country || undefined,
        scheduledStart: startDateTime.toISOString(),
        scheduledEnd: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (_e) {
      toast.error('Invalid Date/Time');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Check if time is in the past
  const shouldDisableTime = (timeValue: string) => {
    if (!formData.date) return false;

    // Only check if date is today
    if (isSameDay(formData.date, new Date())) {
      const [hours, minutes] = timeValue.split(':').map(Number);

      if (hours === undefined || minutes === undefined) return false;

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      if (hours < currentHours) return true;
      if (hours === currentHours && minutes <= currentMinutes) return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col lg:flex-row">
      {/* Left Panel - Marketing Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-6 lg:p-8 text-primary-foreground relative overflow-hidden lg:sticky lg:top-0 lg:h-screen">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="hidden lg:flex items-center gap-2 group w-fit mb-8">
            <ArrowLeft className="h-5 w-5 text-primary-foreground/80 group-hover:text-primary-foreground transition-colors" />
            <span className="font-medium text-primary-foreground/80 group-hover:text-primary-foreground transition-colors">
              Back to Home
            </span>
          </Link>

          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
              Master Chess with <br />
              <span className="text-secondary">Grandmaster-Proven</span> Strategies
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-lg">
              Unlock your potential with personalized coaching tailored to your skill level. Join
              thousands of students improving their game today.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {[
              'Personalized Learning Roadmap',
              'Expert Coaching Feedback',
              'Flexible Scheduling (24/7)',
              'Interactive Practice Tools',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-secondary" />
                </div>
                <span className="font-medium text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-8 bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-6 border border-primary-foreground/10">
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-5 w-5 text-secondary fill-secondary" />
            ))}
          </div>
          <p className="text-lg italic mb-4">
            "The coaching I received here completely transformed my opening repertoire. I went from
            1200 to 1600 ELO in just 3 months!"
          </p>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground">
              JS
            </div>
            <div>
              <p className="font-semibold">John Smith</p>
              <p className="text-sm text-primary-foreground/70">Club Player</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Booking Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-background">
        <div className="lg:hidden p-4 border-b bg-background">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        <main className="flex-1 flex flex-col justify-center p-6 lg:p-12 w-full max-w-2xl mx-auto">
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Book Your Free Assessment</h2>
            <p className="text-muted-foreground mt-2 text-lg">
              Fill in the details below to schedule your 1-on-1 session.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Student Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="studentName">
                    Student Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="studentName"
                    value={formData.studentName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Kumar"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentAge">Student Age</Label>
                  <Input
                    id="studentAge"
                    value={formData.studentAge}
                    onChange={handleChange}
                    type="number"
                    min={0}
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="e.g. India"
                  />
                </div>
              </div>
            </div>

            {/* Parent Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Parent Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="parentName">
                    Parent Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={handleChange}
                    placeholder="e.g. Amit Kumar"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    type="email"
                    placeholder="amit@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Availability</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>
                    Preferred Date <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    date={formData.date}
                    setDate={(date) => setFormData((prev) => ({ ...prev, date }))}
                    disabledDates={(date) => isBefore(date, startOfToday())}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Preferred Time <span className="text-destructive">*</span>
                  </Label>
                  <TimePicker
                    value={formData.time}
                    onChange={(time) => setFormData((prev) => ({ ...prev, time }))}
                    shouldDisableTime={shouldDisableTime}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3 bg-primary/5 p-4 rounded-lg text-sm text-muted-foreground border border-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p>
                  We'll email you to confirm the exact slot based on your preference. Times are in
                  your local timezone.
                </p>
              </div>
            </div>

            <div className="pt-6">
              <Button
                className="w-full font-bold text-lg h-12"
                size="lg"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Booking...
                  </>
                ) : (
                  'Confirm Free Booking'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                No credit card required. By booking, you agree to our Terms of Service.
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
