const {
    BOT,
    COMPETITIONS,
    INCLUDED_COMPETITION_IDS,
    NETWORK
} = require("./config");


const {
    getLinksForChannels
} = require("./channels");


const BASE_URL =
    "https://webws.365scores.com";


// ============================================================
// CACHE
// ============================================================

const cache =
    new Map();


const inflightRequests =
    new Map();


function getCached(key) {

    const item =
        cache.get(key);


    if (!item) {
        return null;
    }


    if (
        Date.now() >
        item.expiresAt
    ) {

        cache.delete(key);

        return null;
    }


    return item.value;
}


function setCached(
    key,
    value,
    ttlMs
) {

    cache.set(
        key,
        {
            value,

            expiresAt:
                Date.now() +
                ttlMs
        }
    );
}


// ============================================================
// REQUEST DEDUPLICATION
// ============================================================

async function deduplicatedRequest(
    key,
    callback
) {

    /*
        If multiple users request the exact same data
        at the same time, they all wait for the same
        Promise instead of creating duplicate API calls.
    */

    if (
        inflightRequests.has(
            key
        )
    ) {

        return inflightRequests.get(
            key
        );
    }


    const promise =
        callback()
            .finally(
                () => {

                    inflightRequests.delete(
                        key
                    );
                }
            );


    inflightRequests.set(
        key,
        promise
    );


    return promise;
}


// ============================================================
// GLOBAL API REQUEST QUEUE
// ============================================================

let requestQueue =
    Promise.resolve();


let lastApiRequestAt =
    0;


function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


function queueApiRequest(
    callback
) {

    const execute =
        async () => {

            const elapsed =
                Date.now() -
                lastApiRequestAt;


            const waitTime =
                Math.max(
                    0,

                    NETWORK.minimumApiRequestGapMs -
                    elapsed
                );


            if (
                waitTime >
                0
            ) {

                await wait(
                    waitTime
                );
            }


            lastApiRequestAt =
                Date.now();


            return callback();
        };


    /*
        execute is supplied for both fulfilled and rejected
        states so one failed API call doesn't break the queue.
    */

    const result =
        requestQueue.then(
            execute,
            execute
        );


    requestQueue =
        result.catch(
            () => {}
        );


    return result;
}


// ============================================================
// 365SCORES HTTP
// ============================================================

async function fetch365(
    path,
    params = {}
) {

    return queueApiRequest(
        async () => {

            const url =
                new URL(
                    `${BASE_URL}${path}`
                );


            const finalParams = {

                appTypeId:
                    BOT.appTypeId,

                langId:
                    BOT.langId,

                timezoneName:
                    BOT.timezone,

                userCountryId:
                    BOT.countryId,

                ...params
            };


            for (
                const [key, value]
                of Object.entries(
                    finalParams
                )
            ) {

                if (
                    value !== undefined &&
                    value !== null
                ) {

                    url.searchParams.set(
                        key,
                        String(value)
                    );
                }
            }


            const controller =
                new AbortController();


            const timeout =
                setTimeout(
                    () =>
                        controller.abort(),

                    NETWORK.requestTimeoutMs
                );


            try {

                const response =
                    await fetch(
                        url,
                        {
                            signal:
                                controller.signal,

                            headers: {

                                Accept:
                                    "application/json",

                                "User-Agent":
                                    "Mozilla/5.0"
                            }
                        }
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        `365Scores HTTP ${response.status}`
                    );
                }


                return await response.json();

            } catch (error) {

                if (
                    error.name ===
                    "AbortError"
                ) {

                    throw new Error(
                        "365Scores request timed out"
                    );
                }


                throw error;

            } finally {

                clearTimeout(
                    timeout
                );
            }
        }
    );
}


// ============================================================
// DATE HELPERS
// ============================================================

