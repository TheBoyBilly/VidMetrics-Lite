# VidMetrics Lite - Competitor Analyzer MVP

![VidMetrics Preview](https://via.placeholder.com/1200x600.png?text=VidMetrics+Dash)

VidMetrics Lite is a rapid, MVP SaaS tool designed for enterprise creators and media agencies. It instantly reverse-engineers a competitor's YouTube strategy by parsing their channel, isolating their rolling 90-day video performance, and calculating a weighted anomaly score to highlight what is actually working.

Built as a submission for the **Vibe Coder Product Developer Challenge**, designed from scratch, optimized, and shipped in a single weekend.

## Core Features 🚀

- **Instant URL Resolution**: Paste any YouTube string (`@handle`, `/watch?v=...`, `youtu.be/`, or `/shorts/`) and the backend securely resolves the parent channel ID.
- **Dynamic Tiered Math**: The algorithm detects the channel's inherent size structure (via `medianViews`) and automatically adapts the internal scoring weights. Smaller creators get scored heavily on *Engagement & Velocity*, while massive creators are scored heavily on purely dominant *Absolute Views*.
- **Shorts vs Long-Form Segmentation**: Built-in 1-click toggles that parse ISO-8601 duration data from the YouTube API, allowing strategists to unmix overlapping Short and Long-form data.
- **Algorithmic Outlier Badging**: Computes Z-Scores and relative velocity to instantly flag anomalous breakouts with a glowing UI badge.
- **Trading-Style Timelines**: Chronological, gradient-filled Area and Line composed charts that perfectly visualize views vs engagement over custom time-windows.
- **Export to CSV**: Client-side Blob generator to pack the current UI state into professional spreadsheet deliverables.

## Post-MVP Upgrades 🛠️
To elevate the product from a functional prototype to an enterprise-ready dashboard, we implemented:
- **Bulletproof Time Filtering**: Shifted to robust UTC date boundary calculations and increased API fetch depths (up to 500 videos) to accurately capture 90-day windows for high-frequency channels.
- **Premium SaaS Aesthetic**: Integrated floating radial gradients, custom scrollbars, deep glassmorphism, and unified visual grid hierarchy.
- **Deep Code Audit**: Eliminated dead code, optimized rendering loops, and strict type-safe structural validations.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (Deep Glassmorphism Theme)
- **Data Visualization:** Recharts
- **API Cache:** In-memory TTL Caching for API abuse prevention
- **Validation:** Zod
- **Data Source:** YouTube Data API v3

## Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/vidmetrics-lite.git
   cd vidmetrics-lite
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env.local` file in the root directory.
   - You only need one key to run this project natively:
   ```env
   YOUTUBE_API_KEY=your_google_cloud_api_key_here
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **Open the App:** Navigate to `http://localhost:3000`

## Vibe Coder Architecture Notes
This project was heavily assisted by AI tools to rapidly iterate through architecture and mathematics without sacrificing deployment structure. 
- State management was handled intelligently at the client level (`useMemo` cascades) saving roundtrips.
- The entire YouTube fetch logic resides strictly within Serverless API Routes to guarantee front-end security for API Keys.
- No heavy SQL databases were provisioned for this MVP; an ephemeral In-Memory caching strategy protects the API limit from thrashing, fitting perfectly into the lightweight stateless architecture Vercel requires.

---
*Built defensively. Designed cleanly. Shipped fast.*
