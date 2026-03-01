//* AUTHENTICATION *//
let storedAccessToken = 'BQDtWq8k9nlGBGDvjM0zOlsj-MwYtnBYvNqEvI75_n_0y4GPxsm1G54DD5A8cZNv2VTUbRPIWEUf5bEbd1I-cUCxiu6jaQTfNru5uBvIEjMDD5txEBRgaSTgn_M_a8v3cvkmydrj4fcEX32HkKWFVDHHxaGHRqKwFwD1w3jakLg5cBxQMgkJtIeMhQUe-EZbZARsJprpcgfW0k1Y6FfbYpyxaJrkDW8wLRoJE3R0e0WqIW5C0uqbtcVpoi5cwaWX9RzUZdDYu9Kcsq_IcdwXrUg-2OGpH3n2ZUT4FbP9zywCRz9njUw33lUW0S6k3QaT-vef';

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
  const selectedItems = document.getElementsByClassName('btn-primary selected');
  for (item in selectedItems) {
    item = selectedItems[item]
    item.className = 'btn-primary';
  }

  let targetItem = document.getElementById(targetId);
  targetItem.className = 'btn-primary selected';
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

//* LYRICS *//
async function getLyrics(song) {
  try {
    const response = await fetch(
      `https://lrclib.net/api/get?artist_name=${song.artist}&track_name=${song.name}&album_name=${song.album}&duration=${song.duration}`,
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch lyrics");
    }

    // console.log(data.trackName + ":\n\n" + data.plainLyrics);

    return data;
  } catch (error) {
    console.error(error); // Catches HTTP errors and network errors
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
  resetSelectedButtons('load-top-songs');
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
  resetSelectedButtons('load-top-artists');
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
  resetSelectedButtons('load-top-albums');
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

async function checkForLyrics(song) {
  const temp = await getLyrics(song);
  if (temp.plainLyrics) {
    return true;
  }
  return false;
}

// should add a check for has lyrics before it returns
function getRandomSong(songs) {
  const tempSong = songs[Math.floor(Math.random() * songs.length)];

  if (checkForLyrics(tempSong)) {
    return tempSong;
  } else {
    console.log("issue");
  }
}

let selected = new Set();
let validSets = [new Set(), new Set(), new Set(), new Set()];
let guessesLeft = 5;

async function loadConnections() {
  if (!storedAccessToken) {
    alert("Please authenticate with Spotify first!");
    return;
  }
  let topSongs = await fetchTopSongs(storedAccessToken);

  hideAllExcept("connections-container");
  resetSelectedButtons('load-connections');

  let song1 = getRandomSong(topSongs);
  let song2 = getRandomSong(topSongs);
  let song3 = getRandomSong(topSongs);
  let song4 = getRandomSong(topSongs);

  let usedSongs = [song1, song2, song3, song4];

  let lyricsPromises = usedSongs.map((song) => {
    return getLyrics(song)
      .then((lyrics) => {
        return { song, lyrics: lyrics.plainLyrics };
      })
      .catch((error) => {
        console.error("Failed to get lyrics for", song, error);
        return { song, lyrics: null };
      });
  });

  Promise.all(lyricsPromises).then((lyricsArray) => {
    usedSongs = lyricsArray.map((item) => {
      return { ...item.song, lyrics: item.lyrics };
    });
    console.log("Updated usedSongs with lyrics:", usedSongs);
  });
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

// get the lyrics from the set and add them to a div, which gets put at the bottom of the game page
function addResultSet(index) {
  let section = document.getElementById('results');

  let htmlString = '';
  validSets.index.map((lyricString) => {
    htmlString += '<div class="result-tile num-' + index + '">' + lyricString + '</div> '
  });

  section.innerHTML = htmlString;
}

function makeGuess() {
  if (guessesLeft < 1) {
    console.log('out of guesses!');
    return;
  }
  if (selected.size < 4) {
    console.log('not enough selected')
    return;
  }
  let index = -1;
  for (const set in validSets) {
    if (selected.difference(validSets[set]).size == 0) {
      console.log('set found');
      index = set;
    }
  }
  if (index == -1) {
    guessesLeft--;
    document.getElementById('guesses-left').innerHTML = guessesLeft;
  } else {
    addResultSet(index);
    for (const buttonId in selected) {
      correctTile = document.getElementById('tile-' + buttonId);
      correctTile.disabled = true;

      correctTile.className = 'connections-tile num-' + index;
    }
    selected = new Set();

  }
}
