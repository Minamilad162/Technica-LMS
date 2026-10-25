import React from "react";

// v1.5 — new native-resolution photography. Values match real file dimensions.
const variants = {
  "hero-plant.webp": { standard: 780, hd: 1672, width: 1672, height: 941 },
  "process-vessel.webp": { standard: 780, hd: 1536, width: 1536, height: 1024 },
  "hazop-engineers.webp": { standard: 780, hd: 1536, width: 1536, height: 1024 },
  "refinery.webp": { standard: 780, hd: 1672, width: 1672, height: 941 },
  "practice-plant.webp": { standard: 780, hd: 1672, width: 1672, height: 940 },
  "pump.webp": { standard: 780, hd: 1672, width: 1672, height: 941 },
  "tank-farm.webp": { standard: 780, hd: 1672, width: 1672, height: 941 },
  "moc-plant.webp": { standard: 780, hd: 1672, width: 1672, height: 941 },
  "pha-plant.webp": { standard: 780, hd: 1536, width: 1536, height: 1024 },
  "emergency-plant.webp": { standard: 780, hd: 1672, width: 1672, height: 941 },
  "course-banner.webp": { standard: 780, hd: 1536, width: 1536, height: 1024 },
};

/** Responsive photos. Small WebP variants are resized from the NEW masters, not old images. */
export default function HDImage({src, priority=false, sizes="(max-width: 740px) 55vw, 410px", alt="", ...rest}) {
  const basename = typeof src === "string" ? src.split("/").pop() : "";
  const variant = variants[basename];
  if (!variant) return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" {...rest}/>;
  const mobileSrc = src.replace(/\.webp$/i, "-sm.webp");
  return <img
    src={src}
    srcSet={`${mobileSrc} ${variant.standard}w, ${src} ${variant.hd}w`}
    sizes={sizes}
    loading={priority ? "eager" : "lazy"}
    fetchPriority={priority ? "high" : "auto"}
    decoding="async"
    alt={alt}
    {...rest}
  />;
}
