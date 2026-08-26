/*
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

import { css, styled } from '@superset-ui/core';

export default styled.div`
  ${({ theme }) => css`
    table {
      width: 100%;
      min-width: auto;
      max-width: none;
      margin: 0;
    }

    th,
    td {
      min-width: 4.3em;
    }

    thead > tr > th {
      padding-right: 0;
      position: relative;
      background: ${theme.colors.grayscale.light5};
      text-align: left;
    }
    th svg {
      color: ${theme.colors.grayscale.light2};
      margin: ${theme.gridUnit / 2}px;
    }
    th.is-sorted svg {
      color: ${theme.colors.grayscale.base};
    }
    .table > tbody > tr:first-of-type > td,
    .table > tbody > tr:first-of-type > th {
      border-top: 0;
    }

    .table > tbody tr td {
      font-feature-settings: 'tnum' 1;
    }

    .dt-controls {
      padding-bottom: 0.65em;
    }
    .dt-metric {
      text-align: right;
    }
    .dt-totals {
      font-weight: ${theme.typography.weights.bold};
    }
    .dt-is-null {
      color: ${theme.colors.grayscale.light1};
    }
    td.dt-is-filter {
      cursor: pointer;
    }
    td.dt-is-filter:hover {
      background-color: ${theme.colors.secondary.light4};
    }
    td.dt-is-active-filter,
    td.dt-is-active-filter:hover {
      background-color: ${theme.colors.secondary.light3};
    }

    .dt-global-filter {
      float: right;
    }

    .dt-truncate-cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dt-truncate-cell:hover {
      overflow: visible;
      white-space: normal;
      height: auto;
    }

    .dt-pagination {
      text-align: right;
      /* use padding instead of margin so clientHeight can capture it */
      padding-top: 0.5em;
    }
    .dt-pagination .pagination {
      margin: 0;
    }

    .pagination > li > span.dt-pagination-ellipsis:focus,
    .pagination > li > span.dt-pagination-ellipsis:hover {
      background: ${theme.colors.grayscale.light5};
    }

    .dt-no-results {
      text-align: center;
      padding: 1em 0.6em;
    }

    .right-border-only {
      border-right: 2px solid ${theme.colors.grayscale.light2};
    }
    table .right-border-only:last-child {
      border-right: none;
    }

    body.dark-theme &,
    [data-theme='dark'] & {
      color: #dce8ec;
    }

    body.dark-theme & table,
    [data-theme='dark'] & table {
      background: linear-gradient(180deg, #0b1820 0%, #0a141b 100%);
      color: #dce8ec;
      border-radius: ${theme.gridUnit * 3}px;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(80, 140, 165, 0.18),
        0 10px 24px rgba(0, 0, 0, 0.3);
    }

    body.dark-theme & thead > tr > th,
    [data-theme='dark'] & thead > tr > th {
      background: linear-gradient(180deg, #12303c 0%, #0f2730 100%);
      color: #8fd8f2;
      border-color: #2f5667;
    }

    body.dark-theme & tbody > tr > td,
    [data-theme='dark'] & tbody > tr > td {
      background: #10222b;
      color: #dce8ec;
      border-color: #274453;
    }

    body.dark-theme & tbody > tr:nth-child(even) > td,
    [data-theme='dark'] & tbody > tr:nth-child(even) > td {
      background: #0e1e26;
    }

    body.dark-theme & .dt-is-null,
    [data-theme='dark'] & .dt-is-null {
      color: #9fb2b9;
    }

    body.dark-theme & td.dt-is-filter:hover,
    [data-theme='dark'] & td.dt-is-filter:hover {
      background-color: #173543;
    }

    body.dark-theme & td.dt-is-active-filter,
    body.dark-theme & td.dt-is-active-filter:hover,
    [data-theme='dark'] & td.dt-is-active-filter,
    [data-theme='dark'] & td.dt-is-active-filter:hover {
      background: linear-gradient(180deg, #165064 0%, #133f50 100%);
      color: #e8f7f6;
    }

    body.dark-theme & .pagination > li > span,
    [data-theme='dark'] & .pagination > li > span {
      background: #253237;
      border-color: #3b4c53;
      color: #dce8ec;
    }
  `}
`;
