# LOCK IN

A clean, dark self-improvement dashboard built with HTML, CSS, JavaScript, and a small Node/Express server.

## Included
- Overview dashboard and daily progress
- Habit tracker with streaks and completion history
- Training log
- Nutrition notes and water tracker (no calorie targets)
- Focus timer
- AI coach powered by the OpenAI API
- Friends leaderboard demo
- Local saving in your browser

## Run it

1. Install [Node.js](https://nodejs.org/) if it is not already installed.
2. Open this folder in VS Code.
3. Open the VS Code terminal (**Terminal → New Terminal**).
4. Run:

   ```bash
   npm install
   ```

5. Make a copy of `.env.example` and name the copy `.env`.
6. Open `.env` and replace `your_api_key_here` with your own OpenAI API key.
7. Start the app:

   ```bash
   npm start
   ```

8. Open **http://localhost:3000** in your browser.

Keep your API key in `.env`. Never paste it into `public/script.js`, commit it to GitHub, or share it. API usage may cost money separately from a ChatGPT subscription; ask a parent or guardian to help review billing before enabling it.

## If you don't have an API key yet
The rest of the app still works. The Coach page will explain that the key needs to be added before AI chat can respond.

## Notes
- Habits, logs, water, and coach chat are saved in this browser using localStorage.
- Community uses sample data and is not connected to real accounts or friends yet.
- This is a local starter app, not a published website or native iPhone app.
