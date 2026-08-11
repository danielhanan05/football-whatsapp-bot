// ============================================================
// BOT / 365SCORES CONFIGURATION
// ============================================================

const BOT = {
    name: "Football Bot",
    timezone: "Asia/Jerusalem",
    countryId: 6,
    appTypeId: 5,
    langId: 2
};


// ============================================================
// COMPETITIONS INCLUDED IN !today / !tomorrow / !link
// ============================================================

const COMPETITIONS = {

    42: {
        id: 42,
        name: "ליגת העל",
        emoji: "🇮🇱",
        priority: 1
    },

    546: {
        id: 546,
        name: "גביע הטוטו",
        emoji: "🇮🇱",
        priority: 2
    },

    49: {
        id: 49,
        name: "גביע המדינה",
        emoji: "🏆",
        priority: 3
    },

    332: {
        id: 332,
        name: "מוקדמות ליגת האלופות",
        emoji: "⭐",
        priority: 4
    },

    572: {
        id: 572,
        name: "ליגת האלופות",
        emoji: "⭐",
        priority: 5
    },

    573: {
        id: 573,
        name: "הליגה האירופית",
        emoji: "🟠",
        priority: 6
    },

    7685: {
        id: 7685,
        name: "קונפרנס ליג",
        emoji: "🟢",
        priority: 7
    },

    7: {
        id: 7,
        name: "פרמייר ליג",
        emoji: "🏴",
        priority: 8
    },

    11: {
        id: 11,
        name: "לה ליגה",
        emoji: "🇪🇸",
        priority: 9
    },

    25: {
        id: 25,
        name: "בונדסליגה",
        emoji: "🇩🇪",
        priority: 10
    },

    17: {
        id: 17,
        name: "סרייה A",
        emoji: "🇮🇹",
        priority: 11
    }
};


const INCLUDED_COMPETITION_IDS =
    new Set(
        Object.keys(COMPETITIONS).map(Number)
    );


// ============================================================
// LEAGUES AVAILABLE FOR DYNAMIC TEAM SEARCH
// ============================================================
//
// Commands such as:
//
// !chelsea
// !manchester united
// !barcelona
// !bayern munich
// !inter
//
// are resolved dynamically from the current league standings.
// No individual European team IDs are hard-coded.
// ============================================================

const DYNAMIC_TEAM_LEAGUES = [

    {
        competitionId: 7,
        name: "Premier League"
    },

    {
        competitionId: 11,
        name: "La Liga"
    },

    {
        competitionId: 25,
        name: "Bundesliga"
    },

    {
        competitionId: 17,
        name: "Serie A"
    }
];


// ============================================================
// ISRAELI PREMIER LEAGUE COMMAND ALIASES
// ============================================================
//
// These remain as convenient short commands.
//
// European teams are NOT stored here.
// ============================================================

const TEAM_COMMANDS = {

    "!hapoel": {
        id: 567,
        name: "הפועל תל אביב"
    },

    "!mta": {
        id: 566,
        name: "מכבי תל אביב"
    },

    "!mhaifa": {
        id: 562,
        name: "מכבי חיפה"
    },

    "!beitar": {
        id: 559,
        name: "בית״ר ירושלים"
    },

    "!hbs": {
        id: 579,
        name: "הפועל באר שבע"
    },

    "!hhaifa": {
        id: 575,
        name: "הפועל חיפה"
    },

    "!hjerusalem": {
        id: 614,
        name: "הפועל ירושלים"
    },

    "!netanya": {
        id: 560,
        name: "מכבי נתניה"
    },

    "!sakhnin": {
        id: 561,
        name: "בני סכנין"
    },

    "!tiberias": {
        id: 606,
        name: "עירוני טבריה"
    },

    "!kiryatshmona": {
        id: 563,
        name: "עירוני קריית שמונה"
    },

    "!hpt": {
        id: 571,
        name: "הפועל פתח תקווה"
    },

    "!mpt": {
        id: 564,
        name: "מכבי פתח תקווה"
    },

    "!hrg": {
        id: 574,
        name: "הפועל רמת גן"
    }
};


// ============================================================
// RATE LIMIT
// ============================================================

const RATE_LIMIT = {

    userCooldownMs: 5000,

    userMaxPerMinute: 6,

    chatMaxPerMinute: 10,

    warningCooldownMs: 5000
};


// ============================================================
// NETWORK / CACHE
// ============================================================

const NETWORK = {

    requestTimeoutMs: 10000,

    gamesCacheMs:
        2 * 60 * 1000,

    fixturesCacheMs:
        5 * 60 * 1000,

    gameDetailsCacheMs:
        2 * 60 * 1000,

    /*
        League membership changes extremely rarely.

        12 hours avoids repeatedly downloading standings
        while still refreshing automatically.
    */
    teamDirectoryCacheMs:
        12 * 60 * 60 * 1000,

    /*
        Minimum delay between calls to 365Scores.

        All calls use the global request queue in
        scores365.js.
    */
    minimumApiRequestGapMs:
        150
};


module.exports = {

    BOT,

    COMPETITIONS,
    INCLUDED_COMPETITION_IDS,

    DYNAMIC_TEAM_LEAGUES,

    TEAM_COMMANDS,

    RATE_LIMIT,

    NETWORK
};