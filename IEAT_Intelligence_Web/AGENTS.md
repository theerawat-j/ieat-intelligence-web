# IEAT Intelligence Web Project

## Project Goal

Build a static mobile-first executive intelligence web dashboard for IEAT Daily Intelligence.

The web page should look close to the provided demo image:
- clean white background
- premium executive briefing style
- iPhone-first layout
- soft rounded cards
- navy typography
- minimal icons
- risk badges
- category risk overview
- top headlines
- watchpoint card
- bottom navigation

This is not a generic news website. It should feel like an executive intelligence briefing app.

## Tech Stack

Use only:
- HTML
- CSS
- Vanilla JavaScript
- JSON files

Do not use:
- React
- Vue
- Angular
- Next.js
- Tailwind
- npm packages
- backend server
- database
- authentication
- build tools

## Files

Create and maintain these files:

- `index.html` — main dashboard page
- `style.css` — all styling
- `app.js` — render data from JSON
- `data/latest.json` — mock data that follows the web content schema

## Data Source

The website must load content from:

`./data/latest.json`

Do not hard-code daily news content directly in HTML.

## Required Sections

The homepage must include:

1. Top header
   - menu icon
   - centered title: IEAT Intelligence
   - subtitle: EXECUTIVE BRIEFING
   - notification icon

2. Hero section
   - report date
   - Daily Intelligence Brief
   - short Thai executive summary

3. Risk Overview by Category
   - Energy
   - Supply Chain and Logistics
   - Technology and Digital Infrastructure
   - Public Health and Biosecurity
   - Geopolitics and Trade
   - Policy and Regulation
   - Environment and Sustainability
   - Investment and FDI
   - Labor and Human Capital
   - Competitive Landscape

Each category row must show:
- icon
- category name
- Thai subtitle
- risk direction
- risk level badge

4. Top Headlines Today
   - ranked list
   - headline_short
   - category tag
   - risk level

5. Watchpoint Today
   - highlighted card
   - watchpoint text

6. Bottom Navigation
   - Home
   - Dashboard
   - Reports
   - Watchlist
   - More

## Category Values

Use only these category values:

- Energy
- Supply Chain and Logistics
- Technology and Digital Infrastructure
- Public Health and Biosecurity
- Geopolitics and Trade
- Policy and Regulation
- Environment and Sustainability
- Investment and FDI
- Labor and Human Capital
- Competitive Landscape

## Category Data Model

- `primary_category` is the main category field for grouping, filtering, navigation, and display.
- If older JSON only has `category`, normalize legacy category names to the active category values above.
- `related_categories_joined` is optional secondary category metadata and may be shown as small category chips.
- `topic_tags_joined`, `risk_issue_key`, and `risk_issue_name` may exist in JSON for data and analytics, but they are not displayed in the UI for now.

## Risk Level Values

Use only:

- Low
- Medium
- High
- Critical

## Risk Direction Values

Use only:

- Rising
- Stable
- Easing
- Unknown

## Design Rules

- Mobile-first, iPhone ratio first
- Must look polished and minimal
- Use Thai-friendly fonts
- Use system font stack first
- Keep layout readable on small screens
- Avoid clutter
- Avoid tiny unreadable text
- Use subtle shadows and borders
- Use rounded corners
- Make badges clear but soft

## Coding Rules

- Keep code simple.
- Use plain JavaScript.
- Do not add dependencies.
- Do not change the JSON schema unless asked.
- If data is missing, show a graceful fallback.
- Keep functions small and readable.
- Make the page work through a local static server or Live Server.

## Deployment Target

This will later be deployed as a static website on Cloudflare Pages.

Avoid anything that requires a server.
