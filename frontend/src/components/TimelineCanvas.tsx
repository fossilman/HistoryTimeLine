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
const getMorandiColor = (polityId: string): string => {
  // 将ID转换为数字，用于选择颜色
  const idNum = parseInt(polityId) || 0;
  const colorIndex = idNum % morandiColors.length;
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
  matchedPerson?: Person | null;
  expandedPolityId?: string | null; // 展开的朝代ID
  childPolities?: Polity[]; // 子朝代列表
  onPolityClick?: (polity: Polity) => void; // 点击朝代时的回调
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
  matchedPerson,
  expandedPolityId = null,
  childPolities = [],
  onPolityClick
}) => {
  const yearSpan = endYear - startYear;

  // 分配政权轨道（只分配Level0朝代，子朝代不参与轨道分配）
  // Level0 朝代可以相互覆盖，所以都使用轨道 0
  const polityItems = polities.map(p => ({
    id: p.id,
    start: p.startYear,
    end: p.endYear
  }));
  
  // Level0 朝代可以相互覆盖，所以都分配到轨道 0
  const polityTracks = useMemo(() => {
    const assignments: { [key: string]: number } = {};
    polities.forEach(p => {
      assignments[p.id] = 0; // 所有 Level0 朝代都使用轨道 0，允许相互覆盖
    });
    return {
      assignments,
      trackCount: 1 // 只有一个轨道，所有朝代都在这个轨道上
    };
  }, [polities]);

  // 分配人物轨道
  const personItems = persons.map(p => ({
    id: p.id,
    start: p.birthYear,
    end: p.deathYear
  }));
  const personTracks = assignTracks(personItems);

  // 计算每个文明包含的所有政权占用的轨道范围（用于计算文明层高度）
  const civilizationTrackRanges = useMemo(() => {
    const ranges: { [civId: string]: { minTrack: number; maxTrack: number } } = {};
    civilizations.forEach(civ => {
      const civPolities = polities.filter(p => p.civilizationId === civ.id);
      if (civPolities.length === 0) {
        ranges[civ.id] = { minTrack: 0, maxTrack: 0 };
      } else {
        // 获取所有属于该文明的政权的轨道索引
        const trackIndices = civPolities
          .map(p => polityTracks.assignments[p.id])
          .filter((idx): idx is number => idx !== undefined && idx !== null);
        
        if (trackIndices.length === 0) {
          // 如果没有找到轨道索引，可能是这些政权不在当前时间范围内
          // 但仍然需要为文明层设置一个默认范围
          ranges[civ.id] = { minTrack: 0, maxTrack: 0 };
        } else {
          // 确保包含所有政权的轨道范围
          const minTrack = Math.min(...trackIndices);
          const maxTrack = Math.max(...trackIndices);
          ranges[civ.id] = { minTrack, maxTrack };
        }
      }
    });
    return ranges;
  }, [civilizations, polities, polityTracks]);

  // 不再需要计算政权的人物轨道范围，因为政权层高度固定

  // 获取时间刻度
  const timeMarks = useMemo(() => {
    return generateTimeMarks(startYear, endYear, yearSpan);
  }, [startYear, endYear, yearSpan]);

  return (
    <div className="relative w-full h-full" style={{ width, height }}>
      {/* 文明背景层 - 永久展示，透明度10%，Z轴最底层 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {civilizations.map(civ => {
          const trackRange = civilizationTrackRanges[civ.id];
          if (!trackRange) return null;
          
          // 计算文明层的时间范围（包含所有政权）
          const civPolities = polities.filter(p => p.civilizationId === civ.id);
          if (civPolities.length === 0) return null;
          
          const minYear = Math.min(...civPolities.map(p => p.startYear));
          const maxYear = Math.max(...civPolities.map(p => p.endYear));
          const x1 = Math.max(0, yearToPixel(minYear, startYear, endYear, width));
          const x2 = Math.min(width, yearToPixel(maxYear, startYear, endYear, width));
          if (x2 <= 0 || x1 >= width) return null;
          
          // 计算文明层的高度：根据政权轨道范围
          // 政权层容器从 top-32 (128px) 开始，每个政权条带高度为 56px (h-14)，轨道间距为 64px
          const POLITY_LAYER_TOP = 128; // 政权层容器起始位置（top-32 = 8rem = 128px）
          const POLITY_TRACK_SPACING = 64; // 政权轨道间距
          const POLITY_HEIGHT = 56; // 政权条带高度 h-14
          const BOUNDARY_PADDING = 8; // 上下边界
          
          // 文明层的 top：从第一个政权的顶部开始，减去边界
          const civTop = POLITY_LAYER_TOP + trackRange.minTrack * POLITY_TRACK_SPACING - BOUNDARY_PADDING;
          
          // 文明层的高度：从第一个政权到最后一个政权的底部，加上边界
          // 最后一个政权的底部 = top + height = POLITY_LAYER_TOP + maxTrack * POLITY_TRACK_SPACING + POLITY_HEIGHT
          const lastPolityTop = POLITY_LAYER_TOP + trackRange.maxTrack * POLITY_TRACK_SPACING;
          const lastPolityBottom = lastPolityTop + POLITY_HEIGHT;
          const civHeight = lastPolityBottom + BOUNDARY_PADDING - civTop;
          
          // 使用默认颜色，设置透明度为 10%
          const DEFAULT_CIV_COLOR = '#94a3b8'; // 默认灰色
          const bgColor = hexToRgba(DEFAULT_CIV_COLOR, 0.1);
          
          return (
            <div
              key={civ.id}
              className="absolute transition-all duration-300 overflow-hidden cursor-pointer hover:bg-opacity-20"
              style={{
                left: `${x1}px`,
                width: `${x2 - x1}px`,
                top: `${civTop}px`,
                height: `${civHeight}px`,
                background: bgColor,
                zIndex: 0
              }}
              onMouseEnter={() => onItemHover?.({ type: 'civilization', data: civ })}
              onMouseLeave={() => {
                // 不清除选中状态，保持显示
              }}
            >
              {/* 文明层名称 - 水印方式显示，永久展示 */}
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: 'rotate(-45deg)',
                  opacity: 0.15,
                  fontSize: `${Math.min(48, Math.min(x2 - x1, civHeight) * 0.3)}px`,
                  fontWeight: 'bold',
                  color: DEFAULT_CIV_COLOR,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                  userSelect: 'none',
                  overflow: 'hidden',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              >
                {civ.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* 时间刻度 - Z轴最上层 */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-50 to-transparent border-b border-slate-200" style={{ zIndex: 30 }}>
        <svg className="w-full h-full">
          {timeMarks.map((year, i) => {
            const x = yearToPixel(year, startYear, endYear, width);
            if (x < 0 || x > width) return null;
            return (
              <g key={i}>
                <line x1={x} y1="40" x2={x} y2="50" stroke="#94a3b8" strokeWidth="1" />
                <text x={x} y="30" textAnchor="middle" className="text-xs fill-slate-600 font-mono">
                  {formatTime(year, yearSpan)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 政权层 - 永久展示，透明度70%，Z轴在文明层之上 */}
      <div className="absolute left-0 right-0 top-32" style={{ zIndex: 10 }}>
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
          
          // 政权层的基础高度
          const POLITY_BASE_HEIGHT = 56; // 政权基础高度 h-14
          const isExpanded = expandedPolityId === polity.id;
          const hasChildren = childPolities.length > 0 && isExpanded;
          
          // 如果展开，增加高度以容纳子朝代（列表形式）
          const polityHeight = hasChildren 
            ? POLITY_BASE_HEIGHT + childPolities.length * 36 + 16 // 子朝代列表高度：每个32px + 间距4px
            : POLITY_BASE_HEIGHT;
          
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
              className={`absolute rounded-lg shadow-md transition-all ${
                canExpand ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : 'cursor-default'
              }`}
              style={{
                left: `${x1}px`,
                width: `${widthPx}px`,
                top: `${trackIndex * 64}px`,
                height: `${polityHeight}px`,
                backgroundColor: bgColor,
                border: '2px solid rgba(255,255,255,0.5)',
                zIndex: 10
              }}
              onMouseEnter={() => onItemHover?.({ type: 'polity', data: polity })}
              onMouseLeave={() => onItemHover?.(null)}
              onClick={() => {
                // 只有有子集的朝代才能展开
                if (canExpand) {
                  onPolityClick?.(polity);
                }
              }}
            >
              {/* 主朝代名称 - 去除展开按钮，点击整个块即可展开 */}
              <div className="flex items-center justify-center h-14 px-3">
                <span className="text-white font-bold text-sm drop-shadow-lg">
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
                              onItemHover?.({ type: 'polity', data: childPolity });
                            }}
                          >
                            <div className="flex items-center justify-between h-full px-3">
                              <span className="text-white font-medium text-xs drop-shadow-md">
                                {childPolity.name}
                              </span>
                              <span className="text-white text-xs opacity-75">
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
            top: `${32 + polityTracks.trackCount * 64 + 32}px`,
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

