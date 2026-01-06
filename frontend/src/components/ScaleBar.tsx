import React from 'react';
import { getTimeUnit, formatTimeRange } from '../utils/dateUtils';
import { Polity, Civilization } from '../types';

interface ScaleBarProps {
  startYear: number;
  endYear: number;
  viewportSpan: number;
  polityTrackCount?: number;
  personTrackCount?: number;
  selectedCivilization?: Civilization | null; // 选中的文明
  selectedPolity?: Polity | null; // 选中的朝代
  level0Polities?: Polity[]; // Level0朝代列表（用于快速定位）
  onPolityClick?: (polity: Polity) => void; // 点击朝代时的回调
}

export const ScaleBar: React.FC<ScaleBarProps> = ({
  startYear,
  endYear,
  viewportSpan,
  polityTrackCount = 0,
  personTrackCount = 0,
  selectedCivilization = null,
  selectedPolity = null,
  level0Polities = [],
  onPolityClick
}) => {
  const scaleInfo = getTimeUnit(viewportSpan);
  const timeRange = formatTimeRange(startYear, endYear, viewportSpan);
  
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

  // 当选中文明或朝代时，显示该文明对应的所有Level0朝代
  const showLevel0Polities = (selectedCivilization || selectedPolity) && level0Polities.length > 0;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-600">
              <span className="font-medium">比例尺:</span>
              <span className="ml-2 text-amber-700 font-mono font-semibold">
                {scaleInfo.display}
              </span>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium">范围:</span>
              <span className="ml-2 font-mono">
                {timeRange}
              </span>
            </div>
            <div className="text-xs text-slate-500">(共 {formatSpan()})</div>
            <div className="text-xs text-emerald-600 font-medium">
              政权{polityTrackCount}轨 | 人物{personTrackCount}轨
            </div>
          </div>
        </div>
        
        {/* Level0朝代快速定位 */}
        {showLevel0Polities && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">快速定位:</span>
            {level0Polities.map((polity) => (
              <button
                key={polity.id}
                onClick={() => onPolityClick?.(polity)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 ${
                  selectedPolity?.id === polity.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title={`${polity.name} (${polity.startYear}-${polity.endYear})`}
              >
                {polity.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

