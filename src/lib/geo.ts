export type Country = { code: string; name: string };
export type ContinentKey =
  | "IL_FOCUS"
  | "ME"
  | "EU"
  | "NA"
  | "LATAM"
  | "AF"
  | "AS"
  | "OC"
  | "WORLD";

export const GEO: Record<ContinentKey, { label: string; countries: Country[] }> = {
  IL_FOCUS: {
    label: "ישראל + שכנות שיווקיות",
    countries: [
      { code: "IL", name: "ישראל" },
      { code: "US", name: "ארצות הברית" },
      { code: "GB", name: "בריטניה" },
      { code: "FR", name: "צרפת" },
      { code: "DE", name: "גרמניה" },
    ],
  },
  ME: {
    label: "מזרח תיכון",
    countries: [
      { code: "IL", name: "ישראל" },
      { code: "AE", name: "איחוד האמירויות" },
      { code: "JO", name: "ירדן" },
      { code: "EG", name: "מצרים" },
      { code: "MA", name: "מרוקו" },
      { code: "TN", name: "תוניסיה" },
      { code: "QA", name: "קטאר" },
      { code: "BH", name: "בחריין" },
      { code: "KW", name: "כווית" },
      { code: "SA", name: "ערב הסעודית" },
      { code: "TR", name: "טורקיה" },
    ],
  },
  EU: {
    label: "אירופה",
    countries: [
      { code: "GB", name: "בריטניה" },
      { code: "DE", name: "גרמניה" },
      { code: "FR", name: "צרפת" },
      { code: "ES", name: "ספרד" },
      { code: "IT", name: "איטליה" },
      { code: "NL", name: "הולנד" },
      { code: "BE", name: "בלגיה" },
      { code: "PT", name: "פורטוגל" },
      { code: "SE", name: "שוודיה" },
      { code: "NO", name: "נורווגיה" },
      { code: "DK", name: "דנמרק" },
      { code: "FI", name: "פינלנד" },
      { code: "PL", name: "פולין" },
      { code: "CZ", name: "צ'כיה" },
      { code: "AT", name: "אוסטריה" },
      { code: "CH", name: "שווייץ" },
      { code: "IE", name: "אירלנד" },
      { code: "GR", name: "יוון" },
      { code: "RO", name: "רומניה" },
      { code: "HU", name: "הונגריה" },
      { code: "UA", name: "אוקראינה" },
    ],
  },
  NA: {
    label: "צפון אמריקה",
    countries: [
      { code: "US", name: "ארצות הברית" },
      { code: "CA", name: "קנדה" },
      { code: "MX", name: "מקסיקו" },
    ],
  },
  LATAM: {
    label: "אמריקה הלטינית",
    countries: [
      { code: "BR", name: "ברזיל" },
      { code: "AR", name: "ארגנטינה" },
      { code: "CL", name: "צ'ילה" },
      { code: "CO", name: "קולומביה" },
      { code: "PE", name: "פרו" },
      { code: "UY", name: "אורוגוואי" },
      { code: "EC", name: "אקוודור" },
      { code: "MX", name: "מקסיקו" },
    ],
  },
  AF: {
    label: "אפריקה",
    countries: [
      { code: "ZA", name: "דרום אפריקה" },
      { code: "NG", name: "ניגריה" },
      { code: "KE", name: "קניה" },
      { code: "GH", name: "גאנה" },
      { code: "EG", name: "מצרים" },
      { code: "MA", name: "מרוקו" },
    ],
  },
  AS: {
    label: "אסיה",
    countries: [
      { code: "IN", name: "הודו" },
      { code: "JP", name: "יפן" },
      { code: "KR", name: "דרום קוריאה" },
      { code: "ID", name: "אינדונזיה" },
      { code: "PH", name: "פיליפינים" },
      { code: "TH", name: "תאילנד" },
      { code: "VN", name: "וייטנאם" },
      { code: "SG", name: "סינגפור" },
      { code: "MY", name: "מלזיה" },
      { code: "TW", name: "טייוואן" },
      { code: "HK", name: "הונג קונג" },
    ],
  },
  OC: {
    label: "אוקיאניה",
    countries: [
      { code: "AU", name: "אוסטרליה" },
      { code: "NZ", name: "ניו זילנד" },
    ],
  },
  WORLD: {
    label: "עולמי (מדינות נבחרות)",
    countries: [
      { code: "US", name: "ארצות הברית" },
      { code: "GB", name: "בריטניה" },
      { code: "DE", name: "גרמניה" },
      { code: "FR", name: "צרפת" },
      { code: "BR", name: "ברזיל" },
      { code: "IN", name: "הודו" },
      { code: "MX", name: "מקסיקו" },
      { code: "JP", name: "יפן" },
      { code: "AU", name: "אוסטרליה" },
      { code: "IL", name: "ישראל" },
      { code: "CA", name: "קנדה" },
      { code: "ES", name: "ספרד" },
    ],
  },
};

export const CONTINENT_ORDER: ContinentKey[] = [
  "IL_FOCUS",
  "ME",
  "EU",
  "NA",
  "LATAM",
  "AF",
  "AS",
  "OC",
  "WORLD",
];
