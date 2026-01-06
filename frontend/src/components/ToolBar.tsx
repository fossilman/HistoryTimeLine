import React, { useState, useRef, useEffect } from 'react';
import { Search, Home, X } from 'lucide-react';
import { Person, Polity } from '../types';

interface SearchResult extends Person {
  polityName?: string;
}

interface ToolBarProps {
  onReset?: () => void;
  onSearch?: (query: string) => void;
  onSelectPerson?: (person: Person) => void;
  searchResults?: SearchResult[];
  polities?: Polity[];
  showNoResults?: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({ 
  onReset, 
  onSearch,
  onSelectPerson,
  searchResults = [],
  polities = [],
  showNoResults = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsSearchActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 当搜索结果变化时，自动显示下拉列表或"没有数据"提示
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      if (searchResults.length > 0) {
        setShowDropdown(true);
      } else if (showNoResults) {
        setShowDropdown(false);
      }
    }
  }, [searchResults, searchQuery, showNoResults]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // 只有在有结果时才显示下拉列表
    setShowDropdown(query.trim().length > 0 && searchResults.length > 0);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSearchFocus = () => {
    setIsSearchActive(true);
    if (searchQuery.trim().length > 0 && searchResults.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowDropdown(false);
    if (onSearch) {
      onSearch('');
    }
  };

  const handleSelectPerson = (person: Person) => {
    setSearchQuery('');
    setShowDropdown(false);
    setIsSearchActive(false);
    if (onSelectPerson) {
      onSelectPerson(person);
    }
  };

  // 获取朝代名称
  const getPolityName = (polityId: string): string => {
    const polity = polities.find(p => p.id === polityId);
    return polity?.name || '未知朝代';
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            History Timezone
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 搜索框 - 右上角功能区 */}
          <div className="relative" ref={searchRef}>
            <div className={`flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg transition-all duration-300 ${
              isSearchActive ? 'ring-2 ring-amber-500 bg-white shadow-md' : ''
            }`}>
              <Search className="w-4 h-4 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                placeholder="搜索人名..."
                className="bg-transparent border-none outline-none text-sm w-48 focus:w-64 transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              )}
            </div>
            
            {/* 下拉列表 */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-64 overflow-y-auto">
                {searchResults.map((person) => {
                  // 优先使用后端返回的 polityName
                  let polityName = person.polityName;
                  
                  // 如果后端返回的 polityName 为空（null/undefined/空字符串），且有 polityId，尝试从 polities 数组中查找
                  if ((!polityName || (typeof polityName === 'string' && polityName.trim() === '')) && person.polityId) {
                    polityName = getPolityName(person.polityId);
                  }
                  
                  // 如果还是没有找到，显示"未知朝代"
                  if (!polityName || (typeof polityName === 'string' && polityName.trim() === '')) {
                    polityName = '未知朝代';
                  }
                  return (
                    <button
                      key={person.id}
                      onClick={() => handleSelectPerson(person)}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-slate-100 last:border-b-0 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 group-hover:text-amber-700">
                          {person.name}
                        </span>
                        <span className="text-xs text-slate-500 ml-2 group-hover:text-amber-600">
                          - {polityName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* 无数据提示 */}
            {showNoResults && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-50 px-4 py-6 text-center">
                <p className="text-sm text-slate-500">没有找到相关数据</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">重置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

