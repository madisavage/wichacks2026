//* AUTHENTICATION *//
let storedAccessToken = null;

// Check for access token in URL on page load
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get("access_token");
  const error = urlParams.get("error");

  const authStatus = document.getElementById("auth-status");
  const authButton = document.getElementById("auth-button");

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
  contentIds = ['placeholder', 'auth-status', 'top-songs-container', 'top-artists-container', 'top-albums-container', 'connections-container']
  contentIds.map((id) => {
    if (id != targetId) {
      const container = document.getElementById(id);
      container.style.display = 'none';
    }
    else {
      const container = document.getElementById(id);
      container.style.display = 'block';
    }
  });
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

  container.innerHTML = `<div class="songs-list">${songsHTML}</div>`;
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
  const accessToken = prompt("Enter your Spotify access token:");

  if (accessToken) {
    topSongs = await fetchTopSongs(accessToken);
    displayTopSongs(topSongs);
    hideAllExcept('top-songs-container');
  } else {
    alert("Access token is required to fetch your top songs.");
  }
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

  container.innerHTML = `<div class="songs-list">${artistsHTML}</div>`;
}

async function loadTopArtists() {
  const accessToken = prompt("Enter your Spotify access token:");

  if (accessToken) {
    topArtists = await fetchTopArtists(accessToken);
    displayTopArtists(topArtists);
    hideAllExcept('top-artists-container');

  } else {
    alert("Access token is required to fetch your top artists.");
  }
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

  container.innerHTML = `<div class="songs-list">${albumsHTML}</div>`;
}

async function loadTopAlbums() {
  const accessToken = prompt("Enter your Spotify access token:");

  if (accessToken) {
    topAlbums = await fetchTopAlbums(accessToken);
    displayTopAlbums(topAlbums);
    hideAllExcept('top-albums-container');

  } else {
    alert("Access token is required to fetch your top albums.");
  }
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

// should add a check for has lyrics before it returns
function getRandomSong(songs) {
  return songs[Math.floor(Math.random() * songs.length)];
}

let selected = new Set();
let validSets = [new Set(), new Set(), new Set(), new Set() ];
let guessesLeft = 5;

async function loadConnections() {
  const accessToken = prompt("Enter your Spotify access token:");
  if (accessToken) {
    let topSongs = await fetchTopSongs(accessToken);

    // display the grid and controls
    hideAllExcept('connections-container');

    // get 4 songs from the top (that have lyrics)
    // get the lyrics
    // pick 4 discrete chunks from the lyrics
    let song1 = getRandomSong(topSongs);
    let song2 = getRandomSong(topSongs);
    let song3 = getRandomSong(topSongs);
    let song4 = getRandomSong(topSongs);

    let usedSongs = [song1, song2, song3, song4];

    let i = 1;
    let lyrics = usedSongs.map((song) => {
      // console.log("get lyrics for", song);
      // validSets.i.add();
      // should map to song index or something to keep them grouped?
    });

    // have a way to click max 4 tiles - done
    // have a way to run select if 4 tiles are selected - done
    // select checks if those 4 tiles are connected
    // have some kind of variable map associated?
    // shuffle option??? - no
  } else {
    alert("Access token is required to fetch your top songs.");
  }
}

function select(tileId) {
  let tile = document.getElementById("tile-" + tileId);
  if (selected.has(tileId)) {
    selected.delete(tileId);
    tile.className = 'connections-tile';
  }

  else {
    if (selected.size < 4) {
      selected.add(tileId);
      tile.className = 'connections-tile selected';
    }
  }
}

function addResultSet(index) {
  let section = document.getElementById('results');

  let htmlString = '';
  validSets.index.map((lyricString) => {
    htmlString += '<div class="result-tile">' + lyricString + '</div> '
  });

  section.innerHTML = htmlString;
}

function makeGuess() {
  if (selected.size < 4){
    console.log('not enough selected')
    return;
  }
  let success = false;
  for (const set in validSets){
    if (selected.difference(set).size == 0){
      console.log('set found');
      success = true;
    }
  }
  if (!success) {
    guessesLeft --;
  }
  addResultSet(1);
}
