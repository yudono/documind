'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { 
  FileText, 
  MessageSquare, 
  Plus, 
  Upload, 
  TrendingUp, 
  Clock, 
  Users, 
  BarChart3,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function Dashboard() {
  const { data: session } = useSession();

  const stats = [
    { 
      label: 'Business Documents', 
      value: '156', 
      change: '+23%',
      trend: 'up',
      icon: FileText 
    },
    { 
      label: 'AI Business Consultations', 
      value: '89', 
      change: '+34%',
      trend: 'up',
      icon: MessageSquare 
    },
    { 
      label: 'Monthly Revenue Tracked', 
      value: 'Rp 45.2M', 
      change: '+18%',
      trend: 'up',
      icon: TrendingUp 
    },
    { 
      label: 'Active Business Projects', 
      value: '7', 
      change: '+2',
      trend: 'up',
      icon: Plus 
    },
  ];

  const recentActivity = [
    {
      action: 'Invoice analyzed',
      document: 'Invoice Toko Sembako Jaya - Nov 2024.pdf',
      time: '5 menit yang lalu',
      type: 'generate'
    },
    {
      action: 'AI konsultasi bisnis',
      document: 'Strategi pemasaran online untuk UMKM',
      time: '20 menit yang lalu',
      type: 'chat'
    },
    {
      action: 'Dokumen dibuat',
      document: 'Surat Penawaran Kerjasama.docx',
      time: '1 jam yang lalu',
      type: 'generate'
    },
    {
      action: 'Laporan keuangan diupload',
      document: 'Laporan Laba Rugi Oktober 2024.xlsx',
      time: '2 jam yang lalu',
      type: 'upload'
    },
  ];

  const quickActions = [
    {
      title: 'Upload Dokumen Bisnis',
      description: 'Analisis invoice, laporan, kontrak',
      href: '/dashboard/documents',
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      title: 'Konsultasi AI Bisnis',
      description: 'Tanya strategi dan solusi bisnis',
      href: '/dashboard/chat',
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Paket & Tagihan',
      description: 'Monitor penggunaan layanan',
      href: '/dashboard/billing',
      icon: BarChart3,
      color: 'bg-purple-500'
    },
  ];

  const usageData = [
    { name: 'Dokumen Bisnis', current: 156, limit: 500, color: 'bg-blue-500' },
    { name: 'Konsultasi AI', current: 89, limit: 200, color: 'bg-green-500' },
    { name: 'Penyimpanan', current: 12.8, limit: 50, color: 'bg-orange-500', unit: 'GB' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Selamat datang kembali, {session?.user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-slate-600">
          Ringkasan aktivitas bisnis dan konsultasi AI untuk UMKM Anda
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === 'up';
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="flex items-center text-xs">
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                    {stat.change}
                  </span>
                  <span className="text-slate-500 ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Jump into your most common tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.title} href={action.href}>
                      <div className="group p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`p-2 rounded-lg ${action.color} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="font-medium text-slate-900 group-hover:text-primary">
                            {action.title}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-600">{action.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Usage Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Usage Overview
              </CardTitle>
              <CardDescription>
                Your current usage across different services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {usageData.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-slate-600">
                      {item.current}{item.unit || ''} / {item.limit}{item.unit || ''}
                    </span>
                  </div>
                  <Progress 
                    value={(item.current / item.limit) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your latest document activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-full ${
                      activity.type === 'generate' ? 'bg-green-100 text-green-600' :
                      activity.type === 'chat' ? 'bg-blue-100 text-blue-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {activity.type === 'generate' ? <Plus className="h-3 w-3" /> :
                       activity.type === 'chat' ? <MessageSquare className="h-3 w-3" /> :
                       <Upload className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {activity.action}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {activity.document}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}