import { TimelineItem, TrackAssignment } from '../types';

export interface TrackAssignmentResult {
  assignments: TrackAssignment;
  trackCount: number;
}

/**
 * 轨道分配算法
 * 为时间轴元素分配轨道，避免时间重叠元素视觉冲突
 * 最大化垂直空间利用率
 */
export function assignTracks(items: TimelineItem[]): TrackAssignmentResult {
  if (!items || items.length === 0) {
    return { assignments: {}, trackCount: 0 };
  }

  // 按开始时间排序
  const sorted = [...items].sort((a, b) => a.start - b.start);
  
  const tracks: number[] = [];
  const assignments: TrackAssignment = {};
  
  for (const item of sorted) {
    // 寻找第一个不冲突的轨道
    let trackIndex = 0;
    while (trackIndex < tracks.length) {
      if (tracks[trackIndex] <= item.start) {
        // 无重叠，使用此轨道
        tracks[trackIndex] = item.end;
        break;
      }
      trackIndex++;
    }
    
    // 所有轨道都冲突，创建新轨道
    if (trackIndex === tracks.length) {
      tracks.push(item.end);
    }
    
    assignments[item.id] = trackIndex;
  }
  
  return { assignments, trackCount: tracks.length };
}

