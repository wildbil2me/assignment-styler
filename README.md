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
6. Compose content in the side panel and choose **Copy to clipboard**.
7. Open Blackbaud's HTML/source editor and paste.

The extension does not request access to page contents. It only creates the HTML and copies it when you click the button; it never saves or publishes the Blackbaud page.

## Builds

- `npm run build`: full vinext build
- `npm run pages:build`: static GitHub Pages build
- `npm run extension:build`: unpacked Manifest V3 extension
