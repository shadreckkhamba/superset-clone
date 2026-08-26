import { ReactElement, useEffect, useState, useCallback, useRef } from 'react';
import { styled, t } from '@superset-ui/core';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dropdown } from 'src/components/Dropdown';
import { Icons } from 'src/components/Icons';

interface DashboardSlideshowProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: number;
  isDarkMode?: boolean;
  actionsMenu?: ReactElement;
  isActionsMenuOpen?: boolean;
  onActionsMenuOpenChange?: (open: boolean) => void;
}

const SLIDESHOW_HEADER_HEIGHT = 60;
const TIMER_BAR_HEIGHT = 4;
const MIN_TIMER_ANCHOR_HEIGHT = 40;

const SlideshowContainer = styled.div<{ isDarkMode: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: ${({ isDarkMode }) => (isDarkMode ? '#000000' : '#ffffff')};
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s ease;
`;

const SlideshowHeader = styled.div<{ isDarkMode: boolean; isVisible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: ${SLIDESHOW_HEADER_HEIGHT}px;
  background: ${({ isDarkMode }) =>
    isDarkMode
      ? 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 10000;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  pointer-events: ${({ isVisible }) => (isVisible ? 'auto' : 'none')};
  transition: opacity 0.3s ease;
  overflow: hidden;
`;

const SlideshowControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ControlButton = styled.button<{ isDarkMode: boolean }>`
  background: ${({ isDarkMode }) =>
    isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  border: 1px solid
    ${({ isDarkMode }) =>
      isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
  color: ${({ isDarkMode }) => (isDarkMode ? '#ffffff' : '#000000')};
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ isDarkMode }) =>
      isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const SlideIndicator = styled.div<{ isDarkMode: boolean }>`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Dot = styled.div<{ active: boolean; isDarkMode: boolean }>`
  width: ${({ active }) => (active ? '24px' : '8px')};
  height: 8px;
  border-radius: 4px;
  background: ${({ active, isDarkMode }) =>
    active
      ? isDarkMode
        ? '#4fc3f7'
        : '#1890ff'
      : isDarkMode
        ? 'rgba(255,255,255,0.3)'
        : 'rgba(0,0,0,0.2)'};
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background: ${({ active, isDarkMode }) =>
      active
        ? isDarkMode
          ? '#4fc3f7'
          : '#1890ff'
        : isDarkMode
          ? 'rgba(255,255,255,0.5)'
          : 'rgba(0,0,0,0.4)'};
  }
`;

const IframeContainer = styled.div<{ isActive: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: ${({ isActive }) => (isActive ? 1 : 0)};
  pointer-events: ${({ isActive }) => (isActive ? 'auto' : 'none')};
  transition: opacity 0.6s ease;
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const SLIDES = [
  { key: 'clinical', label: 'Clinical Service Monitoring', view: 'main' },
  { key: 'stay', label: 'Patient Stay Times', view: 'stay' },
];

const ROTATION_INTERVAL = 20000; // 20  seconds per slide

const TimerBar = styled.div<{
  progress: number;
  isDarkMode: boolean;
  topOffset: number;
}>`
  position: absolute;
  top: ${({ topOffset }) => topOffset}px;
  left: 0;
  height: ${TIMER_BAR_HEIGHT}px;
  width: ${({ progress }) => progress}%;
  background: ${({ isDarkMode }) => (isDarkMode ? '#64a0d0 ' : '#64a0d0')};
  transition: width 0.1s linear;
  z-index: 10001;
  pointer-events: none;
`;

export default function DashboardSlideshow({
  isOpen,
  onClose,
  dashboardId,
  isDarkMode = false,
  actionsMenu,
  isActionsMenuOpen = false,
  onActionsMenuOpenChange,
}: DashboardSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [timerProgress, setTimerProgress] = useState(0);
  const [timerSyncKey, setTimerSyncKey] = useState(0);
  const [timerAlignment, setTimerAlignment] = useState<{
    slideIndex: number;
    topOffset: number;
  } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  // Build iframe URLs
  const getSlideUrl = useCallback(
    (slideIndex: number) => {
      const slide = SLIDES[slideIndex];
      const darkModeParam = isDarkMode ? '&dark=1' : '';
      const baseUrl = `/superset/dashboard/${dashboardId}/?standalone=1&slideshow=1${darkModeParam}`;

      // For Patient Stay Times view, add a parameter to trigger that view
      if (slide.view === 'stay') {
        const url = `${baseUrl}&view=stay`;
        return url;
      }

      return baseUrl;
    },
    [dashboardId, isDarkMode],
  );

  // Debug: Log URLs when component mounts
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 Slideshow: Dashboard ID:', dashboardId);
      console.log('🎬 Slideshow: All slide URLs:');
      SLIDES.forEach((slide, index) => {
        console.log(`  ${index}: ${slide.label} → ${getSlideUrl(index)}`);
      });
    }
  }, [isOpen, dashboardId, getSlideUrl]);

  // Debug: Log slide changes
  useEffect(() => {
    if (isOpen) {
      console.log(
        `🎬 Slideshow: Current slide changed to ${currentSlide} - ${SLIDES[currentSlide].label}`,
      );
    }
  }, [currentSlide, isOpen]);

  const getTimerAnchorElement = useCallback(
    (slideIndex = currentSlide) => {
      const iframe = iframeRefs.current[slideIndex];
      const doc = iframe?.contentDocument;
      if (!doc) {
        return null;
      }

      return (
        (doc.querySelector(
          '[data-test="dashboard-header-container"]',
        ) as HTMLElement | null) ||
        (doc.querySelector('.dashboard-header') as HTMLElement | null)
      );
    },
    [currentSlide],
  );

  const syncTimerOffset = useCallback(
    (slideIndex = currentSlide) => {
      try {
        const headerEl = getTimerAnchorElement(slideIndex);
        if (!headerEl) {
          return false;
        }

        const rect = headerEl.getBoundingClientRect();
        if (rect.height < MIN_TIMER_ANCHOR_HEIGHT) {
          return false;
        }

        const topOffset = Math.round(rect.bottom);
        setTimerAlignment(previousAlignment => {
          if (
            previousAlignment?.slideIndex === slideIndex &&
            previousAlignment.topOffset === topOffset
          ) {
            return previousAlignment;
          }

          return { slideIndex, topOffset };
        });
        return true;
      } catch (error) {
        console.warn('Timer bar alignment failed:', error);
        return false;
      }
    },
    [currentSlide, getTimerAnchorElement],
  );

  // Auto-advance slides with progress bar
  useEffect(() => {
    if (!isOpen || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return () => undefined;
    }

    // Reset timer
    startTimeRef.current = Date.now();
    setTimerProgress(0);

    // Update progress bar every 100ms
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / ROTATION_INTERVAL) * 100, 100);
      setTimerProgress(progress);
    }, 100);

    // Advance to next slide
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
      startTimeRef.current = Date.now();
      setTimerProgress(0);
    }, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, isPaused, currentSlide]);

  useEffect(() => {
    if (!isOpen) {
      setTimerAlignment(null);
      return () => undefined;
    }

    let animationFrameId = 0;
    let retryIntervalId = 0;

    const sync = () => {
      syncTimerOffset(currentSlide);
    };

    const scheduleSync = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = 0;
        sync();
      });
    };

    scheduleSync();
    const timeoutIds = [120, 320, 700, 1200, 2000].map(delay =>
      window.setTimeout(scheduleSync, delay),
    );
    retryIntervalId = window.setInterval(scheduleSync, 120);
    const stopRetryTimerId = window.setTimeout(() => {
      if (retryIntervalId) {
        window.clearInterval(retryIntervalId);
        retryIntervalId = 0;
      }
    }, 5000);

    window.addEventListener('resize', scheduleSync);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (retryIntervalId) {
        window.clearInterval(retryIntervalId);
      }
      timeoutIds.forEach(id => window.clearTimeout(id));
      window.clearTimeout(stopRetryTimerId);
      window.removeEventListener('resize', scheduleSync);
    };
  }, [currentSlide, isOpen, syncTimerOffset, timerSyncKey]);

  // Auto-hide controls after 3 seconds of no mouse movement
  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (!isOpen) return () => undefined;

    const handleMouseMove = () => showControls();
    const handleKeyDown = (e: KeyboardEvent) => {
      showControls();

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide(prev => (prev + 1) % SLIDES.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    // Show controls initially
    showControls();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isOpen, onClose, showControls]);

  // Handle iframe load
  const handleIframeLoad = useCallback(
    (slideIndex: number) => {
      const slide = SLIDES[slideIndex];
      console.log(
        `✅ Slideshow: Slide ${slideIndex} (${slide.label}) iframe loaded successfully`,
      );

      if (slideIndex === currentSlide) {
        setTimerSyncKey(previousKey => previousKey + 1);
        syncTimerOffset(slideIndex);
      }
    },
    [currentSlide, syncTimerOffset],
  );

  // Navigate to specific slide
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    startTimeRef.current = Date.now();
    setTimerProgress(0);
  }, []);

  // Previous/Next handlers
  const handlePrevious = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
    startTimeRef.current = Date.now();
    setTimerProgress(0);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    startTimeRef.current = Date.now();
    setTimerProgress(0);
  }, []);

  if (!isOpen) return null;

  return (
    <SlideshowContainer isDarkMode={isDarkMode}>
      <SlideshowHeader isDarkMode={isDarkMode} isVisible={controlsVisible}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: isDarkMode ? '#ffffff' : '#000000',
            }}
          >
            {SLIDES[currentSlide].label}
          </span>
        </div>
      </SlideshowHeader>

      {!isPaused && timerAlignment?.slideIndex === currentSlide && (
        <TimerBar
          progress={timerProgress}
          isDarkMode={isDarkMode}
          topOffset={timerAlignment.topOffset}
        />
      )}

      {/* Render all iframes but only show the active one */}
      {SLIDES.map((slide, index) => {
        const url = getSlideUrl(index);
        return (
          <IframeContainer key={slide.key} isActive={index === currentSlide}>
            <StyledIframe
              ref={node => {
                iframeRefs.current[index] = node;
              }}
              key={`${slide.key}-${url}`}
              src={url}
              title={slide.label}
              onLoad={() => handleIframeLoad(index)}
              allow="fullscreen"
            />
          </IframeContainer>
        );
      })}
    </SlideshowContainer>
  );
}
