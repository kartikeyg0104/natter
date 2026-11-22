# Natter Server

The chat server behind Natter, built with NestJS, Prisma and MongoDB. It follows the API
contract in [`../swagger.json`](../swagger.json): every route, request field and response shape
matches it, so the app works the same against this server or any other server that implements
that contract. On top of the contract it offers optional extras (profiles, contacts, presence,
message actions, status updates and more), listed by `GET /capabilities` and described in
[Optional features](#optional-features). The app itself lives in [`../frontend`](../frontend).

## Stack

| | |
|--|--|
| Framework | NestJS 11 |
| ORM | Prisma 6 |
| Database | MongoDB 7.0, run as a single-node replica set (Prisma needs one) |
| Runtime | Node.js 20 (Alpine) in Docker |
| API docs | Swagger UI at `http://localhost:3000/docs` |

## Setup with Docker

Copy the example environment file, then start MongoDB and the API together:

```bash
cp .env.example .env
docker compose up --build
```

`npm run docker:up` does the same thing. The API listens on `http://localhost:3000` and MongoDB
on `localhost:27017`.

Docker Compose creates these resources:

| Resource | Name |
|--|--|
| Compose project | `natter` |
| API container | `natter_api` |
| MongoDB container | `natter_mongo` |
| Network | `natter_net` |
| Volumes | `natter_mongo_data`, `natter_mongo_key` |
| Database | `natter` |

To stop everything, run `docker compose down` (or `npm run docker:down`). To follow the API
logs, run `docker logs -f natter_api` (or `npm run docker:logs`).

## Setup without Docker

You need a MongoDB replica set reachable at the `DATABASE_URL` in `.env`. Then:

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

## Environment

`.env` is gitignored; do not commit it.

| Variable | Default | What it does |
|--|--|--|
| `MONGO_USERNAME` / `MONGO_PASSWORD` | `natteradmin` / `natterpass123` | MongoDB root user, created the first time the database volume starts. Change these if the machine is shared. |
| `DATABASE_URL` | `mongodb://…@localhost:27017/natter?…` | Used when running without Docker. Docker Compose overrides it to reach the `mongo` service. |
| `PORT` | `3000` | API port |
| `BOT_MODE` | `false` | `true` starts the fact bot (see below) |
| `MONGO_SILENT_LOGS` | `true` | `false` shows MongoDB's own logs in the Docker output |
| `FILE_ORPHAN_TTL_HOURS` | `24` | Uploads that were never sent in a message are deleted after this many hours |
| `DEBUG_LOGS` | `true` | Serves recent server logs at `GET /debug/logs` for the app's Diagnostics panel |

## Demo data

With the containers running, seed the demo users and chats:

```bash
docker exec natter_api npm run seed
```

`npm run docker:seed` runs the same command. Without Docker, use `npm run seed`.

The seed creates five users, all with the password `natter123`:

- `zara`
- `ishaan`
- `noor`
- `vikram`
- `tara`

It also creates four direct messages and three group chats ("Lab partners", "Weekend plans" and
"Exam prep"), each with a few messages. "Lab partners" includes an image message and a reply, and
the first "Weekend plans" message has two reactions. `zara` and `ishaan` have a 4-day streak (their
DM has messages from both on each of the last three UTC days and today), and `noor` has sent `zara`
an unopened snap (a 64x64 photo, caption "Guess where I am", shown for 5 seconds).

Each user gets a phone number, an about text and an illustrated avatar:

| User | Phone number | Avatar preset |
|--|--|--|
| `zara` | +919810000001 | `adventurer:zara` |
| `ishaan` | +919810000002 | `fun-emoji:ishaan` |
| `noor` | +919810000003 | `big-smile:noor` |
| `vikram` | +919810000004 | `micah:vikram` |
| `tara` | +919810000005 | `avataaars:tara` |

`zara` has three contacts: "Ishaan (lab)" and "Noor" (both registered) and "Mom" (+919810009999,
not registered). `ishaan`, `noor` and `zara` each have a text status update posted at seed time.

Running the seed again does not duplicate anything. Status updates are only re-created once the
previous ones have expired, streak messages are only added for days that have none from that
person, and a new snap is only added once `zara` has opened the previous one. Re-running the seed
resets the avatar presets (and removes any photo avatar of the demo users).

To try a brand new account, log in with any username that does not exist yet; the server creates
it on the first request.

## Authentication

Every request needs this header:

```
Authorization: Basic <username>:<password>
```

The username is the unique user identifier and the password is that user's secret. If the
username does not exist, the user is created on the first request. If it does exist, the
password must match.

## Routes

Full request and response details are in Swagger UI at `http://localhost:3000/docs`.

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/user` | List every registered user |
| `GET` | `/user/profile` | Get a user's profile; leave out `user_id` to get your own |
| `POST` | `/conversation` | Create a DM or group chat. The caller is added automatically, and an existing DM between the same two users is returned instead of a duplicate. |
| `GET` | `/conversation` | List the conversations the caller belongs to |
| `POST` | `/message` | Send a message: text in `content`, an attachment via `file_id`, or both |
| `GET` | `/message` | Get the message history of a conversation, with cursor-based pagination |
| `POST` | `/file` | Upload an image or file as base64 (up to 10 MB); returns the `id` to send as `file_id` |
| `GET` | `/file/{id}` | Get a file's metadata and base64 contents (uploader or conversation members only) |
| `GET` | `/file/{id}/download` | Get the raw bytes; images display inline, other files download |
| `GET` | `/capabilities` | Which optional features this server supports |
| `GET` | `/me` | Your profile: name, phone number, about text, avatar |
| `PATCH` | `/me` | Change your phone number, about text or avatar |
| `GET` | `/people` | Everyone on the server with about text, avatar and online status |
| `POST` | `/presence/typing` | Say you are typing in a conversation |
| `GET` | `/presence` | Who is typing in your conversations, and who is online |
| `GET` | `/contacts` | Your contacts, each matched to a user by phone number |
| `POST` | `/contacts` | Save a contact |
| `PATCH` | `/contacts/{id}` | Rename a contact or change their number |
| `DELETE` | `/contacts/{id}` | Delete a contact |
| `GET` | `/contacts/lookup` | Find the user who registered a phone number |
| `GET` | `/blocks` | The users you blocked |
| `POST` | `/blocks` | Block a user |
| `DELETE` | `/blocks/{userId}` | Unblock a user |
| `GET` | `/chat-prefs` | Your pinned, archived, muted and cleared chats |
| `PATCH` | `/chat-prefs/{conversationId}` | Pin, archive, mute or clear a chat |
| `PATCH` | `/conversation/{id}` | Rename a group |
| `POST` | `/conversation/{id}/members` | Add people to a group |
| `POST` | `/conversation/{id}/leave` | Leave a group |
| `POST` | `/message/{id}/react` | React to a message with an emoji |
| `PATCH` | `/message/{id}` | Edit your message (within 15 minutes) |
| `DELETE` | `/message/{id}` | Delete a message for yourself or for everyone |
| `POST` | `/message/{id}/star` | Star or unstar a message |
| `GET` | `/message/starred` | Your starred messages |
| `POST` | `/message/forward` | Forward a message to up to 5 conversations |
| `GET` | `/message/search` | Search a conversation's messages |
| `POST` | `/status` | Post a status update (text or image) that lasts 24 hours |
| `GET` | `/status` | Your status updates and those of people you know |
| `POST` | `/status/{id}/view` | Mark a status update as viewed |
| `GET` | `/status/{id}/viewers` | Who viewed your status update |
| `DELETE` | `/status/{id}` | Delete your status update |
| `PATCH` | `/conversation/{id}/disappearing` | Turn disappearing messages on (24 hours or 7 days) or off |
| `POST` | `/message/screenshot` | Tell a chat you took a screenshot (posts a system message) |
| `POST` | `/message/{id}/open` | Open a snap (view-once photo), once |
| `GET` | `/streaks` | Your DM streaks |
| `GET` | `/debug/logs` | Recent server log lines for the app's Diagnostics panel. Only when `DEBUG_LOGS=true`; hidden from Swagger. |

## Server behaviour beyond the contract

These additions do not change any route or response shape:

- Read receipts: `GET /conversation` marks the caller's messages as delivered, and `GET /message`
  marks that conversation's messages as read for the caller.
- Diagnostics logs: `GET /debug/logs?after=<seq>&limit=<n>` returns up to the last 500 log lines as
  `{ entries: [{ seq, time, level, context, message, requestId, isPoll }], latestSeq, oldestSeq }`.
  Requests that send `X-Request-Id` or `X-Client-Poll` headers get those tags on every log line
  they cause, so the app can match its requests to server lines.
- Upload cleanup: files uploaded with `POST /file` but never sent in a message, and not used as an
  avatar or a status image, are deleted after `FILE_ORPHAN_TTL_HOURS`. The same job deletes
  expired status updates, disappearing messages past their `expiresAt` (and their files once no
  other message, avatar or status uses them), and the photos of snaps that every recipient has
  opened. It runs on startup and then hourly.
- Presence: every authenticated request records the caller's `lastSeenAt` (at most once every 10
  seconds). This never fails a request.

## Optional features

None of these change the existing routes. Request bodies and query parameters use snake_case and
responses use camelCase, like the rest of the API. Every route needs the usual `Authorization`
header. `GET /capabilities` returns `{ version: 1, features: [...] }` so an app can tell whether a
server supports them; a server without that route supports none.

### Profile and people

`GET /me` returns `{ id, name, phoneNumber, about, avatarFileId, avatarPreset }`. `PATCH /me`
accepts `phone_number` (an empty string removes it), `about` (up to 140 characters),
`avatar_file_id` (an IMAGE you uploaded; `null` removes it) and `avatar_preset` (see below). A phone
number already used by another account gives 409.

`GET /people` lists every user, sorted by name, as `{ id, name, about, avatarFileId, avatarPreset,
lastSeenAt, online }`. Phone numbers and passwords are never included. The password still lives in the
`phone` field of the user document, so the real number is stored separately in `phoneNumber`.

### Avatar presets

An illustrated avatar is stored as `"<style>:<seed>"`. The style is one of `adventurer`,
`big-smile`, `fun-emoji`, `micah`, `bottts-neutral` or `avataaars`, and the seed is 1 to 40
characters of letters, digits, spaces, `_` or `-`. Anything else gives 400 "Unknown avatar". The
server only stores the string; the app draws the picture. A user has either a photo or a preset:
setting `avatar_preset` clears `avatarFileId`, setting `avatar_file_id` clears `avatarPreset`, and
sending both non-null in one request gives 400. `null` removes the preset.

### Phone numbers

Everything except digits and a leading `+` is ignored. A number must have 7 to 15 digits, otherwise
the server answers 400 "Enter a valid phone number (7 to 15 digits)". It is stored as the optional
`+` followed by the digits. Two numbers belong to the same person when their last 10 digits match,
so `+91 98100 00002` and `09810000002` are the same number.

### Presence

A user is online when their last request was within 30 seconds. `POST /presence/typing` with
`conversation_id` marks you as typing there for 6 seconds. `GET /presence` returns
`{ typing: { conversationId: [userId] }, online: { userId: { online, lastSeenAt } } }`, covering
every conversation you are in and everyone you share one with.

### Contacts

Contacts belong to the person who saved them. Each has a `name` (1 to 60 characters) and a
`phone_number`; responses include `userId`, the user who registered that number, or `null`. This is
worked out each time you read your contacts, so a contact becomes linked as soon as the person adds
the number to their profile. Saving the same number twice gives 409 "Already in your contacts as
<name>". `GET /contacts/lookup?phone_number=...` checks a number without saving it.

### Blocking

Blocking someone hides the messages they send you from then on (`GET /message` and search) and
hides their status updates. They can still send messages, but you do not see them. While you block
someone you cannot message them in a DM (403 "Unblock this contact to send a message").

### Chat preferences

Per user and per conversation: `pinned` (at most 3 chats), `archived` (archiving also unpins),
`muted_until` (an ISO date, or `null` to unmute) and `clear: true`, which hides every message up to
that moment from your own `GET /message`. Only chats you have changed are listed.

### Groups

Any participant of a group can rename it, add people (who also get the group in their user
record, just like on creation) or leave it. These routes answer 400 for a DM.

### Message actions

Every message the server returns now also has `replyTo`, `reactions`, `editedAt`, `deleted`,
`forwarded` and `starred` (whether you starred it), next to the existing fields.

- Reply: send `reply_to_id` with `POST /message`; it must be a message in the same conversation.
- React: one emoji per person; an empty string removes yours.
- Edit: only the sender, only within 15 minutes, sets `editedAt`.
- Delete: `scope=me` hides the message only for you. `scope=everyone` (sender only) keeps a
  placeholder with `deleted: true`, empty `content` and no file.
- Star: private to you; `GET /message/starred` returns up to 100, newest first.
- Forward: copies the text and attachment into up to 5 conversations you are in, marked
  `forwarded: true`. Recipients can open the attachment because it was sent in their conversation.
- Search: case-insensitive, newest first, up to 50 results, with the same hiding rules as
  `GET /message`.

`GET /message` still returns pages of 20 with the same cursor. Hidden messages are filtered in the
database query, so pages stay full.

### System messages and screenshots

A message with `type: "SYSTEM"` is a notice rather than something a person wrote: `content` is the
sentence to show and `senderId` is the user it is about. `systemKind` says what it is about
(`"screenshot"` or `"disappearing"`) and is `null` on every other message. System messages cannot
be edited, forwarded or deleted for everyone (400), and they do not count towards streaks.

`POST /message/screenshot` with `{ conversation_id }` posts "<username> took a screenshot" in a
conversation you are in (403 otherwise) and returns the new message (201).

### Disappearing messages

`PATCH /conversation/{id}/disappearing` with `{ seconds }` (0, 86400 or 604800) sets the timer for
a DM or group you are in (403 otherwise) and returns the conversation. It also posts a system
message: "<username> turned on disappearing messages: 24 hours" (or "7 days"), or
"<username> turned off disappearing messages". That message never expires.

Every conversation the server returns has `disappearSeconds` (0 when off). While the timer is on,
every new message (sent, forwarded, snaps and screenshot notices) gets
`expiresAt = createdAt + seconds`; every message response has `expiresAt` (`null` when it never
expires). `GET /message`, search and starred leave out expired messages in the database query, so
pages stay full, and the hourly cleanup deletes them. Turning the timer off does not change
messages that already have an `expiresAt`.

### Snaps

A snap is a view-once photo: `POST /message` with `file_id` (an IMAGE), `view_once: true`, an
optional caption in `content` and optional `view_seconds` (1 to 30, default 10). Without an image
the server answers 400 "A snap needs a photo".

Every message response has `viewOnce`, `viewSeconds` (`null` for normal messages) and `openedBy`.
A snap keeps `type: "IMAGE"`, but every response returns `fileId: null` and `file: null`, for the
sender too. The photo is only available through `POST /message/{id}/open`, which returns
`{ id, data, content, viewSeconds }` with `data` as a `data:<mime>;base64,...` URL and adds you to
`openedBy`. The sender gets 403 "You can't open your own snap", a second open gives 410
"Snap already opened", and a message that is not a snap gives 400. `GET /file/{id}` and its
download refuse a snap's file (403) to everyone but the uploader. Snaps cannot be forwarded or
edited (400). Once every recipient has opened a snap, the cleanup job deletes its photo; the
message stays and shows as opened.

### Streaks

`GET /streaks` returns `{ [conversationId]: { count, expiresSoon } }` for your DMs with a streak.
A UTC calendar day counts when both people sent at least one message that is not a system message.
`count` is the run of counting days ending today, or ending yesterday when today does not count
yet; then `expiresSoon` is true. The server looks back at most 400 days and leaves out DMs where
either person blocked the other. Messages deleted by the disappearing timer no longer count, so a
DM with a 24-hour timer can lose older streak days once the cleanup runs.

### Status updates

A status update is text (up to 700 characters, with an optional `#RRGGBB` background) or an image
you uploaded with an optional caption. It disappears after 24 hours. `GET /status` returns your own
updates and, grouped per person, the updates of people you share a conversation with or saved as a
contact, leaving out people you blocked. Groups you have not fully viewed come first. Only you can
see who viewed your updates. Anyone signed in can open a live status image or an avatar with
`GET /file/{id}`.

## Fact bot

With `BOT_MODE=true`, the server creates a bot user called `natterbot`. Every 10 seconds it sends
the next fun fact from `src/bot/facts.data.ts` to each real user, in one DM per user. Start it
with `npm run docker:up:bot` or, without Docker, `npm run start:dev:bot`.

## Logs

Every request prints one line with the method, URL, status, time and user, plus a short summary
of the body. Long text and base64 are shown as `<N chars>`, and passwords are never printed.
Failed requests add a `reason="…"`, and server errors also print a stack trace.

```
[HTTP] POST /message 201 42ms user=zara {conversation_id="6af2…", content="see you at 6"}
[HTTP] POST /message 400 8ms user=zara {…} reason="file_id must reference a file uploaded by the sender"
```

Sign-ups, sent messages, read receipts, bot ticks and upload cleanup print their own lines.
MongoDB's logs are hidden unless `MONGO_SILENT_LOGS=false`.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run docker:up` | Build and start MongoDB and the API |
| `npm run docker:up:bot` | Same, with the fact bot on |
| `npm run docker:down` | Stop the containers |
| `npm run docker:logs` | Follow the API logs |
| `npm run docker:seed` | Seed demo data inside the `natter_api` container |
| `npm run start:dev` | Run locally with hot reload |
| `npm run start:dev:bot` | Run locally with the fact bot on |
| `npm run build` | Compile to `dist/` |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:push` | Push the schema to the database |
| `npm run seed` | Seed demo data against `DATABASE_URL` |
