# All-in-one twitch widgets app

This project aims to replace streamlabs widgets as well as add some missing functionality I wish streamlabs had

Do the following in order to use yourself:

## Albedo Client (Angular)

Provides UI widgets for use in OBS

### Setup

Navigate to folder
`cd AlbedoClient`

Install dependencies
`npm i`

Set up channel point rewards (optional)
Go to `AlbedoClient/src/app/components/point-redemptions/rewards.data.ts` and add your channel point rewards
Then to `AlbedoClient/src/assets` to add relevant files

Type breakdown:
'audio': expects an mp3 file in `AlbedoClient/src/assets/audio`
'video': expects an mp4 file in `AlbedoClient/src/assets/video`
'hybrid': expects an mp3 file in `AlbedoClient/src/assets/audio` as well as a gif in `AlbedoClient/src/assets/images`

Build widget output
`ng build`

## Nigredo Server (Epress/node)

Handles all interactions with twitch and uses socket.io to talk to Albedo and Rubedo

### Setup

Navigate to folder
`cd NigredoServer`

Install dependencies
`npm i`

Create `.env` and add environment variables

```
BOT_USERNAME=
BOT_TOKEN=oauth:
BOT_CHANNEL=
CLIENT_ID=
CLIENT_SECRET=
```

Start Server
`npm start`

## First Time Set Up

### Get latest widget code

Navigate to folder
`cd AlbedoClient`

Build newest widgets
`ng build`

Navigate to folder
`cd ../NigredoServer`

Run update script
`npm run update`

### Run Auth Flow

- Start NigredoServer (see above)
- Navigate to `http://localhost:3000/auth` in a browser
- Authorize With Twitch

## Roadmap:

- Add Subscription alerts

- Improve emotes to display animated emotes

- Add channel specific badges

- Make into .exe for ease of use
