import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface IncidentTrendChartProps {
  incidents?: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    weeklyTrend: Array<{ week: string; count: number; critical: number }>;
    recentTrend: string;
  };
  className?: string;
}

export const IncidentTrendChart: React.FC<IncidentTrendChartProps> = ({
  incidents,
  className = ''
}) => {
  if (!incidents || !incidents.weeklyTrend || incidents.weeklyTrend.length === 0) {
    return (
      <div className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No incident data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={incidents.weeklyTrend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis label={{ value: 'Incidents', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="count" 
            stackId="1"
            stroke="#3b82f6" 
            fill="#3b82f6" 
            name="Total Incidents"
          />
          <Area 
            type="monotone" 
            dataKey="critical" 
            stackId="2"
            stroke="#ef4444" 
            fill="#ef4444" 
            name="Critical Incidents"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Total Incidents</div>
          <div className="text-lg font-bold">{incidents.total}</div>
        </div>
        <div>
          <div className="text-gray-600">Recent Trend</div>
          <div className={`text-lg font-bold ${incidents.recentTrend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
            {incidents.recentTrend === 'increasing' ? '↑ Increasing' : '↓ Decreasing'}
          </div>
        </div>
      </div>
    </div>
  );
};