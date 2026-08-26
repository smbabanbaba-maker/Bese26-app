# bese26

bese26 is a premium, mobile-first marketplace app for Nigeria. Users can explore listings, search, save products, manage seller activity, message other members, ask the marketplace assistant for help, view wallet activity, and manage their account from one polished experience.

## Product scope

The current build uses local React state and realistic marketplace data while service integrations are being connected. Account, wallet, seller, messaging, AI, and promotion screens are structured so their production services can be connected without rebuilding the UI.

## Included experiences

- Home discovery with featured listings, near-you content, recommendations, and verified sellers.
- Search with local text search, category chips, and one clear sort control.
- Product detail modal with a three-image gallery, key-detail chips, seller details, save, share, report, call, and chat actions.
- Saved listings, an active saved search summary, and saved sellers.
- Single-page vertical Sell flow with photo gallery, category-aware fields, pricing, location, delivery, contact preferences, validation, and publish confirmation.
- Wallet UI with available balance, Add money, Withdraw, and recent transactions.
- Messages UI with seller conversations, listing context, per-thread message state, and send-message behavior.
- Bese AI assistant with suggested prompts, loading animation, and marketplace responses.
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

Import `smbabanbaba-maker/Bese26-app` into Vercel and connect the production branch (`main`) for automatic deployments on push. The repository is configured as a static Vite build, so use these settings if Vercel asks:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |
| Environment variables | None required |

## Future Firebase architecture

The UI and local data layers are intentionally separated so production services can be connected without rebuilding the screens. The current Vercel deployment serves the static frontend; it does not yet provide real authentication, database persistence, cloud uploads, or server-side publishing. The service layer can add Firebase Authentication for accounts, Cloud Firestore for users/listings/messages/saved items/reviews/notifications, Firebase Storage for product and profile images, Cloud Functions for AI/notifications/payments/moderation, Firebase Cloud Messaging for push notifications, Firebase Analytics for product insights, and Crashlytics for mobile monitoring.

## Roadmap

1. Current: high-fidelity marketplace build.
2. Firebase Authentication.
3. Firestore-backed listings and profiles.
4. Real image storage.
5. Real messaging.
6. Live AI integration.
7. Payments and wallet services.
8. Seller verification.
9. Admin dashboard.
10. Production security, analytics, and scalability.
