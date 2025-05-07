# Embed your Unicorn Studio projects

## Include the script

Add the script tag to the `<head>` of your page

```html
<script src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.20/dist/unicornStudio.umd.js"></script>
```

or import into your component

```js
import * as UnicornStudio from "./path/to/unicornStudio.umd.js";
```

## Initialize your scene:

### Inline

Any element with `data-us-project` will get initialized by calling `UnicornStudio.init()`. If you're hosting your own exported JSON file, use `data-us-project-src` to point to its location. You do not need both `data-us-project` and `data-us-project-src`. If you host your own JSON, remembder you'll need to update this file when you make changes to your scene in Unicorn.studio.

```html
<div
  class="unicorn-embed"
  data-us-project="YOUR_PROJECT_EMBED_ID"
  data-us-project-src="path/to/your/PROJECT_ID.json (if you're using this, do not use data-us-project)"
  data-us-scale="1"
  data-us-dpi="1.5"
  data-us-lazyload="true"
  data-us-disablemobile="true"
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

### Dynamically

You can add a scene dynamically during or after pageload.

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
    filePath: "path/to/your/PROJECT_ID.json", // if youre hosting your own exported json code, point to it here (do not use both filePath and projectId, only one is required)
    altText: "Welcome to Unicorn Studio", // optional text for SEO, going inside the <canvas> tag
    ariaLabel: "This is a canvas scene", // optional text for the aria-label attribute on the <canvas> element
    production: false // when true, will hit the global edge CDN, learn more in the help docs
    interactivity: {
      // [optional]
      mouse: {
        disableMobile: true, // disable touch movement on mobile
      },
    },
  })
    .then((scene) => {
      // scene is ready
      // To remove a scene, you can use:
      // scene.destroy()

      // if the scenes container changes size and you need to resize the scene
      // scene.resize()
    })
    .catch((err) => {
      console.error(err);
    });
</script>
```

Any values set in the UI will be overridden by values defined in the optional params.

## Destroy all scenes:

If you're using UnicornStudio in a SPA with dynamic routing, make sure to destroy them on unmount.

```js
UnicornStudio.destroy();
```

## Live example

https://codepen.io/georgehastings/pen/ExGrqMJ


# Changelog
v1.4.20
- Fixes texture stretch bug when background is hidden and an element is the first layer

v1.4.19
- Much more efficient downsampling logic in plane initialization
- Created vertices by accident for noise and sine effects
- No longer creates a shader program for hidden background layers

v1.4.18
- Fixed a bug with handling multi-pass child effects like water ripple
- Minor optimizations

v1.4.17
- Removed a code check that automatically throttled scene quality by checking for low end devices or GPUs. At best it likely had little positive impact and at worst it thew false positives in certain browsers and high end mobile devices.  
- Fixed a bug that broke user downsapling for element layers

v1.4.14
- Fixes an image texture handling bug 

v1.4.13
- Fixes a downsampling bug from the previous release

v1.4.12
- Corrected unecessary texture creation in multipass planes
- Fixed a bug that prevented planes from being downsampled correctly
- Fixed a bug that didn't remove text when using scene.destroy()
- Fixed a texture loading race condition bug

v1.4.11
- Fixed a texture handling bug when using multiple effects with blue noise
- Fixed some inconsistency with font weights

v1.4.10
- Added the changelog to the README
- Fixed a texture bug with mouse effects as child effects

v.1.4.9
- scene.destroy() now removes canvas element as this is the expected behavior
- fixes a bug where some element properties were not responsive to breakpoints
- fixes a bug where some effect properties did not respond to events
- fixes some bugs with appear events when scenes are scroll away / tabbed away mid animation

v1.4.8
- Fixed a bug when resizing mouse trail effects
- Fixed a bug where videos would pause after the tab was inactive for awhile
- Other minor bugfixes

v1.4.7
- Added breakpoint control for events

v1.4.6
- Fixed a bug that prevented effects from getting responsiveness updates after initial pageload
- Fixed a bug where isFixed scenes mouse tracking was wrong

v1.4.5
- Added flexibility for future pingpong effects
- Bugfix for scene.destroy()

v1.4.4
- Scene resizing is now way more responsive and way less memory intensive
- New texture preloading logic for faster load times
- Overall performance enhancements

v1.4.3
- Scene resizing is now way more responsive and way less memory intensive
- New texture preloading logic for faster load times
- Overall performance enhancements

v.1.4.2
- Handles hover events for hovering over the elements themselves
- Performance enhancements

v1.4.1
- This release adds events to all element layers (Images/Shapes/Text)
- Adds support for handling videos
- Stability improvements

## License

Copyright © 2025 Unicorn Studio (UNCRN LLC)

Permission is granted to use this software only for integration with legitimate Unicorn Studio projects. The source code is made available for transparency and to facilitate integration, but remains proprietary.

Unauthorized uses include but are not limited to:
1. Using this software in any way that violates Unicorn Studio's Terms of Service
2. Creating derivative works not approved by Unicorn Studio
3. Using this software with non-Unicorn Studio projects
4. Reverse engineering this software to recreate Unicorn Studio functionality
5. Removing or altering any license, copyright, watermark, or other proprietary notices

This license is subject to termination if violated. All rights not explicitly granted are reserved.
