import { z } from 'zod';
import { objectId } from './common.schema';

const keyFeatureSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  list: z.array(z.string()).optional(),
  mediaUrl: z.string().optional(),
});

const featureSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  list: z.array(z.string()).optional(),
});

const demoSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
});

const screenshotSchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
});

const faqSchema = z.object({
  question: z.string().optional(),
  answer: z.string().optional(),
});

export const upsertMarketingSchema = z.object({
  body: z.object({
    pluginName: z.string().optional(),
    trailerVideo: z.string().optional(),
    tutorialVideo: z.string().optional(),
    wpOrgUrl: z.string().optional(),
    docsUrl: z.string().optional(),
    heroDescription: z.string().optional(),
    thumbnailImage: z.string().optional(),
    problemList: z.array(z.string()).optional(),
    smarterWayList: z.array(z.string()).optional(),
    keyFeatures: z.array(keyFeatureSchema).optional(),
    allFeatures: z.array(featureSchema).optional(),
    proFeaturesDesc: z.string().optional(),
    demos: z.array(demoSchema).optional(),
    topRatingLink: z.string().optional(),
    screenshots: z.array(screenshotSchema).optional(),
    faqs: z.array(faqSchema).optional(),
  }).passthrough(),
  params: z.object({
    id: objectId,
  }),
});
