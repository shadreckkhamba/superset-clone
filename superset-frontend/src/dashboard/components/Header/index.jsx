import { extendedDayjs } from 'src/utils/dates';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  styled,
  css,
  isFeatureEnabled,
  FeatureFlag,
  t,
  getExtensionsRegistry,
  useTheme,
} from '@superset-ui/core';
import { Global } from '@emotion/react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  LOG_ACTIONS_PERIODIC_RENDER_DASHBOARD,
  LOG_ACTIONS_FORCE_REFRESH_DASHBOARD,
  LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD,
} from 'src/logger/LogUtils';
import { Icons } from 'src/components/Icons';
import { Button } from 'src/components/';
import { findPermission } from 'src/utils/findPermission';
import { Tooltip } from 'src/components/Tooltip';
import { safeStringify } from 'src/utils/safeStringify';
import PublishedStatus from 'src/dashboard/components/PublishedStatus';
import UndoRedoKeyListeners from 'src/dashboard/components/UndoRedoKeyListeners';
import PropertiesModal from 'src/dashboard/components/PropertiesModal';
import {
  UNDO_LIMIT,
  SAVE_TYPE_OVERWRITE,
  DASHBOARD_POSITION_DATA_LIMIT,
  DASHBOARD_HEADER_ID,
} from 'src/dashboard/util/constants';
import setPeriodicRunner, {
  stopPeriodicRender,
} from 'src/dashboard/util/setPeriodicRunner';
import ReportModal from 'src/features/reports/ReportModal';
import DeleteModal from 'src/components/DeleteModal';
import { deleteActiveReport } from 'src/features/reports/ReportModal/actions';
import { PageHeaderWithActions } from 'src/components/PageHeaderWithActions';
import DashboardEmbedModal from '../EmbeddedModal';
import OverwriteConfirm from '../OverwriteConfirm';
import { ENDPOINTS } from '../../../config/endpoints';
import {
  addDangerToast,
  addSuccessToast,
  addWarningToast,
} from '../../../components/MessageToasts/actions';
import {
  dashboardTitleChanged,
  redoLayoutAction,
  undoLayoutAction,
  updateDashboardTitle,
  clearDashboardHistory,
} from '../../actions/dashboardLayout';
import {
  fetchCharts,
  fetchFaveStar,
  maxUndoHistoryToast,
  onChange,
  onRefresh,
  saveDashboardRequest,
  saveFaveStar,
  savePublished,
  setEditMode,
  setMaxUndoHistoryExceeded,
  setRefreshFrequency,
  setUnsavedChanges,
  updateCss,
} from '../../actions/dashboardState';
import { logEvent } from '../../../logger/actions';
import { dashboardInfoChanged } from '../../actions/dashboardInfo';
import isDashboardLoading from '../../util/isDashboardLoading';
import { useChartIds } from '../../util/charts/useChartIds';
import { useDashboardMetadataBar } from './useDashboardMetadataBar';
import { useHeaderActionsMenu } from './useHeaderActionsDropdownMenu';
import { useLocation } from 'react-router-dom';
import Modal from 'src/components/Modal';
import { Popover } from 'antd';
import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';
import * as echarts from 'echarts';
import html2canvas from 'html2canvas';
import BigNumberStay from 'src/plugins/custom-charts/BigNumberStay';
import PieChartStay from 'src/plugins/custom-charts/PieChartStay';
import RunChartStay from 'src/plugins/custom-charts/RunChartStay';
import logoBase64 from 'src/dashboard/components/Header/logoBase64';
import LastUpdatedBadge from 'src/dashboard/components/Header/lastUpdateBadge';
import DashboardSlideshow from 'src/dashboard/components/DashboardSlideshow';
import { RotateCw } from 'lucide-react';
import { T } from 'lodash/fp';
import './responsive-dashboard.css';

const extensionsRegistry = getExtensionsRegistry();

const headerContainerStyle = theme => css`
  border-bottom: 1px solid ${theme.colors.grayscale.light2};

  .header-with-actions {
    transition: background-color 0.28s ease, backdrop-filter 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
  }

  [data-test='dashboard-view-switch'] {
    border-color: transparent !important;
    backdrop-filter: blur(12px) saturate(130%);
  }

  [data-test='dashboard-view-switch'] .dashboard-view-switch-pill {
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.96);
    box-shadow:
      0 12px 28px rgba(15, 23, 42, 0.12),
      0 4px 12px rgba(15, 23, 42, 0.1);
    transition: box-shadow 0.28s ease, border-color 0.28s ease, background 0.28s ease;
  }

  [data-test='dashboard-view-switch'] .dashboard-view-switch-pill .antd5-switch {
    background-color: rgba(24, 144, 255, 0.16) !important;
    border: 1px solid rgba(24, 144, 255, 0.7) !important;
    outline: 3px solid rgba(55, 166, 255, 0.95);
    outline-offset: 3px;
    box-shadow: none !important;
  }

  [data-test='dashboard-view-switch'] .dashboard-view-switch-pill .antd5-switch-checked {
    background-color: #1890ff !important;
  }

  body.dark-theme & [data-test='dashboard-view-switch'] .dashboard-view-switch-pill,
  [data-theme='dark'] & [data-test='dashboard-view-switch'] .dashboard-view-switch-pill {
    background: rgba(16, 20, 26, 0.92);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.4);
  }

  body.dark-theme & [data-test='dashboard-view-switch'] .dashboard-view-switch-pill .antd5-switch,
  [data-theme='dark'] & [data-test='dashboard-view-switch'] .dashboard-view-switch-pill .antd5-switch {
    background-color: rgba(79, 195, 247, 0.18) !important;
    border-color: rgba(79, 195, 247, 0.7) !important;
    outline: 3px solid rgba(79, 195, 247, 0.95);
    outline-offset: 3px;
    box-shadow: none !important;
  }

  body.dark-theme & [data-test='dashboard-view-switch'] .dashboard-view-switch-pill .antd5-switch-checked,
  [data-theme='dark'] & [data-test='dashboard-view-switch'] .dashboard-view-switch-pill .antd5-switch-checked {
    background-color: #4fc3f7 !important;
  }

  &.dashboard-header-container--collapsed .header-with-actions {
    background-color: rgba(236, 239, 243, 0.72) !important;
    backdrop-filter: blur(14px) saturate(140%) !important;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12) !important;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08) !important;
  }

  body.dark-theme &.dashboard-header-container--collapsed .header-with-actions,
  [data-theme='dark'] &.dashboard-header-container--collapsed .header-with-actions {
    background-color: rgba(20, 24, 30, 0.72) !important;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
`;

const editButtonStyle = theme => css`
  color: ${theme.colors.primary.dark2};
`;

const actionButtonsStyle = theme => css`
  display: flex;
  align-items: center;

  .action-schedule-report {
    margin-left: ${theme.gridUnit * 2}px;
  }

  .undoRedo {
    display: flex;
    margin-right: ${theme.gridUnit * 2}px;
  }
`;

const StyledUndoRedoButton = styled(Button)`
  // TODO: check if we need this
  padding: 0;
  &:hover {
    background: transparent;
  }
`;

const ScrollToTopButton = styled('button')`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1400;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: linear-gradient(135deg, #ffffff 0%, #eef2f7 100%);
  color: ${({ theme }) => theme.colors.grayscale.dark1};
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18),
    0 6px 14px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
  cursor: pointer;
  transition: opacity 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;

  &[data-visible='true'] {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  &:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 20px 46px rgba(15, 23, 42, 0.24),
      0 8px 18px rgba(15, 23, 42, 0.16);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.primary.light2};
    outline-offset: 2px;
  }

  &[data-theme='dark'] {
    border-color: rgba(148, 163, 184, 0.28);
    background: linear-gradient(
      135deg,
      rgba(30, 41, 59, 0.96) 0%,
      rgba(15, 23, 42, 0.96) 100%
    );
    color: #e2e8f0;
    box-shadow: 0 18px 40px rgba(2, 6, 23, 0.55),
      0 6px 14px rgba(2, 6, 23, 0.45);
  }

  &[data-theme='dark']:hover {
    box-shadow: 0 20px 46px rgba(2, 6, 23, 0.62),
      0 8px 18px rgba(2, 6, 23, 0.5);
  }

  @media (max-width: 768px) {
    right: 16px;
    bottom: 16px;
    width: 42px;
    height: 42px;
  }
`;

const undoRedoStyle = theme => css`
  color: ${theme.colors.grayscale.light1};
  &:hover {
    color: ${theme.colors.grayscale.base};
  }
`;

const undoRedoEmphasized = theme => css`
  color: ${theme.colors.grayscale.base};
`;

const undoRedoDisabled = theme => css`
  color: ${theme.colors.grayscale.light2};
`;

const saveBtnStyle = theme => css`
  min-width: ${theme.gridUnit * 17}px;
  height: ${theme.gridUnit * 8}px;
  span > :first-of-type {
    margin-right: 0;
  }
`;

const discardBtnStyle = theme => css`
  min-width: ${theme.gridUnit * 22}px;
  height: ${theme.gridUnit * 8}px;
`;

const discardChanges = () => {
  const url = new URL(window.location.href);

  url.searchParams.delete('edit');
  window.location.assign(url);
};

