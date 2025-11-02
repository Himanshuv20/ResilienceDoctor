import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  serviceId: string;
  startTime: string;
  endTime?: string;
  service: {
    name: string;
  };
}

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/incidents');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // API returns { status: "success", data: [...] }
        if (result.status === 'success' && result.data) {
          setIncidents(result.data);
        } else {
          setIncidents([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredIncidents = filter === 'all' 
    ? incidents 
    : incidents.filter(incident => incident.status.toLowerCase() === filter);

  const calculateDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
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
          <h3 className="font-medium">Error loading incidents</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage service incidents and outages
          </p>
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All Incidents</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Incidents</div>
          <div className="text-2xl font-bold text-gray-900">{incidents.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Open</div>
          <div className="text-2xl font-bold text-red-600">
            {incidents.filter(i => i.status.toLowerCase() === 'open').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Investigating</div>
          <div className="text-2xl font-bold text-yellow-600">
            {incidents.filter(i => i.status.toLowerCase() === 'investigating').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Resolved</div>
          <div className="text-2xl font-bold text-green-600">
            {incidents.filter(i => i.status.toLowerCase() === 'resolved').length}
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.map((incident) => (
          <div
            key={incident.id}
            className={`bg-white rounded-lg shadow border-l-4 ${getSeverityColor(incident.severity).split(' ')[2]}`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {incident.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {incident.description}
                  </p>
                  <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Service:</span> {incident.service.name}
                    </div>
                    <div>
                      <span className="font-medium">Started:</span> {new Date(incident.startTime).toLocaleString()}
                    </div>
                    {incident.endTime && (
                      <div>
                        <span className="font-medium">Ended:</span> {new Date(incident.endTime).toLocaleString()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Duration:</span> {calculateDuration(incident.startTime, incident.endTime)}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                    View Details
                  </button>
                  {incident.status.toLowerCase() === 'open' && (
                    <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredIncidents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No incidents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'No incidents have been reported.' : `No ${filter} incidents found.`}
          </p>
        </div>
      )}
    </div>
  );
};