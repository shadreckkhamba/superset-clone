import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  Plugin,
  Filler,
} from 'chart.js';
import { ChartOptions, TooltipItem, FontSpec } from 'chart.js';
import { TrendingUp, TrendingDown, Info, X } from 'lucide-react';
import { ShimmerLoader } from './ShimmerLoader';
import { ENDPOINTS } from '../../config/endpoints';
import './chart-fixes.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// CSS for responsive dashboard view switch
const responsiveSwitchStyles = `
  /* Responsive dashboard view switch */
  [data-test="dashboard-view-switch"] {
    padding: clamp(10px, 2.5vw, 14px) clamp(14px, 3.5vw, 20px) !important;
    gap: clamp(8px, 2vw, 12px) !important;
    margin-left: clamp(20px, 4vw, 45px) !important;
    border-width: clamp(1px, 0.2vw, 2px) !important;
    box-shadow: rgba(15, 23, 42, 0.15) 0px clamp(6px, 1.5vw, 12px) clamp(20px, 5vw, 40px), 
                rgba(15, 23, 42, 0.1) 0px clamp(2px, 0.5vw, 4px) clamp(6px, 1.5vw, 12px) !important;
  }
  
  [data-test="dashboard-view-switch"] > div {
    gap: clamp(8px, 2vw, 12px) !important;
  }
  
  [data-test="dashboard-view-switch"] span {
    font-size: clamp(12px, 2.5vw, 14px) !important;
  }
  
  [data-test="dashboard-view-switch"] .antd5-switch {
    transform: scale(clamp(0.9, 0.2vw + 0.9, 1.15)) !important;
  }
  
  /* Responsive adjustments for very small screens */
  @media (max-width: 480px) {
    [data-test="dashboard-view-switch"] {
      top: clamp(24px, 6vw, 32px) !important;
      padding: 8px 12px !important;
      gap: 6px !important;
      margin-left: 20px !important;
    }
    
    [data-test="dashboard-view-switch"] span {
      font-size: 11px !important;
    }
    
    [data-test="dashboard-view-switch"] .antd5-switch {
      transform: scale(0.85) !important;
    }
  }
  
  /* Responsive adjustments for medium screens */
  @media (min-width: 481px) and (max-width: 768px) {
    [data-test="dashboard-view-switch"] {
      padding: 10px 16px !important;
      gap: 8px !important;
      margin-left: 30px !important;
    }
    
    [data-test="dashboard-view-switch"] span {
      font-size: 12px !important;
    }
    
    [data-test="dashboard-view-switch"] .antd5-switch {
      transform: scale(0.95) !important;
    }
  }
`;

// Inject the responsive switch styles
if (typeof document !== 'undefined') {
  const styleId = 'responsive-dashboard-switch-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = responsiveSwitchStyles;
    document.head.appendChild(style);
  }
}

interface TodayData {
  avg_stay_hours: number;
  date: string;
  percent_change: number;
  recent_avg: number;
  patient_count?: number;
}

interface TrendItem {
  avg_hours: number;
  day: string;
  percent_change_vs_today?: number; // in case some items are missing
  rolling_count?: number;
}

interface StayApiResponse {
  today?: TodayData;
  trend?: TrendItem[];
  rolling_avg?: { time_label: string; avg_hours: number }[];
  stay_distribution?: Record<string, { hours: number; count: number }[]>;
}
interface BigNumberStayProps {
  refreshKey?: number;
  resetKey?: number;
  isDarkMode?: boolean;
  isExpanded?: boolean;
}
type TrendDay = { day: string; avg_hours: number };
// Synchronous fetch
async function fetchStayTimes(): Promise<StayApiResponse | null> {
  try {
    const resp = await fetch(ENDPOINTS.DAILY_AVERAGE_STAY);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data as StayApiResponse;
  } catch (err) {
    console.error("Fetch failed:", err);
    return null;
  }
}

