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

## How it works

- **`/record`** picks a scenario and optional target question, records with `MediaRecorder` while a Web Audio `AnalyserNode` drives a live canvas visualizer, or accepts an uploaded audio file.
- The audio Blob is converted to Base64 with `FileReader.readAsDataURL()` and posted as JSON to **`/api/analyze`** (no `FormData`).
- The API route sends the audio as `inlineData` to `gemini-3.6-flash`, falling back to `gemini-3.5-flash` (override with `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS`) with `responseMimeType: "application/json"`, then normalizes the response to a fixed schema so the UI never crashes on missing fields.
- Results are saved to `localStorage` with a `uuidv4()` id and ISO timestamp, and the user is redirected to **`/results/[id]`**.
- **`/`** (Dashboard) shows aggregate stats and session history from `localStorage`.

## Scripts

| Command         | Purpose                     |
| --------------- | --------------------------- |
| `npm run dev`   | Start the dev server        |
| `npm run build` | Production build            |
| `npm start`     | Serve the production build  |
| `npm run lint`  | Run ESLint                  |
