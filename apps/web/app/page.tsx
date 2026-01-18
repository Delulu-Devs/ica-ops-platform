import { ArrowRight, BookOpen, CheckCircle2, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">ICA Ops</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Login
              </Button>
            </Link>
            <Link href="/demo">
              <Button className="font-semibold shadow-md">Book a Free Demo</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-top-left scale-110" />
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              Now accepting new students for 2026
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary mb-6 animate-fade-in-up md:leading-tight">
              Master Chess. <br className="hidden md:inline" />
              <span className="text-secondary">Master Life.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up delay-100">
              Join the Indian Chess Academy to foster critical thinking, patience, and strategy. We
              don't just teach the game; we build character.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
              <Link href="/demo" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-12">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-primary mb-4">
                Why Choose ICA?
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our comprehensive platform and expert curriculum are designed to help every student
                reach their full potential.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Users,
                  title: 'Expert Coaching',
                  description:
                    'Learn from FIDE rated coaches with years of experience in verifying content.',
                  color: 'text-blue-600',
                },
                {
                  icon: Trophy,
                  title: 'Structured Curriculum',
                  description:
                    'From beginner to master, our step-by-step curriculum ensures steady progress.',
                  color: 'text-secondary',
                },
                {
                  icon: BookOpen,
                  title: 'Life Values',
                  description:
                    'We emphasize discipline, patience, and sportsmanship alongside tactical skills.',
                  color: 'text-green-600',
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  className="border-none shadow-md hover:shadow-xl transition-shadow duration-300"
                >
                  <CardHeader>
                    <div
                      className={`h-12 w-12 rounded-lg bg-background border flex items-center justify-center mb-4 ${feature.color}`}
                    >
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: '5000+', label: 'Students' },
                { number: '120+', label: 'Expert Coaches' },
                { number: '15+', label: 'Countries' },
                { number: '4.9/5', label: 'Parent Rating' },
              ].map((stat) => (
                <div key={stat.label} className="p-4">
                  <div className="text-4xl md:text-5xl font-bold mb-2 text-secondary">
                    {stat.number}
                  </div>
                  <div className="text-primary-foreground/80 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 container mx-auto px-4 text-center">
          <div className="bg-background border rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-secondary/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                Ready to Make Your Move?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                Book a free demo session today and let our coaches assess the best path forward for
                your chess journey.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-8 py-6 text-lg shadow-xl shadow-secondary/20 hover:shadow-secondary/30 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold"
                  >
                    Book Free Demo
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">ICA Ops</span>
            </div>
            <p className="text-muted-foreground max-w-md">
              The Indian Chess Academy Operations Platform management system. Empowering the next
              generation of grandmasters.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-primary mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Admin Login
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Coach Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Student Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-primary mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          {new Date().getFullYear()} Indian Chess Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
