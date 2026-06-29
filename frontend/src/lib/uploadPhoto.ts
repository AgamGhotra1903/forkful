// lib/uploadPhoto.ts — Cloudinary upload utility via Backend Utils Service
// Replaces Firebase storage with completely free Cloudinary storage.

import axios from "axios";
import { utilsService } from "../main";

/**
 * Upload a file to Cloudinary via the utils service and return its secure URL.
 * @param file      The File object to upload
 * @param folder    Unused but kept for signature compatibility
 * @param onProgress  Optional callback receiving upload progress 0-100
 * @returns Promise resolving to the Cloudinary secure URL (HTTPS)
 */
export async function uploadPhoto(
  file: File,
  _folder?: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        
        // Post the base64 data to our utils service upload route
        const { data } = await axios.post(
          `${utilsService}/api/upload`,
          { buffer: base64Data },
          {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress?.(pct);
              }
            },
          }
        );

        if (data.url) {
          resolve(data.url);
        } else {
          reject(new Error("Cloudinary upload succeeded but returned no URL"));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
