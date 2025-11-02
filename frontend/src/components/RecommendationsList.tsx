import React from 'react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: number | string;
  category: string;
  severity?: string;
}

interface RecommendationsListProps {
  recommendations?: Recommendation[];
  className?: string;
  showService?: boolean;
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations = [],
  className = '',
  showService = false
}) => {
  const getPriorityColor = (priority: number | string) => {
    // Handle numeric priority (1-5)
    if (typeof priority === 'number') {
      if (priority >= 4) return 'bg-red-100 text-red-800';
      if (priority >= 3) return 'bg-yellow-100 text-yellow-800';
      return 'bg-green-100 text-green-800';
    }
    
    // Handle string priority
    const priorityStr = String(priority).toLowerCase();
    switch (priorityStr) {
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

  const getPriorityLabel = (priority: number | string) => {
    if (typeof priority === 'number') {
      if (priority >= 4) return 'High';
      if (priority >= 3) return 'Medium';
      return 'Low';
    }
    return String(priority);
  };

  const getSeverityColor = (severity?: string) => {
    if (!severity) return 'bg-gray-100 text-gray-800';
    
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Recommendations
      </h3>
      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl text-gray-300 mb-2">💡</div>
          <p className="text-gray-500">No recommendations available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} className="border-l-4 border-blue-400 pl-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {rec.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {rec.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    {rec.severity && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(rec.severity)}`}>
                        {rec.severity}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      Priority: {getPriorityLabel(rec.priority)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {rec.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};