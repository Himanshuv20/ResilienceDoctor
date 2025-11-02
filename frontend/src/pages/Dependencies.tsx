import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Dependency {
  id: string;
  name: string;
  type: string;
  status: string;
  criticality: string;
  serviceId: string;
  service: {
    name: string;
  };
}

export const Dependencies: React.FC = () => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/dependencies');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // API returns { status: "success", data: { edges: [], services: [], ... } }
        // We need to transform edges into dependencies with service names
        if (result.status === 'success' && result.data && result.data.edges) {
          const servicesMap = new Map(
            result.data.services.map((s: any) => [s.id, s])
          );
          
          const transformedDeps = result.data.edges.map((edge: any) => {
            const sourceService = servicesMap.get(edge.source) as any;
            const targetService = servicesMap.get(edge.target) as any;
            return {
              id: `${edge.source}-${edge.target}`,
              name: `${sourceService?.name || 'Unknown'} → ${targetService?.name || 'Unknown'}`,
              type: edge.type || 'api',
              status: edge.isRequired ? 'required' : 'optional',
              criticality: edge.isRequired ? 'high' : 'medium',
              serviceId: edge.source,
              service: {
                name: sourceService?.name || 'Unknown'
              }
            };
          });
          setDependencies(transformedDeps);
        } else {
          setDependencies([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dependencies');
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'optional':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      case 'required':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <h3 className="font-medium">Error loading dependencies</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Dependencies</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor and manage dependencies across your services
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {dependencies.map((dependency) => (
            <li key={dependency.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {dependency.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {dependency.name}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dependency.status)}`}>
                          {dependency.status}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCriticalityColor(dependency.criticality)}`}>
                          {dependency.criticality} priority
                        </span>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Service:</span> {dependency.service.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Type:</span> {dependency.type}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {dependencies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No dependencies found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding service dependencies to monitor.
          </p>
        </div>
      )}
    </div>
  );
};