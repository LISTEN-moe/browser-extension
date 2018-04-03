<div align="center">
	<p>
		<img src="https://lolisafe.moe/DJwzPbWD.png" />
	</p>
	<br />
	<p align="center">
		<a href="https://chrome.google.com/webstore/detail/listenmoe/bjhaeboalljjbggiljjokojcedhmkfoa?hl=en" target="_blank">
			<img src="https://img.shields.io/chrome-web-store/v/bjhaeboalljjbggiljjokojcedhmkfoa.svg?style=flat-square&maxAge=3600" alt="Chrome Web Store">
		</a>
		<a href="https://addons.mozilla.org/en-US/firefox/addon/listen-moe-extension/" target="_blank">
			<img src="https://img.shields.io/amo/v/listen-moe-extension.svg?style=flat-square&maxAge=3600" alt="Firefox Addons">
		</a>
	</p>
</div>

# Official LISTEN.moe Extension

## Changelog

### 002 (v2018.4.3.1)
- Added support for KPOP version of the radio.
- Now displays the cover art (when available) in the Now Playing notification.
- Now displays the artist name in romaji (when available).
- Updated styling of extension. Now matches with the style of the site.
- Fixed few issues with the Now Playing notification and the Keyboard Shortcuts.

### 002 (v2018.1.22.1)
- Updated extension to support LISTEN.moe v3.0+1.0 (v4)

### RO-500 (v2018.1.9.1)
- You can now adjust the volume with your mouse wheel by scrolling on the volume bar.
- Removed unused files. Reduced filesize to ~200KB.

### RO-500 (v2017.12.7.2)
- Fixed issue where defaults weren't being set within the options page.

### RO-500 (v2017.12.7.1)
- Firefox support.
- No longer using jQuery.
- Removed the random request feature since it will soon be part of the site.
- Event notifications will now only display once if the radio is not playing.

### RO-500 (v2017.5.29.1)
- Added options page.
- Keyboard Shortcuts. Access them via the options page.
- Moved all web request stuff to the background page.
- Websocket is now always connected allowing Now Playing notifications.
- Updated icons.
- Removed unused CSS.

**Firefox version of the extension is now deprecated.**

### v2017.2.13.1

- Updated most of the endpoints
- We're now using WebSockets for song info
- Added a random request button to the site
- Removed unused code

### v2016.10.5.2

- Either Rem or Ram will now be displayed when opening the popup
- Minor CSS changes
- Reverted back to polling for info. SSE didn't really work out...

### v2016.9.28.1

- Commented out a few console.logs
- Minor CSS changes
- No longer using setInterval to check for stats.json changes. Site is now using SSE.
- Added LISTEN.moe Favorites support into the extension

### v2016.8.26.1

- Minor CSS changes.
- Removed most console.logs()
- Made changes to how the "Requested by" appears. No longer using jQuery.html() since it posed as a major security risk.
- Base for History and Favorites features.

### v2016.8.22.1

- Firefox Compatibility

  Requires Firefox version 48 or higher

### v2016.8.21.2

- Added webRequest and webRequestBlocking permissions

  This will allow the extension to modify the UserAgent for requests coming from the extension so the Server can identify Extension users from normal site users.

### v2016.8.21.1

- Removed Custom Checkbox since I didn't like how it looked
- Made CSS changes that @kanadeko requested
- Made some ajustments to the JS to accommodate the CSS changes

### v2016.8.20.1

- Initial Release
