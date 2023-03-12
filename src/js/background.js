/* global browser*/

var storage = browser.storage.local;

const radioType = {
	JPOP: {
		stream: "https://listen.moe/stream",
		gateway: "wss://listen.moe/gateway_v2",
	},
	KPOP: {
		stream: "https://listen.moe/kpop/stream",
		gateway: "wss://listen.moe/kpop/gateway_v2",
	},
};

/* Storage Items */
var storageItems = {};

/* Gets stored values if any and applies them */
storage.get(
	{
		volume: 50,
		enableAutoplay: false,
		enableNotifications: true,
		radioType: "JPOP",
	},
	(items) => {
		storageItems = items;
		if (typeof items.volume !== "undefined") {
			radio.setVol(items.volume);
		}
		if (items.enableAutoplay) {
			radio.enable();
		}
		radio.socket.init();
	}
);

browser.storage.onChanged.addListener((changes) => {
	for (let item in changes) {
		storageItems[item] = changes[item].newValue;
		if (item === "radioType") {
			radio.socket.ws.close(4069, "Closed to switch radio type");
			if (radio.player.getAttribute("src")) {
				radio.player.setAttribute(
					"src",
					radioType[storageItems.radioType].stream
				);
			}
		}
	}
});

/* Radio Functions */

var radio = {
	player: createElement("audio", { autoplay: true }),
	data: {},
	token: null,
	enable() {
		return this.player.setAttribute(
			"src",
			radioType[storageItems.radioType].stream
		);
	},
	disable() {
		return this.player.setAttribute("src", "");
	},
	toggle() {
		return this.isPlaying ? this.disable() : this.enable();
	},
	toggleType() {
		return new Promise((resolve) => {
			const type = storageItems.radioType === "JPOP" ? "KPOP" : "JPOP";
			storage.set({ radioType: type }, () => {
				resolve(type);
			});
		});
	},
	get isPlaying() {
		return !this.player.paused;
	},
	setVol(volume) {
		if (Number.isInteger(volume) && (volume >= 0 || volume <= 100)) {
			this.player.volume = volume / 100;
			storage.set({ volume });
		}
	},
	get getVol() {
		return this.player.volume * 100;
	},
	get getData() {
		return this.data;
	},
	get getToken() {
		return this.token;
	},
	socket: {
		ws: null,
		data: { lastSongID: -1 },
		init() {
			radio.socket.ws = new WebSocket(
				radioType[storageItems.radioType].gateway
			);
			radio.socket.ws.onopen = () => {
				clearInterval(radio.socket.sendHeartbeat);
			};
			radio.socket.ws.onerror = (err) => {
				console.error(err);
			};
			radio.socket.ws.onclose = (err) => {
				clearInterval(radio.socket.sendHeartbeat);
				setTimeout(radio.socket.init, err.code === 4069 ? 500 : 5000);
			};
			radio.socket.ws.onmessage = async (message) => {
				if (!message.data.length) {
					return;
				}
				let response;
				try {
					response = JSON.parse(message.data);
				} catch (err) {
					console.error(err);
					return;
				}
				if (response.op === 0) {
					radio.socket.heartbeat(response.d.heartbeat);
					return;
				}
				if (response.op === 1) {
					if (
						response.t !== "TRACK_UPDATE" &&
						response.t !== "TRACK_UPDATE_REQUEST"
					) {
						return;
					}
					radio.data = response.d;
					radio.data.song.favorite = await radio.checkFavorite(
						radio.data.song.id
					);
					// try to send the songChange event
					try {
						await browser.runtime.sendMessage({
							cmd: "songChanged",
						});
					} catch (e) {
						// noop
					}
					if (
						radio.data.song.albums.length &&
						radio.data.song.albums[0].image
					) {
						const cover = await fetch(
							`https://cdn.listen.moe/covers/${radio.data.song.albums[0].image}`
						).then((data) => data.blob());
						const fileReader = new FileReader();
						fileReader.onload = (e) => {
							radio.data.song.coverData = e.target.result;
						};
						fileReader.readAsDataURL(cover);
					} else {
						radio.data.song.coverData = null;
					}
					if (radio.data.song.id !== radio.socket.data.lastSongID) {
						if (
							radio.socket.data.lastSongID !== -1 &&
							radio.isPlaying &&
							storageItems.enableNotifications
						) {
							createNotification(
								"Now Playing",
								radio.data.song.title,
								radio.data.song.artists
									.map((a) => a.nameRomaji || a.name)
									.join(", "),
								false,
								!!radio.token
							);
						}
						radio.socket.data.lastSongID = radio.data.song.id;
					}
				}
			};
		},
		heartbeat(heartbeat) {
			radio.socket.sendHeartbeat = setInterval(() => {
				radio.socket.ws.send(JSON.stringify({ op: 9 }));
			}, heartbeat);
		},
	},
	toggleFavorite() {
		return new Promise((resolve, reject) => {
			if (!radio.token) {
				return;
			}
			const headers = new Headers({
				Authorization: `Bearer ${radio.token}`,
				"Content-Type": "application/json",
			});
			const { id } = radio.data.song;
			fetch("https://listen.moe/graphql", {
				method: "POST",
				headers,
				body: JSON.stringify({
					operationName: "favoriteSong",
					query: `
						mutation favoriteSong($id: Int!) {
							favoriteSong(id: $id) {
								id
							}
						}
					`,
					variables: { id },
				}),
			})
				.then((res) => res.json())
				.then(async (data) => {
					if (data.data) {
						radio.data.song.favorite = !radio.data.song.favorite;
						try {
							await browser.runtime.sendMessage({
								cmd: "songChanged",
							});
						} catch (e) {
							//noop
						}
						resolve(radio.data.song.favorite);
					} else if (data.errors) {
						console.error(data.errors);
						reject(data.errors);
					}
				})
				.catch((err) => {
					reject(err);
				});
		});
	},
	checkFavorite(id) {
		return new Promise((resolve) => {
			if (!radio.token) {
				resolve(false);
				return;
			}
			const headers = new Headers({
				Authorization: `Bearer ${radio.token}`,
				"Content-Type": "application/json",
			});
			const songs = [radio.data.song.id];
			fetch("https://listen.moe/graphql", {
				method: "POST",
				headers,
				body: JSON.stringify({
					operationName: "checkFavorite",
					query: `
						query checkFavorite($songs: [Int!]!) {
							checkFavorite(songs: $songs)
						}
					`,
					variables: { songs },
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.data) {
						resolve(data.data.checkFavorite.includes(id));
					} else if (data.errors) {
						console.error(data.errors);
						resolve(false);
					}
				})
				.catch((err) => {
					console.error(err);
					resolve(false);
				});
		});
	},
};

browser.runtime.onMessage.addListener((data /*, sender*/) => {
	let ret;
	if (typeof radio[data.cmd] === "function") {
		ret = radio[data.cmd](data["arg"]);
	} else {
		ret = radio[data.cmd];
	}
	return Promise.resolve(ret);
});

/* Get token */

browser.cookies.onChanged.addListener((details) => {
	if (details.cookie.name === "token") {
		if (details.removed) {
			radio.token = null;
		} else {
			radio.token = details.cookie.value;
		}
	}
});

browser.cookies.get(
	{
		url: "https://listen.moe",
		name: "token",
	},
	(data) => {
		radio.token = data ? data.value : null;
	}
);

/* Keyboard Shortcuts */

browser.commands.onCommand.addListener((command) => {

	switch (command) {
		case "toggle_radio":
			radio.toggle();
			break;
		case "vol_up":
			radio.getVol > 95
				? radio.setVol(100)
				: radio.setVol(Math.floor(radio.getVol + 5));
			break;
		case "vol_down":
			radio.getVol < 5
				? radio.setVol(0)
				: radio.setVol(Math.floor(radio.getVol - 5));
			break;
		case "show_playing":
			createNotification(
				"Now Playing",
				radio.data.song.title,
				radio.data.song.artists
					.map((a) => a.nameRomaji || a.name)
					.join(", "),
				false,
				!!radio.token
			);
			break;
		case "toggle_type":
			radio.toggleType();
			break;
		case "toggle_fav":
			createNotification(
				"Login Required",
				radio.data.song.title,
				radio.data.song.artists
					.map((a) => a.nameRomaji || a.name)
					.join(", "),
				false,
				!!radio.token
			);
			if (radio.token !== null) {
				radio.toggleFavorite();
			} else {
				browser.tabs.create({
					url: "https://listen.moe",
					active: true,
				});
			}
			break;
		case "save_playing_info":
			let link = document.createElement("a");
			link.setAttribute("target", "_blank");
			link.setAttribute("download", radio.data.song.title + ".info");
			link.setAttribute(
				"href",
				"data:text/plain;charset=utf-8,artists: " +
					radio.data.song.artists
						.map((a) => a.nameRomaji || a.name)
						.join(", ")
			);

			setTimeout(() => {
				link.remove();
			}, 3000);

			link.click();

			break;
		default:
			break;
	}
});

function createNotification(title, message, altText) {
	if (!title || !message) {
		return;
	}
	const iconUrl =
		title === "Now Playing"
			? radio.data.song.coverData || "icon.png"
			: "icon.png";
	let notificationContent = {
		type: "basic",
		title,
		message,
		iconUrl,
	};
	if (altText && typeof altText === "string") {
		notificationContent.message += `\n ${altText}`;
	}
	browser.notifications.create(
		`notification_${Date.now()}`,
		notificationContent
	);
}

function createElement(tag, attrs, styles) {
	let element = document.createElement(tag);
	for (let key in attrs) {
		element.setAttribute(key, attrs[key]);
	}
	for (let key in styles) {
		element.style[key] = styles[key];
	}
	return element;
}