function getIsraelDate(
    daysFromToday = 0
) {

    const now =
        new Date();


    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    BOT.timezone,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        )
            .formatToParts(
                now
            );


    const year =
        Number(
            parts.find(
                part =>
                    part.type ===
                    "year"
            ).value
        );


    const month =
        Number(
            parts.find(
                part =>
                    part.type ===
                    "month"
            ).value
        );


    const day =
        Number(
            parts.find(
                part =>
                    part.type ===
                    "day"
            ).value
        );


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day +
                    daysFromToday
            )
        );


    const dd =
        String(
            date.getUTCDate()
        ).padStart(
            2,
            "0"
        );


    const mm =
        String(
            date.getUTCMonth() +
            1
        ).padStart(
            2,
            "0"
        );


    return (
        `${dd}/${mm}/${date.getUTCFullYear()}`
    );
}


// ============================================================
// FORMATTERS
// ============================================================

function formatTime(
    dateString
) {

    if (!dateString) {
        return "??:??";
    }


    return new Intl.DateTimeFormat(
        "he-IL",
        {
            timeZone:
                BOT.timezone,

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false
        }
    ).format(
        new Date(
            dateString
        )
    );
}


function formatDate(
    dateString
) {

    if (!dateString) {
        return "תאריך לא ידוע";
    }


    return new Intl.DateTimeFormat(
        "he-IL",
        {
            timeZone:
                BOT.timezone,

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"
        }
    ).format(
        new Date(
            dateString
        )
    );
}


function homeName(game) {

    return (
        game.homeCompetitor
            ?.name ||
        "לא ידוע"
    );
}


function awayName(game) {

    return (
        game.awayCompetitor
            ?.name ||
        "לא ידוע"
    );
}


function competitionName(
    game
) {

    const configured =
        COMPETITIONS[
            Number(
                game.competitionId
            )
        ];


    if (configured) {

        return configured.name;
    }


    return (
        game.competitionDisplayName ||
        game.competitionName ||
        "מפעל לא ידוע"
    );
}


function sortGames(
    games
) {

    return [
        ...games
    ].sort(
        (a, b) =>

            new Date(
                a.startTime
            ) -

            new Date(
                b.startTime
            )
    );
}


// ============================================================
// GAMES BY DATE
// ============================================================

async function getGamesByDate(
    date
) {

    const cacheKey =
        `games:${date}`;


    const cached =
        getCached(
            cacheKey
        );


    if (cached) {
        return cached;
    }


    return deduplicatedRequest(
        cacheKey,

        async () => {

            const data =
                await fetch365(
                    "/web/games/allscores/",
                    {
                        sports:
                            1,

                        startDate:
                            date,

                        endDate:
                            date,

                        showOdds:
                            false,

                        onlyMajorGames:
                            false,

                        withTop:
                            true
                    }
                );


            const games =
                Array.isArray(
                    data.games
                )
                    ? data.games
                    : [];


            setCached(
                cacheKey,
                games,
                NETWORK.gamesCacheMs
            );


            return games;
        }
    );
}


async function getIncludedGames(
    date
) {

    const games =
        await getGamesByDate(
            date
        );


    return games.filter(
        game =>

            INCLUDED_COMPETITION_IDS.has(
                Number(
                    game.competitionId
                )
            )
    );
}


// ============================================================
// GROUPING
// ============================================================

function groupGames(
    games
) {

    const groups =
        new Map();


    for (
        const game
        of games
    ) {

        const competitionId =
            Number(
                game.competitionId
            );


        if (
            !groups.has(
                competitionId
            )
        ) {

            groups.set(
                competitionId,
                []
            );
        }


        groups
            .get(
                competitionId
            )
            .push(
                game
            );
    }


    return [
        ...groups.entries()
    ].sort(
        (
            [idA],
            [idB]
        ) => {

            const priorityA =
                COMPETITIONS[idA]
                    ?.priority ??
                999;


            const priorityB =
                COMPETITIONS[idB]
                    ?.priority ??
                999;


            return (
                priorityA -
                priorityB
            );
        }
    );
}


// ============================================================
// TEAM FIXTURES
// ============================================================

async function getUpcomingGames(
    teamId
) {

    const cacheKey =
        `fixtures:${teamId}`;


    const cached =
        getCached(
            cacheKey
        );


    if (cached) {
        return cached;
    }


    return deduplicatedRequest(
        cacheKey,

        async () => {

            const data =
                await fetch365(
                    "/web/games/fixtures/",
                    {
                        competitors:
                            teamId,

                        showOdds:
                            false
                    }
                );


            const games =
                Array.isArray(
                    data.games
                )
                    ? data.games
                    : [];


            setCached(
                cacheKey,
                games,
                NETWORK.fixturesCacheMs
            );


            return games;
        }
    );
}


