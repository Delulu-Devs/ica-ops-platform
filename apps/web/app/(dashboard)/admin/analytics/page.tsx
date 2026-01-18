'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, TrendingUp, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'coach' | 'admin'>('overview');

  const { data: dashboardData, isLoading: isLoadingDashboard } =
    trpc.analytics.getDashboard.useQuery();
  const { data: funnelData, isLoading: isLoadingFunnel } = trpc.analytics.getFunnel.useQuery({});
  const { data: coachData, isLoading: isLoadingCoach } = trpc.analytics.getCoachPerformance.useQuery(
    {}
  );
  const { data: adminData, isLoading: isLoadingAdmin } = trpc.analytics.getAdminEfficiency.useQuery(
    {}
  );

  const funnelChartData = funnelData
    ? [
        { name: 'Booked', value: funnelData.booked },
        { name: 'Attended', value: funnelData.attended },
        { name: 'Interested', value: funnelData.interested },
        { name: 'Converted', value: funnelData.converted },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Analytics</h2>
        <p className="text-muted-foreground">
          Real-time insights into your academy's performance.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Demos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingDashboard ? <Loader2 className="animate-spin h-4 w-4" /> : dashboardData?.todayDemos}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingDashboard ? <Loader2 className="animate-spin h-4 w-4" /> : dashboardData?.activeStudents}
            </div>
            <p className="text-xs text-muted-foreground">Currently enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Demos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingDashboard ? <Loader2 className="animate-spin h-4 w-4" /> : dashboardData?.pendingDemos}
            </div>
            <p className="text-xs text-muted-foreground">Waiting for action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coaches</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingDashboard ? <Loader2 className="animate-spin h-4 w-4" /> : dashboardData?.totalCoaches}
            </div>
            <p className="text-xs text-muted-foreground">Registered coaches</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className="rounded-b-none"
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'coach' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('coach')}
          className="rounded-b-none"
        >
          Coach Performance
        </Button>
        <Button
          variant={activeTab === 'admin' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('admin')}
          className="rounded-b-none"
        >
          Admin Efficiency
        </Button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>From booking to enrollment</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoadingFunnel ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#003366" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Key Rates</CardTitle>
                <CardDescription>Efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Attendance Rate</span>
                    <span className="text-2xl font-bold">
                      {funnelData?.attendanceRate ?? 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full"
                      style={{ width: `${funnelData?.attendanceRate ?? 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Interest Rate</span>
                    <span className="text-2xl font-bold">
                      {funnelData?.interestRate ?? 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full"
                      style={{ width: `${funnelData?.interestRate ?? 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Conversion Rate</span>
                    <span className="text-2xl font-bold">
                      {funnelData?.conversionRate ?? 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full"
                      style={{ width: `${funnelData?.conversionRate ?? 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'coach' && (
          <Card>
            <CardHeader>
              <CardTitle>Coach Performance</CardTitle>
              <CardDescription>Metrics per coach</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCoach ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Demos</TableHead>
                      <TableHead>Attended</TableHead>
                      <TableHead>Converted</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coachData?.map((coach) => (
                      <TableRow key={coach.coachId}>
                        <TableCell className="font-medium">{coach.coachName}</TableCell>
                        <TableCell>{coach.totalDemos}</TableCell>
                        <TableCell>{coach.attended}</TableCell>
                        <TableCell>{coach.converted}</TableCell>
                        <TableCell>{coach.conversionRate}%</TableCell>
                      </TableRow>
                    ))}
                    {coachData?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'admin' && (
            <Card>
            <CardHeader>
                <CardTitle>Admin Efficiency</CardTitle>
                <CardDescription>Demo processing performance</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingAdmin ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Admin Email</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Converted</TableHead>
                        <TableHead>Avg. Response (hrs)</TableHead>
                        <TableHead>Conversion Rate</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {adminData?.admins.map((admin) => (
                        <TableRow key={admin.adminId}>
                        <TableCell className="font-medium">{admin.adminEmail}</TableCell>
                        <TableCell>{admin.totalDemos}</TableCell>
                        <TableCell>{admin.converted}</TableCell>
                        <TableCell>{admin.avgResponseTimeHours}</TableCell>
                        <TableCell>{admin.conversionRate}%</TableCell>
                        </TableRow>
                    ))}
                    {adminData?.admins.length === 0 && (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center">
                            No data available
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                )}
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
