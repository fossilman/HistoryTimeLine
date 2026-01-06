import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ZoomIn, ZoomOut, Users, Filter } from 'lucide-react';

// 模拟朝代数据（支持子政权）
const dynasties = [
  { name: '夏', start: -2070, end: -1600, color: '#8B4513' },
  { name: '商', start: -1600, end: -1046, color: '#A0522D' },
  { name: '周', start: -1046, end: -256, color: '#CD853F' },
  { name: '秦', start: -221, end: -206, color: '#4A5568' },
  { name: '汉', start: -206, end: 220, color: '#E53E3E' },
  { 
    name: '三国', 
    start: 220, 
    end: 280, 
    color: '#DD6B20',
    subRegimes: [
      { name: '魏', start: 220, end: 265, color: '#DC2626' },
      { name: '蜀', start: 221, end: 263, color: '#16A34A' },
      { name: '吴', start: 222, end: 280, color: '#2563EB' }
    ]
  },
  { name: '晋', start: 266, end: 420, color: '#D69E2E' },
  { 
    name: '南北朝', 
    start: 420, 
    end: 589, 
    color: '#38A169',
    subRegimes: [
      { name: '刘宋', start: 420, end: 479, color: '#059669' },
      { name: '南齐', start: 479, end: 502, color: '#10B981' },
      { name: '南梁', start: 502, end: 557, color: '#34D399' },
      { name: '南陈', start: 557, end: 589, color: '#6EE7B7' },
      { name: '北魏', start: 386, end: 534, color: '#DC2626' },
      { name: '东魏', start: 534, end: 550, color: '#EF4444' },
      { name: '西魏', start: 535, end: 557, color: '#F87171' },
      { name: '北齐', start: 550, end: 577, color: '#FCA5A5' },
      { name: '北周', start: 557, end: 581, color: '#FEE2E2' }
    ]
  },
  { name: '隋', start: 581, end: 618, color: '#319795' },
  { name: '唐', start: 618, end: 907, color: '#3182CE' },
  { 
    name: '五代十国', 
    start: 907, 
    end: 960, 
    color: '#805AD5',
    subRegimes: [
      { name: '后梁', start: 907, end: 923, color: '#7C3AED', layer: 0 },
      { name: '后唐', start: 923, end: 936, color: '#8B5CF6', layer: 0 },
      { name: '后晋', start: 936, end: 947, color: '#A78BFA', layer: 0 },
      { name: '后汉', start: 947, end: 951, color: '#C4B5FD', layer: 0 },
      { name: '后周', start: 951, end: 960, color: '#DDD6FE', layer: 0 },
      { name: '吴', start: 902, end: 937, color: '#DB2777', layer: 1 },
      { name: '南唐', start: 937, end: 975, color: '#EC4899', layer: 1 },
      { name: '吴越', start: 907, end: 978, color: '#F472B6', layer: 1 },
      { name: '闽', start: 909, end: 945, color: '#F9A8D4', layer: 1 },
      { name: '楚', start: 907, end: 951, color: '#FBCFE8', layer: 1 },
      { name: '南汉', start: 917, end: 971, color: '#DC2626', layer: 2 },
      { name: '前蜀', start: 907, end: 925, color: '#EF4444', layer: 2 },
      { name: '后蜀', start: 934, end: 965, color: '#F87171', layer: 2 },
      { name: '荆南', start: 924, end: 963, color: '#FCA5A5', layer: 2 },
      { name: '北汉', start: 951, end: 979, color: '#FEE2E2', layer: 2 }
    ]
  },
  { name: '宋', start: 960, end: 1279, color: '#D53F8C' },
  { name: '元', start: 1271, end: 1368, color: '#718096' },
  { name: '明', start: 1368, end: 1644, color: '#E53E3E' },
  { name: '清', start: 1644, end: 1912, color: '#3182CE' }
];

// 生成模拟人物数据
const generateMockPeople = (count = 1000) => {
  const categories = ['帝王', '文人', '武将', '科学家', '艺术家', '思想家'];
  const people = [];
  
  for (let i = 0; i < count; i++) {
    const birthYear = -2000 + Math.random() * 3900;
    const lifespan = 30 + Math.random() * 60;
    people.push({
      id: i,
      name: `人物${i}`,
      birth: Math.floor(birthYear),
      death: Math.floor(birthYear + lifespan),
      category: categories[Math.floor(Math.random() * categories.length)],
      importance: Math.random()
    });
  }
  
  return people.sort((a, b) => a.birth - b.birth);
};

