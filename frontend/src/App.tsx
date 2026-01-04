import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { TimelineContainer } from './components/TimelineContainer';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <TimelineContainer />
    </Provider>
  );
}

export default App;

