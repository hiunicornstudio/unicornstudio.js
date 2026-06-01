# Embed your Unicorn Studio projects

Use this runtime to embed, optimize, and customize published Unicorn Studio WebGL scenes from application code. A published scene decides what is customizable; prefer authored variables for integration points, and use direct layer controls only when a variable does not exist.

Implementation reference for agents can be found here: https://www.unicorn.studio/unicornstudio-llms.txt

## Include the script

Add the script tag to the `<head>` of your page

```html
<script src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.2.1/dist/unicornStudio.umd.js"></script>
```

or import into your component

```js
import * as UnicornStudio from "./path/to/unicornStudio.umd.js";
```

## Initialize your scene:

### Inline

Any element with `data-us-project` or `data-us-project-src` will get initialized by calling `UnicornStudio.init()`. Use `data-us-project` for a published Unicorn Studio embed ID. If you're hosting your own exported JSON file, use `data-us-project-src` to point to its location. You do not need both `data-us-project` and `data-us-project-src`. If you host your own JSON, remember you'll need to update this file when you make changes to your scene in Unicorn Studio.

```html
<div
  class="unicorn-embed"
  data-us-project="YOUR_PROJECT_EMBED_ID"
  data-us-scale="1"
  data-us-dpi="1.5"
  data-us-lazyload="true"
  data-us-production="true"
  data-us-vars='{"brandColor":"#7c3aed","intensity":0.65}'
  data-us-alttext="Welcome to Unicorn Studio"
  data-us-arialabel="This is a canvas scene"
></div>
<script>
  UnicornStudio.init()
    .then((scenes) => {
      // Scenes are ready
    })
    .catch((err) => {
      console.error(err);
    });
</script>
```

For self-hosted exported JSON, use `data-us-project-src` instead:

```html
<div
  class="unicorn-embed"
  data-us-project-src="path/to/your/PROJECT_ID.json"
></div>
```

### Dynamically

You can add a scene dynamically during or after page load.

```html
<div class="unicorn-embed" id="unicorn"></div>
<script>
  UnicornStudio.addScene({
    elementId: "unicorn", // id of the HTML element to render your scene in (the scene will use its dimensions)
    fps: 60, // frames per second (0-120) [optional]
    scale: 1, // rendering scale, use smaller values for performance boost (0.25-1) [optional]
    dpi: 1.5, // pixel ratio [optional]
    projectId: "YOUR_PROJECT_EMBED_ID", // the id string for your embed (get this from "embed" export)
    lazyLoad: true, // will not initialize the scene until it scrolls into view
    fixed: false, // whether the scene should behave like a fixed element or not. automatic by default but this gives explicit control
    altText: "Welcome to Unicorn Studio", // optional text for SEO, going inside the <canvas> tag
    ariaLabel: "This is a canvas scene", // optional text for the aria-label attribute on the <canvas> element
    production: false, // when true, will hit the global edge CDN, learn more in the help docs
    initialVariables: {
      brandColor: "#7c3aed",
      intensity: 0.65,
    },
    interactivity: {
      // [optional]
      mouse: {
        disableMobile: false, // disable touch movement on mobile
        disabled: false // disable all mouse interaction
      },
    },
    breakpoints: [ // use custom breakpoint min/max values
      { name: 'Desktop', max: Infinity, min: 992 },
      { name: 'Tablet',  max: 991, min: 576 },
      { name: 'Mobile',  max: 575, min: 0 },
    ],
  })
    .then((scene) => {
      // scene is ready
      // To remove a scene, you can use:
      // scene.destroy()

      // if the scenes container changes size and you need to resize the scene
      // scene.resize()

      // if you need to pause the scene
      // scene.paused = true;

      // if you need to resume the scene
      // scene.paused = false;

      // hide a layer
      // scene.getLayer("layerIdOrName")?.hide();

      // show a layer
      // scene.getLayer("layerIdOrName")?.show();
    })
    .catch((err) => {
      console.error(err);
    });
</script>
```

Any values set in the UI will be overridden by values defined in the optional params.

