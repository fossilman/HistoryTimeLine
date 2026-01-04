import React from 'react';
import { User, MapPin, Calendar, X } from 'lucide-react';
import { Polity, Person, Event } from '../types';

interface DetailPanelProps {
  item: { type: string; data: Polity | Person | Event } | null;
  onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ item, onClose }) => {
  if (!item) return null;

  const formatYear = (year: number) => {
    return year < 0 ? `前${Math.abs(year)}` : year;
  };

  return (
    <div className="absolute bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl p-6 border border-slate-200 z-50">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-6 h-6 flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>
      
      {item.type === 'polity' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex-shrink-0"
              style={{ backgroundColor: (item.data as Polity).color }}
            ></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{(item.data as Polity).name}</h3>
              <p className="text-sm text-slate-500">政权</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">存续:</span>
              <span className="font-mono font-semibold">
                {formatYear((item.data as Polity).startYear)} - {formatYear((item.data as Polity).endYear)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">年数:</span>
              <span className="font-semibold">
                {(item.data as Polity).endYear - (item.data as Polity).startYear} 年
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
              <p className="text-sm text-slate-500">人物</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">生卒:</span>
              <span className="font-mono font-semibold">
                {formatYear((item.data as Person).birthYear)} - {formatYear((item.data as Person).deathYear)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">享年:</span>
              <span className="font-semibold">
                {(item.data as Person).deathYear - (item.data as Person).birthYear} 岁
              </span>
            </div>
          </div>
        </div>
      )}
      
      {item.type === 'event' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{(item.data as Event).name}</h3>
              <p className="text-sm text-slate-500">瞬时事件</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {(item.data as Event).year && (
              <div className="flex justify-between">
                <span className="text-slate-600">年份:</span>
                <span className="font-mono font-semibold">
                  {formatYear((item.data as Event).year)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {item.type === 'duration_event' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-red-400 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{(item.data as Event).name}</h3>
              <p className="text-sm text-slate-500">时期</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {(item.data as Event).startYear && (item.data as Event).endYear && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">时期:</span>
                  <span className="font-mono font-semibold">
                    {formatYear((item.data as Event).startYear)} - {formatYear((item.data as Event).endYear)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">持续:</span>
                  <span className="font-semibold">
                    {(item.data as Event).endYear! - (item.data as Event).startYear!} 年
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

