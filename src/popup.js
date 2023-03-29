/* global browser */

const popupurl = browser.runtime.getURL("popup.html");
const nowPlayingTextSPAN = document.querySelector("#now-playing-text span");
const nowPlayingText = document.querySelector("#now-playing-text");
const radioToggleSVG = document.querySelector("#radio-toggle svg");
const songProgress = document.querySelector("#songProgress");
const listenersSPAN = document.querySelector("#listeners span");
const nowPlayingEventSPAN = document.querySelector("#now-playing-event span");
const nowPlayingEvent = document.querySelector("#now-playing-event");
const nowPlayingRequestA = document.querySelector("#now-playing-request a");
const nowPlayingRequest = document.querySelector("#now-playing-request");
const favoriteToggle = document.querySelector("#favorite-toggle");
const favoriteToggleSVG = document.querySelector("#favorite-toggle svg");
const detach = document.querySelector("#detach");
const volumeElement = document.querySelector("#volume-slider");
const radioVolume = document.querySelector("#radio-volume");
const radioTypeToggle = document.querySelector("#radio-type-toggle");
const settings = document.querySelector("#settings");
const numberProgressSPAN = document.querySelector("#numberProgress span");
const body = document.body;

let delayed_updateInfo_timerId;
let started;
let duration;

function delayed_updateInfo() {
  clearTimeout(delayed_updateInfo_timerId);
  setTimeout(updateInfo, 500);
}

async function updateInfo() {

  const type = await browser.runtime.sendMessage({ cmd: "getType" });
  if (type === "KPOP") {
    this.innerText = "Switch to J-POP";
    body.classList.add("kpop");
  } else {
    this.innerText = "Switch to K-POP";
    body.classList.remove("kpop");
  }

  volumeElement.value = await browser.runtime.sendMessage({ cmd: "getVol" });

  volumeElement.parentElement.setAttribute(
    "style",
    `--volume: ${volumeElement.value}%`
  );

  /* Sets Play/Pause depending on player status */
  if (await browser.runtime.sendMessage({ cmd: "isPlaying" })) {
    radioToggleSVG.classList.add("active");
  } else {
    radioToggleSVG.classList.remove("active");
  }

  let data = await browser.runtime.sendMessage({ cmd: "getData" });

  if (typeof data === "undefined") {
    return;
  }

    if (data.song && data.song.duration) {
      duration = data.song.duration;
    }
    if (data.startTime) {
      started = new Date(data.startTime).getTime() / 1000;
    }
    songProgress.max = duration > 0 ? duration : 0;
    songProgress.value = duration > 0 ? duration : 0;

  /* Sets Current Listners */
  listenersSPAN.innerText =
    typeof data.listeners !== "undefined" ? data.listeners : "N/A";

  while (nowPlayingTextSPAN.hasChildNodes()) {
    nowPlayingTextSPAN.removeChild(nowPlayingTextSPAN.lastChild);
  }

  for (let index in data.song.artists) {
    let artist = data.song.artists[index];

    let artistLink = document.createElement("a");
    artistLink.classList.add("artist");
    artistLink.href = `https://listen.moe/artists/${artist.id}`;
    artistLink.target = "_blank";

    const artistName = artist.nameRomaji || artist.name;

    artistLink.appendChild(document.createTextNode(artistName));
    nowPlayingTextSPAN.appendChild(artistLink);

    if (index < data.song.artists.length - 1) {
      nowPlayingTextSPAN.appendChild(document.createTextNode(", "));
    }
  }

  if (data.song.artists.length) {
    nowPlayingTextSPAN.appendChild(document.createTextNode(" - "));
  }

  nowPlayingTextSPAN.appendChild(
    document.createTextNode(data.song.title || "No data")
  );

  nowPlayingEventSPAN.innerText = "";
  nowPlayingEvent.style.display = "none";

  if (data.requester) {
    nowPlayingRequestA.innerText = data.requester.displayName;
    nowPlayingRequestA.setAttribute(
      "href",
      `https://listen.moe/u/${data.requester.username}`
    );
    nowPlayingRequest.style.display = "block";
  } else {
    nowPlayingRequestA.innerText = "";
    nowPlayingRequestA.setAttribute("href", "");
    nowPlayingRequest.style.display = "none";
  }

  const token = await browser.runtime.sendMessage({ cmd: "getToken" });
	if(token){
    		favoriteToggle.classList.remove("login");
		if(data.song.favorite){
      			favoriteToggleSVG.classList.add("active");
		}else{
    			favoriteToggleSVG.classList.remove("active");
		}

	}else{
    		favoriteToggleSVG.classList.remove("active");
    		favoriteToggle.classList.add("login");
	}
}

/* Does Scrolling Text */
let timeout = setTimeout(autoScroll, 1000);