Use either `projectId` or `filePath`, not both. `projectId` loads a published Unicorn Studio embed. `filePath` loads a self-hosted exported JSON file.

## Destroy all scenes:

If you're using UnicornStudio in a SPA with dynamic routing, make sure to destroy them on unmount.

```js
UnicornStudio.destroy();
```

## Embed parameters

Inline embeds use `data-us-[param]` attributes. Dynamic scenes pass the same values as `addScene()` options.

- `data-us-project`: published scene project ID.
- `data-us-project-src`: path to a hosted project JSON file.
- `data-us-scale`: canvas rendering scale, usually `0.25` to `1`.
- `data-us-dpi`: scene resolution, usually `1` to `1.5`.
- `data-us-fps`: target render loop FPS.
- `data-us-lazyload`: defers resource creation until the scene enters the viewport.
- `data-us-production`: serves scene data from the production CDN and improves caching.
- `data-us-disablemobile`: disables mobile mouse or touch movement.
- `data-us-disablemouse`: disables mouse interaction.
- `data-us-fixed`: makes the scene behave like a fixed element.
- `data-us-alttext`: SEO text placed inside the canvas.
- `data-us-arialabel`: accessibility label applied to the canvas.
- `data-us-vars`: JSON object of initial variable values.
- `data-us-preset`: initial preset name or ID.
- `data-us-controls`: shows the built-in runtime controls panel.

The container element must have defined width and height. Scenes use the container dimensions when they initialize.

## Runtime control

The safest runtime control path is:

1. Use `scene.setVariable()` when the scene exposes an authored variable.
2. Inspect `scene.getVariableManifest()` before guessing variable names or types.
3. Inspect `scene.getLayers()` before using direct layer controls.
4. Use `scene.setProp()` only when there is no authored variable for the layer property.
5. Use `scene.setTexture()` only for texture sampler replacement.
6. Recreate the scene only for structural changes that the runtime API cannot express.

Runtime precedence for a property is:

```text
authored base value -> breakpoint value -> variable/runtime override -> active event animation
```

### Variables

Variables are authored in Unicorn Studio and published with the scene. Use them for stable integration points such as brand colors, theme values, CMS image or video URLs, numeric effect intensity, motion speed, boolean toggles, text-like strings, and values shared across multiple layers.

```js
scene.setVariable("brandColor", "#ff4fd8");
scene.setVariable("intensity", 0.9);
scene.setVariables({
  brandColor: "#4f46e5",
  intensity: 0.4,
});
```

Read variable values and definitions:

```js
const brandColor = scene.getVariable("brandColor");
const allValues = scene.getVariables();
const definition = scene.getVariableDefinition("brandColor");
const definitions = scene.getVariableDefinitions();
const manifest = scene.getVariableManifest();
```

Listen for variable changes:

```js
const unsubscribe = scene.onVariableChange((name, value, values) => {
  console.log("Variable changed:", name, value, values);
});

unsubscribe();
```

Common variable types are `number`, `boolean`, `string`, `color`, `vec2`, `vec3`, and `texture`. Color variables should usually be hex strings. Vector variables should include the vector type:

```js
scene.setVariable("position", { type: "Vec2", x: 0.5, y: 0.35 });
scene.setVariable("direction", { type: "Vec3", x: 0.2, y: 0.8, z: 0.1 });
```

### Presets

Presets are named snapshots of variable values. They let a creator publish curated looks like `Brand Dark`, `Brand Light`, or `High Contrast` without asking a host page to set every variable by hand.

Use presets when you want to expose known scene states, theme variants, campaign variants, or content sets. Use individual variables when the host page needs fine-grained control after a preset has been applied.

Create presets from the Variables panel in the editor. A preset stores the current values for published variables, and it is included with the scene the next time you publish.

The built-in runtime controls panel shows a preset dropdown automatically when the published scene includes presets:

```html
<div
  data-us-project="YOUR_PROJECT_EMBED_ID"
  data-us-controls
></div>
```

The dropdown applies presets with `scene.setPreset()` and then updates the visible variable controls to match the selected values.

#### Set an initial preset

Use `data-us-preset` for declarative embeds:

