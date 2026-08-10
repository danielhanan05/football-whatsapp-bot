# ⚽ Football WhatsApp Bot

A WhatsApp bot that provides football fixtures, upcoming team matches, and Israeli TV broadcast information using data from 365Scores.

The bot runs directly through WhatsApp and responds to commands sent in private chats or groups.

> 🚧 This project is currently under development.

---

## 🇬🇧 English

### Features

The bot currently supports:

* Today's football matches
* Tomorrow's football matches
* Israeli TV broadcast information for today's matches
* Broadcast links when a supported channel is available
* Upcoming fixtures for Israeli Premier League teams
* Commands from both the bot owner's WhatsApp account and other users
* Group and private chat usage
* Per-user and per-chat rate limiting
* API request caching and request deduplication
* Protection against excessive API requests

---

## Commands

### General Commands

| Command     | Description                                                                      |
| ----------- | -------------------------------------------------------------------------------- |
| `!today`    | Shows today's matches from all supported competitions                            |
| `!tomorrow` | Shows tomorrow's matches from all supported competitions                         |
| `!link`     | Shows today's matches, their Israeli TV channel, and an available broadcast link |
| `!help`     | Shows information about the bot and available commands                           |
| `!ping`     | Checks whether the bot is online                                                 |

The bot also supports commands for individual Israeli Premier League teams, which return their upcoming fixtures.

---

## Supported Competitions

The bot currently tracks several Israeli and European competitions, including:

* 🇮🇱 Israeli Premier League
* 🇮🇱 Toto Cup
* 🏆 Israel State Cup
* ⭐ UEFA Champions League
* ⭐ UEFA Champions League Qualifiers
* 🟠 UEFA Europa League
* 🟢 UEFA Conference League
* 🏴 English Premier League
* 🇪🇸 La Liga
* 🇩🇪 Bundesliga
* 🇮🇹 Serie A

More competitions can easily be added through the configuration.

---

## How It Works

The bot is built with Node.js and uses `whatsapp-web.js` to communicate with WhatsApp Web.

Football information is retrieved from 365Scores web endpoints.

For commands such as `!today` and `!tomorrow`, the bot retrieves the relevant fixtures and filters them according to the competitions configured in the project.

For `!link`, the bot additionally checks each game's details for Israeli TV broadcast information.

The detected TV channel is then matched against the bot's configured channel list.

---

## Project Structure

