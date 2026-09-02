export const MAX_AD_BODY = 50;

export type AdLang = "he" | "en";

export type AdCopyInput = {
  title: string;
  author: string;
  contentType: "track" | "playlist";
  clues: string;
  trackCount: number | null;
  lang?: AdLang;
};

export function audienceLang(countries: string[]): AdLang {
  return countries.includes("IL") ? "he" : "en";
}

export function hasHebrew(text: string) {
  return /[\u0590-\u05FF]/.test(text);
}

const GENRES: {
  keys: string[];
  song: Record<AdLang, string>;
  playlist: Record<AdLang, string>;
}[] = [
  {
    keys: ["reggaeton", "dembow", "latin urban", "perreo", "רגטון"],
    song: {
      he: "רגטון חם ללילה. אי אפשר לשבת בשקט.",
      en: "Hot reggaeton for the night. Hit play.",
    },
    playlist: {
      he: "רגטון שמזיז עד הבוקר. כנסו לרקוד.",
      en: "Reggaeton that moves till morning. Play.",
    },
  },
  {
    keys: ["latin", "latino", "salsa", "bachata", "לאטינו", "בצאטה"],
    song: {
      he: "לאטינו שמזיז את הגוף. כנסו לרקוד.",
      en: "Latin heat that moves your body. Play.",
    },
    playlist: {
      he: "לאטינו חם. פלייליסט שאי אפשר לעצור.",
      en: "A latin mix you will not pause.",
    },
  },
  {
    keys: ["hip hop", "hiphop", "rap", "trap", "היפ הופ", "ראפ", "טראפ"],
    song: {
      he: "היפ הופ חד. הקצב תופס מהשנייה הראשונה.",
      en: "Sharp hip hop. The beat grabs you fast.",
    },
    playlist: {
      he: "ראפ וטראפ שמרגישים עכשיו. כנסו.",
      en: "Rap and trap that feel right now.",
    },
  },
  {
    keys: ["mizrahi", "oriental", "mediterranean", "מזרחית", "ים תיכוני"],
    song: {
      he: "מזרחית שמפרקת. כנסו לשמוע עכשיו.",
      en: "Mizrahi fire. Press play and feel it.",
    },
    playlist: {
      he: "מזרחית חמה לפלייליסט של הערב.",
      en: "A warm Mizrahi mix for the night.",
    },
  },
  {
    keys: ["pop", "hits", "top 100", "top hits", "פופ", "היט"],
    song: {
      he: "פופ שנתקע בראש כבר מהבית הראשון.",
      en: "Pop that sticks from the first bar.",
    },
    playlist: {
      he: "פופ עולמי שמרגיש כמו תחנה חמה.",
      en: "Global pop that feels like a hot station.",
    },
  },
  {
    keys: ["electronic", "edm", "house", "techno", "dance", "אלקטרוני", "האוס", "טכנו", "דאנס"],
    song: {
      he: "אלקטרוני שמניע את הרצפה. כנסו.",
      en: "Electronic heat that moves the floor.",
    },
    playlist: {
      he: "האוס ודאנס שלא נותנים מנוחה.",
      en: "House and dance with no off switch.",
    },
  },
  {
    keys: ["r&b", "rnb", "soul", "סול"],
    song: {
      he: "סול חלק שיושב על הלב. האזינו עכשיו.",
      en: "Smooth soul that sits on the heart.",
    },
    playlist: {
      he: "סול רך ללילה. פלייליסט שמרגיע.",
      en: "Soft soul for a slow night. Press play.",
    },
  },
  {
    keys: ["lofi", "lo fi", "chill", "chillhop", "study", "לו פי", "ציל"],
    song: {
      he: "צליל רגוע ללימודים, לנסיעה, ללילה.",
      en: "Calm sound for study, rides, and night.",
    },
    playlist: {
      he: "פלייליסט רגוע ששומר על פוקוס.",
      en: "A calm mix that keeps you focused.",
    },
  },
  {
    keys: ["rock", "indie", "alternative", "רוק", "אינדי"],
    song: {
      he: "רוק חי שמכה חזק. תלחצו ותיכנסו.",
      en: "Live rock that hits hard. Press play.",
    },
    playlist: {
      he: "רוק ואינדי שמרגישים חיים. כנסו.",
      en: "Rock and indie that feel alive. Play.",
    },
  },
  {
    keys: ["afrobeats", "afrobeat", "afro", "amapiano", "אפרו"],
    song: {
      he: "אפרוביטס שמחייך. כנסו לקצב עכשיו.",
      en: "Afrobeats with a smile. Jump in now.",
    },
    playlist: {
      he: "אפרוביטס לפלייליסט שמזיז את הבית.",
      en: "Afrobeats that get the house moving.",
    },
  },
  {
    keys: ["drill"],
    song: {
      he: "דריל חד וכהה. הקשיבו עד הסוף.",
      en: "Dark drill. Stay till the last bar.",
    },
    playlist: {
      he: "דריל כהה לפלייליסט של הלילה.",
      en: "Dark drill for a late night mix.",
    },
  },
  {
    keys: ["jazz", "blues", "גאז", "בלוז"],
    song: {
      he: "גאז חם ללילה איטי. כנסו להאזין.",
      en: "Warm jazz for a slow night. Listen.",
    },
    playlist: {
      he: "גאז ובלוז לערב רך. כנסו.",
      en: "Jazz and blues for a soft evening.",
    },
  },
  {
    keys: ["metal", "punk", "hardcore", "מטאל", "פאנק"],
    song: {
      he: "מטאל שמרעיד. תלחצו ותיכנסו פנימה.",
      en: "Metal that shakes the room. Hit play.",
    },
    playlist: {
      he: "מטאל כבד לפלייליסט שפורק.",
      en: "Heavy metal built to let it out.",
    },
  },
];

