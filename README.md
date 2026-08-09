# Blackbaud Content Composer

Create structured, student-facing class content, preview it, and export conservative HTML for Blackbaud.

## Web app

```bash
npm ci
npm run dev
```

The static GitHub Pages build is produced with `npm run pages:build` and deployed automatically from `main`.

## Chrome or Edge extension

Build the unpacked extension:

```bash
npm run extension:build
```

Then:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the generated `extension-dist` folder.
5. Open a Blackbaud text editor and click the extension icon.
6. Compose content in the side panel and choose **Insert into Blackbaud**.

The extension requests temporary access only to the active tab. It inserts content but never saves or publishes the Blackbaud page.

Editor support in the first prototype includes visible textareas, `contenteditable` regions, TinyMCE content frames, and CKEditor editing regions. Blackbaud surfaces should be tested individually because their editor markup may differ.

## Builds

- `npm run build`: full vinext build
- `npm run pages:build`: static GitHub Pages build
- `npm run extension:build`: unpacked Manifest V3 extension
