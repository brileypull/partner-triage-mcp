# Partner Triage MCP

A custom MCP server that gives Claude six tools over a mock partner
system: partner lookups, deal conflict checks, certification status,
routing rules and ticket filing. A Claude triage agent is in progress.

## What works today
- Six tools, tested in the MCP Inspector and Claude Code
- Fake partner data with built-in conflicts and edge cases

## Run it
npm install
npm run inspect

## Use it with Claude Code
Run `claude` in this folder. The .mcp.json file registers the server.

## What's next
A triage agent with human approval, and a 30-case eval set.