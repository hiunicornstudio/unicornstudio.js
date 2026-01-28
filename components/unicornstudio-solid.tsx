import { createEffect, onCleanup, createSignal, Component } from "solid-js";

// Augment the window object to include UnicornStudio for TypeScript
declare global {
    interface Window {
        UnicornStudio?: {
            init: (config: { scale: number; dpi: number }) => Promise<Array<{
                element: HTMLElement;
                destroy: () => void;
                contains?: (element: HTMLElement | null) => boolean;
            }>>;
        };
    }
}

// Define the props for the component, matching the React version
export interface UnicornSceneProps {
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
}

const UnicornScene: Component<UnicornSceneProps> = (props) => {
    // Set default values for props
    const p = {
        width: "100%",
        height: "100%",
        scale: 1,
        dpi: 1.5,
        fps: 60,
        altText: "Unicorn Scene",
        get ariaLabel() { return this.altText },
        className: "",
        lazyLoad: false,
        ...props
    };

    let elementRef: HTMLDivElement | undefined;
    let sceneRef: { destroy: () => void } | null = null;
    const [error, setError] = createSignal<string | null>(null);

    createEffect(() => {
        // Re-run this effect if these properties change
        const { projectId, jsonFilePath, scale, dpi } = p;

        if (typeof window === 'undefined') return;

        const initializeScript = (callback: () => void) => {
            const version = '2.0.4';
            const scriptSrc = `https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v${version}/dist/unicornStudio.umd.js`;
            const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);

            if (existingScript) {
                if (window.UnicornStudio) {
                    callback();
                } else {
                    existingScript.addEventListener('load', callback);
                }
                return;
            }

            const script = document.createElement('script');
            script.src = scriptSrc;
            script.async = true;
            script.onload = callback;
            script.onerror = () => setError('Failed to load UnicornStudio script');
            document.body.appendChild(script);
        };

        const initializeScene = async () => {
            if (!elementRef) return;

            if (jsonFilePath) {
                elementRef.setAttribute("data-us-project-src", jsonFilePath);
            } else if (projectId) {
                const [cleanProjectId, query] = projectId.split("?");
                const production = query?.includes("production");
                elementRef.setAttribute('data-us-project', cleanProjectId);
                if (production) {
                    elementRef.setAttribute("data-us-production", "1");
                }
            } else {
                setError('No project ID or JSON file path provided');
                return;
            }

            const UnicornStudio = window.UnicornStudio;
            if (!UnicornStudio) {
                setError('UnicornStudio library not found on window object.');
                return;
            }

            if (sceneRef?.destroy) {
                sceneRef.destroy();
            }

            try {
                const scenes = await UnicornStudio.init({ scale, dpi });
                const ourScene = scenes.find(
                    (scene) =>
                        scene.element === elementRef ||
                        scene.element.contains?.(elementRef)
                );
                if (ourScene) {
                    sceneRef = ourScene;
                }
            } catch (e) {
                console.error("Failed to initialize Unicorn Studio scene:", e);
                setError("Failed to initialize scene.");
            }
        };

        initializeScript(() => {
            void initializeScene();
        });

        onCleanup(() => {
            if (sceneRef?.destroy) {
                sceneRef.destroy();
                sceneRef = null;
            }
        });
    });

    return (
        <div
            ref={elementRef}
            style={{
                width: typeof p.width === 'number' ? `${p.width}px` : p.width,
                height: typeof p.height === 'number' ? `${p.height}px` : p.height,
            }}
            class={`relative ${p.className}`}
            role="img"
            aria-label={p.ariaLabel}
            data-us-dpi={p.dpi}
            data-us-scale={p.scale}
            data-us-fps={p.fps}
            data-us-alttext={p.altText}
            data-us-arialabel={p.ariaLabel}
            data-us-lazyload={p.lazyLoad ? "true" : ""}
        >
            {error() && <div style={{ color: 'red' }}>{error()}</div>}
        </div>
    );
};

export default UnicornScene;
