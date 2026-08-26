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
import { useCallback, useMemo } from 'react';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import {
  AdhocMetric,
  BinaryQueryObjectFilterClause,
  CurrencyFormatter,
  DataRecordValue,
  FeatureFlag,
  getColumnLabel,
  getNumberFormatter,
  getSelectedText,
  isAdhocColumn,
  isFeatureEnabled,
  isPhysicalColumn,
  NumberFormatter,
  styled,
  t,
  useTheme,
} from '@superset-ui/core';
import { aggregatorTemplates, PivotTable, sortAs } from './react-pivottable';
import {
  FilterType,
  MetricsLayoutEnum,
  PivotTableProps,
  PivotTableStylesProps,
  SelectedFiltersType,
} from './types';

const Styles = styled.div<PivotTableStylesProps>`
  ${({ height, width, margin }) => `
      margin: ${margin}px;
      height: ${height - margin * 2}px;
      width: ${
        typeof width === 'string' ? parseInt(width, 10) : width - margin * 2
      }px;
  `}
  
  // Enhanced visual styling for the pivot table
  .pvtTable {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    border-collapse: separate !important;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    
    thead tr:nth-child(1) th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      font-weight: 600;
      padding: 14px 16px !important;
      border-bottom: 2px solid rgba(255, 255, 255, 0.3) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      letter-spacing: 0.3px;
    }
    
    thead tr:nth-child(2) th {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%) !important;
      color: #2d3748 !important;
      font-weight: 600;
      padding: 12px 14px !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }
    
    tbody tr {
      transition: all 0.2s ease;
      
      &:hover {
        background: linear-gradient(135deg, #ebf4ff 0%, #e6fffa 100%) !important;
        transform: scale(1.001);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
      }
      
      &:nth-child(even) {
        background: #f8fafc !important;
        
        &:hover {
          background: linear-gradient(135deg, #ebf4ff 0%, #e6fffa 100%) !important;
        }
      }
    }
    
    td {
      padding: 12px 14px !important;
      border: 1px solid #edf2f7 !important;
      color: #4a5568;
      font-size: 13px;
      transition: all 0.15s ease;
      
      &:hover {
        background: #fff !important;
        box-shadow: inset 0 0 0 2px rgba(102, 126, 234, 0.3);
        border-color: #667eea !important;
      }
    }
    
    .pvtTotal, .pvtGrandTotal {
      font-weight: 700;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
      color: #92400e !important;
      
      &:hover {
        background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%) !important;
      }
    }
    
    // Corner cell styling
    .pvtCorner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      font-weight: 600;
    }
    
    // Dropdown arrows
    .pvtArrow {
      color: #667eea !important;
      font-size: 10px;
    }
    
    // Filter icon
    .pvtFilter {
      color: #a0aec0 !important;
      
      &:hover {
        color: #667eea !important;
      }
    }
    
    // Horizontal and vertical attribute labels
    .pvtAttr {
      background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%) !important;
      color: #2d3748 !important;
      padding: 8px 12px !important;
      border-radius: 6px;
      font-weight: 500;
      margin: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
      
      &:hover {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
      }
    }
    
    // Axis container
    .pvtAxisContainer, .pvtVals {
      background: #fafbfc !important;
      border-radius: 8px;
      padding: 12px !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);
    }
    
    .pvtHorizList li, .pvtVertList li {
      background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%) !important;
      border-radius: 6px;
      padding: 6px 10px !important;
    }
    
    // Dropdown select
    select.pvtAggregator {
      border-radius: 8px;
      border: 2px solid #e2e8f0 !important;
      padding: 8px 12px;
      font-weight: 500;
      color: #2d3748;
      background: white;
      transition: all 0.2s ease;
      
      &:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        outline: none;
      }
    }
    
    // Renderer select
    select.pvtRenderer {
      border-radius: 8px;
      border: 2px solid #e2e8f0 !important;
      padding: 8px 12px;
      font-weight: 500;
      color: #2d3748;
      background: white;
      transition: all 0.2s ease;
      
      &:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        outline: none;
      }
    }
    
    // Drag handle
    .pvtDragHandle {
      color: #667eea !important;
      
      &:hover {
        color: #764ba2 !important;
      }
    }
    
    // Triangle icons for ordering
    .pvtTriangle {
      color: #667eea !important;
    }
    
    // Unused attribute
    .pvtUnused {
      background: #f1f5f9 !important;
      border-radius: 8px;
      padding: 8px !important;
    }
    
    // Value cell rendering
    .pvtVal {
      text-align: center;
      font-weight: 500;
    }
    
    // Subtotal cells
    .pvtSubtotal-1, .pvtSubtotal-2 {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
      font-weight: 600;
      color: #92400e;
    }
  }
`;

