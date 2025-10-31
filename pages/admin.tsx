import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Shield, 
  Users, 
  Activity, 
  Database, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  Globe,
  Clock,
  Eye
} from 'lucide-react';

interface VisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface PopularEndpoint {
  path: string;
  hits: number;
  percentage: number;
}

interface AdminDashboardData {
  stats: VisitorStats;
  popularEndpoints: PopularEndpoint[];
  geoDistribution: { country: string; visitors: number }[];
  recentActivity: { timestamp: string; action: string; details: string }[];
  generatedAt: string;
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const authenticate = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    // Super admin bypass with special key "SUPER_ADMIN_ACCESS"
    if (apiKey === "SUPER_ADMIN_ACCESS") {
      setAuthenticated(true);
      setIsSuperAdmin(true);
      setError(null);
      setNotification({ message: 'Logged in as Super Administrator', type: 'success' });
      // Generate mock data for super admin
      generateMockDashboardData();
      return;
    }

    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'x-api-key': apiKey
        }
      });

      if (response.ok) {
        setAuthenticated(true);
        setError(null);
        fetchDashboardData();
      } else {
        setError('Invalid API key');
      }
    } catch (err) {
      setError('Authentication failed');
    }
  };
  
  // Fetch real dashboard data for super admin
  const generateMockDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from our API endpoints
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'x-api-key': 'SUPER_ADMIN_ACCESS'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // Ensure data has all required properties with defaults if missing
        const safeData = {
          stats: result.data?.stats || {
            totalVisitors: 0,
            uniqueVisitors: 0,
            pageViews: 0,
            avgSessionDuration: 0,
            bounceRate: 0
          },
          popularEndpoints: result.data?.popularEndpoints || [],
          geoDistribution: result.data?.geoDistribution || [],
          recentActivity: result.data?.recentActivity || [],
          generatedAt: result.data?.generatedAt || new Date().toISOString()
        };
        setData(safeData);
        setNotification({ message: 'Loaded real dashboard data', type: 'success' });
      } else {
        setError('Failed to fetch dashboard data');
        // Fallback to static data if API fails
        const mockData: AdminDashboardData = {
          stats: {
            totalVisitors: 15782,
            uniqueVisitors: 8943,
            pageViews: 42567,
            avgSessionDuration: 185,
            bounceRate: 32.4
          },
          popularEndpoints: [
            { path: '/api/movies/trending', hits: 12453, percentage: 29.3 },
            { path: '/api/movies/popular', hits: 8721, percentage: 20.5 },
            { path: '/api/movies/search', hits: 7654, percentage: 18.0 },
            { path: '/api/movies/details', hits: 6543, percentage: 15.4 }
          ],
          geoDistribution: [
            { country: 'United States', visitors: 4532 },
            { country: 'United Kingdom', visitors: 2134 },
            { country: 'Canada', visitors: 1876 },
            { country: 'Germany', visitors: 1543 },
            { country: 'France', visitors: 1298 }
          ],
          recentActivity: [
            { timestamp: new Date().toISOString(), action: 'Super Admin Login', details: 'Accessed with super admin privileges' },
            { timestamp: new Date(Date.now() - 5 * 60000).toISOString(), action: 'Cache Cleared', details: 'System-wide cache refresh' },
            { timestamp: new Date(Date.now() - 15 * 60000).toISOString(), action: 'API Rate Limit Updated', details: 'Increased to 100 req/min' },
            { timestamp: new Date(Date.now() - 30 * 60000).toISOString(), action: 'New Movie Added', details: 'Manual entry: "The Matrix Resurrections"' }
          ],
          generatedAt: new Date().toISOString()
        };
        setData(mockData);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/visitors', {
        headers: {
          'x-api-key': apiKey
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Ensure data has all required properties with defaults if missing
        const safeData = {
          stats: result.data?.stats || {
            totalVisitors: 0,
            uniqueVisitors: 0,
            pageViews: 0,
            avgSessionDuration: 0,
            bounceRate: 0
          },
          popularEndpoints: result.data?.popularEndpoints || [],
          geoDistribution: result.data?.geoDistribution || [],
          recentActivity: result.data?.recentActivity || [],
          generatedAt: result.data?.generatedAt || new Date().toISOString()
        };
        setData(safeData);
        setNotification({ message: 'Dashboard data refreshed', type: 'success' });
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      // Always use the real API endpoint
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        }
      });

      if (response.ok) {
        setNotification({ message: 'Cache cleared successfully', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ message: 'Failed to clear cache', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      setNotification({ message: 'Failed to clear cache', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (!authenticated) {
    return (
      <>
        <Head>
          <title>Superadmin Access - MovieHub</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Superadmin Access</h1>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API key or SUPER_ADMIN_ACCESS"
                  onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                />
              </div>
              
              {error && (
                <div className="text-red-400 text-sm">{error}</div>
              )}
              
              <button
                onClick={authenticate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Access Dashboard
              </button>
              
              <div className="text-gray-400 text-xs text-center mt-4">
                Use "SUPER_ADMIN_ACCESS" for super admin mode
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Superadmin Dashboard - MovieHub</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">Superadmin Dashboard</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={fetchDashboardData}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                
                <button
                  onClick={clearCache}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <Database className="h-4 w-4" />
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
            {notification && (
              <div className={`mb-4 p-4 rounded-md ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {notification.message}
                <button 
                  className="float-right text-sm"
                  onClick={() => setNotification(null)}
                >
                  ✕
                </button>
              </div>
            )}
            
            {isSuperAdmin && (
            <div className="p-6 mb-6 bg-gradient-to-r from-purple-700 to-indigo-800 rounded-lg shadow-lg">
              <h3 className="flex items-center text-xl font-bold text-white mb-4">
                <Shield className="w-6 h-6 mr-2" />
                Super Administrator Control Panel
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-white flex items-center justify-center"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/maintenance', {
                        method: 'POST',
                        headers: { 'x-api-key': 'SUPER_ADMIN_ACCESS' }
                      });
                      if (response.ok) {
                        setNotification({ message: 'System maintenance mode activated', type: 'success' });
                      } else {
                        setNotification({ message: 'Failed to activate maintenance mode', type: 'error' });
                      }
                    } catch (err) {
                      setNotification({ message: 'Failed to activate maintenance mode', type: 'error' });
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Maintenance Mode
                </button>
                <button 
                  className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-white flex items-center justify-center"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/reset-limits', {
                        method: 'POST',
                        headers: { 'x-api-key': 'SUPER_ADMIN_ACCESS' }
                      });
                      if (response.ok) {
                        setNotification({ message: 'All API rate limits reset', type: 'success' });
                      } else {
                        setNotification({ message: 'Failed to reset rate limits', type: 'error' });
                      }
                    } catch (err) {
                      setNotification({ message: 'Failed to reset rate limits', type: 'error' });
                    }
                  }}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Reset Rate Limits
                </button>
                <button 
                  className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-white flex items-center justify-center"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/optimize-db', {
                        method: 'POST',
                        headers: { 'x-api-key': 'SUPER_ADMIN_ACCESS' }
                      });
                      if (response.ok) {
                        setNotification({ message: 'Database optimization completed', type: 'success' });
                      } else {
                        setNotification({ message: 'Failed to optimize database', type: 'error' });
                      }
                    } catch (err) {
                      setNotification({ message: 'Failed to optimize database', type: 'error' });
                    }
                  }}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Optimize Database
                </button>
                <button 
                  className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-white flex items-center justify-center"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/refresh-content', {
                        method: 'POST',
                        headers: { 'x-api-key': 'SUPER_ADMIN_ACCESS' }
                      });
                      if (response.ok) {
                        setNotification({ message: 'Content refresh triggered', type: 'success' });
                      } else {
                        setNotification({ message: 'Failed to refresh content', type: 'error' });
                      }
                    } catch (err) {
                      setNotification({ message: 'Failed to refresh content', type: 'error' });
                    }
                  }}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Refresh Content
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white">Loading dashboard data...</div>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-6 w-6 text-blue-400" />
                    <span className="text-gray-300">Total Visitors</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{data.stats.totalVisitors.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Eye className="h-6 w-6 text-green-400" />
                    <span className="text-gray-300">Unique Visitors</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{data.stats.uniqueVisitors.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="h-6 w-6 text-purple-400" />
                    <span className="text-gray-300">Page Views</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{data.stats.pageViews.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-6 w-6 text-yellow-400" />
                    <span className="text-gray-300">Avg. Session</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(data.stats.avgSessionDuration / 60)}m</div>
                </div>
              </div>

              {/* Popular Endpoints */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Popular Pages</h2>
                </div>
                
                <div className="space-y-3">
                  {data.popularEndpoints && data.popularEndpoints.length > 0 ? (
                    data.popularEndpoints.map((endpoint, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-300">{endpoint.path}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">{endpoint.hits.toLocaleString()}</span>
                          <span className="text-gray-400 text-sm">{endpoint.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400">No endpoint data available</div>
                  )}
                </div>
              </div>

              {/* Geographic Distribution */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="h-6 w-6 text-green-400" />
                  <h2 className="text-xl font-bold text-white">Geographic Distribution</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.geoDistribution && data.geoDistribution.length > 0 ? (
                    data.geoDistribution.map((geo, index) => (
                      <div key={index} className="text-center">
                        <div className="text-white font-medium">{geo.country}</div>
                        <div className="text-gray-400 text-sm">{geo.visitors.toLocaleString()} visitors</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400">No geographic data available</div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="h-6 w-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                </div>
                
                {!data.recentActivity || data.recentActivity.length === 0 ? (
                  <div className="text-gray-400">No recent activity available</div>
                ) : (
                <div className="space-y-3">
                  {data.recentActivity && data.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="text-gray-400 text-sm whitespace-nowrap">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{activity.action}</div>
                        <div className="text-gray-400 text-sm">{activity.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Footer Info */}
              <div className="text-center text-gray-400 text-sm">
                Last updated: {new Date(data.generatedAt).toLocaleString()}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;