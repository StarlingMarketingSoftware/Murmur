import { configureStore } from '@reduxjs/toolkit';
import murmurReducer from './features/murmur/murmurSlice';

export const makeStore = () => {
	return configureStore({
		reducer: {
			murmur: murmurReducer,
		},
	});
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