export function clampAdCopy(raw: string) {
  const cleaned = raw
    .replace(/["'`״׳]/g, "")
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if ([...cleaned].length <= MAX_AD_BODY) return cleaned;
  const sliced = [...cleaned].slice(0, MAX_AD_BODY).join("").trim();
  const cut = sliced.lastIndexOf(" ");
  return (cut >= 20 ? sliced.slice(0, cut) : sliced).trim();
}

export function detectGenre(clues: string) {
  const hay = clues.toLowerCase();
  return GENRES.find((g) => g.keys.some((key) => hay.includes(key))) ?? null;
}

export function heuristicAdCopy(input: AdCopyInput) {
  const lang: AdLang = input.lang ?? "he";
  const clues = `${input.title} ${input.author} ${input.clues}`;
  const genre = detectGenre(clues);
  const isPlaylist = input.contentType === "playlist";
  if (genre) return clampAdCopy(isPlaylist ? genre.playlist[lang] : genre.song[lang]);
  if (isPlaylist) {
    const n = input.trackCount;
    if (n && n > 1) {
      return clampAdCopy(
        lang === "en" ? `A mix of ${n} tracks. Come find your song.` : `פלייליסט עם ${n} שירים. כנסו לגלות.`,
      );
    }
    return clampAdCopy(
      lang === "en" ? "A playlist that feels like your own station." : "פלייליסט שמרגיש כמו תחנה פרטית.",
    );
  }
  if (input.author) {
    return clampAdCopy(
      lang === "en"
        ? `${input.author} with a track you cannot shake.`
        : `${input.author} עם שיר שתופס ולא עוזב.`,
    );
  }
  return clampAdCopy(
    lang === "en" ? "A track that grabs you. Press play now." : "שיר שתופס ולא עוזב. כנסו להאזין.",
  );
}

export async function writeAdCopy(input: AdCopyInput): Promise<string> {
  return heuristicAdCopy({ ...input, lang: input.lang ?? "he" });
}
