// Fictional catalogue for local development. Titles and artists are made
// up; the shapes follow the Partner Content API spec.

export type Mood = { id: string; name: string };
export type Genre = { id: string; name: string; parent?: { id: string; name: string } };
export type VocalType = "LEAD" | "PRESENCE" | "NONE";

export type CatalogTrack = {
  id: string;
  title: string;
  mainArtists: string[];
  featuredArtists: string[];
  bpm: number;
  length: number;
  moods: Mood[];
  genres: Genre[];
  vocalType: VocalType;
  isExplicit: boolean;
  isPreviewOnly: boolean;
  added: string;
  tags: string[];
};

export const MOODS: Mood[] = [
  { id: "happy", name: "Happy" },
  { id: "epic", name: "Epic" },
  { id: "laid-back", name: "Laid Back" },
  { id: "hopeful", name: "Hopeful" },
  { id: "dreamy", name: "Dreamy" },
  { id: "energetic", name: "Energetic" },
  { id: "playful", name: "Playful" },
  { id: "sentimental", name: "Sentimental" },
  { id: "mysterious", name: "Mysterious" },
  { id: "dark", name: "Dark" },
  { id: "confident", name: "Confident" },
  { id: "peaceful", name: "Peaceful" },
];

const ELECTRONIC = { id: "electronic", name: "Electronic" };
const ACOUSTIC = { id: "acoustic", name: "Acoustic" };
const CINEMATIC = { id: "cinematic", name: "Cinematic" };
const HIPHOP = { id: "hip-hop", name: "Hip Hop" };
const POP = { id: "pop", name: "Pop" };

export const GENRES: Genre[] = [
  ELECTRONIC,
  { id: "house", name: "House", parent: ELECTRONIC },
  { id: "synthwave", name: "Synthwave", parent: ELECTRONIC },
  { id: "downtempo", name: "Downtempo", parent: ELECTRONIC },
  ACOUSTIC,
  { id: "folk", name: "Folk", parent: ACOUSTIC },
  { id: "singer-songwriter", name: "Singer-Songwriter", parent: ACOUSTIC },
  CINEMATIC,
  { id: "trailer", name: "Trailer", parent: CINEMATIC },
  { id: "ambient", name: "Ambient", parent: CINEMATIC },
  HIPHOP,
  { id: "lo-fi", name: "Lo-Fi Hip Hop", parent: HIPHOP },
  { id: "boom-bap", name: "Boom Bap", parent: HIPHOP },
  POP,
  { id: "indie-pop", name: "Indie Pop", parent: POP },
  { id: "funk", name: "Funk" },
  { id: "jazz", name: "Jazz" },
];

const mood = (...ids: string[]) => ids.map((id) => MOODS.find((m) => m.id === id)!);
const genre = (...ids: string[]) => ids.map((id) => GENRES.find((g) => g.id === id)!);

type Row = [
  id: string,
  title: string,
  artist: string,
  bpm: number,
  length: number,
  moods: string[],
  genres: string[],
  vocal: VocalType,
  tags: string[],
  flags?: { explicit?: boolean; previewOnly?: boolean; featured?: string },
];

