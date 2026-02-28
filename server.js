import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Spotify API credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://spotify.madisavage.gay/api/callback`;
let accessToken = null;
let tokenExpiration = null;

//* Routes *//

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Initiate Spotify OAuth flow
app.get("/api/authenticate", (req, res) => {
  const scopes = ["user-top-read", "user-read-private", "user-read-email"].join(
    " ",
  );

  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams(
    {
      response_type: "code",
      client_id: CLIENT_ID,
      scope: scopes,
      redirect_uri: REDIRECT_URI,
      show_dialog: true,
    },
  )}`;

  res.redirect(authUrl);
});

// OAuth callback route
app.get("/api/callback", async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.redirect(`/?error=${error}`);
  }

  if (!code) {
    return res.redirect("/?error=no_code");
  }

  try {
    // Exchange authorization code for access token
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
        },
      },
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Redirect back to the app with the access token
    res.redirect(`/?access_token=${access_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error(
      "Error exchanging code for token:",
      error.response?.data || error.message,
    );
    res.redirect("/?error=token_exchange_failed");
  }
});

// Get user's top songs
app.get("/api/top-songs", async (req, res) => {
  try {
    const userAccessToken =
      req.query.token || req.headers.authorization?.split(" ")[1];

    if (!userAccessToken) {
      return res.status(401).json({
        error: "No access token provided. User authentication required.",
      });
    }

    // Fetch top songs from Spotify API
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks",
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
        params: {
          limit: 20,
          time_range: "medium_term",
        },
      },
    );

    const topSongs = response.data.items.map((track, index) => ({
      rank: index + 1,
      name: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      album: track.album.name,
      albumImage: track.album.images[0]?.url,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
      duration: Math.floor(track.duration_ms / 1000),
    }));

    res.json({ topSongs });
  } catch (error) {
    console.error(
      "Error fetching top songs:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch top songs",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Get user's top artists
app.get("/api/top-artists", async (req, res) => {
  try {
    const userAccessToken =
      req.query.token || req.headers.authorization?.split(" ")[1];

    if (!userAccessToken) {
      return res.status(401).json({
        error: "No access token provided. User authentication required.",
      });
    }

    // Fetch top artists from Spotify API
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/artists",
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
        params: {
          limit: 20,
          time_range: "medium_term",
        },
      },
    );

    const topArtists = response.data.items.map((artist, index) => ({
      rank: index + 1,
      name: artist.name,
      genres: artist.genres.join(", "),
      image: artist.images[0]?.url,
      spotifyUrl: artist.external_urls.spotify,
      popularity: artist.popularity,
      followers: artist.followers.total,
    }));

    res.json({ topArtists });
  } catch (error) {
    console.error(
      "Error fetching top artists:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch top artists",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Get user's top albums (derived from top tracks)
app.get("/api/top-albums", async (req, res) => {
  try {
    const userAccessToken =
      req.query.token || req.headers.authorization?.split(" ")[1];

    if (!userAccessToken) {
      return res.status(401).json({
        error: "No access token provided. User authentication required.",
      });
    }

    // Fetch top tracks to get albums
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks",
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
        params: {
          limit: 50,
          time_range: "medium_term",
        },
      },
    );

    // Extract unique albums and count occurrences
    const albumMap = new Map();
    response.data.items.forEach((track) => {
      const album = track.album;
      if (!albumMap.has(album.id)) {
        albumMap.set(album.id, {
          id: album.id,
          name: album.name,
          artist: album.artists.map((artist) => artist.name).join(", "),
          image: album.images[0]?.url,
          spotifyUrl: album.external_urls.spotify,
          releaseDate: album.release_date,
          totalTracks: album.total_tracks,
          count: 1,
        });
      } else {
        albumMap.get(album.id).count++;
      }
    });

    // Sort by count and add rank
    const topAlbums = Array.from(albumMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((album, index) => ({
        rank: index + 1,
        ...album,
      }));

    res.json({ topAlbums });
  } catch (error) {
    console.error(
      "Error fetching top albums:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch top albums",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
