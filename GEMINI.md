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
- Refer to https://shadcnuikit.com/dashboard/default for the admin UI.

## 3. Coding Conventions
- Use functional components with arrow functions (`const Component = () => {}`).
- Always define explicit TypeScript types/interfaces for props and API responses.
- Follow mobile-first responsive design using shadcn.

## 4. Guidelines for Gemini AI
- Prioritize clean, readable, and type-safe code over brevity.
- Do not use legacy `pages/` directory structure.
- When generating new components, always write corresponding TypeScript interfaces.
- Always include basic error handling (`try-catch` / `error.tsx`) in data fetching code.

## 5. Development Guidelines (Step-by-step)>

1. **Understand the Goal:** Clearly understand the user's request.
2. **Plan:** Decide on the files to create or modify. Update the user on your plan.
3. **Implement:** Write the code following the conventions in section 3.
4. **Test:** Verify the changes work as expected.
5. **Refine:** Fix any issues found during testing.
6. **Document:** Add comments or update README if necessary.
7. **Verify:** Show the user the result and confirm it meets the requirements.