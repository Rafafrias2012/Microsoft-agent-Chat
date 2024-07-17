# msagent-chat

Monorepo for the Computernewb Agent Chat project

Includes:

- `msagent.js/`: A JavaScript library for parsing and displaying Microsoft Agent ACS files
- `protocol/` Shared JSON protocol types for the webapp and server
- `webapp/` The Agent Chat Webapp
- `server/` - The Agent Chat Server

## Jumpstart

1. Install dependencies: `yarn`
2. Build everything: `yarn build`
3. Copy `server/config.example.toml` to `server/config.toml` and fill out the relevant fields.
4. Run the server: `yarn workspace @msagent-chat/server serve`
5.  - Run the webapp on the development webserver: `yarn workspace @msagent-chat/webapp serve`; OR
    - Copy the webapp contents from `webapp/dist/` to your webroot