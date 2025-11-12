// Model Renderer - Production Version
// Optimized renderer without property change tracking (properties assumed to change via state effects only)
import { THREE, GLTFLoader } from './three-bundle.js';

// Shared loaders (can be reused across instances)
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const normalsMaterial = new THREE.MeshNormalMaterial();

// Store Three.js state per layer using WeakMap to avoid Vue reactivity issues
const layerStates = new WeakMap();

// Helper to get state from layer (each layer gets its own isolated Three.js state)
function getState(layer) {
  if (!layerStates.has(layer)) {
    layerStates.set(layer, {
      scene: null,
      camera: null,
      renderer: null,
      model: null,
      ambientLight: null,
      directionalLight: null,
      fillLight: null,
      customNormalMap: null,
      customEnvMap: null,
      envMap: null,
    });
  }
  return layerStates.get(layer);
}

// Helper functions
function convertToPBR(m) {
  const n = new THREE.MeshStandardMaterial();
  n.color.copy(m.color);
  n.map = m.map;
  n.normalMap = m.normalMap;
  n.emissiveMap = m.emissiveMap;
  n.aoMap = m.aoMap;
  n.emissive.copy(m.emissive || new THREE.Color(0, 0, 0));
  n.opacity = m.opacity ?? 1;
  n.transparent = m.transparent ?? false;
  n.side = m.side ?? THREE.FrontSide;
  if (!m.userData) m.userData = {};
  n.userData = m.userData;
  n.userData.converted = true;
  return n;
}

function applyQualitySettings(state, isHigh) {
  if (!state.renderer) return;
  state.renderer.toneMapping = isHigh ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  state.renderer.toneMappingExposure = isHigh ? 1.5 : 1.0;
  state.renderer.physicallyCorrectLights = isHigh;
}

function loadTextureWithSettings(url, isEnvMap = false, isNormalMap = false) {
  return new Promise((resolve) => {
    textureLoader.load(url, (tex) => {
      if (isEnvMap) {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
      } else {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = true;
      }
      resolve(tex);
    });
  });
}

function applyTextureToMaterials(state, tex, scale, position, mapType = 'map', normalIntensity = 1) {
  tex.repeat.setScalar(scale);
  const offset = -(scale - 1) / 2;
  const posX = (position?.x ?? 0.5) - 0.5;
  const posY = (position?.y ?? 0.5) - 0.5;
  tex.offset.set(offset + posX, offset + posY);
  state.model.traverse((child) => {
    if (child.isMesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial) {
          if (mapType === 'map') {
            m.map = tex;
          } else if (mapType === 'normalMap' && m.normalMap !== undefined) {
            m.normalMap = tex;
            if (m.normalScale) {
              m.normalScale.set(normalIntensity, -normalIntensity);
            }
          }
          m.needsUpdate = true;
        }
      });
    }
  });
}

function applyEnvMapToMaterials(state, envTexture, intensity) {
  if (!envTexture || !state.model) return;
  
  state.model.userData.materials?.forEach(m => {
    if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
      m.envMap = envTexture;
      m.envMapIntensity = intensity;
      m.needsUpdate = true;
    }
  });
}

function updateEnvMapFromWebGL(state, gl, webglTexture, width, height, intensity) {
  if (!webglTexture || !gl) {
    state.model?.userData.materials?.forEach(m => {
      if (m.envMap) {
        m.envMap = null;
        m.needsUpdate = true;
      }
    });
    return;
  }
  
  if (!state.envMap) {
    state.envMap = new THREE.Texture();
    state.envMap.mapping = THREE.EquirectangularReflectionMapping;
    state.envMap.colorSpace = THREE.SRGBColorSpace;
    state.envMap.minFilter = THREE.LinearFilter;
    state.envMap.magFilter = THREE.LinearFilter;
    state.envMap.generateMipmaps = false;
    state.envMap.flipY = false;
    state.envMap.image = { width, height };
    
    const props = state.renderer.properties.get(state.envMap);
    props.__webglTexture = webglTexture;
    props.__webglInit = true;
    
    const info = state.renderer.info.memory;
    if (info) info.textures++;
    
    applyEnvMapToMaterials(state, state.envMap, intensity);
  } else if (state.model.userData.lastEnvMapIntensity !== intensity) {
    state.model.userData.materials?.forEach(m => {
      if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
        m.envMapIntensity = intensity;
      }
    });
    state.model.userData.lastEnvMapIntensity = intensity;
  }
}