```html
<div
  data-us-project="YOUR_PROJECT_EMBED_ID"
  data-us-preset="Brand Dark"
></div>
```

If you create scenes in JavaScript, pass `initialPreset` to `UnicornStudio.addScene()`.

```js
const scene = await UnicornStudio.addScene({
  projectId: "YOUR_PROJECT_EMBED_ID",
  element: document.querySelector("#unicorn"),
  initialPreset: "Brand Dark",
});
```

You can also apply a preset to all published scenes on a page using the `preset` query parameter:

```text
https://example.com/page?preset=Brand%20Dark
```

Initial preset precedence is:

```text
initialPreset -> data-us-preset -> ?preset=
```

Presets apply before `initialVariables` / `data-us-vars`, so explicit variable values can override preset values on load.

```html
<div
  data-us-project="YOUR_PROJECT_EMBED_ID"
  data-us-preset="Brand Dark"
  data-us-vars='{"headline":"Launch Week"}'
></div>
```

In this example, the scene starts from the `Brand Dark` preset, then overrides only the `headline` variable.

#### Use presets at runtime

At runtime, use the scene preset APIs:

```js
const presets = scene.getPresets();
const preset = scene.getPreset("Brand Dark");

if (preset) {
  scene.setPreset(preset.id);
}
```

Preset lookup accepts the published preset name or preset id. Preset names are friendlier for hand-authored integrations; ids are better when building a UI from `scene.getPresets()`.

You can still override individual values after applying a preset:

```js
scene.setPreset("Brand Dark");
scene.setVariable("headline", "Launch Week");
scene.setVariable("accentColor", "#ff4fd8");
```

`scene.setPreset()` updates the scene immediately, returns the scene instance, and notifies `scene.onVariableChange()` listeners for each variable changed by the preset.

### Inspecting layers

Use `getLayers()` only when there is no suitable variable and you need to identify a layer for direct control.

```js
const layers = scene.getLayers();
console.table(layers);
```

Layer descriptors contain `id`, `publicId`, `name`, and `type`. Published layer `id` values are stable canonical IDs. `publicId` is the optional human-readable alias derived from layer names or layer types. Direct layer controls accept either value, but prefer `id` for durable integrations.

Use `scene.getLayer(idOrName)` when you need the runtime layer object for methods such as `hide()` and `show()`.

### Direct layer controls

Use direct controls when a scene was not authored with variables or when building an internal tool.

```js
scene.setProp("beam", "opacity", 0.5);
scene.setTexture("distortionLayer", "uTexture", "https://example.com/displacement.png");

const layer = scene.getLayer("mobileOnlyImage");
layer?.hide();
layer?.show();
```

`setProp()`, `setTexture()`, `hide()`, and `show()` update the live scene only. They do not rewrite the published scene JSON and do not persist after the scene is destroyed.

## Performance and production

Unicorn Studio scenes render as WebGL compositions. Runtime integration code cannot rewrite the scene's internal shader graph, but it can control loading, resolution, frame rate, visibility, and scene lifecycle.

Use these knobs before building custom performance logic:

- `scale`: lowers canvas rendering scale. `0.25` to `1` is the useful range.
- `dpi`: controls scene resolution. Start around `1` to `1.5`; higher values look sharper but cost more.
- `fps`: sets the render loop target. `30` or `60` is usually enough.
- `lazyLoad`: delays initialization until viewport entry.
- `production`: serves scene data from the production CDN and improves caching.

The SDK owns its render loop, visibility gating, resize handling, page visibility handling, and global passive mouse/touch listeners. Use `scene.resize()` manually only after app-driven layout changes that may not trigger a window resize, such as opening a panel or changing a container's CSS size.

Good runtime mitigations:

- Enable `lazyLoad` for scenes below the fold.
- Use `production` for live embeds.
- Lower `scale`, `dpi`, or `fps` for ambient or background scenes.
- Prefer smaller scene containers over fullscreen canvases when the design allows it.
- Destroy scenes on route unmount instead of hiding them indefinitely.
- Avoid more than 10 scenes on one page; browsers commonly cap WebGL contexts around 16.

