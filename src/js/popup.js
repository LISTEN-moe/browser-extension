/* global browser */

async function setInfo() {
	//console.debug("setInfo");

	let data = await browser.runtime.sendMessage({ cmd: "getData" });

	//console.debug("data", data);

	if (typeof data === "undefined") {
		return;
	}

	/* Sets Current Listners */
	document.querySelector("#listeners span").innerText =
		typeof data.listeners !== "undefined" ? data.listeners : "N/A";

	const npElement = document.querySelector("#now-playing-text span");

	while (npElement.hasChildNodes()) {
		npElement.removeChild(npElement.lastChild);
	}

	for (let index in data.song.artists) {
		let artist = data.song.artists[index];

		let artistLink = document.createElement("a");
		artistLink.classList.add("artist");
		artistLink.href = `https://listen.moe/artists/${artist.id}`;
		artistLink.target = "_blank";

		const artistName = artist.nameRomaji || artist.name;

		artistLink.appendChild(document.createTextNode(artistName));
		npElement.appendChild(artistLink);

		if (index < data.song.artists.length - 1) {
			npElement.appendChild(document.createTextNode(", "));
		}
	}

	if (data.song.artists.length) {
		npElement.appendChild(document.createTextNode(" - "));
	}

	npElement.appendChild(
		document.createTextNode(data.song.title || "No data")
	);

	/* Sets Requester Info */
	/**/
	/*
	if (data.event) {

		document.querySelector('#now-playing-request a').innerText = '';
		document.querySelector('#now-playing-request a').setAttribute('href', '');
		document.querySelector('#now-playing-request').style.display = 'none';

		document.querySelector('#now-playing-event span').innerText = data.event.name;
		document.querySelector('#now-playing-event').style.display = 'block';

	} else {*/

	document.querySelector("#now-playing-event span").innerText = "";
	document.querySelector("#now-playing-event").style.display = "none";

	if (data.requester) {
		document.querySelector("#now-playing-request a").innerText =
			data.requester.displayName;
		document
			.querySelector("#now-playing-request a")
			.setAttribute(
				"href",
				`https://listen.moe/u/${data.requester.username}`
			);
		document.querySelector("#now-playing-request").style.display = "block";
	} else {
		document.querySelector("#now-playing-request a").innerText = "";
		document
			.querySelector("#now-playing-request a")
			.setAttribute("href", "");
		document.querySelector("#now-playing-request").style.display = "none";
	}

	//}
	/**/

	const token = await browser.runtime.sendMessage({ cmd: "getToken" });
	//console.debug("token", token);
	if (token !== null) {
		document.querySelector("#favorite-toggle").classList.remove("login");

		if (data.song.favorite) {
			document
				.querySelector("#favorite-toggle svg")
				.classList.add("active");
		} else {
			document
				.querySelector("#favorite-toggle svg")
				.classList.remove("active");
		}
	} else {
		document.querySelector("#favorite-toggle").classList.add("login");
		document
			.querySelector("#favorite-toggle svg")
			.classList.remove("active");
	}
}

/* Does Scrolling Text */
let timeout = setTimeout(autoScroll, 1000);

function getElWidth(el) {
	el = document.querySelector(el);
	let elementCS = getComputedStyle(el);
	return (
		el.offsetWidth -
		(parseFloat(elementCS.paddingLeft) + parseFloat(elementCS.paddingRight))
	);
}

function autoScroll() {
	let time =
		(Math.floor(
			document.querySelector("#now-playing-text span").innerText.length
		) /
			10) *
		500;
	if (
		getElWidth("#now-playing-text span") > getElWidth("#now-playing-text")
	) {
		clearTimeout(timeout);
		let offset =
			getElWidth("#now-playing-text span") +
			1 -
			getElWidth("#now-playing-text");
		document.querySelector(
			"#now-playing-text span"
		).style.transition = `margin ${time}ms ease-in-out`;
		document.querySelector(
			"#now-playing-text span"
		).style.marginLeft = `${-offset}px`;
		timeout = setTimeout(() => {
			document.querySelector(
				"#now-playing-text span"
			).style.transition = `margin ${time / 4}ms ease-in-out`;
			document.querySelector("#now-playing-text span").style.marginLeft =
				"0px";
			setTimeout(() => {
				timeout = setTimeout(autoScroll, 10000);
			}, time / 4);
		}, time + 3000);
	}
}