const Header = () => {

  //State management
  const [isReportsModalVisible, setReportsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  const [reportFormat, setReportFormat] = useState('image');
  const [titleType, setTitleType] = useState('default');
  const [reportTitle, setReportTitle] = useState('Untitled Report');
  const allNativeFilters = useSelector(state => state.nativeFilters.filters);

  const openReportsModal = () => setReportsModalVisible(true);
  const closeReportsModal = () => setReportsModalVisible(false);

  const theme = useTheme();
  const dispatch = useDispatch();
  const [didNotifyMaxUndoHistoryToast, setDidNotifyMaxUndoHistoryToast] =
    useState(false);
  const [emphasizeUndo, setEmphasizeUndo] = useState(false);
  const [emphasizeRedo, setEmphasizeRedo] = useState(false);
  const [showingPropertiesModal, setShowingPropertiesModal] = useState(false);
  const [showingEmbedModal, setShowingEmbedModal] = useState(false);
  const [showingReportModal, setShowingReportModal] = useState(false);
  const [currentReportDeleting, setCurrentReportDeleting] = useState(null);
  const dashboardInfo = useSelector(state => state.dashboardInfo);
  const layout = useSelector(state => state.dashboardLayout.present);
  const undoLength = useSelector(state => state.dashboardLayout.past.length);
  const redoLength = useSelector(state => state.dashboardLayout.future.length);
  const dataMask = useSelector(state => state.dataMask);
  const user = useSelector(state => state.user);
  const chartIds = useChartIds();
  const [refreshKey, setRefreshKey] = useState(0);
  const [bigNumberResetKey, setBigNumberResetKey] = useState(0);
  const [bigNumberRefreshKey, setBigNumberRefreshKey] = useState(0);
  const [pieResetKey, setPieResetKey] = useState(0);
  const [pieRefreshKey, setPieRefreshKey] = useState(0);
  const [runChartResetKey, setRunChartResetKey] = useState(0);
  const [runChartRefreshKey, setRunChartRefreshKey] = useState(0);
  const [bigNumberReloading, setBigNumberReloading] = useState(false);
  const [pieReloading, setPieReloading] = useState(false);
  const [runChartReloading, setRunChartReloading] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(() => {
    if (typeof window === 'undefined' || window.self !== window.top) {
      return false;
    }

    return new URLSearchParams(window.location.search).get('slideshow') === '1';
  });
  
  //Get the dashboard slug from the URL query parameters
  const query = new URLSearchParams(location.search);
  const isStandalone = query.get('standalone') === '1';
  const isSlideshow = query.get('slideshow') === '1';
  //debugging
  console.log('Rendering Header - isStandalone:', isStandalone, 'isSlideshow:', isSlideshow);
  
  const [selectedFilterIds, setSelectedFilterIds] = useState([]);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const isViewingDashboard = /^\/superset\/dashboard\/\d+$/.test(location.pathname);
  
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  // Avg stay model
  const [isAvgStayModalOpen, setAvgStayModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    const darkModeParam = params.get('dark');
    if (darkModeParam === '1') {
      return true;
    }
    if (darkModeParam === '0') {
      return false;
    }

    const storedDarkMode = window.localStorage.getItem(
      'superset-dashboard-dark-mode',
    );
    if (storedDarkMode === '1') {
      return true;
    }
    if (storedDarkMode === '0') {
      return false;
    }

    if (params.get('standalone') === '1') {
      const hour = new Date().getHours();
      return hour >= 18 || hour < 6;
    }

    return false;
  });
  const [isPatientStayView, setIsPatientStayView] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return new URLSearchParams(window.location.search).get('view') === 'stay';
  });
  const [isTitleBarCollapsed] = useState(false);
  const [patientStayOverlayTop, setPatientStayOverlayTop] = useState(() =>
    isStandalone ? 64 : 112,
  );
  const isHeaderCollapsed = isTitleBarCollapsed;
  const darkModeRefreshRef = useRef(false);
  const titleBarRef = useRef(null);
  const expandDelayRef = useRef(null);
  const updateDarkModeUrlParam = useCallback(enabled => {
    if (window.self !== window.top) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (enabled) {
      params.set('dark', '1');
    } else {
      params.delete('dark');
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ''
    }${window.location.hash}`;

    window.history.replaceState(window.history.state, '', nextUrl);
  }, []);
  const updateSlideshowUrlParam = useCallback(enabled => {
    if (window.self !== window.top) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (enabled) {
      params.set('slideshow', '1');
      params.delete('standalone');
    } else {
      params.delete('slideshow');
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ''
    }${window.location.hash}`;

    window.history.replaceState(window.history.state, '', nextUrl);
  }, []);

  const openSlideshow = useCallback(() => {
    console.log('🎬 Opening slideshow - setting isSlideshowOpen to true');
    updateSlideshowUrlParam(true);
    setIsSlideshowOpen(true);
  }, [updateSlideshowUrlParam]);
  const closeSlideshow = useCallback(() => {
    console.log('🎬 Closing slideshow - setting isSlideshowOpen to false');
    updateSlideshowUrlParam(false);
    setIsSlideshowOpen(false);
  }, [updateSlideshowUrlParam]);

  useEffect(() => {
    const handleSlideshowMessage = event => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'superset-dashboard-exit-slideshow') {
        closeSlideshow();
        return;
      }

      if (event.data?.type === 'superset-dashboard-set-dark-mode') {
        setIsDarkMode(Boolean(event.data?.enabled));
      }
    };

    window.addEventListener('message', handleSlideshowMessage);

    return () => {
      window.removeEventListener('message', handleSlideshowMessage);
    };
  }, [closeSlideshow]);
  // Debug: Track slideshow state changes
  useEffect(() => {
    console.log('🎬 isSlideshowOpen state changed to:', isSlideshowOpen);
  }, [isSlideshowOpen]);

  // Initialize view based on URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const isStandaloneParam = params.get('standalone');
    const isSlideshowParam = params.get('slideshow');
    const shouldShowPatientStay = viewParam === 'stay';

    console.log('🔍 Header: URL parameters:', {
      view: viewParam,
      standalone: isStandaloneParam,
      slideshow: isSlideshowParam,
      fullURL: window.location.href,
    });

    console.log(
      shouldShowPatientStay
        ? '✅ Header: Switching to Patient Stay Times view'
        : '📊 Header: Staying on Clinical Service Monitoring view',
    );
    setIsPatientStayView(shouldShowPatientStay);
  }, []);

  const updatePatientStayOverlayTop = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const fallbackTop = isStandalone ? 64 : isHeaderCollapsed ? 64 : 112;
    const selectors = [
      '[data-test="dashboard-header-container"]',
      '[data-test="dashboard-mode-title-bar"]',
      '[data-test="top-level-tabs"]',
    ];

    const measuredBottom = selectors.reduce((maxBottom, selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return maxBottom;
      }

      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      const isHidden =
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        Number(computedStyle.opacity) === 0 ||
        rect.height <= 0;

      if (isHidden) {
        return maxBottom;
      }

      return Math.max(maxBottom, rect.bottom);
    }, 0);

    setPatientStayOverlayTop(
      Math.max(fallbackTop, Math.ceil(measuredBottom)),
    );
  }, [isHeaderCollapsed, isStandalone]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let animationFrameId = 0;
    let settleTimerId = 0;
    let resizeObserver;

    const syncOverlayTop = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        updatePatientStayOverlayTop();
      });
    };

    const observedElements = [
      document.querySelector('[data-test="dashboard-header-container"]'),
      document.querySelector('[data-test="dashboard-mode-title-bar"]'),
      document.querySelector('[data-test="top-level-tabs"]'),
    ].filter(Boolean);

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(syncOverlayTop);
      observedElements.forEach(element => resizeObserver.observe(element));
    }

    syncOverlayTop();
    settleTimerId = window.setTimeout(syncOverlayTop, 380);

    window.addEventListener('resize', syncOverlayTop);
    document.addEventListener('fullscreenchange', syncOverlayTop);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (settleTimerId) {
        window.clearTimeout(settleTimerId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncOverlayTop);
      document.removeEventListener('fullscreenchange', syncOverlayTop);
    };
  }, [
    isHeaderCollapsed,
    isPatientStayView,
    isSlideshow,
    isStandalone,
    updatePatientStayOverlayTop,
  ]);

  const closeAvgStayModal = () => setAvgStayModalOpen(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'superset-dashboard-dark-mode',
        isDarkMode ? '1' : '0',
      );
    } catch (error) {
      console.error('Failed to persist dark mode preference:', error);
    }

    updateDarkModeUrlParam(isDarkMode);

    const applyDarkTheme = async () => {
      document.body.classList.add('theme-transitioning');

      if (isDarkMode) {
        try {
          await import('src/styles/dark-theme.css');
          document.body.classList.add('dark-theme');
          console.log('Dark mode activated');
        } catch (error) {
          console.error('Failed to load dark theme CSS:', error);
        }
      } else {
        document.body.classList.remove('dark-theme');
        console.log('Dark mode deactivated');
      }

      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, 500);
    };

    applyDarkTheme();

    return () => {
      document.body.classList.remove('dark-theme', 'theme-transitioning');
    };
  }, [isDarkMode, updateDarkModeUrlParam]);

  useEffect(() => {
    let rafId = null;

    const getScrollTop = () => {
      const overlayEl = document.querySelector('.patient-stay-overlay');
      if (isPatientStayView && overlayEl) {
        return overlayEl.scrollTop;
      }

      const wrapperEl = document.querySelector(
        '[data-test="dashboard-content-wrapper"]',
      );
      if (
        wrapperEl &&
        wrapperEl.scrollHeight > wrapperEl.clientHeight + 1
      ) {
        return wrapperEl.scrollTop;
      }

      return (
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    const updateCollapsedState = () => {
      const scrollTop = getScrollTop();
      const scrollTopVisibleThreshold = 180;

      const shouldShowScrollToTop = scrollTop > scrollTopVisibleThreshold;
      setShowScrollToTop(prev =>
        prev === shouldShowScrollToTop ? prev : shouldShowScrollToTop,
      );

      if (expandDelayRef.current) {
        clearTimeout(expandDelayRef.current);
        expandDelayRef.current = null;
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateCollapsedState();
      });
    };

    updateCollapsedState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    const overlayEl = document.querySelector('.patient-stay-overlay');
    const wrapperEl = document.querySelector(
      '[data-test="dashboard-content-wrapper"]',
    );
    if (overlayEl) {
      overlayEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    if (wrapperEl) {
      wrapperEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (overlayEl) {
        overlayEl.removeEventListener('scroll', handleScroll);
      }
      if (wrapperEl) {
        wrapperEl.removeEventListener('scroll', handleScroll);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (expandDelayRef.current) {
        clearTimeout(expandDelayRef.current);
        expandDelayRef.current = null;
      }
    };
  }, [isPatientStayView]);

  const scrollToTop = useCallback(() => {
    if (isPatientStayView) {
      const overlayEl = document.querySelector('.patient-stay-overlay');
      if (overlayEl) {
        overlayEl.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const wrapperEl = document.querySelector(
      '[data-test="dashboard-content-wrapper"]',
    );
    if (wrapperEl && wrapperEl.scrollHeight > wrapperEl.clientHeight + 1) {
      wrapperEl.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isPatientStayView]);

  useEffect(() => {
    const fetchLastUpdated = () => {
      fetch(ENDPOINTS.LAST_UPDATE_STATUS)
        .then(res => res.json())
        .then(data => {
          if (data.last_updated) {
            setLastUpdatedTime(data.last_updated);
          } else {
            setLastUpdatedTime(null);
          }
        })
        .catch(err => console.error('Failed to fetch last updated time:', err));
    };

    fetchLastUpdated(); 

    const interval = setInterval(fetchLastUpdated, 2000); 
    return () => clearInterval(interval);
  }, []);

  //Handle checkbox toggle
  const toggleFilterSelection = filterId => {
    setSelectedFilterIds(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId],
    );
  };  

    const appliedFilters = useMemo(() => {
    
      return (
        Object.entries(dataMask || {})
          .filter(([filterId]) => filterId.startsWith('NATIVE_FILTER-'))
          .map(([filterId, filterData]) => {
            const filterDefinition = allNativeFilters?.[filterId];
            const label = filterDefinition?.label || filterDefinition?.name || filterId;
    
            const rawValue = filterData?.filterState?.value;
            const value = Array.isArray(rawValue)
              ? rawValue
              : rawValue != null
              ? [rawValue]
              : [];
    
            return { id: filterId, label, value };
          })
          .filter(f => f.value.length)
      );
    }, [dataMask, allNativeFilters]);

  const formatMenu = (
    <div
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
    >
    <Button
        buttonStyle="link"
        style={{
          display: 'block',
          textAlign: 'left',
          color: 'black',
          backgroundColor: '#f5f5f5',
          padding: '8px',
        }}
        onClick={() => {
          console.log('Save as Image');
          console.log('Filters:', selectedFilterIds);
          console.log('Charts:', selectedChartIds);
          setIsPopoverVisible(false);
          setTimeout(() => {
            handleSaveAsImage();  //call image save function here
            closeReportsModal();
          }, 0);
        }}
      >
        {t('Download Image')}
      </Button>

      <Button
      buttonStyle="link"
      style={{
        display: 'block', 
        textAlign: 'left',
        color: 'black',
        backgroundColor: '#f5f5f5',
        padding: '8px',
      }}
      onClick={() => {
        setIsPopoverVisible(false);
        setTimeout(() => {
          handleSaveAsPDF();
          closeReportsModal();
        }, 300);
      }}
    >
      {t('Download as PDF')}
</Button>

    </div>
   );

    // track which chart panels are selected
    const [selectedChartIds, setSelectedChartIds] = useState([]);

    // toggle a panel’s inclusion in the selection
    const toggleChartSelection = panelId => {
      setSelectedChartIds(prev =>
        prev.includes(panelId)
          ? prev.filter(id => id !== panelId)
          : [...prev, panelId],
      );
    };

   // selecting charts to be included in the report, now including layout metadata
  const chartPanels = useSelector(state => {
    const layoutItems = Object.values(state.dashboardLayout.present || {});
    console.log('⭑ dashboardLayout.present items:', layoutItems);
    return layoutItems
      .filter(item => item?.meta && typeof item.meta.chartId === 'number')
      .map(item => ({
        id: item.id,
        chartId: item.meta.chartId,
        title:
          item.meta.sliceNameOverride ||
          item.meta.sliceName ||
          `Chart ${item.meta.chartId}`,
        layout: item.layout || item.component?.props?.layout || { x: 0, y: 0, w: 1, h: 1 },
        altLayout1: item.component?.props?.layout,
        altLayout2: item.props?.layout,
        altLayout3: item.meta?.position,
      }));
  });
  useEffect(() => {
    if (!isReportsModalVisible && isPopoverVisible) {
      setIsPopoverVisible(false);
    }
  }, [isReportsModalVisible, isPopoverVisible]);

  
  const {
    expandedSlices,
    refreshFrequency,
    shouldPersistRefreshFrequency,
    customCss,
    colorNamespace,
    colorScheme,
    isStarred,
    isPublished,
    hasUnsavedChanges,
    maxUndoHistoryExceeded,
    editMode,
    lastModifiedTime,
  } = useSelector(
    state => ({
      expandedSlices: state.dashboardState.expandedSlices,
      refreshFrequency: state.dashboardState.refreshFrequency,
      shouldPersistRefreshFrequency:
        !!state.dashboardState.shouldPersistRefreshFrequency,
      customCss: state.dashboardState.css,
      colorNamespace: state.dashboardState.colorNamespace,
      colorScheme: state.dashboardState.colorScheme,
      isStarred: !!state.dashboardState.isStarred,
      isPublished: !!state.dashboardState.isPublished,
      hasUnsavedChanges: !!state.dashboardState.hasUnsavedChanges,
      maxUndoHistoryExceeded: !!state.dashboardState.maxUndoHistoryExceeded,
      editMode: !!state.dashboardState.editMode,
      lastModifiedTime: state.lastModifiedTime,
    }),
    shallowEqual,
  );
  const isLoading = useSelector(state => isDashboardLoading(state.charts));

  // Debug: Log when isPatientStayView changes
  useEffect(() => {
    console.log('🔄 Header: isPatientStayView changed to:', isPatientStayView);
    console.log('🔄 Header: Current state:', {
      isPatientStayView,
      isSlideshow,
      isStandalone,
      editMode,
      shouldRenderOverlay: !editMode && (!isStandalone || isSlideshow)
    });
  }, [isPatientStayView, isSlideshow, isStandalone, editMode]);

  useEffect(() => {
    const shouldLockScroll =
      !editMode && (!isStandalone || isSlideshow) && isPatientStayView;
    const className = 'patient-stay-scroll-lock';
    const root = document.documentElement;
    const wrapperEl = document.querySelector(
      '[data-test="dashboard-content-wrapper"]',
    );

    if (shouldLockScroll) {
      document.body.classList.add(className);
      root.classList.add(className);
      wrapperEl?.classList.add(className);
    } else {
      document.body.classList.remove(className);
      root.classList.remove(className);
      wrapperEl?.classList.remove(className);
    }

    return () => {
      document.body.classList.remove(className);
      root.classList.remove(className);
      wrapperEl?.classList.remove(className);
    };
  }, [editMode, isSlideshow, isStandalone, isPatientStayView]);

  useEffect(() => {
    if (!isPatientStayView) {
      return undefined;
    }

    const triggerResize = () => {
      window.dispatchEvent(new Event('resize'));
    };

    const rafId = requestAnimationFrame(triggerResize);
    const timeoutIds = [120, 360, 720].map(delay =>
      window.setTimeout(triggerResize, delay),
    );

    return () => {
      cancelAnimationFrame(rafId);
      timeoutIds.forEach(id => window.clearTimeout(id));
    };
  }, [isPatientStayView]);

  const refreshTimer = useRef(0);
  const ctrlYTimeout = useRef(0);
  const ctrlZTimeout = useRef(0);

  const dashboardTitle = layout[DASHBOARD_HEADER_ID]?.meta?.text;
  const { slug } = dashboardInfo;
  const actualLastModifiedTime = Math.max(
    lastModifiedTime,
    dashboardInfo.last_modified_time,
  );
  const boundActionCreators = useMemo(
    () =>
      bindActionCreators(
        {
          addSuccessToast,
          addDangerToast,
          addWarningToast,
          onUndo: undoLayoutAction,
          onRedo: redoLayoutAction,
          clearDashboardHistory,
          setEditMode,
          setUnsavedChanges,
          fetchFaveStar,
          saveFaveStar,
          savePublished,
          fetchCharts,
          updateDashboardTitle,
          updateCss,
          onChange,
          onSave: saveDashboardRequest,
          setMaxUndoHistoryExceeded,
          maxUndoHistoryToast,
          logEvent,
          setRefreshFrequency,
          onRefresh,
          dashboardInfoChanged,
          dashboardTitleChanged,
        },
        dispatch,
      ),
    [dispatch],
  );

  const startPeriodicRender = useCallback(
    interval => {
      let intervalMessage;

      if (interval) {
        const periodicRefreshOptions =
          dashboardInfo.common?.conf?.DASHBOARD_AUTO_REFRESH_INTERVALS;
        const predefinedValue = periodicRefreshOptions.find(
          option => Number(option[0]) === interval / 1000,
        );

        if (predefinedValue) {
          intervalMessage = t(predefinedValue[1]);
        } else {
          intervalMessage = extendedDayjs
            .duration(interval, 'millisecond')
            .humanize();
        }
      }

      const fetchCharts = (charts, force = false) =>
        boundActionCreators.fetchCharts(
          charts,
          force,
          interval * 0.2,
          dashboardInfo.id,
        );

      const periodicRender = () => {
        const { metadata } = dashboardInfo;
        const immune = metadata.timed_refresh_immune_slices || [];
        const affectedCharts = chartIds.filter(
          chartId => immune.indexOf(chartId) === -1,
        );

        boundActionCreators.logEvent(LOG_ACTIONS_PERIODIC_RENDER_DASHBOARD, {
          interval,
          chartCount: affectedCharts.length,
        });

	if (!isStandalone) {
         boundActionCreators.addWarningToast(
           t(
             `This dashboard is currently auto refreshing; the next auto refresh will be in %s.`,
             intervalMessage,
           ),
         );
	}
        if (
          dashboardInfo.common?.conf?.DASHBOARD_AUTO_REFRESH_MODE === 'fetch'
        ) {
          // force-refresh while auto-refresh in dashboard
          return fetchCharts(affectedCharts);
        }
        return fetchCharts(affectedCharts, true);
      };

      refreshTimer.current = setPeriodicRunner({
        interval,
        periodicRender,
        refreshTimer: refreshTimer.current,
      });
    },
    [boundActionCreators, chartIds, dashboardInfo],
  );

  const lastUpdatedRef = useRef(0);

  useEffect(() => {
    if (!isStandalone) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(ENDPOINTS.LAST_UPDATE_STATUS_SECONDARY);
        const data = await res.json();

        const apiTimestamp = new Date(data.last_updated).getTime();
        if (apiTimestamp > lastUpdatedRef.current) {
          console.log('API change detected — refreshing charts');
          lastUpdatedRef.current = apiTimestamp;

          const immune = dashboardInfo.metadata?.timed_refresh_immune_slices || [];
          const affectedCharts = chartIds.filter(id => !immune.includes(id));
  
           boundActionCreators.fetchCharts(affectedCharts, true, 0, dashboardInfo.id);
        }
      } catch (err) {
        console.error('Failed to poll update status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [chartIds, dashboardInfo.id, dashboardInfo.metadata, isStandalone, boundActionCreators]);

  useEffect(() => {
    if (UNDO_LIMIT - undoLength <= 0 && !didNotifyMaxUndoHistoryToast) {
      setDidNotifyMaxUndoHistoryToast(true);
      boundActionCreators.maxUndoHistoryToast();
    }
    if (undoLength > UNDO_LIMIT && !maxUndoHistoryExceeded) {
      boundActionCreators.setMaxUndoHistoryExceeded();
    }
  }, [
    boundActionCreators,
    didNotifyMaxUndoHistoryToast,
    maxUndoHistoryExceeded,
    undoLength,
  ]);

  useEffect(
    () => () => {
      stopPeriodicRender(refreshTimer.current);
      boundActionCreators.setRefreshFrequency(0);
      clearTimeout(ctrlYTimeout.current);
      clearTimeout(ctrlZTimeout.current);
    },
    [boundActionCreators],
  );

  const handleChangeText = useCallback(
    nextText => {
      if (nextText && dashboardTitle !== nextText) {
        boundActionCreators.updateDashboardTitle(nextText);
        boundActionCreators.onChange();
      }
    },
    [boundActionCreators, dashboardTitle],
  );

  const handleCtrlY = useCallback(() => {
    boundActionCreators.onRedo();
    setEmphasizeRedo(true);
    if (ctrlYTimeout.current) {
      clearTimeout(ctrlYTimeout.current);
    }
    ctrlYTimeout.current = setTimeout(() => {
      setEmphasizeRedo(false);
    }, 100);
  }, [boundActionCreators]);

  const handleCtrlZ = useCallback(() => {
    boundActionCreators.onUndo();
    setEmphasizeUndo(true);
    if (ctrlZTimeout.current) {
      clearTimeout(ctrlZTimeout.current);
    }
    ctrlZTimeout.current = setTimeout(() => {
      setEmphasizeUndo(false);
    }, 100);
  }, [boundActionCreators]);

  const forceRefresh = useCallback(() => {
    if (!isLoading) {
      boundActionCreators.logEvent(LOG_ACTIONS_FORCE_REFRESH_DASHBOARD, {
        force: true,
        interval: 0,
        chartCount: chartIds.length,
      });
      
      // Also refresh custom Patient Stay charts
      if (isPatientStayView) {
        handleRefreshBigNumberChart();
        handleRefreshPieChart();
        handleRefreshRunChart();
      }
      
      return boundActionCreators.onRefresh(chartIds, true, 0, dashboardInfo.id);
    }
    return false;
  }, [boundActionCreators, chartIds, dashboardInfo.id, isLoading, isPatientStayView]);

  const toggleEditMode = useCallback(() => {
    boundActionCreators.logEvent(LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD, {
      edit_mode: !editMode,
    });
    boundActionCreators.setEditMode(!editMode);
  }, [boundActionCreators, editMode]);

  const handleDashboardSwitch = useCallback(checked => {
    setIsPatientStayView(Boolean(checked));
  }, []);

  const overwriteDashboard = useCallback(() => {
    const currentColorNamespace =
      dashboardInfo?.metadata?.color_namespace || colorNamespace;
    const currentColorScheme =
      dashboardInfo?.metadata?.color_scheme || colorScheme;

    const data = {
      certified_by: dashboardInfo.certified_by,
      certification_details: dashboardInfo.certification_details,
      css: customCss,
      dashboard_title: dashboardTitle,
      last_modified_time: actualLastModifiedTime,
      owners: dashboardInfo.owners,
      roles: dashboardInfo.roles,
      slug,
      metadata: {
        ...dashboardInfo?.metadata,
        color_namespace: currentColorNamespace,
        color_scheme: currentColorScheme,
        positions: layout,
        refresh_frequency: shouldPersistRefreshFrequency
          ? refreshFrequency
          : dashboardInfo.metadata?.refresh_frequency,
      },
    };

    // make sure positions data less than DB storage limitation:
    const positionJSONLength = safeStringify(layout).length;
    const limit =
      dashboardInfo.common?.conf?.SUPERSET_DASHBOARD_POSITION_DATA_LIMIT ||
      DASHBOARD_POSITION_DATA_LIMIT;
    if (positionJSONLength >= limit) {
      boundActionCreators.addDangerToast(
        t(
          'Your dashboard is too large. Please reduce its size before saving it.',
        ),
      );
    } else {
      if (positionJSONLength >= limit * 0.9) {
        boundActionCreators.addWarningToast(
          t('Your dashboard is near the size limit.'),
        );
      }

      boundActionCreators.onSave(data, dashboardInfo.id, SAVE_TYPE_OVERWRITE);
    }
  }, [
    actualLastModifiedTime,
    boundActionCreators,
    colorNamespace,
    colorScheme,
    customCss,
    dashboardInfo.certification_details,
    dashboardInfo.certified_by,
    dashboardInfo.common?.conf?.SUPERSET_DASHBOARD_POSITION_DATA_LIMIT,
    dashboardInfo.id,
    dashboardInfo.metadata,
    dashboardInfo.owners,
    dashboardInfo.roles,
    dashboardTitle,
    layout,
    refreshFrequency,
    shouldPersistRefreshFrequency,
    slug,
  ]);

  const showPropertiesModal = useCallback(() => {
    setShowingPropertiesModal(true);
  }, []);

  const hidePropertiesModal = useCallback(() => {
    setShowingPropertiesModal(false);
  }, []);

  const showEmbedModal = useCallback(() => {
    setShowingEmbedModal(true);
  }, []);

  const hideEmbedModal = useCallback(() => {
    setShowingEmbedModal(false);
  }, []);

  const showReportModal = useCallback(() => {
    setShowingReportModal(true);
  }, []);

  const hideReportModal = useCallback(() => {
    setShowingReportModal(false);
  }, []);

  const metadataBar = useDashboardMetadataBar(dashboardInfo);

  const userCanEdit =
    dashboardInfo.dash_edit_perm && !dashboardInfo.is_managed_externally;
  const userCanShare = dashboardInfo.dash_share_perm;
  const userCanSaveAs = dashboardInfo.dash_save_perm;
  const userCanCurate =
    isFeatureEnabled(FeatureFlag.EmbeddedSuperset) &&
    findPermission('can_set_embedded', 'Dashboard', user.roles);
  const refreshLimit =
    dashboardInfo.common?.conf?.SUPERSET_DASHBOARD_PERIODICAL_REFRESH_LIMIT;
  const refreshWarning =
    dashboardInfo.common?.conf
      ?.SUPERSET_DASHBOARD_PERIODICAL_REFRESH_WARNING_MESSAGE;
  const isEmbedded = !dashboardInfo?.userId;

  const handleOnPropertiesChange = useCallback(
    updates => {
      boundActionCreators.dashboardInfoChanged({
        slug: updates.slug,
        metadata: JSON.parse(updates.jsonMetadata || '{}'),
        certified_by: updates.certifiedBy,
        certification_details: updates.certificationDetails,
        owners: updates.owners,
        roles: updates.roles,
      });
      boundActionCreators.setUnsavedChanges(true);
      boundActionCreators.dashboardTitleChanged(updates.title);
    },
    [boundActionCreators],
  );

  const NavExtension = extensionsRegistry.get('dashboard.nav.right');

  const editableTitleProps = useMemo(
    () => ({
      title: dashboardTitle,
      canEdit: userCanEdit && editMode,
      onSave: handleChangeText,
      placeholder: t('Add the name of the dashboard'),
      label: t('Dashboard title'),
      showTooltip: false,
    }),
    [dashboardTitle, editMode, handleChangeText, userCanEdit],
  );

  const certifiedBadgeProps = useMemo(
    () => ({
      certifiedBy: dashboardInfo.certified_by,
      details: dashboardInfo.certification_details,
    }),
    [dashboardInfo.certification_details, dashboardInfo.certified_by],
  );

  const faveStarProps = useMemo(
    () => ({
      itemId: dashboardInfo.id,
      fetchFaveStar: boundActionCreators.fetchFaveStar,
      saveFaveStar: boundActionCreators.saveFaveStar,
      isStarred,
      showTooltip: true,
    }),
    [
      boundActionCreators.fetchFaveStar,
      boundActionCreators.saveFaveStar,
      dashboardInfo.id,
      isStarred,
    ],
  );
  const showHeaderMetaBadges = false; // temporarily hide Draft/owner/updated badges

  const titlePanelAdditionalItems = useMemo(
    () => [
      showHeaderMetaBadges && !editMode && !isStandalone && (
        <PublishedStatus
          dashboardId={dashboardInfo.id}
          isPublished={isPublished}
          savePublished={boundActionCreators.savePublished}
          userCanEdit={userCanEdit}
          userCanSave={userCanSaveAs}
          visible={!editMode}
        />
      ),
      showHeaderMetaBadges &&
        !editMode &&
        !isStandalone &&
        !isEmbedded &&
        metadataBar,
    ],
    [
      boundActionCreators.savePublished,
      dashboardInfo.id,
      editMode,
      isStandalone,
      metadataBar,
      isEmbedded,
      isPublished,
      showHeaderMetaBadges,
      userCanEdit,
      userCanSaveAs,
    ],
  );
  const [timeNow, setTimeNow] = useState(new Date());
    useEffect(() => {
      const interval = setInterval(() => {
        setTimeNow(new Date());
      }, 60000); // Update every 60 seconds

      return () => clearInterval(interval);
    }, []);

 const rightPanelAdditionalItems = useMemo(() => {
   const now = new Date(timeNow);

   let lastUpdated;
   let isSynced = false;

   if (lastUpdatedTime) {
     const parsed = new Date(lastUpdatedTime);
     if (!isNaN(parsed.getTime())) {
       lastUpdated = parsed;
       isSynced = true;
       console.log('Using API time:', parsed);
  } else {
    console.warn('Invalid API date, fallback to snapped.');
    const snapped = new Date(now);  
    snapped.setMinutes(now.getMinutes() >= 30 ? 30 : 0, 0, 0);
    lastUpdated = snapped;
     }
   } else {
     const snapped = new Date(now);
     snapped.setMinutes(now.getMinutes() >= 30 ? 30 : 0, 0, 0);
     lastUpdated = snapped;
     console.log('Using fallback snapped:', snapped);
   }

   const nextUpdate = new Date(lastUpdated.getTime() + 30 * 60 * 1000);

   const formatOptions = {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Blantyre',
  };

 const refreshBadge = isStandalone ? (
    <div className="refresh-badge-wrapper">
      <div className="refresh-badge">
        <span className="clock-icon">🕒</span>
        <span className="refresh-text">  
          {isSynced ? (
            <>
              Last updated:{' '}
              <span className="refresh-time">
                {lastUpdated.toLocaleString('en-US', formatOptions)}
              </span>
            </>
          ) : (
            <em style={{ color: 'gray' }}>Syncing last update time...</em>
          )}
        </span>
      </div>
    </div>
  ) : null;

  return (
      <div className="button-container" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* full JSX here */}
        {userCanSaveAs && (
          <div className="button-container" data-test="dashboard-edit-actions">
            {editMode && (
              <div css={actionButtonsStyle}>
                {/* Undo/Redo Buttons */}
                {/* ... */}
                <Button
                  css={discardBtnStyle}
                  buttonSize="small"
                  onClick={discardChanges}
                  buttonStyle="default"
                  data-test="discard-changes-button"
                  aria-label={t('Discard')}
                >
                  {t('Discard')}
                </Button>
                <Button
                  css={saveBtnStyle}
                  buttonSize="small"
                  disabled={!hasUnsavedChanges}
                  buttonStyle="primary"
                  onClick={overwriteDashboard}
                  data-test="header-save-button"
                  aria-label={t('Save')}
                >
                  <Icons.SaveOutlined
                    iconColor={hasUnsavedChanges && theme.colors.primary.light5}
                    iconSize="m"
                  />
                  {t('Save')}
                </Button>
              </div>
            )}
          </div>
        )}
        {editMode ? (
          <UndoRedoKeyListeners onUndo={handleCtrlZ} onRedo={handleCtrlY} />
        ) : (
          <>
	    {/* Reports and Edit bns*/}
            {!isStandalone && (
              <div className="button-container">
                <div css={actionButtonsStyle}>
                  <Button
                    buttonStyle="secondary"
                    onClick={openReportsModal}
                    data-test="reports-button"
                    className="action-button"
                    css={editButtonStyle}
                    aria-label={t('Reports')}
		    style = {{ fontSize: '16', height: '42'}}
                  >
                    {t('Reports')}
                  </Button>
                  {userCanEdit && (
                    <Button
                      buttonStyle="secondary"
                      onClick={() => {
                        toggleEditMode();
                        boundActionCreators.clearDashboardHistory?.();
                      }}
                      data-test="edit-dashboard-button"
                      className="action-button"
                      css={editButtonStyle}
                      aria-label={t('Edit dashboard')}
		      style = {{fontSize: '16', height: '42'}}                    >
                      {t('Edit dashboard')}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {refreshBadge}
          </>
        )}
      </div>
    );
  }, [
    timeNow,
    lastUpdatedTime,
    NavExtension,
    boundActionCreators.onRedo,
    boundActionCreators.onUndo,
    boundActionCreators.clearDashboardHistory,
    editMode,
    emphasizeRedo,
    emphasizeUndo,
    handleCtrlY,
    handleCtrlZ,
    hasUnsavedChanges,
    overwriteDashboard,
    redoLength,
    toggleEditMode,
    undoLength,
    userCanEdit,
    userCanSaveAs,
    isPatientStayView,
    isDarkMode,
    handleRefreshCharts,
    isStandalone,
    discardChanges,
    openReportsModal,
    t,
    theme.colors.primary.light5,
  ]);

  
  const handleReportDelete = async report => {
    await dispatch(deleteActiveReport(report));
    setCurrentReportDeleting(null);
  };

  const [menu, isDropdownVisible, setIsDropdownVisible] = useHeaderActionsMenu({
    addSuccessToast: boundActionCreators.addSuccessToast,
    addDangerToast: boundActionCreators.addDangerToast,
    dashboardInfo,
    dashboardId: dashboardInfo.id,
    dashboardTitle,
    dataMask,
    layout,
    expandedSlices,
    customCss,
    colorNamespace,
    colorScheme,
    onSave: boundActionCreators.onSave,
    onChange: boundActionCreators.onChange,
    forceRefreshAllCharts: forceRefresh,
    startPeriodicRender,
    refreshFrequency,
    shouldPersistRefreshFrequency,
    setRefreshFrequency: boundActionCreators.setRefreshFrequency,
    updateCss: boundActionCreators.updateCss,
    editMode,
    hasUnsavedChanges,
    userCanEdit,
    userCanShare,
    userCanSave: userCanSaveAs,
    userCanCurate,
    isLoading,
    showReportModal,
    showPropertiesModal,
    setCurrentReportDeleting,
    manageEmbedded: showEmbedModal,
    refreshLimit,
    refreshWarning,
    lastModifiedTime: actualLastModifiedTime,
    logEvent: boundActionCreators.logEvent,
    isDarkMode,
    setIsDarkMode,
    isSlideshowOpen,
    openSlideshow,
    closeSlideshow,
  });

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('dashboard-header-menu-toggle', {
        detail: { open: isDropdownVisible },
      }),
    );
  }, [isDropdownVisible]);

  //Save the charts to pdf, styled layout.
  const handleSaveAsPDF = async () => {
    const selectedPanels = chartPanels.filter(c => selectedChartIds.includes(c.id));
    if (!selectedPanels.length) {
      console.error('No charts selected.');
      return;
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const spacing = 20;
    const headerHeight = 40;
    const contentHeight = pageHeight - headerHeight - margin * 2;
    const chartStartGap = 40;

    const renderHeader = () => {
      // Full white page background (optional, just in case)
      pdf.setFillColor(248, 249, 250);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header bar
      pdf.setFillColor('#003366');
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');

      // Header text
      pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor('#fff');
      const dateStr = new Date().toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      pdf.text('Wandikweza Reports', margin, 25);
      const titleText = reportTitle || 'Untitled Report';
      const tw = pdf.getTextWidth(titleText);
      pdf.text(titleText, (pageWidth - tw) / 2, 25);
      const rw = pdf.getTextWidth(dateStr);
      pdf.text(dateStr, pageWidth - margin - rw, 25);
    };
    renderHeader();

    const measured = await Promise.all(
      selectedPanels.map(async chart => {
        const chartEl = document.querySelector(`[data-test-chart-id="${chart.chartId}"]`);
        const holder = chartEl?.closest('.dashboard-component-chart-holder') || chartEl?.closest('.grid-container') || chartEl?.parentElement;
        let rect = { width: 1, height: 1, left: 0, top: 0 };

        if (holder) {
          const box = holder.getBoundingClientRect();
          if (box.width > 0 && box.height > 0) {
            rect = box;
          } else {
            // fallback to chart itself
            const fallbackBox = chartEl?.getBoundingClientRect();
            if (fallbackBox && fallbackBox.width > 0 && fallbackBox.height > 0) {
              rect = fallbackBox;
            }
          }
        }
        return {
          ...chart,
          el: chartEl,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
        };
      })
    );

    // Group charts into rows based on vertical position (top)
    measured.sort((a, b) => a.top - b.top);
    const rows = [];
    const rowThreshold = 30;
    for (const chart of measured) {
      const lastRow = rows[rows.length - 1];
      if (!lastRow || Math.abs(chart.top - lastRow[0].top) > rowThreshold) {
        rows.push([chart]);
      } else {
        lastRow.push(chart);
      }
    }

    let currentY = headerHeight + chartStartGap;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx].sort((a, b) => a.left - b.left);

      const totalOriginalWidth = row.reduce((sum, c) => sum + c.width, 0) + (row.length - 1) * spacing;
      const maxOriginalHeight = Math.max(...row.map(c => c.height));

      // Step 1: Estimate temporary scale just to get title widths
      const tempScale = (pageWidth - margin * 2 - spacing * (row.length - 1)) / totalOriginalWidth;

      // Step 2: Precompute chart titles using that temp scale
      const chartTitles = row.map(c =>
        pdf.splitTextToSize(c.title, c.width * tempScale - 12)
      );
      const titleHeights = chartTitles.map(lines => lines.length * 10 + 12); // approx
      const maxTitleHeight = Math.max(...titleHeights);

      // Step 3: Compute scaleX to fit horizontally
      const scaleX = (pageWidth - margin * 2 - spacing * (row.length - 1)) / totalOriginalWidth;

      const rowBudget = (pageHeight - headerHeight - chartStartGap - margin - spacing) / 2;
      const scaleY = (rowBudget - maxTitleHeight) / maxOriginalHeight;
      const scale = Math.min(scaleX, scaleY);


      // Step 4: Now compute scaled row height using actual scale
      const scaledRowHeight = maxOriginalHeight * scale + maxTitleHeight;


      console.log('currentY:', currentY);
      console.log('scaledRowHeight:', scaledRowHeight);
      console.log('pageHeight - margin:', pageHeight - margin);

      const availableHeight = pageHeight - margin - (currentY === headerHeight + chartStartGap ? chartStartGap : margin);
      const isFirstPage = currentY === headerHeight + chartStartGap;
      const effectiveAvailableHeight = pageHeight - margin - (isFirstPage ? chartStartGap : margin);

      // Only break to a new page if it's beyond the second row
    const needsNewPage = currentY + scaledRowHeight > pageHeight - margin;

    if (needsNewPage) {
      pdf.addPage();
      renderHeader();
      currentY = headerHeight + chartStartGap;

      // Recalculate scale with full page space again
      const availableRowHeight = pageHeight - currentY - margin;
      const recalculatedScale = Math.min(
        (pageWidth - margin * 2 - spacing * (row.length - 1)) / totalOriginalWidth,
        availableRowHeight / (maxOriginalHeight + maxTitleHeight)
      );

      
      
       let scale = Math.min(scaleX, scaleY);
       const rowBudget = (pageHeight - headerHeight - chartStartGap - margin - spacing) / 2;
       let scaledRowHeight = maxOriginalHeight * scale + maxTitleHeight;

    }


      let currentX = margin;

      for (let i = 0; i < row.length; i++) {
        const chart = row[i];
        if (!chart.el) continue;

        const chartW = chart.width * scale;
        const chartH = chart.height * scale;

        const dots = Array.from(chart.el.querySelectorAll('button')).filter(b =>
          (b.getAttribute('aria-label') || '').toLowerCase().includes('more')
        );
        const origDots = dots.map(b => b.style.display);
        dots.forEach(b => (b.style.display = 'none'));

        const titleEls = Array.from(chart.el.querySelectorAll('.header-title, .editable-title'));
        const origTitleDisplay = titleEls.map(el => el.style.display);
        titleEls.forEach(el => (el.style.display = 'none'));

        let imgData = '';
        const canvas = chart.el.querySelector('canvas');
        if (canvas) {
          const off = document.createElement('canvas');
          off.width = canvas.width;
          off.height = canvas.height;
          const ctx = off.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, off.width, off.height);
            ctx.drawImage(canvas, 0, 0);
            imgData = off.toDataURL();
          }
        } else {
          const tmp = await html2canvas(chart.el, { scale: 2, backgroundColor: '#fff' });
          imgData = tmp.toDataURL();
        }

        const titleLines = chartTitles[i];
        const titleHeight = titleHeights[i];
        const titlePadding = 6;

        // Draw background bar
        pdf.setFillColor(196, 196, 196);
        pdf.rect(currentX, currentY, chartW, titleHeight, 'F');

        // Draw title
        pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(0, 0, 0);
        pdf.text(titleLines, currentX + titlePadding, currentY + titlePadding + 5);

        const shadowOffset = 1;
        pdf.setFillColor(230, 230, 230); // softer gray for minimal shadow
        pdf.rect(currentX + shadowOffset, currentY + titleHeight + shadowOffset, chartW, chartH, 'F');
        pdf.addImage(imgData, 'PNG', currentX, currentY + titleHeight, chartW, chartH);

        // Restore DOM
        dots.forEach((b, j) => (b.style.display = origDots[j]));
        titleEls.forEach((el, j) => (el.style.display = origTitleDisplay[j]));

        currentX += chartW + spacing;
      }

      currentY += scaledRowHeight + spacing;
    }

    pdf.save(`${reportTitle || 'Untitled Report'}.pdf`);
  };
  

 //2. Handle saving the Report as an image
const handleSaveAsImage = async () => {
  if (!selectedChartIds.length) {
    console.error('No charts selected.');
    return;
  }

  // 1. Gather panels and measure DOM
  const selectedPanels = chartPanels.filter(c => selectedChartIds.includes(c.id));
  const measured = selectedPanels.map(chart => {
    const el = document.querySelector(`[data-test-chart-id="${chart.chartId}"]`);
    const holder =
      el?.closest('.dashboard-component-chart-holder') ||
      el?.closest('.grid-container') ||
      el?.parentElement;
    const box = (holder || el)?.getBoundingClientRect() || { width: 0, height: 0, left: 0, top: 0 };
    return { ...chart, el, width: box.width, height: box.height, left: box.left, top: box.top };
  }).filter(m => m.el && m.width && m.height);

  if (!measured.length) {
    console.error('No chart DOM elements found.');
    return;
  }

  // 2. Group into rows by top position
  measured.sort((a, b) => a.top - b.top);
  const rowThreshold = 30;
  const rows = [];
  for (const chart of measured) {
    const last = rows[rows.length - 1];
    if (!last || Math.abs(chart.top - last[0].top) > rowThreshold) {
      rows.push([chart]);
    } else {
      last.push(chart);
    }
  }

  // 3. Compute overall canvas size (landscape)
  const margin = 20;
  const spacing = 20;
  const headerHeight = 40;
  const headerBottomGap = 40;
  // compute needed height
  let yCursor = headerHeight + headerBottomGap;
  const rowHeights = rows.map(row => {
    const maxH = Math.max(...row.map(c => c.height));
    return maxH + 24 + spacing;
  });
  // 4. Create and paint background + header
  const dpi = 96;
  const canvasWidth = 11.69 * dpi; 
  const canvasHeight = 8.27 * dpi; 

  const combined = document.createElement('canvas');
  combined.width = canvasWidth;
  combined.height = canvasHeight;
  const ctx = combined.getContext('2d');


  // page bg
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // header bar
  ctx.fillStyle = '#003366';
  ctx.fillRect(0, 0, canvasWidth, headerHeight);

  // header text
  ctx.font = 'bold 12pt Helvetica';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText('Wandikweza Reports', margin, headerHeight / 2);
  const titleText = reportTitle || 'Untitled Report';
  const dateStr = new Date().toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  // center title
  const titleWidth = ctx.measureText(titleText).width;
  ctx.fillText(titleText, (canvasWidth - titleWidth) / 2, headerHeight / 2);
  // right date
  const dateWidth = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, canvasWidth - margin - dateWidth, headerHeight / 2);

  // 5. Render each row
  yCursor = headerHeight + headerBottomGap;
  for (const row of rows) {
    // compute total original width + spacing
    const totalW = row.reduce((sum, c) => sum + c.width, 0) + spacing * (row.length - 1);
    const scaleX = (canvasWidth - margin * 2 - spacing * (row.length - 1)) / totalW;
    const maxH = Math.max(...row.map(c => c.height));
    const titleHeights = row.map(c => {
      const lines = ctx.measureText(c.title).width / (c.width * scaleX - 12);
      return Math.ceil(lines) * 10 + 12;
    });
    const maxTitleH = Math.max(...titleHeights);
    // limit row height to half page
    const rowBudget = (canvasHeight - headerHeight - spacing - margin) / 2;
    const scaleY = (rowBudget - maxTitleH) / maxH;
    const scale = Math.min(scaleX, scaleY);

    // draw each chart in row
    let xCursor = margin;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      // capture chart as canvas
      // hide UI controls
      const dots = Array.from(c.el.querySelectorAll('button')).filter(b =>
        (b.getAttribute('aria-label') || '').toLowerCase().includes('more')
      );
      const origDots = dots.map(b => b.style.display);
      dots.forEach(b => b.style.display = 'none');
      const titleEls = Array.from(c.el.querySelectorAll('.header-title, .editable-title'));
      const origTitleDisplay = titleEls.map(el => el.style.display);
      titleEls.forEach(el => el.style.display = 'none');

      const snap = await html2canvas(c.el, { scale: 2, backgroundColor: '#fff' });
      // restore
      dots.forEach((b, j) => b.style.display = origDots[j]);
      titleEls.forEach((el, j) => el.style.display = origTitleDisplay[j]);

      const cw = c.width * scale;
      const ch = c.height * scale;
      const th = titleHeights[i];

      // title bar bg
      ctx.fillStyle = 'rgb(196,196,196)';
      ctx.fillRect(xCursor, yCursor, cw, th);

      // title text
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10pt Helvetica';
      ctx.textBaseline = 'top';
      const lines = ctx.measureText(c.title).width > cw - 12
        ? [c.title]
        : [c.title];
      ctx.fillText(lines.join(''), xCursor + 6, yCursor + 6);

      // shadow bg
      ctx.fillStyle = 'rgb(230,230,230)';
      ctx.fillRect(xCursor + 1, yCursor + th + 1, cw, ch);

      // chart image
      ctx.drawImage(snap, 0, 0, snap.width, snap.height, xCursor, yCursor + th, cw, ch);

      xCursor += cw + spacing;
    }

    yCursor += maxH * scale + maxTitleH + spacing;
  }

  // 6. Trigger download
  const link = document.createElement('a');
  link.download = `${reportTitle || 'Untitled_Report'}.png`;
  link.href = combined.toDataURL('image/png');
  link.click();
 };
 
 // Refresh all charts
 function handleRefreshCharts() {
   console.log('Refreshing charts...');
   setRefreshKey(prev => prev + 1);
 }

 const handleRefreshBigNumberChart = () => {
   setBigNumberReloading(true);
   setBigNumberRefreshKey(prev => prev + 1);
   window.setTimeout(() => setBigNumberReloading(false), 2200);
 };

 const handleRefreshPieChart = () => {
   setPieReloading(true);
   setPieRefreshKey(prev => prev + 1);
   window.setTimeout(() => setPieReloading(false), 2200);
 };

 const handleRefreshRunChart = () => {
   setRunChartReloading(true);
   setRunChartRefreshKey(prev => prev + 1);
   window.setTimeout(() => setRunChartReloading(false), 2200);
 };

  return (
    <div
      css={headerContainerStyle}
      data-test="dashboard-header-container"
      data-test-id={dashboardInfo.id}
      className={`dashboard-header-container${isHeaderCollapsed ? ' dashboard-header-container--collapsed' : ''}`}
      style={{ 
        position: 'relative',
      }}
    >
      <PageHeaderWithActions
        editableTitleProps={editableTitleProps}
        certificatiedBadgeProps={certifiedBadgeProps}
        faveStarProps={faveStarProps}
        titlePanelAdditionalItems={titlePanelAdditionalItems}
        rightPanelAdditionalItems={rightPanelAdditionalItems}
        menuDropdownProps={{
          open: isDropdownVisible,
          onOpenChange: setIsDropdownVisible,
        }}
        additionalActionsMenu={menu}
        showFaveStar={user?.userId && dashboardInfo?.id}
        showTitlePanelItems
      />
      <ScrollToTopButton
        type="button"
        aria-label="Back to top"
        title="Back to top"
        onClick={scrollToTop}
        data-visible={showScrollToTop}
        data-test="scroll-to-top"
        data-theme={isDarkMode ? 'dark' : 'light'}
      >
        <Icons.VerticalAlignTopOutlined iconSize="l" iconColor="currentColor" />
      </ScrollToTopButton>
      {!editMode && !isStandalone && (
        <div
          data-test="dashboard-mode-title-bar"
          ref={titleBarRef}
          style={{
            position: 'relative',
            zIndex: 111,
            height: isHeaderCollapsed ? '0px' : '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 20px',
            backgroundColor: isDarkMode ? '#2a313a' : '#eceff3',
            borderTop: isHeaderCollapsed
              ? 'none'
              : `1px solid ${isDarkMode ? 'rgba(240, 240, 240, 0.2)' : theme.colors.grayscale.light3}`,
            opacity: isHeaderCollapsed ? 0 : 1,
            transform: isHeaderCollapsed ? 'translateY(-100%)' : 'translateY(0)',
            transition:
              'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            pointerEvents: isHeaderCollapsed ? 'none' : 'auto',
          }}
        >
          <div
            role="tablist"
            aria-label="Dashboard views"
            data-test="dashboard-view-tabs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: 0,
              borderRadius: 0,
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.25)' : theme.colors.grayscale.light2}`,
              paddingBottom: '4px',
              opacity: isHeaderCollapsed ? 0 : 1,
              transform: isHeaderCollapsed ? 'translateY(-8px)' : 'translateY(0)',
              transition:
                'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {[
              {
                key: 'main',
                label: 'Clinical Service Monitoring',
                active: !isPatientStayView,
                onClick: () => handleDashboardSwitch(false),
              },
              {
                key: 'stay',
                label: 'Patient Stay Times',
                active: isPatientStayView,
                onClick: () => handleDashboardSwitch(true),
              },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={tab.active}
                onClick={tab.onClick}
                style={{
                  border: 'none',
                  backgroundColor: tab.active
                    ? isDarkMode
                      ? 'rgba(15, 23, 42, 0.88)'
                      : '#ffffff'
                    : isDarkMode
                    ? 'rgba(51, 65, 85, 0.7)'
                    : '#e5e7eb',
                  backgroundImage: tab.active
                    ? isDarkMode
                      ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                      : 'linear-gradient(90deg, #f59e0b, #f97316)'
                    : 'linear-gradient(90deg, transparent, transparent)',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '0 100%',
                  backgroundSize: tab.active ? '100% 2px' : '0% 2px',
                  color: tab.active
                    ? isDarkMode
                      ? '#f8fafc'
                      : theme.colors.grayscale.dark1
                    : isDarkMode
                    ? '#e2e8f0'
                    : theme.colors.grayscale.dark2,
                  fontSize: '14px',
                  fontWeight: tab.active ? 700 : 600,
                  letterSpacing: '0.02em',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  boxShadow: tab.active
                    ? isDarkMode
                      ? '0 6px 16px rgba(15, 23, 42, 0.45)'
                      : '0 6px 16px rgba(15, 23, 42, 0.12)'
                    : 'none',
                  cursor: tab.active ? 'default' : 'pointer',
                  transition: 'color 0.25s ease, background-size 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {showingPropertiesModal && (
        <PropertiesModal
          dashboardId={dashboardInfo.id}
          dashboardInfo={dashboardInfo}
          dashboardTitle={dashboardTitle}
          show={showingPropertiesModal}
          onHide={hidePropertiesModal}
          colorScheme={colorScheme}
          onSubmit={handleOnPropertiesChange}
          onlyApply
        />
      )}

      <ReportModal
        userId={user.userId}
        show={showingReportModal}
        onHide={hideReportModal}
        userEmail={user.email}
        dashboardId={dashboardInfo.id}
        creationMethod="dashboards"
      />

      {currentReportDeleting && (
        <DeleteModal
          description={t(
            'This action will permanently delete %s.',
            currentReportDeleting?.name,
          )}
          onConfirm={() => {
            if (currentReportDeleting) {
              handleReportDelete(currentReportDeleting);
            }
          }}
          onHide={() => setCurrentReportDeleting(null)}
          open
          title={t('Delete Report?')}
        />
      )}

      <OverwriteConfirm />

      {userCanCurate && (
        <DashboardEmbedModal
          show={showingEmbedModal}
          onHide={hideEmbedModal}
          dashboardId={dashboardInfo.id}
        />
      )}
      <Global
        styles={css`
          .antd5-menu-vertical {
            border-right: none;
          }
          .patient-stay-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: minmax(300px, 0.69fr) minmax(350px, 1fr);
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
            align-items: stretch;
          }
          .patient-stay-card {
            display: flex;
            flex-direction: column;
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            height: 100%;
          }
          .patient-stay-card--big .big-number-stay-wrapper,
          .patient-stay-card--pie .pie-stay-wrapper {
            height: 100% !important;
            max-height: none !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
          }
          .patient-stay-card--big {
            grid-column: span 1;
            align-self: stretch;
          }
          .patient-stay-card--pie {
            grid-column: span 1;
            align-self: stretch;
          }
          .patient-stay-card--run {
            grid-column: 1 / -1;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
            box-sizing: border-box;
          }
          .patient-stay-card--run > div {
            max-width: 100%;
            overflow: hidden;
          }
          .patient-stay-card--run .run-stay-responsive-wrapper {
            max-width: 100% !important;
            overflow: hidden !important;
          }
          [data-test='dashboard-content-wrapper'].patient-stay-scroll-lock {
            overflow: hidden !important;
          }
          html.patient-stay-scroll-lock,
          body.patient-stay-scroll-lock {
            overflow: hidden;
          }
          @media (max-width: 500px) {
            .patient-stay-card--big,
            .patient-stay-card--pie,
            .patient-stay-card--run {
              grid-column: 1 / -1;
            }
          }
          ${!editMode && (!isStandalone || isSlideshow) &&
          `
            .dashboard-content,
            [data-test="dashboard-filters-panel"] {
              opacity: ${isPatientStayView ? 0 : 1};
              pointer-events: ${isPatientStayView ? 'none' : 'auto'};
              transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }
            ${isPatientStayView
              ? `
            [data-test="dashboard-content-wrapper"],
            .dashboard,
            .dashboard-grid,
            .dashboard-inner,
            .grid-container {
              background-color: transparent !important;
            }
            .dashboard {
              padding: 0 !important;
              margin-top: 0 !important;
            }
            `
              : ''}
          `}
        `}
      />

      {!editMode && (!isStandalone || isSlideshow) && (
        <div
          className="patient-stay-overlay"
          data-slideshow={isSlideshow ? 'true' : 'false'}
          data-patient-stay-view={isPatientStayView ? 'true' : 'false'}
          style={{
            position: 'fixed',
            top: `${patientStayOverlayTop}px`,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 110,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '10px 0',
            backgroundColor: isDarkMode ? '#121212' : '#f7f9fc',
            opacity: isPatientStayView ? 1 : 0,
            visibility: isPatientStayView ? 'visible' : 'hidden',
            pointerEvents: isPatientStayView ? 'auto' : 'none',
            transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="patient-stay-overlay-content"
            style={{
              maxWidth: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '0 12px 10px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div className="patient-stay-grid">
              <div
                className="patient-stay-card patient-stay-card--big"
                style={{
                  minHeight: 'clamp(300px, 32vh, 400px)',
                  height: '100%',
                  maxHeight: 'none',
                  alignSelf: 'stretch',
                  background: isDarkMode ? '#1e1e1e' : '#fff',
                  border: isDarkMode ? '1px solid #333' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 20px)',
                    fontWeight: 600,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    marginBottom: '8px',
                    fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                    letterSpacing: '0.02em',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Daily Average Patient Stay
                </div>
                <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
                  <BigNumberStay
                    refreshKey={bigNumberRefreshKey}
                    resetKey={bigNumberResetKey}
                    isDarkMode={isDarkMode}
                    isExpanded
                  />
                </div>
              </div>
              <div
                className="patient-stay-card patient-stay-card--pie"
                style={{
                  minHeight: 'clamp(300px, 32vh, 400px)',
                  height: '100%',
                  maxHeight: 'none',
                  alignSelf: 'stretch',
                  background: isDarkMode ? '#1e1e1e' : '#fff',
                  border: isDarkMode ? '1px solid #333' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 20px)',
                    fontWeight: 600,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    marginBottom: '8px',
                    fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                    letterSpacing: '0.02em',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Patient Stay Distribution
                </div>
                <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
                  <PieChartStay
                    refreshKey={pieRefreshKey}
                    resetKey={pieResetKey}
                    isDarkMode={isDarkMode}
                    isExpanded
                  />
                </div>
              </div>
              <div
                className="patient-stay-card patient-stay-card--run"
                style={{
                  minHeight: 'clamp(480px, 50vh, 580px)',
                  height: 'clamp(480px, 50vh, 580px)',
                  maxHeight: 'clamp(480px, 50vh, 580px)',
                  background: isDarkMode ? '#1e1e1e' : '#fff',
                  border: isDarkMode ? '1px solid #333' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '10px',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 20px)',
                    fontWeight: 600,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    marginBottom: '6px',
                    fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                    letterSpacing: '0.02em',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Trend of Patient Stay Duration Over Time
                </div>
                <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
                  <RunChartStay
                    refreshKey={runChartRefreshKey}
                    resetKey={runChartResetKey}
                    isDarkMode={isDarkMode}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    <Modal
          className={`reports-modal${isDarkMode ? ' reports-modal--dark' : ''}`}
          wrapClassName="reports-modal-wrap"
          title={t('Generate Report')}
          show={isReportsModalVisible}
          onHide={closeReportsModal}
          style={{ top: '20px' }}
          bodyStyle={{ padding: 0, overflow: 'hidden' }}
          footer={
            <div
              className="reports-footer"
            >
              {/* Title selector on far left of footer */}
                <div className="reports-footer-title">
                    <label
                      htmlFor="report-title"
                      className="reports-footer-label"
                    >
                      {t('Title')}
                    </label>
                    <input
                      id="report-title"
                      type="text"
                      value={reportTitle}
                      onChange={e => setReportTitle(e.target.value)}
                      placeholder={t('Enter report title')}
                      className="reports-footer-input"
                      onFocus={e => {
                        e.target.style.backgroundColor = '#FFFFFF';
                        e.target.style.borderColor = '#18c1ff';
                        e.target.style.width = '300px';
                      }} 
                      onBlur={e => {
                        e.target.style.backgroundColor = '#fff'; 
                        e.target.style.borderColor = '#ccc';
                        e.target.style.width = '200px';
                      }}
                    />
                  </div>

                <Button buttonStyle="default" onClick={closeReportsModal}>
                {t('Cancel')}
              </Button>
              <Popover
                content={formatMenu}
                placement="bottomRight"
                trigger="click"
                visible={isPopoverVisible}
                onVisibleChange={visible => setIsPopoverVisible(visible)}
                style={{ backgroundColor: '#f5f5f5' }}
              >
                <Button
                  buttonStyle="primary"
                  style={{ color: 'white', backgroundColor: '#1890ff' }}
                >
                  {t('Save')} <span style={{ fontSize: '0.75em' }}>▼</span>
                </Button>
              </Popover>
            </div>
          }
          closeOnEscape
          showCloseButton
        >
          <style>{`
            .reports-modal-wrap .antd5-modal-mask {
              background: rgba(15, 23, 42, 0.48);
            }

            .reports-modal .antd5-modal-content {
              border-radius: 18px !important;
              overflow: hidden !important;
              border: 1px solid rgba(15, 23, 42, 0.08) !important;
              background: #ffffff !important;
              box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2) !important;
            }

            .reports-modal .antd5-modal-header {
              padding: 14px 20px !important;
              border-bottom: 1px solid rgba(148, 163, 184, 0.25) !important;
              background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96)) !important;
            }

            .reports-modal .antd5-modal-title {
              font-size: 15px !important;
              font-weight: 700 !important;
              letter-spacing: 0.04em !important;
              text-transform: uppercase !important;
              color: #0f172a !important;
            }

            .reports-modal .antd5-modal-close {
              top: 6px !important;
              right: 6px !important;
              border-radius: 10px !important;
            }

            .reports-modal .antd5-modal-body {
              padding: 0 !important;
              background: #ffffff !important;
            }

            .reports-modal .reports-body {
              display: flex;
              height: min(56vh, 540px);
              min-height: 320px;
              overflow: hidden;
              background: #ffffff;
            }

            .reports-modal .reports-sidebar {
              width: 190px;
              padding: 16px;
              background: rgba(248, 250, 252, 0.96);
              border-right: 1px solid rgba(148, 163, 184, 0.2);
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .reports-modal .reports-tab {
              cursor: pointer;
              padding: 10px 12px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 13px;
              color: #475569;
              letter-spacing: 0.02em;
              transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
              border: 1px solid transparent;
            }

            .reports-modal .reports-tab:hover {
              background: rgba(226, 232, 240, 0.7);
            }

            .reports-modal .reports-tab.is-active {
              color: #0f172a;
              background: #ffffff;
              border-color: rgba(15, 23, 42, 0.08);
              box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
              transform: translateY(-1px);
            }

            .reports-modal .reports-content {
              flex: 1;
              padding: 16px 18px;
              overflow-y: auto;
              background: #ffffff;
            }

            .reports-modal .reports-section-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              color: #475569;
              font-size: 13px;
            }

            .reports-modal .reports-checkbox {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 10px;
              color: #0f172a;
              font-size: 13px;
            }

            .reports-modal .reports-checkbox input[type='checkbox'] {
              width: 16px;
              height: 16px;
              accent-color: #1890ff;
            }

            .reports-modal .reports-footer {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 12px;
              padding: 12px 20px;
              border-top: 1px solid rgba(148, 163, 184, 0.22);
              background: #f8fafc;
              position: sticky;
              bottom: 0;
            }

            .reports-modal .reports-footer-title {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-right: auto;
            }

            .reports-modal .reports-footer-label {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #64748b;
            }

            .reports-modal .reports-footer-input {
              height: 34px;
              border-radius: 10px;
              border: 1px solid rgba(148, 163, 184, 0.6);
              padding: 0 10px;
              width: 200px;
              background: #ffffff;
              transition: width 0.4s ease, background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
            }

            .reports-modal .reports-footer-input:focus {
              border-color: #18c1ff;
              box-shadow: 0 0 0 3px rgba(24, 193, 255, 0.2);
              outline: none;
            }

            .reports-modal.reports-modal--dark .antd5-modal-content {
              border-color: rgba(148, 163, 184, 0.2) !important;
              background: #0f172a !important;
              box-shadow: 0 24px 60px rgba(2, 6, 23, 0.6) !important;
            }

            .reports-modal.reports-modal--dark .antd5-modal-header {
              background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.95)) !important;
              border-bottom-color: rgba(148, 163, 184, 0.18) !important;
            }

            .reports-modal.reports-modal--dark .antd5-modal-title {
              color: #e2e8f0 !important;
            }

            .reports-modal.reports-modal--dark .reports-body,
            .reports-modal.reports-modal--dark .reports-content {
              background: #0f172a;
            }

            .reports-modal.reports-modal--dark .reports-sidebar {
              background: rgba(15, 23, 42, 0.96);
              border-right-color: hsla(215, 20%, 65%, 0.16);
            }

            .reports-modal.reports-modal--dark .reports-tab {
              color: #94a3b8;
            }

            .reports-modal.reports-modal--dark .reports-tab:hover {
              background: rgba(30, 41, 59, 0.7);
            }

            .reports-modal.reports-modal--dark .reports-tab.is-active {
              color: #e2e8f0;
              background: rgba(30, 41, 59, 0.9);
              border-color: rgba(148, 163, 184, 0.2);
              box-shadow: 0 6px 16px rgba(2, 6, 23, 0.5);
            }

            .reports-modal.reports-modal--dark .reports-section-header,
            .reports-modal.reports-modal--dark .reports-checkbox {
              color: #e2e8f0;
            }

            .reports-modal.reports-modal--dark .reports-footer {
              background: rgba(15, 23, 42, 0.96);
              border-top-color: rgba(148, 163, 184, 0.18);
            }

            .reports-modal.reports-modal--dark .reports-footer-label {
              color: #94a3b8;
            }

            .reports-modal.reports-modal--dark .reports-footer-input {
              background: rgba(30, 41, 59, 0.95);
              border-color: rgba(148, 163, 184, 0.3);
              color: #e2e8f0;
            }
          `}</style>
          <div className="reports-body">
            {/* Left panel with tabs */}
            <div
              className="reports-sidebar"
            >
              <div
                className={`reports-tab${activeTab === 'filters' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('filters')}
              >
                {t('Select Filters')}
              </div>
              <div
                className={`reports-tab${activeTab === 'charts' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('charts')}
              >
                {t('Select Charts')}
              </div>
            </div>

            {/* Right panel: only scroll here */}
            <div
              className="reports-content"
            >
              {activeTab === 'filters' ? (
              <>
                {Array.isArray(appliedFilters) && appliedFilters.length > 0 ? (
                  <>
                    <div
                      className="reports-section-header"
                    >
                      <p style={{ margin: 0 }}>
                        {t('Choose filters to apply for the report')}
                      </p>
                      <div>
                        <input
                          type="checkbox"
                          id="select-all-filters"
                          checked={selectedFilterIds.length === appliedFilters.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedFilterIds(appliedFilters.map(f => f.id));
                            } else {
                              setSelectedFilterIds([]);
                            }
                          }}
                        />
                        <label htmlFor="select-all-filters" style={{ marginLeft: '8px' }}>
                          {selectedFilterIds.length === appliedFilters.length
                            ? t('Deselect All')
                            : t('Select All')}
                        </label>
                      </div>
                    </div>

                    {appliedFilters.map(filter => (
                      <div key={filter.id} className="reports-checkbox">
                        <input
                          type="checkbox"
                          id={`filter-${filter.id}`}
                          checked={selectedFilterIds.includes(filter.id)}
                          onChange={() => toggleFilterSelection(filter.id)}
                        />
                        <label htmlFor={`filter-${filter.id}`} style={{ marginLeft: '8px' }}>
                          {filter.label}
                        </label>
                      </div>
                    ))}
                  </>
                ) : (
                  <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>
                    {t('No filters applied to the dashboard.')}
                  </p>
                )}
              </>
            ) : (
              <>
                {Array.isArray(chartPanels) && chartPanels.length > 0 ? (
                  <>
                    <div
                      className="reports-section-header"
                    >
                      <p style={{ margin: 0 }}>
                        {t('Choose charts to include in the report')}
                      </p>
                      <div>
                        <input
                          type="checkbox"
                          id="select-all-charts"
                          checked={selectedChartIds.length === chartPanels.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedChartIds(chartPanels.map(p => p.id));
                            } else {
                              setSelectedChartIds([]);
                            }
                          }}
                        />
                        <label htmlFor="select-all-charts" style={{ marginLeft: '8px' }}>
                          {selectedChartIds.length === chartPanels.length
                            ? t('Deselect All')
                            : t('Select All')}
                        </label>
                      </div>
                    </div>

                    {chartPanels.map(panel => (
                      <div key={panel.id} className="reports-checkbox">
                        <input
                          type="checkbox"
                          id={`chart-${panel.id}`}
                          checked={selectedChartIds.includes(panel.id)}
                          onChange={() => toggleChartSelection(panel.id)}
                        />
                        <label htmlFor={`chart-${panel.id}`} style={{ marginLeft: '8px' }}>
                          {panel.title}
                        </label>
                      </div>
                    ))}
                  </>
                ) : (
                  <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>
                    {t('No charts found on this dashboard.')}
                  </p>
                )}
              </>
            )}
            </div>
          </div>
      </Modal>


     {/* Average Stay Modal */}
      <Modal
        className="avg-stay-modal"
        title={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              maxWidth: 'calc(100% - 80px)',
              paddingRight: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img
                  src={logoBase64}
                  alt="Logo"
                  style={{
                    height: 'clamp(14px, 1.2vw, 22px)',
                    width: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 'clamp(0.9rem, 1.1vw, 18px)',
                    lineHeight: 1.05,
                    fontWeight: 700,
                    letterSpacing: '0.2px',
                    fontFamily: '"Playfair Display", "Merriweather", Georgia, serif',
                    backgroundImage: isDarkMode
                      ? 'linear-gradient(90deg, #e6f4ff 0%, #91d5ff 45%, #69c0ff 100%)'
                      : 'linear-gradient(90deg, #0b3d91 0%, #1677ff 50%, #40a9ff 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: isDarkMode
                      ? '0 2px 10px rgba(64, 169, 255, 0.22)'
                      : '0 2px 8px rgba(22, 119, 255, 0.16)',
                  }}
                >
                  Patient Stay Periods and Trends
                </span>
              </div>
            </div>
          </div>
        }
        visible={isAvgStayModalOpen}
        onCancel={closeAvgStayModal}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 14px',
            }}
          >
            {/* Left button - Refresh Charts */}
            <div style={{ justifySelf: 'start' }}>
              <button
                onClick={handleRefreshCharts}
                style={{
                  padding: '6px 12px',
                  fontSize: '1.15rem',
                  fontWeight: 500,
                  color: isDarkMode ? '#e0e0e0' : '#333333ff',
                  border: isDarkMode ? '1px solid #555555' : 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isDarkMode ? '0 4px 6px rgba(0,0,0,0.35)' : '0 4px 6px rgba(0,0,0,0.2)',
                  backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                }}
                onMouseDown={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'translateY(4px)';
                  target.style.boxShadow = isDarkMode ? '0 2px 3px rgba(0,0,0,0.45)' : '0 2px 3px rgba(0,0,0,0.2)';
                }}
                onMouseUp={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'translateY(0)';
                  target.style.boxShadow = isDarkMode ? '0 4px 6px rgba(0,0,0,0.35)' : '0 4px 6px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'translateY(0)';
                  target.style.boxShadow = isDarkMode ? '0 4px 6px rgba(0,0,0,0.35)' : '0 4px 6px rgba(0,0,0,0.2)';
                }}
              >
                Reload Charts
              </button>
            </div>

            {/* Right side: badge + Okay */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LastUpdatedBadge
                isDarkMode={isDarkMode}
                lastUpdatedTime={lastUpdatedTime}
              />
              <button
                onClick={closeAvgStayModal}
                style={{
                  padding: '6px 12px',
                  fontSize: '1.15rem',
                  fontWeight: 500,
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#40a9ff')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1890ff')}
              >
                Okay
              </button>
            </div>
          </div>
        }
        centered={false}
        width="var(--avg-stay-modal-width)"
        style={{
          top: 'var(--avg-stay-modal-top)',
          maxWidth: 'var(--avg-stay-modal-max-width)',
        }}
        bodyStyle={{
          padding: 0,
          margin: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          boxSizing: 'border-box',
          backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
          transition: 'background-color 0.3s ease',
          maxHeight: 'calc(100vh - 120px)',
        }}
        wrapClassName="avg-stay-modal-wrap"
        transitionName="avg-stay-fancy"
        closeIcon={<span className="avg-stay-close-icon" aria-hidden="true">×</span>}
        closeOnEscape
        showCloseButton
      >
        {/* Style overrides scoped to the modal */}
        <style>{`
          .avg-stay-modal-wrap {
            --avg-stay-modal-width: 88vw;
            --avg-stay-modal-max-width: 1480px;
            --avg-stay-modal-top: 6px;
            --avg-stay-modal-shell-gap: 12px;
            --avg-stay-dashboard-scale: 0.6;
          }
          @media (max-width: 1800px) {
            .avg-stay-modal-wrap {
              --avg-stay-modal-width: 89vw;
              --avg-stay-modal-max-width: 1420px;
              --avg-stay-modal-top: 6px;
              --avg-stay-modal-shell-gap: 12px;
              --avg-stay-dashboard-scale: 0.58;
            }
          }
          @media (max-width: 1600px) {
            .avg-stay-modal-wrap {
              --avg-stay-modal-width: 90vw;
              --avg-stay-modal-max-width: 1340px;
              --avg-stay-modal-top: 6px;
              --avg-stay-modal-shell-gap: 10px;
              --avg-stay-dashboard-scale: 0.56;
            }
          }
          @media (max-width: 1440px) {
            .avg-stay-modal-wrap {
              --avg-stay-modal-width: 91vw;
              --avg-stay-modal-max-width: 1260px;
              --avg-stay-modal-top: 4px;
              --avg-stay-modal-shell-gap: 10px;
              --avg-stay-dashboard-scale: 0.53;
            }
          }
          @media (max-width: 1280px) {
            .avg-stay-modal-wrap {
              --avg-stay-modal-width: 93vw;
              --avg-stay-modal-max-width: 1120px;
              --avg-stay-modal-top: 4px;
              --avg-stay-modal-shell-gap: 8px;
              --avg-stay-dashboard-scale: 0.49;
            }
          }
          @media (max-height: 980px) {
            .avg-stay-modal-wrap {
              --avg-stay-modal-top: 4px;
              --avg-stay-modal-shell-gap: 8px;
              --avg-stay-dashboard-scale: 0.5;
            }
          }
          @media (max-height: 860px) {
            .avg-stay-modal-wrap {
              --avg-stay-modal-top: 2px;
              --avg-stay-modal-shell-gap: 6px;
              --avg-stay-dashboard-scale: 0.46;
            }
          }
          .avg-stay-modal .antd5-modal-content {
            border-radius: 24px !important;
            overflow: hidden !important;
            max-height: calc(100vh - var(--avg-stay-modal-shell-gap)) !important;
            display: flex !important;
            flex-direction: column !important;
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24) !important;
            background-color: ${isDarkMode ? '#1a1a1a' : '#ffffff'} !important;
            transition: background-color 0.3s ease !important;
          }
          .avg-stay-modal .avg-stay-scale-stage {
            flex: 1;
            min-height: 0;
            overflow-x: hidden;
            overflow-y: auto;
            position: relative;
            display: flex;
            align-items: flex-start;
            justify-content: center;
          }
          .avg-stay-modal .avg-stay-scale-content {
            width: calc(100% / var(--avg-stay-dashboard-scale));
            min-height: calc(100% / var(--avg-stay-dashboard-scale));
            zoom: var(--avg-stay-dashboard-scale);
            transform-origin: top center;
            margin: 0 auto;
            will-change: transform;
            overflow: visible;
          }
          @supports not (zoom: 1) {
            .avg-stay-modal .avg-stay-scale-content {
              transform: scale(var(--avg-stay-dashboard-scale));
              transform-origin: top center;
              width: calc(100% / var(--avg-stay-dashboard-scale));
              min-height: calc(100% / var(--avg-stay-dashboard-scale));
            }
          }
          .avg-stay-modal .antd5-modal-header {
            background-color: ${isDarkMode ? '#2d2d2d' : '#ffffff'} !important;
            border-bottom: 1px solid ${isDarkMode ? '#404040' : '#f0f0f0'} !important;
            transition: background-color 0.3s ease, border-color 0.3s ease !important;
          }
          .avg-stay-modal .antd5-modal-close {
            top: 8px !important;
            right: 16px !important;
            width: 44px !important;
            height: 44px !important;
          }
          .avg-stay-modal .antd5-modal-close-x {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .avg-stay-modal .avg-stay-close-icon {
            font-size: 32px;
            font-weight: 300;
            line-height: 1;
            color: ${isDarkMode ? '#b0b0b0' : '#475467'};
            transition: color 160ms ease, transform 160ms ease;
          }
          .avg-stay-modal .antd5-modal-close:hover .avg-stay-close-icon {
            color: ${isDarkMode ? '#ffffff' : '#0f172a'};
            transform: scale(1.08);
          }
          .avg-stay-modal .antd5-modal-header {
            border-top-left-radius: 24px !important;
            border-top-right-radius: 24px !important;
          }
          .avg-stay-modal .antd5-modal-footer {
            border-bottom-left-radius: 24px !important;
            border-bottom-right-radius: 24px !important;
            background-color: ${isDarkMode ? '#2d2d2d' : '#ffffff'} !important;
            border-top: 1px solid ${isDarkMode ? '#404040' : '#f0f0f0'} !important;
            transition: background-color 0.3s ease, border-color 0.3s ease !important;
          }
          
          /* Chart card styling - more specific selectors */
          .avg-stay-modal .chart-card,
          .avg-stay-modal div.chart-card,
          .avg-stay-modal .chart-card-wide {
            background-color: ${isDarkMode ? '#2d2d2d' : '#ffffff'} !important;
            transition: background-color 0.3s ease !important;
          }
          
          /* Chart titles and labels - more specific selectors */
          .avg-stay-modal .chart-value,
          .avg-stay-modal h2.chart-value,
          .avg-stay-modal .chart-card .chart-value,
          .avg-stay-modal .chart-card h2,
          .avg-stay-modal .chart-card-wide h2,
          .avg-stay-modal h2 {
            color: ${isDarkMode ? '#e0e0e0' : '#292124ff'} !important;
            transition: color 0.3s ease !important;
          }
          
          .avg-stay-modal .chart-label,
          .avg-stay-modal p.chart-label,
          .avg-stay-modal .chart-card .chart-label,
          .avg-stay-modal .chart-card p,
          .avg-stay-modal .chart-card-wide p,
          .avg-stay-modal p {
            color: ${isDarkMode ? '#a0a0a0' : '#6c757d'} !important;
            transition: color 0.3s ease !important;
          }
          
          /* Main container background */
          .avg-stay-modal .avg-stay-flex {
            background-color: ${isDarkMode ? '#1a1a1a' : 'transparent'} !important;
            transition: background-color 0.3s ease !important;
          }

          /* Custom modal motion for this modal only */
          .avg-stay-modal-wrap .avg-stay-fancy-enter,
          .avg-stay-modal-wrap .avg-stay-fancy-appear {
            opacity: 0;
            transform-origin: top right;
            transform: perspective(1400px) translate3d(52px, -28px, 0)
              rotateY(-28deg) rotateX(8deg) skew(-5deg, 1deg) scale3d(0.72, 0.92, 1);
            filter: blur(4px) saturate(0.9);
          }
          .avg-stay-modal-wrap .avg-stay-fancy-enter-active,
          .avg-stay-modal-wrap .avg-stay-fancy-appear-active {
            opacity: 1;
            transform-origin: top right;
            transform: perspective(1400px) translate3d(0, 0, 0)
              rotateY(0deg) rotateX(0deg) skew(0deg, 0deg) scale3d(1, 1, 1);
            filter: blur(0);
            transition: transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 360ms ease, filter 360ms ease;
            will-change: transform, opacity, filter;
          }
          .avg-stay-modal-wrap .avg-stay-fancy-leave {
            opacity: 1;
            transform-origin: top right;
            transform: perspective(1400px) translate3d(0, 0, 0)
              rotateY(0deg) rotateX(0deg) skew(0deg, 0deg) scale3d(1, 1, 1);
            filter: blur(0);
          }
          .avg-stay-modal-wrap .avg-stay-fancy-leave-active {
            opacity: 0;
            transform-origin: top right;
            transform: perspective(1400px) translate3d(40px, -18px, 0)
              rotateY(-14deg) rotateX(6deg) skew(-3deg, 1deg) scale3d(0.86, 0.95, 1);
            filter: blur(3px) saturate(0.9);
            transition: transform 300ms cubic-bezier(0.4, 0, 1, 1), opacity 230ms ease-in, filter 230ms ease-in;
          }

          /* allow the wide chart-card to show big points */
          .avg-stay-modal .chart-card.chart-card-wide {
            overflow: visible !important;
          }
          .avg-stay-modal .chart-reload-icon {
            transform-origin: center;
            transition: filter 180ms ease, opacity 180ms ease;
            will-change: transform, filter;
          }
          .avg-stay-modal .chart-reload-slot {
            width: 32px;
            height: 32px;
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .avg-stay-modal .chart-reload-fade {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 220ms ease, transform 220ms ease;
            will-change: opacity, transform;
          }
          .avg-stay-modal .chart-reload-fade.is-visible {
            opacity: 1;
            transform: scale(1);
          }
          .avg-stay-modal .chart-reload-fade.is-hidden {
            opacity: 0;
            transform: scale(0.84);
          }
          .avg-stay-modal .chart-reload-pulse {
            width: 32px;
            height: 32px;
            background: #fff;
            border-radius: 50%;
            position: relative;
            animation: avg-stay-sk-lin-rotate 1s ease-in-out infinite alternate;
          }
          .avg-stay-modal .chart-reload-pulse::after {
            content: "";
            position: absolute;
            inset: 4px;
            border-radius: 50%;
            border: 4px solid transparent;
            border-top-color: #0077ff;
          }
          @keyframes avg-stay-sk-lin-rotate {
            95%, 100% { transform: rotate(840deg); }
          }
          /* make the placeholder able to shrink/grow inside flexbox */
          .avg-stay-modal .chart-placeholder {
            min-height: 0 !important;
            overflow: visible !important;
            background-color: ${isDarkMode ? '#2d2d2d' : '#f5f5f5'} !important;
            transition: background-color 0.3s ease !important;
          }
          /* ensure the modal body doesn't clip children unexpectedly */
          .avg-stay-modal .antd5-modal-body,
          .avg-stay-modal .ant-modal-body {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
        `}</style>

        <div className="avg-stay-scale-stage">
          <div className="avg-stay-scale-content">
            <div
              className="avg-stay-flex"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(12px, 1.5vw, 20px)',
                padding: '0 clamp(8px, 1vw, 16px) clamp(8px, 1vw, 16px) clamp(8px, 1vw, 16px)',
                boxSizing: 'border-box',
                flex: '1 1 auto',
                minHeight: 0,
                backgroundColor: isDarkMode ? '#1a1a1a' : 'transparent',
                transition: 'background-color 0.3s ease',
                overflow: 'visible',
              }}
            >
          {/* Top two cards */}
          <div
            style={{
              display: 'flex',
              gap: 'clamp(12px, 1.5vw, 20px)',
              flex: '0 0 auto',
              minHeight: 'clamp(200px, 30vh, 350px)',
              marginTop: 'clamp(10px, 1.5vw, 20px)',
            }}
          >
            {/* Left card: Big Number */}
            <div
              className="chart-card"
              style={{
                flex: '1 1 43%',
                minWidth: '300px',
                minHeight: 'clamp(200px, 30vh, 350px)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: isDarkMode ? '#2d2d2d' : 'transparent',
                padding: 'clamp(12px, 1.5vw, 20px)',
                borderRadius: '12px',
                transition: 'background-color 0.3s ease',
              }}
            >
              <div style={{ width: '100%', position: 'relative' }}>
                <button
                  onClick={handleRefreshBigNumberChart}
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: isDarkMode ? 'rgba(64, 64, 64, 0.55)' : 'rgba(255, 255, 255, 0.65)',
                    border: isDarkMode ? '1px solid rgba(120,120,120,0.55)' : '1px solid rgba(232,232,232,0.85)',
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    boxShadow: isDarkMode
                      ? '0 1px 4px rgba(0,0,0,0.22)'
                      : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 4px 12px rgba(24, 144, 255, 0.4)'
                      : '0 4px 12px rgba(24, 144, 255, 0.2)';
                    e.currentTarget.style.borderColor = '#1890ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 2px 6px rgba(0,0,0,0.3)'
                      : '0 2px 6px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = isDarkMode ? '#555555' : '#e8e8e8';
                  }}
                >
                  <span className="chart-reload-slot" aria-hidden="true">
                    <span className={`chart-reload-fade ${bigNumberReloading ? 'is-hidden' : 'is-visible'}`}>
                      <RotateCw size={24} color="#1890ff" strokeWidth={2.8} className="chart-reload-icon" />
                    </span>
                    <span className={`chart-reload-fade ${bigNumberReloading ? 'is-visible' : 'is-hidden'}`}>
                      <span className="chart-reload-pulse" />
                    </span>
                  </span>
                </button>
                <h2
                  className="chart-value"
                  style={{
                    fontSize: '3rem',
                    textAlign: 'left',
                    marginBottom: '2px',
                    color: isDarkMode ? '#e0e0e0' : '#292124ff',
                    fontWeight: 700,
                    letterSpacing: '-0.5px',
                    fontFamily: '"Playfair Display", "Merriweather", Georgia, serif',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Daily Average Patient Stay
                </h2>
                <p
                  className="chart-label"
                  style={{
                    margin: '0',
                    color: isDarkMode ? '#a0a0a0' : '#6c757d',
                    fontSize: '1.8rem',
                    fontWeight: 400,
                    fontFamily: '"Merriweather", Georgia, serif',
                    textAlign: 'right',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Current average stay time for all patients
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  padding: '0',
                  boxSizing: 'border-box',
                  backgroundColor: 'transparent',
                  borderRadius: '8px',
                }}
              >
                <BigNumberStay
                  refreshKey={bigNumberRefreshKey}
                  resetKey={bigNumberResetKey}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Right card: Pie Distribution */}
            <div
              className="chart-card"
              style={{
                flex: '1 1 57%',
                minWidth: '300px',
                minHeight: 'clamp(200px, 30vh, 350px)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: isDarkMode ? '#2d2d2d' : 'transparent',
                padding: 'clamp(12px, 1.5vw, 20px)',
                borderRadius: '12px',
                transition: 'background-color 0.3s ease',
              }}
            >
              <div style={{ width: '100%', position: 'relative' }}>
                <button
                  onClick={handleRefreshPieChart}
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: isDarkMode ? 'rgba(64, 64, 64, 0.55)' : 'rgba(255, 255, 255, 0.65)',
                    border: isDarkMode ? '1px solid rgba(120,120,120,0.55)' : '1px solid rgba(232,232,232,0.85)',
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    boxShadow: isDarkMode
                      ? '0 1px 4px rgba(0,0,0,0.22)'
                      : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 4px 12px rgba(24, 144, 255, 0.4)'
                      : '0 4px 12px rgba(24, 144, 255, 0.2)';
                    e.currentTarget.style.borderColor = '#1890ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 2px 6px rgba(0,0,0,0.3)'
                      : '0 2px 6px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = isDarkMode ? '#555555' : '#e8e8e8';
                  }}
                >
                  <span className="chart-reload-slot" aria-hidden="true">
                    <span className={`chart-reload-fade ${pieReloading ? 'is-hidden' : 'is-visible'}`}>
                      <RotateCw size={24} color="#1890ff" strokeWidth={2.8} className="chart-reload-icon" />
                    </span>
                    <span className={`chart-reload-fade ${pieReloading ? 'is-visible' : 'is-hidden'}`}>
                      <span className="chart-reload-pulse" />
                    </span>
                  </span>
                </button>
                <h2
                  className="chart-value"
                  style={{
                    fontSize: '3rem',
                    textAlign: 'left',
                    marginBottom: '2px',
                    color: isDarkMode ? '#e0e0e0' : '#212529',
                    fontWeight: 700,
                    letterSpacing: '-0.5px',
                    fontFamily: '"Playfair Display", "Merriweather", Georgia, serif',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Patient Stay Distribution
                </h2>
                <p
                  className="chart-label"
                  style={{
                    margin: '0',
                    color: isDarkMode ? '#a0a0a0' : '#6c757d',
                    fontSize: '1.8rem',
                    fontWeight: 400,
                    fontFamily: '"Merriweather", Georgia, serif',
                    textAlign: 'right',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Percentage of patients across stay time ranges
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  padding: '0',
                  boxSizing: 'border-box',
                  backgroundColor: 'transparent',
                  borderRadius: '8px',
                }}
              >
                <PieChartStay
                  refreshKey={pieRefreshKey}
                  resetKey={pieResetKey}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </div>

         {/* Bottom wide card */}
          <div
            className="chart-card chart-card-wide"
            style={{
              flex: '1 1 auto',
              minHeight: 'clamp(400px, 45vh, 600px)',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 'clamp(14px, 2vw, 28px)',
              position: 'relative',
              overflow: 'visible',
              backgroundColor: isDarkMode ? '#2d2d2d' : 'transparent',
              padding: 'clamp(12px, 1.5vw, 20px)',
              borderRadius: '12px',
              transition: 'background-color 0.3s ease',
            }}
          >
            <div style={{ width: '100%', position: 'relative' }}>
              <button
                onClick={handleRefreshRunChart}
                style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  background: isDarkMode ? 'rgba(64, 64, 64, 0.55)' : 'rgba(255, 255, 255, 0.65)',
                  border: isDarkMode ? '1px solid rgba(120,120,120,0.55)' : '1px solid rgba(232,232,232,0.85)',
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  boxShadow: isDarkMode
                    ? '0 1px 4px rgba(0,0,0,0.22)'
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 4px 12px rgba(24, 144, 255, 0.4)'
                    : '0 4px 12px rgba(24, 144, 255, 0.2)';
                  e.currentTarget.style.borderColor = '#1890ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 2px 6px rgba(0,0,0,0.3)'
                    : '0 2px 6px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = isDarkMode ? '#555555' : '#e8e8e8';
                }}
              >
                <span className="chart-reload-slot" aria-hidden="true">
                  <span className={`chart-reload-fade ${runChartReloading ? 'is-hidden' : 'is-visible'}`}>
                    <RotateCw size={24} color="#1890ff" strokeWidth={2.8} className="chart-reload-icon" />
                  </span>
                  <span className={`chart-reload-fade ${runChartReloading ? 'is-visible' : 'is-hidden'}`}>
                    <span className="chart-reload-pulse" />
                  </span>
                </span>
              </button>
              <h2 className="chart-value" style={{ 
                fontSize: '3rem', 
                textAlign: 'left', 
                marginBottom: '4px', 
                color: isDarkMode ? '#e0e0e0' : '#495057', 
                fontWeight: 600,
                fontFamily: '"Playfair Display", "Merriweather", Georgia, serif',
                transition: 'color 0.3s ease',
              }}>
                Trend of patient stay duration over time
              </h2>
              <p className="chart-label" style={{ 
                margin: '0', 
                color: isDarkMode ? '#a0a0a0' : '#666', 
                fontSize: '1.8rem', 
                fontWeight: 400, 
                fontFamily: '"Merriweather", Georgia, serif',
                textAlign: 'right',
                transition: 'color 0.3s ease',
              }}>
                Historical trends and patterns in patient stay duration
              </p>
            </div>

            {/* chart-placeholder: ensure it can shrink/grow and not be clipped by parents */}
            <div
              className="chart-placeholder"
                style={{
                  height: 'clamp(350px, 40vh, 700px)',
                  fontSize: '2rem',
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  padding: '12px',
                  backgroundColor: isDarkMode ? '#2d2d2d' : 'transparent',
                  borderRadius: '8px',
                  overflow: 'visible',
                  position: 'relative',
                  transition: 'background-color 0.3s ease',
                }}>
              <RunChartStay
                refreshKey={runChartRefreshKey}
                resetKey={runChartResetKey}
                isDarkMode={isDarkMode}
              />
            </div>
            </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Dashboard Slideshow */}
      <DashboardSlideshow
        isOpen={isSlideshowOpen}
        onClose={closeSlideshow}
        dashboardId={dashboardInfo.id}
        isDarkMode={isDarkMode}
        actionsMenu={menu}
        isActionsMenuOpen={isDropdownVisible}
        onActionsMenuOpenChange={setIsDropdownVisible}
      />
    </div>
  );
};

export default Header;
