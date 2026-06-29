// components/ui/PhotoUpload.tsx
// Reusable drag-and-drop photo upload component, Samadhaan-style.
// Degrades gracefully if Firebase is not configured.

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadPhoto } from "../../lib/uploadPhoto";
import toast from "react-hot-toast";

interface PhotoUploadProps {
  /** Firebase Storage folder, e.g. "recipes", "profiles" */
  folder: string;
  /** Current image URL to display as existing preview */
  currentUrl?: string;
  /** Called with the permanent download URL after a successful upload */
  onUploadComplete: (url: string) => void;
  /** Label shown in the drop zone */
  label?: string;
}

export const PhotoUpload = ({
  folder,
  currentUrl,
  onUploadComplete,
  label = "Upload photo",
}: PhotoUploadProps) => {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      // Immediate local preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setDone(false);
      setProgress(0);

      try {
        const url = await uploadPhoto(file, folder, (pct) => setProgress(pct));
        setProgress(null);
        setDone(true);
        onUploadComplete(url);
        toast.success("Photo uploaded!");
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error("[PhotoUpload]", err);
        setProgress(null);
        toast.error("Upload failed. Check Cloudinary configuration.");
      }
    },
    [folder, onUploadComplete]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const circumference = 2 * Math.PI * 20; // r=20

  return (
    <div className="w-full">
      {label && (
        <p
          className="text-xs font-bold uppercase tracking-wider mb-2"
          style={{ color: "var(--color-manifest)" }}
        >
          {label}
        </p>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}. Press Enter or Space to open file picker.`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="relative w-full rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden"
        style={{
          minHeight: "160px",
          border: dragging
            ? "2px dashed var(--color-route)"
            : "2px dashed var(--color-rule)",
          background: dragging
            ? "rgba(255,87,51,0.06)"
            : "rgba(255,255,255,0.03)",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {/* Preview image */}
        <AnimatePresence>
          {preview && (
            <motion.img
              key="preview"
              src={preview}
              alt="Upload preview"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </AnimatePresence>

        {/* Overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{
            background: preview
              ? "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 100%)"
              : "transparent",
          }}
        >
          {/* Progress ring */}
          {progress !== null && (
            <svg width="52" height="52" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke="var(--color-route)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * progress) / 100}
                style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.2s ease" }}
              />
              <text x="24" y="28" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">
                {progress}%
              </text>
            </svg>
          )}

          {/* Success checkmark */}
          <AnimatePresence>
            {done && progress === null && (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#10B981" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!preview && progress === null && (
            <>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,87,51,0.1)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p className="text-xs font-semibold" style={{ color: "var(--color-manifest)" }}>
                {dragging ? "Drop to upload" : "Drag & drop or click"}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-ghost)" }}>
                PNG, JPG, WEBP · Max 5 MB
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