// ============================================================
// GAME DETAILS
// ============================================================

async function requestGameDetails(
    game,
    matchupId
) {

    const params = {

        gameId:
            game.id,

        topBookmaker:
            1
    };


    if (
        matchupId
    ) {

        params.matchupId =
            matchupId;
    }


    const data =
        await fetch365(
            "/web/game/",
            params
        );


    return (
        data.game ||
        null
    );
}


async function getGameDetails(
    game
) {

    const cacheKey =
        `game:${game.id}`;


    const cached =
        getCached(
            cacheKey
        );


    if (cached) {
        return cached;
    }


    return deduplicatedRequest(
        cacheKey,

        async () => {

            let details =
                null;


            // =================================================
            // Attempt 1: gameId only
            // =================================================

            try {

                details =
                    await requestGameDetails(
                        game
                    );

            } catch {
                // Try next strategy
            }


            // =================================================
            // Attempt 2: matchupId supplied by 365Scores
            // =================================================

            if (
                !details &&
                game.matchupId
            ) {

                try {

                    details =
                        await requestGameDetails(
                            game,
                            game.matchupId
                        );

                } catch {
                    // Try next strategy
                }
            }


            // =================================================
            // Attempt 3: Construct matchupId
            // =================================================

            if (!details) {

                const homeId =
                    game.homeCompetitor
                        ?.id;


                const awayId =
                    game.awayCompetitor
                        ?.id;


                const competitionId =
                    game.competitionId;


                if (
                    homeId &&
                    awayId &&
                    competitionId
                ) {

                    const candidates = [

                        `${homeId}-${awayId}-${competitionId}`,

                        `${awayId}-${homeId}-${competitionId}`
                    ];


                    for (
                        const matchupId
                        of candidates
                    ) {

                        try {

                            details =
                                await requestGameDetails(
                                    game,
                                    matchupId
                                );


                            if (
                                details
                            ) {
                                break;
                            }

                        } catch {
                            // Try next candidate
                        }
                    }
                }
            }


            if (
                !details
            ) {

                throw new Error(
                    `Unable to load details for game ${game.id}`
                );
            }


            setCached(
                cacheKey,
                details,
                NETWORK.gameDetailsCacheMs
            );


            return details;
        }
    );
}


// ============================================================
// TV CHANNELS
// ============================================================

async function getIsraeliTVChannels(
    game
) {

    /*
        If the fixtures/allScores response explicitly says
        this game has no TV networks, don't waste another
        request on /web/game/.
    */

    if (
        game.hasTVNetworks ===
        false
    ) {

        return [];
    }


    const details =
        await getGameDetails(
            game
        );


    const networks =
        Array.isArray(
            details.tvNetworks
        )
            ? details.tvNetworks
            : [];


    return [
        ...new Set(

            networks

                .filter(
                    network => {

                        return (
                            !network.countryId ||
                            Number(
                                network.countryId
                            ) ===
                                BOT.countryId
                        );
                    }
                )

                .map(
                    network =>
                        network.name
                )

                .filter(
                    Boolean
                )
        )
    ];
}


// ============================================================
// !today / !tomorrow
// ============================================================

async function buildDailyGamesMessage(
    daysFromToday,
    title
) {

    const date =
        getIsraelDate(
            daysFromToday
        );


    const games =
        sortGames(
            await getIncludedGames(
                date
            )
        );


    if (
        games.length ===
        0
    ) {

        return (
            `⚽ אין ${title} משחקים במפעלים שהבוט עוקב אחריהם.`
        );
    }


    const groups =
        groupGames(
            games
        );


    const output = [

        `⚽ *משחקי ${title}*`,

        ""
    ];


    for (
        const [
            competitionId,
            competitionGames
        ]
        of groups
    ) {

        const config =
            COMPETITIONS[
                competitionId
            ];


        output.push(
            `${config?.emoji || "🏆"} *${config?.name || competitionName(competitionGames[0])}*`
        );


        for (
            const game
            of sortGames(
                competitionGames
            )
        ) {

            output.push(
                `${formatTime(game.startTime)} | ${homeName(game)} - ${awayName(game)}`
            );
        }


        output.push(
            ""
        );
    }


    return output
        .join(
            "\n"
        )
        .trim();
}


