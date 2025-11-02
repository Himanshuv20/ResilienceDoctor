import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ResilienceChartProps {
  topPerformers?: Array<{ name: string; score: number }>;
  bottomPerformers?: Array<{ name: string; score: number }>;
  className?: string;
}

export const ResilienceChart: React.FC<ResilienceChartProps> = ({
  topPerformers = [],
  bottomPerformers = [],
  className = ''
}) => {
  // Combine top and bottom performers for comparison
  const chartData = [
    ...topPerformers.map(p => ({ ...p, type: 'Top Performers' })),
    ...bottomPerformers.map(p => ({ ...p, type: 'Bottom Performers' }))
  ];

  if (chartData.length === 0) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={12}
          />
          <YAxis 
            label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
          />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="score" 
            fill="#3b82f6"
            name="Resilience Score"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};