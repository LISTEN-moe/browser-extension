/* global browser*/

let storage = {};

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

let radio = {
  player: createElement("audio", { autoplay: true }),
  data: { lastSongID: -1 },
  async getToken() {
    const tmp = await browser.cookies.get({
      url: "https://listen.moe",
      name: "token",
    });
    if (tmp && tmp.value) {
      return tmp.value;
    }
    return false;
  },
  async enable() {
    this.player.setAttribute("src", radioType[storage.radioType].stream);
  },
  async disable() {
    this.player.setAttribute("src", "");
  },
  togglePlayback() {
    if (this.isPlaying()) {
      this.disable();
      return false;
    }
    this.enable();
    return true;
  },
  getType() {
    return storage.radioType;
  },
  toggleType() {
    this.socket.ws.close(4069, "Closed to switch radio type");
    storage.radioType = this.getType() === "JPOP" ? "KPOP" : "JPOP";
    browser.storage.local.set({ radioType: storage.radioType });
    if (this.isPlaying()) {
      this.enable();
    }
    return storage.radioType;
  },
  isPlaying() {
    return !this.player.paused;
  },
  setVol(volume) {
    if (Number.isInteger(volume) && (volume >= 0 || volume <= 100)) {
      this.player.volume = volume / 100;
      browser.storage.local.set({ volume });
    }
  },
  savePlaying() {
    let link = document.createElement("a");
    link.setAttribute("target", "_blank");
    link.setAttribute("download", this.data.song.title + ".info");
    link.setAttribute(
      "href",
      "data:text/plain;charset=utf-8,artists: " +
        this.data.song.artists.map((a) => a.nameRomaji || a.name).join(", ")
    );
    setTimeout(() => {
      link.remove();
    }, 3000);
    link.click();
  },
  showPlaying() {
    createNotification(
      "Now Playing",
      this.data.song.title,
      this.data.song.artists.map((a) => a.nameRomaji || a.name).join(", "),
      this.data.song.coverData
    );
  },
  getVol() {
    return this.player.volume * 100;
  },
  volUp() {
    this.getVol() > 95
      ? this.setVol(100)
      : this.setVol(Math.floor(this.getVol() + 5));
  },
  volDown() {
    this.getVol() < 5
      ? this.setVol(0)
      : this.setVol(Math.floor(this.getVol() - 5));
  },
  getData() {
    return this.data;
  },
  async toggleFavorite() {
    try {
      const token = await this.getToken();
      if (!token) {
        browser.tabs.create({
          url: "https://listen.moe",
          active: true,
        });
        return false;
      }
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      });
      const { id } = this.data.song;

      const res = await fetch("https://listen.moe/graphql", {
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
      });

      const json = await res.json();
      if (json.data && json.data.favoriteSong && json.data.favoriteSong.id) {
        this.data.song.favorite =
          json.data.favoriteSong.id == id
            ? !this.data.song.favorite
            : this.data.song.favorite;
      } else if (json.errors) {
        console.error(json.errors);
        this.data.song.favorite = false;
      }

      return this.data.song.favorite;
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  async checkFavorite(id) {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      });
      const songs = [this.data.song.id];
      const res = await fetch("https://listen.moe/graphql", {
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
      });
      const json = await res.json();
      console.log(json);
      if (json.data && json.data.checkFavorite) {
        console.log(json.data.checkFavorite);
        return json.data.checkFavorite.includes(id);
      } else if (json.errors) {
        console.error(json.errors);
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  },
  socket: {
    ws: null,
    data: { lastSongID: -1 },
    init() {
      radio.socket.ws = new WebSocket(radioType[storage.radioType].gateway);
      radio.socket.ws.onopen = () => {
        clearInterval(radio.socket.sendHeartbeat);
      };
      radio.socket.ws.onerror = (err) => {
        console.error(err);
        clearInterval(radio.socket.sendHeartbeat);
        setTimeout(radio.socket.init, err.code === 4069 ? 500 : 5000);
      };
      radio.socket.ws.onclose = (err) => {
        clearInterval(radio.socket.sendHeartbeat);
        setTimeout(radio.socket.init, err.code === 4069 ? 500 : 5000);
      };
      radio.socket.ws.onmessage = async (message) => {
        try {
          let response = JSON.parse(message.data);
          //console.debug(JSON.stringify(response,null,4));
          if (response.op === 0) {
            radio.socket.heartbeat(response.d.heartbeat);
            return;
          }
          if (response.op === 1) {
            radio.data = response.d;
            radio.data.song.favorite = await radio.checkFavorite(
              radio.data.song.id
            );

            console.debug(JSON.stringify(radio.data.song, null, 4));
            if (
              Array.isArray(radio.data.song.albums) &&
              radio.data.song.albums.length > 0 &&
              radio.data.song.albums[0].image
            ) {
              const url =
                "https://cdn.listen.moe/covers/" +
                encodeURIComponent(radio.data.song.albums[0].image);
              console.debug(url);
              const res = await fetch(url, {
                credentials: "omit",
                cors: "no-cors",
              });
              const cover = await res.blob();
              radio.data.song.coverData = await blobToBase64(cover);
            } else {
              radio.data.song.coverData = null;
            }
            if (
              !radio.data.song.id ||
              radio.data.song.id !== radio.socket.data.lastSongID
            ) {
              if (
                radio.socket.data.lastSongID !== -1 &&
                radio.isPlaying() &&
                storage.enableNotifications
              ) {
                createNotification(
                  "Now Playing",
                  radio.data.song.title,
                  radio.data.song.artists
                    .map((a) => a.nameRomaji || a.name)
                    .join(", "),
                  radio.data.song.coverData
                );
              }
              radio.socket.data.lastSongID = radio.data.song.id;
            }
            // if popup is visible ... tell it to update the infos
            try {
              await browser.runtime.sendMessage({
                cmd: "updateInfo",
              });
            } catch (e) {
              // noop ... when popup is not open
            }
          }
        } catch (err) {
          console.error(err);
          return;
        }
      };
    },
    heartbeat(heartbeat) {
      radio.socket.sendHeartbeat = setInterval(() => {
        radio.socket.ws.send(JSON.stringify({ op: 9 }));
      }, heartbeat);
    },
  },
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (revt) => {
      var img = document.createElement("img");
      img.onload = (ievt) => {
        var MAX_WIDTH = 300;
        var MAX_HEIGHT = 300;

        var width = img.width;
        var height = img.height;

        // Change the resizing logic
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = height * (MAX_WIDTH / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = width * (MAX_HEIGHT / height);
            height = MAX_HEIGHT;
          }
        }

        // Dynamically create a canvas element
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");

        // Actual resizing
        ctx.drawImage(img, 0, 0, width, height);

        // Show resized image in preview element
        var dataurl = canvas.toDataURL("png");
        resolve(dataurl);
      };
      img.src = revt.target.result;
    };
    reader.readAsDataURL(blob);
  });
}

