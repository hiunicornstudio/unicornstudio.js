
class UnicornStudioEmbed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.scene = null; // Initialize a property to store the scene reference
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    this.initializeUnicornStudio();
  }

  // Called when the element is removed from the DOM
  disconnectedCallback() {
    // If we have a scene reference, destroy it to clean up
    if (this.scene && typeof this.scene.destroy === "function") {
      this.scene.destroy();
    }
  }

  // Ensure that the document head is available and then load the Unicorn Studio script
  loadUnicornStudioScript() {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"]'
      );

      if (existingScript) {
        if (window.UnicornStudio) {
          resolve();
        } else {
          existingScript.addEventListener("load", resolve);
          existingScript.addEventListener("error", reject);
        }
      } else {
        const appendScriptToHead = () => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.20/dist/unicornStudio.umd.js";
          script.onload = () => {
            resolve();
          };
          script.onerror = () => {
            console.error("Error loading Unicorn Studio script.");
            reject();
          };
          document.head.appendChild(script); // Append the script to the head
        };

        // Check if the head exists or if it's not ready, wait for the document to load
        if (document.head) {
          appendScriptToHead();
        } else {
          document.addEventListener("DOMContentLoaded", appendScriptToHead);
        }
      }
    });
  }

  // Initialize the Unicorn Studio scene inside the custom element
  initializeUnicornStudio() {
    this.loadUnicornStudioScript()
      .then(() => {
        if (
          window.UnicornStudio &&
          typeof window.UnicornStudio.addScene === "function"
        ) {
          const projectId =
            this.getAttribute("project-id") || "YOUR_PROJECT_EMBED_ID";
          const dpi = this.getAttribute("dpi") || 1.5;
          const scale = this.getAttribute("scale") || 1;
          const lazyLoad = this.getAttribute("lazy-load") === "true";
          const altText =
            this.getAttribute("alt-text") || "Welcome to Unicorn Studio";
          const ariaLabel =
            this.getAttribute("aria-label") || "This is a canvas scene";

          // Create a div container for the Unicorn scene and append it to the Shadow DOM
          const container = document.createElement("div");
          container.classList.add("unicorn-embed");
          container.style.width = "100%";
          container.style.height = "100%";
          this.shadowRoot.appendChild(container);

          // Directly pass the container element node as 'element'
          UnicornStudio.addScene({
            element: container, // Pass the container DOM node directly using 'element'
            projectId, // Project ID from attribute
            dpi, // DPI setting
            scale, // Scale setting
            lazyLoad, // Lazy load option
            altText, // Alt text for SEO
            ariaLabel, // Aria label for accessibility
          })
            .then((scene) => {
              this.scene = scene; // Store the scene reference for later cleanup
            })
            .catch((err) => {
              console.error("Error loading Unicorn Studio scene:", err);
            });
        } else {
          console.error(
            "Unicorn Studio is not available or addScene is not a function"
          );
        }
      })
      .catch((err) => {
        console.error("Error loading Unicorn Studio script:", err);
      });
  }
}

// Define the custom element
customElements.define("unicorn-studio-embed", UnicornStudioEmbed);
