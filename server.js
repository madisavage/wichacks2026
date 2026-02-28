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
let accessToken = null;
let tokenExpiration = null;

//* Routes //

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
      id: track.id
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

app.get("/api/connections-info", async (req, res) => {
  try {
    const userAccessToken =
      req.query.token || req.headers.authorization?.split(" ")[1];

    const songId = req.query.songId;

    if (!userAccessToken) {
      return res.status(401).json({
        error: "No access token provided. User authentication required.",
      });
    }

    // Fetch song info from Spotify API
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${songId}`,
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
        params: {
          id: songId
        },
      },
    );
    console.log(response)
    res.json({ response });
  } catch (error) {
    console.error(
      "Error fetching song info:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch song info",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
