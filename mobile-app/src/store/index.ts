import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import chits from './chitsSlice';
import { TypedUseSelectorHook,useDispatch,useSelector } from 'react-redux';

export const store=configureStore({reducer:{auth,chits}});
export type RootState=ReturnType<typeof store.getState>;
export type AppDispatch=typeof store.dispatch;
export const useAppSelector:TypedUseSelectorHook<RootState>=useSelector;
export const useAppDispatch=()=>useDispatch<AppDispatch>();
