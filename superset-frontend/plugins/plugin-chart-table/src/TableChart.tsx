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
import React, { useMemo, useState, useEffect, SVGProps } from 'react';
import { styled, css } from '@superset-ui/core';
import { DataRecord } from '@superset-ui/core';
import {
  Hash,
  MapPin,
  Database,
  TrendingUp,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';

function FluentPeopleCommunity20Filled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" {...props}>
      <path fill="currentColor" d="M10 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6M5.053 9.996q-.051.244-.051.504V14a4.99 4.99 0 0 0 1.767 3.814l-.171.05a4 4 0 0 1-4.9-2.828l-.647-2.415a1.5 1.5 0 0 1 1.061-1.837zm8.182 7.818A4.99 4.99 0 0 0 15.002 14v-3.5q-.001-.26-.05-.504l2.94.788a1.5 1.5 0 0 1 1.06 1.837l-.647 2.415a4 4 0 0 1-5.07 2.778M16.5 4a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5m-13 0a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5m4 5A1.5 1.5 0 0 0 6 10.5V14a4 4 0 0 0 8 0v-3.5A1.5 1.5 0 0 0 12.5 9z" />
    </svg>
  );
}

function MaterialSymbolsPinDropRounded(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M11.4 18.425q-.3-.1-.55-.3q-2.95-2.35-4.4-4.587T5 9.15q0-3.125 1.95-5.137T12 2t5.05 2.013T19 9.15q0 2.15-1.45 4.388t-4.4 4.587q-.25.2-.55.3t-.6.1t-.6-.1M12 11q.825 0 1.413-.587T14 9t-.587-1.412T12 7t-1.412.588T10 9t.588 1.413T12 11M6 22q-.425 0-.712-.288T5 21t.288-.712T6 20h12q.425 0 .713.288T19 21t-.288.713T18 22z" />
    </svg>
  );
}

// CSS Variables for teal medical/clinical palette
//changed color palette

const themeVars = css`
--color-primary: #159b90;       /* 175° teal base */
--color-primary-light: #58f3dc;  /* 174° bright cyan pop */
--color-primary-dark: #034936;   /* 175° deep teal */
--color-secondary: #2974ee;      /* 222° blue (+47°) */
--color-accent: #f59e0b;         /*  45° amber (+110°) */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  --color-bg-card: #ffffff;
  --color-bg-muted: #f8fafc;
  --color-bg-hover: #f1f5f9;
  
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #8796aa;
  
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
const Container = styled.div<{ $dynamicHeight?: number; $showSkeleton?: boolean }>`
  ${themeVars}
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeIn 0.5s ease-out;
  display: flex;
  flex-direction: column;
  height: ${props => props.$dynamicHeight ? `${props.$dynamicHeight}px` : 'auto'};
  min-height: 300px;
  max-height: none;
  transition: height 0.3s ease-in-out;

  ${({ $showSkeleton }) =>
    $showSkeleton &&
    `
    position: relative;
    overflow: hidden;

    & > * {
      opacity: 0;
      pointer-events: none;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        90deg,
        rgba(130, 152, 164, 0.16) 0%,
        rgba(130, 152, 164, 0.32) 45%,
        rgba(130, 152, 164, 0.16) 100%
      );
      background-size: 220% 100%;
      animation: tableThemeSkeletonShimmer 1.1s linear infinite;
      z-index: 2;
    }
  `}

  body.theme-transitioning & {
    position: relative;
    overflow: hidden;
  }

  body.theme-transitioning & > * {
    opacity: 0 !important;
  }

  body.theme-transitioning &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      90deg,
      rgba(130, 152, 164, 0.16) 0%,
      rgba(130, 152, 164, 0.32) 45%,
      rgba(130, 152, 164, 0.16) 100%
    );
    background-size: 220% 100%;
    animation: tableThemeSkeletonShimmer 1.1s linear infinite;
    z-index: 2;
  }

  body.dark-theme &,
  [data-theme='dark'] & {
    --color-primary: #0d9488;
    --color-primary-light: #14b8a6;
    --color-primary-dark: #0f766e;
    --color-secondary: #06b6d4;
    --color-accent: #0891b2;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    --color-info: #3b82f6;
    
    --color-bg-card: #0a0a0a;
    --color-bg-muted: #111111;
    --color-bg-hover: #1a1a1a;
    
    --color-text-primary: #eef8fa;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    
    --color-border: #1f3744;
    --color-border-light: #1a1a1a;
    
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.35);
    
    background: #0a0a0a;
    box-shadow: var(--shadow-lg), inset 0 0 0 1px rgba(80, 140, 165, 0.15);
    border: 1px solid #1f3744;
  }
  
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

  @keyframes tableThemeSkeletonShimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
