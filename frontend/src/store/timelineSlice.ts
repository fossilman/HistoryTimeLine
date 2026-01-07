import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ViewportState } from '../types';

const BASE_YEAR_SPAN = 2000;
const MIN_SCALE = 2; // 最小缩放：视窗显示 1000 年 (2000 / 2 = 1000)
const MAX_SCALE = 24000; // 最大缩放：视窗显示 1个月 (2000 / 24000 = 1/12 年)
const MIN_YEAR = -1200; // 最小年份边界
const MAX_YEAR = 2100; // 最大年份边界

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
      
      // 计算中心年份的边界范围
      const minCenterYear = MIN_YEAR + state.viewportSpan / 2;
      const maxCenterYear = MAX_YEAR - state.viewportSpan / 2;
      
      // 限制中心年份在边界内
      const clampedCenterYear = Math.max(minCenterYear, Math.min(maxCenterYear, state.centerYear));
      state.centerYear = clampedCenterYear;
      
      // 重新计算视窗范围
      state.startYear = state.centerYear - state.viewportSpan / 2;
      state.endYear = state.centerYear + state.viewportSpan / 2;
      
      // 确保边界值不会超出范围（处理浮点数精度问题）
      if (state.startYear < MIN_YEAR) {
        state.startYear = MIN_YEAR;
        state.centerYear = MIN_YEAR + state.viewportSpan / 2;
        state.endYear = state.centerYear + state.viewportSpan / 2;
      }
      if (state.endYear > MAX_YEAR) {
        state.endYear = MAX_YEAR;
        state.centerYear = MAX_YEAR - state.viewportSpan / 2;
        state.startYear = state.centerYear - state.viewportSpan / 2;
      }
    },
    setCenterYear: (state, action: PayloadAction<number>) => {
      // 计算中心年份的边界范围
      const minCenterYear = MIN_YEAR + state.viewportSpan / 2;
      const maxCenterYear = MAX_YEAR - state.viewportSpan / 2;
      
      // 限制中心年份在边界内
      state.centerYear = Math.max(minCenterYear, Math.min(maxCenterYear, action.payload));
      state.startYear = state.centerYear - state.viewportSpan / 2;
      state.endYear = state.centerYear + state.viewportSpan / 2;
      
      // 确保边界值不会超出范围（处理浮点数精度问题）
      if (state.startYear < MIN_YEAR) {
        state.startYear = MIN_YEAR;
        state.centerYear = MIN_YEAR + state.viewportSpan / 2;
        state.endYear = state.centerYear + state.viewportSpan / 2;
      }
      if (state.endYear > MAX_YEAR) {
        state.endYear = MAX_YEAR;
        state.centerYear = MAX_YEAR - state.viewportSpan / 2;
        state.startYear = state.centerYear - state.viewportSpan / 2;
      }
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
      state.viewportSpan = BASE_YEAR_SPAN / newScale;
      
      // 计算中心年份的边界范围
      // startYear = centerYear - viewportSpan / 2 >= MIN_YEAR
      // endYear = centerYear + viewportSpan / 2 <= MAX_YEAR
      const minCenterYear = MIN_YEAR + state.viewportSpan / 2;
      const maxCenterYear = MAX_YEAR - state.viewportSpan / 2;
      
      // 限制中心年份在边界内
      const clampedCenterYear = Math.max(minCenterYear, Math.min(maxCenterYear, centerYear));
      state.centerYear = clampedCenterYear;
      
      state.startYear = state.centerYear - state.viewportSpan / 2;
      state.endYear = state.centerYear + state.viewportSpan / 2;
      
      // 确保边界值不会超出范围（处理浮点数精度问题）
      if (state.startYear < MIN_YEAR) {
        state.startYear = MIN_YEAR;
        state.centerYear = MIN_YEAR + state.viewportSpan / 2;
        state.endYear = state.centerYear + state.viewportSpan / 2;
      }
      if (state.endYear > MAX_YEAR) {
        state.endYear = MAX_YEAR;
        state.centerYear = MAX_YEAR - state.viewportSpan / 2;
        state.startYear = state.centerYear - state.viewportSpan / 2;
      }
    }
  }
});

export const { setZoom, setCenterYear, setOffset, setDragging, updateViewport } = timelineSlice.actions;
export default timelineSlice.reducer;

