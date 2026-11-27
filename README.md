# Pupload(-server)

This is a self hosted docker image designed to run on a Raspberry Pi 5 to backup your iOS iCloud photos to your own storage. All your photos and data, backed up and filed away. Features:

* iCloud aware -- Syncs iOS photo data, including the cloud ID to avoid backing up each photo multiple times
* Stable backup -- Backups are one-way, so you never have to worry about a photo going missing
* Complete photo data -- Live Photos, RAW and HEIC formats, metadata, versions, and albums are all supported
* Local data -- You never have to worry about loosing access to your data, or being locked out
* Syncing with popular apps -- Immach and Photo Prism can be configured to be reloaded on uploads
* Custom event scripting -- Have a backup for your backup? Run custom json scripts for any event


## Running it

```sh
docker build -t pupload .
docker run -d --name pupload --read-only -v pupload-config:/config -p 7875:7875 pupload
```

It listens on port 7875. `GET /` answers `hello world`, and the container reports healthy once `GET /api/v1/info` answers. To use another port in Docker, change the host side of `-p` and leave `port` in the settings at 7875, which is where the image expects it.

Without Docker, it needs Node 26 or newer, and has no dependencies to install:

```sh
npm start
```

## Settings

Pupload keeps its settings in `settings.json` in its config folder. The first time it starts, it writes the file with the defaults. A setting left out of the file uses its default, and Pupload won't start if one is wrong.

The config folder is `config/` in the folder Pupload runs from, or `PUPLOAD_CONFIG_DIR` if that's set. In the image it's `/config`, and a folder mounted there has to be writable by uid 1000, the image's `node` user.

| Setting | Default | What it sets |
| --- | --- | --- |
| `port` | `7875` | The port Pupload listens on |

## Data

Pupload keeps its data in `pupload.db`, a SQLite database beside `settings.json` in the config folder. The folder has to be writable, not just the file, because SQLite keeps `pupload.db-wal` and `pupload.db-shm` beside it while Pupload runs.

To back it up, copy the config folder while Pupload is stopped. While it runs, recent changes can still be in `pupload.db-wal`.

Pupload won't start on a `pupload.db` from a newer version than it knows, for example after going back to an older image. Run the newer image again.

## API

The API is versioned in its path, starting at `/api/v1`. A new version comes only with a change that would break an app using the current one. New endpoints and fields go into the current version.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/info` | `{ "version": "2026.11.3" }`: the server's version, from `PUPLOAD_VERSION`, or `dev` when that isn't set |

An error under `/api` answers with its HTTP status and a body of `{ "error": "…" }`, where the message is a sentence that can be shown to the person.

A request that changes something (anything but `GET` or `HEAD`) is refused with a 403 when a browser sends it from another site's page. Requests with no `Sec-Fetch-Site` or `Origin` header, such as from curl, go through.

An image gets `PUPLOAD_VERSION` from the build argument of the same name: `docker build --build-arg PUPLOAD_VERSION=2026.11.3 -t pupload .`

## Testing a change

```sh
npm test
```

The tests use Node's built-in test runner and start the server on a free port.

For a change to the Dockerfile or how the server starts, check that the image builds and goes healthy on a read-only filesystem:

```sh
docker build -t pupload:check .
docker run -d --name pupload-check --read-only -v pupload-check-config:/config -p 127.0.0.1:17875:7875 pupload:check
docker inspect -f '{{.State.Health.Status}}' pupload-check   # healthy within about 10 s
curl 127.0.0.1:17875/api/v1/info                             # {"version":"dev"}
docker stop pupload-check
docker run --rm -v pupload-check-config:/config --entrypoint ls pupload:check /config   # lists pupload.db and settings.json, with no -wal left over
docker rm -f pupload-check && docker volume rm pupload-check-config
```

## License

Pupload is licensed under the [GNU Affero General Public License v3.0](LICENSE), version 3 only. If you run a modified version as a service other people use over a network, you have to offer them its source code.
