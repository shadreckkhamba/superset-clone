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
import { PureComponent, MouseEvent, createRef, CSSProperties } from 'react';
import {
  t,
  getNumberFormatter,
  getTimeFormatter,
  SMART_DATE_VERBOSE_ID,
  computeMaxFontSize,
  BRAND_COLOR,
  styled,
  BinaryQueryObjectFilterClause,
} from '@superset-ui/core';
import Echart from '../components/Echart';
import { BigNumberVizProps } from './types';
import { EventHandlers } from '../types';

const defaultNumberFormatter = getNumberFormatter();

const PROPORTION = {
  // text size: proportion of the chart container sans trendline
  METRIC_NAME: 0.18,
  KICKER: 0.15,
  HEADER: 0.55,
  SUBHEADER: 0.18,
  // trendline size: proportion of the whole chart container
  TRENDLINE: 0.3,
};

type BigNumberVisState = {
  elementsRendered: boolean;
  recalculateTrigger: boolean;
  isRefreshing: boolean;
};

class BigNumberVis extends PureComponent<BigNumberVizProps, BigNumberVisState> {
  static defaultProps = {
    className: '',
    headerFormatter: defaultNumberFormatter,
    formatTime: getTimeFormatter(SMART_DATE_VERBOSE_ID),
    headerFontSize: PROPORTION.HEADER,
    kickerFontSize: PROPORTION.KICKER,
    metricNameFontSize: PROPORTION.METRIC_NAME,
    showMetricName: true,
    mainColor: BRAND_COLOR,
    showTimestamp: false,
    showTrendLine: false,
    startYAxisAtZero: true,
    subheader: '',
    subheaderFontSize: PROPORTION.SUBHEADER,
    timeRangeFixed: false,
  };

  // Create refs for each component to measure heights
  metricNameRef = createRef<HTMLDivElement>();

  kickerRef = createRef<HTMLDivElement>();

  headerRef = createRef<HTMLDivElement>();

  subheaderRef = createRef<HTMLDivElement>();

  subtitleRef = createRef<HTMLDivElement>();

  state = {
    elementsRendered: false,
    recalculateTrigger: false,
    isRefreshing: false,
  };

  componentDidMount() {
    // Wait for elements to render and then calculate heights
    setTimeout(() => {
      this.setState({ elementsRendered: true });
    }, 0);
  }

  componentDidUpdate(prevProps: BigNumberVizProps) {
    if (
      this.state.isRefreshing &&
      (prevProps.bigNumber !== this.props.bigNumber ||
        prevProps.timestamp !== this.props.timestamp ||
        prevProps.subtitle !== this.props.subtitle)
    ) {
      this.setState({ isRefreshing: false });
    }

    if (
      prevProps.height !== this.props.height ||
      prevProps.showTrendLine !== this.props.showTrendLine
    ) {
      this.setState(prevState => ({
        recalculateTrigger: !prevState.recalculateTrigger,
      }));
    }
  }

  getClassName() {
    const { className, showTrendLine, bigNumberFallback } = this.props;
    const names = `superset-legacy-chart-big-number ${className} ${
      bigNumberFallback ? 'is-fallback-value' : ''
    }`;
    if (showTrendLine) return names;
    return `${names} no-trendline`;
  }

  createTemporaryContainer() {
    const container = document.createElement('div');
    container.className = this.getClassName();
    container.style.position = 'absolute'; // so it won't disrupt page layout
    container.style.opacity = '0'; // and not visible
    return container;
  }

  renderFallbackWarning() {
    const { bigNumberFallback, formatTime, showTimestamp } = this.props;
    if (!formatTime || !bigNumberFallback || showTimestamp) return null;
    return (
      <span
        className="alert alert-warning"
        role="alert"
        title={t(
          `Last available value seen on %s`,
          formatTime(bigNumberFallback[0]),
        )}
      >
        {t('Not up to date')}
      </span>
    );
  }

