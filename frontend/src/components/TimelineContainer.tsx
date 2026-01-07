import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateViewport, setDragging } from '../store/timelineSlice';
import { setData, setLoading, setError } from '../store/dataSlice';
import { timelineApi } from '../api/timelineApi';
import { TimelineCanvas } from './TimelineCanvas';
import { ScaleBar } from './ScaleBar';
import { ToolBar } from './ToolBar';
import { pixelToYear } from '../utils/coordinateTransform';
import { assignTracks } from '../utils/trackAssignment';
import { Polity, Person, Civilization } from '../types';

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
  // 全量数据（用于快速定位栏，不受时间范围限制）
  const [allCivilizations, setAllCivilizations] = useState<any[]>([]);
  const [allLevel0Polities, setAllLevel0Polities] = useState<Polity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchParamsRef = useRef<{ startYear: number; endYear: number; viewportSpan: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  // 用于节流滚动和拖动更新的本地状态
  const pendingUpdateRef = useRef<{ centerYear: number; zoomScale: number } | null>(null);
  const rafUpdateRef = useRef<number | null>(null);
  // 用于存储 animateZoomToTarget 函数的 ref
  const animateZoomToTargetRef = useRef<((targetCenterYear: number, targetViewportSpan: number) => void) | null>(null);


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
    // 如果正在动画中，不执行数据加载
    if (isAnimatingRef.current) {
      return;
    }
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      // 再次检查是否仍在动画中
      if (isAnimatingRef.current) {
        return;
      }
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

  // 加载全量数据（用于快速定位栏，不受时间范围限制）
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // 并行加载所有文明和所有Level0政权
        const [civilizations, polities] = await Promise.all([
          timelineApi.getAllCivilizations(),
          timelineApi.getAllLevel0Dynasties()
        ]);
        setAllCivilizations(civilizations);
        setAllLevel0Polities(polities);
        
        // 初始定位到华夏文明和唐朝
        const huaxiaCivilization = civilizations.find((civ: Civilization) => civ.name === '华夏文明' || civ.name?.includes('华夏'));
        if (huaxiaCivilization) {
          setSelectedCivilization(huaxiaCivilization);
          // 查找唐朝
          const tangPolity = polities.find((polity: Polity) => 
            (polity.name === '唐' || polity.name === '唐朝' || polity.name?.includes('唐')) &&
            polity.civilizationId === huaxiaCivilization.id
          );
          if (tangPolity) {
            setSelectedPolity(tangPolity);
            // 延迟执行，确保状态已更新，然后模拟点击唐朝的效果
            setTimeout(() => {
              // 计算目标中心年份（朝代的中间年份）
              const targetCenterYear = (tangPolity.startYear + tangPolity.endYear) / 2;
              const targetViewportSpan = Math.max(50, (tangPolity.endYear - tangPolity.startYear) * 1.5); // 视窗跨度略大于朝代跨度
              
              // 执行平滑缩放动画（使用 ref 避免依赖问题）
              if (animateZoomToTargetRef.current) {
                animateZoomToTargetRef.current(targetCenterYear, targetViewportSpan);
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error('加载全量数据失败:', error);
      }
    };
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次，animateZoomToTarget 使用 ref 避免依赖问题

  // 监听视窗变化，使用防抖（拖动或动画时不调用）
  useEffect(() => {
    if (isDragging) {
      // 拖动中不调用接口
      return;
    }
    if (isAnimatingRef.current) {
      // 动画中不调用接口，避免频繁请求导致滞后
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

  // 使用 requestAnimationFrame 批量更新视窗，确保快速滚动时也能实时更新
  const scheduleViewportUpdate = useCallback((newCenterYear: number, newZoomScale: number) => {
    // 始终更新待处理的更新值，这样快速滚动时也能累积所有变化
    pendingUpdateRef.current = { centerYear: newCenterYear, zoomScale: newZoomScale };
    
    // 如果还没有安排更新，则安排一个
    if (rafUpdateRef.current === null) {
      const update = () => {
        if (pendingUpdateRef.current) {
          const updateValue = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          dispatch(updateViewport(updateValue));
        }
        rafUpdateRef.current = null;
        
        // 如果还有待处理的更新，继续安排下一个更新（递归）
        if (pendingUpdateRef.current) {
          rafUpdateRef.current = requestAnimationFrame(update);
        }
      };
      rafUpdateRef.current = requestAnimationFrame(update);
    }
  }, [dispatch]);

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
    let newCenterYear = mouseYear + (0.5 - mouseRatio) * newYearSpan;
    
    // 计算边界范围
    const MIN_YEAR = -1200;
    const MAX_YEAR = 2100;
    const minCenterYear = MIN_YEAR + newYearSpan / 2;
    const maxCenterYear = MAX_YEAR - newYearSpan / 2;
    
    // 限制中心年份在边界内
    newCenterYear = Math.max(minCenterYear, Math.min(maxCenterYear, newCenterYear));
    
    // 使用 requestAnimationFrame 节流更新
    scheduleViewportUpdate(newCenterYear, newScale);
    
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
      const newCenterYear = centerYear + yearsDelta;
      
      // 计算边界范围
      const MIN_YEAR = -1200;
      const MAX_YEAR = 2100;
      const minCenterYear = MIN_YEAR + viewportSpan / 2;
      const maxCenterYear = MAX_YEAR - viewportSpan / 2;
      
      // 限制中心年份在边界内
      const clampedCenterYear = Math.max(minCenterYear, Math.min(maxCenterYear, newCenterYear));
      
      // 如果已经到达边界，不再更新（防止继续拖动）
      if (clampedCenterYear === centerYear && (newCenterYear < minCenterYear || newCenterYear > maxCenterYear)) {
        // 已到达边界，不更新，阻止继续拖动
        return;
      }
      
      // 使用 requestAnimationFrame 节流更新
      scheduleViewportUpdate(clampedCenterYear, zoomScale);
      
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
    setLevel0Polities([]);
    
    // 重置后定位到华夏文明和唐朝，并执行平滑缩放动画
    const huaxiaCivilization = allCivilizations.find((civ: any) => civ.name === '华夏文明' || civ.name?.includes('华夏'));
    if (huaxiaCivilization) {
      setSelectedCivilization(huaxiaCivilization);
      // 查找唐朝
      const tangPolity = allLevel0Polities.find((polity: Polity) => 
        (polity.name === '唐' || polity.name === '唐朝' || polity.name?.includes('唐')) &&
        polity.civilizationId === huaxiaCivilization.id
      );
      if (tangPolity) {
        setSelectedPolity(tangPolity);
        // 延迟执行，确保状态已更新，然后模拟点击唐朝的效果
        setTimeout(() => {
          // 计算目标中心年份（朝代的中间年份）
          const targetCenterYear = (tangPolity.startYear + tangPolity.endYear) / 2;
          const targetViewportSpan = Math.max(50, (tangPolity.endYear - tangPolity.startYear) * 1.5); // 视窗跨度略大于朝代跨度
          
          // 执行平滑缩放动画（使用 ref 避免依赖问题）
          if (animateZoomToTargetRef.current) {
            animateZoomToTargetRef.current(targetCenterYear, targetViewportSpan);
          }
        }, 100);
      } else {
        setSelectedPolity(null);
      }
    } else {
      setSelectedCivilization(null);
      setSelectedPolity(null);
    }
    // 重置后隐藏人物显示
  };

  const handleItemHover = (item: { type: string; data: any } | null) => {
    // 悬停时只更新详情面板，不联动快速定位栏
    setHoveredItem(item);
  };

  // 处理文明或政权的点击事件（点击时不联动快速定位栏）
  const handleItemClick = useCallback((item: { type: string; data: any } | null) => {
    // 点击时只更新详情面板，不更新快速定位栏
    setHoveredItem(item);
  }, []);

  // 平滑缩放动画函数 - 模拟鼠标滚轮效果
  const animateZoomToTarget = useCallback((targetCenterYear: number, targetViewportSpan: number) => {
    if (isAnimatingRef.current) return; // 如果正在动画中，不重复触发
    
    isAnimatingRef.current = true;
    const startCenterYear = centerYear;
    const startScale = zoomScale;
    
    // 计算目标缩放比例
    const targetScale = BASE_YEAR_SPAN / targetViewportSpan;
    
    // 计算边界范围
    const MIN_YEAR = -1200;
    const MAX_YEAR = 2100;
    const minCenterYear = MIN_YEAR + targetViewportSpan / 2;
    const maxCenterYear = MAX_YEAR - targetViewportSpan / 2;
    
    // 限制目标中心年份在边界内
    const clampedTargetCenterYear = Math.max(minCenterYear, Math.min(maxCenterYear, targetCenterYear));
    
    // 动画参数
    const duration = 800; // 缩短动画时长到800ms
    const startTime = Date.now();
    let lastUpdateTime = startTime;
    const minUpdateInterval = 16; // 约60fps，每16ms更新一次（节流）
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数（ease-out）
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // 插值计算当前值
      let currentCenterYear = startCenterYear + (clampedTargetCenterYear - startCenterYear) * easeOut;
      const currentScale = startScale + (targetScale - startScale) * easeOut;
      
      // 计算当前视窗跨度的边界
      const currentViewportSpan = BASE_YEAR_SPAN / currentScale;
      const currentMinCenterYear = MIN_YEAR + currentViewportSpan / 2;
      const currentMaxCenterYear = MAX_YEAR - currentViewportSpan / 2;
      
      // 限制当前中心年份在边界内
      currentCenterYear = Math.max(currentMinCenterYear, Math.min(currentMaxCenterYear, currentCenterYear));
      
      // 节流更新：只在达到最小更新间隔时才更新状态
      const now = Date.now();
      if (now - lastUpdateTime >= minUpdateInterval || progress >= 1) {
        // 使用批量更新机制，减少渲染次数
        scheduleViewportUpdate(currentCenterYear, currentScale);
        lastUpdateTime = now;
      }
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 确保最后一次更新
        scheduleViewportUpdate(currentCenterYear, currentScale);
        isAnimatingRef.current = false;
        animationFrameRef.current = null;
        // 动画完成后，延迟加载数据，确保动画完全结束
        setTimeout(() => {
          debouncedFetchData(300);
        }, 100);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [centerYear, zoomScale, scheduleViewportUpdate, debouncedFetchData]);
  
  // 将 animateZoomToTarget 存储到 ref 中，供初始化使用
  useEffect(() => {
    animateZoomToTargetRef.current = animateZoomToTarget;
  }, [animateZoomToTarget]);

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

  // 处理快速定位到文明（从快速定位栏点击）
  const handleCivilizationClick = useCallback(async (civilization: any) => {
    setSelectedCivilization(civilization);
    // 点击文明时，不改变主页面视窗，也不清除选中的政权
    // 主页面不要随之变动
  }, []);

  // 处理快速定位到朝代（从快速定位栏点击）
  const handleQuickLocate = useCallback((polity: Polity) => {
    setSelectedPolity(polity);
    // 点击政权时，不改变主页面视窗，也不清除选中的文明
    // 当点击快速定位栏中的政权元素后，二层不要消失
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

  // 清理动画和 RAF
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rafUpdateRef.current) {
        cancelAnimationFrame(rafUpdateRef.current);
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
        civilizations={allCivilizations} // 使用全量文明数据，不受时间范围限制
        selectedCivilization={selectedCivilization}
        selectedPolity={selectedPolity}
        allLevel0Polities={allLevel0Polities} // 使用全量Level0政权数据，不受时间范围限制
        onCivilizationClick={handleCivilizationClick}
        onPolityClick={handleQuickLocate}
      />

      {/* 时间轴主区域 - 全屏展示，无滚动条 */}
      <div className="flex-1 overflow-hidden relative">
        <div 
          ref={containerRef}
          className="relative w-full h-full"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <TimelineCanvas
            width={containerSize.width}
            height={containerSize.height - 136}
            startYear={startYear}
            endYear={endYear}
            civilizations={civilizations}
            polities={visiblePolities}
            persons={visiblePersons}
            onItemHover={handleItemHover}
            onItemClick={handleItemClick}
            matchedPerson={matchedPerson}
            expandedPolityId={expandedPolityId}
            childPolities={childPolities}
            onPolityClick={handlePolityClick}
            containerHeight={containerSize.height}
          />

        </div>
      </div>

      {/* 底部栏 - 仅显示比例尺和范围，无操作功能 */}
      <div className="bg-white border-t border-slate-200 shadow-sm">
        <ScaleBar 
          startYear={startYear}
          endYear={endYear}
          viewportSpan={viewportSpan}
          displayOnly={true}
          detailItem={hoveredItem}
        />
      </div>

      {/* 缩放提示 */}
      {zoomHint && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold text-lg z-50">
          {zoomHint}
        </div>
      )}
      
    </div>
  );
};