Production updates may take 1-2 minutes to propagate through the CDN. To bypass cached project data during development or QA, use an update query parameter:

```html
<div data-us-project="YOUR_PROJECT_ID?update=1.0.1"></div>
```

## Debugging

Start with variables:

```js
console.table(scene.getVariableManifest());
console.log(scene.getVariables());
```

Then inspect layers:

```js
console.table(scene.getLayers());
```

If `setVariable()` does nothing, confirm the variable name exists, the variable has at least one binding, the value type matches the variable type, and the published scene includes the variable and its binding.

If `setProp()` does nothing, confirm the layer ID exists and the property is a live runtime uniform or runtime-supported layer property. Prefer a published variable if you need reliable public control.

## Public API reference

The `UnicornStudio` object supports:

```js
UnicornStudio.init();
UnicornStudio.addScene(options);
UnicornStudio.destroy();
UnicornStudio.setScroll(scrollY);
UnicornStudio.useNativeScroll();
```

Common `addScene()` options:

- `element` or `elementId`
- `projectId` or `filePath`
- `initialVariables`
- `initialPreset`
- `fps`
- `scale`
- `dpi`
- `lazyLoad`
- `fixed`
- `altText`
- `ariaLabel`
- `production`
- `interactivity.mouse.disableMobile`
- `interactivity.mouse.disabled`
- `breakpoints`

The scene object supports:

```js
scene.resize();
scene.destroy();
scene.paused = true;
scene.paused = false;

scene.setVariable(name, value);
scene.setVariables(values);
scene.getVariable(name);
scene.getVariables();
scene.getVariableDefinition(name);
scene.getVariableDefinitions();
scene.getVariableManifest();
scene.onVariableChange(callback);

scene.getPresets();
scene.getPreset(nameOrId);
scene.setPreset(nameOrId);

scene.setProp(layerIdOrName, prop, value);
scene.setTexture(layerIdOrName, samplerName, value);
scene.getLayers();
scene.getLayer(layerIdOrName);
```

Layer objects returned by `scene.getLayer()` support:

```js
layer.hide();
layer.show();

// Model layers only:
modelLayer.onLoad(callback);
```