  renderMetricName(maxHeight: number) {
    const { metricName, width, showMetricName } = this.props;
    if (!showMetricName || !metricName) return null;

    const text = metricName;

    const container = this.createTemporaryContainer();
    document.body.append(container);
    const fontSize = computeMaxFontSize({
      text,
      maxWidth: width,
      maxHeight,
      className: 'metric-name',
      container,
    });
    container.remove();

    return (
      <div
        ref={this.metricNameRef}
        className="metric-name"
        style={{
          fontSize,
          height: 'auto',
        }}
      >
        {text}
      </div>
    );
  }

  renderKicker(maxHeight: number) {
    const { timestamp, showTimestamp, formatTime, width } = this.props;
    if (
      !formatTime ||
      !showTimestamp ||
      typeof timestamp === 'string' ||
      typeof timestamp === 'bigint' ||
      typeof timestamp === 'boolean'
    )
      return null;

    const text = timestamp === null ? '' : formatTime(timestamp);

    const container = this.createTemporaryContainer();
    document.body.append(container);
    const fontSize = computeMaxFontSize({
      text,
      maxWidth: width,
      maxHeight,
      className: 'kicker',
      container,
    });
    container.remove();

    return (
      <div
        ref={this.kickerRef}
        className="kicker"
        style={{
          fontSize,
          height: 'auto',
        }}
      >
        {text}
      </div>
    );
  }

  renderHeader(maxHeight: number) {
    const {
      bigNumber,
      headerFormatter,
      width,
      colorThresholdFormatters,
      showTrendLine,
    } = this.props;
    // @ts-ignore
    const text = bigNumber === null ? t('No data') : headerFormatter(bigNumber);

    const hasThresholdColorFormatter =
      Array.isArray(colorThresholdFormatters) &&
      colorThresholdFormatters.length > 0;
    const isDarkMode =
      typeof document !== 'undefined' &&
      (document.body.classList.contains('dark-theme') ||
        document.body.getAttribute('data-theme') === 'dark' ||
        document.documentElement.getAttribute('data-theme') === 'dark');

    let numberColor;
    if (hasThresholdColorFormatter) {
      colorThresholdFormatters!.forEach(formatter => {
        const formatterResult = bigNumber
          ? formatter.getColorFromValue(bigNumber as number)
          : false;
        if (formatterResult) {
          numberColor = formatterResult;
        }
      });
    } else {
      numberColor = isDarkMode ? '#eef8fa' : 'black';
    }

    const maxHeaderWidth = showTrendLine
      ? width * 0.9
      : Math.max(Math.min(width * 0.42, 180), 84);

    const container = this.createTemporaryContainer();
    document.body.append(container);
    const fontSize = computeMaxFontSize({
      text,
      maxWidth: maxHeaderWidth,
      maxHeight,
      className: 'header-line',
      container,
    });
    container.remove();

    const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
      if (this.props.onContextMenu) {
        e.preventDefault();
        this.props.onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
      }
    };

