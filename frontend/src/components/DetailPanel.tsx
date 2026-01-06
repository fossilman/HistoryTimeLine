import React from 'react';
import { User, Building2 } from 'lucide-react';
import { Polity, Person } from '../types';

interface DetailPanelProps {
  item: { type: string; data: Polity | Person } | null;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ item }) => {
  if (!item) return null;

  const formatYear = (year: number) => {
    return year < 0 ? `前${Math.abs(year)}` : year;
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl p-6 border border-slate-200 z-50 transition-all duration-300 opacity-100 animate-fade-in">
      
      {item.type === 'polity' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: (item.data as Polity).color }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{(item.data as Polity).name}</h3>
              <p className="text-sm text-slate-500">朝代</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">存续时间:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatYear((item.data as Polity).startYear)} - {formatYear((item.data as Polity).endYear)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">存续年数:</span>
              <span className="font-semibold text-slate-800">
                {(item.data as Polity).endYear - (item.data as Polity).startYear} 年
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">重要程度:</span>
              <span className={`font-semibold ${
                (item.data as Polity).importance === 'high' ? 'text-red-600' :
                (item.data as Polity).importance === 'medium' ? 'text-amber-600' : 'text-slate-600'
              }`}>
                {(item.data as Polity).importance === 'high' ? '高' :
                 (item.data as Polity).importance === 'medium' ? '中' : '低'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {item.type === 'person' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{(item.data as Person).name}</h3>
              <p className="text-sm text-slate-500">
                {(item.data as Person).title || '人物'}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">生卒年份:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatYear((item.data as Person).birthYear)} - {formatYear((item.data as Person).deathYear)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">享年:</span>
              <span className="font-semibold text-slate-800">
                {(item.data as Person).deathYear - (item.data as Person).birthYear} 岁
              </span>
            </div>
            {(item.data as Person).title && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600">身份:</span>
                <span className="font-semibold text-slate-800">
                  {(item.data as Person).title}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-600">重要程度:</span>
              <span className={`font-semibold ${
                (item.data as Person).importance === 'high' ? 'text-red-600' :
                (item.data as Person).importance === 'medium' ? 'text-amber-600' : 'text-slate-600'
              }`}>
                {(item.data as Person).importance === 'high' ? '高' :
                 (item.data as Person).importance === 'medium' ? '中' : '低'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