function getElWidth(el) {
  let elementCS = getComputedStyle(el);
  return (
    el.offsetWidth -
    (parseFloat(elementCS.paddingLeft) + parseFloat(elementCS.paddingRight))
  );
}

function autoScroll() {
  let time = (Math.floor(nowPlayingTextSPAN.innerText.length) / 10) * 500;
  if (getElWidth(nowPlayingTextSPAN) > getElWidth(nowPlayingText)) {
    clearTimeout(timeout);
    let offset =
      getElWidth(nowPlayingTextSPAN) + 1 - getElWidth(nowPlayingText);
    nowPlayingTextSPAN.style.transition = `margin ${time}ms ease-in-out`;
    nowPlayingTextSPAN.style.marginLeft = `${-offset}px`;
    timeout = setTimeout(() => {
      nowPlayingTextSPAN.style.transition = `margin ${time / 4}ms ease-in-out`;
      nowPlayingTextSPAN.style.marginLeft = "0px";
      setTimeout(() => {
        timeout = setTimeout(autoScroll, 10000);
      }, time / 4);
    }, time + 3000);
  }
}

nowPlayingText.addEventListener("mouseenter", () => {
  let time = (Math.floor(nowPlayingTextSPAN.innerText.length) / 10) * 500;
  let offset = getElWidth(nowPlayingTextSPAN) + 1 - getElWidth(nowPlayingText);
  if (getElWidth(nowPlayingTextSPAN) > getElWidth(nowPlayingText)) {
    clearTimeout(timeout);
    nowPlayingTextSPAN.style.transition = `margin ${time}ms ease-in-out`;
    nowPlayingTextSPAN.style.marginLeft = `${-offset}px`;
  }
});

nowPlayingText.addEventListener("mouseleave", () => {
  let time = (Math.floor(nowPlayingTextSPAN.innerText.length) / 10) * 500;
  nowPlayingTextSPAN.style.transition = `margin ${time / 4}ms ease-in-out`;
  nowPlayingTextSPAN.style.marginLeft = "0px";
  setTimeout(() => {
    timeout = setTimeout(autoScroll, 10000);
  }, time / 4);
});

/* Copy Artist and Song Title to Clipboard */
nowPlayingTextSPAN.addEventListener("click", function () {
  window.getSelection().selectAllChildren(this);
});

(async () => {
  /* Initialize Volume Slider */

  volumeElement.addEventListener("input", async (e) => {
    await browser.runtime.sendMessage({ cmd: "setVol", arg: +e.target.value });
    volumeElement.parentElement.setAttribute(
      "style",
      `--volume: ${e.target.value}%`
    );
  });

  radioVolume.addEventListener("wheel", async (e) => {
    volumeElement.value =
      e.deltaY < 0 ? +volumeElement.value + 5 : +volumeElement.value - 5;
    await browser.runtime.sendMessage({
      cmd: "setVol",
      arg: +volumeElement.value,
    });
    volumeElement.parentElement.setAttribute(
      "style",
      `--volume: ${volumeElement.value}%`
    );
  });

  /* Enable/Disable Player */
  radioToggleSVG.addEventListener("click", async () => {
    const ret = await browser.runtime.sendMessage({ cmd: "togglePlayback" });
    if (ret) {
      radioToggleSVG.classList.add("active");
    } else {
      radioToggleSVG.classList.remove("active");
    }
  });

  /* Favorites Button */
  favoriteToggle.addEventListener("click", async () => {
      const ret = await browser.runtime.sendMessage({ cmd: "toggleFavorite" });
    if (ret) {
      favoriteToggleSVG.classList.add("active");
    } else {
      favoriteToggleSVG.classList.remove("active");
    }
  });

  /* Toggles Radio Type */
  radioTypeToggle.addEventListener("click", async function () {
    const type = await browser.runtime.sendMessage({ cmd: "toggleType" });
    if (type === "KPOP") {
      this.innerText = "Switch to J-POP";
      body.classList.add("kpop");
    } else {
      this.innerText = "Switch to K-POP";
      body.classList.remove("kpop");
    }
  });

  /* Opens Settings */
  settings.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  detach.addEventListener("click", () => {
    browser.windows.create({
      focused: true,
      url: popupurl,
      width: 480,
      height: 145,
      type: "panel",
    });
    window.close();
  });

  browser.runtime.onMessage.addListener(async (data /*, sender*/) => {
    switch (data.cmd) {
      case "updateInfo":
        delayed_updateInfo();
        break;
    }
  });

  updateInfo();

  // update songProgress
  setInterval(() => {
    let val = parseInt(Date.now() / 1000 - started);
    songProgress.value = val;
    numberProgressSPAN.innerText = val + "/" + duration;
  }, 1000);
})();
