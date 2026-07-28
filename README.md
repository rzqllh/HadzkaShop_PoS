# HadzkaShop PoS

A modern Point of Sale (PoS) application built for HadzkaShop. Designed with a sleek, glassmorphism UI and powered by a robust tech stack, this application handles everything from inventory management to daily sales transactions, including an integrated AI Copilot for smart assistance.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **API**: [tRPC](https://trpc.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **AI Integration**: [Vercel AI SDK 7.0](https://sdk.vercel.ai/docs) + Google Gemini 2.5 Flash

## Features

- **Dashboard**: Real-time sales metrics, stock warnings, and transaction logs.
- **PoS Terminal**: Fast checkout interface with cart management.
- **Inventory Management**: Track products, categories, and stock movements.
- **AI Copilot**: An integrated AI assistant capable of retrieving live inventory data, logging stock movements, and analyzing today's sales.
- **Role-based Auth**: Secure access using NextAuth.

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm
- A Supabase PostgreSQL database
- Gemini API Key

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up your environment variables based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your database credentials and API keys.

4. Push the database schema:
   ```bash
   pnpm dlx prisma db push
   ```

5. Generate the Prisma Client:
   ```bash
   pnpm dlx prisma generate
   ```

6. Start the development server:
   ```bash
   pnpm run dev --turbo
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
