import React, { useState } from "react";

interface BlurUpImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export const BlurUpImage: React.FC<BlurUpImageProps> = ({ src, alt, className = "", style, ...props }) => {
  const [loaded, setLoaded] = useState(false);

  // Generate a tiny low-res source URL
  const lowResSrc = src.includes("?") 
    ? `${src}&w=20&q=30` 
    : `${src}?w=20&q=30`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Tiny low-res blurred image */}
      <img
        src={lowResSrc}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          filter: "blur(12px) scale(1.1)",
          transition: "opacity 0.4s ease-out",
          opacity: loaded ? 0 : 1,
          position: loaded ? "absolute" : "relative"
        }}
      />
      {/* High-res full image loaded on top */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s ease-in-out",
          position: "absolute",
          top: 0,
          left: 0
        }}
        {...props}
      />
    </div>
  );
};

export default BlurUpImage;
