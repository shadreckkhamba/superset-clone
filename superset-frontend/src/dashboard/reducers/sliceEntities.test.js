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
import {
  FETCH_ALL_SLICES_FAILED,
  FETCH_ALL_SLICES_STARTED,
  ADD_SLICES,
} from 'src/dashboard/actions/sliceEntities';
import { SupersetClient } from '@superset-ui/core';
import rison from 'rison';

import sliceEntitiesReducer from 'src/dashboard/reducers/sliceEntities';
import { fetchSlices } from 'src/dashboard/actions/sliceEntities';

describe('sliceEntities reducer', () => {
  it('should return initial state', () => {
    expect(sliceEntitiesReducer({}, {})).toEqual({});
  });

  it('should set loading when fetching slices', () => {
    expect(
      sliceEntitiesReducer(
        { isLoading: false },
        { type: FETCH_ALL_SLICES_STARTED },
      ).isLoading,
    ).toBe(true);
  });

  it('should set slices', () => {
    const result = sliceEntitiesReducer(
      { slices: { a: {} } },
      { type: ADD_SLICES, payload: { slices: { 1: {}, 2: {} } } },
    );

    expect(result.slices).toEqual({
      1: {},
      2: {},
      a: {},
    });
    expect(result.isLoading).toBe(false);
  });

  it('should set an error on error', () => {
    const result = sliceEntitiesReducer(
      {},
      {
        type: FETCH_ALL_SLICES_FAILED,
        payload: { error: 'failed' },
      },
    );
    expect(result.isLoading).toBe(false);
    expect(result.errorMessage.indexOf('failed')).toBeGreaterThan(-1);
  });

  it('fetchSlices uses editors to scope the user charts list', async () => {
    const getSpy = jest.spyOn(SupersetClient, 'get').mockResolvedValue({
      json: { result: [] },
    });
    const dispatch = jest.fn();

    try {
      await fetchSlices(1, '', 'changed_on')(dispatch, jest.fn());

      expect(getSpy).toHaveBeenCalledTimes(1);
      const { endpoint } = getSpy.mock.calls[0][0];
      const query = new URL(endpoint, 'http://localhost').searchParams.get('q');
      const decodedQuery = rison.decode(query);
      expect(decodedQuery).toMatchObject({
        columns: expect.arrayContaining(['editors.id']),
        filters: [
          {
            col: 'editors',
            opr: 'rel_m_m',
            value: 1,
          },
        ],
      });
      expect(decodedQuery.columns).not.toContain('owners.id');
    } finally {
      getSpy.mockRestore();
    }
  });

  it('hydrates chart owners from editors when fetching slices', async () => {
    const getSpy = jest.spyOn(SupersetClient, 'get').mockResolvedValue({
      json: {
        result: [
          {
            id: 7,
            params: JSON.stringify({
              datasource: '22__table',
              viz_type: 'bar',
            }),
            datasource_id: 22,
            datasource_type: 'table',
            datasource_name_text: 'dataset',
            datasource_url: '/explore/',
            description: 'desc',
            description_markeddown: 'desc',
            changed_on_utc: '2026-08-26T00:00:00Z',
            changed_on_delta_humanized: '1 day ago',
            slice_name: 'Chart',
            thumbnail_url: null,
            url: '/explore/?slice_id=7',
            viz_type: 'bar',
            editors: [{ id: 3 }],
            created_by: { id: 9 },
          },
        ],
      },
    });
    const dispatch = jest.fn();

    try {
      await fetchSlices()(dispatch, jest.fn());

      const addSlicesAction = dispatch.mock.calls.find(
        ([action]) => action.type === ADD_SLICES,
      )?.[0];

      expect(addSlicesAction).toBeDefined();
      expect(addSlicesAction.payload.slices[7].owners).toEqual([{ id: 3 }]);
    } finally {
      getSpy.mockRestore();
    }
  });
});
