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
import { FC, useEffect, useState } from 'react';

import { FAST_DEBOUNCE, css, styled } from '@superset-ui/core';
import { RootState } from 'src/dashboard/types';
import { useSelector } from 'react-redux';
import { useDragDropManager } from 'react-dnd';
import classNames from 'classnames';
import { debounce } from 'lodash';

const AUTO_ZOOM_BASE_WIDTH = 2000;
const AUTO_ZOOM_MIN_SCALE = 0.67;
const PATIENT_STAY_BASE_WIDTH = 1600; // Reduced from 3000 to prevent excessive scaling
const SCALE_TARGET_SELECTOR =
  '[data-test="dashboard-content-wrapper"], .patient-stay-overlay-content';

const StyledDiv = styled.div`
  ${({ theme }) => css`
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr;
    flex: 1;
    /* Special cases */

    &.dragdroppable--dragging {
      &
        .dashboard-component-tabs-content
        > .empty-droptarget.empty-droptarget--full {
        height: 100%;
      }
      & .empty-droptarget:before {
        display: block;
        border-color: ${theme.colors.primary.light1};
        background-color: ${theme.colors.primary.light3};
      }
      & .grid-row:after {
        border-style: hidden;
      }
      & .droptarget-side:last-child {
        inset-inline-end: 0;
      }
      & .droptarget-edge:last-child {
        inset-block-end: 0;
      }
    }

    /* A row within a column has inset hover menu */
    .dragdroppable-column .dragdroppable-row .hover-menu--left {
      left: ${theme.gridUnit * -3}px;
      background: ${theme.colors.grayscale.light5};
      border: 1px solid ${theme.colors.grayscale.light2};
    }

    .dashboard-component-tabs {
      position: relative;
    }

    /* A column within a column or tabs has inset hover menu */
    .dragdroppable-column .dragdroppable-column .hover-menu--top,
    .dashboard-component-tabs .dragdroppable-column .hover-menu--top {
      top: ${theme.gridUnit * -3}px;
      background: ${theme.colors.grayscale.light5};
      border: 1px solid ${theme.colors.grayscale.light2};
    }

    /* move Tabs hover menu to top near actual Tabs */
    .dashboard-component-tabs > .hover-menu-container > .hover-menu--left {
      top: 0;
      transform: unset;
      background: transparent;
    }

    /* push Chart actions to upper right */
    .dragdroppable-column .dashboard-component-chart-holder .hover-menu--top,
    .dragdroppable .dashboard-component-header .hover-menu--top {
      right: ${theme.gridUnit * 2}px;
      top: ${theme.gridUnit * 2}px;
      background: transparent;
      border: none;
      transform: unset;
      left: unset;
    }
    div:hover > .hover-menu-container .hover-menu,
    .hover-menu-container .hover-menu:hover {
      opacity: 1;
    }

    p {
      margin: 0 0 ${theme.gridUnit * 2}px 0;
    }

    i.danger {
      color: ${theme.colors.error.base};
    }

    i.warning {
      color: ${theme.colors.warning.base};
    }
  `}
`;

type Props = {};

const DashboardWrapper: FC<Props> = ({ children }) => {
  const editMode = useSelector<RootState, boolean>(
    state => state.dashboardState.editMode,
  );
  const dragDropManager = useDragDropManager();
  const [isDragged, setIsDragged] = useState(
    dragDropManager.getMonitor().isDragging(),
  );

  useEffect(() => {
    const monitor = dragDropManager.getMonitor();
    const debouncedSetIsDragged = debounce(setIsDragged, FAST_DEBOUNCE);
    const unsub = monitor.subscribeToStateChange(() => {
      const isDragging = monitor.isDragging();
      if (isDragging) {
        // set a debounced function to prevent HTML5 drag source
        // from interfering with the drop zone highlighting
        debouncedSetIsDragged(true);
      } else {
        debouncedSetIsDragged.cancel();
        setIsDragged(false);
      }
    });

    return () => {
      unsub();
      debouncedSetIsDragged.cancel();
    };
  }, [dragDropManager]);

  useEffect(() => {
    const getScaleTargets = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(SCALE_TARGET_SELECTOR),
      );

    const resetScale = (targets: HTMLElement[]) => {
      targets.forEach(target => {
        target.style.zoom = '';
        target.style.transform = '';
        target.style.transformOrigin = '';
        target.style.width = '';
      });
    };

    const applyScale = () => {
      const targets = getScaleTargets();
      if (!targets.length) return;

      if (editMode) {
        resetScale(targets);
        return;
      }

      const viewportWidth = window.innerWidth || AUTO_ZOOM_BASE_WIDTH;
      targets.forEach(target => {
        const baseWidth = target.classList.contains('patient-stay-overlay-content')
          ? PATIENT_STAY_BASE_WIDTH
          : AUTO_ZOOM_BASE_WIDTH;

        // For patient stay overlay, use more conservative scaling to prevent overflow
        const minScale = target.classList.contains('patient-stay-overlay-content')
          ? 0.85 // Higher minimum scale for patient stay overlay
          : AUTO_ZOOM_MIN_SCALE;

        const computedScale = Math.max(
          minScale,
          Math.min(1, viewportWidth / baseWidth),
        );

        if ('zoom' in target.style) {
          target.style.zoom =
            computedScale === 1 ? '' : String(computedScale);
          target.style.transform = '';
          target.style.transformOrigin = '';
          target.style.width =
            computedScale === 1 ? '' : `${100 / computedScale}%`;
        } else if (computedScale === 1) {
          target.style.transform = '';
          target.style.transformOrigin = '';
          target.style.width = '';
          target.style.zoom = '';
        } else {
          target.style.transform = `scale(${computedScale})`;
          target.style.transformOrigin = 'top left';
          target.style.width = `${100 / computedScale}%`;
          target.style.zoom = '';
        }
      });
    };

    // Delay one frame to ensure dashboard content wrapper exists.
    const rafId = window.requestAnimationFrame(applyScale);
    const observer = new MutationObserver(() => applyScale());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', applyScale);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', applyScale);
      resetScale(getScaleTargets());
    };
  }, [editMode]);

  return (
    <StyledDiv
      className={classNames({
        'dragdroppable--dragging': editMode && isDragged,
      })}
    >
      {children}
    </StyledDiv>
  );
};

export default DashboardWrapper;