// Exported functions
export function initialize(ctx, layer) {
  const state = getState(layer);
  const w = ctx.canvas ? ctx.canvas.width : ctx.drawingBufferWidth;
  const h = ctx.canvas ? ctx.canvas.height : ctx.drawingBufferHeight;
  if (w === 0 || h === 0) return;

  state.scene = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
  state.camera.position.set(0, 0, 5);

  state.renderer = new THREE.WebGLRenderer({
    canvas: ctx.canvas,
    context: ctx,
    alpha: true,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    logarithmicDepthBuffer: true,
    antialias: layer.quality === 'high'
  });
  state.renderer.setClearColor(0x000000, 0);
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  applyQualitySettings(state, layer.quality === 'high');
  state.renderer.setPixelRatio(1);
  state.renderer.setSize(w, h, false);

  state.ambientLight = new THREE.AmbientLight(layer.ambientLightColor || '#ffffff', (layer.ambientLightIntensity ?? 0.75) * 2);
  state.scene.add(state.ambientLight);

  state.directionalLight = new THREE.DirectionalLight(layer.lightColor || '#ffffff', (layer.lightIntensity ?? 0.2) * 5 * 2);
  state.scene.add(state.directionalLight);

  state.fillLight = new THREE.DirectionalLight(layer.fillLightColor || '#ffffff', (layer.fillLightIntensity ?? 0.2) * 5 * 2);
  state.scene.add(state.fillLight);

  if (layer.lightPosition) {
    const worldX = (layer.lightPosition.x - 0.5) * 10;
    const worldY = (layer.lightPosition.y - 0.5) * 10;
    const worldZ = (layer.lightPosition.z - 0.5) * 10;
    if (state.directionalLight) state.directionalLight.position.set(worldX, -worldY, worldZ);
    if (state.fillLight) state.fillLight.position.set(-worldX * 0.8, worldY * 0.8, -worldZ * 0.8);
  }
}

export function loadModel(layer) {
  const state = getState(layer);
  
  gltfLoader.load(
    layer.modelUrl,
    (gltf) => {
      state.model = gltf.scene;

      const box = new THREE.Box3().setFromObject(state.model);
      const center = box.getCenter(new THREE.Vector3());
      state.model.position.copy(center).multiplyScalar(-1);

      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const baseScale = maxDim > 0 ? 1 / maxDim : 1;
      const modelGroup = new THREE.Group();
      modelGroup.add(state.model);
      state.model = modelGroup;
      state.model.userData.baseScale = baseScale;

      state.model.userData.materials = [];
      state.model.traverse((child) => {
        if (child.isMesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m, idx) => {
            if ((m.isMeshPhongMaterial || m.isMeshLambertMaterial) && !m.userData?.converted) {
              const newMat = convertToPBR(m);
              if (Array.isArray(child.material)) {
                child.material[idx] = newMat;
              } else {
                child.material = newMat;
              }
              m = newMat;
            }
            state.model.userData.materials.push(m);
            if (m.metalness !== undefined) {
              if (m.metalnessMap) { m.metalnessMap = null; m.needsUpdate = true; }
              m.metalness = layer.materialMetalness ?? m.metalness;
            }
            if (m.roughness !== undefined) {
              if (m.roughnessMap) { m.roughnessMap = null; m.needsUpdate = true; }
              m.roughness = layer.materialRoughness ?? m.roughness;
            }
            if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
              m.envMapIntensity = m.envMapIntensity ?? 1.0;
            }
          });
          
          if (layer.renderNormals) {
            child.material = normalsMaterial;
          }
        }
      });

      if (layer.colorMapUrl && !layer.renderNormals) {
        state.model.traverse((child) => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => {
              if (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial) {
                m.map = null;
                m.needsUpdate = true;
              }
            });
          }
        });
        loadTextureWithSettings(layer.colorMapUrl, false).then(tex => {
          applyTextureToMaterials(state, tex, Math.max(0.001, layer.colorMapScale || 1), layer.colorMapPosition, 'map');
        });
      }

      if (layer.normalMapUrl && !layer.renderNormals) {
        loadTextureWithSettings(layer.normalMapUrl, false, true).then(tex => {
          applyTextureToMaterials(state, tex, Math.max(0.001, layer.normalMapScale || 1), layer.normalMapPosition, 'normalMap', layer.normalMapIntensity ?? 1);
        });
      }

      if (layer.environmentMapIntensity > 0 && layer.environmentMapUrl?.trim()) {
        loadTextureWithSettings(layer.environmentMapUrl, true).then(tex => {
          state.customEnvMap = tex;
          applyEnvMapToMaterials(state, state.customEnvMap, layer.environmentMapIntensity);
        });
      }

      state.scene.add(state.model);
      layer.handleModelLoaded();
    },
    undefined,
    (error) => {
      console.error('An error occurred while loading the model:', error);
    }
  );
  
  // Mark as loading started (prevents re-triggering load)
  layer.local.modelLoading = true;
}

// Check if model is currently loading
export function isLoading(layer) {
  return layer.local.modelLoading && !layer.local.modelLoaded;
}

