# Telegram CI Status

A GitHub Action that sends Telegram notifications for CI/CD workflows with automatic start and completion updates using pre/post hooks.

## Usage

```yaml
- uses: EzyGang/telegram-ci-status@v1
  with:
    bot_token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    chat_id: ${{ secrets.TELEGRAM_CHAT_ID }}
```

That's it! The action automatically:
1. Sends "CI Started" message at the beginning (pre-hook)
2. Updates with the final status at completion (post-hook, runs even on failure)

### Options

| Input | Required | Description |
|-------|----------|-------------|
| `bot_token` | Yes | Telegram bot token from @BotFather |
| `chat_id` | Yes | Chat ID or channel username (with @) |
| `message_thread_id` | No | Forum topic ID for supergroups |
| `is_deployment` | No | Force deployment mode (auto-detected from tags by default) |
| `pin_on_success` | No | Pin message on successful deployment |

### Example with Deployment

```yaml
- uses: EzyGang/telegram-ci-status@v1
  with:
    bot_token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    chat_id: ${{ secrets.TELEGRAM_CHAT_ID }}
    pin_on_success: true  # Pins successful deployment messages
```

The action auto-detects deployments from tags, deployment events, and workflow_dispatch with environment.

## Features

- **Single Action** - Add one action to your job, get start and completion notifications automatically
- **Pre/Post Hooks** - Uses GitHub Actions lifecycle hooks for automatic execution
- **Zero Configuration** - No job outputs or `if: always()` needed
- **Auto-Detection** - Automatically detects deployments from tags, deployment events, and workflow dispatch with environment
- **Message Pinning** - Optionally pin successful deployment messages
- **HTML Formatting** - Rich formatted messages with links and emojis

## Setup

1. Create a Telegram bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID:
   - For personal chats: Use [@userinfobot](https://t.me/userinfobot)
   - For channels: Add bot to channel and check `https://api.telegram.org/bot<token>/getUpdates`
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to your repository secrets

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Pre Hook (dist/pre.js)                                      │
│  ├─ Sends "CI Started" message to Telegram                   │
│  ├─ Saves message_id, is_deployment to state                 │
│  └─ Outputs message_id and is_deployment                     │
├─────────────────────────────────────────────────────────────┤
│  Main Phase                                                  │
│  └─ Your workflow steps execute                              │
├─────────────────────────────────────────────────────────────┤
│  Post Hook (dist/post.js) - Always runs                      │
│  ├─ Retrieves state from pre hook                            │
│  ├─ Gets job status (success/failure/cancelled)              │
│  ├─ Edits message with final status                          │
│  └─ Pins message if deployment + success + pin_on_success    │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Tools & Versions

- **Node.js**: 24.x (GitHub Actions `node24` runtime)
- **Package Manager**: pnpm 10.x
- **Language**: TypeScript 6.x
- **Testing**: Vitest 4.x with coverage-v8
- **Build**: TypeScript + ncc (bundles dependencies into single files)

### Scripts

```bash
pnpm install          # Install dependencies
pnpm run bundle       # Bundle action for distribution (creates dist/ files)
pnpm run build        # Just compile TypeScript (for local dev)
pnpm run lint         # Type check and lint
pnpm run test         # Run tests
pnpm run test:coverage # Run tests with coverage
```

### CI Workflows

- **ci.yml**: Runs tests, lint, and verifies dist/ is up-to-date on push to main/master and PRs

### Bundled Distribution

This action is distributed as bundled JavaScript files in `dist/`:
- `dist/pre.js` - Pre-hook (sends start notification)
- `dist/main.js` - Main placeholder
- `dist/post.js` - Post-hook (updates notification on completion)

The files are bundled with [@vercel/ncc](https://github.com/vercel/ncc) to include all dependencies. Always run `pnpm run bundle` after making changes and commit the updated `dist/` files.

## Outputs

| Output | Description |
|--------|-------------|
| `message_id` | Telegram message ID of the notification |
| `is_deployment` | Whether this run was detected as a deployment |

## License

MIT
