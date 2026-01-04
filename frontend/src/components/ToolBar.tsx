import React from 'react';
import { Search, Home, Calendar, User, MapPin } from 'lucide-react';

interface ToolBarProps {
  onReset?: () => void;
  onSearch?: () => void;
  showPersons?: boolean;
  showEvents?: boolean;
  onTogglePersons?: (show: boolean) => void;
  onToggleEvents?: (show: boolean) => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({ 
  onReset, 
  onSearch,
  showPersons = true,
  showEvents = true,
  onTogglePersons,
  onToggleEvents
}) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            History Timezone
          </h1>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">智能轨道</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 显示控制复选框 */}
          <div className="flex items-center gap-4 bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPersons}
                onChange={(e) => onTogglePersons?.(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">人物</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(e) => onToggleEvents?.(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
              />
              <MapPin className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">事件</span>
            </label>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">重置</span>
            </button>
            
            <button 
              onClick={onSearch}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm font-medium">搜索</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