const ROWS: Row[] = [
  ["Qm4tR8vNa1", "Run the Line", "Halden Park", 128, 162, ["energetic", "confident"], ["house"], "NONE", ["sport", "drive", "build", "drop"]],
  ["Lp2wZ6kHc3", "Split Second", "Mira Okafor", 124, 148, ["energetic", "happy"], ["house", "electronic"], "PRESENCE", ["product", "upbeat", "claps"]],
  ["Xd7yB3nQe5", "Pavement Glow", "Night Office", 110, 201, ["confident", "dreamy"], ["synthwave"], "NONE", ["city", "neon", "retro"]],
  ["Rt9kM1sVg7", "Top Speed", "Halden Park", 140, 133, ["energetic", "epic"], ["electronic"], "NONE", ["sport", "fast", "race"]],
  ["Hn5cJ8pWi9", "Morning Mile", "Sunday Engines", 118, 176, ["hopeful", "happy"], ["indie-pop"], "LEAD", ["running", "morning", "guitar"]],
  ["Vb3fT6rYk2", "Bright Side Out", "Lua & The Tide", 122, 158, ["happy", "playful"], ["indie-pop", "pop"], "LEAD", ["summer", "claps", "whistle"]],
  ["Gc8xN2dLm4", "Warm Kitchen", "Olive Marsh", 92, 214, ["laid-back", "happy"], ["folk", "acoustic"], "NONE", ["cooking", "cosy", "ukulele"]],
  ["Ps1hK7vBo6", "Sunday Sauce", "The Lettuce Club", 98, 187, ["playful", "happy"], ["funk"], "NONE", ["cooking", "bass", "groove"]],
  ["Wy6mD4tFq8", "Slow Rise", "Tomas Iversen", 84, 242, ["peaceful", "laid-back"], ["acoustic"], "NONE", ["piano", "calm", "morning"]],
  ["Ze2jR9cHs1", "Crumbs", "Beanbag Theory", 86, 156, ["laid-back", "dreamy"], ["lo-fi"], "NONE", ["study", "vinyl", "chill", "loop"]],
  ["Nf7qL3wXu3", "Cafe Window", "Beanbag Theory", 80, 171, ["laid-back", "peaceful"], ["lo-fi"], "NONE", ["rain", "coffee", "loop"]],
  ["Ka4vP8yEw5", "Butter Keys", "Ines Duarte Trio", 104, 198, ["playful", "laid-back"], ["jazz"], "NONE", ["piano", "brushes", "cooking"]],
  ["Ub9sG1mTy7", "Summit Light", "Aurora Fields", 90, 224, ["epic", "hopeful"], ["cinematic", "trailer"], "NONE", ["mountain", "sunrise", "build", "strings"]],
  ["Ej3nW5bRa9", "Beyond the Ridge", "Aurora Fields", 100, 185, ["epic", "confident"], ["trailer"], "PRESENCE", ["adventure", "drums", "choir", "lift"]],
  ["Oi8tC2kVc2", "First Light", "Selma Hart", 76, 207, ["hopeful", "sentimental"], ["ambient", "cinematic"], "NONE", ["sunrise", "piano", "slow build"]],
  ["Ml5yH7qZd4", "Wide Open", "Coastline Radio", 96, 190, ["epic", "hopeful"], ["indie-pop"], "LEAD", ["travel", "road trip", "anthem"]],
  ["Ty1dF4jNf6", "Glass Horizon", "Night Office", 88, 236, ["dreamy", "mysterious"], ["ambient"], "NONE", ["space", "pads", "slow"]],
  ["Ab6gS9wKh8", "Tidewater", "Lua & The Tide", 102, 173, ["sentimental", "hopeful"], ["singer-songwriter"], "LEAD", ["ocean", "acoustic guitar", "travel"]],
  ["Cq2kX8rMj1", "Heavy Crown", "Dray Monroe", 90, 165, ["confident", "dark"], ["boom-bap"], "LEAD", ["rap", "street", "drums"], { explicit: true }],
  ["Dr7lV3nPk3", "Night Shift", "Dray Monroe", 94, 152, ["dark", "mysterious"], ["hip-hop"], "PRESENCE", ["city", "night", "bass"]],
  ["Fs4pB6tQl5", "Undertow", "Selma Hart", 70, 256, ["dark", "mysterious"], ["cinematic"], "NONE", ["tension", "thriller", "drone"]],
  ["Gt9wN1yRn7", "Fizz", "Pocket Rocket", 132, 128, ["playful", "energetic"], ["electronic", "pop"], "PRESENCE", ["kids", "bouncy", "game"]],
  ["Hu3aM5cSo9", "Picnic Weather", "Olive Marsh", 112, 149, ["happy", "playful"], ["folk"], "NONE", ["ukulele", "whistle", "family"]],
  ["Iv8bK2dTp2", "Cold Open", "Studio Vanta", 120, 118, ["confident", "mysterious"], ["electronic"], "NONE", ["tech", "product", "minimal"]],
  ["Jw1cJ7eUq4", "Launch Day", "Studio Vanta", 126, 139, ["confident", "hopeful"], ["electronic", "house"], "NONE", ["tech", "product", "corporate", "build"]],
  ["Kx6dH3fVr6", "Paper Planes Again", "Sunday Engines", 108, 181, ["happy", "hopeful"], ["indie-pop"], "LEAD", ["friends", "summer", "guitar"], { featured: "Mira Okafor" }],
  ["Ly2eG8gWs8", "Velvet Hour", "Ines Duarte Trio", 72, 263, ["sentimental", "peaceful"], ["jazz"], "NONE", ["evening", "saxophone", "dinner"]],
  ["Mz7fF4hXt1", "Hold the Moment", "Coastline Radio", 82, 219, ["sentimental", "hopeful"], ["singer-songwriter", "pop"], "LEAD", ["wedding", "ballad", "piano"]],
  ["Na3gE9iYu3", "Static Bloom", "Night Office", 115, 194, ["dreamy", "energetic"], ["synthwave"], "PRESENCE", ["retro", "night drive", "arpeggio"]],
  ["Ob8hD5jZv5", "Last Lap", "Halden Park", 150, 121, ["energetic", "epic"], ["electronic"], "NONE", ["sport", "race", "countdown"], { previewOnly: true }],
  ["Pc4iC1kAw7", "Lemon Peel", "The Lettuce Club", 106, 167, ["playful", "confident"], ["funk"], "PRESENCE", ["groove", "horns", "fashion"]],
  ["Qd9jB6lBx9", "Driftwood", "Tomas Iversen", 68, 231, ["peaceful", "sentimental"], ["ambient", "acoustic"], "NONE", ["nature", "meditation", "guitar"]],
  ["Re5kA2mCy2", "Big Reveal", "Aurora Fields", 105, 142, ["epic", "confident"], ["trailer"], "NONE", ["trailer", "hits", "build", "drop"]],
  ["Sf1lZ7nDz4", "Sidewalk Chalk", "Pocket Rocket", 116, 137, ["happy", "playful"], ["pop"], "LEAD", ["kids", "summer", "claps"]],
  ["Tg6mY3oEa6", "Low Tide Loop", "Beanbag Theory", 75, 144, ["dreamy", "peaceful"], ["lo-fi", "downtempo"], "NONE", ["loop", "beach", "chill"]],
  ["Uh2nX8pFb8", "Gold Rush", "Mira Okafor", 100, 176, ["confident", "energetic"], ["hip-hop", "funk"], "LEAD", ["fashion", "swagger", "brass"], { explicit: true }],
];

export const TRACKS: CatalogTrack[] = ROWS.map(
  ([id, title, artist, bpm, length, moods, genres, vocalType, tags, flags], i) => ({
    id,
    title,
    mainArtists: [artist],
    featuredArtists: flags?.featured ? [flags.featured] : [],
    bpm,
    length,
    moods: mood(...moods),
    genres: genre(...genres),
    vocalType,
    isExplicit: flags?.explicit ?? false,
    isPreviewOnly: flags?.previewOnly ?? false,
    added: new Date(Date.UTC(2025, 0, 1 + i * 9)).toISOString(),
    tags,
  }),
);
