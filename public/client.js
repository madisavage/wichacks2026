//* AUTHENTICATION *//
let storedAccessToken =
  "BQCYHs7ThMFnyBvtQviBZR2T7UJlK_RPkMmZv2_iIcpuyL3o3GNt2XwY6iB6RxYfp7FGcJ4lqiBLpC11xVBwP-FSkF4rP1tBkELUiEyCHg74TtQ2cBgzkVYG0lOg4qrujDMJddejbiR-bdadEx0D20fKJSSfoplBM-45z2z_AXOXgMo8rzeiJI4O6fxVEo2h22xRNC2napKQgRoiQ5ceHjoEEnUaidHQhGzBJlPaxP1kr5TojRTlouK_7yfxXWaL4P4BuxvMnQaXMV7lGVZiMMZUkylvXTW0Lw1d5eKsb4NLUi3uqC1VK-a7EkycpgICSVnV";

// Check for access token in URL on page load
window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get("access_token");
  const error = urlParams.get("error");

  const authStatus = document.getElementById("auth-status");
  const authButton = document.getElementById("auth-button");

  // Check for dev token first (for local testing)
  try {
    const devTokenResponse = await fetch("/api/dev-token");
    const devTokenData = await devTokenResponse.json();

    if (devTokenData.token) {
      storedAccessToken = devTokenData.token;
      authStatus.innerHTML =
        '<p class="success">✅ Using development token (local testing mode)</p>';
      authButton.textContent = "Authenticated ✓ (Dev)";
      authButton.disabled = true;
      return; // Skip OAuth flow if dev token is available
    }
  } catch (err) {
    console.error("Error checking for dev token:", err);
  }

  // Handle OAuth flow
  if (error) {
    authStatus.innerHTML = `<p class="error">❌ Authentication failed: ${error}</p>`;
  } else if (accessToken) {
    storedAccessToken = accessToken;
    authStatus.innerHTML =
      '<p class="success">✅ Successfully authenticated!</p>';
    authButton.textContent = "Authenticated ✓";
    authButton.disabled = true;

    // Clean up URL
    window.history.replaceState({}, document.title, "/");
  }
});

// Handle authentication button click
document.getElementById("auth-button").addEventListener("click", () => {
  window.location.href = "/api/authenticate";
});

//* DISPLAY HELPERS *//
function hideAllExcept(targetId) {
  contentIds = [
    "placeholder",
    "auth-status",
    "top-songs-container",
    "top-artists-container",
    "top-albums-container",
    "connections-container",
  ];
  contentIds.map((id) => {
    if (id != targetId) {
      const container = document.getElementById(id);
      container.style.display = "none";
    } else {
      const container = document.getElementById(id);
      container.style.display = "block";
    }
  });
}

function resetSelectedButtons(targetId) {
  const selectedItems = document.getElementsByClassName("btn-primary selected");
  for (item in selectedItems) {
    item = selectedItems[item];
    item.className = "btn-primary";
  }

  let targetItem = document.getElementById(targetId);
  targetItem.className = "btn-primary selected";
}

