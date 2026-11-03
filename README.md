# EventHub

EventHub is a responsive campus events app based on the supplied design. Students can browse and filter events, create an account, register for events, and receive a QR confirmation pass. Paid-event payment choices are a visual demo only; the app does not process or collect payments.

## Supabase setup

1. Open the Supabase SQL Editor for the `uwmxezbcjhpkkqczuwtg` project.
2. Run [`supabase/migrations/202611030001_eventhub.sql`](supabase/migrations/202611030001_eventhub.sql). It adds the EventHub tables and policies, seeds six sample events, and preserves the project's existing tables.
3. In **Project Settings → API**, copy the Project URL and publishable key.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your local `.env.local` or the Vercel project environment settings.
5. In Supabase Auth settings, add the deployed Vercel URL to the allowed redirect URLs.

## Run locally

```sh
npm install
npm run dev
```

Without the Supabase environment values, the UI opens in preview mode with sample events. Authentication and registrations persist to Supabase when configured.

## Deploy

Import this GitHub repository into Vercel using the Vite preset. The build command is `npm run build`; the output directory is `dist`. Add the two Supabase environment variables before deploying.
