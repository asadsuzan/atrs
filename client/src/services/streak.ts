import { api } from './api';

export interface StreakDay {
  date: string;
  logged: boolean;
}

export interface DailyLogNote {
  _id: string;
  note: string;
  createdAt: string;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  todayLogged: boolean;
  todayCount: number;
  totalActiveDays: number;
  /** Last 7 calendar days, oldest first (ends with today). */
  last7: StreakDay[];
  /** Today's journal entries, newest first (capped). */
  todayNotes: DailyLogNote[];
}

/** The caller's personal logging streak, bucketed in their local timezone. */
export const getLoggingStreak = async (): Promise<StreakStats> => {
  const { data } = await api.get('/streak', {
    params: { tzOffset: new Date().getTimezoneOffset() },
  });
  return data;
};

/** Adds one entry to the personal daily work journal. */
export const logToday = async (note: string) => {
  const { data } = await api.post('/streak/log', { note });
  return data;
};

/** Removes one of your own journal entries. */
export const deleteLog = async (id: string) => {
  const { data } = await api.delete(`/streak/log/${id}`);
  return data;
};
