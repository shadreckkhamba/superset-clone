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
import React, { useMemo } from 'react';
import { styled, css } from '@superset-ui/core';
import { DataRecord } from '@superset-ui/core';
import { Hash, Database, TrendingUp, Trophy } from 'lucide-react';

// CSS Variables for teal medical/clinical palette
const themeVars = css`
  --color-primary: #0d9488;
  --color-primary-light: #14b8a6;
  --color-primary-dark: #0f766e;
  --color-secondary: #06b6d4;
  --color-accent: #0891b2;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  --color-bg-card: #ffffff;
  --color-bg-muted: #f8fafc;
  --color-bg-hover: #f1f5f9;
  
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
`;

// Styled components
const Container = styled.div`
  ${themeVars}
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeIn 0.5s ease-out;
  display: flex;
  flex-direction: column;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const KPIBanner = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-bg-muted) 0%, var(--color-bg-card) 100%);
  height: auto;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const KPITile = styled.div<{ bgColor?: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-right: 1px solid var(--color-border);
  background: ${props => props.bgColor || 'transparent'};
  transition: all var(--transition-normal);
  animation: slideIn 0.4s ease-out backwards;
  height: auto;
  
  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
  &:nth-child(4) { animation-delay: 0.4s; }
  
  &:hover {
    background: var(--color-bg-hover);
    transform: translateY(-2px);
  }
  
  &:last-child {
    border-right: none;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const KPIIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: ${props => props.color || 'var(--color-primary)'};
  color: white;
  font-size: 18px;
  flex-shrink: 0;
  min-height: 40px;
`;

const KPIContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: auto;
`;

const KPIValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
  height: auto;
`;

const KPILabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  height: auto;
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 300px;
  flex: 1;
`;

const TableSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
  height: auto;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  height: auto;
`;

const DataTable = styled.div`
  flex: 1;
  overflow: auto;
  max-height: 100%;
  
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-bg-muted);
    border-radius: var(--radius-sm);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: var(--radius-sm);
    
    &:hover {
      background: var(--color-text-muted);
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  height: 100%;
`;

const TableHead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg-card);
  height: auto;
`;

const TableHeader = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-bg-card);
  height: auto;
`;

const TableBody = styled.tbody`
  height: 100%;
`;

const TableRow = styled.tr`
  transition: all var(--transition-fast);
  animation: fadeInRow 0.3s ease-out backwards;
  height: auto;
  
  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.15s; }
  &:nth-child(3) { animation-delay: 0.2s; }
  &:nth-child(4) { animation-delay: 0.25s; }
  &:nth-child(5) { animation-delay: 0.3s; }
  
  &:hover {
    background: var(--color-bg-hover);
  }
  
  @keyframes fadeInRow {
    from {
      opacity: 0;
      transform: translateX(-5px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const TableCell = styled.td`
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary);
  vertical-align: middle;
  font-size: 15px;
  height: auto;
`;

const LocationCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LocationDot = styled.span<{ color?: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.color || 'var(--color-primary)'};
  flex-shrink: 0;
`;

const BarCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BarContainer = styled.div`
  flex: 1;
  height: 8px;
  background: var(--color-border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
`;

const BarFill = styled.div<{ width: number; color?: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color || 'var(--color-primary)'};
  border-radius: var(--radius-sm);
  transition: width var(--transition-slow);
  animation: barGrow 0.6s ease-out;
  
  @keyframes barGrow {
    from {
      width: 0;
    }
    to {
      width: ${props => props.width}%;
    }
  }
`;

const TrendCell = styled.div<{ trend: 'up' | 'down' | 'stable' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${props => {
    switch (props.trend) {
      case 'up': return 'var(--color-success)';
      case 'down': return 'var(--color-error)';
      default: return 'var(--color-text-muted)';
    }
  }};
`;

const TrendIcon = styled.span`
  font-size: 12px;
`;


// Types
interface UnifiedChartTableProps {
  data?: DataRecord[];
  height?: number;
  width?: number;
}

// Color palette for locations
const locationColors = [
  '#0d9488', '#06b6d4', '#0891b2', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6',
];

