/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { User, Users } from 'lucide-react';
import { styled } from '@superset-ui/core';
import { PieChartWithCardsProps, PieChartDataItem } from './types';

const SliceLabel = styled.text`
  font-size: 14px;
  font-weight: bold;
  fill: white;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
`;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  name,
  percentage,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const icon = name.toLowerCase().includes('male') || name.toLowerCase().includes('man') ? '👨' :
               name.toLowerCase().includes('female') || name.toLowerCase().includes('woman') ? '👩' : '';

  return (
    <SliceLabel x={x} y={y}>
      {icon && `${icon} `}
      {value.toLocaleString()}
      {'\n'}
      {percentage}%
    </SliceLabel>
  );
};

const CHART_COLORS = [
  'hsl(28 85% 55%)', // Female - orange
  'hsl(210 80% 52%)', // Male - blue
];

const ICON_COLORS = [
  'hsl(28 85% 55%)', // Female - orange
  'hsl(210 80% 52%)', // Male - blue
];

const ICONS = [User, Users]; // User for Female, Users for Male

export default function PieChartWithCards({
  data = [],
  title,
  width,
  height,
}: PieChartWithCardsProps) {
  const total = data.reduce(
    (sum: number, item: PieChartDataItem) => sum + item.value,
    0,
  );

  const chartData = data.map((item: PieChartDataItem, index: number) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
  }));

  return (
    <div
      className="rounded-2xl bg-card border border-border shadow-card"
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', width, height }}
    >
      {/* Header Bar */}
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-bold" style={{ color: 'hsl(174 60% 40%)' }}>
          {title || 'Distribution'}
        </h2>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Total Counter */}
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Total
          </div>
          <div className="text-3xl font-extrabold text-foreground">
            {total.toLocaleString()}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="flex justify-center mb-4" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                strokeWidth={0}
                dataKey="value"
                animationBegin={300}
                animationDuration={800}
                label={renderCustomLabel}
                labelLine={false}
              >
                {chartData.map(
                  (entry: PieChartDataItem & { color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ),
                )}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-2 gap-3">
          {chartData.map(
            (
              item: PieChartDataItem & { color: string; percentage: string },
              index: number,
            ) => {
              const IconComponent = ICONS[index % ICONS.length];
              return (
                <div
                  key={item.name}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-border"
                  style={{ backgroundColor: 'hsl(var(--accent) / 0.4)' }}
                >
                  {/* Icon Box */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${ICON_COLORS[index % ICON_COLORS.length]}15` }}
                  >
                    <IconComponent
                      className="w-4 h-4"
                      style={{ color: ICON_COLORS[index % ICON_COLORS.length] }}
                    />
                  </div>

                  {/* Text Stack */}
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {item.name}
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
