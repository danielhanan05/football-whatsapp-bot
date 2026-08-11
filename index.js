const {
    Client,
    LocalAuth
} = require("whatsapp-web.js");


const qrcode =
    require("qrcode-terminal");


const scores365 =
    require("./scores365");


const {
    TEAM_COMMANDS,
    COMPETITIONS,
    DYNAMIC_TEAM_LEAGUES
} = require("./config");


const {
    checkRateLimit
} = require("./rateLimiter");


// ============================================================
// CONFIG
// ============================================================

const CHROME_PATH =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";


// ============================================================
// WHATSAPP CLIENT
// ============================================================

const client =
    new Client({

        authStrategy:
            new LocalAuth({
                dataPath:
                    "./.wwebjs_auth"
            }),

        puppeteer: {

            executablePath:
                CHROME_PATH,

            headless:
                true,

            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        }
    });


// ============================================================
// STATE
// ============================================================

let clientReady =
    false;


let shuttingDown =
    false;


const processedMessages =
    new Map();


const MESSAGE_DEDUP_TTL_MS =
    60_000;


// ============================================================
// LOGGING
// ============================================================

function log(
    level,
    message,
    extra = ""
) {

    const timestamp =
        new Date()
            .toISOString();


    if (extra) {

        console.log(
            `[${timestamp}] [${level}] ${message}`,
            extra
        );

    } else {

        console.log(
            `[${timestamp}] [${level}] ${message}`
        );
    }
}


// ============================================================
// MESSAGE DEDUPLICATION
// ============================================================

function getMessageId(
    message
) {

    return (
        message?.id?._serialized ||
        null
    );
}


function alreadyProcessed(
    message
) {

    const id =
        getMessageId(message);


    if (!id) {
        return false;
    }


    if (
        processedMessages.has(id)
    ) {

        return true;
    }


    processedMessages.set(
        id,
        Date.now()
    );


    return false;
}


setInterval(
    () => {

        const cutoff =
            Date.now() -
            MESSAGE_DEDUP_TTL_MS;


        for (
            const [
                id,
                timestamp
            ]
            of processedMessages
        ) {

            if (
                timestamp <
                cutoff
            ) {

                processedMessages.delete(
                    id
                );
            }
        }

    },
    60_000
).unref();


// ============================================================
// MESSAGE IDs
// ============================================================

function getChatId(
    message
) {

    return message.fromMe
        ? message.to
        : message.from;
}


function getUserId(
    message
) {

    if (message.fromMe) {

        return (
            message.from ||
            "self"
        );
    }


    return (
        message.author ||
        message.from
    );
}


// ============================================================
// SAFE SEND
// ============================================================

async function safeSend(
    chatId,
    text
) {

    if (!clientReady) {

        log(
            "WARN",
            "Send attempted while WhatsApp was not ready"
        );

        return false;
    }


    if (
        typeof chatId !==
            "string" ||
        !chatId
    ) {

        log(
            "ERROR",
            "Invalid chat ID"
        );

        return false;
    }


    if (
        typeof text !==
            "string" ||
        !text.trim()
    ) {

        log(
            "ERROR",
            "Invalid outgoing text"
        );

        return false;
    }


    try {

        /*
            Keep using sendMessage directly.

            message.reply() / getChat() caused compatibility
            problems with the current WhatsApp Web version.
        */

        await client.sendMessage(
            chatId,
            text
        );


        return true;

    } catch (error) {

        log(
            "ERROR",
            `WhatsApp send failed: ${chatId}`
        );


        console.error(error);


        return false;
    }
}


// ============================================================
// HELP
// ============================================================

function buildHelpMessage() {

    const competitionNames =
        Object.values(
            COMPETITIONS
        )

            .sort(
                (a, b) =>
                    a.priority -
                    b.priority
            )

            .map(
                competition =>
                    `${competition.emoji} ${competition.name}`
            )

            .join("\n");


    const israeliTeamCommands =
        Object.entries(
            TEAM_COMMANDS
        )

            .map(
                (
                    [
                        command,
                        team
                    ]
                ) =>
                    `${command} — ${team.name}`
            )

            .join("\n");


    const dynamicLeagueNames =
        DYNAMIC_TEAM_LEAGUES

            .map(
                league =>
                    `• ${league.name}`
            )

            .join("\n");


    return [

        "⚽ *Football Bot*",

        "",

        "הבוט מרכז משחקים, שעות, שידורים ומשחקים קרובים באמצעות נתוני 365Scores.",

        "",

        "*פקודות כלליות:*",

        "",

        "!today — משחקי היום במפעלים הנתמכים",

        "!tomorrow — משחקי מחר",

        "!link — משחקי היום, ערוץ השידור בישראל וקישור אם קיים",

        "!help — מציג את ההודעה הזאת",

        "",

        "*מפעלים שנכללים במשחקי היום:*",

        competitionNames,

        "",

        "*חיפוש קבוצה באירופה:*",

        "כתבו ! ולאחר מכן את שם הקבוצה באנגלית.",

        "",

        "לדוגמה:",

        "!chelsea",

        "!manchester united",

        "!arsenal",

        "!barcelona",

        "!bayern munich",

        "!inter",

        "",

        "אין צורך לכתוב FC.",

        "",

        "*ליגות זמינות לחיפוש קבוצות:*",

        dynamicLeagueNames,

        "",

        "*פקודות קבוצות ליגת העל:*",

        israeliTeamCommands

    ].join("\n");
}