async function today() {

    return buildDailyGamesMessage(
        0,
        "היום"
    );
}


async function tomorrow() {

    return buildDailyGamesMessage(
        1,
        "מחר"
    );
}


// ============================================================
// !link
// ============================================================

async function link() {

    const date =
        getIsraelDate(
            0
        );


    const games =
        sortGames(
            await getIncludedGames(
                date
            )
        );


    if (
        games.length ===
        0
    ) {

        return (
            "📺 אין היום משחקים במפעלים שהבוט עוקב אחריהם."
        );
    }


    const groups =
        groupGames(
            games
        );


    const output = [

        "📺 *משחקי היום ושידורים*",

        ""
    ];


    /*
        We deliberately process games sequentially.

        This prevents !link from generating a large
        simultaneous burst of requests to 365Scores.
    */

    for (
        const [
            competitionId,
            competitionGames
        ]
        of groups
    ) {

        const competitionConfig =
            COMPETITIONS[
                competitionId
            ];


        output.push(
            `${competitionConfig?.emoji || "🏆"} *${competitionConfig?.name || competitionName(competitionGames[0])}*`
        );


        for (
            const game
            of sortGames(
                competitionGames
            )
        ) {

            let channels =
                [];


            try {

                channels =
                    await getIsraeliTVChannels(
                        game
                    );

            } catch (error) {

                console.error(
                    `[365 TV] game=${game.id}`,
                    error.message
                );
            }


            output.push(
                `⚽ ${formatTime(game.startTime)} | ${homeName(game)} - ${awayName(game)}`
            );


            // =================================================
            // NO TV CHANNEL FOUND
            // =================================================

            if (
                channels.length ===
                0
            ) {

                output.push(
                    "📺 לא נמצא ערוץ שידור בישראל"
                );

                output.push(
                    "🔗 לא נמצא קישור למשחק"
                );

                output.push(
                    ""
                );

                continue;
            }


            // =================================================
            // TV CHANNELS
            // =================================================

            output.push(
                `📺 ${channels.join(", ")}`
            );


            // =================================================
            // MAP TV CHANNEL -> TEST URL
            // =================================================

            const links =
                getLinksForChannels(
                    channels
                );


            if (
                links.length ===
                0
            ) {

                output.push(
                    "🔗 לא נמצא קישור למשחק"
                );

            } else if (
                links.length ===
                1
            ) {

                output.push(
                    `🔗 ${links[0].url}`
                );

            } else {

                /*
                    Rare case:
                    game broadcasts on multiple supported
                    channels.
                */

                for (
                    const link
                    of links
                ) {

                    output.push(
                        `🔗 ${link.displayName}: ${link.url}`
                    );
                }
            }


            output.push(
                ""
            );
        }
    }


    return output
        .join(
            "\n"
        )
        .trim();
}


// ============================================================
// TEAM FIXTURES
// ============================================================

async function teamFixtures(
    teamId,
    displayName
) {

    const games =
        sortGames(
            await getUpcomingGames(
                teamId
            )
        );


    if (
        games.length ===
        0
    ) {

        return (
            `⚽ לא נמצאו משחקים קרובים עבור ${displayName}.`
        );
    }


    const blocks =
        games.map(
            game => {

                return [

                    `📅 ${formatDate(game.startTime)} | ${formatTime(game.startTime)}`,

                    `⚽ ${homeName(game)} - ${awayName(game)}`,

                    `🏆 ${competitionName(game)}`
                ]

                    .filter(
                        Boolean
                    )

                    .join(
                        "\n"
                    );
            }
        );


    return [

        `⚽ *המשחקים הקרובים של ${displayName}*`,

        "",

        blocks.join(
            "\n\n"
        )
    ]
        .join(
            "\n"
        );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    today,
    tomorrow,
    link,
    teamFixtures
};