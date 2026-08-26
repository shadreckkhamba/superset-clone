import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { FilterOutlined } from '@ant-design/icons';
import { Info, X } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js';
import { ShimmerLoader } from './ShimmerLoader';
import './chart-fixes.css';

ChartJS.register(ArcElement, Tooltip);

interface Entry {
  difference: string;
}

interface PieChartStayProps {
  refreshKey?: number;
  resetKey?: number;
  isDarkMode?: boolean;
  isExpanded?: boolean;
}
export default function StayTimePie({
  refreshKey,
  resetKey,
  isDarkMode = false,
  isExpanded = false,
}: PieChartStayProps): JSX.Element {
  const [percentages, setPercentages] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [mostCommonRange, setMostCommonRange] = useState<string | null>(null);
  const [shortestStay, setShortestStay] = useState<number | null>(null);
  const [longestStay, setLongestStay] = useState<number | null>(null);
  const [totalPatientCount, setTotalPatientCount] = useState<number>(0);

  // Progress bar state
  const [actualPercent, setActualPercent] = useState<number | null>(null);
  const [targetPercent] = useState<number>(100); // 100% when average ≤ 2h

  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Daily");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoPanelReady, setInfoPanelReady] = useState(false);
  const infoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle external refresh requests
  useEffect(() => {
      if (refreshKey !== undefined) {
        setActualPercent(0);
        setHasLoadedOnce(false);
        loadData();
      }
  }, [refreshKey]);

  // Reset to current day on explicit parent trigger
  useEffect(() => {
    if ((resetKey ?? 0) > 0) {
      handleReload();
    }
  }, [resetKey]);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFilterMenu && !target.closest('.filter-menu-container')) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  // Convert "HH:MM:SS" → decimal hours
  const differenceToHours = (diff: string) => {
    const parts = diff.split(":").map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h + m / 60 + s / 3600;
  };

  // Convert decimal hours → "Xh Ym" string
  const formatHours = (hours: number | null) => {
    if (hours === null || isNaN(hours)) return "-";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const ranges = ["< 1 hr", "1-2 hrs", "2-3 hrs", "3-4 hrs", "4-5 hrs", "> 5 hrs"];
  const colors = ["#13c2c2", "#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1"];

// Main data loader
const loadData = async () => {
  setLoading(true);
  const startTime = Date.now();
  
  try {
    const baseUrl = "http://192.168.10.118:5001/wandikweza/stay_times_distribution";
    const periodParam = selectedPeriod.toLowerCase();
    const mappedPeriod =
      periodParam === "daily"
        ? "day"
        : periodParam === "weekly"
        ? "week"
        : periodParam === "monthly"
        ? "month"
        : "day";

    const resp = await fetch(`${baseUrl}?period=${mappedPeriod}`);
    const data = await resp.json();
    const entries: Entry[] = data.entries || [];

    const counts = [0, 0, 0, 0, 0, 0]; // 6 buckets
    const hoursList: number[] = [];

    entries.forEach((e) => {
      const hrs = differenceToHours(e.difference);
      hoursList.push(hrs);

      if (hrs < 1) counts[0]++;           // < 1 hr
      else if (hrs >= 1 && hrs < 2) counts[1]++;  // 1-2 hrs
      else if (hrs >= 2 && hrs < 3) counts[2]++;  // 2-3 hrs
      else if (hrs >= 3 && hrs < 4) counts[3]++;  // 3-4 hrs
      else if (hrs >= 4 && hrs < 5) counts[4]++;  // 4-5 hrs
      else counts[5]++;                    // >= 5 hrs
    });

    // Log for debugging
    console.log(`=== ${selectedPeriod} Analysis ===`);
    console.log(`Total entries from API: ${entries.length}`);
    console.log(`Distribution:`, {
      '< 1 hr': counts[0],
      '1-2 hrs': counts[1],
      '2-3 hrs': counts[2],
      '3-4 hrs': counts[3],
      '4-5 hrs': counts[4],
      '>= 5 hrs': counts[5]
    });
    console.log(`Sum of counts: ${counts.reduce((a, b) => a + b, 0)}`);

    const total = counts.reduce((a, b) => a + b, 0);
    const percents = counts
      .map((c) => (total ? (c / total) * 100 : 0))
      .map((v) => Number(v.toFixed(2)));

    // Verify data integrity
    if (total !== entries.length) {
      console.warn(`DATA MISMATCH: Counted ${total} but API returned ${entries.length} entries!`);
    }

    const mostCommon =
      total > 0 ? ranges[counts.indexOf(Math.max(...counts))] : null;

    const avgStay = hoursList.length
      ? hoursList.reduce((a, b) => a + b, 0) / hoursList.length
      : null;

    const progressPercent = avgStay
      ? Math.min((1 / avgStay) * targetPercent, targetPercent)
      : null;

    setPercentages(percents);
    setMostCommonRange(mostCommon);
    setShortestStay(data.shortest_stay || null);
    setLongestStay(data.longest_stay || null);
    setTotalPatientCount(entries.length);
    setActualPercent(progressPercent);
    setLastUpdate(new Date());
  } catch (err) {
    console.error("Error fetching stay time data", err);
  } finally {
    // Ensure shimmer shows for at least 800ms
    const elapsedTime = Date.now() - startTime;
    const minDisplayTime = 2000;
    const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
    
    setTimeout(() => {
      setLoading(false);
      setHasLoadedOnce(true);
    }, remainingTime);
  }
};

// Auto refresh every 60s - only when viewing Daily period
useEffect(() => {
  // Clear focused slice when period changes so new period always shows labels
  setSelectedSliceIndex(null);
  // Reset progress bar immediately when period changes
  setActualPercent(null);
  setAnimatedPercent(0);
  loadData();
  
  // Only auto-refresh if viewing Daily period
  if (selectedPeriod === "Daily") {
    const intervalId = setInterval(loadData, 60000);
    return () => clearInterval(intervalId);
  }
}, [selectedPeriod]);

// If the focused slice disappears in a new dataset, fall back to all slices
useEffect(() => {
  if (selectedSliceIndex === null) return;
  const selectedValue = percentages[selectedSliceIndex] ?? 0;
  if (selectedValue <= 0) {
    setSelectedSliceIndex(null);
  }
}, [percentages, selectedSliceIndex]);


  // Helper to convert the range into < or >
  const formatStayRange = (range: string) => {
    if (!range) return null;

    if (range.includes('< 1')) return 'less than 1 hour';
    if (range.includes('1-2')) return 'less than 2 hours';
    if (range.includes('2-3')) return 'less than 3 hours';
    if (range.includes('3-4')) return 'more than 3 hours';
    if (range.includes('4-5')) return 'more than 4 hours';
    if (range.includes('> 5')) return 'more than 5 hours';

    return range; // fallback
  };

  // Animate actualPercent whenever it updates
  useEffect(() => {
    if (actualPercent === null) {
      // If actualPercent is null (no data), animate down to 0
      const currentValue = animatedPercent;
      if (currentValue === 0) return; // Already at 0
      
      let start = currentValue;
      const duration = 600; // ms
      const stepTime = 20;
      const steps = duration / stepTime;
      const decrement = currentValue / steps;

      const timer = setInterval(() => {
        start -= decrement;
        if (start <= 0) {
          start = 0;
          clearInterval(timer);
        }
        setAnimatedPercent(start);
      }, stepTime);

      return () => clearInterval(timer);
    }

    // Animate from current value to new actualPercent
    const startValue = animatedPercent;
    const endValue = actualPercent;
    const duration = 1200; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = (endValue - startValue) / steps;

    let current = startValue;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= endValue) || (increment < 0 && current <= endValue)) {
        current = endValue;
        clearInterval(timer);
      }
      setAnimatedPercent(current);
    }, stepTime);

    return () => clearInterval(timer);
  }, [actualPercent]);

  useEffect(() => {
    if (showInfoModal) {
      if (infoCloseTimeoutRef.current) {
        clearTimeout(infoCloseTimeoutRef.current);
        infoCloseTimeoutRef.current = null;
      }
      setInfoPanelReady(false);
      const rafId = requestAnimationFrame(() => setInfoPanelReady(true));
      return () => cancelAnimationFrame(rafId);
    }

    setInfoPanelReady(false);
    return undefined;
  }, [showInfoModal]);

  useEffect(
    () => () => {
      if (infoCloseTimeoutRef.current) {
        clearTimeout(infoCloseTimeoutRef.current);
      }
    },
    [],
  );


  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    const validPercentages =
      percentages.length === ranges.length ? percentages : Array(ranges.length).fill(0);
    const hasSelection = selectedSliceIndex !== null;

    return {
      labels: ranges,
      datasets: [
        {
          data: validPercentages,   // raw percentages
          backgroundColor: colors.map((color, idx) => 
            !hasSelection || selectedSliceIndex === idx
              ? color 
              : isDarkMode
              ? 'rgba(120, 128, 140, 0.20)'
              : 'rgba(160, 170, 185, 0.28)'
          ),
          borderWidth: colors.map((_, idx) => (!hasSelection || selectedSliceIndex === idx ? 3 : 1.5)),
          borderColor: colors.map((_, idx) =>
            !hasSelection || selectedSliceIndex === idx
              ? '#fff'
              : isDarkMode
              ? 'rgba(90, 95, 105, 0.35)'
              : 'rgba(130, 140, 160, 0.35)',
          ),
        },
      ],
    };
  }, [percentages, selectedSliceIndex, isDarkMode]);
 
  // Memoize chart options
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio || 2,
    cutout: '50%',
    layout: {
      padding: {
        top: 60,
        bottom: 60,
        left: 80,
        right: 80,
      },
    },
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 1000,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDarkMode ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDarkMode ? "#e0e0e0" : "#000",
        bodyColor: isDarkMode ? "#e0e0e0" : "#000",
        borderColor: isDarkMode ? "#404040" : "#ddd",
        borderWidth: 2,
        padding: 22,
        displayColors: false,
        cornerRadius: 12,
        titleFont: {
          size: 24,
          weight: "bold" as const,
          family: "sans-serif",
        },
        bodyFont: {
          size: 22,
          weight: "bold" as const,
          family: "sans-serif",
        },
        callbacks: {
          title: (context: any[]) => {
            const label = context?.[0]?.label ?? "";
            return `Stay Time Range: ${label}`;
          },
          label: (context: any) => {
            const actualValue = percentages[context.dataIndex] || 0;
            return `Percentage: ${actualValue.toFixed(1)}%`;
          },
        },
      } as const,
    },
  }), [percentages, isDarkMode]);

  // Custom plugin for callout labels
  const calloutLabelsPlugin = useMemo(() => ({
    id: 'calloutLabels',
    afterDraw: (chart: any) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      const datasetValuesRaw = chart?.data?.datasets?.[0]?.data ?? [];
      const datasetValues = Array.isArray(datasetValuesRaw)
        ? datasetValuesRaw.map((v: unknown) => Number(v) || 0)
        : [];
      if (!datasetValues.length || datasetValues.every((v: number) => v <= 0)) return;

      const { left, right, top, bottom } = chartArea;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      const chartWidth = right - left;
      const chartHeight = bottom - top;
      const canvasWidth = chart.width;
      const canvasHeight = chart.height;

      ctx.save();

      try {
        const meta = chart.getDatasetMeta(0);
        if (!meta?.data) return;

        const chartRadius = Math.min(chartWidth, chartHeight) / 2;
        const sliceOuterRadius = chartRadius * 0.85;
        const selectedIdx = selectedSliceIndex;

        // Make responsive based on chart size with better min/max bounds
        const outerOffset = Math.min(Math.max(18, chartRadius * 0.08), 28);   // 18-28px range
        const bendDistance = Math.min(Math.max(35, chartRadius * 0.15), 50);  // 35-50px range (reduced max)

        meta.data.forEach((arc: any, index: number) => {
          const value = datasetValues[index] || 0;
          if (value <= 0) return;
          if (selectedIdx !== null && selectedIdx !== index) return;

          const angle = (arc.startAngle + arc.endAngle) / 2;
          const cosAngle = Math.cos(angle);
          const sinAngle = Math.sin(angle);

          const lineStartX = centerX + cosAngle * (sliceOuterRadius + 5);
          const lineStartY = centerY + sinAngle * (sliceOuterRadius + 5);

          const midX = centerX + cosAngle * (sliceOuterRadius + outerOffset);
          const midY = centerY + sinAngle * (sliceOuterRadius + outerOffset);

          // Reduce bend distance on left side to prevent cutoff
          const adjustedBendDistance = cosAngle < 0 ? bendDistance * 0.8 : bendDistance;
          const bendX = midX + (cosAngle >= 0 ? adjustedBendDistance : -adjustedBendDistance);
          const bendY = midY;
          const clampedBendX = Math.min(canvasWidth - 10, Math.max(10, bendX));
          const clampedBendY = Math.min(canvasHeight - 10, Math.max(10, bendY));

          const connectorColor = isDarkMode ? '#bfc7d2' : '#333';
          const labelColor = isDarkMode ? '#ffffff' : '#000';

          // Draw connector line
          ctx.beginPath();
          ctx.moveTo(lineStartX, lineStartY);
          ctx.lineTo(midX, midY);
          ctx.lineTo(clampedBendX, clampedBendY);
          ctx.strokeStyle = connectorColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Label text - keep readable but avoid clipping on smaller/denser views
          const text = `${value.toFixed(1)}%`;
          const fontSize = Math.min(Math.max(16, chartRadius * 0.08), 26);
          ctx.font = `bold ${fontSize}px sans-serif`;
          
          ctx.fillStyle = labelColor;
          
          const textWidth = ctx.measureText(text).width;
          let textX = clampedBendX + (cosAngle >= 0 ? 8 : -8);
          if (cosAngle >= 0) {
            ctx.textAlign = 'left';
            textX = Math.min(canvasWidth - 10 - textWidth, Math.max(10, textX));
          } else {
            ctx.textAlign = 'right';
            textX = Math.max(10 + textWidth, Math.min(canvasWidth - 10, textX));
          }
          ctx.textBaseline = 'middle';
          const textY = Math.min(canvasHeight - 12, Math.max(12, clampedBendY));
          
          // Draw label
          ctx.fillText(text, textX, textY);
        });
      } catch (error) {
        console.error('Error in calloutLabels plugin:', error);
      } finally {
        ctx.restore();
      }
    },
  }), [selectedSliceIndex, isDarkMode]);

  // Reload handler
  const handleReload = async () => {
    setActualPercent(0);
    if (selectedPeriod !== 'Daily') {
      setSelectedPeriod('Daily');
      return;
    }
    await loadData();
  };

  const openInfoModal = () => {
    if (infoCloseTimeoutRef.current) {
      clearTimeout(infoCloseTimeoutRef.current);
      infoCloseTimeoutRef.current = null;
    }
    setShowInfoModal(true);
  };

  const closeInfoModal = () => {
    setInfoPanelReady(false);
    infoCloseTimeoutRef.current = setTimeout(() => {
      setShowInfoModal(false);
      infoCloseTimeoutRef.current = null;
    }, 360);
  };

  const expandedContentMinHeight = 'clamp(430px, 48vh, 540px)';
  const wrapperPadding = isExpanded ? '12px 14px' : '40px 35px';
  const infoBoxPadding = isExpanded ? '14px' : '25px';
  const infoBoxMinWidth = isExpanded ? '320px' : '380px';
  const infoBoxMaxWidth = isExpanded ? '430px' : '480px';
  const topHeaderMarginBottom = isExpanded ? 'clamp(6px, 0.8vh, 12px)' : '20px';
  const headerLabelFontSize = isExpanded ? 'clamp(15px, 1.1vw, 20px)' : '24px';
  const headerTitleFontSize = isExpanded ? 'clamp(20px, 1.5vw, 30px)' : '28px';
  const totalPatientsMarginTop = isExpanded ? 'clamp(10px, 1.3vh, 20px)' : '30px';
  const totalPatientsFontSize = isExpanded ? 'clamp(14px, 1.02vw, 19px)' : '22px';
  const totalPatientsValueFontSize = isExpanded ? 'clamp(18px, 1.35vw, 26px)' : '26px';
  const filterLabelFontSize = isExpanded ? 'clamp(12px, 0.9vw, 16px)' : '18px';
  const filterIconFontSize = isExpanded ? 'clamp(18px, 1.25vw, 24px)' : '28px';
  const filterDotSize = isExpanded ? '10px' : '12px';
  const mostCommonFontSize = isExpanded ? 'clamp(14px, 1vw, 18px)' : '22px';
  const mostCommonPadding = isExpanded ? '5px 8px' : '6px 10px';
  const mostCommonMarginBottom = isExpanded ? 'clamp(8px, 1vh, 14px)' : '20px';
  const progressSectionMarginTop = isExpanded ? 'clamp(4px, 0.7vh, 10px)' : '0px';
  const progressSectionMarginBottom = isExpanded ? 'clamp(8px, 1vh, 14px)' : '20px';
  const progressLabelsFontSize = isExpanded ? 'clamp(13px, 0.96vw, 17px)' : '20px';
  const progressLabelsMarginBottom = isExpanded ? 'clamp(4px, 0.55vh, 7px)' : '8px';
  const progressBarHeight = isExpanded ? 'clamp(14px, 1.5vh, 20px)' : '24px';
  const statValueFontSize = isExpanded ? 'clamp(18px, 1.4vw, 26px)' : '26px';
  const statLabelFontSize = isExpanded ? 'clamp(12px, 0.92vw, 16px)' : '18px';
  const filterMenuOptionFontSize = isExpanded ? 'clamp(14px, 1.02vw, 18px)' : '22px';
  const infoBoxContentGap = isExpanded ? 'clamp(8px, 1vh, 14px)' : '16px';
  const legendGap = isExpanded ? '8px' : '10px';
  const legendMinWidth = isExpanded ? '130px' : '150px';
  const legendMaxWidth = isExpanded ? '190px' : '220px';
  const legendMarginTop = isExpanded ? '8px' : '80px';
  const legendPadding = isExpanded ? '14px' : '20px';
  const legendTitleFontSize = isExpanded ? '18px' : '22px';
  const legendTitleMarginBottom = isExpanded ? '4px' : '8px';
  const legendTitlePaddingBottom = isExpanded ? '8px' : '12px';
  const legendItemPadding = isExpanded ? '7px 9px' : '10px 12px';
  const legendItemRadius = isExpanded ? '8px' : '10px';
  const legendItemLabelGap = isExpanded ? '8px' : '10px';
  const legendDotSize = isExpanded ? '10px' : '12px';
  const legendLabelFontSize = isExpanded ? '16px' : '20px';
  
  return (
    <div
      className="responsive-chart-wrapper"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: isExpanded ? 'none' : '800px',
        minHeight: isExpanded ? expandedContentMinHeight : '600px',
        padding: wrapperPadding,
        borderRadius: '16px',
        boxShadow: isDarkMode 
          ? '0 4px 12px rgba(0,0,0,0.4)' 
          : '0 4px 12px rgba(0,0,0,0.12)',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        backgroundColor: isDarkMode ? '#2d2d2d' : '#f8f9fa',
        overflow: 'visible',
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <button
        type="button"
        aria-label="What am I seeing?"
        onClick={openInfoModal}
        style={{
          position: 'absolute',
          top: '0px',
          right: '2px',
          width: '32px',
          height: '32px',
          borderRadius: '999px',
          border: 'none',
          background: 'transparent',
          color: isDarkMode ? '#d9d9d9' : '#595959',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 12,
          transition: 'transform 0.2s ease, color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.color = '#1890ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.color = isDarkMode ? '#d9d9d9' : '#595959';
        }}
      >
        <Info size={20} strokeWidth={2.2} />
      </button>

      <div style={{ 
        display: 'flex', 
        alignItems: isExpanded ? 'stretch' : 'center', 
        gap: isExpanded ? '14px' : '20px', 
        width: '100%',
        height: '100%',
        flex: 1,
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        minHeight: isExpanded ? expandedContentMinHeight : '520px',
        maxHeight: isExpanded ? 'none' : '640px',
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Left - Info Box */}
        <div
          style={{
            padding: infoBoxPadding,
            borderRadius: '12px',
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
            boxShadow: isDarkMode 
              ? '0 4px 12px rgba(0,0,0,0.4)' 
              : '0 4px 12px rgba(0,0,0,0.12)',
            border: isDarkMode ? '1px solid #404040' : '1px solid #e0e0e0',
            flex: '1 1 0',
            minWidth: infoBoxMinWidth,
            maxWidth: infoBoxMaxWidth,
            alignSelf: isExpanded ? 'stretch' : 'auto',
            height: isExpanded ? 'auto' : '60vh',
            minHeight: isExpanded ? '100%' : 'auto',
            maxHeight: isExpanded ? 'none' : '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: infoBoxContentGap,
            marginTop: '0',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
          }}
        >
          {/* Top Header with Title + Menu */}
          <div style={{ marginBottom: topHeaderMarginBottom, position: 'relative' }}>
            <div style={{ fontSize: headerLabelFontSize, color: isDarkMode ? '#b0b0b0' : '#666', fontWeight: 600, transition: 'color 0.3s ease' }}>
              Performance
            </div>
            <div style={{ marginBottom: isExpanded ? 'clamp(8px, 0.9vh, 14px)' : '15px', fontSize: headerTitleFontSize, color: isDarkMode ? '#e0e0e0' : '#333', fontWeight: 700, transition: 'color 0.3s ease' }}>
              Indicators
            </div>
            <div style={{marginTop: totalPatientsMarginTop, position: 'relative'}}>
              <div style={{ fontSize: totalPatientsFontSize, color: isDarkMode ? '#a0a0a0' : '#888', fontWeight: 500, transition: 'color 0.3s ease' }}>
                Total Patients Counted: <span style={{ fontWeight: 600, fontSize: totalPatientsValueFontSize, color: '#1890ff' }}>{totalPatientCount}</span>
              </div>
            </div>

            {/* Filter Icon Button */}
            <div
              className="filter-menu-container"
              style={{ position: "absolute", right: 0, top: 0, display: "flex", alignItems: "center", gap: isExpanded ? "8px" : "12px" }}
            >
              <span
                style={{
                  fontSize: filterLabelFontSize,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  color: isDarkMode ? "#c6d6ea" : "#4f6b88",
                  lineHeight: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    width: filterDotSize,
                    height: filterDotSize,
                    borderRadius: "50%",
                    background: "#1890ff",
                    opacity: 0.92,
                  }}
                />
                {selectedPeriod}
              </span>
              <div
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                style={{
                  fontSize: filterIconFontSize,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  color: "#1890ff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.15)";
                  e.currentTarget.style.color = "#40a9ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.color = "#1890ff";
                }}
              >
                <FilterOutlined />
              </div>

            {/* Custom Filter Menu */}
            {showFilterMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: isExpanded ? "38px" : "45px",
                  background: "white",
                  borderRadius: isExpanded ? "12px" : "16px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
                  overflow: "hidden",
                  zIndex: 1000,
                  minWidth: isExpanded ? "170px" : "200px",
                  border: "1px solid #e8e8e8",
                }}
              >
                {['Daily', 'Weekly', 'Monthly'].map((period, idx) => (
                  <div
                    key={period}
                    onClick={() => {
                      setSelectedSliceIndex(null);
                      setSelectedPeriod(period);
                      setShowFilterMenu(false);
                    }}
                    style={{
                      padding: isExpanded ? "12px 16px" : "16px 24px",
                      fontSize: filterMenuOptionFontSize,
                      fontWeight: 600,
                      color: selectedPeriod === period ? "#1890ff" : "#333",
                      background: "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      borderBottom: idx < 2 ? "1px solid #f0f0f0" : "none",
                      borderTop: selectedPeriod === period ? "3px solid #1890ff" : "3px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== period) {
                        e.currentTarget.style.background = "#f5f5f5";
                        e.currentTarget.style.paddingLeft = "28px";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== period) {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.paddingLeft = "24px";
                      }
                    }}
                  >
                    <span>{period}</span>
                    {selectedPeriod === period && (
                      <span style={{ fontSize: isExpanded ? "15px" : "18px", color: "#1890ff" }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

        {/* Most common range */}
        <div
          style={{
            fontSize: mostCommonFontSize,
            color: '#52c41a',
            fontWeight: 700,
            marginBottom: mostCommonMarginBottom,
            padding: mostCommonPadding,
            backgroundColor: isDarkMode ? 'rgba(82, 196, 26, 0.15)' : '#f6ffed',
            borderRadius: '6px',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'background-color 0.3s ease',
          }}
        >
          {mostCommonRange
            ? `Most patients ${
                selectedPeriod === 'Daily'
                  ? 'today'
                  : selectedPeriod === 'Weekly'
                  ? 'this week'
                  : 'this month'
              } stayed ${formatStayRange(mostCommonRange)}`
            : 'No data yet'}
        </div>

        {/* Progress Bar with Target */}
        {animatedPercent !== null && targetPercent !== null && (
          <div style={{ marginTop: progressSectionMarginTop, marginBottom: progressSectionMarginBottom, width: '100%' }}>
            {/* Labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: progressLabelsMarginBottom,
                fontSize: progressLabelsFontSize,
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#1890ff' }}>
                Actual: {animatedPercent.toFixed(1)}%
              </span>
              <span style={{ color: '#666' }}>
                Target: {targetPercent.toFixed(1)}%
              </span>
            </div>

            {/* Bar */}
            <div
              style={{
                position: 'relative',
                height: progressBarHeight,
                borderRadius: '12px',
                background: '#e0e0e0',
                overflow: 'hidden',
              }}
            >
              {/* Gradient Fill */}
              <div
                style={{
                  width: `${Math.min(animatedPercent, 100)}%`,
                  height: '100%',
                  background: `linear-gradient(to right, #f5222d, #faad14, #52c41a)`,
                  borderRadius:
                    animatedPercent >= 100 ? '12px' : '12px 0 0 12px',
                  transition: 'width 0.5s ease, background 0.5s ease',
                }}
              />

              {/* Target marker */}
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.min(targetPercent, 99.5)}%`,
                  top: 0,
                  bottom: 0,
                  width: isExpanded ? '3px' : '5px',
                  background: '#f5222d',
                  borderRadius: '2px',
                }}
              />
            </div>

          </div>
        )}

          {/* Shortest & Longest */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: statValueFontSize,
                  fontWeight: 700,
                  color: '#1890ff',
                }}
              >
                {formatHours(shortestStay)}
              </div>
              <div style={{ fontSize: statLabelFontSize, color: isDarkMode ? '#a0a0a0' : '#666', transition: 'color 0.3s ease' }}>Shortest Stay</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: statValueFontSize,
                  fontWeight: 600,
                  color: '#999',
                }}
              >
                {formatHours(longestStay)}
              </div>
              <div style={{ fontSize: statLabelFontSize, color: isDarkMode ? '#a0a0a0' : '#666', transition: 'color 0.3s ease' }}>Longest Stay</div>
            </div>
          </div>
        </div>

          {/* Center - Pie Chart */}
          <div 
            className="chart-container"
            style={{
              flex: 1,
              minWidth: '500px',
              maxWidth: '800px',
              height: '100%',
              maxHeight: isExpanded ? 'none' : '700px',
              position: 'relative',
              overflow: 'visible',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 10px',
              padding: '10px'
            }}
          >
            <Doughnut
              key={`pie-${selectedPeriod}-${isDarkMode ? 'dark' : 'light'}-${selectedSliceIndex ?? 'all'}`}
              data={chartData}
              options={options}
              plugins={[calloutLabelsPlugin]}
            />
          </div>

        {/* Right - Legend */}
        <div style={{ 
          flex: '0 0 auto',
          alignSelf: 'flex-start',
          paddingTop: isExpanded ? '40px' : '50px',
        }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: legendGap,
          minWidth: legendMinWidth,
          maxWidth: legendMaxWidth,
          marginTop: legendMarginTop,
          padding: legendPadding,
          backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
          borderRadius: isExpanded ? '12px' : '16px',
          boxShadow: isDarkMode 
            ? '0 4px 16px rgba(0,0,0,0.4)' 
            : '0 4px 16px rgba(0,0,0,0.08)',
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        }}>
          <div style={{
            fontSize: legendTitleFontSize,
            fontWeight: 700,
            color: isDarkMode ? '#e0e0e0' : '#333',
            marginBottom: legendTitleMarginBottom,
            paddingBottom: legendTitlePaddingBottom,
            borderBottom: isDarkMode ? '2px solid #404040' : '2px solid #f0f0f0',
            textAlign: 'center',
            transition: 'color 0.3s ease, border-color 0.3s ease',
          }}>
          Ranges
          </div>
          
          {ranges.map((label, idx) => {
            const percentage = percentages[idx] ?? 0;
            const isVisible = percentage > 0;
            const isSelected = selectedSliceIndex === idx;
            const isHighlighted = selectedSliceIndex === null || isSelected;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (isVisible) {
                    setSelectedSliceIndex(selectedSliceIndex === idx ? null : idx);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: legendItemPadding,
                  borderRadius: legendItemRadius,
                  backgroundColor: isSelected 
                    ? `${colors[idx]}25` 
                    : isVisible 
                      ? isDarkMode ? `${colors[idx]}15` : `${colors[idx]}08` 
                      : isDarkMode ? '#2d2d2d' : '#fafafa',
                  border: `2px solid ${isSelected 
                    ? colors[idx] 
                    : isVisible 
                      ? `${colors[idx]}30` 
                      : isDarkMode ? '#404040' : '#f0f0f0'}`,
                  opacity: isHighlighted ? 1 : isDarkMode ? 0.22 : 0.35,
                  transition: 'all 0.2s ease',
                  cursor: isVisible ? 'pointer' : 'default',
                  transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
                }}
                onMouseEnter={(e) => {
                  if (isVisible) {
                    e.currentTarget.style.backgroundColor = isSelected ? `${colors[idx]}30` : `${colors[idx]}15`;
                    e.currentTarget.style.borderColor = `${colors[idx]}60`;
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (isVisible) {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? `${colors[idx]}25`
                      : isDarkMode
                      ? `${colors[idx]}15`
                      : `${colors[idx]}08`;
                    e.currentTarget.style.borderColor = isSelected ? colors[idx] : `${colors[idx]}30`;
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }
                }}
              >
                {/* Left side - color dot + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: legendItemLabelGap, flex: 1 }}>
                  <div
                    style={{
                      width: legendDotSize,
                      height: legendDotSize,
                      borderRadius: '50%',
                      backgroundColor: colors[idx],
                      boxShadow: `0 0 0 3px ${colors[idx]}20`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ 
                    fontSize: legendLabelFontSize, 
                    fontWeight: 600, 
                    color: isDarkMode ? '#e0e0e0' : '#333',
                    transition: 'color 0.3s ease',
                  }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Last updated */}
          {}
      </div>

      {loading && !hasLoadedOnce && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: isDarkMode ? '#2d2d2d' : '#f8f9fa',
          }}
        >
          <ShimmerLoader type="pie" isDarkMode={isDarkMode} />
        </div>
      )}

      {showInfoModal && (
        <div
          role="presentation"
          onClick={closeInfoModal}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            background: infoPanelReady
              ? isDarkMode
                ? 'rgba(6, 10, 16, 0.62)'
                : 'rgba(15, 23, 42, 0.34)'
              : 'rgba(0, 0, 0, 0)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            padding: '8px 8px 14px',
            transition: 'background-color 280ms cubic-bezier(0.2, 0.9, 0.2, 1)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chart explanation"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'clamp(320px, 90vw, 500px)',
              maxWidth: 'calc(100% - 20px)',
              borderRadius: '16px',
              background: isDarkMode
                ? 'rgba(30, 35, 42, 0.92)'
                : '#ffffff',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(24,144,255,0.14)',
              boxShadow: isDarkMode
                ? '0 28px 58px rgba(0, 0, 0, 0.56)'
                : '0 24px 52px rgba(24, 144, 255, 0.24)',
              color: isDarkMode ? '#f0f0f0' : '#1f2937',
              overflow: 'hidden',
              transformOrigin: 'top right',
              transform: infoPanelReady ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.38)',
              opacity: infoPanelReady ? 1 : 0,
              transition:
                'transform 360ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 280ms cubic-bezier(0.2, 0.9, 0.2, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'clamp(12px, 3vw, 18px) clamp(14px, 3vw, 20px) clamp(10px, 2.5vw, 14px)',
                borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 2vw, 10px)' }}>
                <div
                  style={{
                    width: 'clamp(28px, 6vw, 32px)',
                    height: 'clamp(28px, 6vw, 32px)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                    color: '#fff',
                  }}
                >
                  <Info size={18} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)', letterSpacing: '0.01em' }}>How To Read This Chart</div>
              </div>
              <button
                type="button"
                onClick={closeInfoModal}
                aria-label="Close explanation"
                style={{
                  width: 'clamp(28px, 6vw, 32px)',
                  height: 'clamp(28px, 6vw, 32px)',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: isDarkMode ? '#d9d9d9' : '#595959',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 'clamp(12px, 2.8vw, 16px)', display: 'grid', gap: 'clamp(10px, 2.5vw, 14px)' }}>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Pie slices (distribution)</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Each slice shows what percentage of patients fall into a stay-time range.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Ranges list (right side)</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Click a range in the right panel to focus on that one range in the pie chart.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Time filter</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Use the filter menu to switch between daily, weekly, and monthly views.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Progress bar</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Shows how close current performance is to the target for shorter stays.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
