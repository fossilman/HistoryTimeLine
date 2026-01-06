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

interface TimelineCanvasProps {
  width: number;
  height: number;
  startYear: number;
  endYear: number;
  civilizations: Civilization[];
  polities: Polity[];
  persons: Person[];
  showPersons?: boolean;
  onItemHover?: (item: { type: string; data: any } | null) => void;
  matchedPerson?: Person | null;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  width,
  height,
  startYear,
  endYear,
  civilizations,
  polities,
  persons,
  showPersons = true,
  onItemHover,
  matchedPerson
}) => {
  const yearSpan = endYear - startYear;

  // 分配政权轨道
  const polityItems = polities.map(p => ({
    id: p.id,
    start: p.startYear,
    end: p.endYear
  }));
  const polityTracks = assignTracks(polityItems);

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

  // 计算每个政权包含的所有人物占用的轨道范围（用于计算政权层高度）
  const polityTrackRanges = useMemo(() => {
    const ranges: { [polityId: string]: { minTrack: number; maxTrack: number } } = {};
    polities.forEach(polity => {
      const polityPersons = persons.filter(p => p.polityId === polity.id);
      
      const trackIndices: number[] = [];
      polityPersons.forEach(p => {
        const trackIdx = personTracks.assignments[p.id];
        if (trackIdx !== undefined) {
          trackIndices.push(trackIdx);
        }
      });
      
      if (trackIndices.length === 0) {
        // 没有相关人物，使用默认高度（单轨道）
        ranges[polity.id] = { minTrack: 0, maxTrack: 0 };
      } else {
        const minTrack = Math.min(...trackIndices);
        const maxTrack = Math.max(...trackIndices);
        ranges[polity.id] = { minTrack, maxTrack };
      }
    });
    return ranges;
  }, [polities, persons, personTracks]);

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
          
          // 计算轨道范围，确保包含所有政权
          const trackCount = Math.max(1, trackRange.maxTrack - trackRange.minTrack + 1);
          
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
              className="absolute transition-all duration-300 overflow-hidden"
              style={{
                left: `${x1}px`,
                width: `${x2 - x1}px`,
                top: `${civTop}px`,
                height: `${civHeight}px`,
                background: bgColor,
                zIndex: 0
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
          if (polity.endYear < startYear || polity.startYear > endYear) {
            // 完全在时间窗口外，不显示
            return null;
          }
          
          const trackRange = polityTrackRanges[polity.id];
          if (!trackRange) return null;
          
          // 计算可见部分的坐标
          const x1 = yearToPixel(Math.max(polity.startYear, startYear), startYear, endYear, width);
          const x2 = yearToPixel(Math.min(polity.endYear, endYear), startYear, endYear, width);
          const widthPx = Math.max(1, x2 - x1); // 确保最小宽度为1px
          
          const trackIndex = polityTracks.assignments[polity.id];
          
          // 计算政权层的高度：根据其相关人物和事件的轨道范围
          const POLITY_BASE_HEIGHT = 56; // 政权基础高度 h-14
          const POLITY_TRACK_SPACING = 64; // 政权轨道间距
          const PERSON_TRACK_SPACING = 40; // 人物轨道间距
          const BOUNDARY_PADDING = 8; // 上下边界
          
          // 人物和事件层的起始位置
          const personEventLayerTop = 32 + polityTracks.trackCount * POLITY_TRACK_SPACING + 32;
          
          // 计算政权层的高度
          let polityHeight = POLITY_BASE_HEIGHT;
          const trackCount = trackRange.maxTrack - trackRange.minTrack + 1;
          if (trackCount > 0 && yearSpan <= 300) {
            // 有相关人物或事件，且人物/事件层可见时，延伸到人物/事件层
            const polityTop = 32 + trackIndex * POLITY_TRACK_SPACING;
            const personEventTop = personEventLayerTop + trackRange.minTrack * PERSON_TRACK_SPACING;
            const personEventBottom = personEventLayerTop + (trackRange.maxTrack + 1) * PERSON_TRACK_SPACING;
            // 政权层应该从当前位置延伸到人物/事件层的底部
            const calculatedHeight = personEventBottom + BOUNDARY_PADDING - polityTop;
            polityHeight = Math.max(POLITY_BASE_HEIGHT, calculatedHeight);
          }
          
          // 将 HEX 颜色转换为 rgba，设置透明度为 70%
          const bgColor = hexToRgba(polity.color, 0.7);
          
          // 检查是否应该显示红点标记（匹配的人物属于这个政权）
          const shouldShowMarker = matchedPerson && matchedPerson.polityId === polity.id;
          // 计算红点的位置（在人物出生年的位置，相对于整个时间轴）
          const markerX = matchedPerson && shouldShowMarker && matchedPerson.birthYear
            ? yearToPixel(matchedPerson.birthYear, startYear, endYear, width)
            : null;

          return (
            <div
              key={polity.id}
              className="absolute rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all hover:scale-105"
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
            >
              <div className="flex items-center justify-center h-full px-3">
                <span className="text-white font-bold text-sm drop-shadow-lg">
                  {polity.name}
                </span>
              </div>
              
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

      {/* 人物层 - 视窗小于等于300年时显示，支持渐入渐出，Z轴在政权层之上 */}
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
          
          // 根据视窗大小和复选框状态决定是否显示
          const shouldShow = yearSpan <= 300 && showPersons;
          
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
              className={`absolute h-9 rounded-full cursor-pointer hover:shadow-lg transition-all duration-300 ease-in-out group person-bar ${
                shouldShow ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              }`}
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

    </div>
  );
};