//* TOP SONGS *//
async function fetchTopSongs(accessToken) {
  const container = document.getElementById("top-songs-container");
  const loadButton = document.getElementById("load-top-songs");

  // Show loading state
  container.innerHTML = '<p class="loading">Loading your top songs...</p>';
  loadButton.disabled = true;

  try {
    const response = await fetch(`/api/top-songs?token=${accessToken}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch top songs");
    }

    // displayTopSongs(data.topSongs);
    return data.topSongs;
  } catch (error) {
    container.innerHTML = `
            <div class="error">
                <p>❌ ${error.message}</p>
                <p class="error-note">Note: To view your top songs, you need to authenticate with Spotify.</p>
            </div>
        `;
  } finally {
    loadButton.disabled = false;
  }
}

function displayTopSongs(songs) {
  const container = document.getElementById("top-songs-container");

  if (!songs || songs.length === 0) {
    container.innerHTML = '<p class="no-data">No top songs found.</p>';
    return;
  }

  const songsHTML = songs
    .map(
      (song) => `
            <div class="song-item">
                <div class="song-rank">#${song.rank}</div>
                <div class="song-image">
                    <img src="${song.albumImage}" alt="${song.album}">
                </div>
                <div class="song-info">
                    <h3 class="song-name">${song.name}</h3>
                    <p class="song-artist">${song.artist}</p>
                    <p class="song-album">${song.album}</p>
                </div>
                <div class="song-actions">
                    ${song.previewUrl ? `<button class="btn-play" onclick="playPreview('${song.previewUrl}')">▶ Preview</button>` : ""}
                    <a href="${song.spotifyUrl}" target="_blank" class="btn-spotify">Open in Spotify</a>
                </div>
            </div>
        `,
    )
    .join("");

  container.innerHTML = `<h1 class="content-title">Your Top Songs</h1><div class="songs-list">${songsHTML}</div>`;
}

let currentAudio = null;
function playPreview(url) {
  if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = new Audio(url);
  currentAudio.play();
}

async function loadTopSongs() {
  if (!storedAccessToken) {
    alert("Please authenticate with Spotify first!");
    return;
  }

  topSongs = await fetchTopSongs(storedAccessToken);
  displayTopSongs(topSongs);
  hideAllExcept("top-songs-container");
  resetSelectedButtons("load-top-songs");
}

document
  .getElementById("load-top-songs")
  .addEventListener("click", () => loadTopSongs());

//* TOP ARTISTS *//
async function fetchTopArtists(accessToken) {
  const container = document.getElementById("top-artists-container");
  const loadButton = document.getElementById("load-top-artists");

  container.innerHTML = '<p class="loading">Loading your top artists...</p>';
  loadButton.disabled = true;

  try {
    const response = await fetch(`/api/top-artists?token=${accessToken}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch top artists");
    }

    return data.topArtists;
  } catch (error) {
    container.innerHTML = `
            <div class="error">
                <p>❌ ${error.message}</p>
                <p class="error-note">Note: To view your top artists, you need to authenticate with Spotify.</p>
            </div>
        `;
  } finally {
    loadButton.disabled = false;
  }
}

function displayTopArtists(artists) {
  const container = document.getElementById("top-artists-container");

  if (!artists || artists.length === 0) {
    container.innerHTML = '<p class="no-data">No top artists found.</p>';
    return;
  }

  const artistsHTML = artists
    .map(
      (artist) => `
            <div class="song-item">
                <div class="song-rank">#${artist.rank}</div>
                <div class="song-image">
                    <img src="${artist.image}" alt="${artist.name}">
                </div>
                <div class="song-info">
                    <h3 class="song-name">${artist.name}</h3>
                    <p class="song-artist">${artist.genres || "No genres listed"}</p>
                    <p class="song-album">Popularity: ${artist.popularity}/100 • ${artist.followers.toLocaleString()} followers</p>
                </div>
                <div class="song-actions">
                    <a href="${artist.spotifyUrl}" target="_blank" class="btn-spotify">Open in Spotify</a>
                </div>
            </div>
        `,
    )
    .join("");

  container.innerHTML = `<h1 class="content-title">Your Top Artists</h1><div class="songs-list">${artistsHTML}</div>`;
}

async function loadTopArtists() {
  if (!storedAccessToken) {
    alert("Please authenticate with Spotify first!");
    return;
  }

  topArtists = await fetchTopArtists(storedAccessToken);
  displayTopArtists(topArtists);
  hideAllExcept("top-artists-container");
  resetSelectedButtons("load-top-artists");
}

document
  .getElementById("load-top-artists")
  .addEventListener("click", () => loadTopArtists());

