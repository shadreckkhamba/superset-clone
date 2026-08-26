import React from 'react';
import { styled } from '@superset-ui/core';

interface DarkModeToggleProps {
  isDark: boolean;
  onChange: (isDark: boolean) => void;
}

const ToggleContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  background: #f0f0f0;
  border-radius: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: default;
  user-select: none;

  &:hover {
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.15);
  }
`;

const ToggleOption = styled.div<{ isActive: boolean; isDark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ isActive, isDark }) =>
    isActive
      ? isDark
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
      : 'transparent'};
  box-shadow: ${({ isActive }) =>
    isActive ? '0 1px 4px rgba(0, 0, 0, 0.2)' : 'none'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${({ isActive }) => (isActive ? 'scale(1.05)' : 'scale(0.95)')};
  opacity: ${({ isActive }) => (isActive ? 1 : 0.6)};

  &:hover {
    opacity: 1;
    transform: scale(1.05);
  }
`;

const IconCircle = styled.div<{ color: string; isActive: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ color }) => color};
  border: 1px solid ${({ color, isActive }) => (isActive ? color : '#ccc')};
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: ${({ isActive }) =>
    isActive ? '0 0 6px rgba(0, 0, 0, 0.3)' : 'none'};
`;

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  isDark,
  onChange,
}) => {
  return (
    <ToggleContainer>
      <ToggleOption
        isActive={!isDark}
        isDark={false}
        title="Light Mode"
      >
        <IconCircle
          color="#ffffff"
          isActive={!isDark}
          onClick={() => onChange(false)}
        />
      </ToggleOption>
      <ToggleOption
        isActive={isDark}
        isDark={true}
        title="Dark Mode"
      >
        <IconCircle
          color="#1a1a1a"
          isActive={isDark}
          onClick={() => onChange(true)}
        />
      </ToggleOption>
    </ToggleContainer>
  );
};