```text
football-whatsapp-bot/
│
├── index.js
├── scores365.js
├── channels.js
├── config.js
├── rateLimiter.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

### `index.js`

Main WhatsApp bot application.

Handles:

* WhatsApp connection
* Authentication
* Incoming and outgoing commands
* Command routing
* Message sending
* Error handling
* Graceful shutdown

### `scores365.js`

Handles communication with 365Scores and football data processing.

Includes:

* Daily fixtures
* Team fixtures
* Game details
* Israeli TV networks
* Caching
* Request deduplication
* API request throttling

### `channels.js`

Maps TV channel names returned by 365Scores to configured broadcast URLs.

It also normalizes different channel name formats and aliases.

### `config.js`

Central configuration for:

* Competitions
* Teams
* Commands
* 365Scores settings
* Network settings

### `rateLimiter.js`

Protects the bot from command spam and excessive requests.

---

## Installation

### Requirements

* Node.js 18 or newer
* Google Chrome
* WhatsApp account
* Git

Clone the repository:

```bash
git clone https://github.com/danielhanan05/football-whatsapp-bot.git
```

Enter the project directory:

```bash
cd football-whatsapp-bot
```

Install dependencies:

```bash
npm install
```

Start the bot:

```bash
npm start
```

On the first launch, a QR code will appear in the terminal.

Open WhatsApp and go to:

**Settings → Linked Devices → Link a Device**

Scan the QR code.

After authentication, the WhatsApp session is stored locally so you normally won't need to scan the QR code every time.

---

## Security

WhatsApp authentication information is stored locally inside:

```text
.wwebjs_auth/
```

This directory is excluded from Git through `.gitignore`.

**Never upload your WhatsApp authentication session, `.env` files, credentials, tokens, or other secrets to GitHub.**

The project also excludes:

```text
node_modules/
.wwebjs_auth/
.wwebjs_cache/
.env
```

---

## Rate Limiting

The bot includes rate limiting to prevent users or groups from sending excessive numbers of commands.

This helps:

* Prevent spam
* Reduce unnecessary 365Scores requests
* Protect the bot from accidental request loops
* Reduce the chance of external services being overloaded

---

## Disclaimer

This project is an independent, unofficial project.

It is not affiliated with, endorsed by, or sponsored by WhatsApp, Meta, or 365Scores.

`whatsapp-web.js` is an unofficial WhatsApp Web client library.

The 365Scores web endpoints used by this project are not presented here as a public or officially supported API and may change or stop working at any time.

Users of this project are responsible for ensuring that their usage complies with the terms and policies of the relevant services.

---

# 🇮🇱 עברית

## ⚽ בוט כדורגל לוואטסאפ

בוט וואטסאפ שמציג משחקי כדורגל, משחקים קרובים של קבוצות ומידע על ערוצי השידור בישראל באמצעות נתונים מ־365Scores.

הבוט פועל ישירות דרך WhatsApp ומגיב לפקודות שנשלחות בצ'אטים פרטיים או בקבוצות.

> 🚧 הפרויקט נמצא כרגע בפיתוח.

---

## יכולות

הבוט תומך כרגע ב:

* משחקי הכדורגל של היום
* משחקי הכדורגל של מחר
* מידע על ערוצי השידור בישראל למשחקי היום
* קישורים לשידור כאשר קיים ערוץ נתמך
* משחקים קרובים של קבוצות ליגת העל
* פקודות שנשלחות גם מהמספר שעליו רץ הבוט וגם ממשתמשים אחרים
* עבודה בקבוצות ובצ'אטים פרטיים
* Rate Limiting לפי משתמש וצ'אט
* Cache לבקשות API
* מניעת בקשות API כפולות
* הגנה מפני כמות חריגה של בקשות

---

## פקודות

### פקודות כלליות

| פקודה       | תיאור                                                     |
| ----------- | --------------------------------------------------------- |
| `!today`    | מציג את משחקי היום מכל המפעלים הנתמכים                    |
| `!tomorrow` | מציג את משחקי מחר מכל המפעלים הנתמכים                     |
| `!link`     | מציג את משחקי היום, ערוץ השידור בישראל וקישור זמין לשידור |
| `!help`     | מציג מידע על הבוט ואת הפקודות הזמינות                     |
| `!ping`     | בודק שהבוט פעיל                                           |

בנוסף, קיימות פקודות עבור קבוצות ליגת העל שמחזירות את המשחקים הקרובים של כל קבוצה.

---

## מפעלים נתמכים

הבוט עוקב כרגע אחרי מספר מפעלים בישראל ובאירופה, ביניהם:

* 🇮🇱 ליגת העל
* 🇮🇱 גביע הטוטו
* 🏆 גביע המדינה
* ⭐ ליגת האלופות
* ⭐ מוקדמות ליגת האלופות
* 🟠 הליגה האירופית
* 🟢 קונפרנס ליג
* 🏴 פרמייר ליג
* 🇪🇸 לה ליגה
* 🇩🇪 בונדסליגה
* 🇮🇹 סרייה A

ניתן להוסיף מפעלים נוספים דרך קובץ ההגדרות.

---

## איך הבוט עובד?

הבוט כתוב ב־Node.js ומשתמש ב־`whatsapp-web.js` כדי לתקשר עם WhatsApp Web.

נתוני הכדורגל מתקבלים מ־365Scores.

בפקודות כמו `!today` ו־`!tomorrow`, הבוט מקבל את רשימת המשחקים ומסנן אותה לפי המפעלים שהוגדרו בפרויקט.

בפקודת `!link`, הבוט בודק בנוסף את פרטי המשחק כדי למצוא מידע על ערוץ השידור בישראל.

לאחר מכן שם הערוץ מושווה לרשימת הערוצים שהוגדרה בבוט כדי למצוא קישור מתאים.

---

## מבנה הפרויקט

```text
football-whatsapp-bot/
│
├── index.js
├── scores365.js
├── channels.js
├── config.js
├── rateLimiter.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