export default function BigNumberStay({
  refreshKey,
  resetKey,
  isDarkMode = false,
  isExpanded = false,
}: BigNumberStayProps): JSX.Element {
  const [bigNumber, setBigNumber] = useState<number | null>(null);
  const [animatedNumber, setAnimatedNumber] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData<'line', number[], string>>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(false);
  const [percentChange, setPercentChange] = useState<number>(0);
  const [lastRecordedAverage, setLastRecordedAverage] = useState<number>(0);
  const [hasComparisonData, setHasComparisonData] = useState<boolean>(true);
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  //const [isToday, setIsToday] = useState(false);
  const [stayData, setStayData] = useState<StayApiResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedIsToday, setSelectedIsToday] = useState(true);
  const [updateTrigger, setUpdateTrigger] = useState<number>(0); // Add trigger for forced updates
  const [trendDays, setTrendDays] = useState<TrendDay[]>([]);
  const [stayDistributionByDay, setStayDistributionByDay] = useState<Record<string, { hours: number; count: number }[]>>({});
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; content: string } | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoPanelReady, setInfoPanelReady] = useState(false);
  const infoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle external refresh requests
  useEffect(() => {
    if (refreshKey !== undefined) {
      handleReload();
    }
  }, [refreshKey]);

  // Reset to current day on explicit parent trigger
  useEffect(() => {
    if ((resetKey ?? 0) > 0) {
      handleReload();
    }
  }, [resetKey]);

  const [selectedDayKey, setSelectedDayKey] = useState<string>('');
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapMounted, setHeatmapMounted] = useState(false);

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const parseApiDay = (day: string) => new Date(`${day}T00:00:00Z`);

  const formatDayLabel = (day: string) =>
    parseApiDay(day).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });

  const buildLocalWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        day: toDateKey(d),
        avg_hours: 0,
      };
    });
  };

  // For weekday scroller
  const daysRef = useRef<HTMLDivElement | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  useEffect(() => {
    const el = daysRef.current;
    if (!el) return;

    const updateArrows = () => {
      setShowLeftArrow(el.scrollLeft > 6);
      setShowRightArrow(el.scrollWidth - el.clientWidth - el.scrollLeft > 6);
    };

    updateArrows();

    el.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);

    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
      ro.disconnect();
    };
  }, []);

useEffect(() => {
  if (bigNumber === null) return;

  // If target is 0, set immediately without animation
  if (bigNumber === 0) {
    setAnimatedNumber(0);
    return;
  }

  // Always animate from 0 to target for consistent animation
  let start = 0;
  const end = bigNumber;
  const duration = 800;
  const stepTime = 16;
  const increment = end / (duration / stepTime);

  // If the target is very small, just set it immediately
  if (Math.abs(end) < 0.01) {
    setAnimatedNumber(end);
    return;
  }

  const interval = setInterval(() => {
    start += increment;
    if (start >= end) {
      setAnimatedNumber(end);
      clearInterval(interval);
    } else {
      setAnimatedNumber(start);
    }
  }, stepTime);

  return () => clearInterval(interval);
}, [bigNumber, updateTrigger]); // Add updateTrigger as dependency

