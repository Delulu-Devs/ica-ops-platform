'use client';

import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';

export default function DemoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    studentName: '',
    studentAge: '',
    parentName: '',
    parentEmail: '',
    date: '',
    time: '',
  });

  const mutation = trpc.demo.create.useMutation({
    onSuccess: () => {
      toast.success('Demo Booked!', {
        description: `We have sent a confirmation email to ${formData.parentEmail}`,
      });
      // Optional: Redirect to success page or home
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

    // Basic validation
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
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour

      mutation.mutate({
        studentName: formData.studentName,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
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

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col font-sans">
      <header className="w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Back to Home
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl border-0 bg-background">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-4 text-center pb-8 border-b">
              <div className="mx-auto h-12 w-12 bg-secondary rounded-xl flex items-center justify-center mb-2">
                <Trophy className="h-7 w-7 text-secondary-foreground" />
              </div>
              <CardTitle className="text-3xl font-bold text-primary">
                Book Your Free Assessment
              </CardTitle>
              <CardDescription className="text-lg">
                Schedule a 1-on-1 session with our expert coaches to evaluate your skill level.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-l-4 border-primary pl-3">
                  Student Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name</Label>
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
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-l-4 border-secondary pl-3">
                  Parent Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent Name</Label>
                    <Input
                      id="parentName"
                      value={formData.parentName}
                      onChange={handleChange}
                      placeholder="e.g. Amit Kumar"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Email Address</Label>
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

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-l-4 border-green-600 pl-3">
                  Schedule Preference
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date</Label>
                    <Input
                      id="date"
                      value={formData.date}
                      onChange={handleChange}
                      type="date"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Input
                      id="time"
                      value={formData.time}
                      onChange={handleChange}
                      type="time"
                      required
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  *Times are in your local timezone. Our team will confirm the slot availability via
                  email.
                </p>
              </div>

              <Button
                className="w-full font-bold text-lg h-14"
                size="lg"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </CardContent>
            <CardFooter className="bg-muted/30 p-6 text-center text-sm text-muted-foreground rounded-b-xl border-t">
              By booking a demo, you agree to our Terms of Service and Privacy Policy.
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
