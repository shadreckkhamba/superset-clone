import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { ShimmerLoader } from './ShimmerLoader';
import { ENDPOINTS } from '../../config/endpoints';
import './chart-fixes.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

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

const createDataLabelsPlugin = (isDarkMode: boolean, compact: boolean) => ({
  id: 'customDataLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    const lineDatasetIndex = chart.data.datasets.findIndex(
      (ds: any, idx: number) => ds.type === 'line' && !chart.getDatasetMeta(idx).hidden
    );
    const lineMeta = lineDatasetIndex >= 0 ? chart.getDatasetMeta(lineDatasetIndex) : null;
    const lineLabelBg = isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const lineLabelStroke = isDarkMode ? 'rgba(24, 144, 255, 0.48)' : 'rgba(24, 144, 255, 0.3)';
    const barLabelStroke = isDarkMode ? 'rgba(26, 26, 26, 0.92)' : 'rgba(255, 255, 255, 0.92)';
    const lineFontSize = compact ? 14 : 20;
    const barFontSize = compact ? 16 : 24;
    const linePadding = compact ? 4 : 6;
    const lineBgHeight = compact ? 18 : 24;
    const lineBgOffset = compact ? 26 : 34;
    const lineTextOffset = compact ? 9 : 14;

    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta.hidden) {
        meta.data.forEach((element: any, index: number) => {
          const renderedValue = dataset.data[index];
          const actualValue = dataset.actualData?.[index] ?? renderedValue;
          if (renderedValue === null || actualValue === null || actualValue === 0) return;

          ctx.save();

          const isLine = dataset.type === 'line';
          const isBar = dataset.type === 'bar';

          if (isLine) {
            const value = renderedValue;
            const h = Math.floor(value);
            const m = Math.round((value - h) * 60);
            const label = `${h}h ${m}m`;

            ctx.font = `bold ${lineFontSize}px sans-serif`;
            ctx.fillStyle = '#1890ff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            const textWidth = ctx.measureText(label).width;
            const bgX = element.x - textWidth / 2 - linePadding;
            const bgY = element.y - lineBgOffset;
            const bgWidth = textWidth + linePadding * 2;
            const bgHeight = lineBgHeight;

            ctx.fillStyle = lineLabelBg;
            ctx.strokeStyle = lineLabelStroke;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#1890ff';
            ctx.fillText(label, element.x, element.y - lineTextOffset);
          } else if (isBar) {
            const label = String(actualValue);
            const linePoint = lineMeta?.data?.[index];
            const defaultLabelY = element.y - 6;
            let labelY = defaultLabelY;

            if (linePoint && typeof linePoint.y === 'number' && Math.abs(defaultLabelY - linePoint.y) < 24) {
              labelY = linePoint.y - 18;
            }

            const minTopY = chart.chartArea.top + 20;
            if (labelY < minTopY) {
              labelY = Math.min(element.y + 24, chart.chartArea.bottom - 8);
            }

            ctx.font = `bold ${barFontSize}px sans-serif`;
            ctx.fillStyle = '#52c487';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.lineWidth = compact ? 3 : 4;
            ctx.strokeStyle = barLabelStroke;
            ctx.strokeText(label, element.x, labelY);
            ctx.fillText(label, element.x, labelY);
          }

          ctx.restore();
        });
      }
    });
  },
});

interface StayEntry {
  arrival_time: string;
  departure_time: string;
  difference_hours: number;
  total_patients?: number;
  percent_change?: string;
}

interface RunChartStayProps {
  refreshKey?: number;
  resetKey?: number;
  isDarkMode?: boolean;
  compact?: boolean;
}

const createNoDataPlugin = (isDarkMode: boolean) => ({
  id: "noDataPlugin",
  afterDraw: (chart: any) => {
    const { ctx, data } = chart;
    const hasData = data.datasets.some(
      (ds: any) => ds.data && ds.data.some((v: any) => v > 0)
    );
    if (hasData) return;

    const { width, height } = chart;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isDarkMode ? "#b0b0b0" : "#999";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("No patient data available for this week", width / 2, height / 2);
    ctx.restore();
  },
});

