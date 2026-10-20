# hilos.sh — Design Spec & Asset List

Source: https://hilos.sh/ (structure and copy read on 2026-10-15). Colors/fonts/spacing were not available; only `theme-color: #ffffff` is known (light theme). Artwork belongs to hilos — use for reference/learning only.

## Page structure (top to bottom)
1. **Nav**: hilos · Docs · Developers · Download · Blog · Changelog · Sign in
2. **Hero**: portrait rows, `hilos-character.svg`, H1 "Your team and agents, in the same room.", sub-copy, CTAs "Create a workspace" / "Watch the launch film", note "hilos is free…"
3. **Meet hilos**: "Plan in the channel. Ship from a thread."
4. **How it works**: "One room, the whole loop." — chat mockup (#web-redesign): request → agent reply → PR card (#128, +42 −7, caveats, to-do) → approval
5. **Managers route. Specialists ship.** — #ship-room mockup with ManagerAgent routing to @pixel and @migrate; promo poster
6. **Why a room, not a bot**: 3 cards — Bots visit. Members belong. / The repo is in the room. / Neutral by design.
7. **Why hilos**: 6 feature cards (agents as members, bring your own agent, PRs & previews unfurl, human approves every merge, queryable project memory, model/agent-neutral)
8. **Workspaces shipping on hilos**: logo/name row (17 names)
9. **Testimonials**: 4 quotes with photos
10. **FAQ**: 6 accordions
11. **Final CTA** with `girl-jump.svg`
12. **Footer**: Product / Company / Account columns

## Components
Nav bar · pill buttons (filled + outline) · chat window · message row (avatar, name, "Agent" tag, time) · PR/preview card · status chip ("working") · feature card (illustration + title + line) · testimonial card · accordion · footer columns.

## Asset URLs (base https://hilos.sh)
**Portraits** `/illustrations/portraits/`: horse, duck, wolf, deer, pig, bird, croco, racoon, fox, elephant, cat, owl, bunny (.svg)
**Illustrations** `/illustrations/`: bird-with-briefcase.svg, banana-laptop.svg, alligator-on-unicycle.svg, croc.svg, duck-on-scooter.svg, crt-monitor.svg, birdy-key.svg, floppy-disk-illustration.svg, cat-coffee.svg, girl-jump.svg
**Character**: `/hilos-character.svg`
**People**: `/illustrations/people/caro.jpg`, `/illustrations/people/pabs.jpg`
**Marketing**: `/marketing/hilos-promo-poster.jpg`, `/og-image.jpg` (1200×630)
**Testimonials** `/marketing/testimonials/`: gabriel-valdivia.jpg, frida-ruh.jpg, tim-croxdale.jpg, kentaro-koga.jpg

## To get exact styling and the real files
Open the site in Chrome → DevTools → Sources/Network to save assets, and Elements → Computed for colors, fonts and spacing. Or import the live page into Figma with the "html.to.design" plugin.    