export function draw(ctx, t, layer) {
  const state = getState(layer);
  if (!layer.local.modelLoaded) return;

  if (!state.renderer || !state.renderer.getContext() || state.renderer.getContext().isContextLost()) {
    console.warn('Three.js renderer context lost, reinitializing...');
    layer.local.initialized = false;
    return;
  }

  const w = ctx.canvas ? ctx.canvas.width : ctx.drawingBufferWidth;
  const h = ctx.canvas ? ctx.canvas.height : ctx.drawingBufferHeight;
  if (w === 0 || h === 0) return;

  // Update env map from render target if available and not using custom URL
  if (layer.environmentMapIntensity > 0 && !layer.environmentMapUrl?.trim()) {
    const envTexture = layer.local.envTexture;
    const intensityChanged = state.model?.userData.lastEnvMapIntensity !== layer.environmentMapIntensity;
    
    if (envTexture && (intensityChanged || !state.envMap)) {
      updateEnvMapFromWebGL(
        state,
        envTexture.gl,
        envTexture.webglTexture,
        envTexture.width,
        envTexture.height,
        layer.environmentMapIntensity
      );
    }
  }

  let mouseX = 0, mouseY = 0, mouseRotX = 0, mouseRotY = 0, mouseLightX = 0, mouseLightY = 0;

  if (layer.trackMouse != 0 || layer.rotationTracking != 0 || layer.lightTracking != 0) {
    const mouse = layer.local.mouse || { x: 0.5, y: 0.5 };
    const mouseOffsetX = mouse.x - 0.5;
    const mouseOffsetY = mouse.y - 0.5;

    if (layer.trackMouse != 0) {
      mouseX = mouseOffsetX * layer.trackMouse;
      mouseY = -mouseOffsetY * layer.trackMouse;
    }
    if (layer.rotationTracking != 0) {
      mouseRotX = -mouseOffsetY * layer.rotationTracking;
      mouseRotY = -mouseOffsetX * layer.rotationTracking;
    }
    if (layer.lightTracking != 0) {
      mouseLightX = mouseOffsetX * layer.lightTracking;
      mouseLightY = -mouseOffsetY * layer.lightTracking;
    }
  }

  if (!state.camera.userData.dim) state.camera.userData.dim = {};
  if (state.camera.userData.dim.w !== w || state.camera.userData.dim.h !== h) {
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h, false);
    state.camera.userData.dim = { w, h };
  }

  if (state.directionalLight && layer.lightTracking != 0 && layer.lightPosition) {
    const wx = (layer.lightPosition.x + mouseLightX - 0.5) * 10;
    const wy = (layer.lightPosition.y + mouseLightY - 0.5) * 10;
    const wz = (layer.lightPosition.z - 0.5) * 10;
    state.directionalLight.position.set(wx, -wy, wz);
    state.fillLight.position.set(-wx * 0.8, wy * 0.8, -wz * 0.8);
  }

  if (state.model) {
    const baseScale = state.model.userData.baseScale || 1;
    const pos = layer.getProp('pos');
    const scale = layer.getProp('scale');
    const s = scale * 10 * baseScale;
    state.model.scale.set(s, s, s);

    if (pos) {
      const ox = (pos.x - 0.5 + mouseX) * 8;
      const oy = (pos.y - 0.5 + mouseY) * 8;
      const oz = (pos.z - 0.5) * 8;
      state.model.position.set(ox, -oy, oz);
    }

    const modelRotation = layer.getProp('modelRotation');
    if (modelRotation) {
      const hasAnim = layer.speed > 0 && layer.animating;
      let rx = (modelRotation.y - 1 + mouseRotX) * Math.PI * 2;
      let ry = (modelRotation.x - 0.75 + mouseRotY) * Math.PI * 2;
      let rz = (modelRotation.z - 0.5) * Math.PI * 2;
      if (hasAnim) {
        const rs = layer.speed * t * 0.001;
        if (layer.animationAxis.x > 0) rx += rs * layer.animationAxis.x;
        if (layer.animationAxis.y > 0) ry += rs * layer.animationAxis.y;
        if (layer.animationAxis.z > 0) rz += rs * layer.animationAxis.z;
      }
      state.model.rotation.set(rx, ry, rz);
    }
  }

  state.renderer.render(state.scene, state.camera);
  if (state.renderer.resetState) state.renderer.resetState();
}

export function dispose(layer) {
  const state = getState(layer);
  
  if (state.customNormalMap) {
    state.customNormalMap.dispose();
    state.customNormalMap = null;
  }
  
  if (state.customEnvMap) {
    state.customEnvMap.dispose();
    state.customEnvMap = null;
  }
  
  if (state.envMap) {
    state.envMap.dispose();
    state.envMap = null;
  }
  
  if (state.model) {
    state.model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    if (state.scene) state.scene.remove(state.model);
    state.model = null;
  }
  
  if (state.renderer) {
    state.renderer.dispose();
    state.renderer = null;
  }
  
  state.scene = null;
  state.camera = null;
  state.ambientLight = null;
  state.directionalLight = null;
  state.fillLight = null;
  
  // Remove from WeakMap
  layerStates.delete(layer);
}
