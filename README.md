# Pupload(-server)

This is a self hosted docker image designed to run on a Raspberry Pi 5 to backup your iOS iCloud photos to your own storage. All your photos and data, backed up and filed away. Features:

* iCloud aware -- Syncs iOS photo data, including the cloud ID to avoid backing up each photo multiple times
* Stable backup -- Backups are one-way, so you never have to worry about a photo going missing
* Complete photo data -- Live Photos, RAW and HEIC formats, metadata, versions, and albums are all supported
* Local data -- You never have to worry about loosing access to your data, or being locked out
* Syncing with popular apps -- Immach and Photo Prism can be configured to be reloaded on uploads
* Custom event scripting -- Have a backup for your backup? Run custom json scripts for any event


## Running it

It needs Node 25 or newer, and has no dependencies to install.

```sh
npm start
```

It listens on port 7875. `GET /` answers `hello world`.

## Settings

Set these as environment variables. `server/env.ts` reads them when the server starts, and it won't start if one is wrong.

| Variable | Default | What it sets |
| --- | --- | --- |
| `PORT` | `7875` | The port the server listens on |

## Testing a change

```sh
npm test
```

The tests use Node's built-in test runner and start the server on a free port.
