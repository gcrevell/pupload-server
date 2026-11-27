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

Pupload keeps its settings in `settings.json` in its config folder. The first time it starts, it writes the file with the defaults. A setting left out of the file uses its default, and Pupload won't start if one is wrong.

The config folder is `config/` in the folder Pupload runs from, or `PUPLOAD_CONFIG_DIR` if that's set.

| Setting | Default | What it sets |
| --- | --- | --- |
| `port` | `7875` | The port Pupload listens on |

## API

The API is versioned in its path, starting at `/api/v1`. A new version comes only with a change that would break an app using the current one. New endpoints and fields go into the current version.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/info` | `{ "version": "2026.11.3" }`: the server's version, from `PUPLOAD_VERSION`, or `dev` when that isn't set |

## Testing a change

```sh
npm test
```

The tests use Node's built-in test runner and start the server on a free port.
