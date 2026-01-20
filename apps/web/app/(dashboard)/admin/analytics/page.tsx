'use client';

import { subDays } from 'date-fns';
import {
  Activity,
  ArrowUpRight,
  CalendarRange,
  CreditCard,
  Download,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { type ElementType, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'coach' | 'admin'>('overview');
  const [isLast30Days, setIsLast30Days] = useState(false);

  const dateRange = useMemo(() => {
    return isLast30Days
      ? {
          startDate: subDays(new Date(), 30).toISOString(),
          endDate: new Date().toISOString(),
        }
      : {};
  }, [isLast30Days]);

  const { data: dashboardData, isLoading: isLoadingDashboard } =
    trpc.analytics.getDashboard.useQuery();
  const { data: funnelData, isLoading: isLoadingFunnel } =
    trpc.analytics.getFunnel.useQuery(dateRange);
  const { data: coachData, isLoading: isLoadingCoach } =
    trpc.analytics.getCoachPerformance.useQuery(dateRange);
  const { data: adminData, isLoading: isLoadingAdmin } =
    trpc.analytics.getAdminEfficiency.useQuery(dateRange);

  // Query for export, disabled by default (lazy fetch)
  const { refetch: fetchExportData } = trpc.analytics.export.useQuery(
    { type: 'demos', ...dateRange },
    { enabled: false }
  );

  const handleExport = async () => {
    toast.loading('Generating report...', { id: 'export-toast' });
    try {
      const result = await fetchExportData();
      const rawData = result.data;

      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        toast.dismiss('export-toast');
        toast.warning('No data to export');
        return;
      }

      const data = rawData as Record<string, unknown>[];
      const firstRow = data[0];
      if (!firstRow) return;

      // Convert to CSV
      const headers = Object.keys(firstRow).join(',');
      const rows = data.map((row) =>
        Object.values(row)
          .map((value) => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';'); // Escape commas
            return String(value).replace(/,/g, ';');
          })
          .join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `analytics_export_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss('export-toast');
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.dismiss('export-toast');
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  const funnelChartData = funnelData
    ? [
        { name: 'Booked', value: funnelData.booked, fill: '#3b82f6' },
        { name: 'Attended', value: funnelData.attended, fill: '#8b5cf6' },
        { name: 'Interested', value: funnelData.interested, fill: '#f59e0b' },
        { name: 'Converted', value: funnelData.converted, fill: '#10b981' },
      ]
    : [];

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    loading,
    trend,
  }: {
    title: string;
    value: string | number | undefined;
    description: string;
    icon: ElementType;
    loading: boolean;
    trend?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (value ?? '--')}
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          {description}
          {trend && (
            <span className="ml-2 text-green-600 flex items-center">
              {trend} <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Real-time insights into your academy's performance and growth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLast30Days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsLast30Days(!isLast30Days)}
          >
            <CalendarRange className="mr-2 h-4 w-4" />
            {isLast30Days ? 'Last 30 Days' : 'All Time'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Demos"
          value={dashboardData?.todayDemos}
          description="Scheduled for today"
          icon={Activity}
          loading={isLoadingDashboard}
        />
        <StatCard
          title="Active Students"
          value={dashboardData?.activeStudents}
          description="Currently enrolled"
          icon={Users}
          loading={isLoadingDashboard}
          trend="+5%"
        />
        <StatCard
          title="Pending Demos"
          value={dashboardData?.pendingDemos}
          description="Waiting for action"
          icon={TrendingUp}
          loading={isLoadingDashboard}
        />
        <StatCard
          title="Active Subscriptions"
          value={dashboardData?.activeSubscriptions}
          description="Revenue generating"
          icon={CreditCard}
          loading={isLoadingDashboard}
          trend="+12%"
        />
      </div>

      {/* Tabs Layout */}
      <div className="space-y-6">
        <div className="flex items-center p-1 bg-muted/40 rounded-lg w-fit border">
          {(['overview', 'coach', 'admin'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
              {tab === 'overview' ? '' : tab === 'coach' ? 'Performance' : 'Efficiency'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  From booking to successful enrollment{' '}
                  {isLast30Days ? '(Last 30 Days)' : '(All Time)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoadingFunnel ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelChartData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {funnelChartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle>Key Performance Rates</CardTitle>
                <CardDescription>
                  Efficiency metrics at a glance {isLast30Days ? '(Last 30 Days)' : '(All Time)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8 mt-4">
                  {[
                    {
                      label: 'Attendance Rate',
                      value: funnelData?.attendanceRate ?? 0,
                      color: 'bg-primary',
                    },
                    {
                      label: 'Interest Rate',
                      value: funnelData?.interestRate ?? 0,
                      color: 'bg-orange-500',
                    },
                    {
                      label: 'Conversion Rate',
                      value: funnelData?.conversionRate ?? 0,
                      color: 'bg-green-500',
                    },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600">{metric.label}</span>
                        <span className="text-xl font-bold">{metric.value}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                          className={cn(
                            'h-3 rounded-full transition-all duration-500',
                            metric.color
                          )}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Coach Performance Tab */}
        {activeTab === 'coach' && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Coach Performance Metrics</CardTitle>
              <CardDescription>
                Detailed breakdown of coach activities and results{' '}
                {isLast30Days ? '(Last 30 Days)' : '(All Time)'}
              </CardDescription>
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
                      <TableHead>Coach Name</TableHead>
                      <TableHead className="text-center">Total Demos</TableHead>
                      <TableHead className="text-center">Active Students</TableHead>
                      <TableHead className="text-center">Attended</TableHead>
                      <TableHead className="text-center">Converted</TableHead>
                      <TableHead className="text-right">Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coachData?.map((coach) => (
                      <TableRow key={coach.coachId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {coach.coachName.substring(0, 2).toUpperCase()}
                            </div>
                            {coach.coachName}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{coach.totalDemos}</TableCell>
                        <TableCell className="text-center">{coach.studentCount}</TableCell>
                        <TableCell className="text-center">{coach.attended}</TableCell>
                        <TableCell className="text-center">{coach.converted}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={coach.conversionRate > 20 ? 'default' : 'secondary'}
                            className={cn(
                              coach.conversionRate > 20 ? 'bg-green-600 hover:bg-green-700' : ''
                            )}
                          >
                            {coach.conversionRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {coachData?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                          No performance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Efficiency Tab */}
        {activeTab === 'admin' && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Admin Efficiency Metrics</CardTitle>
              <CardDescription>
                Tracking demo processing and conversion efficiency{' '}
                {isLast30Days ? '(Last 30 Days)' : '(All Time)'}
              </CardDescription>
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
                      <TableHead className="text-center">Demos Processed</TableHead>
                      <TableHead className="text-center">Converted</TableHead>
                      <TableHead className="text-center">Avg Response</TableHead>
                      <TableHead className="text-right">Efficiency Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminData?.admins.map((admin) => (
                      <TableRow key={admin.adminId}>
                        <TableCell className="font-medium">{admin.adminEmail}</TableCell>
                        <TableCell className="text-center">{admin.totalDemos}</TableCell>
                        <TableCell className="text-center">{admin.converted}</TableCell>
                        <TableCell className="text-center">
                          {admin.avgResponseTimeHours} hrs
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-bold">
                            {admin.conversionRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {adminData?.admins.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          No admin efficiency data available
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
