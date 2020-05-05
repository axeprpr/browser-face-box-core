# browser-face-box-core

Core repository for the framework-agnostic browser face box package.

## Repository name

`browser-face-box-core` (already renamed)

## npm package

- package: `@axeprpr/browser-face-box`
- current dist tag: `beta`
- install: `npm i @axeprpr/browser-face-box@beta`

Package source:
- `packages/browser-face-box`

## What this repo contains

- core browser package only (no framework-specific wrappers)
- camera adapter (`getUserMedia`)
- face detection + corner box drawing
- upload/screenshot compare API

## Local maintenance

```bash
npm install
npm run lint
npm run pack:core
```

## Publish (when needed)

```bash
npm run publish:core:beta
```