`;

const SkeletonLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
`;

const SkeletonKpiRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 10px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SkeletonTile = styled.div`
  height: 74px;
  border-radius: 10px;
  background: linear-gradient(
    90deg,
    rgba(130, 152, 164, 0.14) 0%,
    rgba(130, 152, 164, 0.26) 45%,
    rgba(130, 152, 164, 0.14) 100%
  );
  background-size: 220% 100%;
  animation: tableThemeSkeletonShimmer 1.1s linear infinite;
`;

const SkeletonHeaderRow = styled.div`
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(130, 152, 164, 0.14) 0%,
    rgba(130, 152, 164, 0.26) 45%,
    rgba(130, 152, 164, 0.14) 100%
  );
  background-size: 220% 100%;
  animation: tableThemeSkeletonShimmer 1.1s linear infinite;
`;

const SkeletonTableRow = styled.div`
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(130, 152, 164, 0.14) 0%,
    rgba(130, 152, 164, 0.26) 45%,
    rgba(130, 152, 164, 0.14) 100%
  );
  background-size: 220% 100%;
  animation: tableThemeSkeletonShimmer 1.1s linear infinite;
`;

const KPIBanner = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 0.82fr) minmax(0, 1.36fr);
  gap: 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-bg-muted) 0%, var(--color-bg-card) 100%);
  height: auto;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;

  body.dark-theme &,s
  [data-theme='dark'] & {
    background: linear-gradient(135deg, #111111 0%, #0a0a0a 100%);
    border-bottom-color: #1f3744;
  }
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const KPITile = styled.div<{ bgColor?: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-right: none;
  background: ${props => props.bgColor || 'transparent'};
  transition: all var(--transition-normal);
  animation: slideIn 0.4s ease-out backwards;
  min-height: 88px;
  height: auto;
  box-sizing: border-box;
  overflow: visible;
  min-width: 0;
  
  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
  
  &:hover {
    background: var(--color-bg-hover);
    transform: translateY(-2px);
  }

  body.dark-theme &,
  [data-theme='dark'] & {
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
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

const CompactKPITile = styled(KPITile)`
  padding: 12px 14px;
  min-height: 72px;
`;

const TopLocationTile = styled(KPITile)`
  padding: 10px 16px;
  min-height: 72px;

  @media (max-width: 1024px) {
    grid-column: 1 / -1;
  }
`;

const KPIIcon = styled.div<{ color?: string; $size?: number; $iconSize?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => `${props.$size ?? 60}px`};
  height: ${props => `${props.$size ?? 60}px`};
  border-radius: var(--radius-md);
  background: #e3e8f0;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.14);
  color: #111827;
  font-size: 30px;
  flex-shrink: 0;
  min-width: ${props => `${props.$size ?? 60}px`};
  min-height: ${props => `${props.$size ?? 60}px`};
  
  & > svg {
    width: ${props => `${props.$iconSize ?? 26}px`};
    height: ${props => `${props.$iconSize ?? 26}px`};
    font-size: ${props => `${props.$iconSize ?? 26}px`};
    flex-shrink: 0;
  }

  body.dark-theme &,
  [data-theme='dark'] & {
    background: ${props => props.color || 'var(--color-primary)'};
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    color: #ffffff;
  }

  @media (max-width: 768px) {
    width: ${props => `${props.$size ? Math.max(40, Math.round(props.$size * 0.67)) : 40}px`};
    height: ${props => `${props.$size ? Math.max(40, Math.round(props.$size * 0.67)) : 40}px`};
    min-width: ${props => `${props.$size ? Math.max(40, Math.round(props.$size * 0.67)) : 40}px`};
    min-height: ${props => `${props.$size ? Math.max(40, Math.round(props.$size * 0.67)) : 40}px`};
    font-size: 20px;

    & > svg {
      width: ${props =>
        `${props.$iconSize ? Math.max(18, Math.round(props.$iconSize * 0.8)) : 20}px`};
      height: ${props =>
        `${props.$iconSize ? Math.max(18, Math.round(props.$iconSize * 0.8)) : 20}px`};
      font-size: ${props =>
        `${props.$iconSize ? Math.max(18, Math.round(props.$iconSize * 0.8)) : 20}px`};
    }
  }
`;

const KPIContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: auto;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const KPIContentLeft = styled(KPIContent)`
  justify-content: flex-start;
`;

const KPIValue = styled.div`
  font-size: clamp(22px, 4vw, 42px);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.1;
  height: auto;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  max-width: 100%;

  body.dark-theme &,
  [data-theme='dark'] & {
    color: #ffffff;
  }
  
  @media (max-width: 768px) {
    font-size: 32px;
    white-space: normal;
    word-break: break-word;
  }
`;

const KPIValueLeft = styled(KPIValue)`
  text-align: left;
`;

const TopLocationsValue = styled(KPIValue)`
  font-size: clamp(18px, 2.8vw, 25px);
  text-align: left;
  white-space: normal;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.25;
  max-width: 100%;
  flex: 1 1 100%;
  flex-shrink: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  @media (max-width: 768px) {
    -webkit-line-clamp: 3;
  }
`;

const KPILabel = styled.div`
  font-size: clamp(14px, 2.1vw, 20px);
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
  height: auto;
  text-align: left;
  text-transform: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;

  body.dark-theme &,
[data-theme='dark'] & {
    color: #ffffff;
  }
  
  @media (max-width: 768px) {
    font-size: 18px;
    white-space: normal;
    word-break: break-word;
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
`;

const TableSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
  min-height: 44px;

  body.dark-theme &,
  [data-theme='dark'] & {
    background: #0a0a0a;
    border-bottom-color: #1f3744;
  }
`;


const HeaderControls = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-left: auto;
`;

const PageMeta = styled.span`
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 600;
  color: var(--color-text-secondary);
`;

const NavButton = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: 0;

  & > svg {
    display: block;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: var(--color-bg-hover);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const OthersButton = styled.button`
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: rgba(13, 148, 136, 0.1);
  color: var(--color-primary-dark);
  padding: 0 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(13, 148, 136, 0.16);
    transform: translateY(-1px);
  }

  body.dark-theme &,
  [data-theme='dark'] & {
    border-color: #1f3744;
    background: rgba(20, 184, 166, 0.16);
    color: #c9f7f2;
  }
`;

const OthersFilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const OthersFilterLabel = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
`;

const OthersFilterSelect = styled.select`
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
`;

const DataTable = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: hidden;
  max-height: none;
  transition: max-height 0.3s ease-in-out;
  min-width: 0;
  max-width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(14px, 2.2vw, 21px);
  height: 100%;
  table-layout: fixed;
  max-width: 100%;
`;

const TableHead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg-card);
  height: auto;

  & th {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  body.dark-theme &,
  [data-theme='dark'] & {
    background: #0a0a0a;
  }
`;

const TableHeader = styled.th<{ colIndex?: number }>`
  padding: 8px 12px;
  text-align: ${props => props.colIndex === 2 ? 'center' : 'left'};
  font-weight: 900;
  font-size: clamp(15px, 2.3vw, 27px);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-bg-card);
  min-height: 40px;
  width: ${props => props.colIndex === 0 ? '25%' : props.colIndex === 1 ? '50%' : '25%'};
  box-sizing: border-box;

  body.dark-theme &,
  [data-theme='dark'] & {
    color: #ffffff;
    border-bottom-color: #1f3744;
    background: #0a0a0a;
  }
`;

const TableBody = styled.tbody`
  height: auto;
`;

const TableRow = styled.tr`
  transition: all var(--transition-fast);
  animation: fadeInRow 0.3s ease-out backwards;
  min-height: 36px;

  & > td {
    padding-top: 4px;
    padding-bottom: 4px;
  }
  
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

const TableCell = styled.td<{ colIndex?: number }>`
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary);
  vertical-align: middle;
  font-size: clamp(14px, 2.8vw, 30px);
  min-height: 36px;
  width: ${props => props.colIndex === 0 ? '25%' : props.colIndex === 1 ? '50%' : '25%'};
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: ${props => props.colIndex === 2 ? 'center' : 'left'};
`;

const EmptyTableState = styled.div`
  width: 100%;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 18px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: linear-gradient(
    180deg,
    rgba(21, 155, 144, 0.04) 0%,
    rgba(248, 250, 252, 1) 100%
  );
  color: var(--color-text-secondary);
  font-size: clamp(15px, 2vw, 20px);
  font-weight: 700;
  box-sizing: border-box;

  body.dark-theme &,
  [data-theme='dark'] & {
    background: linear-gradient(
      180deg,
      rgba(21, 155, 144, 0.12) 0%,
      rgba(17, 17, 17, 1) 100%
    );
    border-color: #1f3744;
    color: #d7e5ea;
  }
`;

const LocationCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(14px, 2.1vw, 22px);
  font-weight: 600;
  min-width: 0;
  overflow: hidden;

  body.dark-theme &,
  [data-theme='dark'] & {
    color: #ffffff;
  }
`;

const LocationText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LocationDot = styled.span<{ color?: string }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${props => props.color || 'var(--color-primary)'};
  flex-shrink: 0;
`;

const BarCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const BarContainer = styled.div`
  flex: 1;
  height: 10px;
  min-width: 0;
  background: var(--color-border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;

  body.dark-theme &,
  [data-theme='dark'] & {
    background: #1f3744;
  }
`;

const BarValue = styled.span`
  font-weight: 700;
  font-size: clamp(16px, 2vw, 22px);
  min-width: 0;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
`;

const PercentValue = styled.span`
  display: inline-block;
  max-width: 100%;
  font-weight: 700;
  font-size: clamp(16px, 2vw, 22px);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  body.dark-theme &,
  [data-theme='dark'] & {
    color: #ffffff;
  }
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
  font-size: 14px;
`;


// Types
interface TableChartProps {
  data?: DataRecord[];
  height?: number;
  width?: number;
}

// Color palette for locations
const locationColors = [
  '#0d9488', '#06b6d4', '#0891b2', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6',
];

const ROWS_PER_PAGE = 3;
const AUTO_PAGE_DELAY_MS = 7000;
const MAX_TOP_ITEMS_IN_TILE = 3;
const TOP_LOCATIONS_LIMIT = 10;
type OthersSortMode = 'visits_desc' | 'visits_asc' | 'name_asc' | 'name_desc';

export default function TableChart({
  data,
  height,
  width = 900,
}: TableChartProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoRotatePaused, setIsAutoRotatePaused] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(!data || data.length === 0);
  const [activeView, setActiveView] = useState<'top10' | 'others'>('top10');
  const [othersPage, setOthersPage] = useState(0);
  const [othersSortMode, setOthersSortMode] = useState<OthersSortMode>('visits_desc');
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

  const aggregatedByLocation = useMemo(() => {
    if (!data || data.length === 0 || !labelColumn || !valueColumn) return [];

    const grouped = new Map<string, number>();
    data.forEach(row => {
      const location = String(row[labelColumn] ?? 'Unknown');
      const visits = Number(row[valueColumn]) || 0;
      grouped.set(location, (grouped.get(location) || 0) + visits);
    });

    return Array.from(grouped.entries())
      .map(([location, visits]) => ({ location, visits }))
      .sort((a, b) => b.visits - a.visits);
  }, [data, labelColumn, valueColumn]);

  const totalVisits = useMemo(
    () => aggregatedByLocation.reduce((sum, item) => sum + item.visits, 0),
    [aggregatedByLocation],
  );

  const topLocationRows = useMemo(() => {
    if (aggregatedByLocation.length === 0 || !labelColumn || !valueColumn) return [];

    const emptyRow = columns.reduce<Record<string, unknown>>((acc, col) => {
      acc[col] = '';
      return acc;
    }, {});

    return aggregatedByLocation.slice(0, TOP_LOCATIONS_LIMIT).map(item => {
      const row = { ...emptyRow };
      row[labelColumn] = item.location;
      row[valueColumn] = item.visits;
      if (percentColumn) {
        const percent = totalVisits > 0 ? (item.visits / totalVisits) * 100 : 0;
        row[percentColumn] = Number(percent.toFixed(1));
      }
      return row as DataRecord;
    });
  }, [aggregatedByLocation, columns, labelColumn, valueColumn, percentColumn, totalVisits]);

  const othersRows = useMemo(
    () => aggregatedByLocation.slice(TOP_LOCATIONS_LIMIT),
    [aggregatedByLocation],
  );

  const filteredOthersRows = useMemo(() => {
    return [...othersRows].sort((a, b) => {
      if (othersSortMode === 'visits_asc') return a.visits - b.visits;
      if (othersSortMode === 'name_asc') return a.location.localeCompare(b.location);
      if (othersSortMode === 'name_desc') return b.location.localeCompare(a.location);
      return b.visits - a.visits;
    });
  }, [othersRows, othersSortMode]);

  const othersTableRows = useMemo(() => {
    if (!labelColumn || !valueColumn) return [];
    const emptyRow = columns.reduce<Record<string, unknown>>((acc, col) => {
      acc[col] = '';
      return acc;
    }, {});

    return filteredOthersRows.map(item => {
      const row = { ...emptyRow };
      row[labelColumn] = item.location;
      row[valueColumn] = item.visits;
      if (percentColumn) {
        const percent = totalVisits > 0 ? (item.visits / totalVisits) * 100 : 0;
        row[percentColumn] = Number(percent.toFixed(1));
      }
      return row as DataRecord;
    });
  }, [columns, filteredOthersRows, labelColumn, valueColumn, percentColumn, totalVisits]);

  const tableData = useMemo(() => {
    if (topLocationRows.length > 0) return topLocationRows;
    return data || [];
  }, [topLocationRows, data]);

  const topTotalPages = useMemo(() => {
    if (tableData.length === 0) return 1;
    return Math.ceil(tableData.length / ROWS_PER_PAGE);
  }, [tableData]);

  useEffect(() => {
    if (activeView !== 'top10' || topTotalPages <= 1 || isAutoRotatePaused) return;
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % topTotalPages);
    }, AUTO_PAGE_DELAY_MS);
    return () => clearInterval(interval);
  }, [activeView, topTotalPages, isAutoRotatePaused]);

  useEffect(() => {
    if (currentPage < topTotalPages) return;
    setCurrentPage(0);
  }, [currentPage, topTotalPages]);

  const paginatedTopData = useMemo(() => {
    if (tableData.length === 0) return [];
    const start = currentPage * ROWS_PER_PAGE;
    return tableData.slice(start, start + ROWS_PER_PAGE);
  }, [tableData, currentPage]);

  const othersTotalPages = useMemo(() => {
    if (othersTableRows.length === 0) return 1;
    return Math.ceil(othersTableRows.length / ROWS_PER_PAGE);
  }, [othersTableRows]);

  useEffect(() => {
    if (othersPage < othersTotalPages) return;
    setOthersPage(0);
  }, [othersPage, othersTotalPages]);

  useEffect(() => {
    setOthersPage(0);
  }, [othersSortMode]);

  const paginatedOthersData = useMemo(() => {
    if (othersTableRows.length === 0) return [];
    const start = othersPage * ROWS_PER_PAGE;
    return othersTableRows.slice(start, start + ROWS_PER_PAGE);
  }, [othersTableRows, othersPage]);

  const activeRows = activeView === 'others' ? paginatedOthersData : paginatedTopData;
  const activePage = activeView === 'others' ? othersPage : currentPage;
  const activeTotalPages = activeView === 'others' ? othersTotalPages : topTotalPages;
  const activeBarDataset = activeView === 'others' ? othersTableRows : tableData;

  // Calculate dynamic height based on data
  const dynamicHeight = useMemo(() => {
    const totalRows = activeView === 'others' ? othersTableRows.length : tableData.length;
    if (totalRows === 0) return 400;
    const baseHeight = 220; // KPI banner + controls/header
    const rowHeight = 70; // Slightly higher to prevent row clipping at larger font sizes
    const rowCount = Math.min(totalRows, ROWS_PER_PAGE);
    const calculatedHeight = baseHeight + (rowCount * rowHeight);
    return Math.max(300, calculatedHeight);
  }, [activeView, othersTableRows.length, tableData.length]);

  // Use provided height if available, otherwise use dynamic height
  const containerHeight = height || dynamicHeight;

  // Calculate KPI values
  const kpiValues = useMemo(() => {
    if (aggregatedByLocation.length === 0) {
      return { total: 0, count: 0, average: 0, topItems: 'N/A', topItemsDisplay: 'N/A' };
    }

    const total = aggregatedByLocation.reduce((sum, item) => sum + item.visits, 0);
    const count = aggregatedByLocation.length;
    const average = count > 0 ? Math.round(total / count) : 0;

    const maxValue = aggregatedByLocation[0]?.visits ?? 0;

    const tiedTopItems = Array.from(
      new Set(
        aggregatedByLocation
          .filter(item => item.visits === maxValue)
          .map(item => item.location),
      ),
    );

    const topItems = tiedTopItems.length > 0 ? tiedTopItems.join(', ') : 'N/A';
    const hasOverflow = tiedTopItems.length > MAX_TOP_ITEMS_IN_TILE;
    const topItemsDisplay = hasOverflow
      ? `${tiedTopItems.slice(0, MAX_TOP_ITEMS_IN_TILE).join(', ')} +${
          tiedTopItems.length - MAX_TOP_ITEMS_IN_TILE
        } more`
      : topItems;

    return { total, count, average, topItems, topItemsDisplay };
  }, [aggregatedByLocation]);

  // Calculate max value for bar chart
  const maxBarValue = useMemo(() => {
    if (activeBarDataset.length === 0 || !valueColumn) return 0;
    return Math.max(...activeBarDataset.map(row => Number(row[valueColumn]) || 0));
  }, [activeBarDataset, valueColumn]);

  useEffect(() => {
    let timeoutId: number;
    const hasData = Boolean(data && data.length > 0);

    if (hasData) {
      timeoutId = window.setTimeout(() => setShowSkeleton(false), 180);
    } else {
      setShowSkeleton(true);
      timeoutId = window.setTimeout(() => setShowSkeleton(false), 1400);
    }

    return () => window.clearTimeout(timeoutId);
  }, [data]);

  if (showSkeleton) {
    return (
      <Container $dynamicHeight={containerHeight} style={{ width: '100%' }}>
        <SkeletonLayout>
          <SkeletonKpiRow>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </SkeletonKpiRow>
          <SkeletonHeaderRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </SkeletonLayout>
      </Container>
    );
  }

  return (
    <Container
      $dynamicHeight={containerHeight}
      style={{ width: '100%' }}
    >
      {/* KPI Banner */}
      <KPIBanner>
        <CompactKPITile bgColor="rgba(13, 148, 136, 0.05)">
          <KPIIcon color="rgba(13, 148, 136, 0.05)" $size={74} $iconSize={34}>
            <FluentPeopleCommunity20Filled />
          </KPIIcon>
          <KPIContent>
            <KPILabel>Total Patients:</KPILabel>
            <KPIValue style={{ marginRight: 12 }}>{kpiValues.total.toLocaleString()}</KPIValue>
          </KPIContent>
        </CompactKPITile>
        
        <CompactKPITile bgColor="rgba(6, 182, 212, 0.05)">
          <KPIIcon color="rgba(6, 182, 212, 0.05)" $size={74} $iconSize={34}>
            <MaterialSymbolsPinDropRounded />
          </KPIIcon>
          <KPIContentLeft>
            <KPILabel>Location(s):</KPILabel>
            <KPIValueLeft>{kpiValues.count}</KPIValueLeft>
          </KPIContentLeft>
        </CompactKPITile>
                
        <TopLocationTile bgColor="rgba(16, 185, 129, 0.05)">
          <KPIIcon color="rgba(16, 185, 129, 0.05)" $size={74} $iconSize={34}>
            <MaterialSymbolsPinDropRounded />
          </KPIIcon>
          <KPIContentLeft>
            <KPILabel>Top Location(s):</KPILabel>
            <TopLocationsValue title={kpiValues.topItems}>
              {kpiValues.topItemsDisplay}
            </TopLocationsValue>
          </KPIContentLeft>
        </TopLocationTile>
      </KPIBanner>

      {/* Content Area */}
      <ContentArea>
        {/* Table Section */}
        <TableSection>
          <SectionHeader>
            {(othersRows.length > 0 || activeTotalPages > 1 || activeView === 'others') && (
              <HeaderControls>
                {activeView === 'top10' && othersRows.length > 0 && (
                  <OthersButton
                    type="button"
                    aria-label={`Show ${othersRows.length} locations in Others`}
                    onClick={() => {
                      setOthersPage(0);
                      setActiveView('others');
                    }}
                  >
                    Others ({othersRows.length})
                  </OthersButton>
                )}
                {activeView === 'others' && (
                  <>
                    <OthersFilterGroup>
                      <OthersFilterLabel htmlFor="others-sort-inline">Sort by</OthersFilterLabel>
                      <OthersFilterSelect
                        id="others-sort-inline"
                        value={othersSortMode}
                        onChange={event =>
                          setOthersSortMode(event.target.value as OthersSortMode)
                        }
                      >
                        <option value="visits_desc">Highest visits</option>
                        <option value="visits_asc">Lowest visits</option>
                        <option value="name_asc">A-Z</option>
                        <option value="name_desc">Z-A</option>
                      </OthersFilterSelect>
                    </OthersFilterGroup>
                    <OthersButton
                      type="button"
                      aria-label="Back to Top 10"
                      title="Back to Top 10"
                      onClick={() => setActiveView('top10')}
                    >
                      Back to Top 10
                    </OthersButton>
                  </>
                )}
                {(activeView === 'others' || activeTotalPages > 1) && (
                  <>
                    <PageMeta>
                      Page {activePage + 1} / {activeTotalPages}
                    </PageMeta>
                    <NavButton
                      type="button"
                      aria-label="Previous page"
                      disabled={activeTotalPages <= 1}
                      onClick={() =>
                        activeView === 'others'
                          ? setOthersPage(prev => (prev - 1 + activeTotalPages) % activeTotalPages)
                          : setCurrentPage(prev => (prev - 1 + activeTotalPages) % activeTotalPages)
                      }
                    >
                      <ChevronLeft size={18} />
                    </NavButton>
                    {activeView === 'top10' && (
                      <NavButton
                        type="button"
                        aria-label={
                          isAutoRotatePaused
                            ? 'Resume auto pagination'
                            : 'Pause auto pagination'
                        }
                        title={
                          isAutoRotatePaused
                            ? 'Resume auto pagination'
                            : 'Pause auto pagination'
                        }
                        onClick={() =>
                          setIsAutoRotatePaused(prevPaused => !prevPaused)
                        }
                      >
                        {isAutoRotatePaused ? (
                          <Play size={18} />
                        ) : (
                          <Pause size={18} />
                        )}
                      </NavButton>
                    )}
                    <NavButton
                      type="button"
                      aria-label="Next page"
                      disabled={activeTotalPages <= 1}
                      onClick={() =>
                        activeView === 'others'
                          ? setOthersPage(prev => (prev + 1) % activeTotalPages)
                          : setCurrentPage(prev => (prev + 1) % activeTotalPages)
                      }
                    >
                      <ChevronRight size={18} />
                    </NavButton>
                  </>
                )}
              </HeaderControls>
            )}
          </SectionHeader>
          <DataTable>
            <Table>
              {columns.length > 0 && (
                <TableHead>
                  <tr>
                    {columns.map((col, index) => (
                      <TableHeader key={index} colIndex={index}>{col}</TableHeader>
                    ))}
                  </tr>
                </TableHead>
              )}
              <TableBody>
                {activeRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colIndex={0}
                      colSpan={Math.max(columns.length, 1)}
                      style={{ textAlign: 'left', whiteSpace: 'normal' }}
                    >
                      <EmptyTableState>
                        {activeView === 'others'
                          ? 'No locations match the selected filters.'
                          : 'No data available'}
                      </EmptyTableState>
                    </TableCell>
                  </TableRow>
                ) : (
                  activeRows.map((row, rowIndex) => {
                    const globalIndex = activePage * ROWS_PER_PAGE + rowIndex;
                    const barWidth = maxBarValue > 0 && valueColumn
                      ? (Number(row[valueColumn]) / maxBarValue) * 100
                      : 0;
                    const color = locationColors[globalIndex % locationColors.length];

                    return (
                      <TableRow key={rowIndex}>
                        {columns.map((col, colIndex) => {
                          const value = row[col];
                          const isNumeric = numericColumns.includes(col);
                          const isLabel = col === labelColumn;
                          const isPercent = col === percentColumn;

                          return (
                            <TableCell key={colIndex} colIndex={colIndex}>
                              {isLabel ? (
                                <LocationCell>
                                  <LocationDot color={color} />
                                  <LocationText>{String(value)}</LocationText>
                                </LocationCell>
                              ) : isNumeric && col === valueColumn ? (
                                <BarCell>
                                  <BarContainer>
                                    <BarFill width={barWidth} color={color} />
                                  </BarContainer>
                                  <BarValue title={Number(value).toLocaleString()}>
                                    {Number(value).toLocaleString()}
                                  </BarValue>
                                </BarCell>
                              ) : isPercent ? (
                                <PercentValue title={`${value}%`}>
                                  {value}%
                                </PercentValue>
                              ) : (
                                String(value)
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTable>
        </TableSection>
      </ContentArea>
    </Container>
  );
}
