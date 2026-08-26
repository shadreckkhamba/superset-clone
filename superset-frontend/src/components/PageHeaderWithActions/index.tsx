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
import { ReactNode, ReactElement } from 'react';
import { css, SupersetTheme, t, useTheme } from '@superset-ui/core';
import { Dropdown, DropdownProps } from 'src/components/Dropdown';
import { TooltipPlacement } from 'src/components/Tooltip';
import { Icons } from 'src/components/Icons';
import {
  DynamicEditableTitle,
  DynamicEditableTitleProps,
} from '../DynamicEditableTitle';
import CertifiedBadge, { CertifiedBadgeProps } from '../CertifiedBadge';
import FaveStar, { FaveStarProps } from '../FaveStar';
import Button from '../Button';
//import dashboardLogo from '../../assets/images/dashboard-logo.png';
//import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import logoBase64 from 'src/dashboard/components/Header/logoBase64';

export const menuTriggerStyles = (theme: SupersetTheme) => css`
  width: ${theme.gridUnit * 8}px;
  height: ${theme.gridUnit * 8}px;
  padding: 0;
  border: 1px solid ${theme.colors.primary.dark2};

  &.antd5-btn > span.anticon {
    line-height: 0;
    transition: inherit;
  }

  &:hover:not(:focus) > span.anticon {
    color: ${theme.colors.primary.light1};
  }
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary.dark2};
  }
`;

const headerStyles = (theme: SupersetTheme) => css`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: space-between;
  background-color: ${theme.colors.grayscale.light5};
  height: ${theme.gridUnit * 16}px;
  padding: 0 ${theme.gridUnit * 4}px;

  .editable-title {
    overflow: hidden;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;

    & > input[type='button'],
    & > span {
      overflow: hidden;
      white-space: nowrap;
    }
  }

  span[role='button'] {
    display: flex;
    height: 100%;
  }

  .title-panel {
    display: flex;
    align-items: center;
    min-width: 100px;
    flex: 1;
    margin-right: ${theme.gridUnit * 12}px;
    overflow: hidden;
    gap: 8px;
  }

  .dashboard-logo {
    height: 48px;
    width: auto;
    flex-shrink: 0;
    min-width: 48px;
  }

  .right-button-panel {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
`;

const buttonsStyles = (theme: SupersetTheme) => css`
  display: flex;
  align-items: center;
  padding-left: ${theme.gridUnit * 2}px;

  & .anticon-star {
    padding: 0 ${theme.gridUnit}px;

    &:first-of-type {
      padding-left: 0;
    }
  }
`;

const additionalActionsContainerStyles = (theme: SupersetTheme) => css`
  margin-left: ${theme.gridUnit * 2}px;
`;

export type PageHeaderWithActionsProps = {
  editableTitleProps: DynamicEditableTitleProps;
  showTitlePanelItems: boolean;
  certificatiedBadgeProps?: CertifiedBadgeProps;
  showFaveStar: boolean;
  showMenuDropdown?: boolean;
  faveStarProps: FaveStarProps;
  titlePanelAdditionalItems: ReactNode;
  rightPanelAdditionalItems: ReactNode;
  additionalActionsMenu: ReactElement;
  menuDropdownProps: Omit<DropdownProps, 'overlay'>;
  tooltipProps?: {
    text?: string;
    placement?: TooltipPlacement;
  };
};

export const PageHeaderWithActions = ({
  editableTitleProps,
  showTitlePanelItems,
  certificatiedBadgeProps,
  showFaveStar,
  faveStarProps,
  titlePanelAdditionalItems,
  rightPanelAdditionalItems,
  additionalActionsMenu,
  menuDropdownProps,
  showMenuDropdown = true,
  tooltipProps,
} : PageHeaderWithActionsProps) => {
  const theme = useTheme();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const isStandalone = new URLSearchParams(location.search).get('standalone') === '1';
  
  useEffect(() => {
     const handleVisibilityChange = () => {
	if (
	   document.visibilityState === 'visible' && 
	   videoRef.current?.paused
	 ) {
	   try {
	     videoRef.current.play();
	   } catch (err) {
	     console.warn('Video resume on tabe focus failed:', err);
	   }
          }
        };
  
   document.addEventListener('visibilitychange', handleVisibilityChange);
  
   return () => {
     document.removeEventListener('visibilitychange', handleVisibilityChange);
   };
  }, []);
									
  return (
    <div css={headerStyles} className="header-with-actions">
      <div className="title-panel">
        <img src={logoBase64} alt="Logo" className="dashboard-logo" />
        <div className="editable-title">
          <DynamicEditableTitle {...editableTitleProps} />
        </div>

        {showTitlePanelItems && (
          <div css={buttonsStyles}>
            {certificatiedBadgeProps?.certifiedBy && <CertifiedBadge {...certificatiedBadgeProps} />}
            {!isStandalone && showFaveStar && <FaveStar {...faveStarProps} />}
            {titlePanelAdditionalItems}
          </div>
        )}
      </div>
      <div className="right-button-panel">
        {rightPanelAdditionalItems}
        <div css={additionalActionsContainerStyles}>
          {showMenuDropdown && (
            <Dropdown
              trigger={['click']}
              dropdownRender={() => additionalActionsMenu}
              {...menuDropdownProps}
            >
              <Button
                css={menuTriggerStyles}
                buttonStyle="tertiary"
                aria-label={t('Menu actions trigger')}
                tooltip={tooltipProps?.text}
                placement={tooltipProps?.placement}
                data-test="actions-trigger"
              >
                <Icons.EllipsisOutlined
                  iconColor={theme.colors.primary.dark2}
                  iconSize="l"
                />
              </Button>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};
