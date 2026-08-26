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
      <div style={{ width: '100%', height: '100%', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <style>{shimmerStyle}</style>
        {/* Day selector shimmer */}
        <div
          className="shimmer"
          style={{
            width: '60%',
            height: '36px',
            borderRadius: '18px',
            alignSelf: 'center',
          }}
        />

        {/* Big number shimmer */}
        <div
          className="shimmer"
          style={{
            width: '70%',
            height: 'clamp(64px, 9vw, 100px)',
            borderRadius: '10px',
            alignSelf: 'center',
          }}
        />

        {/* Delta line */}
        <div
          className="shimmer"
          style={{
            width: '45%',
            height: '18px',
            borderRadius: '6px',
            alignSelf: 'center',
          }}
        />

        {/* Compare line */}
        <div
          className="shimmer"
          style={{
            width: '70%',
            height: '14px',
            borderRadius: '6px',
            alignSelf: 'center',
          }}
        />

        {/* Heatmap shimmer */}
        <div
          className="shimmer"
          style={{
            width: '100%',
            height: '16px',
            borderRadius: '6px',
            marginTop: '4px',
          }}
        />
        <div
          className="shimmer"
          style={{
            width: '100%',
            height: '72px',
            borderRadius: '8px',
          }}
        />
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'stretch',
        gap: '10px',
        padding: '8px 10px',
        boxSizing: 'border-box'
      }}>
        <style>{shimmerStyle}</style>
        
        {/* Left - Info card shimmer */}
        <div style={{ 
          flex: '1 1 0',
          minWidth: 'clamp(120px, 12vw, 180px)',
          maxWidth: 'clamp(160px, 16vw, 220px)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'clamp(8px, 1vh, 14px)',
          padding: '10px',
          backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid #404040' : '1px solid #e0e0e0'
        }}>
          {/* Header section */}
          <div style={{ marginBottom: 'clamp(6px, 0.8vh, 12px)' }}>
            <div className="shimmer" style={{ width: '70%', height: '16px', borderRadius: '4px', marginBottom: '8px' }} />
            <div className="shimmer" style={{ width: '60%', height: '20px', borderRadius: '4px', marginBottom: '12px' }} />
            <div className="shimmer" style={{ width: '85%', height: '14px', borderRadius: '4px' }} />
          </div>
          
          {/* Most common range */}
          <div className="shimmer" style={{ width: '90%', height: '32px', borderRadius: '6px', marginBottom: 'clamp(8px, 1vh, 14px)' }} />
          
          {/* Progress section */}
          <div style={{ marginTop: 'clamp(4px, 0.7vh, 10px)', marginBottom: 'clamp(8px, 1vh, 14px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(4px, 0.55vh, 7px)' }}>
              <div className="shimmer" style={{ width: '35%', height: '12px', borderRadius: '4px' }} />
              <div className="shimmer" style={{ width: '35%', height: '12px', borderRadius: '4px' }} />
            </div>
            <div className="shimmer" style={{ width: '100%', height: 'clamp(14px, 1.5vh, 20px)', borderRadius: '12px' }} />
          </div>
          
          {/* Bottom stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <div>
              <div className="shimmer" style={{ width: '40px', height: '18px', borderRadius: '4px', marginBottom: '4px' }} />
              <div className="shimmer" style={{ width: '60px', height: '12px', borderRadius: '4px' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="shimmer" style={{ width: '40px', height: '18px', borderRadius: '4px', marginBottom: '4px' }} />
              <div className="shimmer" style={{ width: '60px', height: '12px', borderRadius: '4px' }} />
            </div>
          </div>
        </div>

        {/* Center - Pie chart shimmer */}
        <div style={{ 
          flex: '1 1 0',
          minWidth: 0,
          maxWidth: 'none',
          width: '100%',
          height: '100%',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          margin: '0 6px',
          padding: 0,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div
            className="shimmer"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: 'clamp(220px, 30vw, 360px)',
              maxHeight: 'clamp(220px, 30vw, 360px)',
              borderRadius: '50%',
              aspectRatio: '1',
            }}
          />
        </div>

        {/* Right - Legend shimmer */}
        <div style={{ 
          flex: '0 0 auto',
          alignSelf: 'flex-start',
          paddingTop: '16px',
          marginLeft: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            minWidth: '60px',
            maxWidth: '100px',
            marginTop: '8px',
            padding: '10px',
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
            borderRadius: '12px',
            boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)'
          }}>
            {/* Legend title */}
            <div className="shimmer" style={{ width: '100%', height: '15px', borderRadius: '4px', marginBottom: '8px' }} />
            
            {/* Legend items */}
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '7px 9px',
                borderRadius: '8px',
                border: '2px solid ' + (isDarkMode ? '#404040' : '#f0f0f0'),
                backgroundColor: isDarkMode ? '#2d2d2d' : '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div className="shimmer" style={{ width: '10px', height: '10px', borderRadius: '50%' }} />
                  <div className="shimmer" style={{ width: '35px', height: '13px', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div style={{ width: '100%', height: '100%', padding: '18px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <style>{shimmerStyle}</style>
        {/* Title */}
        <div
          className="shimmer"
          style={{
            width: '55%',
            height: '18px',
            borderRadius: '6px',
          }}
        />

        {/* Date navigation bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="shimmer" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
          <div className="shimmer" style={{ flex: 1, height: '32px', borderRadius: '16px' }} />
          <div className="shimmer" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
        </div>

        {/* Chart container */}
        <div
          style={{
            flex: 1,
            background: isDarkMode ? '#1a1a1a' : '#fff',
            border: isDarkMode ? '1px solid #404040' : '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box',
          }}
        >
          {/* Legend shimmer */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <div className="shimmer" style={{ width: '140px', height: '16px', borderRadius: '8px' }} />
            <div className="shimmer" style={{ width: '120px', height: '16px', borderRadius: '8px' }} />
          </div>

          {/* Chart area */}
          <div
            className="shimmer"
            style={{
              width: '100%',
              flex: 1,
              borderRadius: '12px',
            }}
          />

          {/* X axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="shimmer" style={{ flex: 1, height: '12px', borderRadius: '6px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