// Main data loader
const loadData = async (resetToToday = false) => {
  setLoading(true); // Set loading at start
  setHeatmapMounted(false);
  setTooltipData(null);
  const startTime = Date.now(); // Track when loading started
  
  try {
    const resp = await fetchStayTimes();
    if (!resp) return;

    console.log('API Response:', resp); // Debug log

    setStayData(resp);

    // Use the today object from API which has the correct current average
    const avgStayToday = Number(resp.today?.avg_stay_hours) || 0;
    const recentAvg = Number(resp.today?.recent_avg) || 0;
    const percentChangeRaw = Number(resp.today?.percent_change) || 0;

    console.log('Setting big number to:', avgStayToday); // Debug log

    setBigNumber(avgStayToday);
    // If there is no baseline, avoid showing 100% increase from 0
    const normalizedPercentChange = recentAvg > 0 ? percentChangeRaw : 0;
    setPercentChange(normalizedPercentChange);
    setLastRecordedAverage(recentAvg);
    setHasComparisonData(true);

    console.log('API trend raw:', resp.trend);
    const normalizedTrend = (resp.trend || [])
      .map((item) => ({ day: item.day, avg_hours: Number(item.avg_hours) || 0 }))
      .filter((item) => Boolean(item.day))
      .sort((a, b) => (a.day > b.day ? 1 : a.day < b.day ? -1 : 0));

    setTrendDays(normalizedTrend);
    console.log('TrendDays normalized:', normalizedTrend);

    // Process stay distribution data
    if (resp.stay_distribution) {
      setStayDistributionByDay(resp.stay_distribution);
    }

    const apiTodayKey = resp.today?.date || toDateKey(new Date());

    // Reset day selection to today if requested
    if (resetToToday || !selectedDayKey) {
      const exists = normalizedTrend.find((item) => item.day === apiTodayKey);
      const fallback = normalizedTrend.length > 0 ? normalizedTrend[normalizedTrend.length - 1].day : apiTodayKey;
      const selectedKey = exists ? apiTodayKey : fallback;

      setSelectedDayKey(selectedKey);
      setSelectedIsToday(selectedKey === apiTodayKey);
      setSelectedDate(parseApiDay(selectedKey));

      setTimeout(() => {
        const container = daysRef.current;
        if (!container) return;
        const todayEl = Array.from(container.children).find(
          (el) => (el as HTMLElement).dataset?.day === selectedKey
        ) as HTMLElement | undefined;
        if (todayEl) {
          const cRect = container.getBoundingClientRect();
          const eRect = todayEl.getBoundingClientRect();
          const offset = eRect.left - cRect.left - cRect.width / 2 + eRect.width / 2;
          container.scrollBy({ left: offset, behavior: 'smooth' });
        }
      }, 50);
    }
    // Update chart
    const updatedTrend = (resp.rolling_avg || []).map((item) => ({
      label: item.time_label, // e.g., "10:30"
      avg_hours: Number(item.avg_hours) || 0,
    }));

    if (updatedTrend.length > 0) {
      setChartData({
        labels: updatedTrend.map((item) => item.label),
        datasets: [
          {
            data: updatedTrend.map((item) => item.avg_hours),
            borderColor: 'rgba(24,144,255,1)',
            backgroundColor: 'rgba(24,144,255,0.2)',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHitRadius: 6,
            pointBackgroundColor: 'rgba(24,144,255,1)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1,
          },
        ],
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    // Ensure shimmer shows for at least 800ms
    const elapsedTime = Date.now() - startTime;
    const minDisplayTime = 2000;
    const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
    
    setTimeout(() => {
      setLoading(false);
    }, remainingTime);
  }
};

// Initial load on mount
useEffect(() => {
  loadData();
}, []);

// Trigger heatmap animation after data loads
useEffect(() => {
  if (!loading && bigNumber !== null) {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setHeatmapMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }
}, [loading, bigNumber]);

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

// Auto refresh every 60s - only when viewing today's data
useEffect(() => {
  const intervalId = setInterval(() => {
    if (selectedIsToday) {
      loadData();
    }
  }, 60000);

  return () => clearInterval(intervalId);
}, [selectedIsToday]);

  // Graph options
  const gradientPlugin: Plugin<'line'> = {
    id: 'customGradient',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea || chart.data.datasets.length === 0) return;
      const dataset = chart.data.datasets[0];
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, 'rgba(24,144,255,0.4)');
      gradient.addColorStop(0.7, 'rgba(24,144,255,0.1)');
      gradient.addColorStop(1, 'rgba(24,144,255,0.05)');
      dataset.backgroundColor = gradient;
    },
  };

  // Helper function to convert time format
  function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1e1e1e',
        titleColor: '#fff',
        bodyColor: '#fff',
        titleFont: { size: 14, weight: 'bold' } as Partial<FontSpec>,
        bodyFont: { size: 12 } as Partial<FontSpec>,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        boxPadding: 10,
        callbacks: {
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            const item = tooltipItems[0];
            return `Time: ${item.label}`;
          },
          label: (tooltipItem: TooltipItem<'line'>) => {
            const value = tooltipItem.parsed.y ?? 0;
            return `Stay: ${value.toFixed(2)} hrs`;
          },
        },
      },
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: { display: false, beginAtZero: false, grace: '10%', grid: { display: false } },
    },
    elements: {
      line: { borderWidth: 3, tension: 0.35 },
      point: {
        radius: 5,
        hoverRadius: 10,
        backgroundColor: '#1890ff',
        borderWidth: 2,
        borderColor: '#fff',
        hoverBorderWidth: 3,
        hoverBorderColor: '#FFD700',
      },
    },
  };

  const handleReload = async () => {
    await loadData(true); // reset to today on reload
    // Loading state is handled inside loadData
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

  return (
    <div
      ref={containerRef} 
      className="responsive-chart-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxHeight: isExpanded ? 'none' : '700px',
        minHeight: isExpanded ? 'clamp(300px, 36vh, 430px)' : '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: isExpanded ? '14px 14px 0' : '28px 28px 0',
        backgroundColor: isDarkMode ? '#2d2d2d' : '#fafbfc',
        borderRadius: '20px',
        boxShadow: isDarkMode 
          ? '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4)' 
          : '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.04)',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
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
    <>
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: isExpanded ? 'auto' : 'visible',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      {/* Date Label */}
      <div
        style={{
          textAlign: 'left',
          color: isDarkMode ? '#b0b0b0' : '#8c8c8c',
          fontSize: 'clamp(1.2rem, 1.5vw, 1.2rem)',
          display: 'none', 
          marginBottom: '1rem',
          marginTop: '-0.5rem',
          fontWeight: 500,
          letterSpacing: '0.01em',
          transition: 'color 0.3s ease',
        }}
      >
        {selectedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      
      {/* Weekday Selector */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          marginBottom: isExpanded ? '1.2rem' : '2rem',
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 8px',
          overflow: 'visible',
        }}
      >
        {/* LEFT ARROW */}
        {showLeftArrow && (
          <button
            onClick={() =>
              daysRef.current?.scrollBy({ left: -140, behavior: 'smooth' })
            }
            aria-label="scroll left"
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isExpanded ? 32 : 36,
              height: isExpanded ? 32 : 36,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              fontSize: isExpanded ? 18 : 20,
              lineHeight: 1,
              padding: 0,
              color: '#666',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              e.currentTarget.style.color = '#1890ff';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            ‹
          </button>
        )}

        {/* SCROLLING ROW */}
        <div
          ref={daysRef}
          style={{
            display: 'flex',
            gap: isExpanded ? 8 : 10,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            padding: isExpanded ? '6px' : '8px',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            justifyContent: 'center',
            background: isDarkMode 
              ? 'rgba(45, 55, 72, 0.95)' 
              : 'rgba(240, 242, 245, 0.95)',
            borderRadius: isExpanded ? '24px' : '28px',
            boxShadow: isDarkMode 
              ? 'inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 24px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)' 
              : 'inset 0 2px 6px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            gap: isExpanded ? '4px' : '6px',
          }}
        >
          {(() => {
            const apiTodayKey = stayData?.today?.date || toDateKey(new Date());
            
            // Always build the full week
            const fullWeek = buildLocalWeek();
            
            // Merge API data into the full week structure
            const selectorDays = fullWeek.map((weekDay) => {
              // Try to find matching data from API trend
              const apiData = stayData?.trend?.find((t) => t.day === weekDay.day);
              return {
                day: weekDay.day,
                avg_hours: apiData ? Number(apiData.avg_hours) || 0 : 0,
              };
            });
            
            console.log('Selector days:', selectorDays);

            return selectorDays.map((item) => {
              const label = formatDayLabel(item.day);
              const isSelected = item.day === selectedDayKey;
              const actualToday = toDateKey(new Date());
              const isFuture = item.day > actualToday;

              return (
                <div
                  key={item.day}
                  data-day={item.day}
                  className={`day-selector-item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    if (isFuture) return; // future disabled
                    setSelectedDayKey(item.day);
                    setSelectedDate(parseApiDay(item.day));

                    const isCurrentDay = item.day === apiTodayKey;
                    setSelectedIsToday(isCurrentDay);

                    if (stayData?.today) {
                      if (isCurrentDay) {
                        // --- TODAY CLICKED ---
                        const todayTrendData = stayData.trend?.find((t) => t.day === apiTodayKey);
                        
                        const todayAvg = todayTrendData ? Number(todayTrendData.avg_hours) || 0 : 0;
                        const recentAvg = Number(stayData.today.recent_avg) || 0;

                        const change = recentAvg > 0 ? ((todayAvg - recentAvg) / recentAvg) * 100 : 0;

                        setBigNumber(todayAvg);
                        setPercentChange(change);
                        setLastRecordedAverage(recentAvg);
                        setHasComparisonData(true);
                      } else {
                        // --- PAST DAY CLICKED ---
                        const dayData = stayData.trend?.find((t) => t.day === item.day);

                        if (dayData && Number(dayData.avg_hours) > 0) {
                          // Day has data
                          const avg = Number(dayData.avg_hours) || 0;
                          const todayAvg = Number(stayData.today.avg_stay_hours) || 0;
                          const todayCount = Number(stayData.today.patient_count) || 0;

                          setBigNumber(avg);
                          setUpdateTrigger(prev => prev + 1);

                          // Only compare when today actually has data
                          if (avg > 0 && todayAvg > 0 && todayCount > 0) {
                            const change = ((todayAvg - avg) / avg) * 100;
                            setPercentChange(change);
                            setHasComparisonData(true);
                          } else {
                            setPercentChange(0);
                            setHasComparisonData(false);
                          }

                          setLastRecordedAverage(todayAvg);
                        } else {
                          // Day has no data
                          setBigNumber(null);
                          setAnimatedNumber(0);
                          setPercentChange(0);
                          setHasComparisonData(false);
                          setLastRecordedAverage(0);
                        }
                      }
                    }

                    // --- center the clicked item in the scroller ---
                    const el = e.currentTarget as HTMLElement;
                    const container = daysRef.current;
                    if (!container) return;
                    const cRect = container.getBoundingClientRect();
                    const eRect = el.getBoundingClientRect();
                    const offset = eRect.left - cRect.left - cRect.width / 2 + eRect.width / 2;
                    container.scrollBy({ left: offset, behavior: 'smooth' });
                  }}
                  style={{
                    flex: '0 0 auto',
                    minWidth: isExpanded ? '50px' : '60px',
                    padding: isExpanded ? '10px 14px' : '12px 18px',
                    borderRadius: isExpanded ? '18px' : '20px',
                    cursor: isFuture ? 'not-allowed' : 'pointer',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: isExpanded
                      ? 'clamp(0.9rem, 1.3vw, 1.05rem)'
                      : 'clamp(1.05rem, 1.8vw, 1.3rem)',
                    color: isFuture 
                      ? (isDarkMode ? '#555' : '#ccc')
                      : isSelected 
                        ? (isDarkMode ? '#ffffff' : '#ffffff')
                        : (isDarkMode ? '#9ca3af' : '#6b7280'),
                    background: isSelected 
                      ? (isDarkMode 
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.08)')
                      : 'transparent',
                    border: 'none',
                    textAlign: 'center',
                    boxShadow: isSelected 
                      ? (isDarkMode 
                        ? '0 0 20px rgba(59, 130, 246, 0.6), 0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)'
                        : '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)')
                      : 'none',
                    zIndex: isSelected ? 2 : 1,
                    whiteSpace: 'nowrap',
                    opacity: isFuture ? 0.3 : 1,
                    letterSpacing: '0.02em',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isSelected ? 'scale(1)' : 'scale(0.95)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isFuture && !isSelected) {
                      e.currentTarget.style.background = isDarkMode 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(0, 0, 0, 0.04)';
                      e.currentTarget.style.transform = 'scale(0.98)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFuture && !isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'scale(0.95)';
                    }
                  }}
                >
                  {label}
                </div>
              );
            });
          })()}
        </div>

        {/* RIGHT ARROW */}
        {showRightArrow && (
          <button
            onClick={() =>
              daysRef.current?.scrollBy({ left: 140, behavior: 'smooth' })
            }
            aria-label="scroll right"
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isExpanded ? 32 : 36,
              height: isExpanded ? 32 : 36,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              fontSize: isExpanded ? 18 : 20,
              lineHeight: 1,
              padding: 0,
              color: '#666',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              e.currentTarget.style.color = '#1890ff';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            ›
          </button>
        )}
      </div>

      {/* Big Number */}
      <div
        style={{
          fontSize: isExpanded
            ? bigNumber === null
              ? 'clamp(1.9rem, 4.6vw, 4.6rem)'
              : 'clamp(3.2rem, 8vw, 8.6rem)'
            : 'clamp(4rem, 10vw, 10rem)',
          fontWeight: 800,
          marginBottom: '1rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.2,
          overflow: 'visible',
          minHeight: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          textShadow: '0 2px 4px rgba(24, 144, 255, 0.1)',
        }}
      >
        {bigNumber !== null ? formatHours(animatedNumber) : 'No data available'}
      </div>

      {/* Percent Change */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        {(() => {
          const clampedPercent = Math.min(100, Math.abs(percentChange));
          const isNegative = percentChange < 0;
          const isPositive = percentChange > 0;
          return (
        <div
          style={{
            color: isNegative ? '#52c41a' : isPositive ? '#ff4d4f' : isDarkMode ? '#b0b0b0' : '#8c8c8c',
            fontSize: isExpanded
              ? 'clamp(1.2rem, 1.7vw, 2rem)'
              : 'clamp(1.4rem, 3vw, 2.4rem)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
          }}
        >
          {hasComparisonData && percentChange !== 0 && (
            <span>
              {isNegative ? (
                <TrendingDown size={isExpanded ? 24 : 32} />
              ) : (
                <TrendingUp size={isExpanded ? 24 : 32} />
              )}
            </span>
          )}
          {hasComparisonData ? (
            <span>{clampedPercent.toFixed(1)}%</span>
          ) : (
            <span>No data to compare</span>
          )}
          <span
            style={{
              color: isDarkMode ? '#b0b0b0' : '#8c8c8c',
              fontSize: isExpanded
                ? 'clamp(0.9rem, 1.3vw, 1.2rem)'
                : 'clamp(1.2rem, 2.5vw, 2rem)',
              marginLeft: '0.5rem',
              fontWeight: 400,
            }}
          >
            {hasComparisonData
              ? percentChange < 0
                ? 'Reduction in Stay Time'
                : percentChange > 0
                ? 'Increase in Stay Time'
                : 'No Change in Stay Time'
              : ''}
          </span>
        </div>
          );
        })()}

        <div
          style={{
            color: isDarkMode ? '#b0b0b0' : '#8c8c8c',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.5rem',
            fontSize: isExpanded
              ? 'clamp(0.9rem, 1.25vw, 1.15rem)'
              : 'clamp(1.2rem, 2.5vw, 2rem)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: isExpanded ? 'nowrap' : 'normal',
          }}
        >
          {selectedIsToday ? (
            <>
              Compared to last average recorded today:{" "}
              <span style={{ color: '#1890ff' }}>
                {formatHours(lastRecordedAverage)}
              </span>
            </>
          ) : (
            <>
              Compared to today’s average:{" "}
              <span style={{ color: '#1890ff' }}>
                {formatHours(lastRecordedAverage)}
              </span>
            </>
          )}
        </div>

      </div>
      </div>

      {/* Stay Time Heatmap - GitHub style */}
      <div 
        className={`heatmap-container ${heatmapMounted ? 'mounted' : ''}`}
        style={{ 
          width: '100%',
          minHeight: 'clamp(104px, 13vh, 124px)',
          flex: '0 0 auto',
          marginTop: 'auto',
          marginLeft: 0,
          marginRight: 0,
          marginBottom: '-26px',
          background: isDarkMode ? 'rgba(64, 64, 64, 0.4)' : 'rgba(255, 255, 255, 0.4)',
          borderRadius: '12px 12px 20px 20px',
          padding: '8px 12px',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          overflow: 'hidden',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {(() => {
          const normalizedDayKey = selectedDayKey || stayData?.today?.date || toDateKey(new Date());
          const filteredDistribution = stayDistributionByDay[normalizedDayKey] || [];

          // Fixed grid layout: 6 rows x 50 columns = 300 boxes
          const rows = 6;
          const cols = 50;
          const totalBoxes = rows * cols;
          
          const maxHours = 10;
          const intervalMinutes = (maxHours * 60) / totalBoxes; // ~1.2 minutes per box
          
          // Raw (discrete) counts per bucket for tooltip display
          const rawCounts = Array.from({ length: totalBoxes }, (_, i) => {
            const startHours = (i * intervalMinutes) / 60;
            const endHours = ((i + 1) * intervalMinutes) / 60;
            return filteredDistribution.filter(
              d => d.hours >= startHours && d.hours < endHours
            ).reduce((sum, d) => sum + d.count, 0);
          });

          // Create smoothed counts by distributing each patient across nearby buckets
          const smoothedCounts = Array.from({ length: totalBoxes }, () => 0);
          const radius = 2; // buckets on each side
          filteredDistribution.forEach((d) => {
            if (d.count <= 0) return;
            const position = (d.hours * 60) / intervalMinutes; // in bucket units
            const center = Math.floor(position);
            let weightSum = 0;
            const weights: Array<{ idx: number; w: number }> = [];

            for (let k = -radius; k <= radius; k += 1) {
              const idx = center + k;
              if (idx < 0 || idx >= totalBoxes) continue;
              const distance = Math.abs(position - idx);
              const w = Math.max(0, 1 - distance / (radius + 0.0001)); // triangular kernel
              if (w > 0) {
                weights.push({ idx, w });
                weightSum += w;
              }
            }

            if (weightSum === 0) return;
            weights.forEach(({ idx, w }) => {
              smoothedCounts[idx] += d.count * (w / weightSum);
            });
          });

          // Blend raw counts with smoothed spill to avoid bright boxes at zero raw
          const spillFactor = 0.35; // 0 = discrete only, 1 = fully smoothed
          const displayCounts = rawCounts.map((raw, i) => {
            const smooth = smoothedCounts[i] || 0;
            return raw + (smooth - raw) * spillFactor;
          });

          // Find max count for color scaling (blended)
          const maxCount = displayCounts.length > 0
            ? Math.max(...displayCounts)
            : 1;

          // Create buckets for each interval
          const buckets = Array.from({ length: totalBoxes }, (_, i) => {
            const startHours = (i * intervalMinutes) / 60;
            const endHours = ((i + 1) * intervalMinutes) / 60;
            const count = displayCounts[i] || 0;
            
            return {
              startHours,
              endHours,
              count,
              rawCount: rawCounts[i] || 0,
              intensity: maxCount > 0 ? count / maxCount : 0,
            };
          });
          
          return (
            <>
              {/* Time indicators */}
              <div className="heatmap-time-indicators" style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: 'clamp(0.82rem, 1.05vw, 0.96rem)',
                color: isDarkMode ? '#b0b0b0' : '#8c8c8c',
                fontWeight: 600,
                paddingLeft: '2px',
                paddingRight: '2px',
              }}>
                {[
                  '10m','20m','30m','40m','50m',
                  '1h','2h','3h','4h','5h',
                  '6h','7h','8h','9h','10h',
                ].map((label) => (
                  <div
                    key={label}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      minWidth: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '9px',
                        height: '2px',
                        borderRadius: '999px',
                        background: 'linear-gradient(90deg, #1890ff 0%, #69c0ff 100%)',
                        boxShadow: '0 1px 3px rgba(24, 144, 255, 0.35)',
                      }}
                    />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              
              {/* Heatmap boxes */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: '1px',
                width: '100%',
                height: 'clamp(52px, 7vh, 66px)',
                maxHeight: 'clamp(52px, 7vh, 66px)',
                overflow: 'hidden',
                borderRadius: '6px',
              }}>
                {buckets.map((bucket, idx) => {
                  // Color intensity based on count
                  const baseColor = { r: 24, g: 144, b: 255 }; // #1890ff
                  const alpha = bucket.count === 0 
                    ? 0.08 
                    : 0.2 + (bucket.intensity * 0.8); // 0.2 to 1.0
                  
                  const startMin = Math.floor((bucket.startHours % 1) * 60);
                  const endMin = Math.floor((bucket.endHours % 1) * 60);
                  const startLabel = `${Math.floor(bucket.startHours)}h ${startMin}m`;
                  const endLabel = `${Math.floor(bucket.endHours)}h ${endMin}m`;
                  
                  // Staggered animation delay based on position (row by row)
                  const staggerDelay = (idx % cols) * 0.02 + Math.floor(idx / cols) * 0.05;
                  
                  return (
                    <div
                      key={idx}
                      className="heatmap-box"
                      style={{
                        aspectRatio: '1',
                        backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`,
                        borderRadius: '2px',
                        border: isDarkMode 
                          ? '1px solid rgba(255, 255, 255, 0.1)' 
                          : '1px solid rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer',
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        animation: heatmapMounted ? `boxFadeIn 0.5s ease-out ${staggerDelay}s forwards` : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.15)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.4)';
                        e.currentTarget.style.zIndex = '10';
                        
                        const rect = e.currentTarget.getBoundingClientRect();
                        
                        // Position to the right side of the box
                        setTooltipData({
                          x: rect.right + 15,
                          y: rect.top + rect.height / 2,
                          content: `${startLabel} - ${endLabel}|${bucket.rawCount} patient${bucket.rawCount !== 1 ? 's' : ''}`,
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.zIndex = '1';
                        setTooltipData(null);
                      }}
                    />
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            backgroundColor: isDarkMode ? '#2d2d2d' : '#fafbfc',
          }}
        >
          <ShimmerLoader type="bignumber" isDarkMode={isDarkMode} />
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
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>
                  Main value (average stay time)
                </div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  This is the average time patients stayed in the hospital for the selected day.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>
                  Change compared to baseline
                </div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Green means stays became shorter. Red means stays became longer.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>
                  Duration grid (heatmap)
                </div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Each small box is a time range (for example 30-40 minutes, 1-2 hours). Brighter boxes mean more
                  patients were in that time range.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    
    {/* Custom Tooltip */}
    {tooltipData &&
      typeof document !== 'undefined' &&
      createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
            transform: 'translateY(-50%)',
            background: isDarkMode ? '#2d2d2d' : '#ffffff',
            color: isDarkMode ? '#e0e0e0' : '#262626',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '1.15rem',
            fontWeight: 500,
            boxShadow: isDarkMode 
              ? '0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)' 
              : '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
            pointerEvents: 'none',
            zIndex: 10000,
            whiteSpace: 'nowrap',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            minWidth: '200px',
          }}
        >
          {(() => {
            const [timeRange, patients] = tooltipData.content.split('|');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ 
                  color: '#1890ff', 
                  fontSize: '1rem', 
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}>
                  Stay Duration
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isDarkMode ? '#ffffff' : '#262626' }}>
                  {timeRange}
                </div>
                <div style={{ 
                  marginTop: '4px',
                  paddingTop: '10px',
                  borderTop: isDarkMode ? '2px solid #404040' : '2px solid #f0f0f0',
                  color: isDarkMode ? '#b0b0b0' : '#595959',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                }}>
                  {patients}
                </div>
              </div>
            );
          })()}
          {/* Arrow pointer - pointing left */}
          <div
            style={{
              position: 'absolute',
              left: '-6px',
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '12px',
              height: '12px',
              background: isDarkMode ? '#2d2d2d' : '#ffffff',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
              borderRight: 'none',
              borderBottom: 'none',
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
