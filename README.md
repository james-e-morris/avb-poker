# AVB Planning Poker

Fast planning poker for sprint refinement and story estimation

## Quick Start Steps

1. Enter your name
2. Create Session or Join Session
3. Share the Invite link
4. Vote
5. Reveal
6. Set Final pick
7. Start Next Story

## What You Get

- Private voting with Fibonacci cards
- Live shared session for all participants
- Results with Average, Consensus, and Nearest SP
- Moderator final decision before moving on
- Built-in calculator + AI prompt helper

## Session Flow

1. Moderator sets Story name
2. Team votes with cards or calculator
3. Moderator clicks Reveal Votes
4. Team discusses outliers
5. Moderator sets Final pick
6. Moderator starts Next Story

> Next Story is disabled until Final pick is set

## Roles

- Moderator: edit story, reveal, set final pick, start next story
- Participant: vote and review results

If all numeric votes match, Final pick is auto-suggested from consensus

## Voting Options

- Cards: `0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, coffee`
- Calculator Vote: pick 6 factors, then click Vote X

## Calculator (Quick)

- Factors: Size, Complexity, Uncertainty, Cognitive Load, Dependencies, Risk
- Levels: Low = 1.0, Medium = 1.1, High = 1.2
- Output: raw score + mapped Fibonacci story points

## Side Panels

- History: previous revealed stories and final picks
- Examples: one-click sample scenarios
- AI Prompt: copy prompt to Jira Rovo AI, paste response to auto-apply ratings

## Invite and Rejoin

- Invite copies the current session URL
- Session ID is uppercase letters/numbers
- Join accepts 4-12 characters

If a session expires, create a new one and resend invite

## Quick Troubleshooting

- Cannot join: session may be expired
- Realtime not updating: app may be in demo mode (best in same-browser tabs)
- Cannot vote: voting is locked after reveal until next story starts
