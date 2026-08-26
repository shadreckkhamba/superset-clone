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
import { useCallback, useState, memo } from 'react';
import type { ResizeStartCallback, ResizeCallback } from 're-resizable';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Icons } from '@superset-ui/core/components';
import { Draggable } from 'src/dashboard/components/dnd/DragDroppable';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import type { LayoutItem } from 'src/dashboard/types';
import type { DropResult } from 'src/dashboard/components/dnd/dragDroppableConfig';
import { ROW_TYPE, COLUMN_TYPE } from 'src/dashboard/util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from 'src/dashboard/util/constants';
import ImageUploadModal from './ImageUploadModal';

export interface ImageProps {
  id: string;
  parentId: string;
  component: LayoutItem;
  parentComponent: LayoutItem;
  index: number;
  depth: number;
  editMode: boolean;
  availableColumnCount: number;
  columnWidth: number;
  onResizeStart: ResizeStartCallback;
  onResize: ResizeCallback;
  onResizeStop: ResizeCallback;
  deleteComponent: (id: string, parentId: string) => void;
  handleComponentDrop: (dropResult: DropResult) => void;
  updateComponents: (components: Record<string, LayoutItem>) => void;
}

const ImageContainer = styled.div`
  ${({ theme }) => css`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${theme.colorBgContainer};
    border-radius: ${theme.borderRadius}px;
    overflow: hidden;
    cursor: default;

    .dashboard--editing & {
      cursor: move;
    }
  `}
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
`;

const EmptyImagePlaceholder = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${theme.sizeUnit * 2}px;
    color: ${theme.colorTextSecondary};
    font-size: ${theme.fontSizeSM}px;
    width: 100%;
    height: 100%;
    border: 2px dashed ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    cursor: pointer;
    &:hover {
      border-color: ${theme.colorPrimary};
      color: ${theme.colorPrimary};
    }
  `}
`;

interface DragChildProps {
  dragSourceRef: React.RefCallback<HTMLElement>;
}

function Image({
  id,
  parentId,
  component,
  parentComponent,
  index,
  depth,
  editMode,
  availableColumnCount,
  columnWidth,
  onResizeStart,
  onResize,
  onResizeStop,
  deleteComponent,
  handleComponentDrop,
  updateComponents,
}: ImageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const imageUrl: string = (component.meta?.imageUrl as string) || '';
  const altText: string = (component.meta?.altText as string) || t('Image');

  const handleDeleteComponent = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const handleSaveImage = useCallback(
    (url: string, alt: string) => {
      updateComponents({
        [component.id]: {
          ...component,
          meta: {
            ...component.meta,
            imageUrl: url,
            altText: alt,
          },
        },
      });
      setIsModalOpen(false);
    },
    [component, updateComponents],
  );

  const widthMultiple =
    parentComponent.type === COLUMN_TYPE
      ? parentComponent.meta.width || GRID_MIN_COLUMN_COUNT
      : component.meta.width || GRID_MIN_COLUMN_COUNT;

  return (
    <>
      <Draggable
        component={component}
        parentComponent={parentComponent}
        orientation={parentComponent.type === ROW_TYPE ? 'column' : 'row'}
        index={index}
        depth={depth}
        onDrop={handleComponentDrop}
        editMode={editMode}
      >
        {({ dragSourceRef }: DragChildProps) => (
          <div
            ref={dragSourceRef}
            className="dashboard-component dashboard-component-image"
            data-test="dashboard-component-image"
          >
            <ResizableContainer
              id={component.id}
              adjustableWidth={parentComponent.type === ROW_TYPE}
              adjustableHeight
              widthStep={columnWidth}
              widthMultiple={widthMultiple}
              heightStep={GRID_BASE_UNIT}
              heightMultiple={component.meta.height ?? GRID_MIN_ROW_UNITS}
              minWidthMultiple={GRID_MIN_COLUMN_COUNT}
              minHeightMultiple={GRID_MIN_ROW_UNITS}
              maxWidthMultiple={availableColumnCount + widthMultiple}
              onResizeStart={onResizeStart}
              onResize={onResize}
              onResizeStop={onResizeStop}
              editMode={editMode}
            >
              {editMode && (
                <HoverMenu position="top">
                  <DeleteComponentButton onDelete={handleDeleteComponent} />
                </HoverMenu>
              )}
              <ImageContainer>
                {imageUrl ? (
                  <StyledImage
                    src={imageUrl}
                    alt={altText}
                    onClick={editMode ? () => setIsModalOpen(true) : undefined}
                    style={{ cursor: editMode ? 'pointer' : 'default' }}
                  />
                ) : (
                  <EmptyImagePlaceholder
                    onClick={editMode ? () => setIsModalOpen(true) : undefined}
                  >
                    <Icons.FileImageOutlined iconSize="xl" />
                    {editMode
                      ? t('Click to add an image')
                      : t('No image configured')}
                  </EmptyImagePlaceholder>
                )}
              </ImageContainer>
            </ResizableContainer>
          </div>
        )}
      </Draggable>

      {isModalOpen && (
        <ImageUploadModal
          initialUrl={imageUrl}
          initialAlt={altText}
          onSave={handleSaveImage}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

export default memo(Image);
