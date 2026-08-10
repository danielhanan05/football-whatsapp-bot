// ============================================================
// 365SCORES / BOT CONFIGURATION
// ============================================================

const BOT = {
    name: "Football Bot",

    timezone: "Asia/Jerusalem",

    countryId: 6,

    appTypeId: 5,

    // 2 = Hebrew in the endpoints we've been using
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
        priority: 4
    },

    573: {
        id: 573,
        name: "הליגה האירופית",
        emoji: "🟠",
        priority: 5
    },

    7685: {
        id: 7685,
        name: "קונפרנס ליג",
        emoji: "🟢",
        priority: 6
    },

    7: {
        id: 7,
        name: "פרמייר ליג",
        emoji: "🏴",
        priority: 7
    },

    11: {
        id: 11,
        name: "לה ליגה",
        emoji: "🇪🇸",
        priority: 8
    },

    25: {
        id: 25,
        name: "בונדסליגה",
        emoji: "🇩🇪",
        priority: 9
    },

    17: {
        id: 17,
        name: "סרייה A",
        emoji: "🇮🇹",
        priority: 10
    }
};


const INCLUDED_COMPETITION_IDS =
    new Set(
        Object.keys(COMPETITIONS)
            .map(Number)
    );


// ============================================================
// ISRAELI PREMIER LEAGUE TEAMS
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
// RATE LIMIT SETTINGS
// ============================================================

const RATE_LIMIT = {

    // Same person can't execute commands faster than this
    userCooldownMs: 5000,

    // Maximum successful commands by one person per minute
    userMaxPerMinute: 6,

    // Maximum successful commands in one group/chat per minute
    chatMaxPerMinute: 10,

    // Don't spam rate-limit warning messages either
    warningCooldownMs: 5000
};


// ============================================================
// CACHE / NETWORK
// ============================================================

const NETWORK = {

    requestTimeoutMs: 10000,

    gamesCacheMs: 2 * 60 * 1000,

    fixturesCacheMs: 5 * 60 * 1000,

    gameDetailsCacheMs: 2 * 60 * 1000,

    /*
        Global delay between 365Scores requests.

        This deliberately makes !link a little slower,
        but prevents a burst of dozens of requests.
    */
    minimumApiRequestGapMs: 150
};


module.exports = {
    BOT,

    COMPETITIONS,
    INCLUDED_COMPETITION_IDS,

    TEAM_COMMANDS,

    RATE_LIMIT,

    NETWORK
};