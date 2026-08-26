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
import { useState, useCallback, useRef } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled, useTheme } from '@apache-superset/core/theme';
import { Modal } from '@superset-ui/core/components';
import { Input } from '@superset-ui/core/components/Input';
import { Button } from '@superset-ui/core/components/Button';
import { Icons } from '@superset-ui/core/components';

interface ImageUploadModalProps {
  initialUrl?: string;
  initialAlt?: string;
  onSave: (url: string, alt: string) => void;
  onClose: () => void;
}

const PreviewContainer = styled.div`
  ${({ theme }) => css`
    width: 100%;
    height: 200px;
    border: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: ${theme.colorFillAlter};
    margin-bottom: ${theme.sizeUnit * 4}px;
  `}
`;

const UploadArea = styled.div`
  ${({ theme }) => css`
    width: 100%;
    border: 2px dashed ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    padding: ${theme.sizeUnit * 6}px;
    text-align: center;
    cursor: pointer;
    color: ${theme.colorTextSecondary};
    margin-bottom: ${theme.sizeUnit * 4}px;
    transition: border-color 0.2s, color 0.2s;
    &:hover {
      border-color: ${theme.colorPrimary};
      color: ${theme.colorPrimary};
    }
  `}
`;

const FieldLabel = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.fontSizeSM}px;
    color: ${theme.colorTextSecondary};
    margin-bottom: ${theme.sizeUnit}px;
    margin-top: ${theme.sizeUnit * 3}px;
  `}
`;

const Divider = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.sizeUnit * 2}px;
    margin: ${theme.sizeUnit * 4}px 0;
    color: ${theme.colorTextTertiary};
    font-size: ${theme.fontSizeSM}px;
    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: ${theme.colorBorder};
    }
  `}
`;

export default function ImageUploadModal({
  initialUrl = '',
  initialAlt = '',
  onSave,
  onClose,
}: ImageUploadModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [altText, setAltText] = useState(initialAlt);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setPreviewUrl('');
    setPreviewError(false);
  }, []);

  const handlePreview = useCallback(() => {
    setPreviewError(false);
    setPreviewUrl(url);
  }, [url]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setUrl(dataUrl);
        setPreviewUrl(dataUrl);
        setPreviewError(false);
        if (!altText) {
          setAltText(file.name.replace(/\.[^.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    },
    [altText],
  );

  const handleSave = useCallback(() => {
    onSave(url, altText);
  }, [onSave, url, altText]);

  return (
    <Modal
      title={t('Add / Edit Image')}
      show
      onHide={onClose}
      footer={
        <div style={{ display: 'flex', gap: theme.sizeUnit * 2, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button buttonStyle="primary" disabled={!url} onClick={handleSave}>
            {t('Save')}
          </Button>
        </div>
      }
    >
      {/* Preview */}
      <PreviewContainer>
        {previewUrl && !previewError ? (
          <img
            src={previewUrl}
            alt={altText || t('Preview')}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div style={{ color: theme.colorTextTertiary, fontSize: theme.fontSizeSM }}>
            {previewError
              ? t('Could not load image — check the URL')
              : t('Preview will appear here')}
          </div>
        )}
      </PreviewContainer>

      {/* File upload */}
      <UploadArea onClick={() => fileInputRef.current?.click()}>
        <Icons.UploadOutlined iconSize="xl" />
        <div style={{ marginTop: theme.sizeUnit * 2 }}>
          {t('Click to upload from your computer')}
        </div>
        <div style={{ fontSize: theme.fontSizeXS, marginTop: theme.sizeUnit }}>
          {t('PNG, JPG, GIF, SVG supported')}
        </div>
      </UploadArea>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Divider>{t('or use a URL')}</Divider>

      {/* URL input */}
      <FieldLabel>{t('Image URL')}</FieldLabel>
      <div style={{ display: 'flex', gap: theme.sizeUnit * 2 }}>
        <Input
          value={url.startsWith('data:') ? '' : url}
          onChange={handleUrlChange}
          placeholder="https://example.com/image.png"
          disabled={url.startsWith('data:')}
        />
        <Button onClick={handlePreview} disabled={!url || url.startsWith('data:')}>
          {t('Preview')}
        </Button>
      </div>

      {/* Alt text */}
      <FieldLabel>{t('Alt text (for accessibility)')}</FieldLabel>
      <Input
        value={altText}
        onChange={e => setAltText(e.target.value)}
        placeholder={t('Describe the image')}
      />
    </Modal>
  );
}
