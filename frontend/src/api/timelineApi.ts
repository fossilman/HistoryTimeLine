import axios from 'axios';
import { TimelineData } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const timelineApi = {
  /**
   * 获取时间轴数据
   */
  getTimelineData: async (
    startYear: number,
    endYear: number,
    viewportSpan: number,
    civilizationIds?: string[]
  ): Promise<TimelineData> => {
    const params: any = {
      startYear,
      endYear,
      viewportSpan
    };

    if (civilizationIds && civilizationIds.length > 0) {
      params.civilizationIds = civilizationIds;
    }

    const response = await axios.get(`${API_BASE_URL}/timeline/data`, { params });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || '获取数据失败');
    }
  },

  /**
   * 搜索人物
   */
  searchPerson: async (query: string): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/timeline/search`, {
      params: { query }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || '搜索失败');
    }
  },

  /**
   * 获取指定父朝代的子朝代列表（Level1层级）
   */
  getChildDynasties: async (parentId: string): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/timeline/dynasties/${parentId}/children`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || '获取子朝代失败');
    }
  },

  /**
   * 获取指定文明的所有Level0朝代（用于比例尺快速定位）
   */
  getLevel0DynastiesByCivilization: async (civilizationId: string): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/timeline/dynasties/level0`, {
      params: { civilizationId }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || '获取Level0朝代失败');
    }
  }
};