## React/Next
See [this repo](https://github.com/diegopeixoto/unicornstudio-react) for a great react/next npm package. 

## Live example

https://codepen.io/georgehastings/pen/ExGrqMJ


# Changelog
## v2.2.1
- Adds support for presets

## v2.2.0
- Adds support for variables

## v2.1.12
- Video playback bugfix
- Adds support for text links
- Adds new virtual scroll manager to better support libraries like Lenis

`UnicornStudio.setScroll(scrollY);`

When this is used, Unicorn Studio uses the supplied virtual scroll value for scene visibility and scroll-based animations instead of reading native window.scrollY. This helps on sites where smooth scroll libraries move the page with transforms and native scroll position no longer reflects the visual page position.

To return to normal browser scroll tracking:

`UnicornStudio.useNativeScroll();`

### Lenis Example

```
const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
lenis.on('scroll', ({ scroll }) => {
  UnicornStudio.setScroll(scroll);
});
requestAnimationFrame(raf);
```

### After SDK Init

```
UnicornStudio.init().then(() => {
  const lenis = new Lenis();
  lenis.on('scroll', ({ scroll }) => {
    UnicornStudio.setScroll(scroll);
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
});
```

### Cleanup

If your app destroys or disables the virtual scroller:

`UnicornStudio.useNativeScroll();`

This clears the virtual scroll override and resumes using:

`window.scrollY || window.pageYOffset`

## v2.1.11
- Fixes 
  - text rotation when animated rotation is 0
  - uCustomTexture using the GPU texture from the render target, 
  - framebuffer blit when WebGL blit isn't available.
- Improves frame pacing (precise ms intervals, immediate first frame, drift correction).
- Aligns FlattenedGroup texture locals with flattening; shader effects can use `type: 'video'` in data.textures for video samplers.

## v2.1.10
- Version skipped (no release).

## v2.1.9
- Support for light color animation in 3d models
- Support for models with baked in animations

## v2.1.8
- Fixes buggy dynamic toggling behavior for 3D model layers.

## v2.1.6
- Adds support for dynamic layer toggling at runtime (e.g. hide layers on Mobile breakpoint). 
- Adds new layer methods `hide` and `show`.
- Improves mask flattening and allows masks to use different layer depths per breakpoint.
- Adds user-defined breakpoint min/max ranges so layouts switch at the screen sizes you choose.
- Fixes a flipped x axis rotation tracking bug for 3D models.
- Fixes a bug where "clip to parent" did not work as expected.

## v2.1.5
- Fixes visible aliasing issues with Fresnel light with glass mode 3D models
- Fixes bugs related to video texture loading and FlattenedGroups

## v2.1.4
- Adds support for HTML only text rendering. If a text layer is on the top and does not need to composite with the shader, it will render as html, simplifying the shader and improving performance.
- Bugfixes to FlattenedGroup texture cache and mouse value handling

## v2.1.3
- Fixes a bug with 3D model rendering missing methods

## v2.1.2
- Fixes a bug with flattened text layer resizing
- Fixes a mouse trail quality precision issue with PingPong plane textures

## v2.1.1
- Supports the "spring" paramter for mouse interactivity 
- Adds a few new spring easing curves for Appear and Hover events.
- Makes 3D models flattenable and adds support for transmissive textures.
- Fixed a bug where video layers wouldn't play as expected. 

## v2.1.0
- Introduces FlattenedGroups! This supports the new flattening optimization feature.
- Deprecates string easing functions to remove the eval (new Function). This was a security issue with Shopify templates.
- Adds matcap support to 3D models
- Huge tree shake reduces filesize by 30%
- Various performance improvements and enhancements.

## v2.0.5
- Fixes a bug in previous version where 3d model layers would break if they were the top layer
- Adds "element" hover to 3d models
- Adds "proximity" mode to mousemove event
- Fixes a bug where mousemove didn't count as dynamic, preventing interactivity in some cases

## v2.0.4
- Adds mousemove event support
- Adds frame caching support
- Fixes a bug where multiple event animations competed for the same frame value
- Fixes a bug where multiple 3d Models could flip the Y axis of the rest of the scene

## v2.0.3
- Fixes a bug with 3D model scenes rendering below the fold
- Fixes a scrollinh mouse tracking sync bug / scroll event accuracy bug
- Fixes a bug where opacity events didn't work with 3D models

## v2.0.2
- Fixes a few bugs related to event animations limited to certain breakpoints

## v2.0.1
- Fixes a bug where event animation transitions weren't being correctly applied

## v2.0.0
- **This is a breaking change if upgraded without republishing a live scene**
- Supports shader only rendering for Image and Shape layers
- Various improvements and optimizations

## v1.5.3
- Adds support for mask layer depth

## v1.5.2
- Introduces the Model class!
- Bugfixes and optimizations

## v1.4.36
- Fixes a bug that caused unexpected resizing when the canvas is affected by CSS transforms
- Fixes a bug that didn't allow appear animations to complete to the final frame

## v1.4.35
- Fixes a stretching bug caused by certain effects when the background layer is hidden

## v1.4.34
- Events work for video playback speed now
- No longer rounds element position to whole pixel numbers

## v1.4.33
- Fixes positioning bug with track mouse x/y controls
- Stability improvements

## v1.4.32
- Cancels raf properly when all scenes are destroyed
- Adds support for disabling text-as-html

## v1.4.31
- Fixes bug when background layer is hidden
- Removes curtains log

## v1.4.30
- Adds mouse axis control
- Framework for additional easing functions
- Minor performance optimizations

## v1.4.29
- Adds control for video looping
- Adds control for video playback speed

## v1.4.28
- Adds looping functionality for appear events
- Adds a disable parameter `data-us-disablemouse` for mouse interactivity that can be used dynamically
- Fixes a bug where 0 speed effects would still animate

## v1.4.27
- Fixes a bug where appear effects on Element layers wouldn't properly initialize

## v1.4.27
- Fixes a bug where appear effects on Element layers wouldn't properly initialize

## v1.4.26
- Fixes a bug with texture handling of shared textures
- Eliminated cases of redundant texture loading
- Fixed a bug handling fontCSS.src being undefined

## v1.4.25
- Enables momentum for mouse trail effects (light, mouse, ripple)
- More mouse perf optimizations

## v1.4.24
- Fixes a bug with texture handling for multipass child effects

## v1.4.23
- Fixes a bug where mouse tracking would get offset when moved while scrolling
- Adds "fixed" param to declaratively make a scene fixed with data-us-fixed

## v1.4.22
- Child effect rendertarget bugfix
- Improved caching and mouse tracking performance

## v1.4.21
- Continues text rendering even if font fails to load
- Fixes bug with effects that use canvas as uBgTexture twice
- Fixes bug where rotation animations didnt work for text elements
- Adds the "scene.paused" parameter to pause the scene
- Minor optimizations

## v1.4.20
- Fixes texture stretch bug when background is hidden and an element is the first layer

## v1.4.19
- Much more efficient downsampling logic in plane initialization
- Created vertices by accident for noise and sine effects
- No longer creates a shader program for hidden background layers

## v1.4.18
- Fixed a bug with handling multi-pass child effects like water ripple
- Minor optimizations

## v1.4.17
- Removed a code check that automatically throttled scene quality by checking for low end devices or GPUs. At best it likely had little positive impact and at worst it thew false positives in certain browsers and high end mobile devices.  
- Fixed a bug that broke user downsapling for element layers

## v1.4.14
- Fixes an image texture handling bug 

## v1.4.13
- Fixes a downsampling bug from the previous release

## v1.4.12
- Corrected unecessary texture creation in multipass planes
- Fixed a bug that prevented planes from being downsampled correctly
- Fixed a bug that didn't remove text when using scene.destroy()
- Fixed a texture loading race condition bug

## v1.4.11
- Fixed a texture handling bug when using multiple effects with blue noise
- Fixed some inconsistency with font weights

## v1.4.10
- Added the changelog to the README
- Fixed a texture bug with mouse effects as child effects

## v.1.4.9
- scene.destroy() now removes canvas element as this is the expected behavior
- fixes a bug where some element properties were not responsive to breakpoints
- fixes a bug where some effect properties did not respond to events
- fixes some bugs with appear events when scenes are scroll away / tabbed away mid animation

## v1.4.8
- Fixed a bug when resizing mouse trail effects
- Fixed a bug where videos would pause after the tab was inactive for awhile
- Other minor bugfixes

## v1.4.7
- Added breakpoint control for events

## v1.4.6
- Fixed a bug that prevented effects from getting responsiveness updates after initial pageload
- Fixed a bug where isFixed scenes mouse tracking was wrong

## v1.4.5
- Added flexibility for future pingpong effects
- Bugfix for scene.destroy()

## v1.4.4
- Scene resizing is now way more responsive and way less memory intensive
- New texture preloading logic for faster load times
- Overall performance enhancements

## v1.4.3
- Scene resizing is now way more responsive and way less memory intensive
- New texture preloading logic for faster load times
- Overall performance enhancements

## v.1.4.2
- Handles hover events for hovering over the elements themselves
- Performance enhancements

## v1.4.1
- This release adds events to all element layers (Images/Shapes/Text)
- Adds support for handling videos
- Stability improvements

# License

Copyright © 2026 Unicorn Studio (UNCRN LLC)

Permission is granted to use this software only for integration with legitimate Unicorn Studio projects. The source code is made available for transparency and to facilitate integration, but remains proprietary.

Unauthorized uses include but are not limited to:
1. Using this software in any way that violates Unicorn Studio's Terms of Service
2. Creating derivative works not approved by Unicorn Studio
3. Using this software with non-Unicorn Studio projects
4. Reverse engineering this software to recreate Unicorn Studio functionality
5. Removing or altering any license, copyright, watermark, or other proprietary notices

This license is subject to termination if violated. All rights not explicitly granted are reserved.
