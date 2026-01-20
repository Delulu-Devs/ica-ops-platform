'use client';

import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  MapPin,
  Menu,
  Monitor,
  ShoppingBag,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-secondary/30 selection:text-primary">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Indian Chess Academy Logo"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">
              Indian Chess Academy
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/services"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Services
            </Link>
            <Link
              href="/courses"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Courses
            </Link>
            <div className="flex items-center gap-4 ml-4">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="font-semibold text-muted-foreground hover:text-primary"
                >
                  Login
                </Button>
              </Link>
              <Link href="/demo">
                <Button className="font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-full px-6">
                  Book Free Demo
                </Button>
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-primary"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 flex flex-col gap-4 shadow-xl">
            <Link
              href="/about"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium py-2"
            >
              About
            </Link>
            <Link
              href="/services"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium py-2"
            >
              Services
            </Link>
            <Link
              href="/courses"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium py-2"
            >
              Courses
            </Link>
            <hr className="border-border/50" />
            <Link href="/login" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Login
              </Button>
            </Link>
            <Link href="/demo" onClick={() => setIsMenuOpen(false)}>
              <Button className="w-full">Book Free Demo</Button>
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center max-w-5xl">
            <div className="inline-flex items-center rounded-full border border-secondary/20 bg-secondary/5 px-4 py-1.5 text-sm font-medium text-secondary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="flex h-2 w-2 rounded-full bg-secondary mr-2 animate-pulse"></span>
              New Batches Starting Soon
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-primary mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Unlock Your Potential with <br className="hidden md:block" />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-blue-600 to-secondary">
                Expert Chess Coaching
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Indian Chess Academy was founded on a simple idea: chess should be taught in a way
              that feels engaging, personal, and meaningful. We don't just teach the game; we build
              character.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/demo" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 h-14 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/services" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-lg h-14 rounded-full hover:bg-muted/50"
                >
                  Explore Programs
                </Button>
              </Link>
            </div>

            {/* Stats Row */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-border/50 pt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              {[
                { number: '5000+', label: 'Students', icon: Users },
                { number: '120+', label: 'Expert Coaches', icon: Trophy },
                { number: '15+', label: 'Countries', icon: MapPin },
                { number: '4.9/5', label: 'Rating', icon: Heart },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-muted/30 transition-colors"
                >
                  <div className="text-3xl font-bold text-primary mb-1">{stat.number}</div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-muted/30 relative">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="w-full md:w-1/2 relative">
                <div className="aspect-square rounded-3xl overflow-hidden bg-linear-to-br from-primary/10 to-secondary/10 relative p-8">
                  {/* Abstract Chess Visualization */}
                  <div className="absolute inset-x-6 inset-y-6 bg-background rounded-2xl shadow-2xl flex items-center justify-center border border-border/50">
                    <Image
                      src="/logo.png"
                      alt="ICA Logo"
                      width={300}
                      height={300}
                      className="object-contain"
                    />
                  </div>
                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-4 left-4 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl"></div>
                </div>
              </div>

              <div className="w-full md:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                  About Indian Chess Academy
                </h2>
                <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                  <p>
                    Indian Chess Academy began as a response to the overly generic nature of most
                    online chess classes. Founded by{' '}
                    <strong className="text-foreground">Viraj Pandit</strong>, a computer science
                    engineer with a lifelong passion for the game, we believed that chess education
                    needed to be engaging and personal.
                  </p>
                  <p>
                    Viraj teamed up with{' '}
                    <strong className="text-foreground">Nachiket Chitre</strong>, whose structured
                    approach helped shape the academy into a place where students receive close,
                    thoughtful mentoring.
                  </p>
                  <p>
                    Every session is designed with care, allowing coaches to adapt to each student’s
                    pace and style — building not just skill, but confidence.
                  </p>

                  <div className="pt-4">
                    <Button
                      variant="link"
                      className="text-primary p-0 h-auto font-semibold text-lg hover:text-secondary group"
                    >
                      Read our full story{' '}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">
                Unleash Your Potential
              </h2>
              <p className="text-lg text-muted-foreground">
                We offer tailored services for every chess enthusiast, from personalized training to
                corporate events.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Online Training',
                  description:
                    'Flexible learning with personalized 1-on-1 sessions or dynamic group classes suitable for your pace.',
                  icon: Monitor,
                  color: 'bg-blue-50 text-blue-600',
                  href: '/services/online',
                },
                {
                  title: 'Offline Training',
                  description:
                    'Experience hands-on coaching with direct, in-person guidance for focused and interactive learning.',
                  icon: Users,
                  color: 'bg-orange-50 text-orange-600',
                  href: '/services/offline',
                },
                {
                  title: 'Corporate Training',
                  description:
                    'Boost teamwork and strategic thinking with our corporate events where chess becomes a tool for professional skills.',
                  icon: Briefcase,
                  color: 'bg-purple-50 text-purple-600',
                  href: '/services/corporate',
                },
                {
                  title: 'Social Programs',
                  description:
                    'Connect with fellow enthusiasts, participate in friendly matches, and engage in community activities.',
                  icon: Heart,
                  color: 'bg-red-50 text-red-600',
                  href: '/services/social',
                },
                {
                  title: 'Merchandise',
                  description:
                    'Show your passion with exclusive T-shirts, chess gear, and accessories to keep you motivated.',
                  icon: ShoppingBag,
                  color: 'bg-green-50 text-green-600',
                  href: '/shop',
                },
                {
                  title: 'Books & Materials',
                  description:
                    'Access a curated selection of books and materials that support your chess journey at all levels.',
                  icon: BookOpen,
                  color: 'bg-yellow-50 text-yellow-600',
                  href: '/shop',
                },
              ].map((service) => (
                <Card
                  key={service.title}
                  className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-muted/20 hover:bg-background"
                >
                  <CardHeader>
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${service.color}`}
                    >
                      <service.icon className="w-7 h-7" />
                    </div>
                    <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Link
                      href={service.href || '#'}
                      className="text-primary font-semibold text-sm group-hover:text-secondary flex items-center transition-colors"
                    >
                      Learn More <ArrowRight className="ml-1 w-4 h-4" />
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Courseware / Why Choose Us */}
        <section
          id="courses"
          className="py-24 bg-primary text-primary-foreground relative overflow-hidden"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <div
              className="w-[800px] h-[800px] border-white rounded-full blur-[100px]"
              style={{ borderWidth: '100px' }}
            ></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-8">Comprehensive Courseware</h2>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 font-bold text-xl">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Beginner to Master</h3>
                      <p className="text-primary-foreground/80 leading-relaxed">
                        Our step-by-step curriculum ensures steady progress, starting from the rules
                        of the game to complex grandmaster strategies.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 font-bold text-xl">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Life Values</h3>
                      <p className="text-primary-foreground/80 leading-relaxed">
                        We emphasize discipline, patience, and sportsmanship. We believe these
                        values are just as important as tactical skills.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 font-bold text-xl">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Structured Learning</h3>
                      <p className="text-primary-foreground/80 leading-relaxed">
                        Expertly crafted lessons that build upon each other, ensuring no gaps in
                        your understanding of the game.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <Link href="/demo">
                    <Button
                      size="lg"
                      className="bg-white text-primary hover:bg-white/90 font-bold text-lg h-14 px-8 rounded-full"
                    >
                      Start Learning Today
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-3xl">
                  <CardTitle className="text-2xl font-bold mb-6 text-white text-center">
                    Our Classes
                  </CardTitle>
                  <div className="grid gap-4">
                    {[
                      'Beginner',
                      'Intermediate',
                      'Advanced',
                      '1v1 Tutoring',
                      'Certification Programs',
                    ].map((cls) => (
                      <div
                        key={cls}
                        className="flex items-center justify-between p-4 bg-primary/40 rounded-xl hover:bg-secondary/20 transition-colors cursor-pointer border border-white/10"
                      >
                        <span className="font-semibold">{cls}</span>
                        <ArrowRight className="w-5 h-5 opacity-60" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">Success Stories</h2>
              <p className="text-lg text-muted-foreground">
                Hear from our students and parents about their journey with Indian Chess Academy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  quote:
                    'The coaching structure is brilliant. My son improved his rating by 400 points in just 6 months!',
                  author: 'Rahul S.',
                  role: 'Parent',
                },
                {
                  quote:
                    "I love the interactive classes. The coaches explain complex strategies in a way that's easy to understand.",
                  author: 'Ananya M.',
                  role: 'Student (Intermediate)',
                },
                {
                  quote:
                    'Best chess academy for kids. They focus on overall development, not just winning games.',
                  author: 'Vikram K.',
                  role: 'Parent',
                },
              ].map((testimonial) => (
                <Card key={testimonial.author} className="bg-muted/20 border-none shadow-sm">
                  <CardContent className="pt-6">
                    <div className="mb-4 text-secondary">
                      {[...Array(5)].map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: Static array
                        <span key={i} className="inline-block text-yellow-400">
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                    <div>
                      <p className="font-bold text-primary">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about our classes and methodology.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">
                  What age groups do you teach?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  We offer classes for children aged 5 and above. Students are grouped by both age
                  and skill level to ensure they receive the most appropriate coaching.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">
                  Are the classes conducted online?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes, we offer live online classes on Zoom. We also provide offline training
                  sessions for those who prefer in-person guidance.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold">
                  How long are the sessions?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Classes are typically held twice a week, with each session lasting 60 minutes.
                  This schedule ensures consistent progress without overwhelming the students.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-semibold">
                  Do you offer trial classes?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! We offer a free demo session where our coaches assess the student's level and
                  recommend the best path forward.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 container mx-auto px-4">
          <div className="bg-muted/50 border rounded-[2rem] p-8 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -ml-16 -mb-16"></div>

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                Ready to make your move?
              </h2>
              <p className="text-xl text-muted-foreground mb-10">
                Book a free demo session today and let our coaches assess the best path forward for
                your chess journey.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-lg h-14 px-10 rounded-full shadow-xl shadow-primary/25"
                  >
                    Book Free Demo
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground mt-2 sm:mt-0 px-4">
                  No credit card required
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 relative flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="ICA Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-bold text-primary">ICA Ops</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Empowering the next generation of grandmasters through structured, personalized, and
                engaging chess education.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders */}
                {[
                  {
                    name: 'Facebook',
                    url: 'https://www.facebook.com/profile.php?id=61555847004612',
                    icon: Facebook,
                  },
                  {
                    name: 'Instagram',
                    url: 'https://www.instagram.com/indianchessacademy/',
                    icon: Instagram,
                  },
                  {
                    name: 'Linkedin',
                    url: 'https://www.linkedin.com/company/106137887',
                    icon: Linkedin,
                  },
                ].map((social) => (
                  <Link
                    href={social.url}
                    key={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="sr-only">{social.name}</span>
                    <social.icon className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-primary mb-6">Academy</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Our Coaches
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-primary transition-colors">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Testimonials
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-primary mb-6">Courses</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link href="/courses" className="hover:text-primary transition-colors">
                    Beginner
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="hover:text-primary transition-colors">
                    Intermediate
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="hover:text-primary transition-colors">
                    Advanced
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    1v1 Tutoring
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-primary mb-6">Contact</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="tel:+917738173864" className="hover:text-primary transition-colors">
                    +91 77381 73864
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>© {new Date().getFullYear()} Indian Chess Academy. All rights reserved.</div>
            <div>Designed for Excellence.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
