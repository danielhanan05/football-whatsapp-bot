const {
    RATE_LIMIT
} = require("./config");


// ============================================================
// STATE
// ============================================================

const users = new Map();
const chats = new Map();


// ============================================================
// HELPERS
// ============================================================

function cleanupMinuteWindow(timestamps) {

    const cutoff =
        Date.now() - 60_000;

    return timestamps.filter(
        timestamp => timestamp > cutoff
    );
}


function canSendWarning(record) {

    const now = Date.now();

    const lastWarning =
        record.lastWarning || 0;

    if (
        now - lastWarning <
        RATE_LIMIT.warningCooldownMs
    ) {
        return false;
    }

    record.lastWarning = now;

    return true;
}


// ============================================================
// RATE LIMIT
// ============================================================

function checkRateLimit(userId, chatId) {

    const now = Date.now();


    // ========================================================
    // USER
    // ========================================================

    let user =
        users.get(userId);

    if (!user) {

        user = {
            lastRequest: 0,
            lastWarning: 0,
            requests: []
        };
    }


    user.requests =
        cleanupMinuteWindow(
            user.requests
        );


    // --------------------------------------------------------
    // Cooldown
    // --------------------------------------------------------

    if (user.lastRequest) {

        const elapsed =
            now - user.lastRequest;

        if (
            elapsed <
            RATE_LIMIT.userCooldownMs
        ) {

            const remaining =
                Math.ceil(
                    (
                        RATE_LIMIT.userCooldownMs -
                        elapsed
                    ) / 1000
                );

            const notify =
                canSendWarning(user);

            users.set(
                userId,
                user
            );

            return {
                allowed: false,
                notify,

                message:
                    `⚠️ אתה שולח פקודות מהר מדי.\nנסה שוב בעוד ${remaining} שניות.`
            };
        }
    }


    // --------------------------------------------------------
    // User per-minute limit
    // --------------------------------------------------------

    if (
        user.requests.length >=
        RATE_LIMIT.userMaxPerMinute
    ) {

        const notify =
            canSendWarning(user);

        users.set(
            userId,
            user
        );

        return {
            allowed: false,
            notify,

            message:
                "⚠️ שלחת יותר מדי בקשות בדקה האחרונה. חכה קצת ונסה שוב."
        };
    }


    // ========================================================
    // CHAT
    // ========================================================

    let chat =
        chats.get(chatId);

    if (!chat) {

        chat = {
            lastWarning: 0,
            requests: []
        };
    }


    chat.requests =
        cleanupMinuteWindow(
            chat.requests
        );


    if (
        chat.requests.length >=
        RATE_LIMIT.chatMaxPerMinute
    ) {

        const notify =
            canSendWarning(chat);

        chats.set(
            chatId,
            chat
        );

        return {
            allowed: false,
            notify,

            message:
                "⚠️ נשלחו יותר מדי פקודות בקבוצה הזאת. נסו שוב בעוד קצת."
        };
    }


    // ========================================================
    // APPROVED
    // ========================================================

    user.lastRequest = now;
    user.requests.push(now);

    chat.requests.push(now);


    users.set(
        userId,
        user
    );

    chats.set(
        chatId,
        chat
    );


    return {
        allowed: true,
        notify: false
    };
}


// ============================================================
// MEMORY CLEANUP
// ============================================================

setInterval(
    () => {

        const now =
            Date.now();


        for (
            const [userId, user]
            of users
        ) {

            user.requests =
                cleanupMinuteWindow(
                    user.requests
                );

            if (
                user.requests.length === 0 &&
                now - user.lastRequest > 120_000 &&
                now - user.lastWarning > 120_000
            ) {
                users.delete(userId);
            }
        }


        for (
            const [chatId, chat]
            of chats
        ) {

            chat.requests =
                cleanupMinuteWindow(
                    chat.requests
                );

            if (
                chat.requests.length === 0 &&
                now - chat.lastWarning > 120_000
            ) {
                chats.delete(chatId);
            }
        }

    },
    60_000
).unref();


module.exports = {
    checkRateLimit
};