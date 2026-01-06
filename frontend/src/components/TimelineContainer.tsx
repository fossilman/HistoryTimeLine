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
import { Polity, Person } from '../types';

const BASE_YEAR_SPAN = 2000;
const MIN_SCALE = 2; // 最小缩放：视窗显示 1000 年 (2000 / 2 = 1000)
const MAX_SCALE = 24000; // 最大缩放：视窗显示 1个月 (2000 / 24000 = 1/12 年)

export const TimelineContainer: React.FC = () => {
  const dispatch = useDispatch();
  const { zoomScale, centerYear, startYear, endYear, viewportSpan, isDragging } = useSelector(
    (state: RootState) => state.timeline
  );
  const { civilizations, polities, persons, loading } = useSelector(
    (state: RootState) => state.data
  );

  const [hoveredItem, setHoveredItem] = useState<{ type: string; data: Polity | Person } | null>(null);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const [showPersons] = useState(false); // 默认不显示人物，仅搜索时显示
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedPerson, setMatchedPerson] = useState<Person | null>(null);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<{ startYear: number; endYear: number; viewportSpan: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

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
    // 默认不显示人物，仅当搜索选择人物后才显示该人物
    if (!matchedPerson) {
      return [];
    }
    
    // 检查匹配的人物是否在当前 persons 列表中
    const personInList = persons.find(p => p.id === matchedPerson.id);
    
    // 如果不在列表中，直接使用 matchedPerson（可能是从 API 搜索得到的）
    const personToShow = personInList || matchedPerson;
    
    // 检查时间范围
    if (personToShow.birthYear > endYear || personToShow.deathYear < startYear) {
      return [];
    }
    
    // 检查视窗跨度
    if (yearSpan > 300) {
      return [];
    }
    
    // 返回要显示的人物
    return [personToShow];
  }, [persons, yearSpan, startYear, endYear, matchedPerson]);

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
    
    // 计算缩放增量
    const delta = -e.deltaY * 0.001;
    const requestedScale = zoomScale * (1 + delta);
    
    // 限制缩放范围
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, requestedScale));
    
    // 计算新的视窗跨度
    const newYearSpan = BASE_YEAR_SPAN / newScale;
    
    // 检查是否已经达到边界
    // 最大视窗跨度：1000年（对应MIN_SCALE = 2）
    // 最小视窗跨度：1个月（对应MAX_SCALE = 24000）
    const MAX_VIEWPORT_SPAN = 1000; // 最大视窗跨度
    const MIN_VIEWPORT_SPAN = 1/12; // 最小视窗跨度：1个月
    
    // 检查是否已经达到边界且尝试继续向边界方向缩放
    // delta < 0 表示放大（缩小视窗跨度），delta > 0 表示缩小（增大视窗跨度）
    const isAtMaxSpanBoundary = viewportSpan >= MAX_VIEWPORT_SPAN && delta < 0; // 已达到最大视窗跨度且尝试继续放大
    const isAtMinSpanBoundary = viewportSpan <= MIN_VIEWPORT_SPAN && delta > 0; // 已达到最小视窗跨度且尝试继续缩小
    
    // 如果已经达到边界且尝试继续向边界方向缩放，则阻止事件处理，保持页面不动
    if (isAtMaxSpanBoundary || isAtMinSpanBoundary) {
      // 已达到边界，不更新视窗，保持页面不动
      return;
    }
    
    // 如果缩放比例没有变化（已经达到边界），则不更新
    if (newScale === zoomScale) {
      return;
    }
    
    // 计算鼠标位置对应的年份
    const mouseYear = pixelToYear(mouseX, startYear, endYear, containerWidth);
    
    // 计算新的中心年份，保持鼠标位置对应的年份不变
    const mouseRatio = mouseX / containerWidth;
    const newCenterYear = mouseYear + (0.5 - mouseRatio) * newYearSpan;
    
    dispatch(updateViewport({ centerYear: newCenterYear, zoomScale: newScale }));
    
    // 显示缩放提示
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    // 当视窗跨度小于1年时，使用月为单位描述，最小单位为1个月，不要小数
    let hintText: string;
    if (newYearSpan >= 1) {
      hintText = `视窗: ${Math.round(newYearSpan)} 年`;
    } else {
      const months = newYearSpan * 12;
      hintText = `视窗: ${Math.round(months)} 月`;
    }
    setZoomHint(hintText);
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
    // 重置到300-1300年，视窗跨度1000年
    dispatch(updateViewport({ centerYear: 800, zoomScale: 2 }));
    setSearchQuery('');
    setMatchedPerson(null);
    setSearchResults([]);
    // 重置后隐藏人物显示
  };

  const handleItemHover = (item: { type: string; data: any } | null) => {
    setHoveredItem(item);
  };

  // 平滑缩放动画函数 - 模拟鼠标滚轮效果
  const animateZoomToTarget = useCallback((targetCenterYear: number, targetViewportSpan: number) => {
    if (isAnimatingRef.current) return; // 如果正在动画中，不重复触发
    
    isAnimatingRef.current = true;
    const startCenterYear = centerYear;
    const startViewportSpan = viewportSpan;
    const startScale = zoomScale;
    
    // 计算目标缩放比例
    const targetScale = BASE_YEAR_SPAN / targetViewportSpan;
    
    // 动画参数
    const duration = 1000; // 1秒动画
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数（ease-out）
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // 插值计算当前值
      const currentCenterYear = startCenterYear + (targetCenterYear - startCenterYear) * easeOut;
      const currentScale = startScale + (targetScale - startScale) * easeOut;
      
      // 更新视窗
      dispatch(updateViewport({ centerYear: currentCenterYear, zoomScale: currentScale }));
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        animationFrameRef.current = null;
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [centerYear, viewportSpan, zoomScale, dispatch]);

  // 检查字符串是否包含中文字符
  const containsChinese = (str: string): boolean => {
    return /[\u4e00-\u9fa5]/.test(str);
  };

  // 提取中文字符
  const extractChinese = (str: string): string => {
    return str.replace(/[^\u4e00-\u9fa5]/g, '');
  };

  // 处理搜索 - 返回多个结果
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setMatchedPerson(null);
      return;
    }
    
    // 提取中文字符，如果没有任何中文字符，不进行搜索
    const chineseOnly = extractChinese(query);
    if (!chineseOnly) {
      setSearchResults([]);
      setMatchedPerson(null);
      return;
    }
    
    try {
      // 先尝试在当前的 persons 中搜索（仅匹配中文名，模糊匹配）
      const localResults = persons.filter(p => 
        p.name && p.name.includes(chineseOnly)
      );
      
      let allResults: Person[] = [];
      
      // 如果本地有结果，使用本地结果
      if (localResults.length > 0) {
        allResults = localResults;
      } else {
        // 如果本地没有结果，调用 API 搜索（只传递中文字符）
        const apiResults = await timelineApi.searchPerson(chineseOnly);
        if (apiResults && apiResults.length > 0) {
          allResults = apiResults;
        }
      }
      
      // 限制最多显示10个结果
      setSearchResults(allResults.slice(0, 10));
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    }
  }, [persons]);

  // 处理选择人物 - 只有选择后才定位
  const handleSelectPerson = useCallback((person: Person) => {
    setMatchedPerson(person);
    setSearchQuery('');
    setSearchResults([]);
    
    // 计算目标中心年份（使用人物的出生年）
    const targetCenterYear = person.birthYear;
    const targetViewportSpan = 50; // 50年视窗
    
    // 执行平滑缩放动画
    animateZoomToTarget(targetCenterYear, targetViewportSpan);
  }, [animateZoomToTarget]);

  // 清理动画
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      <ToolBar 
        onReset={handleReset}
        onSearch={handleSearch}
        onSelectPerson={handleSelectPerson}
        searchResults={searchResults.map(person => ({
          ...person,
          polityName: polities.find(p => p.id === person.polityId)?.name
        }))}
        polities={polities}
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
            polities={visiblePolities}
            allPolities={polities}
            polityTracks={polityTracks}
            persons={visiblePersons}
            showPersons={showPersons}
            onItemHover={handleItemHover}
            matchedPerson={matchedPerson}
          />

        </div>
      </div>

      {/* 缩放提示 */}
      {zoomHint && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold text-lg z-50">
          {zoomHint}
        </div>
      )}

      <DetailPanel item={hoveredItem} />
    </div>
  );
};


