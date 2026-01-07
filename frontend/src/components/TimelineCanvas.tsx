import React, { useMemo } from 'react';
import { Civilization, Polity, Person } from '../types';
import { assignTracks } from '../utils/trackAssignment';
import { yearToPixel } from '../utils/coordinateTransform';
import { generateTimeMarks, formatTime } from '../utils/dateUtils';

// 将 HEX 颜色转换为 rgba 格式
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// 莫兰迪色系配色方案（低饱和度、柔和的颜色）
const morandiColors = [
  '#A8B5A0', // 灰绿色
  '#B5A8A0', // 灰棕色
  '#A8A0B5', // 灰紫色
  '#B5A0A8', // 灰粉色
  '#A0A8B5', // 灰蓝色
  '#A0B5A8', // 灰青色
  '#C4B5A0', // 米色
  '#B5C4A0', // 淡绿色
  '#A0B5C4', // 淡蓝色
  '#C4A0B5', // 淡紫色
  '#A8C4B5', // 薄荷绿
  '#B5A8C4', // 淡紫灰
  '#C4B5A8', // 卡其色
  '#A0C4B5', // 青灰色
  '#B5C4A8', // 橄榄绿
  '#C4A8B5', // 玫瑰灰
];

// 根据朝代ID生成稳定的莫兰迪色
export const getMorandiColor = (polityId: string): string => {
  // 将ID转换为数字，用于选择颜色
  const idNum = parseInt(polityId) || 0;
  const colorIndex = idNum % morandiColors.length;
  return morandiColors[colorIndex];
};

