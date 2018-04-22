# Discord Emote Tracker
A Discord bot that tracks the usage of emotes within a Discord
server. 

## Dependencies
1. Install [Cassandra](https://cassandra.apache.org/doc/latest/getting_started/installing.html) locally
2. Install [NodeJS version 8 or later](https://nodejs.org/en/)
3. Open a terminal in the bot's folder
4. Run `npm install`

## Installation
First, you'll need a new bot account
1. Head over to the [applications page](https://discordapp.com/developers/applications/me).
2. Click "new application". Give it the name, picture, and description you want.
3. Click "Create Bot User" and click "Yes, Do It!" when the dialog pops up.
4. Copy down the `token`. This is what is used to log the bot in.
5. Put your `token` in an environment variable named `EMOTE_BOT_TOKEN`.
If you don't know how to do that, google "How to define environment variable on" followed by your operating system (Windows, Linux, macOS, etc.)

Then, you'll need to invite the bot on a server
1. Head over to the [applications page](https://discordapp.com/developers/applications/me).
2. Click on your bot
3. Click on the `Generate OAuth2 URL` button
4. Click the `COPY` button (the default values are good enough, if you know what you're doing, you can change them)
5. Paste the copied url into your browser
6. Select the server you want the bot to be in
7. Click the `Authorize` button

Finally, you'l need to run the bot, see the next section for instructions about that.

## Running the bot
1. Open a terminal in the bot's folder
2. Run `npm start`