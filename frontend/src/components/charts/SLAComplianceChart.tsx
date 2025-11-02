import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SLAComplianceChartProps {
  compliance?: {
    compliant: Array<{ name: string; uptime: number; errorRate: number }>;
    atRisk: Array<{ name: string; uptime: number; errorRate: number; issues?: string[] }>;
    complianceRate: number;
  };
  className?: string;
}

export const SLAComplianceChart: React.FC<SLAComplianceChartProps> = ({
  compliance,
  className = ''
}) => {
  if (!compliance) {
    return (
      <div className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No compliance data available</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Compliant', value: compliance.compliant.length, color: '#10b981' },
    { name: 'At Risk', value: compliance.atRisk.length, color: '#ef4444' }
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          Overall Compliance Rate: <span className="font-bold text-green-600">{compliance.complianceRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};