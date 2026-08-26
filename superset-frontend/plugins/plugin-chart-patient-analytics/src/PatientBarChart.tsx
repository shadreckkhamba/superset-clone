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
import React, { useEffect, useRef } from 'react';
import { use, init, EChartsType } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  GraphicComponent,
} from 'echarts/components';
import { PatientBarChartTransformedProps } from './types';

// GRID_GUTTER_SIZE = 16 (2 * 8 base unit) - used to increase chart width
const GRID_GUTTER_SIZE = 16;

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  GraphicComponent,
]);

// Modern, soft color palette
const COLORS = [
  ['#A8D5BA', '#7FCFB3'], // Mint green
  ['#FFD6A5', '#FFBF7A'], // Peach orange
  ['#B5EAD7', '#9AE0C8'], // Seafoam
  ['#C7CEEA', '#B0BAE0'], // Lavender
  ['#FFB7B2', '#FF9A94'], // Coral pink
];

export default function PatientBarChart({
  data,
  showLabels = true,
  barWidth = 48 + GRID_GUTTER_SIZE, // Increase bar width using GRID_GUTTER_SIZE
  labelType = 'both', // Changed default to 'both' to show value and percentage
  chartTitle = 'Patients Statistics',
  subtitle = 'Figuring out stats for better health choices',
  height = 500,
  width = 900,
}: PatientBarChartTransformedProps & { subtitle?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<EChartsType | null>(null);

  // Extract categories and values from data
  const categories = data.map(d => d.category);
  const values = data.map(d => d.value);

  // Calculate percentages from total (for labels)
  const totalValue = values.reduce((sum: number, v: number) => sum + v, 0) || 1;
  const percentages = values.map((v: number) => Math.round((v / totalValue) * 100));

  // Calculate growth compared to previous bar
  const growthValues = values.map((val: number, i: number) => {
    if (i === 0) return 0;
    const prev = values[i - 1];
    return prev ? Math.round(((val - prev) / prev) * 100) : 0;
  });

  // Calculate max value for y-axis
  const maxValue = Math.max(...values) * 1.25; // Add 25% padding for labels

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }
    chartInstance.current = init(chartRef.current);

    // Create ECharts option
    const option: Record<string, unknown> = {
      backgroundColor: '#fff',
      title: {
        text: chartTitle,
        subtext: subtitle,
        left: 'center',
        top: 24,
        textStyle: {
          color: '#1a1a1a',
          fontSize: 24, // Increased from 20
          fontWeight: 700, // Increased from 600
          fontFamily: 'system-ui, -apple-system, "Inter", sans-serif',
        },
        subtextStyle: {
          color: '#6b7280',
          fontSize: 16, // Increased from 14
          fontWeight: 400,
          fontFamily: 'system-ui, -apple-system, "Inter", sans-serif',
        },
      },
      grid: {
        left: `${6 - GRID_GUTTER_SIZE / 10}%`, // Reduced left margin for wider bars
        right: '4%',
        bottom: '12%', // Increased for growth pills
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#374151',
          fontSize: 14, // Increased from 13
          fontWeight: 600, // Increased from 500
          fontFamily: 'system-ui, -apple-system, "Inter", sans-serif',
          margin: 16,
          rotate: 0,
          interval: 0,
          formatter: (value: string) => {
            // Wrap long text if needed
            return value.length > 12 ? value.substring(0, 10) + '...' : value;
          },
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        show: false, // Hide y-axis for cleaner look like reference
        min: 0,
        max: maxValue,
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          name: 'Value',
          type: 'bar',
          barWidth: barWidth,
          barGap: '20%',
          barCategoryGap: '30%',
          data: values.map((value, index) => {
            const colorPair = COLORS[index % COLORS.length];
            const percentage = percentages[index];
            
            return {
              value: value,
              itemStyle: {
                // Soft gradient like in reference
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: colorPair[1] },
                    { offset: 0.6, color: colorPair[0] },
                    { offset: 1, color: 'rgba(255,255,255,0.2)' },
                  ],
                },
                borderRadius: [10, 10, 0, 0], // Increased border radius
                shadowColor: 'rgba(0, 0, 0, 0.08)',
                shadowBlur: 8,
                shadowOffsetY: 3,
              },
              // Labels on top of bars (value and percentage)
              label: showLabels
                ? {
                    show: true,
                    position: 'top',
                    formatter: () => {
                      // Show both value and percentage like reference
                      return `${value}\n${percentage}%`;
                    },
                    color: '#1f2937',
                    fontSize: 15, // Increased from 13
                    fontWeight: 700, // Increased from 600
                    fontFamily: 'system-ui, -apple-system, "Inter", sans-serif',
                    lineHeight: 20,
                    offset: [0, -14],
                  }
                : { show: false },
            };
          }),
          animation: true,
          animationDuration: 800,
          animationEasing: 'cubicOut',
        },
        // Growth pills at bottom (like reference: +30%, +15%, etc.)
        {
          name: 'Growth',
          type: 'bar',
          barWidth: barWidth,
          data: values.map((_, index) => ({
            value: 0,
            itemStyle: {
              color: 'transparent',
            },
          })),
          label: {
            show: true,
            position: 'bottom',
            formatter: (params: { dataIndex: number }) => {
              const growth = growthValues[params.dataIndex];
              if (growth === 0) return '';
              const isPositive = growth > 0;
              return `${isPositive ? '+' : ''}${growth}%`;
            },
            backgroundColor: (params: { dataIndex: number }) => {
              const growth = growthValues[params.dataIndex];
              if (growth === 0) return 'transparent';
              // Use lighter version of bar color for pill background
              const colorPair = COLORS[params.dataIndex % COLORS.length];
              return colorPair[1];
            },
            borderRadius: 24, // Increased from 20
            padding: [8, 18], // Increased from [6, 16]
            color: '#fff',
            fontSize: 14, // Increased from 12
            fontWeight: 700, // Increased from 600
            offset: [0, 14],
            fontFamily: 'system-ui, -apple-system, "Inter", sans-serif',
            borderWidth: 0,
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(0, 0, 0, 0.03)',
          },
        },
        backgroundColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 14,
        padding: [14, 18],
        textStyle: {
          color: '#1f2937',
          fontSize: 14, // Increased from 13
          fontFamily: 'system-ui, -apple-system, "Inter", sans-serif',
        },
        formatter: (params: Array<{ name: string; value: number; seriesIndex: number }>) => {
          if (!params || !params.length) return '';
          const barParams = params[0];
          const { name, value } = barParams;
          const idx = categories.indexOf(name);
          const percentage = percentages[idx];
          const growth = growthValues[idx];
          
          return `
            <div style="font-weight: 700; margin-bottom: 12px; color: #111827; font-size: 15px;">${name}</div>
            <div style="display: flex; justify-content: space-between; gap: 28px; margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Patients:</span>
              <span style="font-weight: 700; color: #111827; font-size: 14px;">${value}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 28px; margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Percentage:</span>
              <span style="font-weight: 700; color: #111827; font-size: 14px;">${percentage}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 28px;">
              <span style="color: #6b7280; font-size: 14px;">Growth:</span>
              <span style="font-weight: 700; color: ${growth >= 0 ? '#10b981' : '#ef4444'}; font-size: 14px;">${growth >= 0 ? '+' : ''}${growth}%</span>
            </div>
          `;
        },
      },
      graphic: [
        {
          type: 'group',
          left: 'center',
          bottom: 0,
          children: [],
        },
      ],
    };

    chartInstance.current.setOption(option, true);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, showLabels, barWidth, labelType, chartTitle, subtitle, height, width]);

  return (
    <div style={{
      padding: '20px',
      background: '#fff',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div
        ref={chartRef}
        style={{
          width: width ? `${width + GRID_GUTTER_SIZE * 2}px` : '100%',
          height: height ? `${height + GRID_GUTTER_SIZE}px` : '500px',
          minHeight: '450px'
        }}
      />
    </div>
  );
}
