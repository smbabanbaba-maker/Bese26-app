# Bese26-app

Bese is a premium, mobile-first marketplace prototype for Nigeria. It is designed as a polished frontend demonstration: users can explore listings, search, save products, preview a sell flow, test demo messaging, ask a simulated marketplace assistant, view a wallet UI, and explore a profile without signing in.

## Prototype scope

This version intentionally uses local React state and realistic demo data. It does not include authentication, real payments, wallet transfers, real seller verification, production messaging, or a live AI API. Every payment, chat, publish, and AI response is clearly presented as a demo interaction.

## Included experiences

- Home discovery with featured listings, categories, near-you content, recommendations, and verified sellers.
- Search with local filtering, category chips, sorting, and an expandable filter panel.
- Product detail modal with gallery-style hero image, seller details, save, share, report, call, and demo chat actions.
- Saved listings, saved searches, and saved sellers.
- Sell flow with demo photo gallery, editable listing fields, AI-assisted draft generation, preview, and publish success toast.
- Wallet UI with demo balance, transactions, promotion card, and no-money-movement guardrails.
- Messages UI with demo conversations and local send-message state.
- Bese AI assistant with suggested prompts, loading animation, and clearly labeled demo responses.
- Profile, seller statistics, settings, theme switching, notification panel, and responsive bottom navigation.

## Tech stack

The project uses Vite, React, Lucide icons, and plain CSS. It is a static frontend and requires no backend or environment variables.

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Vercel deployment

Import `smbabanbaba-maker/Bese26-app` into Vercel. The project is already configured for a static Vite build, so use these settings if Vercel asks:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |
| Environment variables | None required |

## Future Firebase architecture

The UI and demo data are intentionally separated so the prototype can evolve without rebuilding the screens. The next production phases can add Firebase Authentication for accounts, Cloud Firestore for users/listings/messages/saved items/reviews/notifications, Firebase Storage for product and profile images, Cloud Functions for AI/notifications/payments/moderation, Firebase Cloud Messaging for push notifications, Firebase Analytics for product insights, and Crashlytics for mobile monitoring.

## Roadmap

1. Current: high-fidelity interactive prototype.
2. Firebase Authentication.
3. Firestore-backed listings and profiles.
4. Real image storage.
5. Real messaging.
6. Live AI integration.
7. Payments and wallet services.
8. Seller verification.
9. Admin dashboard.
10. Production security, analytics, and scalability.