const HistoricalTimeline = () => {
  const [timeRange, setTimeRange] = useState({ start: -2100, end: 2000 });
  const [viewWindow, setViewWindow] = useState({ start: -2100, end: 2000 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedDynasty, setSelectedDynasty] = useState(null);
  const [expandedDynasty, setExpandedDynasty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hoveredRegime, setHoveredRegime] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const people = useMemo(() => generateMockPeople(1000), []);
  
  // 计算缩放级别
  const getZoomLevel = () => {
    const span = viewWindow.end - viewWindow.start;
    if (span > 2000) return 1; // 全景
    if (span > 500) return 2;  // 朝代
    if (span > 100) return 3;  // 世纪
    return 4; // 详细
  };
  
  const currentZoomLevel = getZoomLevel();
  
  // 年份转换为像素位置
  const yearToX = (year, width) => {
    return ((year - viewWindow.start) / (viewWindow.end - viewWindow.start)) * width;
  };
  
  // 像素位置转换为年份
  const xToYear = (x, width) => {
    return viewWindow.start + (x / width) * (viewWindow.end - viewWindow.start);
  };
  
  // 绘制时间轴
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 计算朝代条带高度（根据是否展开）
    const dynastyHeight = expandedDynasty ? 180 : 60;
    
    // 绘制朝代条带
    ctx.globalAlpha = 0.3;
    dynasties.forEach(dynasty => {
      if (dynasty.end < viewWindow.start || dynasty.start > viewWindow.end) return;
      
      const x1 = Math.max(0, yearToX(dynasty.start, width));
      const x2 = Math.min(width, yearToX(dynasty.end, width));
      
      // 如果是展开的朝代，绘制子政权
      if (expandedDynasty === dynasty.name && dynasty.subRegimes) {
        // 绘制主朝代背景
        ctx.fillStyle = dynasty.color;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(x1, 0, x2 - x1, dynastyHeight);
        ctx.globalAlpha = 0.3;
        
        // 绘制子政权
        const layers = Math.max(...dynasty.subRegimes.map(r => r.layer || 0)) + 1;
        const layerHeight = (dynastyHeight - 30) / layers;
        
        dynasty.subRegimes.forEach(regime => {
          const rx1 = Math.max(x1, yearToX(regime.start, width));
          const rx2 = Math.min(x2, yearToX(regime.end, width));
          const layer = regime.layer || 0;
          const ry = 30 + layer * layerHeight;
          
          ctx.fillStyle = regime.color;
          ctx.globalAlpha = 0.7;
          ctx.fillRect(rx1, ry, rx2 - rx1, layerHeight - 2);
          
          // 绘制边框
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeRect(rx1, ry, rx2 - rx1, layerHeight - 2);
          
          // 绘制政权名称
          if (rx2 - rx1 > 25) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(regime.name, (rx1 + rx2) / 2, ry + layerHeight / 2 + 4);
            ctx.shadowBlur = 0;
          }
          
          ctx.globalAlpha = 0.3;
        });
        
        // 绘制朝代标题
        ctx.globalAlpha = 1;
        ctx.fillStyle = dynasty.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 2;
        ctx.fillText(dynasty.name, (x1 + x2) / 2, 20);
        ctx.shadowBlur = 0;
        
      } else {
        // 普通朝代显示
        ctx.fillStyle = dynasty.color;
        ctx.fillRect(x1, 0, x2 - x1, dynastyHeight);
        
        // 绘制朝代名称
        if (x2 - x1 > 30) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(dynasty.name, (x1 + x2) / 2, 35);
          ctx.globalAlpha = 0.3;
        }
        
        // 如果有子政权，显示展开提示
        if (dynasty.subRegimes && x2 - x1 > 50) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText('▼ 展开', (x1 + x2) / 2, 50);
          ctx.globalAlpha = 0.3;
        }
      }
    });
    
    ctx.globalAlpha = 1;
    
    // 计算人物绘制起始Y坐标
    const peopleStartY = dynastyHeight + 10;
    
    // 根据缩放级别绘制不同内容
    if (currentZoomLevel === 1) {
      // 级别1: 显示密度热力图
      const bucketSize = 100;
      const buckets = {};
      
      people.forEach(person => {
        if (person.birth >= viewWindow.start && person.birth <= viewWindow.end) {
          const bucket = Math.floor((person.birth - viewWindow.start) / bucketSize);
          buckets[bucket] = (buckets[bucket] || 0) + 1;
        }
      });
      
      Object.entries(buckets).forEach(([bucket, count]) => {
        const x = yearToX(viewWindow.start + bucket * bucketSize, width);
        const opacity = Math.min(count / 50, 1);
        ctx.fillStyle = `rgba(59, 130, 246, ${opacity})`;
        ctx.fillRect(x, peopleStartY, width * bucketSize / (viewWindow.end - viewWindow.start), 30);
      });
      
      // 绘制统计信息
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      const visiblePeople = people.filter(p => p.birth >= viewWindow.start && p.birth <= viewWindow.end);
      ctx.fillText(`人物总数: ${visiblePeople.length}`, 10, peopleStartY + 50);
      
    } else if (currentZoomLevel === 2) {
      // 级别2: 显示聚合点
      const bucketSize = 50;
      const buckets = {};
      
      people.forEach(person => {
        if (person.birth >= viewWindow.start && person.birth <= viewWindow.end) {
          const bucket = Math.floor((person.birth - viewWindow.start) / bucketSize);
          if (!buckets[bucket]) buckets[bucket] = [];
          buckets[bucket].push(person);
        }
      });
      
      Object.entries(buckets).forEach(([bucket, persons]) => {
        const x = yearToX(viewWindow.start + bucket * bucketSize + bucketSize/2, width);
        const radius = Math.min(Math.sqrt(persons.length) * 3, 20);
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, peopleStartY + 15, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(persons.length, x, peopleStartY + 20);
      });
      
    } else if (currentZoomLevel === 3) {
      // 级别3: 显示重要人物
      const visiblePeople = people
        .filter(p => p.birth >= viewWindow.start && p.birth <= viewWindow.end)
        .filter(p => p.importance > 0.7)
        .slice(0, 50);
      
      visiblePeople.forEach((person, idx) => {
        const x = yearToX(person.birth, width);
        const y = peopleStartY + (idx % 5) * 25;
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制生命线
        const deathX = yearToX(person.death, width);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(Math.min(deathX, width), y);
        ctx.stroke();
      });
      
    } else {
      // 级别4: 显示所有可见人物
      const visiblePeople = people
        .filter(p => p.birth >= viewWindow.start && p.birth <= viewWindow.end)
        .slice(0, 100);
      
      const categoryColors = {
        '帝王': '#ef4444',
        '文人': '#3b82f6',
        '武将': '#f59e0b',
        '科学家': '#10b981',
        '艺术家': '#8b5cf6',
        '思想家': '#ec4899'
      };
      
      visiblePeople.forEach((person, idx) => {
        const x = yearToX(person.birth, width);
        const y = peopleStartY + (idx % 8) * 20;
        
        ctx.fillStyle = categoryColors[person.category] || '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制生命线
        const deathX = yearToX(person.death, width);
        ctx.strokeStyle = categoryColors[person.category] || '#3b82f6';
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(Math.min(deathX, width), y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // 绘制名称
        if (person.importance > 0.8) {
          ctx.fillStyle = '#1f2937';
          ctx.font = '10px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(person.name, x + 8, y + 4);
        }
      });
    }
    
    // 绘制时间刻度
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 40);
    ctx.lineTo(width, height - 40);
    ctx.stroke();
    
    // 绘制时间标签
    const span = viewWindow.end - viewWindow.start;
    const tickInterval = span > 1000 ? 500 : span > 500 ? 100 : span > 100 ? 50 : 10;
    
    for (let year = Math.ceil(viewWindow.start / tickInterval) * tickInterval; 
         year <= viewWindow.end; 
         year += tickInterval) {
      const x = yearToX(year, width);
      ctx.beginPath();
      ctx.moveTo(x, height - 40);
      ctx.lineTo(x, height - 35);
      ctx.stroke();
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      const label = year < 0 ? `${-year}BC` : `${year}AD`;
      ctx.fillText(label, x, height - 20);
    }
    
  }, [viewWindow, people, currentZoomLevel, expandedDynasty]);
  
  // 缩放控制
  const handleZoom = (factor, centerX = null) => {
    const span = viewWindow.end - viewWindow.start;
    const newSpan = span / factor;
    
    if (newSpan < 10 || newSpan > 5000) return;
    
    let center;
    if (centerX !== null) {
      const canvas = canvasRef.current;
      center = xToYear(centerX, canvas.width);
    } else {
      center = (viewWindow.start + viewWindow.end) / 2;
    }
    
    const newStart = center - newSpan / 2;
    const newEnd = center + newSpan / 2;
    
    setViewWindow({
      start: Math.max(timeRange.start, newStart),
      end: Math.min(timeRange.end, newEnd)
    });
  };
  
  // 鼠标滚轮缩放
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    handleZoom(factor, centerX);
  };
  
  // 拖拽平移
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, viewWindow: { ...viewWindow } });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return;
    
    const canvas = canvasRef.current;
    const dx = e.clientX - dragStart.x;
    const span = viewWindow.end - viewWindow.start;
    const yearDelta = -(dx / canvas.width) * span;
    
    const newStart = dragStart.viewWindow.start + yearDelta;
    const newEnd = dragStart.viewWindow.end + yearDelta;
    
    if (newStart >= timeRange.start && newEnd <= timeRange.end) {
      setViewWindow({ start: newStart, end: newEnd });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };
  
  // 快速定位到朝代
  const jumpToDynasty = (dynasty) => {
    const padding = 50;
    setViewWindow({
      start: dynasty.start - padding,
      end: dynasty.end + padding
    });
    setSelectedDynasty(dynasty.name);
  };
  
  // 切换朝代展开状态
  const toggleDynastyExpand = (dynastyName) => {
    if (expandedDynasty === dynastyName) {
      setExpandedDynasty(null);
    } else {
      setExpandedDynasty(dynastyName);
      // 自动缩放到该朝代
      const dynasty = dynasties.find(d => d.name === dynastyName);
      if (dynasty) {
        jumpToDynasty(dynasty);
      }
    }
  };
  
  // 处理画布点击事件
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查是否点击了朝代条带
    const clickedYear = xToYear(x * (canvas.width / rect.width), canvas.width);
    
    dynasties.forEach(dynasty => {
      if (clickedYear >= dynasty.start && clickedYear <= dynasty.end && y < 60) {
        if (dynasty.subRegimes) {
          toggleDynastyExpand(dynasty.name);
        }
      }
    });
  };
  
  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      {/* 顶部控制栏 */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">历史人物时间轴</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">缩放级别: {currentZoomLevel}/4</span>
            <span className="text-sm text-gray-600">
              {viewWindow.start < 0 ? `${-viewWindow.start}BC` : `${viewWindow.start}AD`} - 
              {viewWindow.end < 0 ? `${-viewWindow.end}BC` : `${viewWindow.end}AD`}
            </span>
          </div>
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          {/* 搜索框 */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索人物..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* 缩放按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleZoom(1.5)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleZoom(0.67)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewWindow({ start: -2100, end: 2000 })}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              重置
            </button>
          </div>
        </div>
        
        {/* 朝代快速导航 */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {dynasties.map(dynasty => (
            <button
              key={dynasty.name}
              onClick={() => jumpToDynasty(dynasty)}
              className={`px-3 py-1 rounded-full text-sm transition-all relative ${
                selectedDynasty === dynasty.name
                  ? 'ring-2 ring-offset-2 shadow-lg scale-105'
                  : 'hover:scale-105 hover:shadow-md'
              } ${
                expandedDynasty === dynasty.name
                  ? 'ring-2 ring-yellow-400 ring-offset-2'
                  : ''
              }`}
              style={{ 
                backgroundColor: dynasty.color,
                color: '#fff'
              }}
            >
              {dynasty.name}
              {dynasty.subRegimes && (
                <span className="ml-1 text-xs">
                  {expandedDynasty === dynasty.name ? '▲' : '▼'}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* 展开朝代信息面板 */}
        {expandedDynasty && (() => {
          const dynasty = dynasties.find(d => d.name === expandedDynasty);
          return dynasty?.subRegimes ? (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">
                  {dynasty.name} 详细政权 ({dynasty.start}-{dynasty.end})
                </h3>
                <button
                  onClick={() => setExpandedDynasty(null)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                >
                  收起
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {dynasty.subRegimes.map(regime => (
                  <div
                    key={regime.name}
                    className="p-2 rounded-lg text-white text-sm shadow-md hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: regime.color }}
                  >
                    <div className="font-bold">{regime.name}</div>
                    <div className="text-xs opacity-90">
                      {regime.start}-{regime.end}
                    </div>
                    <div className="text-xs opacity-75">
                      ({regime.end - regime.start}年)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>
      
      {/* 主时间轴区域 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={1600}
          height={400}
          className="w-full h-full cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onClick={handleCanvasClick}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        
        {/* 提示信息 */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
          <div className="text-sm text-gray-700 space-y-1">
            <div className="font-bold mb-2">操作提示：</div>
            <div>🖱️ 滚轮缩放时间轴</div>
            <div>👆 拖拽平移视图</div>
            <div>🏛️ 点击朝代快速定位</div>
            <div>📖 点击带▼的朝代展开政权</div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                当前显示: {people.filter(p => p.birth >= viewWindow.start && p.birth <= viewWindow.end).length} 人
              </div>
              {expandedDynasty && (
                <div className="text-xs text-blue-600 font-semibold mt-1">
                  已展开: {expandedDynasty}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 图例 */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-6 flex-wrap items-center text-sm">
          <span className="font-semibold text-gray-700">图例：</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>帝王</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>文人</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span>武将</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>科学家</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>艺术家</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-pink-500"></div>
            <span>思想家</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalTimeline;