import { api } from './api';

/** Ask the AI for 3–5 title options for an entity, grounded in form context. */
export const suggestTitles = async (entity: string, context: Record<string, any>): Promise<string[]> => {
  const { data } = await api.post('/ai/suggest', { task: 'title', entity, context });
  return (data?.titles || []) as string[];
};

/** Ask the AI for a description, optionally guided by a chosen title. */
export const suggestDescription = async (
  entity: string,
  context: Record<string, any>,
  title?: string,
): Promise<string> => {
  const { data } = await api.post('/ai/suggest', { task: 'description', entity, context, title });
  return (data?.description || '') as string;
};
