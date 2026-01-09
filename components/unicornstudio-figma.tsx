import { defineProperties } from "figma:react"

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type UnicornSceneProps = {
    projectId?: string
    jsonFilePath?: string
    projectJSON?: string
    sdkVersion?: string
    width?: number | string
    height?: number | string
    scale?: number
    dpi?: number
    fps?: number
    altText?: string
    ariaLabel?: string
    className?: string
    lazyLoad?: boolean
    fixed?: boolean
    header?: string
}

export default function UnicornScene({
    projectId,
    jsonFilePath,
    projectJSON,
    sdkVersion = "2.0.1",
    width = "100%",
    height = "100%",
    scale = 1,
    dpi = 1.5,
    fps = 60,
    altText = "Unicorn Scene",
    ariaLabel = altText,
    className = "",
    lazyLoad = false,
    fixed = false,
    header,
}: UnicornSceneProps) {
    const elementRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<{ destroy: () => void } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const scriptId = useRef(`us-data-${Math.random().toString(36).slice(2)}`)
    const setElementRef = useCallback((node: HTMLDivElement | null) => {
        elementRef.current = node
    }, [])

    const isValidVersion = (v: string) => /^\d+\.\d+\.\d+(-beta)?$/.test(v.trim())

    useEffect(() => {
        if (typeof window === "undefined") return

        if (!isValidVersion(sdkVersion)) {
            setError(
                `Invalid SDK version "${sdkVersion}". Use x.y.z (e.g. 1.4.34).`
            )
            return
        } else {
            setError(null)
        }

        const initializeScript = (callback: () => void) => {
            const cdnPrefix =
                "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"
            const scriptSrc = `${cdnPrefix}@v${sdkVersion}/dist/unicornStudio.umd.js`

            const existingScript = document.querySelector(
                'script[src^="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"]'
            ) as HTMLScriptElement | null

            if (!existingScript) {
                const script = document.createElement("script")
                script.src = scriptSrc
                script.async = true
                script.onload = callback
                script.onerror = () =>
                    setError(`Failed to load UnicornStudio script at ${scriptSrc}`)
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

        const initializeScene = () => {
            if (!elementRef.current) return

            // Clean up any previous scene on this element
            if (sceneRef.current?.destroy) {
                sceneRef.current.destroy()
                sceneRef.current = null
            }

            if (projectJSON) {
                // ensure we don't leak old inline data scripts on prop change
                const previous = document.getElementById(scriptId.current)
                previous?.remove()

                const dataScript = document.createElement("script")
                dataScript.id = scriptId.current
                dataScript.type = "application/json"
                dataScript.textContent = projectJSON
                document.body.appendChild(dataScript)
                elementRef.current.setAttribute("data-us-project-src", scriptId.current)
            } else if (jsonFilePath) {
                elementRef.current.setAttribute("data-us-project-src", `${jsonFilePath}`)
            } else if (projectId) {
                const [cleanProjectId, query] = projectId.split("?")
                const production = query?.includes("production")
                elementRef.current.setAttribute("data-us-project", cleanProjectId)
                if (production) {
                    elementRef.current.setAttribute("data-us-production", "1")
                }
            } else {
                setError("No project ID or JSON provided")
                return
            }

            const US = (window as any).UnicornStudio
            if (!US) {
                setError("UnicornStudio not found")
                return
            }

            const args: any = {
                element: elementRef.current,
                dpi,
                scale,
                fps,
                lazyLoad: !!lazyLoad,
                fixed: !!fixed,
                altText,
                ariaLabel,
            }

            if (projectJSON) {
                args.filePath = scriptId.current
            } else if (jsonFilePath) {
                args.filePath = jsonFilePath
            } else if (projectId) {
                args.projectId = projectId
            }

            US.addScene(args)
                .then((scene: any) => {
                    sceneRef.current = scene
                })
                .catch(() => {
                    setError("Failed to initialize UnicornStudio scene")
                })
        }

        const start = () => initializeScene()

        if ((window as any).UnicornStudio) {
            start()
        } else {
            initializeScript(start)
        }

        return () => {
            if (sceneRef.current?.destroy) {
                sceneRef.current.destroy()
                sceneRef.current = null
            }

            const dataScript = document.getElementById(scriptId.current)
            if (dataScript) {
                dataScript.remove()
            }
        }
    }, [
        projectId,
        jsonFilePath,
        projectJSON,
        sdkVersion,
        scale,
        dpi,
        fps,
        lazyLoad,
        fixed,
        altText,
        ariaLabel,
    ])

    return (
        <div
            ref={setElementRef}
            style={{
                width: typeof width === "number" ? `${width}px` : width,
                height: typeof height === "number" ? `${height}px` : height,
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
            {header ? (
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
                    {header}
                </h1>
            ) : null}
            {error && <div className="text-red-500">{error}</div>}
        </div>
    )
}

defineProperties(UnicornScene, {
    projectId: {
        label: "Project Id",
        type: "string",
        defaultValue: "Add your project Id",
    },
    projectJSON: {
        label: "Project JSON",
        type: "string",
        defaultValue: "",
    },
    jsonFilePath: {
        label: "JSON File Path",
        type: "string",
        defaultValue: "",
    },
    sdkVersion: {
        label: "SDK Version",
        type: "string",
        defaultValue: "2.0.1",
    },
    scale: {
        type: "number",
        label: "Scale",
        defaultValue: 1,
    },
    dpi: {
        type: "number",
        label: "DPI",
        defaultValue: 1.5,
    },
    fps: {
        type: "number",
        label: "FPS",
        defaultValue: 60,
    },
    altText: {
        type: "string",
        label: "Alt text",
        defaultValue: "Unicorn Scene",
    },
    ariaLabel: {
        type: "string",
        label: "Aria label",
        defaultValue: "Unicorn Scene",
    },
    lazyLoad: {
        type: "boolean",
        label: "Lazy Load",
        defaultValue: false,
    },
    fixed: {
        type: "boolean",
        label: "Fixed",
        defaultValue: false,
    },
    header: {
        type: "string",
        label: "H1 text",
        defaultValue: "",
    },
})