export default function RunChartStay({
  refreshKey,
  resetKey,
  isDarkMode = false,
  compact = false,
}: RunChartStayProps): JSX.Element {
  const [entries, setEntries] = useState<StayEntry[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoPanelReady, setInfoPanelReady] = useState(false);
  const chartRef = useRef<ChartJS<"bar" | "line"> | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const infoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnimatedOnViewRef = useRef(false);
  const noDataPlugin = useMemo(() => createNoDataPlugin(isDarkMode), [isDarkMode]);
  const dataLabelsPlugin = useMemo(() => createDataLabelsPlugin(isDarkMode, compact), [isDarkMode, compact]);
  const chartSurfaceBg = isDarkMode ? "#1a1a1a" : "#ffffff";
  const chartSurfaceBorder = isDarkMode ? "1px solid #404040" : "1px solid #e5e7eb";
  const chartSurfaceShadow = isDarkMode
    ? "0 8px 20px rgba(0,0,0,0.35)"
    : "0 8px 20px rgba(15, 23, 42, 0.08)";
  const controlButtonSize = compact ? "clamp(38px, 2.8vw, 44px)" : "clamp(56px, 10vw, 80px)";
  const controlIconSize = compact ? 20 : 32; // Slightly smaller icons for better proportion
  const weekBannerFontSize = compact ? "clamp(15px, 1.5vw, 18px)" : "clamp(20px, 5vw, 24px)";
  const weekBannerPadding = compact ? "8px 14px" : "14px 24px";
  const navHorizontalPadding = compact ? "6px" : "clamp(12px, 3vw, 20px) clamp(12px, 3vw, 20px)";
  const navBottomGap = compact ? "4px" : "8px";
  const chartPadding = "0";
  const wrapperMaxHeight = compact ? "none" : "680px";
  const chartAreaMaxHeight = compact ? "none" : "560px";
  const infoButtonSize = compact ? "34px" : "52px";
  const infoIconSize = compact ? 20 : 30;
  const tooltipOffsetTop = compact ? "56px" : "90px";
  const tooltipOffsetRight = compact ? "-18px" : "-40px";
  const animationTrigger = useMemo(
    () => `${weekOffset}-${refreshKey ?? 0}-${resetKey ?? 0}`,
    [weekOffset, refreshKey, resetKey],
  );

  const animateBarsIn = useCallback(() => {
    const chart = chartRef.current;
    const container = chartContainerRef.current;
    
    // Ensure both chart and container exist and are connected to DOM
    if (!chart || !container || !chart.canvas || !chart.canvas.isConnected) return;
    
    // Check if the canvas parent is still in the DOM
    if (!chart.canvas.parentNode || !document.contains(chart.canvas)) return;
    try {
      chart.stop();
      chart.reset();
      chart.update();
    } catch (error) {
      console.warn('Animation failed, chart may be unmounted:', error);
    }
  }, []);

  const runChartResize = useCallback(() => {
    const chart = chartRef.current;
    const container = chartContainerRef.current;
    
    // Ensure both chart and container exist and are connected to DOM
    if (!chart || !container || !chart.canvas || !chart.canvas.isConnected) return;
    
    // Check if the canvas parent is still in the DOM
    if (!chart.canvas.parentNode || !document.contains(chart.canvas)) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width < 50 || height < 50) return;

    try {
      chart.resize();
    } catch (error) {
      console.warn('Chart resize failed, chart may be unmounted:', error);
    }
  }, []);

  const getWeekDateRange = useCallback((offset: number) => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday-start week

    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(today.getDate() + diff + offset * 7);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const toDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    return {
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
    };
  }, []);

  const fetchData = useCallback(async (offset = weekOffset) => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const { startDate, endDate } = getWeekDateRange(offset);
      console.log("📅 Requesting date range:", { startDate, endDate, weekOffset: offset });
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      const resp = await fetch(`${ENDPOINTS.STAY_TIMES_TREND}?${params.toString()}`);
      const data = await resp.json();
      const entries = (data.entries || []).map((e: any) => ({
        arrival_time: e.day,
        departure_time: e.day,
        difference_hours: parseFloat(e.avg_stay_hours) || 0,
        total_patients: e.total_patients || 0,
      }));
      setEntries(entries);
      console.log("📊 Fetched entries:", entries);
    } catch (err) {
      console.error("Error fetching stay data", err);
    } finally {
      // Ensure shimmer shows for at least 800ms
      const elapsedTime = Date.now() - startTime;
      const minDisplayTime = 2000;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  }, [getWeekDateRange, weekOffset]);

  // Reload chart handler
  const handleReload = useCallback(
    async (resetToCurrentWeek = false) => {
      if (resetToCurrentWeek) {
        // Reset to current week; fetch immediately only if we're already on current week.
        if (weekOffset === 0) {
          await fetchData(0);
          return;
        }
        setWeekOffset(0);
        return;
      }

      // Preserve selected week on external refreshes.
      await fetchData(weekOffset);
    },
    [fetchData, weekOffset]
  );

  // Handle external refresh requests
  useEffect(() => {
    if (refreshKey !== undefined) {
      handleReload(false);
    }
  }, [refreshKey, handleReload]);

  // Reset to current week on explicit parent trigger
  useEffect(() => {
    if ((resetKey ?? 0) > 0) {
      handleReload(true);
    }
  }, [resetKey, handleReload]);

  // Initial fetch + interval - only auto-refresh when viewing current week
  useEffect(() => {
    fetchData();
    // Only auto-refresh if viewing current week (weekOffset === 0)
    if (weekOffset === 0) {
      const id = setInterval(fetchData, 60000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [fetchData, weekOffset]);

  // Force chart to fully re-measure modal container after mount/render transitions.
  useEffect(() => {
    const resizeChart = () => {
      const chart = chartRef.current;
      if (chart && chart.canvas && chart.canvas.isConnected && document.contains(chart.canvas)) {
        runChartResize();
      }
    };
    
    const rafId = window.requestAnimationFrame(resizeChart);
    const t1 = window.setTimeout(resizeChart, 120);
    const t2 = window.setTimeout(resizeChart, 400);
    const t3 = window.setTimeout(resizeChart, 800);
    
    window.addEventListener("resize", resizeChart);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", resizeChart);
    };
  }, [loading, refreshKey, weekOffset, compact, runChartResize]);

  // Fallback animation trigger - ensures animation happens even if visibility detection fails
  useEffect(() => {
    if (loading || hasAnimatedOnViewRef.current) return;
    
    const fallbackTimer = setTimeout(() => {
      // Check if component is still mounted and chart is valid
      const chart = chartRef.current;
      const container = chartContainerRef.current;
      
      if (!hasAnimatedOnViewRef.current && 
          chart && 
          container && 
          chart.canvas && 
          chart.canvas.isConnected &&
          document.contains(chart.canvas)) {
        console.log('🎬 Fallback animation trigger for RunChartStay');
        animateBarsIn();
        hasAnimatedOnViewRef.current = true;
      }
    }, 1500); // Trigger after 1.5s if no other animation has occurred
    
    return () => clearTimeout(fallbackTimer);
  }, [loading, animateBarsIn]);

  useEffect(() => {
    hasAnimatedOnViewRef.current = false;
  }, [loading, weekOffset]);

  useEffect(() => {
    if (loading) return;

    const el = chartContainerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const elementHeight = rect.height;
    
    // More flexible visibility check for smaller screens
    const isVisible = rect.top < viewportHeight && rect.bottom > 0;
    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    const visibilityRatio = visibleHeight / elementHeight;
    
    // Trigger animation if element is reasonably visible (at least 20% or 150px)
    const minVisiblePixels = 150;
    const minVisibilityRatio = 0.2;
    const shouldAnimate = isVisible && (
      visibilityRatio >= minVisibilityRatio || 
      visibleHeight >= minVisiblePixels
    );
    
    if (!shouldAnimate) return;

    animateBarsIn();
    hasAnimatedOnViewRef.current = true;
  }, [loading, animationTrigger, animateBarsIn]);

  useEffect(() => {
    if (loading) return undefined;

    const el = chartContainerRef.current;
    if (!el) return undefined;

    const rect = el.getBoundingClientRect();
    const isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (isFullyVisible) {
      hasAnimatedOnViewRef.current = true;
      return undefined;
    }

    if (!("IntersectionObserver" in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (!entry?.isIntersecting || hasAnimatedOnViewRef.current) return;
        
        // More flexible threshold for smaller screens
        const elementHeight = entry.boundingClientRect.height;
        const minThreshold = Math.min(0.4, Math.max(0.1, 200 / elementHeight));
        
        if ((entry.intersectionRatio ?? 0) < minThreshold) return;
        animateBarsIn();
        hasAnimatedOnViewRef.current = true;
        observer.disconnect();
      },
      { threshold: [0, 0.1, 0.25, 0.4, 0.75] },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [loading, animateBarsIn]);

  // Force immediate Chart.js repaint when theme toggles.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chart.canvas || !chart.canvas.isConnected) return;
    
    // Check if the canvas parent is still in the DOM
    if (!chart.canvas.parentNode || !document.contains(chart.canvas)) return;

    try {
      const parent = chart.canvas?.parentNode as HTMLElement | null;
      const tooltipEl = parent?.querySelector(".chartjs-tooltip");
      if (tooltipEl) {
        tooltipEl.remove();
      }

      chart.update("active");
      chart.resize();
    } catch (error) {
      console.warn('Theme update failed, chart may be unmounted:', error);
    }
  }, [isDarkMode]);

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

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      runChartResize();
    });

    resizeObserver.observe(el);

    const parentContainer = el.closest('.patient-stay-overlay');
    if (parentContainer) {
      resizeObserver.observe(parentContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [runChartResize]);

  useEffect(() => {
    const handleMenuToggle = () => {
      const chart = chartRef.current;
      if (!chart || !chart.canvas || !chart.canvas.isConnected) return;
      
      // Check if the canvas parent is still in the DOM
      if (!chart.canvas.parentNode || !document.contains(chart.canvas)) return;
      
      const resize = () => {
        if (!chart.canvas || !chart.canvas.isConnected) return;
        try {
          chart.resize();
          chart.update("active");
        } catch (error) {
          console.warn('Menu toggle resize failed, chart may be unmounted:', error);
        }
      };
      requestAnimationFrame(resize);
      window.setTimeout(resize, 80);
      window.setTimeout(resize, 200);
    };

    window.addEventListener('dashboard-header-menu-toggle', handleMenuToggle);
    return () => {
      window.removeEventListener('dashboard-header-menu-toggle', handleMenuToggle);
    };
  }, []);

  // Cleanup effect to ensure proper chart destruction
  useEffect(() => {
    return () => {
      const chart = chartRef.current;
      if (chart) {
        try {
          chart.destroy();
        } catch (error) {
          console.warn('Chart cleanup failed:', error);
        }
        chartRef.current = null;
      }
    };
  }, []);

  // Compute weekly averages
  const dailyAverages = useMemo(() => {
    if (!entries.length) return [];

    const today = new Date();
    const curDay = today.getDay();
    const diff = curDay === 0 ? -6 : 1 - curDay; 
    const mondayOfWeek = new Date(today);
    mondayOfWeek.setHours(0, 0, 0, 0);
    mondayOfWeek.setDate(today.getDate() + diff + weekOffset * 7);

    const toDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    const entriesByDate = new Map<string, StayEntry[]>();
    entries.forEach((entry) => {
      const bucket = entriesByDate.get(entry.arrival_time) || [];
      bucket.push(entry);
      entriesByDate.set(entry.arrival_time, bucket);
    });

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(mondayOfWeek);
      dayDate.setDate(mondayOfWeek.getDate() + i);

      const dateStr = toDateKey(dayDate); // "YYYY-MM-DD"

      // Pull entries by exact date string
      const dayEntries = entriesByDate.get(dateStr) || [];

      const avg =
        dayEntries.length > 0
          ? dayEntries.reduce((sum, e) => sum + e.difference_hours, 0) / dayEntries.length
          : 0;

      const totalPatients =
        dayEntries.length > 0
          ? dayEntries.reduce((sum, e) => sum + (e.total_patients || 0), 0)
          : 0;

      // Calculate percent_change based on the previous day in this displayed week
      let percentChange = 0;
      if (i > 0) {
        const prevDate = new Date(mondayOfWeek);
        prevDate.setDate(mondayOfWeek.getDate() + i - 1);
        const prevDateStr = toDateKey(prevDate);
        const prevDayEntries = entriesByDate.get(prevDateStr) || [];
        const prevAvg =
          prevDayEntries.length > 0
            ? prevDayEntries.reduce((sum, e) => sum + e.difference_hours, 0) / prevDayEntries.length
            : 0;
        if (prevAvg > 0) {
          percentChange = ((avg - prevAvg) / prevAvg) * 100;
        }
      }

      return {
        dayIndex: i,
        avg: parseFloat(avg.toFixed(2)),
        count: dayEntries.length,
        total_patients: totalPatients,
        dateStr,
        percent_change: parseFloat(percentChange.toFixed(2)),
      };
    });
  }, [entries, weekOffset]);

  // Week Range text
  const weekRange = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + weekOffset * 7);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 6);

    const formatDate = (d: Date) =>
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    return `${formatDate(monday)} - ${formatDate(saturday)}`;
  }, [weekOffset]);

  // Prevent future week navigation
  const isNextWeekFuture = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mondayNext = new Date(today);
    mondayNext.setDate(today.getDate() + diff + (weekOffset + 1) * 7);
    mondayNext.setHours(0, 0, 0, 0);
    return mondayNext > new Date();
  }, [weekOffset]);

  const maxDuration = 5;
  const lastVisibleDayIndex = useMemo(() => {
    if (weekOffset !== 0) {
      return 6;
    }

    const today = new Date();
    return today.getDay() === 0 ? 6 : today.getDay() - 1;
  }, [weekOffset]);
  const { maxPatients, patientTickStep } = useMemo(() => {
    const visiblePatientCounts = dailyAverages
      .filter(day => day.dayIndex <= lastVisibleDayIndex)
      .map(day => day.total_patients ?? 0);
    const observedMax = Math.max(...visiblePatientCounts, 0);

    // Keep the right axis aligned to the left axis (0..5 => 6 grid lines):
    // Choose a tick step so that maxPatients = step * 5, with a minimum of 150.
    const targetMax = Math.max(150, observedMax);
    const stepCandidates = [30, 40, 50, 60, 75, 80, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];
    const step =
      stepCandidates.find(s => s * 5 >= targetMax) ??
      Math.ceil(Math.ceil(targetMax / 5) / 50) * 50;

    return { maxPatients: step * 5, patientTickStep: step };
  }, [dailyAverages, lastVisibleDayIndex]);

  // ---- Chart Data ----
  const data = useMemo(() => {
    // Compute Monday of the displayed week (to match API fetch range + week header)
    const today = new Date();
    const curDay = today.getDay();
    const diff = curDay === 0 ? -6 : 1 - curDay;
    const mondayOfWeek = new Date(today);
    mondayOfWeek.setDate(today.getDate() + diff + weekOffset * 7);

    // Build labels Monday -> Sunday
    const weekLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayOfWeek);
      d.setDate(mondayOfWeek.getDate() + i);
      const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
      const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
      return [weekday, dateStr];
    });

    // Build values
    const avgStayValues = dailyAverages.map((d) => {
      if (d.dayIndex > lastVisibleDayIndex) return null;
      const raw = d.avg ?? 0;
      return Math.min(raw, maxDuration);
    });
    const actualPatientCounts = dailyAverages.map((d) =>
      d.dayIndex <= lastVisibleDayIndex ? d.total_patients ?? 0 : null,
    );
    // Keep the right axis aligned with the left-side grid while still showing actual counts in labels/tooltips.
    const patientCounts = actualPatientCounts.map((value) =>
      value === null ? null : Math.min(value, maxPatients),
    );
    
    // Create gradient for area chart
    const createGradient = (ctx: CanvasRenderingContext2D, chartArea: any) => {
      const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      gradient.addColorStop(0, 'rgba(24, 144, 255, 0.05)');
      gradient.addColorStop(0.5, 'rgba(24, 144, 255, 0.15)');
      gradient.addColorStop(1, 'rgba(24, 144, 255, 0.3)');
      return gradient;
    };

    return {
      labels: weekLabels,
      datasets: [
        // Bar chart for patient count (background layer)
        {
          type: 'bar' as const,
          label: "Total Patients",
          font: { size: 28, weight: 700 },
          data: patientCounts,
          actualData: actualPatientCounts,
          backgroundColor: 'rgba(82, 196, 135, 0.25)',
          borderColor: 'rgba(82, 196, 135, 0.8)',
          borderWidth: 2,
          borderRadius: 8,
          yAxisID: 'y1',
          order: 2,
        },
        // Area chart for average stay
        {
          type: 'line' as const,
          label: "Average Stay Duration (hrs)",
          font: { size: 28, weight: 700 },
          data: avgStayValues,
          borderColor: '#1890ff',
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return 'rgba(24, 144, 255, 0.1)';
            return createGradient(ctx, chartArea);
          },
          pointRadius: compact ? 8 : 12,
          pointHoverRadius: compact ? 10 : 14,
          pointBackgroundColor: '#1890ff',
          pointBorderColor: '#ffffff',
          pointBorderWidth: compact ? 3 : 4,
          pointHoverBorderWidth: compact ? 4 : 5,
          fill: true,
          tension: 0.4,
          borderWidth: compact ? 3 : 4,
          yAxisID: 'y',
          order: 1,
        },
      ],
    };
  }, [dailyAverages, lastVisibleDayIndex, weekOffset, maxDuration, maxPatients]);
  
  // Helper function to convert time format
  function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  // Background color plugin - must run first to draw background
  const backgroundPlugin = useMemo(() => ({
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart: any) => {
      const { ctx } = chart;
      if (!ctx) return;
      
      ctx.save();
      ctx.fillStyle = chartSurfaceBg;
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  }), [chartSurfaceBg]);

  const options: ChartOptions<"bar" | "line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      devicePixelRatio: 1,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      layout: {
        padding: compact
          ? { top: 16, bottom: 0, left: 8, right: 8 }
          : { top: 60, bottom: 4, left: 20, right: 20 },
      },
      animation: {
        duration: 1200,
        easing: "easeInOutQuart",
      },
      elements: {
        point: {
          radius: compact ? 6 : 10,
          hoverRadius: compact ? 8 : 14,
          pointStyle: "circle",
        },
        line: { 
          borderWidth: compact ? 3 : 4, 
          tension: 0.4,
        },
      },
      scales: {
        x: {
          type: "category",
          title: {
            display: true,
            text: "Week Days",
            font: { size: compact ? 14 : 32, weight: 700 },
            color: "#297acb",
            padding: { top: 8, bottom: 2 },
          },
          ticks: { 
            color: isDarkMode ? "#e0e0e0" : "#262626", 
            font: { size: compact ? 11 : 20, weight: 700 },
            padding: compact ? 8 : 10,
            autoSkip: compact,
          },
          grid: {
            display: false,
            drawBorder: true,
            color: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            lineWidth: 2,
          },
        },
        y: {
          type: "linear",
          position: 'left',
          min: 0,
          max: maxDuration,
          title: {
            display: true,
            text: "Average Stay (hours)",
            font: { size: compact ? 16 : 38, weight: 700 },
            color: "#1890ff",
            padding: { top: 0, bottom: compact ? 8 : 10 },
          },
          ticks: {
            color: isDarkMode ? "#e0e0e0" : "#262626",
            font: { size: compact ? 10 : 20, weight: 600 },
            stepSize: 1,
            precision: 0,
            autoSkip: false,
            padding: compact ? 10 : 15,
          },
          grid: {
            color: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            lineWidth: 1,
            drawTicks: false,
          },
          border: { display: false },
        },
        y1: {
          type: "linear",
          position: 'right',
          min: 0,
          max: maxPatients,
          title: {
            display: true,
            text: "Total Patients",
            font: { size: compact ? 16 : 42, weight: 700 },
            color: "#52c487",
            padding: { top: 0, bottom: compact ? 8 : 10 },
          },
          ticks: {
            color: isDarkMode ? "#e0e0e0" : "#262626",
            font: { size: compact ? 10 : 20, weight: 600 },
            stepSize: patientTickStep,
            autoSkip: false,
            padding: compact ? 10 : 15,
          },
          grid: {
            display: false,
          },
          border: { display: false },
        },
      },
      plugins: {
        legend: { 
          display: true,
          position: 'top',
          align: 'center',
          onClick: (e: any, legendItem: any, legend: any) => {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            if (ci.isDatasetVisible(index)) {
              ci.hide(index);
              legendItem.hidden = true;
            } else {
              ci.show(index);
              legendItem.hidden = false;
            }
          },
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: compact ? 10 : 20,
            font: { size: compact ? 12 : 24, weight: 700 },
            color: isDarkMode ? '#e0e0e0' : '#262626',
            boxHeight: compact ? 12 : 12,
            boxWidth: compact ? 12 : 12,
          },
        },
        tooltip: {
          enabled: false, // fully disable Chart.js native rendering
          external: (context) => {
            const { tooltip, chart } = context;
            const parent = chart.canvas.parentNode as HTMLElement | null;
            if (!tooltip || !parent) return;

            if (getComputedStyle(parent).position === "static") {
              parent.style.position = "relative";
            }

            let tooltipEl = parent.querySelector(".chartjs-tooltip") as HTMLElement | null;
            if (!tooltipEl) {
              tooltipEl = document.createElement("div");
              tooltipEl.classList.add("chartjs-tooltip");
              tooltipEl.style.position = "absolute";
              tooltipEl.style.pointerEvents = "none";
              tooltipEl.style.zIndex = "9999";
              tooltipEl.style.transition = "opacity 0.2s ease, left 0.15s ease-out, top 0.15s ease-out";
              tooltipEl.style.willChange = "transform, opacity";
              tooltipEl.style.opacity = "0";
              tooltipEl.style.transform = "translateY(12px) scale(0.9)";
              tooltipEl.dataset.visible = "false";
              tooltipEl.dataset.dayIndex = "-1";
              parent.appendChild(tooltipEl);
            }

            // Hide if not active
            if (tooltip.opacity === 0) {
              tooltipEl.style.opacity = "0";
              tooltipEl.style.transform = "translateY(10px) scale(0.94)";
              tooltipEl.classList.remove("tooltip-pop-bounce");
              tooltipEl.dataset.visible = "false";
              return;
            }

            const dayIndex = tooltip.dataPoints?.[0].dataIndex ?? 0;
            const avgStay = dailyAverages[dayIndex]?.avg ?? 0;
            const patientsCount = dailyAverages[dayIndex]?.total_patients ?? 0;
            let percentChange = dailyAverages[dayIndex]?.percent_change ?? 0;

            let isIncrease = percentChange > 0;
            let isDecrease = percentChange < 0;
            let changeColor = isIncrease ? "#ff4d4f" : isDecrease ? "#52c41a" : "#8c8c8c";
            let changeSymbol = isIncrease ? "▲" : isDecrease ? "▼" : "—";
            let changeText = isIncrease
              ? "Increase vs previous day"
              : isDecrease
              ? "Decrease vs previous day"
              : "No change";

            // Future day with no data
            if (patientsCount === 0 && avgStay === 0) {
              percentChange = 0;
              changeColor = "#8c8c8c";
              changeSymbol = "—";
              changeText = "No data yet";
            }

            const tooltipBackground = isDarkMode
              ? "linear-gradient(135deg, #2b2f36 0%, #1f242b 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)";
            const tooltipBorder = isDarkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.06)";
            const tooltipTitleColor = isDarkMode ? "#e0e0e0" : "#262626";
            const tooltipSecondaryColor = isDarkMode ? "#b0b0b0" : "#8c8c8c";
            const tooltipDividerColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
            const tooltipPointerColor = isDarkMode ? "#2b2f36" : "#ffffff";
            const tooltipShadow = isDarkMode
              ? "0 8px 24px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35)"
              : "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)";
            const tooltipPadding = compact ? "10px 12px" : "16px 20px";
            const tooltipMinWidth = compact ? 180 : 220;
            const tooltipGap = compact ? 6 : 10;
            const tooltipDotSize = compact ? 6 : 8;
            const tooltipLabelFontSize = compact ? 13 : 20;
            const tooltipValueFontSize = compact ? 13 : 20;
            const tooltipMetaFontSize = compact ? 12 : 20;
            const tooltipDividerTop = compact ? 4 : 6;
            const tooltipDividerPadding = compact ? 6 : 10;
            const tooltipPointerSize = compact ? 8 : 10;

            tooltipEl.innerHTML = `
              <div style="
                background: ${tooltipBackground};
                border-radius: 12px;
                padding: ${tooltipPadding};
                box-shadow: ${tooltipShadow};
                border: ${tooltipBorder};
                min-width: ${tooltipMinWidth}px;
              ">
                <div style="display: flex; flex-direction: column; gap: ${tooltipGap}px;">
                  <div style="display: flex; align-items: center; gap: ${tooltipGap}px;">
                    <div style="width: ${tooltipDotSize}px; height: ${tooltipDotSize}px; border-radius: 50%; background: #52c487;"></div>
                    <span style="font-weight: 600; font-size: ${tooltipLabelFontSize}px; color: ${tooltipTitleColor};">Total Patients:</span>
                    <span style="font-weight: 700; font-size: ${tooltipValueFontSize}px; color: #52c487; margin-left: auto;">${patientsCount}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: ${tooltipGap}px;">
                    <div style="width: ${tooltipDotSize}px; height: ${tooltipDotSize}px; border-radius: 50%; background: #1890ff;"></div>
                    <span style="font-weight: 600; font-size: ${tooltipLabelFontSize}px; color: ${tooltipTitleColor};">Average Stay:</span>
                    <span style="font-weight: 700; font-size: ${tooltipValueFontSize}px; color: #1890ff; margin-left: auto;">${formatHours(avgStay)}</span>
                  </div>
                  <div style="
                    margin-top: ${tooltipDividerTop}px;
                    padding-top: ${tooltipDividerPadding}px;
                    border-top: 1px solid ${tooltipDividerColor};
                    display: flex;
                    align-items: center;
                    gap: ${tooltipGap}px;
                  ">
                    <span style="
                      font-size: ${tooltipMetaFontSize}px;
                      font-weight: 700;
                      color: ${changeColor};
                    ">${changeSymbol} ${Math.abs(percentChange).toFixed(1)}%</span>
                    <span style="
                      font-size: ${tooltipMetaFontSize}px;
                      color: ${tooltipSecondaryColor};
                      font-weight: 500;
                    ">${changeText}</span>
                  </div>
                </div>
              </div>

              <!-- Triangle pointer -->
              <div class="tooltip-pointer" style="
                position: absolute;
                width: 0;
                height: 0;
                border-left: ${tooltipPointerSize}px solid transparent;
                border-right: ${tooltipPointerSize}px solid transparent;
                border-top: ${tooltipPointerSize}px solid ${tooltipPointerColor};
                left: 50%;
                transform: translateX(-50%);
                top: 100%;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
              "></div>
            `;

            // --- Position tooltip properly ---
            const padding = 12;
            const tooltipWidth = tooltipEl.offsetWidth;
            const tooltipHeight = tooltipEl.offsetHeight;

            let left = tooltip.caretX - tooltipWidth / 2;
            left = Math.max(padding, Math.min(left, parent.clientWidth - tooltipWidth - padding));

            let top = tooltip.caretY - tooltipHeight - 16;
            top = Math.max(padding, top);

            tooltipEl.style.left = `${left}px`;
            tooltipEl.style.top = `${top}px`;
            tooltipEl.style.opacity = "1";

            const pointer = tooltipEl.querySelector<HTMLDivElement>(".tooltip-pointer");
            let pointerX = tooltip.caretX - left;
            if (pointer) {
              pointerX = tooltip.caretX - left;
              pointer.style.left = `${pointerX}px`;
            }

            // Make the pop animation originate from the hovered bar/point.
            tooltipEl.style.transformOrigin = `${pointerX}px calc(100% + 10px)`;

            const activeIndex = String(dayIndex);
            const shouldAnimate =
              tooltipEl.dataset.visible !== "true" || tooltipEl.dataset.dayIndex !== activeIndex;

            if (shouldAnimate) {
              tooltipEl.style.transform = "";
              tooltipEl.classList.remove("tooltip-pop-bounce");
              // Force reflow so animation can restart cleanly when moving to another bar.
              void tooltipEl.offsetWidth;
              tooltipEl.classList.add("tooltip-pop-bounce");
            } else {
              tooltipEl.style.transform = "translateY(0) scale(1)";
            }

            tooltipEl.dataset.visible = "true";
            tooltipEl.dataset.dayIndex = activeIndex;
          },
        }

      },
    }),
    [compact, maxDuration, maxPatients, patientTickStep, dailyAverages, isDarkMode]
  );

  if (loading) {
    return <ShimmerLoader type="line" isDarkMode={isDarkMode} />;
  }

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
      className="responsive-chart-wrapper run-stay-responsive-wrapper"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: wrapperMaxHeight,
        minHeight: 0,
        margin: "0",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f5f8",
        borderRadius: "16px",
        transition: 'background-color 0.3s ease',
        padding: compact ? "10px 10px 0" : "16px 16px 0",
      }}
    >
      {/* Navigation buttons and week range */}
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: navHorizontalPadding,
          marginBottom: navBottomGap,
        }}
      >
        {/* Left Button */}
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: controlButtonSize,
            height: controlButtonSize,
            borderRadius: "50%",
            backgroundColor: isDarkMode ? "#404040" : "#f0f2f5",
            border: isDarkMode ? "1px solid #555555" : "1px solid #d9d9d9",
            cursor: "pointer",
            boxShadow: isDarkMode 
              ? "0 4px 10px rgba(0,0,0,0.4)" 
              : "0 4px 10px rgba(0,0,0,0.15)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? "#4a5568" : "#e6f4ff";
            e.currentTarget.style.transform = compact ? "scale(1.08)" : "scale(1.12)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(24,144,255,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? "#404040" : "#f0f2f5";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = isDarkMode 
              ? "0 4px 10px rgba(0,0,0,0.4)" 
              : "0 4px 10px rgba(0,0,0,0.15)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.95)";
            e.currentTarget.style.backgroundColor = isDarkMode ? "#2d3748" : "#cce6ff";
            e.currentTarget.style.boxShadow = "0 3px 8px rgba(24,144,255,0.3)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = compact ? "scale(1.08)" : "scale(1.12)";
            e.currentTarget.style.backgroundColor = isDarkMode ? "#4a5568" : "#e6f4ff";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(24,144,255,0.4)";
          }}
        >
          <ChevronLeft size={controlIconSize} color="#1890ff" strokeWidth={3} />
        </button>

        {/* Week range display with smooth gradient transition */}
        {(() => {
          const today = new Date();
          const day = today.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          const monday = new Date(today);
          monday.setDate(today.getDate() + diff + weekOffset * 7);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          const isCurrentWeek = today >= monday && today <= sunday;

          // Determine how much of the week should be “filled” (0-100%)
          const fillPercent = isCurrentWeek
            ? ((today.getDay() === 0 ? 6 : today.getDay() - 1) + 1) / 7 * 100
            : 100;

          return (
            <div
              style={{
                flex: 1,
                position: "relative",
                textAlign: "center",
                fontSize: weekBannerFontSize,
                fontWeight: 700,
                color: "#1890ff",
                letterSpacing: "1px",
                borderRadius: "16px",
                padding: weekBannerPadding,
                boxShadow: isDarkMode 
                  ? "0 4px 12px rgba(0,0,0,0.4)" 
                  : "0 4px 12px rgba(0,0,0,0.1)",
                overflow: "hidden",
                background: isDarkMode 
                  ? "rgba(52, 63, 74, 0.8)" 
                  : "linear-gradient(to right,rgba(196, 237, 255, 0.8))",
                transition: "background 0.3s ease, box-shadow 0.3s ease",
              }}
            >
              {/* Animated gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${fillPercent}%`,
                  background: isDarkMode 
                    ? "rgba(52, 63, 74, 0.8)" 
                    : "linear-gradient(to right,rgba(196, 237, 255, 0.8))",
                  transition: "width 0.8s ease-in-out, background 0.3s ease",
                  zIndex: 0,
                }}
              />

              {/* Week text */}
              <div style={{ position: "relative", zIndex: 1 }}>{weekRange}</div>
            </div>
          );
        })()}

        {/* Right Button with hover tooltip and click effect */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              if (!isNextWeekFuture) setWeekOffset((w) => w + 1);
            }}
            onMouseEnter={() => isNextWeekFuture && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: controlButtonSize,
              height: controlButtonSize,
              borderRadius: "50%",
              backgroundColor: isDarkMode ? "#404040" : "#f0f2f5",
              border: isDarkMode ? "1px solid #555555" : "1px solid #d9d9d9",
              cursor: isNextWeekFuture ? "not-allowed" : "pointer",
              opacity: isNextWeekFuture ? 0.8 : 1,
              boxShadow: isDarkMode 
                ? "0 4px 10px rgba(0,0,0,0.4)" 
                : "0 4px 10px rgba(0,0,0,0.15)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              if (!isNextWeekFuture) {
                e.currentTarget.style.backgroundColor = isDarkMode ? "#4a5568" : "#e6f4ff";
                e.currentTarget.style.transform = compact ? "scale(1.08)" : "scale(1.12)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(24,144,255,0.4)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? "#404040" : "#f0f2f5";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = isDarkMode 
                ? "0 4px 10px rgba(0,0,0,0.4)" 
                : "0 4px 10px rgba(0,0,0,0.15)";
            }}
            onMouseDown={(e) => {
              if (!isNextWeekFuture) {
                e.currentTarget.style.transform = "scale(0.95)";
                e.currentTarget.style.backgroundColor = isDarkMode ? "#2d3748" : "#cce6ff";
                e.currentTarget.style.boxShadow = "0 3px 8px rgba(24,144,255,0.3)";
              }
            }}
            onMouseUp={(e) => {
              if (!isNextWeekFuture) {
                e.currentTarget.style.transform = compact ? "scale(1.08)" : "scale(1.12)";
                e.currentTarget.style.backgroundColor = isDarkMode ? "#4a5568" : "#e6f4ff";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(24,144,255,0.4)";
              }
            }}
          >
            <ChevronRight size={controlIconSize} color="#1890ff" strokeWidth={3} />
          </button>

          {/* Tooltip */}
          {showTooltip && isNextWeekFuture && (
            <div
              style={{
                position: "absolute",
                top: tooltipOffsetTop,
                right: tooltipOffsetRight,
                backgroundColor: "#242323ff",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                opacity: 1,
                transition: "opacity 0.3s ease",
              }}
            >
              No patient data available
            </div>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div
        className={`chart-container run-stay-chart-container ${
          compact ? "run-stay-chart-container--compact" : ""
        }`}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: 0,
          maxHeight: chartAreaMaxHeight,
          height: "100%",
          overflow: "hidden",
          padding: chartPadding,
          position: "relative",
          boxSizing: "border-box",
          backgroundColor: chartSurfaceBg,
          borderRadius: "16px",
          border: chartSurfaceBorder,
          boxShadow: chartSurfaceShadow,
          transition: "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <button
          type="button"
          aria-label="What am I seeing?"
          onClick={openInfoModal}
          style={{
            position: "absolute",
            top: compact ? "6px" : "8px",
            right: compact ? "6px" : "8px",
            width: infoButtonSize,
            height: infoButtonSize,
            borderRadius: "999px",
            border: "none",
            background: "transparent",
            color: isDarkMode ? "#d9d9d9" : "#595959",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 12,
            transition: "transform 0.2s ease, color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.06)";
            e.currentTarget.style.color = "#1890ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.color = isDarkMode ? "#d9d9d9" : "#595959";
          }}
        >
          <Info size={infoIconSize} strokeWidth={2.2} />
        </button>
        <style>{`
          .run-stay-chart-container {
            overflow: hidden !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .run-stay-chart-container canvas {
            background-color: ${chartSurfaceBg} !important;
            border-radius: 16px !important;
            transition: background-color 0.3s ease;
            max-width: 100% !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
          }
          .run-stay-chart-container--compact canvas {
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            max-width: 100% !important;
          }
          .run-stay-chart-container div {
            overflow: hidden !important;
            max-width: 100% !important;
          }
          .run-stay-chart-container div canvas {
            max-width: 100% !important;
            width: 100% !important;
          }
          .run-stay-responsive-wrapper {
            max-width: 100% !important;
            overflow: hidden !important;
          }
          
          /* Dark mode menu button fix */
          [data-theme="dark"] .antd5-btn.antd5-btn-default.antd5-btn-color-default.antd5-btn-variant-outlined,
          [data-theme="dark"] .superset-button.superset-button-tertiary,
          [data-theme="dark"] button[data-test="actions-trigger"] {
            background-color: rgba(45, 45, 45, 0.9) !important;
            border-color: rgba(64, 64, 64, 0.8) !important;
            color: #e0e0e0 !important;
          }
          
          [data-theme="dark"] .antd5-btn.antd5-btn-default.antd5-btn-color-default.antd5-btn-variant-outlined:hover,
          [data-theme="dark"] .superset-button.superset-button-tertiary:hover,
          [data-theme="dark"] button[data-test="actions-trigger"]:hover {
            background-color: rgba(64, 64, 64, 0.9) !important;
            border-color: rgba(96, 96, 96, 0.9) !important;
            color: #ffffff !important;
          }
          
          /* Scrollbar fixes */
          .dashboard-component-tabs-content,
          .dashboard-component-chart-holder {
            overflow: visible !important;
          }
        `}</style>
        <div 
          ref={chartContainerRef}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
            maxWidth: "100%",
            boxSizing: "border-box"
          }}
        >
          <Chart
            ref={chartRef}
            type="line"
            key={`${refreshKey ?? "stay-chart"}-${isDarkMode ? "dark" : "light"}`}
            data={data}
            options={options}
            plugins={[backgroundPlugin, noDataPlugin, dataLabelsPlugin]}
            style={{ 
              width: "100%", 
              height: "100%", 
              maxWidth: "100%", 
              maxHeight: "100%",
              minWidth: 0,
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {showInfoModal && (
        <div
          role="presentation"
          onClick={closeInfoModal}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            background: infoPanelReady
              ? isDarkMode
                ? "rgba(6, 10, 16, 0.62)"
                : "rgba(15, 23, 42, 0.34)"
              : "rgba(0, 0, 0, 0)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            padding: "8px 8px 14px",
            transition: "background-color 280ms cubic-bezier(0.2, 0.9, 0.2, 1)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chart explanation"
            onClick={(e) => e.stopPropagation()}
            style={{
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
              width: 'clamp(320px, 90vw, 500px)',
              maxWidth: 'calc(100% - 20px)',
              borderRadius: '16px',
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
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Weekly trend line</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  The blue line shows average stay time per day across the selected week.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Patient count bars</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  The green bars show how many patients were included for each day.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Week navigation</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Use the left and right arrows to move between weeks and compare trends.
                </div>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)', fontWeight: 700, color: '#1890ff' }}>Hover details</div>
                <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>
                  Hover a day to see patients counted, average stay, and daily change from the previous day.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
