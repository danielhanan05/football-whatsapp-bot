// ============================================================
// TV CHANNEL LINKS
// ============================================================
//
// 365Scores tells us WHICH Israeli TV channel broadcasts
// the game.
//
// This module maps the channel name to a URL.
//
// IMPORTANT:
// All URLs below are FAKE placeholders for testing only.
// ============================================================


const CHANNELS = {

    SPORT_1: {
        displayName: "Sport 1",
        url: "https://1nextbet7.tv/kanal-izle/yes-1"
    },

    SPORT_2: {
        displayName: "Sport 2",
        url: "https://1nextbet7.tv/kanal-izle/yes-2"
    },

    SPORT_3: {
        displayName: "Sport 3",
        url: "https://1nextbet7.tv/kanal-izle/yes-3"
    },

    SPORT_4: {
        displayName: "Sport 4",
        url: "https://1nextbet7.tv/kanal-izle/yes-4"
    },

    KAN_11: {
        displayName: "Kan 11",
        url: "https://1nextbet7.tv/kanal-izle/kan-11"
    },

    ONE: {
        displayName: "ONE",
        url: "https://1nextbet7.tv/kanal-izle/One-1"
    },

    SPORT_5_MAX: {
        displayName: "5 MAX",
        url: "https://1nextbet7.tv/kanal-izle/sport-5-max"
    },

    SPORT_5_STARS: {
        displayName: "5 STARS",
        url: "https://1nextbet7.tv/kanal-izle/yes-5-stars"
    },

    SPORT_5_GOLD: {
        displayName: "5 GOLD",
        url: "https://1nextbet7.tv/kanal-izle/yes-5-gold"
    },

    SPORT_5_PLUS: {
        displayName: "5 PLUS",
        url: "https://1nextbet7.tv/kanal-izle/yes-5-plus"
    },

    SPORT_5_LIVE: {
        displayName: "5 LIVE",
        url: "https://1nextbet7.tv/kanal-izle/yes-5-live"
    },

    SPORT_5: {
        displayName: "Sport 5",
        url: "https://1nextbet7.tv/kanal-izle/yes-5"
    }
};


// ============================================================
// NORMALIZATION
// ============================================================

function normalizeChannelName(name) {

    if (
        typeof name !== "string" ||
        !name.trim()
    ) {
        return "";
    }


    return name
        .trim()
        .toLowerCase()

        // Normalize different quotation marks
        .replace(/[״“”]/g, "\"")
        .replace(/[׳‘’]/g, "'")

        // Remove unnecessary repeated spaces
        .replace(/\s+/g, " ");
}


// ============================================================
// CHANNEL ALIASES
// ============================================================
//
// 365Scores may return names in English or Hebrew,
// or slightly different spellings.
//
// Every known variant maps to one internal channel ID.
// ============================================================

