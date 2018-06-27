# Discord Emote Tracker
A Discord bot that tracks the usage of emotes within a Discord server.

## Documentation
Command and bot info can be found [here](https://bots.discord.pw/bots/434126095080488961).

## Dependencies
1. Install the database engine (See [the database installation instructions](#database-installation))
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

## Configuring the bot
The bot comes with a default configuration file that allows it to work right out of
the box (once you set your environment variables), but you're able to override this
behavior. The example [config](./config/config.example.json) file allows you to
specify config values in the same way they're defined in the [defaults](./config/default.json).
Once you've edited the example to your liking, simply rename it to `config.json`.

Finally, you'll need to run the bot, see the next section for instructions about that.

## Running the bot
1. Open a terminal in the bot's folder
2. Run `npm start`

If you want to add some flags, you can do so by doing `npm start --` and by adding a space before each flag. For example: `npm start -- -c` for the `-c` flag (see [the Execution flags section](#execution-flags) for a list of flags).

## Execution flags
| Flags             | Description                               |
| ----------------- | ----------------------------------------- |
| `-c`              | Adds colors to some console messages      |
| `-d` or `--debug` | Enables debugging messages                |
| `--no-backfill`   | Disable the parsing of older messages     |
| `--drop-tables`   | Recreates all tables on bot startup       |
| `--wipe-data`     | Deletes all data on bot startup           |

## Database Installation
### PostgreSQL (For Ubuntu)
1. Install PostgreSQL with `sudo apt install postgresql`
2. Change the password of the default user
    1. Log into the database by doing `sudo -u postgres psql`
    2. Change the password with `ALTER USER postgres WITH PASSWORD 'new password'` (replace `new password` by the password you want)
3. Change the config to enable password login on the postgres user
    1. Edit the postgres configuration file with `sudo vim /etc/postgresql/<version>/main/pg_hba.conf`
    2. Find the `local all postgres peer` line
    3. Change `peer` to `md5`
4. Restart PostgreSQL with `sudo service postgresql restart`
5. Create a database for the bot by running `createdb -U postgres <table name>`
6. Add the following to your environnement variables
    - `PGUSER=postgres`
    - `PGPASSWORD=<the password you've set in point 2.2>`
    - `PGDATABASE=<the database you created in point 5>`
