# Texas Hold'em Poker Rules & Implementation Analysis

**Created:** January 6, 2026  
**Purpose:** Reference document for validating AI Poker Arena game logic

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Table Setup](#table-setup)
3. [Dealer Button & Blinds](#dealer-button--blinds)
4. [Hand Rankings](#hand-rankings)
5. [Betting Rounds](#betting-rounds)
6. [Player Actions](#player-actions)
7. [Showdown Rules](#showdown-rules)
8. [Side Pots](#side-pots)
9. [Special Situations](#special-situations)
10. [Implementation Analysis](#implementation-analysis)

---

## Game Overview

Texas Hold'em is a community card poker game where each player receives **2 private hole cards** and shares **5 community cards** with all other players. The goal is to make the best 5-card hand using any combination of the 7 available cards.

### Key Characteristics
- 2-10 players per table (our game: 4 AI agents)
- Uses a standard 52-card deck
- No-Limit, Pot-Limit, or Fixed-Limit betting structures
- Forced bets (blinds) ensure action every hand

---

## Table Setup

### Positions (for 4 players, clockwise from dealer)
| Position | Name | Responsibility |
|----------|------|----------------|
| 1 | **Dealer/Button** | Acts last post-flop, best position |
| 2 | **Small Blind (SB)** | Posts half the minimum bet |
| 3 | **Big Blind (BB)** | Posts full minimum bet |
| 4 | **Under the Gun (UTG)** | Acts first preflop |

### Position Rotation
- The dealer button moves **clockwise** one position after each hand
- Blinds move with the button
- This ensures fairness over time

---

## Dealer Button & Blinds

### Blind Structure
- **Small Blind (SB):** Usually half the big blind (e.g., $10)
- **Big Blind (BB):** Minimum bet amount (e.g., $20)
- Blinds are **forced bets** posted before cards are dealt
- They create initial action and build the starting pot

### Posting Order
1. Small blind is posted by player to the left of dealer
2. Big blind is posted by player to the left of small blind
3. Cards are then dealt

### Button Movement
- After each hand, button moves one seat clockwise
- In heads-up (2 players): Button posts small blind and acts first preflop, second post-flop

---

## Hand Rankings

From highest to lowest:

| Rank | Hand | Description | Example |
|------|------|-------------|---------|
| 1 | **Royal Flush** | A-K-Q-J-10 of same suit | A♠ K♠ Q♠ J♠ 10♠ |
| 2 | **Straight Flush** | Five sequential cards of same suit | 9♥ 8♥ 7♥ 6♥ 5♥ |
| 3 | **Four of a Kind** | Four cards of same rank | K♠ K♥ K♦ K♣ 2♠ |
| 4 | **Full House** | Three of a kind + pair | J♠ J♥ J♦ 4♣ 4♠ |
| 5 | **Flush** | Five cards of same suit (not sequential) | A♦ J♦ 8♦ 6♦ 2♦ |
| 6 | **Straight** | Five sequential cards (mixed suits) | 10♠ 9♥ 8♣ 7♦ 6♠ |
| 7 | **Three of a Kind** | Three cards of same rank | 8♠ 8♥ 8♦ K♣ 2♠ |
| 8 | **Two Pair** | Two different pairs | A♠ A♥ J♦ J♣ 5♠ |
| 9 | **One Pair** | Two cards of same rank | Q♠ Q♥ 9♦ 6♣ 3♠ |
| 10 | **High Card** | No combination, highest card wins | A♠ J♥ 8♦ 6♣ 2♠ |

### Tiebreaker Rules
- **Same hand type:** Compare kickers (remaining cards) from highest to lowest
- **Identical hands:** Split the pot equally
- **Ace:** Can be high (A-K-Q-J-10) or low (5-4-3-2-A) in straights only

---

## Betting Rounds

### Overview of Rounds

| Round | Community Cards | Cards Revealed | Total Visible |
|-------|-----------------|----------------|---------------|
| **Preflop** | None | 0 | 2 (hole cards only) |
| **Flop** | 3 cards dealt | 3 | 5 |
| **Turn** | 1 card dealt | 4 | 6 |
| **River** | 1 card dealt | 5 | 7 |
| **Showdown** | N/A | 5 | 7 |

### Detailed Round Flow

#### 1. PREFLOP
1. Dealer button is assigned
2. Small blind and big blind are posted
3. Each player receives 2 hole cards (face down)
4. Betting begins with player to the LEFT of big blind (UTG)
5. Action proceeds clockwise
6. Big blind has option to raise even if no one raised ("option")

**First to act:** UTG (player after big blind)  
**Last to act:** Big blind (if no raise) or last raiser

#### 2. FLOP
1. Dealer "burns" one card (discards face down)
2. Three community cards are dealt face up
3. Betting begins with first active player to the LEFT of dealer
4. Action proceeds clockwise

**First to act:** First active player left of dealer (usually SB if still in)  
**Last to act:** Dealer/button (if still in)

#### 3. TURN
1. Dealer burns one card
2. One community card is dealt face up (4th street)
3. Betting begins with first active player to the LEFT of dealer
4. Same betting structure as flop

#### 4. RIVER
1. Dealer burns one card
2. One community card is dealt face up (5th street)
3. Final betting round
4. Same betting structure as flop/turn

#### 5. SHOWDOWN
1. If more than one player remains after river betting
2. Last aggressor (bettor/raiser) shows first
3. Other players can show or muck (fold without showing)
4. Best 5-card hand wins the pot
5. Ties split the pot equally

---

## Player Actions

### Available Actions

| Action | When Available | Description |
|--------|----------------|-------------|
| **Fold** | Always | Discard hand, forfeit any bets |
| **Check** | When no bet to call | Pass action, stay in hand |
| **Call** | When facing a bet | Match the current bet |
| **Bet** | When no bet exists | Make the first bet of the round |
| **Raise** | When facing a bet | Increase the bet amount |
| **All-In** | Always | Bet all remaining chips |

### Betting Rules

#### Minimum Bet
- First bet must be at least the big blind
- Raises must be at least the size of the previous raise

#### Minimum Raise
- Example: BB is $20, Player A bets $40 (raise of $20)
- Player B must raise to at least $60 (another $20 increase)
- This is called the "minimum raise rule"

#### Re-opening the Action
- A raise re-opens the betting for all players
- Players who already acted can act again
- Exception: All-in for less than minimum doesn't re-open

#### Betting Order
- Action always proceeds **clockwise**
- A round is complete when all active players have:
  - Matched the current bet, OR
  - Gone all-in, OR
  - Folded

---

## Showdown Rules

### Order of Showing Cards
1. **Last aggressor shows first** (player who made final bet/raise)
2. If no bets on final round, first active player left of dealer shows first
3. Subsequent players can:
   - Show their hand (must if claiming pot)
   - Muck (fold) without showing

### Determining the Winner
1. Each player makes their best 5-card hand from 7 available cards
2. Hands are compared according to hand rankings
3. If tied, kickers determine winner
4. If still tied, pot is split equally

### Showing Cards
- All cards are always shown at showdown in our spectator-view game
- Players can use 0, 1, or 2 hole cards with community cards
- "Playing the board" = using all 5 community cards

---

## Side Pots

### When Side Pots Occur
- When a player goes all-in for less than others have bet
- The all-in player can only win the main pot
- Remaining players compete for side pot(s)

### Side Pot Calculation

**Example 1: Two Players All-In with Different Stacks**
- Player A: $1000 all-in
- Player B: $500 all-in (calls)

**Result:**
- Main Pot: $1000 ($500 × 2) - A, B eligible
- Player A's extra $500 is RETURNED (not in any pot)
- Winner can only win $1000 total

**Example 2: Three Players with Different All-In Amounts**
- Player A: $100 all-in
- Player B: $300 all-in  
- Player C: $500 call

**Pots:**
- Main Pot: $300 ($100 × 3) - A, B, C eligible
- Side Pot 1: $400 ($200 × 2) - B, C eligible (B's extra $200 + C's $200)
- Side Pot 2: $200 - C only (returned since no one else can match)

**Example 3: Four Players All-In**
- Player A: $100 all-in
- Player B: $200 all-in
- Player C: $300 all-in
- Player D: $400 all-in

**Pots:**
- Main Pot: $400 ($100 × 4) - A, B, C, D eligible
- Side Pot 1: $300 ($100 × 3) - B, C, D eligible
- Side Pot 2: $200 ($100 × 2) - C, D eligible
- Side Pot 3: $100 - D only (returned)

### Multiple All-Ins
- Each all-in amount creates a new pot level
- Pots are awarded from smallest to largest
- Largest hand among eligible players wins each pot

### Key Rule: Maximum Winnable Amount
**A player can only win from each opponent an amount equal to their own all-in.**
- If you go all-in for $500, you can only win $500 from each other player
- Extra chips bet by opponents either go to side pots or are returned

---

## Special Situations

### Heads-Up (2 Players)
- Button posts small blind
- Non-button posts big blind
- Button acts FIRST preflop, SECOND post-flop
- Different from normal rotation

### String Betting (Not allowed)
- Must announce "raise" or put all chips in one motion
- Can't say "call" then add chips to raise
- Not applicable in our automated system

### Acting Out of Turn
- Generally binding unless action changes before their turn
- Not applicable in our automated system

### Dead Button
- When a player busts, button may skip positions
- Various rules exist for blind handling

### Running It Multiple Times
- Players can agree to deal remaining cards multiple times
- Reduces variance, splits pot by outcomes
- Not implemented in most automated games

### All-In Before Action Complete
- Player going all-in for less than minimum raise
- Action is NOT re-opened
- Other players can only call (not raise)

---

## Implementation Analysis

### ✅ Currently Implemented Correctly

| Feature | Status | Notes |
|---------|--------|-------|
| 4-player table | ✅ | Fixed 4 AI agents |
| 52-card deck | ✅ | Standard deck in `deck.ts` |
| 2 hole cards per player | ✅ | Dealt in `startNewHand` |
| 5 community cards | ✅ | Pre-dealt, revealed progressively |
| Round progression | ✅ | preflop → flop → turn → river |
| Preflop: 0 community cards | ✅ | Fixed in recent update |
| Flop: 3 cards | ✅ | Verified working |
| Turn: 4 cards | ✅ | Verified working |
| River: 5 cards | ✅ | Verified working |
| Showdown after river | ✅ | Resolves hand |
| Fold action | ✅ | Player exits hand |
| Call action | ✅ | Matches current bet |
| Raise action | ✅ | Increases bet |
| All-in action | ✅ | Bets remaining chips |
| Small blind | ✅ | $10 (SMALL_BLIND constant) |
| Big blind | ✅ | $20 (BIG_BLIND constant) |
| Burn cards | ✅ | Implemented in deck.ts |
| Hand ends when 1 player left | ✅ | Resolves to winner |

### ⚠️ Partially Implemented / Needs Review

| Feature | Status | Issue |
|---------|--------|-------|
| Dealer button rotation | ⚠️ | Button doesn't rotate between hands |
| Acting order preflop | ⚠️ | Should start UTG (after BB) |
| Acting order post-flop | ⚠️ | Should start left of dealer |
| Big blind "option" | ⚠️ | BB should get option to raise if no raise |
| Minimum raise rule | ⚠️ | Not enforcing min raise = previous raise |
| Check action | ⚠️ | May not be available when it should be |
| Betting round completion | ⚠️ | Need to verify all players acted correctly |
| Hand evaluation | ⚠️ | Currently random winner, not actual best hand |

### ❌ Not Implemented / Needs Fix

| Feature | Status | Priority |
|---------|--------|----------|
| ~~Proper hand ranking evaluation~~ | ✅ | DONE - hand-evaluator.ts |
| Side pots | ❌ | HIGH - Needed for all-in scenarios |
| ~~Kicker comparison~~ | ✅ | DONE - Part of hand evaluation |
| Split pots for ties | ❌ | MEDIUM - Needed for fairness |
| **All-in cap (max winnable)** | ❌ | **HIGH** - Uncapped all-in returns |
| **Running out board on all-in** | ⚠️ | IN PROGRESS - Deal cards before showdown |
| Heads-up special rules | ❌ | LOW - Only 4 players |
| Bet action (distinct from raise) | ❌ | LOW - Can consolidate |

### 🔍 Specific Code Issues to Review

#### 1. Action Order (`processNextAction`)
```
Current: Finds first non-folded, non-all-in player
Should: Follow position order based on round
- Preflop: UTG → SB → BB
- Post-flop: SB → Button (left of dealer first)
```

#### 2. Dealer Button Rotation
```
Current: First player is always dealer
Should: Rotate dealer position each hand
- Track dealer_seat_position in hands table
- Increment mod 4 each new hand
```

#### 3. Hand Evaluation (`resolveHand`)
```
Current: Random winner selection
Should: Evaluate actual poker hands
- Use hand-evaluator.ts (exists but unused)
- Compare all active players' best 5-card hands
- Handle ties and kickers
```

#### 4. Minimum Raise
```
Current: AI decides any amount
Should: Enforce minimum raise = previous raise size
- Track last_raise_amount
- Validate raise >= last_raise_amount
```

#### 5. Big Blind Option
```
Current: BB acts like other players preflop
Should: If action returns to BB with no raise, BB can check or raise
- This is the "option" - fundamental to poker
```

#### 6. Side Pots
```
Current: All chips go to single pot
Should: Create side pots when player(s) all-in
- Track eligible players per pot
- Award pots separately
```

---

## Recommended Priority Fixes

### P0 - Critical (Game Correctness)
1. **Hand evaluation** - Use proper poker hand rankings
2. **Action order** - Correct preflop and post-flop order
3. **Dealer rotation** - Button moves each hand

### P1 - Important (Game Fairness)
4. **Big blind option** - BB gets last action preflop
5. **Minimum raise rule** - Enforce proper raise sizing
6. **Side pots** - Handle multiple all-ins correctly

### P2 - Nice to Have
7. **Check action** - Explicit check (vs auto-check on call $0)
8. **Split pots** - Handle tied hands
9. **Detailed logging** - Track all actions for verification

---

## Testing Checklist

### Basic Flow
- [ ] New hand starts with correct blinds posted
- [ ] Preflop: No community cards visible
- [ ] Flop: Exactly 3 community cards
- [ ] Turn: Exactly 4 community cards
- [ ] River: Exactly 5 community cards
- [ ] Showdown determines correct winner

### Action Order
- [ ] Preflop: Action starts with UTG (seat after BB)
- [ ] Preflop: BB acts last (unless raise re-opens)
- [ ] Post-flop: Action starts with first active player left of dealer
- [ ] Post-flop: Dealer/button acts last

### Betting
- [ ] Fold removes player from hand
- [ ] Call matches current bet exactly
- [ ] Raise increases bet by at least previous raise
- [ ] All-in bets remaining chips
- [ ] Check available when no bet to call

### Edge Cases
- [ ] All but one fold → immediate winner
- [ ] Multiple all-ins → side pots created
- [ ] Tied hands → pot split equally
- [ ] Button rotates after each hand