const CHANNEL_ALIASES = new Map([

    // ========================================================
    // SPORT 1
    // ========================================================

    ["sport 1", "SPORT_1"],
    ["sport1", "SPORT_1"],
    ["ספורט 1", "SPORT_1"],


    // ========================================================
    // SPORT 2
    // ========================================================

    ["sport 2", "SPORT_2"],
    ["sport2", "SPORT_2"],
    ["ספורט 2", "SPORT_2"],


    // ========================================================
    // SPORT 3
    // ========================================================

    ["sport 3", "SPORT_3"],
    ["sport3", "SPORT_3"],
    ["ספורט 3", "SPORT_3"],


    // ========================================================
    // SPORT 4
    // ========================================================

    ["sport 4", "SPORT_4"],
    ["sport4", "SPORT_4"],
    ["ספורט 4", "SPORT_4"],


    // ========================================================
    // KAN 11
    // ========================================================

    ["kan 11", "KAN_11"],
    ["kan11", "KAN_11"],
    ["kan", "KAN_11"],
    ["כאן 11", "KAN_11"],
    ["כאן11", "KAN_11"],


    // ========================================================
    // ONE
    // ========================================================

    ["one", "ONE"],
    ["one 1", "ONE"],
    ["one1", "ONE"],
    ["one channel", "ONE"],
    ["ערוץ one", "ONE"],


    // ========================================================
    // 5 MAX
    // ========================================================

    ["5 max", "SPORT_5_MAX"],
    ["5max", "SPORT_5_MAX"],
    ["sport 5 max", "SPORT_5_MAX"],
    ["sport5 max", "SPORT_5_MAX"],
    ["sport5max", "SPORT_5_MAX"],
    ["55 max", "SPORT_5_MAX"],
    ["55max", "SPORT_5_MAX"],
    ["5 מקס", "SPORT_5_MAX"],
    ["55 מקס", "SPORT_5_MAX"],
    ["ספורט 5 מקס", "SPORT_5_MAX"],


    // ========================================================
    // 5 STARS
    // ========================================================

    ["5 stars", "SPORT_5_STARS"],
    ["5stars", "SPORT_5_STARS"],
    ["sport 5 stars", "SPORT_5_STARS"],
    ["sport5 stars", "SPORT_5_STARS"],
    ["sport5stars", "SPORT_5_STARS"],
    ["5 סטארס", "SPORT_5_STARS"],
    ["ספורט 5 סטארס", "SPORT_5_STARS"],


    // ========================================================
    // 5 GOLD
    // ========================================================

    ["5 gold", "SPORT_5_GOLD"],
    ["5gold", "SPORT_5_GOLD"],
    ["sport 5 gold", "SPORT_5_GOLD"],
    ["sport5 gold", "SPORT_5_GOLD"],
    ["sport5gold", "SPORT_5_GOLD"],
    ["5 גולד", "SPORT_5_GOLD"],
    ["ספורט 5 גולד", "SPORT_5_GOLD"],


    // ========================================================
    // 5 PLUS
    // ========================================================

    ["5 plus", "SPORT_5_PLUS"],
    ["5plus", "SPORT_5_PLUS"],
    ["5+", "SPORT_5_PLUS"],
    ["sport 5 plus", "SPORT_5_PLUS"],
    ["sport5 plus", "SPORT_5_PLUS"],
    ["sport5plus", "SPORT_5_PLUS"],
    ["5 פלוס", "SPORT_5_PLUS"],
    ["ספורט 5 פלוס", "SPORT_5_PLUS"],


    // ========================================================
    // 5 LIVE
    // ========================================================

    ["5 live", "SPORT_5_LIVE"],
    ["5live", "SPORT_5_LIVE"],
    ["sport 5 live", "SPORT_5_LIVE"],
    ["sport5 live", "SPORT_5_LIVE"],
    ["sport5live", "SPORT_5_LIVE"],
    ["5 לייב", "SPORT_5_LIVE"],
    ["ספורט 5 לייב", "SPORT_5_LIVE"],


    // ========================================================
    // SPORT 5 / CHANNEL 55
    // ========================================================

    ["sport 5", "SPORT_5"],
    ["sport5", "SPORT_5"],

    ["5 sport", "SPORT_5"],

    ["channel 5", "SPORT_5"],
    ["channel 55", "SPORT_5"],

    ["55", "SPORT_5"],
    ["ערוץ 55", "SPORT_5"],

    ["ספורט 5", "SPORT_5"],
    ["ערוץ הספורט", "SPORT_5"]
]);


// ============================================================
// SINGLE CHANNEL LOOKUP
// ============================================================

function getChannelLink(channelName) {

    const normalized =
        normalizeChannelName(
            channelName
        );


    if (!normalized) {
        return null;
    }


    const channelId =
        CHANNEL_ALIASES.get(
            normalized
        );


    if (!channelId) {
        return null;
    }


    const channel =
        CHANNELS[
            channelId
        ];


    if (!channel) {
        return null;
    }


    return {
        id: channelId,
        displayName: channel.displayName,
        url: channel.url
    };
}


// ============================================================
// MULTIPLE CHANNEL LOOKUP
// ============================================================

function getLinksForChannels(channelNames) {

    if (
        !Array.isArray(
            channelNames
        )
    ) {
        return [];
    }


    const results = [];
    const seen = new Set();


    for (
        const channelName
        of channelNames
    ) {

        const match =
            getChannelLink(
                channelName
            );


        if (!match) {
            continue;
        }


        /*
            Example:
            365Scores could theoretically return both
            "Sport 5" and "ספורט 5".

            They both point to the same internal channel,
            so only return the link once.
        */

        if (
            seen.has(
                match.id
            )
        ) {
            continue;
        }


        seen.add(
            match.id
        );


        results.push(
            match
        );
    }


    return results;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getChannelLink,
    getLinksForChannels
};