import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './authSlice';
import { createAlertSlice, AlertSlice } from './alertSlice';

// Combine all slices
interface AppState extends AuthSlice, AlertSlice {
    // Add other slices here
}

export const useStore = create<AppState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createAlertSlice(...a),
}));