//* TOP ALBUMS *//
async function fetchTopAlbums(accessToken) {
  const container = document.getElementById("top-albums-container");
  const loadButton = document.getElementById("load-top-albums");

  container.innerHTML = '<p class="loading">Loading your top albums...</p>';
  loadButton.disabled = true;

  try {
    const response = await fetch(`/api/top-albums?token=${accessToken}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch top albums");
    }

    return data.topAlbums;
  } catch (error) {
    container.innerHTML = `
            <div class="error">
                <p>❌ ${error.message}</p>
                <p class="error-note">Note: To view your top albums, you need to authenticate with Spotify.</p>
            </div>
        `;
  } finally {
    loadButton.disabled = false;
  }
}

function displayTopAlbums(albums) {
  const container = document.getElementById("top-albums-container");

  if (!albums || albums.length === 0) {
    container.innerHTML = '<p class="no-data">No top albums found.</p>';
    return;
  }

  const albumsHTML = albums
    .map(
      (album) => `
            <div class="song-item">
                <div class="song-rank">#${album.rank}</div>
                <div class="song-image">
                    <img src="${album.image}" alt="${album.name}">
                </div>
                <div class="song-info">
                    <h3 class="song-name">${album.name}</h3>
                    <p class="song-artist">${album.artist}</p>
                    <p class="song-album">${album.totalTracks} tracks • Released: ${album.releaseDate}</p>
                </div>
                <div class="song-actions">
                    <a href="${album.spotifyUrl}" target="_blank" class="btn-spotify">Open in Spotify</a>
                </div>
            </div>
        `,
    )
    .join("");

  container.innerHTML = `<h1 class="content-title">Your Top Albums</h1><div class="songs-list">${albumsHTML}</div>`;
}

async function loadTopAlbums() {
  if (!storedAccessToken) {
    alert("Please authenticate with Spotify first!");
    return;
  }

  topAlbums = await fetchTopAlbums(storedAccessToken);
  displayTopAlbums(topAlbums);
  hideAllExcept("top-albums-container");
  resetSelectedButtons("load-top-albums");
}

document
  .getElementById("load-top-albums")
  .addEventListener("click", () => loadTopAlbums());

// CONNECTIONS CODE
document.getElementById("load-connections").addEventListener("click", () => {
  loadConnections();
});

document.getElementById("connections-guess").addEventListener("click", () => {
  makeGuess();
});

async function getLyrics() {
  console.log("called lyric endpoint");
  const temp = await fetch(`/api/lyrics`);
  const data = await temp.json();
  // console.log(data);
  return data.songs;
}

// should add a check for has lyrics before it returns
async function getRandomSong(songs, used) {
  // console.log(songs);
  console.log("called getRandomSong");
  if (used.size > songs.length) {
    console.log("ran out of songs to check!");
    return null;
  }
  const index = Math.floor(Math.random() * songs.length);
  if (used.has(index)) {
    // return getRandomSong(songs, used);
  }
  const tempSong = songs[index];

  let allSongsLyrics = await getLyrics();
  // console.log(allSongsLyrics);

  return allSongsLyrics[index];
}

// make sure to avoid duplicates
function fourRandomLyrics(song) {
  let toReturn = new Set();
  console.log("SONG:", song);

  // Check if song has lyrics
  if (!song || !song.lyrics) {
    console.error("Song doesn't have lyrics:", song);
    return toReturn;
  }

  let lyrics = song.lyrics.split("\n").filter((line) => line.trim() !== "");
  console.log(JSON.stringify(lyrics));
  // Make sure we have enough lyrics
  if (lyrics.length < 4) {
    console.error("Not enough lyric lines:", lyrics.length);
    return toReturn;
  }

  const index1 = Math.floor(Math.random() * lyrics.length);

  let lyric1 = lyrics[index1];
  // console.log("L1:", lyric1)
  toReturn.add(lyric1);

  while (toReturn.size < 4) {
    const index = Math.floor(Math.random() * lyrics.length);
    let lyric = lyrics[index];
    // console.log("L", index, ": ", lyric);
    toReturn.add(lyric);
  }

  console.log(toReturn);
  return toReturn;
}

let selected = new Set();
let validSets = [[], [], [], []];
let validSetPositions = [new Set(), new Set(), new Set(), new Set()];
let guessesLeft = 5;

function displayLyricsInTiles(validSets) {
  let grid = document.getElementById("connections-tiles");
  console.log("DISPLAY", validSets);

  let tiles = grid.children;

  let usedLyrics = new Set();
  let index1 = Math.floor(Math.random() * 4);
  let index2 = Math.floor(Math.random() * 4);
  let index = index1 * 4 + index2;

  for (let i = 0; i < 16; i++) {
    let tile = tiles[i];
    // if (!usedLyrics.has(index)) {
    tile.innerHTML = validSets[i % 4];
    console.log(validSets[i % 4]);
    validSetPositions[index1].add(i);
    // newValidSet[i] = validSets[index1][index2]
    usedLyrics.add(index);
    // }
  }
}

async function loadConnections() {
  if (!storedAccessToken) {
    alert("Please authenticate with Spotify first!");
    return;
  }
  console.log("about to try loading songs...");
  let topSongs = await fetchTopSongs(storedAccessToken);

  console.log("clearing styling on nav");
  hideAllExcept("connections-container");
  resetSelectedButtons("load-connections");

  let used = new Set();

  console.log("getting songs with lyrics...");
  let song1 = await getRandomSong(topSongs, used);
  // console.log(song1);
  let song2 = await getRandomSong(topSongs, used);
  let song3 = await getRandomSong(topSongs, used);
  let song4 = await getRandomSong(topSongs, used);

  let usedSongs = [song1, song2, song3, song4];

  for (songIndex in usedSongs) {
    validSets[songIndex] = fourRandomLyrics(usedSongs[songIndex]);
  }

  console.log("VALID SETS: \n", validSets);
  // add lyrics to tiles at random but keep track of where they go
  // displayLyricsInTiles(validSets);
  let grid = document.getElementById("connections-tiles");
  console.log("DISPLAY", validSets);

  let tiles = grid.children;

  console.log(validSets);

  let usedLyrics = new Set();
  let index1 = Math.floor(Math.random() * 4);
  let index2 = Math.floor(Math.random() * 4);
  let index = index1 * 4 + index2;

  // for (let i = 0; i < 16; i++) {
  //   let tile = tiles[i];
  //   // if (!usedLyrics.has(index)) {
  //     tile.innerHTML = validSets[0];
  //     console.log("LOG: ", JSON.stringify(validSets));
  //     validSetPositions[index1].add(i);
  //     // newValidSet[i] = validSets[index1][index2]
  //     usedLyrics.add(index);
  //   // }
  // }
}

function select(tileId) {
  let tile = document.getElementById("tile-" + tileId);
  if (selected.has(tileId)) {
    selected.delete(tileId);
    tile.className = "connections-tile";
  } else {
    if (selected.size < 4) {
      selected.add(tileId);
      tile.className = "connections-tile selected";
    }
  }
}

// get the lyrics from the set and add them to a div, which gets put at the bottom of the game page
function addResultSet(index) {
  let section = document.getElementById("results");

  let htmlString = "";
  validSets[index].map((lyricString) => {
    htmlString +=
      '<div class="result-tile num-' + index + '">' + lyricString + "</div> ";
  });

  section.innerHTML = htmlString;
}

function makeGuess() {
  if (guessesLeft < 1) {
    console.log("out of guesses!");
    return;
  }
  if (selected.size < 4) {
    console.log("not enough selected");
    return;
  }
  let index = -1;
  for (const set in validSets) {
    if (selected.difference(validSetPositions[set]).size == 0) {
      console.log("set found");
      index = set;
    }
  }
  if (index == -1) {
    guessesLeft--;
    document.getElementById("guesses-left").innerHTML = guessesLeft;
  } else {
    addResultSet(index);
    for (const buttonId in selected) {
      correctTile = document.getElementById("tile-" + buttonId);
      correctTile.disabled = true;

      correctTile.className = "connections-tile num-" + index;
    }
    selected = new Set();
  }
}
