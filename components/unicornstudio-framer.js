import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicHeight 400
 * @framerIntrinsicWidth 800
 */
export default function UnicornStudioEmbed(props) {
    const elementRef = useRef(null)
    const sceneRef = useRef(null)
    const scriptId = useRef(
        `unicorn-project-${Math.random().toString(36).substr(2, 9)}`
    )

    useEffect(() => {
        const isEditingOrPreviewing = ["CANVAS", "PREVIEW"].includes(
            RenderTarget.current()
        )

        if (RenderTarget.current() === "CANVAS") {
            return
        }

        const initializeScript = (callback) => {
            const existingScript = document.querySelector(
                'script[src^="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"]'
            )
            if (!existingScript) {
                const script = document.createElement("script")
                script.src =
                    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.20/dist/unicornStudio.umd.js"
                script.onload = callback
                script.onerror = () => console.error("Failed to load UnicornStudio script")
                document.head.appendChild(script)
            } else {
                if (window.UnicornStudio) {
                    callback()
                } else {
                    const waitForLoad = setInterval(() => {
                        if (window.UnicornStudio) {
                            clearInterval(waitForLoad)
                            callback()
                        }
                    }, 100)
                }
            }
        }

        const initializeUnicornStudio = () => {
            if (props.projectJSON) {
                try {
                    // Create script element for JSON data
                    const dataScript = document.createElement("script")
                    dataScript.id = scriptId.current
                    dataScript.type = "application/json"
                    dataScript.textContent = props.projectJSON
                    document.head.appendChild(dataScript)

                    elementRef.current.setAttribute(
                        "data-us-project-src",
                        `${scriptId.current}`
                    )
                } catch (e) {
                    console.error("Failed to parse project JSON:", e)
                    return
                }
            } else if (props.projectId) {
                const query = props.projectId.split("?")
                const projectId = query[0]
                const production = query[1] && query[1].includes("production")
                const cacheBuster = isEditingOrPreviewing
                    ? "?update=" + Math.random()
                    : ""
                elementRef.current.setAttribute(
                    "data-us-project",
                    projectId + cacheBuster
                )

                if (production) {
                    elementRef.current.setAttribute("data-us-production", 1)
                }
            }

            if (window.UnicornStudio) {
                const existingScene = window.UnicornStudio.scenes?.find(
                    (scene) =>
                        scene.element === elementRef.current ||
                        scene.element.contains(elementRef.current)
                )
                if (existingScene) {
                    existingScene.destroy()
                } else {
                    window.UnicornStudio.destroy()
                }
                window.UnicornStudio.init().then((scenes) => {
                    const ourScene = scenes.find(
                        (scene) =>
                            scene.element === elementRef.current ||
                            scene.element.contains(elementRef.current)
                    )
                    if (ourScene) {
                        sceneRef.current = ourScene
                    }
                })
            }
        }

        if (props.projectId || props.projectJSON) {
            if (window.UnicornStudio) {
                initializeUnicornStudio()
            } else {
                initializeScript(initializeUnicornStudio)
            }
        }

        return () => {
            if (sceneRef.current) {
                sceneRef.current.destroy()
                sceneRef.current = null
            }
            // Clean up JSON script if it exists
            const dataScript = document.getElementById(scriptId.current)
            if (dataScript) {
                dataScript.remove()
            }
        }
    }, [props.projectId, props.projectJSON])

    if (RenderTarget.current() === "CANVAS") {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0, 0, 0, 0.15)",
                    color: "#4B5563",
                    fontWeight: 500,
                    textAlign: "center",
                    padding: "16px",
                }}
            >
                <p style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
                    Scene will render in Preview and on your published site.
                </p>
                {!props.projectId && !props.projectJSON ? (
                    <p style={{ fontSize: "1rem", color: "#EF4444" }}>
                        No project ID, please export your scene and add its
                        project ID in the detail panel.
                    </p>
                ) : (
                    " "
                )}
            </div>
        )
    }

    return (
        <div
            ref={elementRef}
            data-us-dpi={props.dpi}
            data-us-scale={props.scale}
            data-us-fps={props.fps}
            data-us-altText={props.altText}
            data-us-ariaLabel={props.ariaLabel}
            data-us-lazyload={props.lazyLoad ? "true" : ""}
            style={{ width: "100%", height: "100%", ...props.style }}
        >
            {props.header && (
                <h1
                    style={{
                        width: "1px",
                        height: "1px",
                        margin: "-1px",
                        padding: "0",
                        overflow: "hidden",
                        clip: "rect(0, 0, 0, 0)",
                        border: "0",
                    }}
                >
                    {props.header}
                </h1>
            )}
        </div>
    )
}

UnicornStudioEmbed.displayName = "Unicorn Studio Embed"

addPropertyControls(UnicornStudioEmbed, {
    projectId: {
        type: ControlType.String,
        title: "Project ID",
    },
    projectJSON: {
        type: ControlType.String,
        title: "Project JSON",
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        min: 0.25,
        max: 1,
        step: 0.01,
    },
    dpi: {
        type: ControlType.Number,
        title: "DPI",
        defaultValue: 1.5,
        min: 0.5,
        max: 2,
        step: 0.1,
    },
    fps: {
        type: ControlType.Number,
        title: "FPS",
        defaultValue: 60,
        min: 10,
        max: 120,
        step: 5,
    },
    header: {
        type: ControlType.String,
        title: "H1 text",
    },
    altText: {
        type: ControlType.String,
        title: "Alt text",
    },
    ariaLabel: {
        type: ControlType.String,
        title: "Aria label",
    },
    lazyLoad: {
        type: ControlType.Boolean,
        title: "Lazy Load",
        defaultValue: false,
    },
})