// ============================================================
// STATIC COMMANDS
// ============================================================

const STATIC_COMMANDS = {

    "!ping":
        async () =>
            "🏓 Pong!",


    "!today":
        async () =>
            scores365.today(),


    "!tomorrow":
        async () =>
            scores365.tomorrow(),


    "!link":
        async () =>
            scores365.link(),


    "!help":
        async () =>
            buildHelpMessage()
};


// ============================================================
// DYNAMIC COMMAND VALIDATION
// ============================================================
//
// Not every random "!..." message should trigger a lookup.
//
// Examples accepted:
// !chelsea
// !manchester united
// !paris-something
//
// Very long / malformed inputs are ignored.
// ============================================================

function getDynamicTeamQuery(
    command
) {

    if (
        typeof command !==
        "string" ||
        !command.startsWith("!")
    ) {

        return null;
    }


    const query =
        command
            .slice(1)
            .trim();


    if (
        query.length < 2 ||
        query.length > 50
    ) {

        return null;
    }


    const words =
        query.split(/\s+/);


    if (
        words.length > 6
    ) {

        return null;
    }


    /*
        Allow normal team-name characters only.

        Unicode letter support is intentional.
    */

    if (
        !/^[\p{L}\p{N}\p{M}\s.'&’\-]+$/u
            .test(query)
    ) {

        return null;
    }


    return query;
}


// ============================================================
// COMMAND EXECUTION
// ============================================================

async function executeCommand(
    command
) {

    // --------------------------------------------------------
    // Static command
    // --------------------------------------------------------

    const staticHandler =
        STATIC_COMMANDS[
            command
        ];


    if (staticHandler) {

        return staticHandler();
    }


    // --------------------------------------------------------
    // Israeli shortcut
    // --------------------------------------------------------

    const configuredTeam =
        TEAM_COMMANDS[
            command
        ];


    if (configuredTeam) {

        return scores365.teamFixtures(
            configuredTeam.id,
            configuredTeam.name
        );
    }


    // --------------------------------------------------------
    // Dynamic European team command
    // --------------------------------------------------------

    const teamQuery =
        getDynamicTeamQuery(
            command
        );


    if (!teamQuery) {

        return null;
    }


    const lookup =
        await scores365.findDynamicTeam(
            teamQuery
        );


    if (
        lookup.status ===
        "not_found"
    ) {

        return (
            `❌ לא מצאתי קבוצה בשם "${teamQuery}" בליגות הנתמכות.\n\nשלח !help כדי לראות אילו ליגות זמינות.`
        );
    }


    if (
        lookup.status ===
        "ambiguous"
    ) {

        const names =
            lookup.matches
                .map(
                    team =>
                        `• ${team.name}`
                )
                .join("\n");


        return [
            `⚠️ מצאתי יותר מקבוצה אחת שמתאימה ל-"${teamQuery}":`,
            "",
            names,
            "",
            "נסה להשתמש בשם המלא יותר של הקבוצה."
        ].join("\n");
    }


    return scores365.teamFixtures(
        lookup.team.id,
        lookup.team.name
    );
}


// ============================================================
// WHATSAPP CONNECTION EVENTS
// ============================================================

client.on(
    "qr",
    qr => {

        log(
            "INFO",
            "QR code generated"
        );


        console.log(
            "\nWhatsApp > מכשירים מקושרים > קישור מכשיר\n"
        );


        qrcode.generate(
            qr,
            {
                small: true
            }
        );
    }
);


client.on(
    "authenticated",
    () => {

        log(
            "INFO",
            "WhatsApp authenticated"
        );
    }
);


client.on(
    "ready",
    () => {

        clientReady =
            true;


        log(
            "INFO",
            "Football bot ready"
        );


        console.log(
            "Send !help to see commands."
        );
    }
);


client.on(
    "auth_failure",
    message => {

        clientReady =
            false;


        log(
            "ERROR",
            "WhatsApp authentication failure"
        );


        console.error(message);
    }
);


client.on(
    "disconnected",
    reason => {

        clientReady =
            false;


        log(
            "WARN",
            "WhatsApp disconnected",
            reason
        );
    }
);


// ============================================================
// MESSAGE PROCESSING
// ============================================================

async function processMessage(
    message
) {

    if (!message) {
        return;
    }


    if (
        typeof message.body !==
        "string"
    ) {
        return;
    }


    const command =
        message.body
            .trim()
            .toLowerCase();


    /*
        This also prevents the bot from processing its own
        generated responses.

        Bot responses don't begin with "!".
    */

    if (
        !command.startsWith("!")
    ) {
        return;
    }


    // --------------------------------------------------------
    // Decide whether this is even a valid command candidate
    // BEFORE applying rate limiting or making API calls.
    // --------------------------------------------------------

    const isStatic =
        Boolean(
            STATIC_COMMANDS[
                command
            ]
        );


    const isIsraeliAlias =
        Boolean(
            TEAM_COMMANDS[
                command
            ]
        );


    const dynamicQuery =
        getDynamicTeamQuery(
            command
        );


    if (
        !isStatic &&
        !isIsraeliAlias &&
        !dynamicQuery
    ) {

        return;
    }


    // --------------------------------------------------------
    // Duplicate protection
    // --------------------------------------------------------

    if (
        alreadyProcessed(
            message
        )
    ) {

        log(
            "WARN",
            "Duplicate message ignored",
            getMessageId(message)
        );


        return;
    }


    // --------------------------------------------------------
    // IDs
    // --------------------------------------------------------

    const chatId =
        getChatId(message);


    const userId =
        getUserId(message);


    if (
        !chatId ||
        !userId
    ) {

        log(
            "WARN",
            "Missing chat/user ID"
        );


        return;
    }


    log(
        "COMMAND",
        command,
        `user=${userId} chat=${chatId} fromMe=${message.fromMe}`
    );


    // ========================================================
    // RATE LIMIT
    // ========================================================

    let rateLimit;


    try {

        rateLimit =
            checkRateLimit(
                userId,
                chatId
            );

    } catch (error) {

        log(
            "ERROR",
            "Rate limiter failure"
        );


        console.error(error);


        await safeSend(
            chatId,
            "❌ הבוט נתקל בשגיאה פנימית."
        );


        return;
    }


    if (
        !rateLimit.allowed
    ) {

        log(
            "RATE_LIMIT",
            userId
        );


        if (
            rateLimit.notify
        ) {

            await safeSend(
                chatId,
                rateLimit.message
            );
        }


        return;
    }


    // ========================================================
    // EXECUTE
    // ========================================================

    let response;


    try {

        response =
            await executeCommand(
                command
            );

    } catch (error) {

        log(
            "ERROR",
            `Command failed: ${command}`
        );


        console.error(error);


        await safeSend(
            chatId,
            "❌ הייתה בעיה בקבלת הנתונים. נסה שוב בעוד כמה רגעים."
        );


        return;
    }


    // ========================================================
    // VALIDATE RESPONSE
    // ========================================================

    if (
        typeof response !==
            "string" ||
        !response.trim()
    ) {

        return;
    }


    // ========================================================
    // SEND
    // ========================================================

    const success =
        await safeSend(
            chatId,
            response
        );


    if (success) {

        log(
            "SUCCESS",
            `${command} completed`
        );
    }
}


// ============================================================
// MESSAGE EVENT
// ============================================================
//
// message_create allows BOTH:
// - commands from other users
// - commands sent manually by the account running the bot
// ============================================================

client.on(
    "message_create",
    async message => {

        try {

            await processMessage(
                message
            );

        } catch (error) {

            log(
                "ERROR",
                "Unexpected message handler error"
            );


            console.error(error);
        }
    }
);


// ============================================================
// PROCESS SAFETY
// ============================================================

process.on(
    "unhandledRejection",
    reason => {

        log(
            "ERROR",
            "Unhandled promise rejection"
        );


        console.error(reason);
    }
);


process.on(
    "uncaughtException",
    error => {

        log(
            "ERROR",
            "Uncaught exception"
        );


        console.error(error);
    }
);


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function shutdown(
    signal
) {

    if (shuttingDown) {
        return;
    }


    shuttingDown =
        true;


    clientReady =
        false;


    log(
        "INFO",
        `Received ${signal}. Shutting down.`
    );


    try {

        await client.destroy();

    } catch (error) {

        log(
            "ERROR",
            "WhatsApp shutdown failed"
        );


        console.error(error);
    }


    process.exit(0);
}


process.on(
    "SIGINT",
    () =>
        shutdown("SIGINT")
);


process.on(
    "SIGTERM",
    () =>
        shutdown("SIGTERM")
);


// ============================================================
// START
// ============================================================

async function start() {

    try {

        log(
            "INFO",
            "Starting football WhatsApp bot"
        );


        await client.initialize();

    } catch (error) {

        log(
            "FATAL",
            "WhatsApp initialization failed"
        );


        console.error(error);


        process.exit(1);
    }
}


start();