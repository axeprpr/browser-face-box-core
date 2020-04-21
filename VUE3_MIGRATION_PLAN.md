# Vue 3 + Vite Migration Plan

## Goal

Migrate from Vue 2 + Vue CLI 4 to Vue 3 + Vite with no regression in face detection behavior.

## Why Migrate

- Vue 2 is EOL and has increasing security/maintenance risk.
- Vite provides faster dev startup and modern bundling.
- Dependency tree and tooling become simpler for production operations.

## Phase 1: Baseline Freeze

- Keep current branch green with:
  - `npm run check`
  - `npm run test:e2e`
- Record baseline bundle metrics from current `dist`.
- Tag baseline release for rollback reference.

## Phase 2: Build System Switch

- Replace Vue CLI with Vite.
- Install and configure:
  - `vue@3`
  - `@vitejs/plugin-vue`
  - `vite`
- Keep static asset behavior for `public/facefinder.bin`.
- Ensure equivalent `BASE_URL` handling (`base` in Vite config).

Exit criteria:
- `vite dev` serves app successfully.
- `vite build` produces deployable output.
- Face cascade still loads under non-root path deployment.

## Phase 3: App Runtime Migration

- Convert entry and root app:
  - `new Vue(...)` -> `createApp(...)`
  - lifecycle hooks migration (`beforeDestroy` -> `beforeUnmount`)
- Migrate components to Vue 3 syntax (Options API can stay initially).
- Verify webcam start/stop lifecycle and timer cleanup behavior.

Exit criteria:
- `npm run test:e2e` passes on Vue 3 branch.
- Manual camera smoke test passes in Chrome and Edge.

## Phase 4: Hardening and Cleanup

- Replace `webcamjs` if compatibility issues appear (preferred: native `getUserMedia` wrapper).
- Add CI workflow:
  - lint
  - build
  - e2e smoke
- Add versioned release notes and rollback instructions.

## Risks and Mitigations

- Risk: webcam library incompatibility in Vue 3 ecosystem.
  - Mitigation: isolate camera API behind local adapter module before migration.
- Risk: static asset path break for `facefinder.bin`.
  - Mitigation: explicit tests for sub-path deployment.
- Risk: behavior drift in detection loop.
  - Mitigation: keep E2E smoke and add one deterministic fixture-based unit test for detection result selection.

## Suggested Branch Strategy

1. `chore/migration-baseline-lock`
2. `feat/migrate-build-to-vite`
3. `feat/migrate-runtime-to-vue3`
4. `chore/migration-hardening`
