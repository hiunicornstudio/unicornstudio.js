# Embed your Unicorn Studio projects

## Include the script

Add the script tag to the `<head>` of your page

```html
<script src=https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.1/dist/unicornStudio.umd.js"></script>
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
  data-us-disableMobile="true"
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
    dpi: 1, // pixel ratio [optional]
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
