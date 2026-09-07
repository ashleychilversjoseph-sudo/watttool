# WATTtool

**Smart tools for the trade.**

A separate, mobile-first rebuild of the supplied electrical calculator reference app. It is an offline-first React/TypeScript web app with a Capacitor Android wrapper and a debug APK workflow for testing.

## Included

- Twelve calculators: diversity, cable sizing, scientific, Ze/Zs/PFC, R1+R2, earthing and bonding, adiabatic, voltage drop, Ohm's law, downlights, cooker diversity, and extractor fan
- Validated calculator and job forms
- Local jobs, calculation records, notes, JSON backup and restore
- Reliable HTML report preview plus web download / Android shareable PDF
- Edge-to-edge Android theme, safe areas, animated launch screen, and fixed bottom navigation
- Offline web service worker and fully local Capacitor assets

Calculations are indicative educational aids and are not electrical certificates. Validate formulae and reference data against the current regulations and manufacturer information before production use.

## Develop

```powershell
pnpm install
pnpm dev
```

Quality checks and production build:

```powershell
pnpm check
pnpm build
pnpm cap:sync
```

The current Android workflow builds an installable debug APK only. Production signing is intentionally deferred until testing is complete.