export default function UnifiedChartTable({
  data,
  height,
  width = 900,
}: UnifiedChartTableProps) {
  // Calculate dynamic height based on data
  const dynamicHeight = useMemo(() => {
    if (!data || data.length === 0) return 400;
    const baseHeight = 200; // KPI banner + header
    const rowHeight = 60; // Approximate height per row
    const maxRows = 50; // Max rows before scrolling
    const rowCount = Math.min(data.length, maxRows);
    return baseHeight + (rowCount * rowHeight);
  }, [data]);

  const containerHeight = height || dynamicHeight;
  // Get column names from data
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Get numeric columns for KPIs
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return columns.filter(col => {
      const value = data[0][col];
      return typeof value === 'number' || !isNaN(Number(value));
    });
  }, [data, columns]);

  // Get first string column for labels
  const labelColumn = useMemo(() => {
    if (!data || data.length === 0) return '';
    return columns.find(col => {
      const value = data[0][col];
      return typeof value === 'string';
    }) || columns[0];
  }, [data, columns]);

  // Get first numeric column for values
  const valueColumn = useMemo(() => {
    if (numericColumns.length === 0) return '';
    return numericColumns[0];
  }, [numericColumns]);

  // Get second numeric column for percentages (if exists)
  const percentColumn = useMemo(() => {
    if (numericColumns.length < 2) return '';
    return numericColumns[1];
  }, [numericColumns]);

  // Calculate KPI values
  const kpiValues = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, count: 0, average: 0, topItem: 'N/A' };
    }
    
    const total = data.reduce((sum, row) => {
      const value = Number(row[valueColumn]) || 0;
      return sum + value;
    }, 0);
    
    const count = data.length;
    const average = count > 0 ? Math.round(total / count) : 0;
    const topItem = data[0] ? String(data[0][labelColumn] || 'N/A') : 'N/A';
    
    return { total, count, average, topItem };
  }, [data, valueColumn, labelColumn]);

  // Calculate max value for bar chart
  const maxBarValue = useMemo(() => {
    if (!data || data.length === 0 || !valueColumn) return 0;
    return Math.max(...data.map(row => Number(row[valueColumn]) || 0));
  }, [data, valueColumn]);

  return (
    <Container style={{ height: containerHeight, width: '100%' }}>
      {/* KPI Banner */}
      <KPIBanner>
        <KPITile bgColor="rgba(13, 148, 136, 0.05)">
          <KPIIcon color="#0d9488">
            <Hash size={20} />
          </KPIIcon>
          <KPIContent>
            <KPIValue>{kpiValues.total.toLocaleString()}</KPIValue>
            <KPILabel>Total</KPILabel>
          </KPIContent>
        </KPITile>
        
        <KPITile bgColor="rgba(6, 182, 212, 0.05)">
          <KPIIcon color="#06b6d4">
            <Database size={20} />
          </KPIIcon>
          <KPIContent>
            <KPIValue>{kpiValues.count}</KPIValue>
            <KPILabel>Records</KPILabel>
          </KPIContent>
        </KPITile>
        
        <KPITile bgColor="rgba(8, 145, 178, 0.05)">
          <KPIIcon color="#0891b2">
            <TrendingUp size={20} />
          </KPIIcon>
          <KPIContent>
            <KPIValue>{kpiValues.average}</KPIValue>
            <KPILabel>Average</KPILabel>
          </KPIContent>
        </KPITile>
        
        <KPITile bgColor="rgba(16, 185, 129, 0.05)">
          <KPIIcon color="#10b981">
            <Trophy size={20} />
          </KPIIcon>
          <KPIContent>
            <KPIValue style={{ fontSize: 16 }}>{kpiValues.topItem}</KPIValue>
            <KPILabel>Top Item</KPILabel>
          </KPIContent>
        </KPITile>
      </KPIBanner>

      {/* Content Area */}
      <ContentArea>
        {/* Table Section */}
        <TableSection>
          <SectionHeader>
            <SectionTitle>Data Distribution</SectionTitle>
          </SectionHeader>
          <DataTable>
            <Table>
              <TableHead>
                <tr>
                  {columns.map((col, index) => (
                    <TableHeader key={index}>{col}</TableHeader>
                  ))}
                </tr>
              </TableHead>
              <TableBody>
                {data?.map((row, rowIndex) => {
                  const barWidth = maxBarValue > 0 && valueColumn
                    ? (Number(row[valueColumn]) / maxBarValue) * 100
                    : 0;
                  const color = locationColors[rowIndex % locationColors.length];
                  
                  return (
                    <TableRow key={rowIndex}>
                      {columns.map((col, colIndex) => {
                        const value = row[col];
                        const isNumeric = numericColumns.includes(col);
                        const isLabel = col === labelColumn;
                        const isPercent = col === percentColumn;
                        
                        return (
                          <TableCell key={colIndex}>
                            {isLabel ? (
                              <LocationCell>
                                <LocationDot color={color} />
                                {String(value)}
                              </LocationCell>
                            ) : isNumeric && col === valueColumn ? (
                              <BarCell>
                                <BarContainer>
                                  <BarFill width={barWidth} color={color} />
                                </BarContainer>
                                <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                                  {Number(value).toLocaleString()}
                                </span>
                              </BarCell>
                            ) : isPercent ? (
                              <span style={{ fontWeight: 600, color: '#0d9488' }}>
                                {value}%
                              </span>
                            ) : (
                              String(value)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTable>
        </TableSection>
      </ContentArea>
    </Container>
  );
}
