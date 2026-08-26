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
/* eslint-env browser */
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

const extensionsRegistry = getExtensionsRegistry();

const headerContainerStyle = theme => css`
  border-bottom: 1px solid ${theme.colors.grayscale.light2};
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
   
  //Get the dashboard slug from the URL query parameters
  const query = new URLSearchParams(location.search);
  const isStandalone = query.get('standalone') === '1';
  //debugging
  console.log('Rendering Header - isStandalone:', isStandalone);
  
  const [selectedFilterIds, setSelectedFilterIds] = useState([]);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const isViewingDashboard = /^\/superset\/dashboard\/\d+$/.test(location.pathname);
  
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);

    const isNightTime = () => {
    const hour = new Date().getHours();
    console.log('Current hour is', hour);
    return hour >= 18 || hour < 6;
  };

   useEffect(() => {
    const applyStandaloneDarkTheme = () => {
      const darkThemeLinkId = 'dark-theme-style';
      const existingLink = document.querySelector<HTMLLinkElement>(`#${darkThemeLinkId}`);

      const darkModeActive = isStandalone && isNightTime();

      const lastMode = sessionStorage.getItem('mode');
      const currentMode = darkModeActive ? 'dark' : 'light';

      // Reload only if mode changed
      if (currentMode !== lastMode) {
        sessionStorage.setItem('mode', currentMode);
        window.location.reload();
        return;
      }

      document.body.classList.add('theme-transitioning');

      if (darkModeActive) {
        if (!existingLink) {
          const link = document.createElement('link');
          link.id = darkThemeLinkId;
          link.rel = 'stylesheet';
          link.href = '/static/assets/stylesheets/dark-theme.css';
          document.head.appendChild(link);
        }
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
        if (existingLink) {
          existingLink.remove();
        }
      }

      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, 500);
    };

    applyStandaloneDarkTheme();

    const intervalId = setInterval(applyStandaloneDarkTheme, 60_000);

    return () => {
      clearInterval(intervalId);
      const link = document.querySelector(`#dark-theme-style`);
      if (link) link.remove();
      document.body.classList.remove('dark-theme', 'theme-transitioning');
      sessionStorage.removeItem('mode');
    };
  }, [isStandalone]);

  useEffect(() => {
    const fetchLastUpdated = () => {
      fetch('http://198.251.76.216:5001/wandikweza/last_update_status')
        .then(res => res.json())
        .then(data => {
          if (data.last_updated) {
            setLastUpdatedTime(data.last_updated);
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
        const res = await fetch('http://198.251.76.216:5001/wandikweza/last_update_status');
        const data = await res.json();

        const apiTimestamp = new Date(data.last_updated).getTime();
        if (apiTimestamp > lastUpdatedRef.current) {
          console.log('🔄 API change detected — refreshing charts');
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
      return boundActionCreators.onRefresh(chartIds, true, 0, dashboardInfo.id);
    }
    return false;
  }, [boundActionCreators, chartIds, dashboardInfo.id, isLoading]);

  const toggleEditMode = useCallback(() => {
    boundActionCreators.logEvent(LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD, {
      edit_mode: !editMode,
    });
    boundActionCreators.setEditMode(!editMode);
  }, [boundActionCreators, editMode]);

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
  const titlePanelAdditionalItems = useMemo(
    () => [
      !editMode && !isStandalone && (
        <PublishedStatus
          dashboardId={dashboardInfo.id}
          isPublished={isPublished}
          savePublished={boundActionCreators.savePublished}
          userCanEdit={userCanEdit}
          userCanSave={userCanSaveAs}
          visible={!editMode}
        />
      ),
      !editMode && !isStandalone && !isEmbedded && metadataBar, isStandalone,
    ],
    [
      boundActionCreators.savePublished,
      dashboardInfo.id,
      editMode,
      isStandalone,
      metadataBar,
      isEmbedded,
      isPublished,
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
       console.log('✅ Using API time:', parsed);
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
     console.log('⏰ Using fallback snapped:', snapped);
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
        {/* ... your full JSX here ... */}
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
                    >
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
  });

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
  

  return (
    <div
      css={headerContainerStyle}
      data-test="dashboard-header-container"
      data-test-id={dashboardInfo.id}
      className="dashboard-header-container"
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
        `}
      />

    <Modal
          title={t('Generate Report')}
          visible={isReportsModalVisible}
          onHide={closeReportsModal}
          style={{ top: '20px' }}
          bodyStyle={{ padding: 0, overflow: 'hidden' }}
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
                position: 'sticky',
                bottom: 0,
                background: 'white',
                padding: '8px 24px',
                borderTop: 'none',
              }}
            >
              {/* Title selector on far left of footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                    <label
                      htmlFor="report-title"
                      style={{ fontWeight: 'bold', fontSize: '16px', marginRight: '8px' }}
                    >
                      {t('Title')}
                    </label>
                    <input
                      id="report-title"
                      type="text"
                      value={reportTitle}
                      onChange={e => setReportTitle(e.target.value)}
                      placeholder={t('Enter report title')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        width: '200px',
                        backgroundColor: reportTitle ? '#fff' : '#f5f5f5',
                        transition: 'width 0.4s ease, background-color 0.4s ease, border-color 0.4s ease',
                        outline: 'none',
                      }}
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
          <div style={{ display: 'flex', height: '50vh', overflow: 'hidden' }}>
            {/* Left panel with tabs */}
            <div
              style={{
                width: '160px',
                borderRight: '1px solid #ccc',
                padding: '12px',
              }}
            >
              <div
                style={{
                  cursor: 'pointer',
                  marginBottom: '12px',
                  fontWeight: activeTab === 'filters' ? 'bold' : 'normal',
                  backgroundColor: activeTab === 'filters' ? '#f0f0f0' : 'transparent',
                  padding: '8px',
                  borderRadius: '4px',
                }}
                onClick={() => setActiveTab('filters')}
              >
                {t('Select Filters')}
              </div>
              <div
                style={{
                  cursor: 'pointer',
                  fontWeight: activeTab === 'charts' ? 'bold' : 'normal',
                  backgroundColor: activeTab === 'charts' ? '#f0f0f0' : 'transparent',
                  padding: '8px',
                  borderRadius: '4px',
                }}
                onClick={() => setActiveTab('charts')}
              >
                {t('Select Charts')}
              </div>
            </div>

            {/* Right panel: only scroll here */}
            <div
              style={{
                flex: 1,
                padding: '12px',
                overflowY: 'auto',
              }}
            >
              {activeTab === 'filters' ? (
              <>
                {Array.isArray(appliedFilters) && appliedFilters.length > 0 ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
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
                      <div key={filter.id} style={{ marginBottom: '8px' }}>
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
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
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
                      <div key={panel.id} style={{ marginBottom: '8px' }}>
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
    </div>
  );
};

export default Header;
