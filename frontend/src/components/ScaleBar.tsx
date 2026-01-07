import React from 'react';
import { getTimeUnit, formatTimeRange } from '../utils/dateUtils';
import { Polity, Civilization, Person } from '../types';
import { getMorandiColor } from './TimelineCanvas';

interface ScaleBarProps {
  startYear: number;
  endYear: number;
  viewportSpan: number;
  polityTrackCount?: number;
  personTrackCount?: number;
  civilizations?: Civilization[]; // 所有文明列表（全量，不受时间范围限制）
  selectedCivilization?: Civilization | null; // 选中的文明
  selectedPolity?: Polity | null; // 选中的朝代
  level0Polities?: Polity[]; // Level0朝代列表（用于快速定位，已废弃，改用allLevel0Polities）
  allLevel0Polities?: Polity[]; // 所有Level0政权列表（全量，不受时间范围限制）
  onCivilizationClick?: (civilization: Civilization) => void; // 点击文明时的回调
  onPolityClick?: (polity: Polity) => void; // 点击朝代时的回调
  displayOnly?: boolean; // 是否仅显示，不包含快速定位栏
  detailItem?: { type: string; data: Polity | Person } | null; // 详情信息（用于底部栏显示）
}

export const ScaleBar: React.FC<ScaleBarProps> = ({
  startYear,
  endYear,
  viewportSpan,
  polityTrackCount = 0,
  personTrackCount = 0,
  civilizations = [],
  selectedCivilization = null,
  selectedPolity = null,
  level0Polities = [],
  allLevel0Polities = [],
  onCivilizationClick,
  onPolityClick,
  displayOnly = false,
  detailItem = null
}) => {
  const scaleInfo = getTimeUnit(viewportSpan);
  const timeRange = formatTimeRange(startYear, endYear, viewportSpan);
  
  // 格式化年份显示
  const formatYear = (year: number) => {
    return year < 0 ? `前${Math.abs(year)}` : year;
  };
  
  // 格式化视窗跨度显示
  // 视窗跨度仅当小于1年时，使用月为单位描述，最小单位为1个月，不要小数
  const formatSpan = () => {
    if (viewportSpan < 1) {
      // 小于1年时，使用月为单位，最小单位为1个月，不要小数
      const months = viewportSpan * 12;
      return `${Math.round(months)} 月`;
    } else {
      // 大于等于1年时，使用年为单位
      const rounded = Math.round(viewportSpan * 100) / 100;
      // 如果是整数，不显示小数
      if (rounded === Math.round(rounded)) {
        return `${Math.round(rounded)} 年`;
      }
      return `${rounded} 年`;
    }
  };

  // 根据选中的文明过滤政权，实现联动效果
  // 如果没有选中文明，则不显示政权
  const filteredPolities = selectedCivilization
    ? allLevel0Polities.filter(polity => polity.civilizationId === selectedCivilization.id)
    : [];

  return (
    <div className={`bg-white shadow-sm ${displayOnly ? 'border-t border-slate-200' : 'border-b border-slate-200'}`} style={{ height: displayOnly ? '48px' : 'auto' }}>
      <div className="max-w-full mx-auto px-6" style={{ height: displayOnly ? '48px' : 'auto' }}>
        {/* 比例尺和范围 - 仅在仅显示模式下显示 */}
        {displayOnly && (
          <div className="flex items-center justify-between h-full" style={{ height: '48px' }}>
            <div className="flex items-center gap-6 text-sm text-slate-600 whitespace-nowrap">
              <span>
                <span className="font-medium">比例尺:</span>
                <span className="ml-2 text-amber-700 font-mono font-semibold">
                  {scaleInfo.display}
                </span>
              </span>
              <span>
                <span className="font-medium">范围:</span>
                <span className="ml-2 font-mono">
                  {timeRange}
                </span>
              </span>
              <span className="text-xs text-slate-500">(共 {formatSpan()})</span>
            </div>
            
            {/* 详情信息 - 显示在右下角，单行显示，无图标 */}
            {detailItem && (
              <div className="text-sm text-slate-600 whitespace-nowrap">
                {detailItem.type === 'polity' && (
                  <span>
                    <span className="font-semibold text-slate-800">{(detailItem.data as Polity).name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {formatYear((detailItem.data as Polity).startYear)} - {formatYear((detailItem.data as Polity).endYear)}
                    </span>
                  </span>
                )}
                
                {detailItem.type === 'person' && (
                  <span>
                    <span className="font-semibold text-slate-800">{(detailItem.data as Person).name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {formatYear((detailItem.data as Person).birthYear)} - {formatYear((detailItem.data as Person).deathYear)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 快速定位栏 - 两层结构（仅在非仅显示模式下显示） */}
        {!displayOnly && (
          <div className="space-y-2">
            {/* 上层：文明层 */}
            {civilizations.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">文明:</span>
                {[...civilizations].sort((a, b) => {
                  const sortA = a.sort ?? 999999;
                  const sortB = b.sort ?? 999999;
                  return sortA - sortB;
                }).map((civ) => {
                  const isSelected = selectedCivilization?.id === civ.id;
                  return (
                    <button
                      key={civ.id}
                      onClick={() => onCivilizationClick?.(civ)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all hover:scale-105 ${
                        isSelected
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                      title={`${civ.name} (${civ.startYear}-${civ.endYear || '至今'})`}
                    >
                      {civ.name}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* 下层：政权层 - 仅显示选中文明对应的Level0政权 */}
            {filteredPolities.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">政权:</span>
                {filteredPolities.map((polity) => {
                  const polityColor = getMorandiColor(polity.id);
                  const isSelected = selectedPolity?.id === polity.id;
                  return (
                    <button
                      key={polity.id}
                      onClick={() => onPolityClick?.(polity)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 ${
                        isSelected
                          ? 'text-white shadow-md'
                          : 'text-white hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: isSelected ? polityColor : polityColor,
                        opacity: isSelected ? 1 : 0.7
                      }}
                      title={`${polity.name} (${polity.startYear}-${polity.endYear})`}
                    >
                      {polity.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