// 根据文明ID生成稳定的颜色（用于文明色带）
const getCivilizationColor = (civilizationId: string): string => {
  // 将ID转换为数字，用于选择颜色
  // 使用字符串哈希来确保不同ID得到不同颜色
  let hash = 0;
  for (let i = 0; i < civilizationId.length; i++) {
    const char = civilizationId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  const colorIndex = Math.abs(hash) % morandiColors.length;
  return morandiColors[colorIndex];
};

interface TimelineCanvasProps {
  width: number;
  height: number;
  startYear: number;
  endYear: number;
  civilizations: Civilization[];
  polities: Polity[];
  persons: Person[];
  onItemHover?: (item: { type: string; data: any } | null) => void;
  onItemClick?: (item: { type: string; data: any } | null) => void; // 点击元素时的回调
  matchedPerson?: Person | null;
  expandedPolityId?: string | null; // 展开的朝代ID
  childPolities?: Polity[]; // 子朝代列表
  onPolityClick?: (polity: Polity) => void; // 点击朝代时的回调（用于展开）
  containerHeight?: number; // 容器总高度，用于计算压缩比例
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  width,
  height,
  startYear,
  endYear,
  civilizations,
  polities,
  persons,
  onItemHover,
  onItemClick,
  matchedPerson,
  expandedPolityId = null,
  childPolities = [],
  onPolityClick,
  containerHeight
}) => {
  const yearSpan = endYear - startYear;

  // 基础尺寸常量
  const BASE_POLITY_TRACK_SPACING = 80; // 政权轨道间距（进一步增加，充分利用空间）
  const BASE_POLITY_HEIGHT = 72; // 政权条带高度（进一步增加，充分利用空间）
  const BASE_BOUNDARY_PADDING = 12; // 上下边界（减小留白）
  const POLITY_LAYER_TOP = 60; // 政权层容器起始位置（进一步减小留白）
  const TIME_SCALE_HEIGHT = 40; // 时间刻度区域高度（从64减小到40）

  // 计算压缩比例：根据容器高度动态调整
  const scaleFactor = useMemo(() => {
    if (!containerHeight) return 1;
    
    // 先按sort排序文明
    const sortedCivilizations = [...civilizations].sort((a, b) => {
      const sortA = a.sort ?? 999999;
      const sortB = b.sort ?? 999999;
      return sortA - sortB;
    });
    
    // 计算所需的总高度（未压缩）
    let totalRequiredHeight = POLITY_LAYER_TOP;
    sortedCivilizations.forEach(civ => {
      const civPolities = polities.filter(p => p.civilizationId === civ.id);
      if (civPolities.length > 0) {
        const polityItems = civPolities.map(p => ({
          id: p.id,
          start: p.startYear,
          end: p.endYear
        }));
        const trackResult = assignTracks(polityItems);
        const trackCount = trackResult.trackCount || 1;
        totalRequiredHeight += trackCount * BASE_POLITY_TRACK_SPACING + BASE_BOUNDARY_PADDING;
      } else {
        totalRequiredHeight += BASE_POLITY_HEIGHT + BASE_BOUNDARY_PADDING;
      }
    });
    totalRequiredHeight += 16; // 底部边距（减小留白）
    
    // 可用高度 = 容器高度 - 顶部工具栏（包含快速定位栏）- 底部栏 - 时间刻度
    // 充分利用所有可用空间，减少不必要的留白
    const availableHeight = containerHeight - 136 - 48 - TIME_SCALE_HEIGHT; // 136是工具栏（包含快速定位栏），48是底部栏，TIME_SCALE_HEIGHT是时间刻度
    if (totalRequiredHeight > availableHeight && availableHeight > 0) {
      const factor = availableHeight / totalRequiredHeight;
      // 确保最小缩放比例，避免太小
      return Math.max(0.3, Math.min(1, factor));
    }
    return 1;
  }, [civilizations, polities, containerHeight]);

  // 应用压缩比例后的尺寸
  const POLITY_TRACK_SPACING = BASE_POLITY_TRACK_SPACING * scaleFactor;
  const POLITY_HEIGHT = BASE_POLITY_HEIGHT * scaleFactor;
  const BOUNDARY_PADDING = BASE_BOUNDARY_PADDING * scaleFactor;

  // 为每个文明分配独立的轨道（文明之间不重叠）
  // 同时为每个文明内部的政权分配轨道（政权之间可以重叠）
  const { civilizationTracks, polityTracks, civilizationHeights } = useMemo(() => {
    // 先按sort排序文明
    const sortedCivilizations = [...civilizations].sort((a, b) => {
      const sortA = a.sort ?? 999999;
      const sortB = b.sort ?? 999999;
      return sortA - sortB;
    });
    
    // 1. 为文明分配轨道（文明之间不重叠）
    const civItems = sortedCivilizations.map(civ => {
      const civPolities = polities.filter(p => p.civilizationId === civ.id);
      if (civPolities.length === 0) {
        return { id: civ.id, start: civ.startYear, end: civ.endYear || civ.startYear };
      }
      const minYear = Math.min(...civPolities.map(p => p.startYear));
      const maxYear = Math.max(...civPolities.map(p => p.endYear));
      return { id: civ.id, start: minYear, end: maxYear };
    });
    const civTrackResult = assignTracks(civItems);
    
    // 2. 为每个文明内部的政权分配轨道（每个文明独立分配）
    const polityAssignments: { [key: string]: number } = {};
    const civHeights: { [civId: string]: number } = {};
    
    sortedCivilizations.forEach(civ => {
      const civPolities = polities.filter(p => p.civilizationId === civ.id);
      if (civPolities.length === 0) {
        civHeights[civ.id] = (BASE_POLITY_HEIGHT + BASE_BOUNDARY_PADDING) * scaleFactor; // 默认高度（应用压缩）
        return;
      }
      
      // 为这个文明内部的政权分配轨道
      const polityItems = civPolities.map(p => ({
        id: p.id,
        start: p.startYear,
        end: p.endYear
      }));
      const polityTrackResult = assignTracks(polityItems);
      
      // 保存这个文明内部政权的轨道分配
      Object.assign(polityAssignments, polityTrackResult.assignments);
      
      // 计算这个文明的高度：根据其内部政权占用的轨道数（已应用压缩比例）
      const civTrackCount = polityTrackResult.trackCount || 1;
      civHeights[civ.id] = civTrackCount * POLITY_TRACK_SPACING + BOUNDARY_PADDING;
    });
    
    return {
      civilizationTracks: civTrackResult,
      polityTracks: { assignments: polityAssignments, trackCount: Math.max(...Object.values(polityAssignments).map(v => v || 0), 0) + 1 },
      civilizationHeights: civHeights
    };
  }, [civilizations, polities, POLITY_TRACK_SPACING, BOUNDARY_PADDING, scaleFactor]);
  
  // 按sort排序的文明列表（用于渲染）
  const sortedCivilizations = useMemo(() => {
    return [...civilizations].sort((a, b) => {
      const sortA = a.sort ?? 999999;
      const sortB = b.sort ?? 999999;
      return sortA - sortB;
    });
  }, [civilizations]);

  // 分配人物轨道
  const personItems = persons.map(p => ({
    id: p.id,
    start: p.birthYear,
    end: p.deathYear
  }));
  const personTracks = assignTracks(personItems);

  // 计算每个文明的垂直位置（累积前面所有文明的高度）
  const civilizationPositions = useMemo(() => {
    const positions: { [civId: string]: { top: number; height: number } } = {};
    let currentTop = POLITY_LAYER_TOP;
    
    // 按sort排序的文明列表（已经按sort排序）
    sortedCivilizations.forEach(civ => {
      const height = civilizationHeights[civ.id] || 64;
      positions[civ.id] = { top: currentTop, height };
      currentTop += height;
    });
    
    return positions;
  }, [sortedCivilizations, civilizationTracks, civilizationHeights]);

  // 计算所需的最小高度，确保所有条带都能显示（已应用压缩比例）
  const minRequiredHeight = useMemo(() => {
    if (sortedCivilizations.length === 0) return height;
    let totalHeight = POLITY_LAYER_TOP;
    sortedCivilizations.forEach(civ => {
      totalHeight += civilizationHeights[civ.id] || (BASE_POLITY_HEIGHT + BASE_BOUNDARY_PADDING) * scaleFactor;
    });
    // 添加一些底部边距（减小留白）
    totalHeight += 16 * scaleFactor;
    return Math.max(height, totalHeight);
  }, [sortedCivilizations, civilizationHeights, height, scaleFactor]);

  // 不再需要计算政权的人物轨道范围，因为政权层高度固定

  // 获取时间刻度
  const timeMarks = useMemo(() => {
    return generateTimeMarks(startYear, endYear, yearSpan);
  }, [startYear, endYear, yearSpan]);

  return (
    <div className="relative w-full" style={{ width, minHeight: minRequiredHeight }}>
      {/* 文明背景层 - 永久展示，透明度10%，Z轴最底层 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {sortedCivilizations.map(civ => {
          const position = civilizationPositions[civ.id];
          if (!position) return null;
          
          // 计算文明层的时间范围（包含所有政权）
          const civPolities = polities.filter(p => p.civilizationId === civ.id);
          if (civPolities.length === 0) return null;
          
          const minYear = Math.min(...civPolities.map(p => p.startYear));
          const maxYear = Math.max(...civPolities.map(p => p.endYear));
          const x1 = Math.max(0, yearToPixel(minYear, startYear, endYear, width));
          const x2 = Math.min(width, yearToPixel(maxYear, startYear, endYear, width));
          if (x2 <= 0 || x1 >= width) return null;
          
          // 使用计算好的位置和高度
          const civTop = position.top;
          const civHeight = position.height;
          
          // 为每个文明分配独立的颜色，设置透明度为 10%
          const civColor = getCivilizationColor(civ.id);
          const bgColor = hexToRgba(civColor, 0.1);
          
          return (
            <div
              key={civ.id}
              className="absolute overflow-hidden cursor-pointer hover:bg-opacity-20"
              style={{
                left: `${x1}px`,
                width: `${x2 - x1}px`,
                top: `${civTop}px`,
                height: `${civHeight}px`,
                background: bgColor,
                zIndex: 0,
                willChange: 'transform, left, width'
              }}
              onMouseEnter={() => onItemHover?.({ type: 'civilization', data: civ })}
              onMouseLeave={() => {
                // 不清除选中状态，保持显示
              }}
              onClick={() => onItemClick?.({ type: 'civilization', data: civ })}
            >
            </div>
          );
        })}
      </div>

      {/* 时间刻度 - Z轴最上层 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-50 to-transparent border-b border-slate-200" style={{ height: `${TIME_SCALE_HEIGHT}px`, zIndex: 30 }}>
        <svg className="w-full h-full" style={{ height: `${TIME_SCALE_HEIGHT}px` }}>
          {timeMarks.map((year, i) => {
            const x = yearToPixel(year, startYear, endYear, width);
            if (x < 0 || x > width) return null;
            return (
              <g key={i}>
                <line x1={x} y1={TIME_SCALE_HEIGHT - 8} x2={x} y2={TIME_SCALE_HEIGHT - 2} stroke="#94a3b8" strokeWidth="1" />
                <text x={x} y={TIME_SCALE_HEIGHT - 16} textAnchor="middle" className="text-xs fill-slate-600 font-mono">
                  {formatTime(year, yearSpan)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 政权层 - 永久展示，透明度70%，Z轴在文明层之上 */}
      <div className="absolute left-0 right-0" style={{ zIndex: 10 }}>
        {polities.map((polity) => {
          // 检查政权是否与时间窗口有重叠
          if (!polity || polity.endYear < startYear || polity.startYear > endYear) {
            // 完全在时间窗口外，不显示
            return null;
          }
          
          // 计算可见部分的坐标
          const x1 = yearToPixel(Math.max(polity.startYear, startYear), startYear, endYear, width);
          const x2 = yearToPixel(Math.min(polity.endYear, endYear), startYear, endYear, width);
          const widthPx = Math.max(1, x2 - x1); // 确保最小宽度为1px
          
          const trackIndex = polityTracks.assignments[polity.id];
          
          // 如果 trackIndex 未定义，跳过渲染
          if (trackIndex === undefined || trackIndex === null) {
            return null;
          }
          
          // 获取政权所属文明的位置
          const civPosition = civilizationPositions[polity.civilizationId];
          if (!civPosition) {
            return null;
          }
          
          // 政权层的基础高度（已应用压缩比例）
          const POLITY_BASE_HEIGHT = POLITY_HEIGHT; // 政权基础高度
          const isExpanded = expandedPolityId === polity.id;
          const hasChildren = childPolities.length > 0 && isExpanded;
          
          // 如果展开，增加高度以容纳子朝代（列表形式，也应用压缩比例）
          const polityHeight = hasChildren 
            ? POLITY_BASE_HEIGHT + childPolities.length * (36 * scaleFactor) + (16 * scaleFactor) // 子朝代列表高度：每个32px + 间距4px
            : POLITY_BASE_HEIGHT;
          
          // 计算政权相对于所属文明的垂直位置（已应用压缩比例）
          // 政权位置 = 文明顶部 + 边界内边距 + 轨道偏移
          const polityTop = civPosition.top + BOUNDARY_PADDING + trackIndex * POLITY_TRACK_SPACING;
          
          // 使用莫兰迪色系自动配色
          const morandiColor = getMorandiColor(polity.id);
          const bgColor = hexToRgba(morandiColor, 0.7);
          
          // 检查是否应该显示红点标记（匹配的人物属于这个政权）
          const shouldShowMarker = matchedPerson && matchedPerson.polityId === polity.id;
          // 计算红点的位置（在人物出生年的位置，相对于整个时间轴）
          const markerX = matchedPerson && shouldShowMarker && matchedPerson.birthYear
            ? yearToPixel(matchedPerson.birthYear, startYear, endYear, width)
            : null;

          // 判断是否可以展开（有子集）
          const canExpand = polity.hasChild === 1;
          
          return (
            <div
              key={polity.id}
              className={`absolute rounded-lg shadow-md ${
                canExpand ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-shadow' : 'cursor-default'
              }`}
              style={{
                left: `${x1}px`,
                width: `${widthPx}px`,
                top: `${polityTop}px`,
                height: `${polityHeight}px`,
                backgroundColor: bgColor,
                border: '2px solid rgba(255,255,255,0.5)',
                zIndex: 10,
                willChange: 'transform, left, width'
              }}
              onMouseEnter={() => onItemHover?.({ type: 'polity', data: polity })}
              onMouseLeave={() => onItemHover?.(null)}
              onClick={(e) => {
                // 点击政权时，触发点击回调（不联动快速定位栏）
                onItemClick?.({ type: 'polity', data: polity });
                // 只有有子集的朝代才能展开
                if (canExpand) {
                  e.stopPropagation();
                  onPolityClick?.(polity);
                }
              }}
            >
              {/* 主朝代名称 - 去除展开按钮，点击整个块即可展开 */}
              <div className="flex items-center justify-center h-full px-3 overflow-hidden">
                <span 
                  className="text-white font-bold drop-shadow-lg text-center"
                  style={{
                    fontSize: `${Math.max(14, Math.min(20, POLITY_HEIGHT * 0.32))}px`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    display: 'block',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  {polity.name}
                </span>
              </div>
              
              {/* 展开时显示子朝代 - 列表形式，按 sort 排序 */}
              {hasChildren && (
                <div className="px-2 pb-2">
                  <div className="space-y-1">
                    {childPolities
                      .sort((a, b) => (a.sort || 0) - (b.sort || 0)) // 按 sort 排序
                      .map((childPolity) => {
                        return (
                          <div
                            key={childPolity.id}
                            className="rounded shadow-sm cursor-pointer hover:shadow-md transition-all"
                            style={{
                              height: '32px',
                              backgroundColor: hexToRgba(getMorandiColor(childPolity.id), 0.6),
                              border: '1px solid rgba(255,255,255,0.4)',
                              zIndex: 11
                            }}
                            onMouseEnter={() => onItemHover?.({ type: 'polity', data: childPolity })}
                            onMouseLeave={() => onItemHover?.(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onItemClick?.({ type: 'polity', data: childPolity });
                            }}
                          >
                            <div className="flex items-center justify-between h-full px-3 overflow-hidden">
                              <span 
                                className="text-white font-medium drop-shadow-md"
                                style={{
                                  fontSize: `${Math.max(11, Math.min(14, 32 * scaleFactor * 0.35))}px`,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flex: '1',
                                  minWidth: 0
                                }}
                              >
                                {childPolity.name}
                              </span>
                              <span 
                                className="text-white opacity-75 flex-shrink-0 ml-2"
                                style={{
                                  fontSize: `${Math.max(10, Math.min(13, 32 * scaleFactor * 0.3))}px`,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {childPolity.startYear}-{childPolity.endYear}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {/* 红点标记 - 显示在匹配人物的出生年位置 */}
              {shouldShowMarker && markerX !== null && markerX >= 0 && markerX <= width && markerX >= x1 && markerX <= x1 + widthPx && (
                <div
                  className="absolute top-1/2 animate-pulse"
                  style={{
                    left: `${markerX - x1}px`,
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
                    zIndex: 15,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={matchedPerson?.name}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 人物层 - 仅搜索时显示，Z轴在政权层之上 */}
      {persons.length > 0 && (
        <div 
          className="absolute left-0 right-0" 
          style={{ 
            top: `${(() => {
              // 计算最后一个文明的底部位置
              const sortedCivs = [...civilizations].sort((a, b) => {
                const trackA = civilizationTracks.assignments[a.id] || 0;
                const trackB = civilizationTracks.assignments[b.id] || 0;
                return trackA - trackB;
              });
              if (sortedCivs.length === 0) return POLITY_LAYER_TOP;
              const lastCiv = sortedCivs[sortedCivs.length - 1];
              const lastCivPosition = civilizationPositions[lastCiv.id];
              return lastCivPosition ? lastCivPosition.top + lastCivPosition.height + 32 : POLITY_LAYER_TOP;
            })()}px`,
            zIndex: 20
          }}
        >
          {persons.map((person) => {
            // 计算人物在时间轴上的位置（使用出生年）
            const birthX = yearToPixel(Math.max(person.birthYear, startYear), startYear, endYear, width);
            const deathX = yearToPixel(Math.min(person.deathYear, endYear), startYear, endYear, width);
            
            // 检查人物是否在可见范围内
            if (birthX < 0 && deathX < 0) return null;
            if (birthX > width && deathX > width) return null;
            if (person.birthYear > endYear || person.deathYear < startYear) return null;
            
            const trackIndex = personTracks.assignments[person.id];
            
            // 根据姓名长度计算条带宽度（每个字符约8px，加上padding）
            const nameWidth = person.name.length * 8 + 24; // 8px per char + 24px padding
            const minWidth = 60; // 最小宽度（仅显示姓名）
            const barWidth = Math.max(minWidth, Math.min(150, nameWidth));
            
            // 展开后的宽度：从出生年到死亡年的完整时间跨度
            const expandedWidth = Math.max(barWidth, deathX - birthX);
            
            // 条带的起始位置：从出生年开始
            const barLeft = birthX;
            
            return (
              <div
                key={person.id}
                className="absolute h-9 rounded-full cursor-pointer hover:shadow-lg transition-all duration-300 ease-in-out group person-bar opacity-100 scale-100"
                style={{
                  left: `${barLeft}px`, // 从出生年位置开始
                  width: `${barWidth}px`,
                  top: `${trackIndex * 40}px`,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  border: '2px solid white',
                  transition: 'width 0.3s ease-in-out, box-shadow 0.3s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.width = `${expandedWidth}px`;
                  onItemHover?.({ type: 'person', data: person });
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.width = `${barWidth}px`;
                  onItemHover?.(null);
                }}
                onClick={() => onItemClick?.({ type: 'person', data: person })}
              >
                <div className="flex items-center h-full px-3 w-full overflow-hidden">
                  <span className="text-white text-xs font-semibold whitespace-nowrap flex-shrink-0">
                    {person.name}
                  </span>
                  {/* 悬停时显示的时间跨度 */}
                  <span className="text-white text-xs font-medium whitespace-nowrap ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0">
                    ({person.birthYear}-{person.deathYear})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

