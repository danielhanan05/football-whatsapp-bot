const {
    BOT,
    COMPETITIONS,
    INCLUDED_COMPETITION_IDS,
    DYNAMIC_TEAM_LEAGUES,
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
                Date.now() + ttlMs
        }
    );
}


// ============================================================
// REQUEST DEDUPLICATION
// ============================================================
//
// If multiple users request the same resource at the same
// time, only one network request is made.
// ============================================================

async function deduplicatedRequest(
    key,
    callback
) {

    if (
        inflightRequests.has(key)
    ) {

        return inflightRequests.get(key);
    }


    const promise =
        callback()
            .finally(
                () => {
                    inflightRequests.delete(key);
                }
            );


    inflightRequests.set(
        key,
        promise
    );


    return promise;
}


// ============================================================
// GLOBAL 365SCORES REQUEST QUEUE
// ============================================================
//
// ALL calls to 365Scores go through this queue.
//
// This prevents:
// - !link from firing dozens of requests simultaneously
// - dynamic team discovery from creating a burst
// - multiple users from hammering the API at once
// ============================================================

let requestQueue =
    Promise.resolve();


let lastApiRequestAt =
    0;


function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(resolve, ms)
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


            if (waitTime > 0) {

                await wait(waitTime);
            }


            lastApiRequestAt =
                Date.now();


            return callback();
        };


    const result =
        requestQueue.then(
            execute,
            execute
        );


    /*
        Keep the queue alive even when one API call fails.
    */
    requestQueue =
        result.catch(() => {});


    return result;
}


// ============================================================
// HTTP
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
                of Object.entries(finalParams)
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
                    () => controller.abort(),
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


                if (!response.ok) {

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

                clearTimeout(timeout);
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
            .formatToParts(now);


    const year =
        Number(
            parts.find(
                part =>
                    part.type === "year"
            ).value
        );


    const month =
        Number(
            parts.find(
                part =>
                    part.type === "month"
            ).value
        );


    const day =
        Number(
            parts.find(
                part =>
                    part.type === "day"
            ).value
        );


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day + daysFromToday
            )
        );


    const dd =
        String(
            date.getUTCDate()
        ).padStart(2, "0");


    const mm =
        String(
            date.getUTCMonth() + 1
        ).padStart(2, "0");


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
        new Date(dateString)
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
        new Date(dateString)
    );
}


function homeName(game) {

    return (
        game.homeCompetitor?.name ||
        "לא ידוע"
    );
}


function awayName(game) {

    return (
        game.awayCompetitor?.name ||
        "לא ידוע"
    );
}