    return (
      <div
        ref={this.headerRef}
        className="header-line"
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize,
          height: 'auto',
          color: numberColor,
        }}
        onContextMenu={onContextMenu}
      >
        {text}
      </div>
    );
  }

  rendermetricComparisonSummary(maxHeight: number) {
    const { subheader, width } = this.props;
    let fontSize = 0;

    const text = subheader;

    if (text) {
      const container = this.createTemporaryContainer();
      document.body.append(container);
      try {
        fontSize = computeMaxFontSize({
          text,
          maxWidth: width * 0.9,
          maxHeight,
          className: 'subheader-line',
          container,
        });
      } finally {
        container.remove();
      }

      return (
        <div
          ref={this.subheaderRef}
          className="subheader-line"
          style={{
            fontSize,
            height: maxHeight,
          }}
        >
          {text}
        </div>
      );
    }
    return null;
  }

  renderSubtitle(maxHeight: number) {
    const { subtitle, width, bigNumber, bigNumberFallback } = this.props;
    let fontSize = 0;

    const NO_DATA_OR_HASNT_LANDED = t(
      'No data after filtering or data is NULL for the latest time record',
    );
    const NO_DATA = t(
      'Try applying different filters or ensuring your datasource has data',
    );

    let text = subtitle;
    if (bigNumber === null) {
      text =
        subtitle || (bigNumberFallback ? NO_DATA : NO_DATA_OR_HASNT_LANDED);
    }

    if (text) {
      const container = this.createTemporaryContainer();
      document.body.append(container);
      fontSize = computeMaxFontSize({
        text,
        maxWidth: width * 0.9,
        maxHeight,
        className: 'subtitle-line',
        container,
      });
      container.remove();

      return (
        <>
          <div
            ref={this.subtitleRef}
            className="subtitle-line subheader-line"
            style={{
              fontSize: `${fontSize}px`,
              height: maxHeight,
            }}
          >
            {text}
          </div>
        </>
      );
    }
    return null;
  }

  renderTrendline(maxHeight: number) {
    const { width, trendLineData, echartOptions, refs } = this.props;

    // if can't find any non-null values, no point rendering the trendline
    if (!trendLineData?.some(d => d[1] !== null)) {
      return null;
    }

    const eventHandlers: EventHandlers = {
      contextmenu: eventParams => {
        if (this.props.onContextMenu) {
          eventParams.event.stop();
          const { data } = eventParams;
          if (data) {
            const pointerEvent = eventParams.event.event;
            const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
            drillToDetailFilters.push({
              col: this.props.formData?.granularitySqla,
              grain: this.props.formData?.timeGrainSqla,
              op: '==',
              val: data[0],
              formattedVal: this.props.xValueFormatter?.(data[0]),
            });
            this.props.onContextMenu(
              pointerEvent.clientX,
              pointerEvent.clientY,
              { drillToDetail: drillToDetailFilters },
            );
          }
        }
      },
    };

    return (
      echartOptions && (
        <Echart
          refs={refs}
          width={Math.floor(width)}
          height={maxHeight}
          echartOptions={echartOptions}
          eventHandlers={eventHandlers}
        />
      )
    );
  }

  getTotalElementsHeight() {
    const marginPerElement = 8; // theme.gridUnit = 4, so margin-bottom = 8px

    const refs = [
      this.metricNameRef,
      this.kickerRef,
      this.headerRef,
      this.subheaderRef,
      this.subtitleRef,
    ];

    // Filter refs to only those with a current element
    const visibleRefs = refs.filter(ref => ref.current);

    const totalHeight = visibleRefs.reduce((sum, ref, index) => {
      const height = ref.current?.offsetHeight || 0;
      const margin = index < visibleRefs.length - 1 ? marginPerElement : 0;
      return sum + height + margin;
    }, 0);

    return totalHeight;
  }

  shouldApplyOverflow(availableHeight: number) {
    if (!this.state.elementsRendered) return false;
    const totalHeight = this.getTotalElementsHeight();
    return totalHeight > availableHeight;
  }

  handleRefreshClick = () => {
    const { onRefresh } = this.props;
    if (this.state.isRefreshing) return;

    this.setState({ isRefreshing: true });
    if (onRefresh) {
      onRefresh();
    } else {
      // Fallback interaction path when chart hook doesn't expose onRefresh.
      // Keeps the icon interactive and gives visual feedback.
      this.setState(prevState => ({
        recalculateTrigger: !prevState.recalculateTrigger,
      }));
      window.dispatchEvent(new CustomEvent('superset:refresh-chart'));
      window.dispatchEvent(new CustomEvent('superset:dashboard-refresh'));
    }

    // Fallback so the icon never gets stuck spinning if refresh callback
    // doesn't emit a value update for any reason.
    window.setTimeout(() => {
      this.setState(prevState =>
        prevState.isRefreshing ? { isRefreshing: false } : null,
      );
    }, onRefresh ? 2200 : 900);
  };

  render() {
    const {
      showTrendLine,
      height,
      width,
      kickerFontSize,
      headerFontSize,
      subtitleFontSize,
      metricNameFontSize,
      subheaderFontSize,
      metricName,
      subtitle,
      bigNumber,
      trendLineData,
      bigNumberFallback,
    } = this.props;
    const isLoading =
      bigNumber === undefined &&
      !bigNumberFallback &&
      !(trendLineData && trendLineData.length > 0);
    const className = `${this.getClassName()}${isLoading ? ' is-loading' : ''}`;

    if (showTrendLine) {
      const chartHeight = Math.floor(PROPORTION.TRENDLINE * height);
      const allTextHeight = height - chartHeight;
      const shouldApplyOverflow = this.shouldApplyOverflow(allTextHeight);

      return (
        <div className={className}>
          <div
            className="text-container"
            style={{
              height: allTextHeight,
              ...(shouldApplyOverflow
                ? {
                    display: 'block',
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    width: '100%',
                  }
                : {}),
            }}
          >
            {this.renderFallbackWarning()}
            {this.renderMetricName(
              Math.ceil(
                (metricNameFontSize || 0) * (1 - PROPORTION.TRENDLINE) * height,
              ),
            )}
            {this.renderKicker(
              Math.ceil(
                (kickerFontSize || 0) * (1 - PROPORTION.TRENDLINE) * height,
              ),
            )}
            {this.renderHeader(
              Math.ceil(headerFontSize * (1 - PROPORTION.TRENDLINE) * height),
            )}
            {this.rendermetricComparisonSummary(
              Math.ceil(
                subheaderFontSize * (1 - PROPORTION.TRENDLINE) * height,
              ),
            )}
            {this.renderSubtitle(
              Math.ceil(subtitleFontSize * (1 - PROPORTION.TRENDLINE) * height),
            )}
          </div>
          {this.renderTrendline(chartHeight)}
        </div>
      );
    }
    const shouldApplyOverflow = this.shouldApplyOverflow(height);
    const metricLabelText = metricName ? String(metricName) : '';
    const subtitleText = subtitle ? String(subtitle).trim() : '';
    const hasBigNumberValue =
      typeof bigNumber === 'number' && Number.isFinite(bigNumber);
    const emptyStateText = 'No data available';
    
    const fallbackFromBigNumber = hasBigNumberValue
      ? defaultNumberFormatter(bigNumber)
      : emptyStateText;
    
    const safeWidth = Number.isFinite(width) ? width : 320;
    const fontSize = Math.max(
      Math.min(safeWidth * 0.3, height * 0.5, 180),
      42,
    );
    const noTrendlineStyle: CSSProperties = {
      height,
    } as CSSProperties;

    return (
      <div
        className={className}
        style={{
          ...noTrendlineStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          ...(shouldApplyOverflow
            ? {
                display: 'flex',
                boxSizing: 'border-box',
                overflowX: 'hidden',
                overflowY: 'auto',
                width: '100%',
              }
            : {}),
        }}
      >
        <div
          className="text-container--kpi"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            className="header-line"
            style={{
              fontSize: hasBigNumberValue
                ? `clamp(${Math.round(fontSize * 0.5)}px, ${fontSize}px, ${fontSize}px)`
                : `clamp(20px, ${Math.max(Math.min(safeWidth * 0.07, 32), 20)}px, 32px)`,
              fontWeight: 800,
              color: '#15333a',
              textAlign: 'center',
              lineHeight: 1.05,
              fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {fallbackFromBigNumber}
          </div>
          {!hasBigNumberValue && (
            <div
              className="subtitle-line subheader-line"
              style={{
                fontSize: 'clamp(13px, 2vw, 18px)',
                fontWeight: 600,
                color: '#5d7079',
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              {subtitleText ||
                'No records were returned for the selected time range.'}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default styled(BigNumberVis)`
  ${({ theme }) => `
    font-family: ${theme.typography.families.sansSerif};
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;

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
      border-radius: ${theme.gridUnit * 3}px;
      background: linear-gradient(
        90deg,
        rgba(130, 152, 164, 0.16) 0%,
        rgba(130, 152, 164, 0.32) 45%,
        rgba(130, 152, 164, 0.16) 100%
      );
      background-size: 220% 100%;
      animation: bigNumberThemeSkeletonShimmer 1.1s linear infinite;
      z-index: 3;
    }

    &.is-loading {
      position: relative;
      overflow: hidden;
    }

    &.is-loading > * {
      opacity: 0;
      pointer-events: none;
    }

    &.is-loading::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: ${theme.gridUnit * 3}px;
      background: linear-gradient(
        90deg,
        rgba(130, 152, 164, 0.16) 0%,
        rgba(130, 152, 164, 0.32) 45%,
        rgba(130, 152, 164, 0.16) 100%
      );
      background-size: 220% 100%;
      animation: bigNumberThemeSkeletonShimmer 1.1s linear infinite;
      z-index: 3;
    }

    @keyframes bigNumberThemeSkeletonShimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }

    &.no-trendline .subheader-line {
      padding-bottom: 0.3em;
    }

    .text-container {
       display: flex;
       flex-direction: column;
       justify-content: center;
       align-items: center;
       width: 100%;
      .alert {
        font-size: ${theme.typography.sizes.s};
        margin: -0.5em 0 0.4em;
        line-height: 1;
        padding: ${theme.gridUnit}px;
        border-radius: ${theme.gridUnit}px;
      }
    }

    &.no-trendline {
      --kpi-panel-radius: ${theme.gridUnit * 4}px;
      justify-content: flex-start;
      align-items: center;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: ${theme.gridUnit * 4}px ${theme.gridUnit * 4}px
        ${theme.gridUnit * 2}px;
      background: #F6F8FA;
      border-radius: var(--kpi-panel-radius);
      overflow: hidden;
    }

    @media (max-width: 768px) {
      &.no-trendline {
        padding: ${theme.gridUnit * 2}px ${theme.gridUnit * 2}px;
      }

      &.no-trendline .text-container--kpi {
        gap: ${theme.gridUnit * 2}px;
      }
    }

    &.no-trendline .text-container--kpi {
      flex: 1;
      justify-content: center;
      align-items: center;
      gap: ${theme.gridUnit * 4}px;
      width: 100%;
      height: 100%;
      background: #F6F8FA;
      border-top-left-radius: var(--kpi-panel-radius);
      border-top-right-radius: var(--kpi-panel-radius);
      border-bottom-left-radius: var(--kpi-panel-radius);
      border-bottom-right-radius: var(--kpi-panel-radius);
      overflow: hidden;
    }

    &.no-trendline .kpi-circle {
      position: relative;
      width: var(--kpi-circle-size, 172px);
      height: var(--kpi-circle-size, 172px);
      border-radius: 50%;
      border: ${theme.gridUnit * 2}px solid #d5e2e5;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &.no-trendline .kpi-circle-cap {
      position: absolute;
      top: -${theme.gridUnit * 1.25}px;
      left: 50%;
      transform: translateX(-50%);
      width: ${theme.gridUnit * 5}px;
      height: ${theme.gridUnit * 2.2}px;
      border-radius: ${theme.gridUnit * 2}px;
      background: #19353c;
    }

    &.no-trendline .kpi-circle-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: ${theme.gridUnit * 1.1}px;
    }

    &.no-trendline .kpi-circle-icon {
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: clamp(${theme.gridUnit * 8}px, 7vw, ${theme.gridUnit * 10}px);
      height: clamp(${theme.gridUnit * 8}px, 7vw, ${theme.gridUnit * 10}px);
      border-radius: 999px;
      border: 1px solid transparent;
      background: transparent;
      padding: 0;
      font-size: ${theme.typography.sizes.xxl}px;
      font-weight: ${theme.typography.weights.bold};
      color: #5b7d85;
      transition: transform 0.2s ease, background-color 0.2s ease,
        border-color 0.2s ease, color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    &.no-trendline .kpi-circle-icon.is-clickable {
      cursor: pointer;
    }

    &.no-trendline .kpi-circle-icon.is-clickable:hover {
      background: rgba(22, 82, 99, 0.09);
      border-color: rgba(22, 82, 99, 0.2);
      transform: scale(1.06);
    }

    &.no-trendline .kpi-circle-icon.is-clickable:active {
      transform: scale(0.98);
    }

    &.no-trendline .kpi-circle-icon.is-refreshing {
      animation: bigNumberRefreshSpin 0.95s linear infinite;
    }

    @keyframes bigNumberRefreshSpin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    &.no-trendline .header-line {
      margin-bottom: 0;
      color: #15333a;
      font-weight: ${theme.typography.weights.bold};
      line-height: 0.92em;
      max-width: 78%;
      overflow: hidden;
      text-overflow: clip;
      justify-content: center;
    }

    &.no-trendline .kpi-footer {
      width: 100%;
      max-width: 360px;
      border-radius: ${theme.gridUnit * 3.5}px;
      background: #cfe8e6;
      border: 1px solid #c2e2df;
      padding: ${theme.gridUnit * 2.3}px ${theme.gridUnit * 3.2}px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: ${theme.gridUnit * 2}px;
    }

    &.no-trendline .kpi-footer-label {
      color: #4b6fa0;
      font-size: ${theme.typography.sizes.xl}px;
      font-weight: ${theme.typography.weights.bold};
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &.no-trendline .kpi-footer-value {
      color: #00a99d;
      font-size: ${theme.typography.sizes.xxl * 1.2}px;
      font-weight: ${theme.typography.weights.bold};
      white-space: nowrap;
    }

    body.dark-theme &.no-trendline,
    [data-theme='dark'] &.no-trendline {
      background: #0a0a0a;
      border: none;
      box-shadow: inset 0 0 0 1px rgba(80, 140, 165, 0.15),
        0 4px 12px rgba(0, 0, 0, 0.3);
    }

    body.dark-theme &.no-trendline .kpi-circle,
    [data-theme='dark'] &.no-trendline .kpi-circle {
      border-color: #1d3b4a;
      box-shadow: inset 0 0 0 1px rgba(105, 176, 199, 0.15);
    }

    body.dark-theme &.no-trendline .kpi-circle-cap,
    [data-theme='dark'] &.no-trendline .kpi-circle-cap {
      background: #ecf8fb;
    }

    body.dark-theme &.no-trendline .kpi-circle-icon,
    [data-theme='dark'] &.no-trendline .kpi-circle-icon {
      color: #77cbe5;
    }

    body.dark-theme &.no-trendline .header-line,
    [data-theme='dark'] &.no-trendline .header-line {
      color: #ffffff;
    }

    body.dark-theme &.no-trendline .kpi-footer,
    [data-theme='dark'] &.no-trendline .kpi-footer {
      background: linear-gradient(180deg, #12343f 0%, #0f2c35 100%);
      border-color: #2f5667;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
    }

    body.dark-theme &.no-trendline .text-container--kpi,
    [data-theme='dark'] &.no-trendline .text-container--kpi {
      background: transparent;
    }

    body.dark-theme &.no-trendline .kpi-footer-label,
    [data-theme='dark'] &.no-trendline .kpi-footer-label {
      color: #8fd8f2;
    }

    body.dark-theme &.no-trendline .kpi-footer-value,
    [data-theme='dark'] &.no-trendline .kpi-footer-value {
      color: #51f0dc;
    }

    body.dark-theme & .metric-name,
    [data-theme='dark'] & .metric-name,
    body.dark-theme & .kicker,
    [data-theme='dark'] & .kicker,
    body.dark-theme & .subheader-line,
    [data-theme='dark'] & .subheader-line,
    body.dark-theme & .subtitle-line,
    [data-theme='dark'] & .subtitle-line {
      color: #d8e7ea;
    }

    body.dark-theme & .text-container .alert,
    [data-theme='dark'] & .text-container .alert {
      background: #2f3f43;
      border-color: #40565c;
      color: #d8e7ea;
    }

    .kicker {
      line-height: 1em;
      margin-bottom: ${theme.gridUnit * 2}px;
      font-weight: ${theme.typography.weights.semibold};
    }

    .metric-name {
      line-height: 1em;
      margin-bottom: ${theme.gridUnit * 2}px;
      font-weight: ${theme.typography.weights.bold};
    }

    .header-line {
      position: relative;
      line-height: 1em;
      white-space: nowrap;
      margin-bottom:${theme.gridUnit * 2}px;
      font-weight: ${theme.typography.weights.bold};
      span {
        position: absolute;
        bottom: 0;
      }
    }

    .subheader-line {
      line-height: 1em;
      margin-bottom: ${theme.gridUnit * 2}px;
      font-weight: ${theme.typography.weights.semibold};
    }

    .subtitle-line {
      line-height: 1em;
      margin-bottom: ${theme.gridUnit * 2}px;
      font-weight: ${theme.typography.weights.semibold};
    }

    &.is-fallback-value {
      .kicker,
      .header-line,
      .subheader-line {
        opacity: ${theme.opacity.mediumHeavy};
      }
    }
  `}
`;
