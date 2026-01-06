import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TimelineData, Civilization, Polity, Person } from '../types';

interface DataState {
  civilizations: Civilization[];
  polities: Polity[];
  persons: Person[];
  loading: boolean;
  error: string | null;
}

const initialState: DataState = {
  civilizations: [],
  polities: [],
  persons: [],
  loading: false,
  error: null
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<TimelineData>) => {
      const { civilizations, polities, persons } = action.payload;
      state.civilizations = civilizations;
      state.polities = polities;
      state.persons = persons;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const { setData, setLoading, setError } = dataSlice.actions;
export default dataSlice.reducer;