function competitionName(game) {

    const configured =
        COMPETITIONS[
            Number(game.competitionId)
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


function sortGames(games) {

    return [...games]
        .sort(
            (a, b) =>
                new Date(a.startTime) -
                new Date(b.startTime)
        );
}


// ============================================================
// DAILY GAMES
// ============================================================

async function getGamesByDate(
    date
) {

    const cacheKey =
        `games:${date}`;


    const cached =
        getCached(cacheKey);


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
                        sports: 1,

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
                Array.isArray(data.games)
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
        await getGamesByDate(date);


    return games.filter(
        game =>
            INCLUDED_COMPETITION_IDS.has(
                Number(game.competitionId)
            )
    );
}


// ============================================================
// GROUP GAMES BY COMPETITION
// ============================================================

function groupGames(games) {

    const groups =
        new Map();


    for (const game of games) {

        const competitionId =
            Number(game.competitionId);


        if (
            !groups.has(competitionId)
        ) {

            groups.set(
                competitionId,
                []
            );
        }


        groups
            .get(competitionId)
            .push(game);
    }


    return [
        ...groups.entries()
    ]
        .sort(
            ([idA], [idB]) => {

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
        getCached(cacheKey);


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
                Array.isArray(data.games)
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
// DYNAMIC EUROPEAN TEAM DIRECTORY
// ============================================================

function normalizeTeamName(value) {

    if (
        typeof value !== "string"
    ) {
        return "";
    }


    return value

        /*
            Convert accented characters where possible.
            Example: fútbol -> futbol
        */
        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .replace(
            /&/g,
            " and "
        )

        /*
            Hyphens and punctuation should not prevent
            a user from finding a club.
        */
        .replace(
            /[-_.']/g,
            " "
        )

        .replace(
            /[^a-z0-9\s]/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
}


// ------------------------------------------------------------
// Remove generic club prefixes/suffixes ONLY for matching.
//
// Examples:
//
// Chelsea FC     -> Chelsea
// FC Barcelona   -> Barcelona
// AFC Bournemouth -> Bournemouth
// AC Milan       -> Milan
//
// We still also preserve the original aliases.
// ------------------------------------------------------------

const GENERIC_CLUB_TOKENS =
    new Set([
        "fc",
        "afc",
        "cf",
        "cfc",
        "ac",
        "ssc"
    ]);


function stripGenericClubTokens(
    value
) {

    const normalized =
        normalizeTeamName(value);


    if (!normalized) {
        return "";
    }


    const words =
        normalized.split(" ");


    while (
        words.length > 1 &&
        GENERIC_CLUB_TOKENS.has(
            words[0]
        )
    ) {

        words.shift();
    }


    while (
        words.length > 1 &&
        GENERIC_CLUB_TOKENS.has(
            words[
                words.length - 1
            ]
        )
    ) {

        words.pop();
    }


    return words.join(" ");
}


// ============================================================
// LOAD ONE LEAGUE'S CURRENT TEAMS
// ============================================================

async function getLeagueTeams(
    competitionId
) {

    const cacheKey =
        `league-teams:${competitionId}`;


    const cached =
        getCached(cacheKey);


    if (cached) {
        return cached;
    }


    return deduplicatedRequest(
        cacheKey,

        async () => {

            const data =
                await fetch365(
                    "/web/standings/",
                    {
                        competitions:
                            competitionId,

                        live:
                            false,

                        withSeasonsFilter:
                            true
                    }
                );


            const standings =
                Array.isArray(
                    data.standings
                )
                    ? data.standings
                    : [];


            /*
                Prefer the current stage of the requested
                competition.

                Fallback to any matching standing if the
                API does not mark a current stage.
            */

            const relevantStandings =
                standings.filter(
                    standing =>
                        Number(
                            standing.competitionId
                        ) ===
                            Number(
                                competitionId
                            )
                );


            const currentStanding =
                relevantStandings.find(
                    standing =>
                        standing.isCurrentStage
                ) ||
                relevantStandings[0];


            if (
                !currentStanding ||
                !Array.isArray(
                    currentStanding.rows
                )
            ) {

                return [];
            }


            const teams =
                currentStanding.rows

                    .map(
                        row =>
                            row.competitor
                    )

                    .filter(
                        competitor =>
                            competitor &&
                            competitor.id &&
                            competitor.name
                    )

                    .map(
                        competitor => ({
                            id:
                                Number(
                                    competitor.id
                                ),

                            name:
                                competitor.name,

                            shortName:
                                competitor.shortName ||
                                "",

                            longName:
                                competitor.longName ||
                                "",

                            nameForURL:
                                competitor.nameForURL ||
                                "",

                            competitionId:
                                Number(
                                    competitionId
                                )
                        })
                    );


            setCached(
                cacheKey,
                teams,
                NETWORK.teamDirectoryCacheMs
            );


            return teams;
        }
    );
}


// ============================================================
// BUILD SEARCH INDEX
// ============================================================

function createTeamAliases(team) {

    const aliases =
        new Set();


    const values = [
        team.name,
        team.shortName,
        team.longName,
        team.nameForURL
    ];


    for (
        const value
        of values
    ) {

        if (!value) {
            continue;
        }


        const normalized =
            normalizeTeamName(value);


        const stripped =
            stripGenericClubTokens(
                value
            );


        if (normalized) {
            aliases.add(normalized);
        }


        if (stripped) {
            aliases.add(stripped);
        }
    }


    return [
        ...aliases
    ];
}


function buildTeamDirectory(
    teams
) {

    const aliasMap =
        new Map();


    const teamsById =
        new Map();


    for (
        const team
        of teams
    ) {

        /*
            The same team should only exist once in
            the final directory.
        */

        if (
            teamsById.has(
                team.id
            )
        ) {
            continue;
        }


        teamsById.set(
            team.id,
            team
        );


        const aliases =
            createTeamAliases(team);


        for (
            const alias
            of aliases
        ) {

            if (
                !aliasMap.has(alias)
            ) {

                aliasMap.set(
                    alias,
                    []
                );
            }


            aliasMap
                .get(alias)
                .push(team);
        }
    }


    return {
        aliasMap,
        teamsById
    };
}


// ============================================================
// GET ALL SUPPORTED EUROPEAN TEAMS
// ============================================================

async function getDynamicTeamDirectory() {

    const cacheKey =
        "dynamic-team-directory";


    const cached =
        getCached(cacheKey);


    if (cached) {
        return cached;
    }


    return deduplicatedRequest(
        cacheKey,

        async () => {

            /*
                Promise.all is safe here.

                Each call still goes through fetch365(),
                which uses the GLOBAL serial request queue.

                So logically we request all leagues together,
                while physically the API calls remain
                rate-controlled.
            */

            const leagueTeamLists =
                await Promise.all(
                    DYNAMIC_TEAM_LEAGUES.map(
                        league =>
                            getLeagueTeams(
                                league.competitionId
                            )
                    )
                );


            const allTeams =
                leagueTeamLists.flat();


            const directory =
                buildTeamDirectory(
                    allTeams
                );


            setCached(
                cacheKey,
                directory,
                NETWORK.teamDirectoryCacheMs
            );


            return directory;
        }
    );
}


// ============================================================
// DYNAMIC TEAM LOOKUP
// ============================================================

async function findDynamicTeam(
    rawQuery
) {

    const query =
        normalizeTeamName(
            rawQuery
        );


    const strippedQuery =
        stripGenericClubTokens(
            rawQuery
        );


    if (!query) {

        return {
            status:
                "not_found"
        };
    }


    const directory =
        await getDynamicTeamDirectory();


    const candidates =
        new Map();


    function addMatches(alias) {

        if (!alias) {
            return;
        }


        const matches =
            directory.aliasMap.get(
                alias
            ) || [];


        for (
            const team
            of matches
        ) {

            candidates.set(
                team.id,
                team
            );
        }
    }


    /*
        Exact alias matching only.

        We deliberately avoid fuzzy/sub-string matching
        because returning fixtures for the WRONG football
        club is worse than saying that no club was found.
    */

    addMatches(query);


    if (
        strippedQuery !==
        query
    ) {

        addMatches(
            strippedQuery
        );
    }


    const matches =
        [...candidates.values()];


    if (
        matches.length === 0
    ) {

        return {
            status:
                "not_found"
        };
    }


    if (
        matches.length > 1
    ) {

        return {
            status:
                "ambiguous",

            matches
        };
    }


    return {
        status:
            "found",

        team:
            matches[0]
    };
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


    if (matchupId) {

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
        getCached(cacheKey);


    if (cached) {
        return cached;
    }


    return deduplicatedRequest(
        cacheKey,

        async () => {

            let details =
                null;


            // ------------------------------------------------
            // Strategy 1: gameId only
            // ------------------------------------------------

            try {

                details =
                    await requestGameDetails(
                        game
                    );

            } catch {
                // Continue
            }


            // ------------------------------------------------
            // Strategy 2: supplied matchupId
            // ------------------------------------------------

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
                    // Continue
                }
            }


            // ------------------------------------------------
            // Strategy 3: construct matchupId
            // ------------------------------------------------

            if (!details) {

                const homeId =
                    game.homeCompetitor?.id;


                const awayId =
                    game.awayCompetitor?.id;


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


                            if (details) {
                                break;
                            }

                        } catch {
                            // Try next candidate
                        }
                    }
                }
            }


            if (!details) {

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
// TV
// ============================================================

async function getIsraeliTVChannels(
    game
) {

    /*
        If allscores explicitly tells us there are
        no TV networks, don't call /web/game/.
    */

    if (
        game.hasTVNetworks ===
        false
    ) {

        return [];
    }


    const details =
        await getGameDetails(game);


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
                    network =>
                        !network.countryId ||
                        Number(
                            network.countryId
                        ) ===
                            BOT.countryId
                )

                .map(
                    network =>
                        network.name
                )

                .filter(Boolean)
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
        groupGames(games);


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


        output.push("");
    }


    return output
        .join("\n")
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
        getIsraelDate(0);


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
        groupGames(games);


    const output = [

        "📺 *משחקי היום ושידורים*",

        ""
    ];


    /*
        Deliberately sequential.

        Each game detail request also uses the global API
        queue and cache.
    */

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

                output.push("");

                continue;
            }


            output.push(
                `📺 ${channels.join(", ")}`
            );

            

            /*
            365Scores may return more than one TV channel.

            We intentionally use only the FIRST channel,
            preserving the order returned by 365Scores.
                    */

            const primaryChannel =
                channels[0];


            const links =
                getLinksForChannels(
                    [primaryChannel]
                );


            if (
                links.length ===
                0
            ) {

                output.push(
                    "🔗 לא נמצא קישור למשחק"
                );

            } else {

                output.push(
                    `🔗 ${links[0].url}`
                );
            }


            output.push("");
        }
    }


    return output
        .join("\n")
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
            game => [

                `📅 ${formatDate(game.startTime)} | ${formatTime(game.startTime)}`,

                `⚽ ${homeName(game)} - ${awayName(game)}`,

                `🏆 ${competitionName(game)}`
            ]
                .filter(Boolean)
                .join("\n")
        );


    return [

        `⚽ *המשחקים הקרובים של ${displayName}*`,

        "",

        blocks.join("\n\n")
    ].join("\n");
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    today,

    tomorrow,

    link,

    teamFixtures,

    findDynamicTeam
};