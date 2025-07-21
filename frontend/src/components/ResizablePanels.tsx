import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  initialLeftWidth?: number; // パーセンテージ (0-100)
  minLeftWidth?: number;     // パーセンテージ (0-100)
  maxLeftWidth?: number;     // パーセンテージ (0-100)
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  initialLeftWidth = 70,
  minLeftWidth = 30,
  maxLeftWidth = 85
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // 最小・最大幅の制限を適用
    const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth);
    setLeftWidth(clampedWidth);
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // カーソルスタイルを設定
      document.body.style.cursor = 'col-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        display: 'flex', 
        height: '100%', 
        width: '100%',
        position: 'relative',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      {/* 左パネル */}
      <Box 
        sx={{ 
          width: `${leftWidth}%`,
          height: '100%',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'width 0.1s ease'
        }}
      >
        {leftPanel}
      </Box>

      {/* リサイズハンドル */}
      <Box
        sx={{
          width: '4px',
          height: '100%',
          backgroundColor: 'grey.200',
          cursor: 'col-resize',
          position: 'relative',
          flexShrink: 0,
          '&:hover': {
            backgroundColor: 'primary.light',
            '&::after': {
              opacity: 1
            }
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '40px',
            backgroundColor: 'primary.main',
            borderRadius: '4px',
            opacity: isDragging ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
            '&:before': {
              content: '"⋮⋮"',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: '8px',
              lineHeight: '4px'
            }
          }
        }}
        onMouseDown={handleMouseDown}
      />

      {/* 右パネル */}
      <Box 
        sx={{ 
          width: `${100 - leftWidth}%`,
          height: '100%',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'width 0.1s ease'
        }}
      >
        {rightPanel}
      </Box>
    </Box>
  );
};

export default ResizablePanels;