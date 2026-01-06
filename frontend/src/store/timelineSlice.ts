import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ViewportState } from '../types';

const BASE_YEAR_SPAN = 2000;
const MIN_SCALE = 2; // 最小缩放：视窗显示 1000 年 (2000 / 2 = 1000)
const MAX_SCALE = 24000; // 最大缩放：视窗显示 1个月 (2000 / 24000 = 1/12 年)

const initialState: ViewportState = {
  zoomScale: 2, // 视窗跨度1000年 (2000 / 2 = 1000)
  centerYear: 800, // 300和1300的中间
  startYear: 300,
  endYear: 1300,
  viewportSpan: 1000,
  offsetX: 0,
  isDragging: false
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setZoom: (state, action: PayloadAction<number>) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, action.payload));
      state.zoomScale = newScale;
      state.viewportSpan = BASE_YEAR_SPAN / newScale;
      // 重新计算视窗范围
      state.startYear = state.centerYear - state.viewportSpan / 2;
      state.endYear = state.centerYear + state.viewportSpan / 2;
    },
    setCenterYear: (state, action: PayloadAction<number>) => {
      state.centerYear = action.payload;
      state.startYear = state.centerYear - state.viewportSpan / 2;
      state.endYear = state.centerYear + state.viewportSpan / 2;
    },
    setOffset: (state, action: PayloadAction<number>) => {
      state.offsetX = action.payload;
    },
    setDragging: (state, action: PayloadAction<boolean>) => {
      state.isDragging = action.payload;
    },
    updateViewport: (state, action: PayloadAction<{ centerYear: number; zoomScale: number }>) => {
      const { centerYear, zoomScale } = action.payload;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, zoomScale));
      state.zoomScale = newScale;
      state.centerYear = centerYear;
      state.viewportSpan = BASE_YEAR_SPAN / newScale;
      state.startYear = state.centerYear - state.viewportSpan / 2;
      state.endYear = state.centerYear + state.viewportSpan / 2;
    }
  }
});

export const { setZoom, setCenterYear, setOffset, setDragging, updateViewport } = timelineSlice.actions;
export default timelineSlice.reducer;

