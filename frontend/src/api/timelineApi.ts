import axios from 'axios';
import { TimelineData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
  }
};

