import { configureStore } from '@reduxjs/toolkit';
import timelineReducer from './timelineSlice';
import dataReducer from './dataSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    data: dataReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

