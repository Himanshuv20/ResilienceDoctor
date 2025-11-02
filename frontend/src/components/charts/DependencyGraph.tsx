import React from 'react';

interface Node {
  id: string;
  name: string;
  score: number;
  riskLevel: string;
  dependencyCount: number;
  dependentCount: number;
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

interface DependencyGraphProps {
  nodes?: Node[];
  edges?: Edge[];
  className?: string;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes = [],
  edges = [],
  className = ''
}) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className={className}>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No dependency data available</p>
        </div>
      </div>
    );
  }

  // Create a simple hierarchical visualization
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 border-green-500 text-green-900';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'high': return 'bg-red-100 border-red-500 text-red-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  // Group nodes by their dependency count for layout
  const levels = {
    hub: nodes.filter(n => n.dependencyCount + n.dependentCount > 5),
    core: nodes.filter(n => n.dependencyCount + n.dependentCount > 2 && n.dependencyCount + n.dependentCount <= 5),
    leaf: nodes.filter(n => n.dependencyCount + n.dependentCount <= 2)
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Hub Services */}
        {levels.hub.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Hub Services (High Connectivity)</h4>
            <div className="flex flex-wrap gap-3">
              {levels.hub.map(node => (
                <div
                  key={node.id}
                  className={`px-4 py-3 rounded-lg border-2 ${getRiskColor(node.riskLevel)} shadow-sm`}
                >
                  <div className="font-medium text-sm">{node.name}</div>
                  <div className="text-xs mt-1">
                    Score: {node.score} | Dependencies: {node.dependencyCount} | Dependents: {node.dependentCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core Services */}
        {levels.core.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Core Services</h4>
            <div className="flex flex-wrap gap-3">
              {levels.core.map(node => (
                <div
                  key={node.id}
                  className={`px-3 py-2 rounded-lg border ${getRiskColor(node.riskLevel)}`}
                >
                  <div className="font-medium text-xs">{node.name}</div>
                  <div className="text-xs mt-1">
                    Score: {node.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaf Services */}
        {levels.leaf.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Leaf Services (Low Connectivity)</h4>
            <div className="flex flex-wrap gap-2">
              {levels.leaf.map(node => (
                <div
                  key={node.id}
                  className={`px-2 py-1 rounded border text-xs ${getRiskColor(node.riskLevel)}`}
                >
                  {node.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 border-t pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div>Total Services: {nodes.length}</div>
            <div>Total Dependencies: {edges.length}</div>
            <div>Avg Dependencies: {(edges.length / nodes.length).toFixed(1)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};