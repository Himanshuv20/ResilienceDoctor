import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: number | string;
  category: string;
  severity?: string;
  serviceId: string;
  service: {
    name: string;
  };
  status?: string;
}

export const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/recommendations');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // API returns { status: "success", data: { recommendations: [], ... } }
        if (result.status === 'success' && result.data && result.data.recommendations) {
          setRecommendations(result.data.recommendations);
        } else {
          setRecommendations([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // Helper to check if priority is high (numeric 4-5 or string "high")
  const isHighPriority = (priority: number | string): boolean => {
    if (typeof priority === 'number') return priority >= 4;
    return String(priority).toLowerCase() === 'high';
  };

  // Helper to check if priority is medium (numeric 3 or string "medium")
  const isMediumPriority = (priority: number | string): boolean => {
    if (typeof priority === 'number') return priority === 3;
    return String(priority).toLowerCase() === 'medium';
  };

  // Helper to check if priority is low (numeric 1-2 or string "low")
  const isLowPriority = (priority: number | string): boolean => {
    if (typeof priority === 'number') return priority <= 2;
    return String(priority).toLowerCase() === 'low';
  };

  const getPriorityColor = (priority: number | string) => {
    if (typeof priority === 'number') {
      if (priority >= 4) return 'bg-red-100 text-red-800 border-red-200';
      if (priority >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    const priorityStr = String(priority).toLowerCase();
    switch (priorityStr) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: number | string): string => {
    if (typeof priority === 'number') {
      if (priority >= 4) return 'High';
      if (priority >= 3) return 'Medium';
      return 'Low';
    }
    return String(priority);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'security':
        return '🔒';
      case 'performance':
        return '🚀';
      case 'availability':
        return '🎯';
      case 'monitoring':
        return '📊';
      case 'infrastructure':
        return '🏗️';
      default:
        return '💡';
    }
  };

  const filteredRecommendations = filter === 'all' 
    ? recommendations 
    : recommendations.filter(rec => {
        if (filter === 'high') return isHighPriority(rec.priority);
        if (filter === 'medium') return isMediumPriority(rec.priority);
        if (filter === 'low') return isLowPriority(rec.priority);
        return String(rec.priority).toLowerCase() === filter;
      });

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
          <h3 className="font-medium">Error loading recommendations</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered suggestions to improve your system's resilience
          </p>
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Recommendations</div>
          <div className="text-2xl font-bold text-gray-900">{recommendations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">High Priority</div>
          <div className="text-2xl font-bold text-red-600">
            {recommendations.filter(r => isHighPriority(r.priority)).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Medium Priority</div>
          <div className="text-2xl font-bold text-yellow-600">
            {recommendations.filter(r => isMediumPriority(r.priority)).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Low Priority</div>
          <div className="text-2xl font-bold text-green-600">
            {recommendations.filter(r => isLowPriority(r.priority)).length}
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className={`bg-white rounded-lg shadow border-l-4 ${getPriorityColor(recommendation.priority).split(' ')[2]}`}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">
                  {getCategoryIcon(recommendation.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {recommendation.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
                        {getPriorityLabel(recommendation.priority)} priority
                      </span>
                    </div>
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                      Implement
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {recommendation.description}
                  </p>
                  <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Service:</span> {recommendation.service.name}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {recommendation.category}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'All systems are optimally configured.' : `No ${filter} priority recommendations found.`}
          </p>
        </div>
      )}
    </div>
  );
};