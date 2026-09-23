// Clicking the toolbar icon opens the side panel. Set on install for the first
// run, and again at top level because a stopped service worker loses it.
//
// `setPanelBehavior` returns a promise: without the catch a failure is a silent
// unhandled rejection, and since `openPanelOnActionClick` suppresses
// `action.onClicked` there is no fallback path — the icon would simply do
// nothing with nothing written down anywhere.
const openOnClick = () =>
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => console.error("BaudStyler: could not open the side panel on action click.", error));

chrome.runtime.onInstalled.addListener(openOnClick);
openOnClick();
