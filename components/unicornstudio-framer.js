import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicHeight 400
 * @framerIntrinsicWidth 800
 */
export default function UnicornStudioEmbed(props) {
    const {
        sdkVersion = "2.0.4", // default
    } = props

    const elementRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<any>(null)
    const scriptId = useRef(
        `unicorn-project-${Math.random().toString(36).substr(2, 9)}`
    )
    const [versionError, setVersionError] = useState<string | null>(null)

    // simple semver check: 1.2.3
    const isValidVersion = (v: string) =>
        /^\d+\.\d+\.\d+(-beta)?$/.test(v.trim())

    useEffect(() => {
        const isEditingOrPreviewing = ["CANVAS", "PREVIEW"].includes(
            RenderTarget.current()
        )

        // validate version first
        if (!isValidVersion(sdkVersion)) {
            console.error(
                `[UnicornStudioEmbed] Invalid SDK version "${sdkVersion}". Expected format: x.y.z (e.g. 1.4.34)`
            )
            setVersionError(
                `Invalid SDK version "${sdkVersion}". Use x.y.z (e.g. 1.4.34).`
            )
            return
        } else {
            setVersionError(null)
        }

        if (RenderTarget.current() === "CANVAS") {
            return
        }

        const initializeScript = (callback: () => void) => {
            const cdnPrefix =
                "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"
            const scriptSrc = `${cdnPrefix}@v${sdkVersion}/dist/unicornStudio.umd.js`

            // check if any unicornstudio.js script is already on the page
            const existingScript = document.querySelector(
                'script[src^="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"]'
            ) as HTMLScriptElement | null

            // IMPORTANT:
            // If there is already a script but it's for a different version,
            // we might want to load the desired one anyway. For now, if it's
            // present AND window.UnicornStudio exists, we just use it.
            if (!existingScript) {
                const script = document.createElement("script")
                script.src = scriptSrc
                script.onload = callback
                script.onerror = () =>
                    console.error(
                        "Failed to load UnicornStudio script at " + scriptSrc
                    )
                document.body.appendChild(script)
            } else {
                if ((window as any).UnicornStudio) {
                    callback()
                } else {
                    const waitForLoad = setInterval(() => {
                        if ((window as any).UnicornStudio) {
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
                    document.body.appendChild(dataScript)

                    elementRef.current?.setAttribute(
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
                elementRef.current?.setAttribute(
                    "data-us-project",
                    projectId + cacheBuster
                )

                if (production) {
                    elementRef.current?.setAttribute("data-us-production", "1")
                }
            }

            const US = (window as any).UnicornStudio
            if (!US || !elementRef.current) return

            // 1) Clean up only our previous scene
            US.scenes?.find((s) => s.element === elementRef.current)?.destroy()

            // 2) Prepare args
            const args: any = {
                element: elementRef.current,
                dpi: props.dpi,
                scale: props.scale,
                fps: props.fps,
                lazyLoad: !!props.lazyLoad,
                fixed: !!props.fixed,
                altText: props.altText,
                ariaLabel: props.ariaLabel,
            }

            // If you passed JSON via a <script type="application/json" id=...>
            if (props.projectJSON) {
                // ensure script tag exists (your current code already does this)
                args.filePath = scriptId.current
            } else {
                args.projectId = props.projectId // your parsed id
            }

            // 3) Create only this scene
            US.addScene(args).then((scene: any) => {
                sceneRef.current = scene
            })
        }

        if (props.projectId || props.projectJSON) {
            if ((window as any).UnicornStudio) {
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
    }, [props.projectId, props.projectJSON, sdkVersion])

    // CANVAS mode stays the same
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

    // runtime render
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div
                ref={elementRef}
                data-us-dpi={props.dpi}
                data-us-scale={props.scale}
                data-us-fps={props.fps}
                data-us-altText={props.altText}
                data-us-ariaLabel={props.ariaLabel}
                {...(props.lazyLoad ? { "data-us-lazyload": "true" } : {})}
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
            {versionError ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 8,
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.5)",
                        borderRadius: 6,
                        padding: "8px 10px",
                        fontSize: 12,
                        color: "#991B1B",
                        pointerEvents: "none",
                    }}
                >
                    {versionError}
                </div>
            ) : null}
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
    sdkVersion: {
        type: ControlType.String,
        title: "SDK version",
        defaultValue: "2.0.4",
        placeholder: "1.4.34",
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
    fixed: {
        type: ControlType.Boolean,
        title: "Fixed",
        defaultValue: false,
    },
})
