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

    displayTopSongs(data.topSongs);
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

document.getElementById("load-top-songs").addEventListener("click", () => {
  let accessToken = storedAccessToken;

  if (!accessToken) {
    accessToken = prompt("Enter your Spotify access token:");
  }

  if (accessToken) {
    fetchTopSongs(accessToken);
  } else {
    alert(
      "Access token is required to fetch your top songs. Please authenticate first.",
    );
  }
});
