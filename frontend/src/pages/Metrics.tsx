import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MetricCard } from '../components/MetricCard';

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  type: string;
  serviceId: string;
  service: {
    name: string;
  };
  uptime?: number;
  latencyP95?: number;
  latencyP99?: number;
  errorRate?: number;
  throughput?: number;
}

export const Metrics: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('all');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/metrics');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // API returns { status: "success", data: [...] }
        if (result.status === 'success' && result.data) {
          // Transform metrics to match the component's expected format
          const transformedMetrics = result.data.map((m: any) => ({
            id: m.id,
            name: `${m.service.name} - Metrics`,
            value: m.uptime,
            unit: '%',
            timestamp: m.timestamp,
            type: 'performance',
            serviceId: m.serviceId,
            service: {
              name: m.service.name
            },
            // Add the raw metric data for display
            uptime: m.uptime,
            latencyP95: m.latencyP95,
            latencyP99: m.latencyP99,
            errorRate: m.errorRate,
            throughput: m.throughput
          }));
          setMetrics(transformedMetrics);
        } else {
          setMetrics([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const filteredMetrics = selectedService === 'all' 
    ? metrics 
    : metrics.filter(metric => metric.serviceId === selectedService);

  const uniqueServices = Array.from(new Set(metrics.map(m => m.service.name)));

  const getMetricsByType = (type: string) => {
    return filteredMetrics.filter(m => m.type === type);
  };

  const calculateAverage = (metricsList: Metric[]) => {
    if (metricsList.length === 0) return 0;
    return metricsList.reduce((sum, m) => sum + m.value, 0) / metricsList.length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Error loading metrics</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor performance and reliability metrics across your services
          </p>
        </div>
        <div>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All Services</option>
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Average Response Time"
          value={calculateAverage(getMetricsByType('response_time')).toFixed(0)}
          unit="ms"
          trend="stable"
        />
        <MetricCard
          title="Average CPU Usage"
          value={calculateAverage(getMetricsByType('cpu_usage')).toFixed(1)}
          unit="%"
          trend="up"
        />
        <MetricCard
          title="Average Memory Usage"
          value={calculateAverage(getMetricsByType('memory_usage')).toFixed(1)}
          unit="%"
          trend="stable"
        />
        <MetricCard
          title="Total Metrics"
          value={filteredMetrics.length}
          unit=""
          trend="up"
        />
      </div>

      {/* Metrics Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Metrics
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMetrics.slice(0, 20).map((metric) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {metric.service.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.value} {metric.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {metric.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(metric.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {filteredMetrics.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Metrics will appear here as they are collected from your services.
          </p>
        </div>
      )}
    </div>
  );
};