# Speech Analyzer & Public Speaking Coach

Record a practice speech in the browser, send it to Gemini, and get a full coaching report on tone, cadence, pauses, filler words, articulation, and how well you answered a target question.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide icons, and `@google/generative-ai`.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with your Gemini API key (get one at https://aistudio.google.com/app/apikey):

   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. Microphone recording requires a secure context, so use `localhost` or HTTPS.

## Accounts (optional)

Without Supabase keys the app runs guest-only: anyone can practice, and sessions are saved in the browser. Adding Supabase turns on email sign-up and sign-in, per-account session history, and daily analysis limits. Practice stays open to guests either way.

1. Create a free project at https://supabase.com.
2. In the project, open **SQL Editor**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. Open **Project Settings -> API Keys** and copy the publishable key and the secret key. Copy the project URL from **Project Settings -> Data API**. Add them to `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

4. Open **Authentication -> URL Configuration**. Set **Site URL** to `http://localhost:3000` (your real domain once deployed) and add `http://localhost:3000/**` under **Redirect URLs**.
5. Restart `npm run dev`.

Daily limits default to 3 analyses per guest (per IP address, stored hashed) and 20 per signed-in user, per UTC day. Change them with `DAILY_LIMIT_GUEST` and `DAILY_LIMIT_USER`. Failed analyses are not counted.

Supabase's built-in email sender is meant for testing: it sends only a few emails per hour and only to members of your Supabase team, so test sign-up with your own email. Before launching to the public, add your own SMTP provider under **Authentication -> Emails -> SMTP Settings**.

## How it works

- **`/record`** picks one of 10 scenarios defined in `lib/scenarios.ts` (each with delivery benchmarks and 6–7 preloaded questions) plus an optional preloaded or custom question, records with `MediaRecorder` while a Web Audio `AnalyserNode` drives a live canvas visualizer, or accepts an uploaded audio file.
- The audio Blob is converted to Base64 with `FileReader.readAsDataURL()` and posted as JSON to **`/api/analyze`** (no `FormData`). Audio is capped at 3 MB (`lib/audio-limits.ts`) so requests stay under Vercel's 4.5 MB body limit; recordings use 32 kbps Opus, which fits the 10-minute maximum.
- The API route sends the audio as `inlineData` to `gemini-3.6-flash`, falling back to `gemini-3.5-flash` (override with `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS`) with `responseMimeType: "application/json"`, then normalizes the response to a fixed schema so the UI never crashes on missing fields.
- The analysis includes scenario-specific delivery recommendations, and the results page compares pace and length against the scenario's targets.
- Results are saved with a `uuidv4()` id and ISO timestamp, to the signed-in user's account (Supabase, protected by Row Level Security) or to `localStorage` for guests, and the user is redirected to **`/results/[id]`**.
- **`/`** (Dashboard) shows aggregate stats and session history. Signed-in users can move sessions saved on the device into their account.
- **`/signup`**, **`/login`**, **`/forgot-password`**, and **`/reset-password`** handle accounts. Email links land on **`/auth/confirm`**.

## Scripts

| Command         | Purpose                     |
| --------------- | --------------------------- |
| `npm run dev`   | Start the dev server        |
| `npm run build` | Production build            |
| `npm start`     | Serve the production build  |
| `npm run lint`  | Run ESLint                  |
