import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ViewportState } from '../types';

const BASE_YEAR_SPAN = 2000;
const MIN_SCALE = 0.1; // 最小缩放：视窗显示 20,000 年
const MAX_SCALE = 2000; // 最大缩放：视窗显示 1 年

const initialState: ViewportState = {
  zoomScale: 0.5,
  centerYear: -200,
  startYear: -1200,
  endYear: 800,
  viewportSpan: BASE_YEAR_SPAN / 0.5,
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

