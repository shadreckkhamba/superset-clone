import React from 'react';

interface ShimmerLoaderProps {
  type?: 'bignumber' | 'pie' | 'line';
  isDarkMode?: boolean;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ type = 'bignumber', isDarkMode = false }) => {
  const shimmerBase = isDarkMode ? '#2b2b2b' : '#f0f0f0';
  const shimmerHighlight = isDarkMode ? '#3a3a3a' : '#e0e0e0';
  const shimmerStyle = `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }

    .shimmer {
      animation: shimmer 2s infinite linear;
      background: linear-gradient(
        to right,
        ${shimmerBase} 0%,
        ${shimmerHighlight} 20%,
        ${shimmerBase} 40%,
        ${shimmerBase} 100%
      );
      background-size: 1000px 100%;
    }
  `;

  if (type === 'bignumber') {
    return (
      <div style={{ width: '100%', height: '100%', padding: '40px' }}>
        <style>{shimmerStyle}</style>
        {/* Big number shimmer */}
        <div
          className="shimmer"
          style={{
            width: '60%',
            height: '80px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        />
        {/* Subtitle shimmer */}
        <div
          className="shimmer"
          style={{
            width: '40%',
            height: '30px',
            borderRadius: '6px',
            marginBottom: '30px',
          }}
        />
        {/* Chart shimmer */}
        <div
          className="shimmer"
          style={{
            width: '100%',
            height: '200px',
            borderRadius: '8px',
          }}
        />
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', gap: '20px', padding: '40px' }}>
        <style>{shimmerStyle}</style>
        {/* Info card shimmer */}
        <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="shimmer" style={{ width: '100%', height: '60px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '80%', height: '40px', borderRadius: '6px' }} />
          <div className="shimmer" style={{ width: '100%', height: '80px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '100%', height: '100px', borderRadius: '8px' }} />
        </div>
        {/* Pie chart shimmer */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            className="shimmer"
            style={{
              width: '400px',
              height: '400px',
              borderRadius: '50%',
            }}
          />
        </div>
        {/* Legend shimmer */}
        <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
          <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div style={{ width: '100%', height: '100%', padding: '40px' }}>
        <style>{shimmerStyle}</style>
        {/* Title shimmer */}
        <div
          className="shimmer"
          style={{
            width: '50%',
            height: '40px',
            borderRadius: '8px',
            marginBottom: '30px',
          }}
        />
        {/* Chart shimmer */}
        <div
          className="shimmer"
          style={{
            width: '100%',
            height: 'calc(100% - 100px)',
            borderRadius: '8px',
          }}
        />
      </div>
    );
  }

  return null;
};
