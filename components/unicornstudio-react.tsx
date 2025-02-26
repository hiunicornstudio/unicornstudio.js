// This is an example React component for Unicorn Studio
// Use it for reference when building your own component
'use client';

import { useEffect, useRef, useState } from 'react';

export type UnicornSceneProps = {
  projectId?: string;
  jsonFilePath?: string;
  width?: number | string;
  height?: number | string;
  scale?: number;
  dpi?: number;
  fps?: number;
  altText?: string;
  ariaLabel?: string;
  className?: string;
  lazyLoad?: boolean;
};

export default function UnicornScene({
  projectId,
  jsonFilePath,
  width = "100%",
  height = "100%",
  scale = 1,
  dpi = 1.5,
  fps = 60,
  altText = "Unicorn Studio Animation",
  ariaLabel = altText,
  className = "",
  lazyLoad = false,
}: UnicornSceneProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptId = useRef(`us-data-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeScript = (callback: () => void) => {
      const version = '1.4.2';

      const existingScript = document.querySelector(
        'script[src^="https://cdn.unicorn.studio"]'
      );

      if (existingScript) {
        if (scriptLoaded) {
          callback();
        } else {
          existingScript.addEventListener('load', callback);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://cdn.unicorn.studio/v${version}/unicornStudio.umd.js`;
      script.async = true;

      script.onload = () => {
        setScriptLoaded(true);
        callback();
      };
      script.onerror = () => setError('Failed to load UnicornStudio script');

      document.body.appendChild(script);
    };

    const initializeScene = async () => {
      if (!elementRef.current) return;

      if (jsonFilePath) {
        elementRef.current.setAttribute(
          "data-us-project-src",
          `${jsonFilePath}`
        );
      } else if (projectId) {
        const [cleanProjectId, query] = projectId.split("?");
        const production = query?.includes("production");

        elementRef.current.setAttribute('data-us-project', cleanProjectId);

        if (production) {
          elementRef.current.setAttribute("data-us-production", "1");
        }
      } else {
        throw new Error('No project ID or JSON file path provided');
      }

      const UnicornStudio = (window as any).UnicornStudio;

      if (!UnicornStudio) {
        throw new Error('UnicornStudio not found');
      }

      if (sceneRef.current) {
        sceneRef.current.destroy();
      }

      UnicornStudio.init({
        scale,
        dpi,
      }).then((scenes: any[]) => {
        const ourScene = scenes.find(
          (scene) =>
            scene.element === elementRef.current ||
            scene.element.contains(elementRef.current)
        );
        if (ourScene) {
          sceneRef.current = ourScene;
        }
      });
    };

    initializeScript(initializeScene);

    return () => {
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
      if (jsonFilePath) {
        const script = document.getElementById(scriptId.current);
        script?.remove();
      }
    };
  }, [projectId, jsonFilePath, scale, dpi]);

  return (
    <div
      ref={elementRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      className={`relative ${className}`}
      role="img"
      aria-label={ariaLabel}
      data-us-dpi={dpi}
      data-us-scale={scale}
      data-us-fps={fps}
      data-us-alttext={altText}
      data-us-arialabel={ariaLabel}
      data-us-lazyload={lazyLoad ? "true" : ""}
    >
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}