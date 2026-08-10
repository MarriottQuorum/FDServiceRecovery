# FD Service Recovery

An interactive Front Desk training card game built for scenario-based service recovery practice, Marriott Bonvoy knowledge, service standards, and guest-engagement coaching.

## 🎮 Play the Game

**Live game:** https://fd-service-recovery.vercel.app/

The digital deck works on desktop, tablet, and mobile and can be used for individual practice, peer-to-peer coaching, or group training sessions.

## How It Works

Draw a card and read the scenario, situation, or question before revealing the Professional Approach or answer. Discuss what you would say, what actions you would take, and how you would approach the situation.

### Card Types

- **Scenario** — Puts the player into a guest situation and asks how they would respond, what they would say, and what actions they would take.
- **Bonvoy** — Tests knowledge of the Marriott Bonvoy program.
- **Level Up** — Includes two styles: improving something an agent said, or reviewing a picture to identify what is wrong and how it may affect the guest.

After answering, reveal the Professional Approach and compare it with the response. Discuss what worked and what could be stronger.

## Categories

The deck includes cards covering:

- Check In
- Check Out
- Front Desk
- Telephone
- Rooms
- Hotel Amenities
- Bonvoy
- Meetings / Events
- Service Standards
- Level Up

## Game Modes

### Standard Deck
The default mode. Cards are randomly drawn from the full deck.

### Pick a Category
Choose a category and receive a random card from that category. After completing the card, choose the next category.

### Category Elimination
Choose categories as you play, but each category must be completed before the game finishes.

### 10-Card Challenge
Complete ten random cards and score each response as **Got It** or **Missed It**. The game tracks the final score and automatically advances after scoring each card.

### Round Robin
For 2–5 players or teams. Players take turns answering cards while the game tracks scores and rotates to the next player.

### Host Mode
Designed for group training. A host presents the card, facilitates the discussion, reveals the Professional Approach, and awards the point to the player or team with the strongest response.

### Pass & Play
Designed for shared-phone play. One player asks the question, the other responds, the answer is revealed and scored, and then the phone passes to the next player.

## Digital Controls

The card itself can be used as the primary controller, which is especially useful in Full Screen or on a phone:

- **Tap the white center of the card** — Reveal or hide the Professional Approach / answer.
- **Tap the blue title area** — Deal the next card.
- **Tap the blue card-number/footer area** — Deal the next card.
- **Flip Card (Next)** — Deals the next card when the control panel is visible.
- **Hide Controls / Full Screen** — Provides a cleaner presentation for group or mobile play.

The first Full Screen session also displays a brief reminder of the card touch zones.

## Updating the Deck

Card content is loaded dynamically from a published Google Sheet rather than being hard-coded into the application.

This means routine deck updates do **not** require a GitHub commit or Vercel deployment:

1. Update the card data in the Google Sheet.
2. Allow the published sheet feed a little time to refresh.
3. Refresh or reopen the game.

Changes to the application itself — layout, game mechanics, controls, styling, or JavaScript behavior — are maintained in this repository and deployed through Vercel.

## Technical Overview

The project intentionally uses a lightweight web stack:

- HTML
- CSS
- Vanilla JavaScript
- Published Google Sheets CSV data source
- GitHub for source control
- Vercel for deployment

No installation is required for players; the game runs directly in a modern web browser.

## Training Purpose

FD Service Recovery is designed as a practical coaching tool rather than a traditional right-or-wrong test. Many guest situations can be handled successfully in more than one way. The Professional Approach provides a benchmark for discussion while allowing trainers and teams to evaluate tone, judgment, policy awareness, empathy, and problem-solving.

---

**FD Service Recovery** — Interactive Front Desk service recovery and guest-experience training.