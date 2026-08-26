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

import { Dispatch, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Dataset } from '@superset-ui/chart-controls';
import { SupersetClient, getClientErrorObject } from '@superset-ui/core';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { updateFormDataByDatasource } from './exploreActions';
import { ExplorePageState } from '../types';

interface SaveDatasetRequest {
  data: {
    schema?: string;
    sql?: string;
    dbId?: number;
    templateParams?: string;
    datasourceName: string;
  };
}

export const SET_DATASOURCE = 'SET_DATASOURCE';
export interface SetDatasource {
  type: string;
  datasource: Dataset;
}
export function setDatasource(datasource: Dataset) {
  return { type: SET_DATASOURCE, datasource };
}

export function changeDatasource(newDatasource: Dataset) {
  return function (dispatch: Dispatch, getState: () => ExplorePageState) {
    const {
      explore: { datasource: prevDatasource },
    } = getState();
    dispatch(setDatasource(newDatasource));
    dispatch(updateFormDataByDatasource(prevDatasource, newDatasource));
  };
}

export function saveDataset({
  schema,
  sql,
  database,
  templateParams,
  datasourceName,
}: Omit<SaveDatasetRequest['data'], 'dbId'> & {
  database: { id: number };
}) {
  return async function (dispatch: ThunkDispatch<any, undefined, AnyAction>) {
    // Create a dataset object
    try {
      const {
        json: { data },
      } = await SupersetClient.post({
        endpoint: '/api/v1/dataset/',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: database?.id,
          table_name: datasourceName,
          schema,
          sql,
          template_params: templateParams,
        }),
      });
      // Update form_data to point to new dataset
      dispatch(changeDatasource(data));
      return data;
    } catch (createError) {
      // If a dataset with this name already exists (422), fetch and reuse it
      try {
        const schemaVal = schema || '';
        const query = encodeURIComponent(
          JSON.stringify({
            filters: [
              { col: 'table_name', opr: 'eq', value: datasourceName },
              { col: 'schema', opr: 'eq', value: schemaVal },
              { col: 'database', opr: 'rel_o_m', value: database?.id },
            ],
          }),
        );
        const {
          json: { result },
        } = await SupersetClient.get({
          endpoint: `/api/v1/dataset/?q=${query}`,
        });
        if (result?.length) {
          // The list endpoint returns a summary — fetch the full dataset object.
          // The show endpoint returns { id, result } (not { data }).
          const {
            json: { result: fullDataset },
          } = await SupersetClient.get({
            endpoint: `/api/v1/dataset/${result[0].id}`,
          });
          dispatch(changeDatasource(fullDataset));
          return fullDataset;
        }
      } catch (_lookupError) {
        // ignore lookup error, fall through to original error
      }
      getClientErrorObject(createError).then(e => {
        dispatch(addDangerToast(e.error));
      });
      throw createError;
    }
  };
}

export const datasourcesActions = {
  setDatasource,
  changeDatasource,
  saveDataset,
};

export type AnyDatasourcesAction = SetDatasource;
