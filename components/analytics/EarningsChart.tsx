import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface EarningsDataPoint {
  date: string;
  earnings: number;
}

interface EarningsChartProps {
  data: EarningsDataPoint[];
  type?: 'line' | 'bar';
}

export default function EarningsChart({ data, type = 'line' }: EarningsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-500">No earnings data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Earnings Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number | string | undefined) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return `$${numValue.toFixed(2)}`;
                }}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Line type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number | undefined) => value !== undefined ? `$${value.toFixed(2)}` : '$0.00'}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Bar dataKey="earnings" fill="#3b82f6" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}