document
	.querySelector("#now-playing-text")
	.addEventListener("mouseenter", () => {
		let time =
			(Math.floor(
				document.querySelector("#now-playing-text span").innerText
					.length
			) /
				10) *
			500;
		let offset =
			getElWidth("#now-playing-text span") +
			1 -
			getElWidth("#now-playing-text");
		if (
			getElWidth("#now-playing-text span") >
			getElWidth("#now-playing-text")
		) {
			clearTimeout(timeout);
			document.querySelector(
				"#now-playing-text span"
			).style.transition = `margin ${time}ms ease-in-out`;
			document.querySelector(
				"#now-playing-text span"
			).style.marginLeft = `${-offset}px`;
		}
	});

document
	.querySelector("#now-playing-text")
	.addEventListener("mouseleave", () => {
		let time =
			(Math.floor(
				document.querySelector("#now-playing-text span").innerText
					.length
			) /
				10) *
			500;
		document.querySelector(
			"#now-playing-text span"
		).style.transition = `margin ${time / 4}ms ease-in-out`;
		document.querySelector("#now-playing-text span").style.marginLeft =
			"0px";
		setTimeout(() => {
			timeout = setTimeout(autoScroll, 10000);
		}, time / 4);
	});

/* Copy Artist and Song Title to Clipboard */
document
	.querySelector("#now-playing-text span")
	.addEventListener("click", function () {
		window.getSelection().selectAllChildren(this);
	});

(async () => {
	/* Initialize Volume Slider */
	const volumeElement = document.querySelector("#volume-slider");

	volumeElement.value = await browser.runtime.sendMessage({ cmd: "getVol" });
	volumeElement.parentElement.setAttribute(
		"style",
		`--volume: ${volumeElement.value}%`
	);

	volumeElement.addEventListener("input", async (e) => {
		await browser.runtime.sendMessage({
			cmd: "setVol",
			arg: +e.target.value,
		});
		volumeElement.parentElement.setAttribute(
			"style",
			`--volume: ${e.target.value}%`
		);
	});

	document
		.querySelector("#radio-volume")
		.addEventListener("wheel", async (e) => {
			volumeElement.value =
				e.deltaY < 0
					? +volumeElement.value + 5
					: +volumeElement.value - 5;
			await browser.runtime.sendMessage({
				cmd: "setVol",
				arg: +volumeElement.value,
			});
			volumeElement.parentElement.setAttribute(
				"style",
				`--volume: ${volumeElement.value}%`
			);
		});

	/* Sets Play/Pause depending on player status */
	if (await browser.runtime.sendMessage({ cmd: "isPlaying" })) {
		document.querySelector("#radio-toggle svg").classList.add("active");
	}

	/* Enable/Disable Player */
	document
		.querySelector("#radio-toggle svg")
		.addEventListener("click", async function () {
			const ret = await browser.runtime.sendMessage({ cmd: "isPlaying" });
			//console.debug("radio-toggle", ret);
			if (ret) {
				this.classList.remove("active");
				await browser.runtime.sendMessage({ cmd: "disable" });
			} else {
				this.classList.add("active");
				await browser.runtime.sendMessage({ cmd: "enable" });
			}
		});

	/* Favorites Button */
	document
		.querySelector("#favorite-toggle")
		.addEventListener("click", async function () {
			if (this.classList.contains("login")) {
				window.open("https://listen.moe", "_blank");
			} else {
				await browser.runtime.sendMessage({ cmd: "toggleFavorite" });
			}
		});

	/* Toggles Radio Type */
	document
		.querySelector("#radio-type-toggle")
		.addEventListener("click", async function () {
			const type = await browser.runtime.sendMessage({
				cmd: "toggleType",
			});
			if (type === "KPOP") {
				this.innerText = "Switch to J-POP";
				document.body.classList.add("kpop");
			} else {
				this.innerText = "Switch to K-POP";
				document.body.classList.remove("kpop");
			}
		});

	/*
document.querySelector('#radio-type-toggle').innerText = `Switch to ${background.storageItems.radioType === 'JPOP' ? 'K-POP' : 'J-POP'}`;

if (background.storageItems.radioType === 'KPOP') {
	document.body.classList.add('kpop');
} else {
	document.body.classList.remove('kpop');
}
*/

	/* Opens Settings */
	document.querySelector("#settings").addEventListener("click", () => {
		browser.runtime.openOptionsPage();
	});

	//radio.player.addEventListener('songChanged', setInfo);

	browser.runtime.onMessage.addListener(async (data /*, sender*/) => {
		//console.debug("onMessage", data);
		if (data.cmd === "songChanged") {
			setInfo();
		}
		if (data.cmd === "favSong") {
		}
	});

	setInfo();
	//
})();
