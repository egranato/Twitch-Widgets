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

## Rubedo Utilities (Python)

Currently only censors chat and speaks it aloud

### Setup

Navigate to folder
`cd RubedoUtilities`

Install dependencies
`pipenv install`

Start Server
`python main.py`

## Roadmap:

Add Follow and Subscription alerts

Improve emotes to display animated emotes

More user interactions
