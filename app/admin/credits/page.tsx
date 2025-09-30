'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  RefreshCw, 
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Activity,
  Loader2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface CreditStats {
  totalUsers: number;
  activeUsers: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  totalRevenue: number;
  dailyActiveUsers: number;
}

interface UserCredit {
  id: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  balance: number;
  dailyLimit: number;
  dailyUsed: number;
  totalEarned: number;
  totalSpent: number;
  lastResetDate: string;
}

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCreditsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);

  // Authentication and admin role check
  useEffect(() => {
    const checkAuth = async () => {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'admin') {
            setIsAdmin(true);
          } else {
            router.push('/dashboard');
            return;
          }
        } else {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        router.push('/dashboard');
        return;
      }
      
      setAuthLoading(false);
    };

    checkAuth();
  }, [session, status, router]);

  // New package form state
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    credits: 0,
    price: 0,
    currency: 'USD',
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    if (isAdmin && !authLoading) {
      loadData();
    }
  }, [isAdmin, authLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats, users, and packages in parallel
      const [statsRes, usersRes, packagesRes] = await Promise.all([
        fetch('/api/admin/credits/stats'),
        fetch('/api/admin/credits/users'),
        fetch('/api/credits/packages')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setPackages(packagesData.packages || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const triggerDailyReset = async () => {
    try {
      setResetLoading(true);
      const response = await fetch('/api/credits/reset', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Daily reset completed: ${result.resetResult?.resetCount || 0} users reset`);
        loadData(); // Reload data to show updated stats
      } else {
        toast.error('Failed to trigger daily reset');
      }
    } catch (error) {
      console.error('Error triggering reset:', error);
      toast.error('Error triggering daily reset');
    } finally {
      setResetLoading(false);
    }
  };

  const createPackage = async () => {
    try {
      const response = await fetch('/api/credits/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackage)
      });

      if (response.ok) {
        toast.success('Package created successfully');
        setNewPackage({
          name: '',
          description: '',
          credits: 0,
          price: 0,
          currency: 'USD',
          isActive: true,
          sortOrder: 0
        });
        loadData();
      } else {
        toast.error('Failed to create package');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error('Error creating package');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit System Admin</h1>
          <p className="text-muted-foreground">Manage credits, packages, and user accounts</p>
        </div>
        <Button 
          onClick={triggerDailyReset} 
          disabled={resetLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${resetLoading ? 'animate-spin' : ''}`} />
          Trigger Daily Reset
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Issued</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCreditsIssued.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCreditsConsumed.toLocaleString()} consumed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From credit purchases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dailyActiveUsers}</div>
              <p className="text-xs text-muted-foreground">
                Users with activity today
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="packages">Credit Packages</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Credit Overview</CardTitle>
              <CardDescription>
                Manage user credit balances and daily limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((userCredit) => (
                  <div key={userCredit.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{userCredit.user.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Balance: {userCredit.balance} | Daily: {userCredit.dailyUsed}/{userCredit.dailyLimit}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Earned: {userCredit.totalEarned} | Total Spent: {userCredit.totalSpent}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={userCredit.balance > 0 ? "default" : "destructive"}>
                        {userCredit.balance > 0 ? "Active" : "No Credits"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Packages */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Packages</CardTitle>
                <CardDescription>
                  Manage credit packages available for purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{pkg.name}</div>
                        <div className="text-sm text-muted-foreground">{pkg.description}</div>
                        <div className="text-sm">
                          {pkg.credits.toLocaleString()} credits - ${(pkg.price / 100).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pkg.isActive ? "default" : "secondary"}>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Create New Package */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Package</CardTitle>
                <CardDescription>
                  Add a new credit package for users to purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Package Name</Label>
                  <Input
                    id="name"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    placeholder="e.g., Starter Pack"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPackage.description}
                    onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                    placeholder="Package description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credits">Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={newPackage.credits}
                      onChange={(e) => setNewPackage({ ...newPackage, credits: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (cents)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newPackage.price}
                      onChange={(e) => setNewPackage({ ...newPackage, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={newPackage.currency}
                      onChange={(e) => setNewPackage({ ...newPackage, currency: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={newPackage.sortOrder}
                      onChange={(e) => setNewPackage({ ...newPackage, sortOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <Button onClick={createPackage} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Package
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit System Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and insights about credit usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p>Analytics dashboard coming soon...</p>
                <p className="text-sm">This will include usage trends, conversion rates, and revenue analytics.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Show loading spinner while checking authentication
  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
}