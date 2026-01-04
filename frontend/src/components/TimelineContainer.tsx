import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateViewport, setDragging } from '../store/timelineSlice';
import { setData, setLoading, setError } from '../store/dataSlice';
import { timelineApi } from '../api/timelineApi';
import { TimelineCanvas } from './TimelineCanvas';
import { ScaleBar } from './ScaleBar';
import { ToolBar } from './ToolBar';
import { DetailPanel } from './DetailPanel';
import { pixelToYear } from '../utils/coordinateTransform';
import { assignTracks } from '../utils/trackAssignment';
import { Polity, Person, Event } from '../types';

const BASE_YEAR_SPAN = 2000;

export const TimelineContainer: React.FC = () => {
  const dispatch = useDispatch();
  const { zoomScale, centerYear, startYear, endYear, viewportSpan, isDragging } = useSelector(
    (state: RootState) => state.timeline
  );
  const { civilizations, polities, persons, events, loading } = useSelector(
    (state: RootState) => state.data
  );

  const [selectedItem, setSelectedItem] = useState<{ type: string; data: Polity | Person | Event } | null>(null);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const [showPersons, setShowPersons] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<{ startYear: number; endYear: number; viewportSpan: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const yearSpan = viewportSpan;

  // 监听窗口大小变化，实现全屏
  useEffect(() => {
    const handleResize = () => {
      setContainerSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // 清理所有定时器
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  // 政权层永久显示，只过滤时间范围
  const visiblePolities = useMemo(() => {
    return polities.filter(p => {
      // 只检查是否与时间窗口有重叠
      return p.endYear >= startYear && p.startYear <= endYear;
    });
  }, [polities, startYear, endYear]);

  const visiblePersons = useMemo(() => {
    return persons.filter(p => {
      if (p.birthYear > endYear || p.deathYear < startYear) return false;
      if (yearSpan > 300) return false;
      return true;
    });
  }, [persons, yearSpan, startYear, endYear]);

  const visibleDurationEvents = useMemo(() => {
    return events.filter(e => {
      if (e.type !== 'duration' || !e.startYear || !e.endYear) return false;
      if (e.startYear > endYear || e.endYear < startYear) return false;
      if (yearSpan > 100) return false;
      return true;
    });
  }, [events, yearSpan, startYear, endYear]);

  const visibleEvents = useMemo(() => {
    return events.filter(e => {
      if (e.type !== 'point' || !e.year) return false;
      if (e.year < startYear || e.year > endYear) return false;
      if (yearSpan > 100) return false;
      return true;
    });
  }, [events, yearSpan, startYear, endYear]);

  // 计算轨道数量
  const polityTracks = useMemo(() => {
    const items = visiblePolities.map(p => ({
      id: p.id,
      start: p.startYear,
      end: p.endYear
    }));
    return assignTracks(items);
  }, [visiblePolities]);

  const personTracks = useMemo(() => {
    const items = visiblePersons.map(p => ({
      id: p.id,
      start: p.birthYear,
      end: p.deathYear
    }));
    return assignTracks(items);
  }, [visiblePersons]);

  // 获取数据（带缓存）
  const fetchData = useCallback(async (force = false, params?: { startYear: number; endYear: number; viewportSpan: number }) => {
    const roundedStartYear = params ? params.startYear : Math.floor(startYear);
    const roundedEndYear = params ? params.endYear : Math.ceil(endYear);
    const roundedViewportSpan = params ? params.viewportSpan : Math.round(viewportSpan);
    
    // 检查缓存，避免重复请求相同的数据
    const cacheKey = `${roundedStartYear}-${roundedEndYear}-${roundedViewportSpan}`;
    if (!force && lastFetchParamsRef.current) {
      const lastKey = `${lastFetchParamsRef.current.startYear}-${lastFetchParamsRef.current.endYear}-${lastFetchParamsRef.current.viewportSpan}`;
      if (cacheKey === lastKey) {
        return; // 数据相同，不需要重新请求
      }
    }
    
    dispatch(setLoading(true));
    try {
      const data = await timelineApi.getTimelineData(
        roundedStartYear,
        roundedEndYear,
        roundedViewportSpan
      );
      dispatch(setData(data));
      lastFetchParamsRef.current = {
        startYear: roundedStartYear,
        endYear: roundedEndYear,
        viewportSpan: roundedViewportSpan
      };
    } catch (error: any) {
      dispatch(setError(error.message || '获取数据失败'));
    }
  }, [dispatch]);

  // 防抖获取数据
  const debouncedFetchData = useCallback((delay = 500) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      const roundedStartYear = Math.floor(startYear);
      const roundedEndYear = Math.ceil(endYear);
      const roundedViewportSpan = Math.round(viewportSpan);
      fetchData(false, { startYear: roundedStartYear, endYear: roundedEndYear, viewportSpan: roundedViewportSpan });
    }, delay);
  }, [startYear, endYear, viewportSpan, fetchData]);

  // 初始加载数据
  useEffect(() => {
    fetchData(true);
  }, []); // 只在组件挂载时执行一次

  // 监听视窗变化，使用防抖（拖动时不调用）
  useEffect(() => {
    if (isDragging) {
      // 拖动中不调用接口
      return;
    }
    // 使用防抖，延迟500ms后调用
    debouncedFetchData(500);
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [startYear, endYear, viewportSpan, isDragging, debouncedFetchData]);

  // 处理滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const containerWidth = containerSize.width;
    
    // 计算鼠标位置对应的年份
    const mouseYear = pixelToYear(mouseX, startYear, endYear, containerWidth);
    
    // 计算缩放增量
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(2000, zoomScale * (1 + delta)));
    
    // 计算新的中心年份，保持鼠标位置对应的年份不变
    const newYearSpan = BASE_YEAR_SPAN / newScale;
    const mouseRatio = mouseX / containerWidth;
    const newCenterYear = mouseYear + (0.5 - mouseRatio) * newYearSpan;
    
    dispatch(updateViewport({ centerYear: newCenterYear, zoomScale: newScale }));
    
    // 显示缩放提示
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setZoomHint(`视窗: ${Math.round(newYearSpan)} 年`);
    hintTimeoutRef.current = setTimeout(() => setZoomHint(null), 1000);
  };

  // 处理鼠标拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    dispatch(setDragging(true));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastXRef.current;
      const yearsDelta = -dx * viewportSpan / containerSize.width;
      dispatch(updateViewport({ 
        centerYear: centerYear + yearsDelta, 
        zoomScale 
      }));
      lastXRef.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dispatch(setDragging(false));
    // 拖动结束后，延迟调用接口获取数据
    debouncedFetchData(300);
  };

  const handleReset = () => {
    dispatch(updateViewport({ centerYear: -200, zoomScale: 0.5 }));
  };

  const handleItemClick = (item: { type: string; data: any }) => {
    setSelectedItem(item);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      <ToolBar 
        onReset={handleReset}
        showPersons={showPersons}
        showEvents={showEvents}
        onTogglePersons={setShowPersons}
        onToggleEvents={setShowEvents}
      />
      
      <ScaleBar 
        startYear={startYear}
        endYear={endYear}
        viewportSpan={viewportSpan}
        polityTrackCount={polityTracks.trackCount}
        personTrackCount={personTracks.trackCount}
      />

      {/* 时间轴主区域 - 全屏展示 */}
      <div className="flex-1 overflow-hidden relative">
        <div 
          ref={containerRef}
          className="absolute inset-0"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <TimelineCanvas
            width={containerSize.width}
            height={containerSize.height - 200}
            startYear={startYear}
            endYear={endYear}
            civilizations={civilizations}
            polities={polities}
            persons={visiblePersons}
            events={[...visibleEvents, ...visibleDurationEvents]}
            showPersons={showPersons}
            showEvents={showEvents}
            onItemClick={handleItemClick}
          />

        </div>
      </div>

      {/* 缩放提示 */}
      {zoomHint && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold text-lg z-50">
          {zoomHint}
        </div>
      )}

      <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
};