const PivotTableWrapper = styled.div`
  height: 100%;
  max-width: inherit;
  overflow: auto;
  border-radius: 12px;
  
  // Custom scrollbar styling for better visual appeal
  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
    border-radius: 10px;
    border: 2px solid #f1f5f9;
    transition: all 0.2s ease;
    
    &:hover {
      background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
    }
  }
  
  &::-webkit-scrollbar-corner {
    background: #f1f5f9;
  }
  
  // Firefox scrollbar
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

const METRIC_KEY = t('Metric');
const vals = ['value'];

const StyledPlusSquareOutlined = styled(PlusSquareOutlined)`
  stroke: #667eea;
  stroke-width: 16px;
  transition: all 0.2s ease;
  font-size: 14px;
  
  &:hover {
    stroke: #764ba2;
    transform: scale(1.1);
  }
`;

const StyledMinusSquareOutlined = styled(MinusSquareOutlined)`
  stroke: #667eea;
  stroke-width: 16px;
  transition: all 0.2s ease;
  font-size: 14px;
  
  &:hover {
    stroke: #764ba2;
    transform: scale(1.1);
  }
`;

const aggregatorsFactory = (formatter: NumberFormatter) => ({
  Count: aggregatorTemplates.count(formatter),
  'Count Unique Values': aggregatorTemplates.countUnique(formatter),
  'List Unique Values': aggregatorTemplates.listUnique(', ', formatter),
  Sum: aggregatorTemplates.sum(formatter),
  Average: aggregatorTemplates.average(formatter),
  Median: aggregatorTemplates.median(formatter),
  'Sample Variance': aggregatorTemplates.var(1, formatter),
  'Sample Standard Deviation': aggregatorTemplates.stdev(1, formatter),
  Minimum: aggregatorTemplates.min(formatter),
  Maximum: aggregatorTemplates.max(formatter),
  First: aggregatorTemplates.first(formatter),
  Last: aggregatorTemplates.last(formatter),
  'Sum as Fraction of Total': aggregatorTemplates.fractionOf(
    aggregatorTemplates.sum(),
    'total',
    formatter,
  ),
  'Sum as Fraction of Rows': aggregatorTemplates.fractionOf(
    aggregatorTemplates.sum(),
    'row',
    formatter,
  ),
  'Sum as Fraction of Columns': aggregatorTemplates.fractionOf(
    aggregatorTemplates.sum(),
    'col',
    formatter,
  ),
  'Count as Fraction of Total': aggregatorTemplates.fractionOf(
    aggregatorTemplates.count(),
    'total',
    formatter,
  ),
  'Count as Fraction of Rows': aggregatorTemplates.fractionOf(
    aggregatorTemplates.count(),
    'row',
    formatter,
  ),
  'Count as Fraction of Columns': aggregatorTemplates.fractionOf(
    aggregatorTemplates.count(),
    'col',
    formatter,
  ),
});

/* If you change this logic, please update the corresponding Python
 * function (https://github.com/apache/superset/blob/master/superset/charts/post_processing.py),
 * or reach out to @betodealmeida.
 */
export default function PivotTableChart(props: PivotTableProps) {
  const {
    data,
    height,
    width,
    groupbyRows: groupbyRowsRaw,
    groupbyColumns: groupbyColumnsRaw,
    metrics,
    colOrder,
    rowOrder,
    aggregateFunction,
    transposePivot,
    combineMetric,
    rowSubtotalPosition,
    colSubtotalPosition,
    colTotals,
    colSubTotals,
    rowTotals,
    rowSubTotals,
    valueFormat,
    currencyFormat,
    emitCrossFilters,
    setDataMask,
    selectedFilters,
    verboseMap,
    columnFormats,
    currencyFormats,
    metricsLayout,
    metricColorFormatters,
    dateFormatters,
    onContextMenu,
    timeGrainSqla,
    allowRenderHtml,
  } = props;

  const theme = useTheme();
  const defaultFormatter = useMemo(
    () =>
      currencyFormat?.symbol
        ? new CurrencyFormatter({
            currency: currencyFormat,
            d3Format: valueFormat,
          })
        : getNumberFormatter(valueFormat),
    [valueFormat, currencyFormat],
  );
  const customFormatsArray = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(columnFormats || {}),
          ...Object.keys(currencyFormats || {}),
        ]),
      ).map(metricName => [
        metricName,
        columnFormats[metricName] || valueFormat,
        currencyFormats[metricName] || currencyFormat,
      ]),
    [columnFormats, currencyFormat, currencyFormats, valueFormat],
  );
  const hasCustomMetricFormatters = customFormatsArray.length > 0;
  const metricFormatters = useMemo(
    () =>
      hasCustomMetricFormatters
        ? {
            [METRIC_KEY]: Object.fromEntries(
              customFormatsArray.map(([metric, d3Format, currency]) => [
                metric,
                currency
                  ? new CurrencyFormatter({
                      currency,
                      d3Format,
                    })
                  : getNumberFormatter(d3Format),
              ]),
            ),
          }
        : undefined,
    [customFormatsArray, hasCustomMetricFormatters],
  );

  const metricNames = useMemo(
    () =>
      metrics.map((metric: string | AdhocMetric) =>
        typeof metric === 'string' ? metric : (metric.label as string),
      ),
    [metrics],
  );

  const unpivotedData = useMemo(
    () =>
      data.reduce(
        (acc: Record<string, any>[], record: Record<string, any>) => [
          ...acc,
          ...metricNames
            .map((name: string) => ({
              ...record,
              [METRIC_KEY]: name,
              value: record[name],
            }))
            .filter(record => record.value !== null),
        ],
        [],
      ),
    [data, metricNames],
  );
  const groupbyRows = useMemo(
    () => groupbyRowsRaw.map(getColumnLabel),
    [groupbyRowsRaw],
  );
  const groupbyColumns = useMemo(
    () => groupbyColumnsRaw.map(getColumnLabel),
    [groupbyColumnsRaw],
  );

  const sorters = useMemo(
    () => ({
      [METRIC_KEY]: sortAs(metricNames),
    }),
    [metricNames],
  );

  const [rows, cols] = useMemo(() => {
    let [rows_, cols_] = transposePivot
      ? [groupbyColumns, groupbyRows]
      : [groupbyRows, groupbyColumns];

    if (metricsLayout === MetricsLayoutEnum.ROWS) {
      rows_ = combineMetric ? [...rows_, METRIC_KEY] : [METRIC_KEY, ...rows_];
    } else {
      cols_ = combineMetric ? [...cols_, METRIC_KEY] : [METRIC_KEY, ...cols_];
    }
    return [rows_, cols_];
  }, [
    combineMetric,
    groupbyColumns,
    groupbyRows,
    metricsLayout,
    transposePivot,
  ]);

  const handleChange = useCallback(
    (filters: SelectedFiltersType) => {
      const filterKeys = Object.keys(filters);
      const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
      setDataMask({
        extraFormData: {
          filters:
            filterKeys.length === 0
              ? undefined
              : filterKeys.map(key => {
                  const val = filters?.[key];
                  const col =
                    groupby.find(item => {
                      if (isPhysicalColumn(item)) {
                        return item === key;
                      }
                      if (isAdhocColumn(item)) {
                        return item.label === key;
                      }
                      return false;
                    }) ?? '';
                  if (val === null || val === undefined)
                    return {
                      col,
                      op: 'IS NULL',
                    };
                  return {
                    col,
                    op: 'IN',
                    val: val as (string | number | boolean)[],
                  };
                }),
        },
        filterState: {
          value:
            filters && Object.keys(filters).length
              ? Object.values(filters)
              : null,
          selectedFilters:
            filters && Object.keys(filters).length ? filters : null,
        },
      });
    },
    [groupbyColumnsRaw, groupbyRowsRaw, setDataMask],
  );

  const getCrossFilterDataMask = useCallback(
    (value: { [key: string]: string }) => {
      const isActiveFilterValue = (key: string, val: DataRecordValue) =>
        !!selectedFilters && selectedFilters[key]?.includes(val);

      if (!value) {
        return undefined;
      }

      const [key, val] = Object.entries(value)[0];
      let values = { ...selectedFilters };
      if (isActiveFilterValue(key, val)) {
        values = {};
      } else {
        values = { [key]: [val] };
      }

      const filterKeys = Object.keys(values);
      const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
      return {
        dataMask: {
          extraFormData: {
            filters:
              filterKeys.length === 0
                ? undefined
                : filterKeys.map(key => {
                    const val = values?.[key];
                    const col =
                      groupby.find(item => {
                        if (isPhysicalColumn(item)) {
                          return item === key;
                        }
                        if (isAdhocColumn(item)) {
                          return item.label === key;
                        }
                        return false;
                      }) ?? '';
                    if (val === null || val === undefined)
                      return {
                        col,
                        op: 'IS NULL' as const,
                      };
                    return {
                      col,
                      op: 'IN' as const,
                      val: val as (string | number | boolean)[],
                    };
                  }),
          },
          filterState: {
            value:
              values && Object.keys(values).length
                ? Object.values(values)
                : null,
            selectedFilters:
              values && Object.keys(values).length ? values : null,
          },
        },
        isCurrentValueSelected: isActiveFilterValue(key, val),
      };
    },
    [groupbyColumnsRaw, groupbyRowsRaw, selectedFilters],
  );

  const toggleFilter = useCallback(
    (
      e: MouseEvent,
      value: string,
      filters: FilterType,
      pivotData: Record<string, any>,
      isSubtotal: boolean,
      isGrandTotal: boolean,
    ) => {
      if (isSubtotal || isGrandTotal || !emitCrossFilters) {
        return;
      }

      // allow selecting text in a cell
      if (getSelectedText()) {
        return;
      }

      const isActiveFilterValue = (key: string, val: DataRecordValue) =>
        !!selectedFilters && selectedFilters[key]?.includes(val);

      const filtersCopy = { ...filters };
      delete filtersCopy[METRIC_KEY];

      const filtersEntries = Object.entries(filtersCopy);
      if (filtersEntries.length === 0) {
        return;
      }

      const [key, val] = filtersEntries[filtersEntries.length - 1];

      let updatedFilters = { ...(selectedFilters || {}) };
      // multi select
      // if (selectedFilters && isActiveFilterValue(key, val)) {
      //   updatedFilters[key] = selectedFilters[key].filter((x: DataRecordValue) => x !== val);
      // } else {
      //   updatedFilters[key] = [...(selectedFilters?.[key] || []), val];
      // }
      // single select
      if (selectedFilters && isActiveFilterValue(key, val)) {
        updatedFilters = {};
      } else {
        updatedFilters = {
          [key]: [val],
        };
      }
      if (
        Array.isArray(updatedFilters[key]) &&
        updatedFilters[key].length === 0
      ) {
        delete updatedFilters[key];
      }
      handleChange(updatedFilters);
    },
    [emitCrossFilters, selectedFilters, handleChange],
  );

  const tableOptions = useMemo(
    () => ({
      clickRowHeaderCallback: toggleFilter,
      clickColumnHeaderCallback: toggleFilter,
      colTotals,
      colSubTotals,
      rowTotals,
      rowSubTotals,
      highlightHeaderCellsOnHover:
        emitCrossFilters ||
        isFeatureEnabled(FeatureFlag.DrillBy) ||
        isFeatureEnabled(FeatureFlag.DrillToDetail),
      highlightedHeaderCells: selectedFilters,
      omittedHighlightHeaderGroups: [METRIC_KEY],
      cellColorFormatters: { [METRIC_KEY]: metricColorFormatters },
      dateFormatters,
    }),
    [
      colTotals,
      colSubTotals,
      dateFormatters,
      emitCrossFilters,
      metricColorFormatters,
      rowTotals,
      rowSubTotals,
      selectedFilters,
      toggleFilter,
    ],
  );

  const subtotalOptions = useMemo(
    () => ({
      colSubtotalDisplay: { displayOnTop: colSubtotalPosition },
      rowSubtotalDisplay: { displayOnTop: rowSubtotalPosition },
      arrowCollapsed: <StyledPlusSquareOutlined />,
      arrowExpanded: <StyledMinusSquareOutlined />,
    }),
    [colSubtotalPosition, rowSubtotalPosition],
  );

  const handleContextMenu = useCallback(
    (
      e: MouseEvent,
      colKey: (string | number | boolean)[] | undefined,
      rowKey: (string | number | boolean)[] | undefined,
      dataPoint: { [key: string]: string },
    ) => {
      if (onContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
        if (colKey && colKey.length > 1) {
          colKey.forEach((val, i) => {
            const col = cols[i];
            const formatter = dateFormatters[col];
            const formattedVal = formatter?.(val as number) || String(val);
            if (i > 0) {
              drillToDetailFilters.push({
                col,
                op: '==',
                val,
                formattedVal,
                grain: formatter ? timeGrainSqla : undefined,
              });
            }
          });
        }
        if (rowKey) {
          rowKey.forEach((val, i) => {
            const col = rows[i];
            const formatter = dateFormatters[col];
            const formattedVal = formatter?.(val as number) || String(val);
            drillToDetailFilters.push({
              col,
              op: '==',
              val,
              formattedVal,
              grain: formatter ? timeGrainSqla : undefined,
            });
          });
        }
        onContextMenu(e.clientX, e.clientY, {
          drillToDetail: drillToDetailFilters,
          crossFilter: getCrossFilterDataMask(dataPoint),
          drillBy: dataPoint && {
            filters: [
              {
                col: Object.keys(dataPoint)[0],
                op: '==',
                val: Object.values(dataPoint)[0],
              },
            ],
            groupbyFieldName: rowKey ? 'groupbyRows' : 'groupbyColumns',
          },
        });
      }
    },
    [
      cols,
      dateFormatters,
      getCrossFilterDataMask,
      onContextMenu,
      rows,
      timeGrainSqla,
    ],
  );

  return (
    <Styles height={height} width={width} margin={theme.gridUnit * 4}>
      <PivotTableWrapper>
        <PivotTable
          data={unpivotedData}
          rows={rows}
          cols={cols}
          aggregatorsFactory={aggregatorsFactory}
          defaultFormatter={defaultFormatter}
          customFormatters={metricFormatters}
          aggregatorName={aggregateFunction}
          vals={vals}
          colOrder={colOrder}
          rowOrder={rowOrder}
          sorters={sorters}
          tableOptions={tableOptions}
          subtotalOptions={subtotalOptions}
          namesMapping={verboseMap}
          onContextMenu={handleContextMenu}
          allowRenderHtml={allowRenderHtml}
        />
      </PivotTableWrapper>
    </Styles>
  );
}
