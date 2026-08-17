# Project Overview: Next.js Web Application

## 1. Tech Stack
- Framework: Next.js 16+
- Language: TypeScript
- Styling: shadcn(^4.4.0)
- State Management: Zustand
- Database : Supabase(^2.104.0)

## 2. Directory & Architecture Rules
- Use `app` for App Router pages and layouts.
- Reusable UI components go into `components/ui/`.
- Custom hooks go into `hooks/`.
- Utility functions go into `lib/`.

## 3. Coding Conventions
- Use functional components with arrow functions (`const Component = () => {}`).
- Always define explicit TypeScript types/interfaces for props and API responses.
- Follow mobile-first responsive design using shadcn.

## 4. Guidelines for Gemini AI
- Prioritize clean, readable, and type-safe code over brevity.
- Do not use legacy `pages/` directory structure.
- When generating new components, always write corresponding TypeScript interfaces.
- Always include basic error handling (`try-catch` / `error.tsx`) in data fetching code.