import express from "express";
import { v2 as cloudinaryV2 } from "cloudinary";

const router = express.Router();

// Configure Cloudinary on request to ensure process.env variables are loaded.
router.post("/upload", async (req, res) => {
  try {
    const { buffer } = req.body;

    if (!buffer || typeof buffer !== "string") {
      return res.status(400).json({ message: "buffer (data URI string) is required" });
    }

    const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_SECRET_KEY } = process.env;
    const credentialsMissing =
      !CLOUD_NAME || CLOUD_NAME.includes("your") ||
      !CLOUD_API_KEY || CLOUD_API_KEY.includes("your") ||
      !CLOUD_SECRET_KEY || CLOUD_SECRET_KEY.includes("your");

    if (credentialsMissing) {
      console.error(
        "[Cloudinary] Upload attempted but credentials are not configured. " +
        "Set CLOUD_NAME / CLOUD_API_KEY / CLOUD_SECRET_KEY in services/utils/.env"
      );
      return res.status(500).json({
        message:
          "Image upload is not configured. Please set Cloudinary credentials " +
          "(CLOUD_NAME, CLOUD_API_KEY, CLOUD_SECRET_KEY) in services/utils/.env and restart the utils service.",
      });
    }

    // Initialize Cloudinary config with loaded env vars
    cloudinaryV2.config({
      cloud_name: CLOUD_NAME,
      api_key: CLOUD_API_KEY,
      api_secret: CLOUD_SECRET_KEY,
      secure: true,
    });

    // resource_type: "auto" lets Cloudinary detect the file type from the
    // data URI header (e.g. data:image/jpeg;base64,...).
    const result = await cloudinaryV2.uploader.upload(buffer, {
      resource_type: "auto",
      folder: "forkful",
    });

    if (!result?.secure_url) {
      return res.status(500).json({ message: "Cloudinary upload succeeded but returned no URL" });
    }

    console.log("[Cloudinary] Uploaded:", result.public_id, "→", result.secure_url);
    return res.json({ url: result.secure_url });
  } catch (error: any) {
    console.error("[Cloudinary] Upload failed:", error.message ?? error);
    return res.status(500).json({
      message: "Image upload failed",
      error: error.message ?? "Unknown error",
    });
  }
});

export default router;
