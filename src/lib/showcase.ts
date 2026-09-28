/**
 * Hand-curated briefs used by both the home-page sample pills and the
 * `pnpm seed` script. Adding a new showcase is a one-line edit — both
 * surfaces pick it up automatically.
 */

export type ShowcaseBrief = {
  /** Short label shown in the pill. */
  caption: string;
  brief: string;
  videoLengthSec?: number;
};

export const SHOWCASE_BRIEFS: ShowcaseBrief[] = [
  {
    caption: "Product teaser, 30s",
    brief:
      "30-second product teaser for a new running shoe on Instagram. Upbeat and confident, builds to a clear peak around 20 seconds. There's a voiceover, so no lead vocals.",
    videoLengthSec: 30,
  },
  {
    caption: "Cooking vlog, 8 min",
    brief:
      "Relaxed weekend cooking vlog for YouTube, about eight minutes. Warm, cosy, a bit playful. Needs something that sits under talking without getting annoying on loop.",
  },
  {
    caption: "Travel reel, 15s",
    brief:
      "15-second travel reel of a sunrise hike, TikTok. Epic and cinematic, slow start then a big lift. Vocals are fine.",
    videoLengthSec: 15,
  },
];
