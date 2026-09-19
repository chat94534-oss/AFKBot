# AFKBot

A headless Minecraft AFK bot that runs on GitHub Actions, 24/7, for free.

Built with [mineflayer](https://github.com/PrismarineJS/mineflayer). It joins your
server, hops and looks around every 45 seconds so idle-kick plugins leave it alone,
and reconnects automatically when it drops.

## Requirements

Your server must be reachable from the public internet. GitHub's runners cannot see
`localhost`, `192.168.x.x`, or anything behind your router without port forwarding.
A hosted server, a public IP with port 25565 forwarded, or a domain all work.

## Setup

1. Fork or push this repo to GitHub. **Keep it public** — public repos get unlimited
   Actions minutes, private repos only get 2000 per month (about 33 hours).

2. Add your server details under **Settings → Secrets and variables → Actions**:

   | Secret | Required | Example |
   |---|---|---|
   | `MC_HOST` | yes | `play.example.com` |
   | `MC_PORT` | no (default `25565`) | `25565` |
   | `MC_USERNAME` | no (default `AFKBot`) | `MyAFKBot` |

   And under the **Variables** tab:

   | Variable | Required | Notes |
   |---|---|---|
   | `MC_AUTH` | no (default `offline`) | `offline` for cracked servers, `microsoft` for premium |
   | `MC_VERSION` | no (auto-detect) | Set to e.g. `1.20.4` if auto-detect picks wrong |

3. Go to **Actions → afk → Run workflow** to start it. After that the hourly schedule
   keeps it alive on its own.

## How it stays up 24/7

A single GitHub Actions job is capped at 6 hours. The workflow runs the bot for 5h45m,
then exits. Meanwhile the hourly cron keeps a second run queued behind the
`afk` concurrency group, so it starts the moment the first one finishes. Extra cron
ticks cancel each other while pending and cost nothing.

## Caveats

- **GitHub disables scheduled workflows after 60 days with no commits to the repo.**
  Push any commit every couple of months, or GitHub will email you and stop the cron.
- **Premium (`microsoft`) accounts are awkward here.** Microsoft auth needs an
  interactive device-code login and a cached token, which does not survive an
  ephemeral runner. Offline-mode (cracked) servers are what this is built for.
- **This is not what GitHub Actions is for.** GitHub's terms restrict Actions to work
  related to building, testing, and deploying software. A bot idling in a game is not
  that, and running it around the clock can get the repo or account flagged. Your call.
- Check your server's rules. Plenty of servers ban AFK bots.

## Local run

```bash
npm install
MC_HOST=play.example.com MC_USERNAME=MyAFKBot npm start
```
