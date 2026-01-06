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
  const { civilizations, polities, persons } = useSelector(
    (state: RootState) => state.data
  );

  const [hoveredItem, setHoveredItem] = useState<{ type: string; data: Polity | Person } | null>(null);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const [matchedPerson, setMatchedPerson] = useState<Person | null>(null);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [showNoResults, setShowNoResults] = useState(false);
  const [expandedPolityId, setExpandedPolityId] = useState<string | null>(null);
  const [childPolities, setChildPolities] = useState<Polity[]>([]);
  const [selectedPolity, setSelectedPolity] = useState<Polity | null>(null);
  const [selectedCivilization, setSelectedCivilization] = useState<any | null>(null);
  const [level0Polities, setLevel0Polities] = useState<Polity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchParamsRef = useRef<{ startYear: number; endYear: number; viewportSpan: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);


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
    
    // 返回要显示的人物（不再检查视窗跨度）
    return [personToShow];
  }, [persons, startYear, endYear, matchedPerson]);

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
    setMatchedPerson(null);
    setSearchResults([]);
    setShowNoResults(false);
    setExpandedPolityId(null);
    setChildPolities([]);
    setSelectedPolity(null);
    setSelectedCivilization(null);
    setLevel0Polities([]);
    // 重置后隐藏人物显示
  };

  const handleItemHover = (item: { type: string; data: any } | null) => {
    setHoveredItem(item);
    
    // 当鼠标悬停在文明或朝代上时，更新选中状态并获取Level0朝代
    if (item?.type === 'polity') {
      const polity = item.data as Polity;
      setSelectedPolity(polity);
      setSelectedCivilization(null);
      
      // 获取该朝代所属文明的所有Level0朝代
      if (polity.civilizationId) {
        timelineApi.getLevel0DynastiesByCivilization(polity.civilizationId)
          .then(data => {
            setLevel0Polities(data);
          })
          .catch(error => {
            console.error('获取Level0朝代失败:', error);
            setLevel0Polities([]);
          });
      }
    } else if (item?.type === 'civilization') {
      const civ = item.data;
      setSelectedCivilization(civ);
      setSelectedPolity(null);
      
      // 获取该文明的所有Level0朝代
      if (civ.id) {
        timelineApi.getLevel0DynastiesByCivilization(civ.id)
          .then(data => {
            setLevel0Polities(data);
          })
          .catch(error => {
            console.error('获取Level0朝代失败:', error);
            setLevel0Polities([]);
          });
      }
    } else {
      // 鼠标移开时不清除选中状态，保持显示
      // setSelectedPolity(null);
      // setSelectedCivilization(null);
      // setLevel0Polities([]);
    }
  };

  // 平滑缩放动画函数 - 模拟鼠标滚轮效果
  const animateZoomToTarget = useCallback((targetCenterYear: number, targetViewportSpan: number) => {
    if (isAnimatingRef.current) return; // 如果正在动画中，不重复触发
    
    isAnimatingRef.current = true;
    const startCenterYear = centerYear;
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

  // 处理朝代点击（展开/收起）
  const handlePolityClick = useCallback(async (polity: Polity) => {
    if (expandedPolityId === polity.id) {
      // 收起
      setExpandedPolityId(null);
      setChildPolities([]);
    } else {
      // 展开
      setExpandedPolityId(polity.id);
      
      // 获取子朝代
      try {
        const children = await timelineApi.getChildDynasties(polity.id);
        setChildPolities(children);
      } catch (error) {
        console.error('获取子朝代失败:', error);
        setChildPolities([]);
      }
    }
  }, [expandedPolityId]);

  // 处理快速定位到朝代
  const handleQuickLocate = useCallback((polity: Polity) => {
    setSelectedPolity(polity);
    setSelectedCivilization(null);
    
    // 计算目标中心年份（朝代的中间年份）
    const centerYear = (polity.startYear + polity.endYear) / 2;
    const targetViewportSpan = Math.max(50, (polity.endYear - polity.startYear) * 1.5); // 视窗跨度略大于朝代跨度
    
    // 执行平滑缩放动画
    animateZoomToTarget(centerYear, targetViewportSpan);
  }, [animateZoomToTarget]);

  // 提取中文字符
  const extractChinese = (str: string): string => {
    return str.replace(/[^\u4e00-\u9fa5]/g, '');
  };

  // 处理搜索 - 返回多个结果
  const handleSearch = useCallback(async (query: string) => {
    setShowNoResults(false);
    
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
    
    // 先尝试在当前的 persons 中搜索（仅匹配中文名，精确匹配）
    const localResults = persons.filter(p => 
      p.name && p.name === chineseOnly
    );
    
    // 如果本地有结果，直接使用
    if (localResults.length > 0) {
      setSearchResults(localResults.slice(0, 10));
      setShowNoResults(false);
      return;
    }
    
    // 如果本地没有结果，调用 API 搜索
    try {
      const apiResults = await timelineApi.searchPerson(chineseOnly);
      if (apiResults && apiResults.length > 0) {
        setSearchResults(apiResults.slice(0, 10));
        setShowNoResults(false);
      } else {
        setSearchResults([]);
        setShowNoResults(true);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
      setShowNoResults(true);
    }
  }, [persons]);

  // 处理选择人物 - 只有选择后才定位
  const handleSelectPerson = useCallback((person: Person) => {
    setMatchedPerson(person);
    setSearchResults([]);
    setShowNoResults(false);
    
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
        searchResults={searchResults.map(person => {
          // 优先使用后端返回的 polityName，如果后端没有返回，才从 polities 数组中查找
          const polityName = person.polityName || polities.find(p => p.id === person.polityId)?.name;
          return {
            ...person,
            polityName: polityName
          };
        })}
        polities={polities}
        showNoResults={showNoResults}
      />
      
      <ScaleBar 
        startYear={startYear}
        endYear={endYear}
        viewportSpan={viewportSpan}
        polityTrackCount={polityTracks.trackCount}
        personTrackCount={personTracks.trackCount}
        selectedCivilization={selectedCivilization}
        selectedPolity={selectedPolity}
        level0Polities={level0Polities}
        onPolityClick={handleQuickLocate}
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
            persons={visiblePersons}
            onItemHover={handleItemHover}
            matchedPerson={matchedPerson}
            expandedPolityId={expandedPolityId}
            childPolities={childPolities}
            onPolityClick={handlePolityClick}
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