function createNotification(title, message, altText, iconUrl = "icon.svg") {
  let notificationContent = {
    type: "basic",
    title,
    message,
    iconUrl,
  };
  if (altText) {
    message = message + "\n" + altText;
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

// update storage
async function onStorageChanged() {
  storage = await browser.storage.local.get({
    volume: 50,
    enableAutoplay: false,
    enableNotifications: true,
    radioType: "JPOP",
  });
}

async function onCommand(cmd, arg) {
  await radio[cmd](arg);
  setTimeout(async () => {
    try {
      await browser.runtime.sendMessage({
        cmd: "updateInfo",
      });
    } catch (e) {}
  }, 500);
}

async function onRuntimeMessage(data) {
  const cmd = data.cmd;
  const arg = data.arg;
  return await radio[cmd](arg);
}

(async () => {
  // load local setting/options/prefs
  await onStorageChanged();

  // init player
  if (typeof storage.volume !== "undefined") {
    radio.setVol(storage.volume);
  }
  if (storage.enableAutoplay) {
    radio.enable();
  }
  //
  radio.socket.init();

  // register listeners
  browser.storage.onChanged.addListener(onStorageChanged);
  browser.commands.onCommand.addListener(onCommand);
  browser.runtime.onMessage.addListener(onRuntimeMessage);
})();

browser.browserAction.onClicked.addListener(async (tab, info) => {
  const popupurl = browser.runtime.getURL("popup.html");

  if (info.button === 1) {
    browser.windows.create({
      focused: true,
      url: popupurl,
      width: 480,
      height: 145,
      type: "panel",
    });
  } else {
    browser.browserAction.setPopup({ popup: popupurl });
    browser.browserAction.openPopup({});
  }
});
// EOF
