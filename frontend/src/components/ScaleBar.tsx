import React from 'react';
import { getTimeUnit, formatTimeRange } from '../utils/dateUtils';

interface ScaleBarProps {
  startYear: number;
  endYear: number;
  viewportSpan: number;
  polityTrackCount?: number;
  personTrackCount?: number;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({
  startYear,
  endYear,
  viewportSpan,
  polityTrackCount = 0,
  personTrackCount = 0
}) => {
  const scaleInfo = getTimeUnit(viewportSpan);
  const timeRange = formatTimeRange(startYear, endYear, viewportSpan);
  
  // 格式化视窗跨度显示
  const formatSpan = () => {
    if (viewportSpan >= 1) {
      return `${Math.round(viewportSpan * 100) / 100} 年`;
    } else if (viewportSpan >= 1/12) {
      const months = viewportSpan * 12;
      return `${Math.round(months * 10) / 10} 月`;
    } else {
      const days = viewportSpan * 365;
      return `${Math.round(days)} 日`;
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="max-w-full mx-auto flex items-center justify-between">
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
    </div>
  );
};

