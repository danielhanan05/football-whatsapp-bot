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
    COMPETITIONS
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


/*
    message_create may be emitted for both incoming and
    outgoing messages.

    This prevents the same WhatsApp message ID from being
    processed twice in case of reconnect/event duplication.
*/

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
        getMessageId(
            message
        );


    if (!id) {
        return false;
    }


    if (
        processedMessages.has(
            id
        )
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
// MESSAGE IDENTIFIERS
// ============================================================

function getChatId(
    message
) {

    /*
        whatsapp-web.js semantics:

        Incoming message:
            message.from = chat
            message.to   = current user

        Outgoing message:
            message.from = current user
            message.to   = chat

        Therefore the correct chat ID is:
    */

    return message.fromMe
        ? message.to
        : message.from;
}


function getUserId(
    message
) {

    /*
        Incoming group message:
            message.author = actual participant

        Incoming private message:
            message.author may be undefined
            message.from = sender

        Outgoing message:
            this is our own WhatsApp account.
            message.from identifies the sender/current user.
    */

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
            Intentionally using client.sendMessage()
            instead of message.reply() / message.getChat().

            Those previously caused getChatById-related
            compatibility errors on this setup.
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


        console.error(
            error
        );


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
            .join(
                "\n"
            );


    const teamCommands =
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
            .join(
                "\n"
            );


    return [
        "⚽ *Football Bot*",
        "",
        "הבוט מרכז משחקים, שעות ושידורי כדורגל בישראל באמצעות נתוני 365Scores.",
        "",
        "*פקודות כלליות:*",
        "",
        "!today — משחקי היום במפעלים הנתמכים",
        "!tomorrow — משחקי מחר",
        "!link — משחקי היום, ערוץ השידור בישראל וקישור אם קיים",
        "!help — מציג את ההודעה הזאת",
        "",
        "*מפעלים שנכללים:*",
        competitionNames,
        "",
        "*משחקים קרובים לפי קבוצה:*",
        teamCommands
    ]
        .join(
            "\n"
        );
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
// COMMAND HELPERS
// ============================================================

function isSupportedCommand(
    command
) {

    return Boolean(
        STATIC_COMMANDS[
            command
        ] ||
        TEAM_COMMANDS[
            command
        ]
    );
}


async function executeCommand(
    command
) {

    const staticHandler =
        STATIC_COMMANDS[
            command
        ];


    if (staticHandler) {

        return staticHandler();
    }


    const team =
        TEAM_COMMANDS[
            command
        ];


    if (team) {

        return scores365.teamFixtures(
            team.id,
            team.name
        );
    }


    return null;
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


        console.error(
            message
        );
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


    // --------------------------------------------------------
    // Only text messages
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Critical self-message protection
    // --------------------------------------------------------
    //
    // We WANT commands that we manually send ourselves:
    //
    //     !today
    //
    // But responses generated by the bot are also outgoing
    // messages from our account.
    //
    // Since bot responses never begin with "!", they are
    // ignored here and cannot create a response loop.
    // --------------------------------------------------------

    if (
        !command.startsWith(
            "!"
        )
    ) {
        return;
    }


    // --------------------------------------------------------
    // Ignore unknown !commands
    // --------------------------------------------------------

    if (
        !isSupportedCommand(
            command
        )
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
            getMessageId(
                message
            )
        );


        return;
    }


    // ========================================================
    // IDENTIFY CHAT + USER
    // ========================================================

    const chatId =
        getChatId(
            message
        );


    const userId =
        getUserId(
            message
        );


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


        console.error(
            error
        );


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


        /*
            rateLimiter.js also rate-limits warning messages,
            so a spammer cannot make the bot spam the group
            with warnings.
        */

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
    // EXECUTE COMMAND
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


        console.error(
            error
        );


        await safeSend(
            chatId,
            "❌ הייתה בעיה בקבלת הנתונים. נסה שוב בעוד כמה רגעים."
        );


        return;
    }


    // ========================================================
    // VALIDATE OUTPUT
    // ========================================================

    if (
        typeof response !==
            "string" ||
        !response.trim()
    ) {

        log(
            "ERROR",
            `Empty response: ${command}`
        );


        return;
    }


    // ========================================================
    // SEND RESPONSE
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
// IMPORTANT:
//
// "message_create" is used instead of "message".
//
// whatsapp-web.js emits message_create for newly-created
// messages and it MAY include messages sent by the current
// WhatsApp account.
//
// The normal "message" event is emitted only after the
// library checks that msg.id.fromMe is false.
//
// This is what lets both us and other group members use
// the bot.
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


            console.error(
                error
            );
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


        console.error(
            reason
        );
    }
);


process.on(
    "uncaughtException",
    error => {

        log(
            "ERROR",
            "Uncaught exception"
        );


        console.error(
            error
        );
    }
);


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function shutdown(
    signal
) {

    if (
        shuttingDown
    ) {
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


        console.error(
            error
        );
    }


    process.exit(0);
}


process.on(
    "SIGINT",
    () =>
        shutdown(
            "SIGINT"
        )
);


process.on(
    "SIGTERM",
    () =>
        shutdown(
            "SIGTERM"
        )
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


        console.error(
            error
        );


        process.exit(1);
    }
}


start();