# Developer Nightmare

A tiny Chrome prank that nudges a few elements on the current page by a handful of pixels. The effect is local to the open tab and disappears when you turn it off or refresh.

## Features

- Apply or undo the effect with one click.
- Choose a subtle-to-obvious intensity.
- A one-in-100 chance of a brief John Cena text cameo when the effect is enabled.
- No analytics, remote scripts, or collection of browsing data.
- Optional voluntary tip link and one clearly labelled sponsor card in the extension popup.
- The extension never places ads on webpages.

## Try it in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select this folder.
5. Open a regular webpage, click the extension, and apply the effect.

Chrome does not allow extensions to change some pages, including its own settings and store pages. Refreshing the current page also resets the effect.

## Add a tip link or sponsor

Edit `config.js`:

- Set `SUPPORT_URL` to your HTTPS tip page, such as a hosted payment page from a provider you use.
- To show one sponsor card in the popup, fill in `SPONSOR.headline`, `SPONSOR.description`, and `SPONSOR.url`.

The sponsor card is hidden unless all three fields are set. Keep it to one clearly labelled direct sponsor in the popup; it opens only after a click. Do not inject ads into webpages, interfere with website ads, force clicks, or use undisclosed affiliate links. No advertising network or tracking is included. Do not add payment card numbers, passwords, or registry details to this file or the repository; configure payout details only with the payment provider.

## Privacy and permissions

The extension requests `activeTab` and `scripting` so it can change the current page only after the user opens the popup and clicks the button. It reads element dimensions to select visible text, image, and control elements, then applies temporary CSS. This data stays in the browser and is not sent anywhere. The tip and sponsor links open external HTTPS pages only after a user click.

## Publish

Register a Chrome Web Store developer account, then upload the extension package through the Chrome Web Store Developer Dashboard. Google no longer processes payments for new paid Chrome Web Store items, so any optional payment page and payout handling must be set up with a payment provider.