### `index.js`

הקובץ הראשי של הבוט.

אחראי על:

* החיבור ל־WhatsApp
* Authentication
* קבלת פקודות
* ניתוב הפקודות
* שליחת הודעות
* טיפול בשגיאות
* כיבוי מסודר של הבוט

### `scores365.js`

אחראי על התקשורת עם 365Scores ועיבוד נתוני הכדורגל.

כולל:

* משחקים לפי יום
* משחקים לפי קבוצה
* פרטי משחק
* ערוצי שידור בישראל
* Cache
* מניעת בקשות כפולות
* הגבלת קצב הבקשות ל־API

### `channels.js`

אחראי על התאמת שמות ערוצי הטלוויזיה שמתקבלים מ־365Scores לקישורים שהוגדרו בבוט.

הקובץ גם מטפל בשמות חלופיים ובפורמטים שונים של שמות הערוצים.

### `config.js`

קובץ ההגדרות המרכזי עבור:

* מפעלים
* קבוצות
* פקודות
* הגדרות 365Scores
* הגדרות רשת

### `rateLimiter.js`

מגן על הבוט מפני ספאם וכמות חריגה של בקשות.

---

## התקנה

### דרישות

* Node.js 18 ומעלה
* Google Chrome
* חשבון WhatsApp
* Git

שכפול הפרויקט:

```bash
git clone https://github.com/danielhanan05/football-whatsapp-bot.git
```

כניסה לתיקייה:

```bash
cd football-whatsapp-bot
```

התקנת החבילות:

```bash
npm install
```

הפעלת הבוט:

```bash
npm start
```

בהפעלה הראשונה יופיע QR Code בטרמינל.

ב־WhatsApp יש להיכנס ל:

**הגדרות → מכשירים מקושרים → קישור מכשיר**

ולסרוק את הקוד.

לאחר ההתחברות, ה־session של WhatsApp נשמר מקומית ולכן בדרך כלל אין צורך לסרוק QR מחדש בכל הפעלה.

---

## אבטחה

פרטי ההתחברות של WhatsApp נשמרים מקומית בתוך:

```text
.wwebjs_auth/
```

התיקייה מוחרגת מ־Git באמצעות `.gitignore`.

**אין להעלות ל־GitHub את ה־WhatsApp session, קבצי `.env`, סיסמאות, tokens או פרטי התחברות אחרים.**

הפרויקט מחריג בין היתר:

```text
node_modules/
.wwebjs_auth/
.wwebjs_cache/
.env
```

---

## הגבלת בקשות

הבוט כולל מנגנון Rate Limiting שנועד למנוע ממשתמשים או קבוצות לשלוח כמות חריגה של פקודות.

המנגנון עוזר:

* למנוע ספאם
* לצמצם בקשות מיותרות ל־365Scores
* למנוע לולאות בקשות בטעות
* להפחית עומס על שירותים חיצוניים

---

## הבהרה

זהו פרויקט עצמאי ולא רשמי.

הפרויקט אינו קשור, מאושר או ממומן על ידי WhatsApp, Meta או 365Scores.

`whatsapp-web.js` היא ספרייה לא רשמית לעבודה מול WhatsApp Web.

ה־endpoints של 365Scores שבהם נעשה שימוש בפרויקט אינם מוצגים כאן כ־API ציבורי או רשמי, והם עשויים להשתנות או להפסיק לעבוד בכל שלב.

האחריות לוודא שהשימוש בפרויקט תואם לתנאים ולמדיניות של השירותים הרלוונטיים חלה על המשתמש.
