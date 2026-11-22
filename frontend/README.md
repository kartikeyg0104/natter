# Natter (app)

The Natter mobile app: Expo (SDK 58, React Native 0.88, React 19.3), Expo Router, plain
JavaScript. It runs in **Expo Go** on Android and iOS, and in a desktop browser for testing.

See [`../README.md`](../README.md) for the whole project and [`../backend`](../backend) for the server.

## Run it

1. Start the server (see `../backend/README.md`) so the API answers on `http://localhost:3000`,
   and seed the demo accounts.
2. Start the app from this folder:
   ```bash
   npm install
   npx expo start            # scan the QR code with Expo Go
   npx expo start --web      # or open it in a browser at http://localhost:8081
   ```
3. On the sign-in screen keep **This computer** (the app finds the server on the same Wi-Fi by
   itself) or choose **Class server** and type its address, then check it.
4. Sign in as `zara`, `ishaan`, `noor`, `vikram` or `tara` with the password `natter123`.
   Any new username and password creates an account.

The phone and the computer must be on the same Wi-Fi. The first time, macOS may ask to allow
incoming connections on port 3000.

## Scripts

| Command | What it does |
|---|---|
| `npx expo start` | Dev server for Expo Go |
| `npx expo start --web` | The same app in a browser |
| `npm test` | Jest unit tests |
| `npm run test:coverage` | Tests with a coverage report |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `python3 scripts/make-icons.py` | Redraws the app icon, splash and favicon (needs Pillow) |

## Screens

| Route | Screen |
|---|---|
| `app/sign-in.jsx` | Server choice, username and password |
| `app/(tabs)/inbox.jsx` | Every conversation, pinned first; search; All / Unread / Direct / Groups; typing and mute icons; long-press to pin, mute, archive, mark read |
| `app/(tabs)/updates.jsx` | 24-hour status updates: yours, recent and viewed |
| `app/(tabs)/contacts.jsx` | Address book: saved numbers (message or invite), New contact, Message a number, New group, everyone else on the server |
| `app/(tabs)/you.jsx` | Profile (photo, number, about), picture style, theme, starred, archived, blocked, server, developer tools, sign out |
| `app/chat/[id].jsx` | Conversation: presence and typing, reactions, replies, edit, delete for me / everyone, forward, star, search, photos, camera, documents, voice notes |
| `app/chat-info/[id].jsx` | Contact or group info: save contact, mute, pin, archive, starred, clear chat, block; rename, add members, leave |
| `app/contact-edit.jsx` | Save or edit a contact by name and number (shows whether the number is on Natter) |
| `app/profile-edit.jsx` | Photo, phone number and about; also the first-run setup after sign up |
| `app/forward.jsx`, `starred.jsx`, `archived.jsx`, `blocked.jsx`, `add-members.jsx` | Forward picker, starred messages, archived chats, blocked contacts, add group members |
| `app/status-new.jsx`, `app/status/[userId].jsx` | Write a text status; view updates full screen (with viewers for your own) |
| `app/new-group.jsx` | Name a group and tick its members |
| `app/image/[id].jsx` | Full-screen photo with pinch and double-tap zoom |

The extra features (everything beyond basic messages, photos and groups) need the Natter
server. The app asks `GET /capabilities` after sign in and hides what the server doesn't offer,
so it still works against a server that only has the basic routes.

## Design system

Tokens live in `src/constants/theme.js`; the product name in `src/constants/brand.js`.

- **Colour:** cool paper greys (`#EEF1F6`), cobalt for actions and your own messages
  (`#2F45D8`), marigold for unread counts (`#FFC93C`). A matching dark theme.
- **Type:** Bricolage Grotesque for titles, DM Sans for reading.
- **Shape:** avatars are squircles; groups show a mosaic of their members' initials.
- **Pictures:** Initials (default), Shapes or Characters, generated on the device from the
  username, so everyone sees the same picture without anything being uploaded.
- **Feedback:** a banner drops in under the status bar for new messages, failed sends and
  connection changes; short confirmations ("Photo sent", "Copied") use the same banner.

Shared building blocks are in `src/components/kit/` (Button, IconButton, TextField, ListRow,
Group, Segmented, Toggle, Sheet, EmptyState, Skeleton, CountBadge, StatusPill).

## Diagnostics

A developer panel for seeing how the app talks to the server. Open it from
**You > Diagnostics**, by shaking the phone, with the optional floating shortcut, or by
long-pressing the banner. Sections: Status, Flow (an animated map of each request), Network,
Logs (app and server), and Tools (pause polling, change poll intervals, simulate offline).
Server logs are only available from the local server (`DEBUG_LOGS=true`).

## Code rules

- App logic uses `useState`, `useEffect` and custom hooks built from them; shared state lives
  in small stores (`src/store/createStore.js`) read through `useStore`.
- `.jsx` for anything that renders, `.js` for logic and tests.
- Lucide icons and font weights are imported one file at a time, because Metro bundles whole
  package indexes otherwise.
- Everything is logged through `src/utils/logger.js`; passwords and the `Authorization`
  header are never logged.

## Credits

Generated avatars are drawn on the device with [DiceBear](https://www.dicebear.com) (MIT).
Preloaded avatar styles and their licences:

- "Adventurer" by Lisa Wischofsky, CC BY 4.0
- "Big Smile" by Ashley Seo, CC BY 4.0
- "Fun Emoji" by Davis Uche, CC BY 4.0
- "Micah" by Micah Lanier, CC BY 4.0
- "Avataaars" by Pablo Stanley, free for personal and commercial use
- "Bottts" by Pablo Stanley, free for personal and commercial use
- "Shapes" and "Thumbs" by DiceBear, CC0

Fonts: Bricolage Grotesque and DM Sans (SIL Open Font License). Icons: Lucide (ISC).
