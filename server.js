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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
