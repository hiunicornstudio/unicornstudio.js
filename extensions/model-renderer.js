import { THREE, GLTFLoader, SVGLoader } from './three-bundle.js';

const gltfLoader = new GLTFLoader();
const svgLoader = new SVGLoader();
const textureLoader = new THREE.TextureLoader();
const normalsMaterial = new THREE.MeshNormalMaterial();

const layerStates = new WeakMap();

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
      customColorMap: null,
    });
  }
  return layerStates.get(layer);
}

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

function createSVGMeshes(paths, extrudeSettings, layer) {
  const group = new THREE.Group();
  
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const fillColor = path.userData.style.fill;

    if (fillColor !== undefined && fillColor !== 'none') {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setStyle(fillColor),
        metalness: layer.getProp('materialMetalness') ?? 0.5,
        roughness: layer.getProp('materialRoughness') ?? 0.5,
        side: THREE.DoubleSide
      });

      const shapes = SVGLoader.createShapes(path);

      for (let j = 0; j < shapes.length; j++) {
        const shape = shapes[j];
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Calculate UVs based on shape bounds
        const posAttribute = geometry.attributes.position;
        const uvAttribute = geometry.attributes.uv;
        
        // Compute bounding box of the geometry
        geometry.computeBoundingBox();
        const min = geometry.boundingBox.min;
        const max = geometry.boundingBox.max;
        const rangeX = max.x - min.x;
        const rangeY = max.y - min.y;
        
        const updateUVs = (start, count, isSide) => {
          for (let k = start; k < start + count; k++) {
            let idx = k;
            if (geometry.index) {
              idx = geometry.index.getX(k);
            }

            if (!isSide) {
              const x = posAttribute.getX(idx);
              const y = posAttribute.getY(idx);
              uvAttribute.setXY(idx, (x - min.x) / rangeX, (y - min.y) / rangeY);
            } else {
              const u = uvAttribute.getX(idx);
              const v = uvAttribute.getY(idx);
              const scale = 1 / Math.max(rangeX, rangeY);
              uvAttribute.setXY(idx, u * scale, v * scale);
            }
          }
        };

        if (geometry.groups && geometry.groups.length > 0) {
          geometry.groups.forEach(g => {
            updateUVs(g.start, g.count, g.materialIndex === 1);
          });
        } else {
          updateUVs(0, geometry.index ? geometry.index.count : posAttribute.count, false);
        }
        uvAttribute.needsUpdate = true;

        // Scale mesh Y to flip coordinate system (SVG is y-down, Three.js is y-up)
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(1, -1, 1);
        group.add(mesh);
      }
    }
  }
  
  return group;
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

  const ambientLightColor = layer.getProp('ambientLightColor');
  const ambientLightIntensity = layer.getProp('ambientLightIntensity');
  const lightColor = layer.getProp('lightColor');
  const lightIntensity = layer.getProp('lightIntensity');
  const fillLightColor = layer.getProp('fillLightColor');
  const fillLightIntensity = layer.getProp('fillLightIntensity');
  const lightPosition = layer.getProp('lightPosition');

  state.ambientLight = new THREE.AmbientLight(ambientLightColor || '#777777', (ambientLightIntensity ?? 0.75) * 2);
  state.scene.add(state.ambientLight);

  state.directionalLight = new THREE.DirectionalLight(lightColor || '#777777', (lightIntensity ?? 0.2) * 5 * 2);
  state.scene.add(state.directionalLight);

  state.fillLight = new THREE.DirectionalLight(fillLightColor || '#777777', (fillLightIntensity ?? 0.2) * 5 * 2);
  state.scene.add(state.fillLight);

  const worldX = (lightPosition.x - 0.5) * 10;
  const worldY = (lightPosition.y - 0.5) * 10;
  const worldZ = (lightPosition.z - 0.5) * 10;
  if (state.directionalLight) state.directionalLight.position.set(worldX, -worldY, worldZ);
  if (state.fillLight) state.fillLight.position.set(-worldX * 0.8, worldY * 0.8, -worldZ * 0.8);
}

export function loadModel(layer) {
  const state = getState(layer);
  
  // Reset loading flags
  layer.local.modelLoaded = false;
  layer.local.modelLoading = false;
  
  const isSVG = layer.modelUrl.split('?')[0].toLowerCase().endsWith('.svg');

  if (isSVG) {
    svgLoader.load(
      layer.modelUrl,
      (data) => {
        const paths = data.paths;
        const extrudeSettings = {
          depth: layer.getProp('extrudeDepth') ?? 10,
          bevelEnabled: layer.getProp('bevelEnabled') ?? false,
          bevelThickness: layer.getProp('bevelThickness') ?? 1,
          bevelSize: layer.getProp('bevelSize') ?? 1,
          bevelSegments: layer.getProp('bevelSegments') ?? 2
        };
        const group = createSVGMeshes(paths, extrudeSettings, layer);

        state.model = group;
        state.model.userData.isSVG = true;
        state.model.userData.svgPaths = paths;

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
        state.model.userData.isSVGWrapper = true;

        state.model.userData.materials = [];
        state.model.userData.textureMaterials = [];
        state.model.userData.meshes = [];
        
        state.model.traverse((child) => {
          if (child.isMesh) {
            state.model.userData.meshes.push(child);
            state.model.userData.materials.push(child.material);
            state.model.userData.textureMaterials.push(child.material);
            
            if (!child.material.userData) child.material.userData = {};
            child.material.userData.originalMap = null;
            child.material.userData.originalNormalMap = null;
          }
        });

        if (layer.renderNormals && state.model.userData.meshes) {
          state.model.userData.meshes.forEach(child => {
            if (!child.userData.originalMaterial) {
              child.userData.originalMaterial = child.material;
              child.material = normalsMaterial;
            }
          });
        }

        if (layer.colorMapUrl?.trim() && !layer.renderNormals) {
          loadTextureWithSettings(layer.colorMapUrl, false).then(tex => {
            const scale = Math.max(0.001, layer.getProp('colorMapScale') ?? 1);
            applyTextureToMaterials(state, tex, scale, layer.getProp('colorMapPosition'), 'map');
            state.customColorMap = tex;
          });
        }

        if (layer.normalMapUrl?.trim() && !layer.renderNormals) {
          loadTextureWithSettings(layer.normalMapUrl, false, true).then(tex => {
            const scale = Math.max(0.001, layer.getProp('normalMapScale') ?? 1);
            applyTextureToMaterials(state, tex, scale, layer.getProp('normalMapPosition'), 'normalMap', layer.getProp('normalMapIntensity'));
            state.customNormalMap = tex;
          });
        }

        if (state.customEnvMap && layer.environmentMapIntensity > 0) {
          applyEnvMapToMaterials(state, state.customEnvMap, layer.environmentMapIntensity);
        }

        state.scene.add(state.model);
        layer.handleModelLoaded();
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('An error occurred while loading the SVG:', error);
        layer.local.modelLoading = false;
      }
    );
  } else {
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
          const materialMetalness = layer.getProp('materialMetalness');
          const materialRoughness = layer.getProp('materialRoughness');

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
              m.metalness = materialMetalness ?? m.metalness;
            }
            if (m.roughness !== undefined) {
              if (m.roughnessMap) { m.roughnessMap = null; m.needsUpdate = true; }
              m.roughness = materialRoughness ?? m.roughness;
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
          state.customColorMap = tex;
          applyTextureToMaterials(state, tex, Math.max(0.001, layer.getProp('colorMapScale')), layer.getProp('colorMapPosition'), 'map');
        });
      }

      if (layer.normalMapUrl && !layer.renderNormals) {
        loadTextureWithSettings(layer.normalMapUrl, false, true).then(tex => {
          state.customNormalMap = tex;
          applyTextureToMaterials(state, tex, Math.max(0.001, layer.getProp('normalMapScale')), layer.getProp('normalMapPosition'), 'normalMap', layer.getProp('normalMapIntensity'));
        });
      }
      const environmentMapIntensity = layer.getProp('environmentMapIntensity');
      if (environmentMapIntensity > 0 && layer.environmentMapUrl?.trim()) {
        loadTextureWithSettings(layer.environmentMapUrl, true).then(tex => {
          state.customEnvMap = tex;
          applyEnvMapToMaterials(state, state.customEnvMap, environmentMapIntensity);
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
  }
  
  layer.local.modelLoading = true;
}

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

  const environmentMapIntensity = layer.getProp('environmentMapIntensity');

  if (environmentMapIntensity > 0 && !layer.environmentMapUrl?.trim()) {
    const envTexture = layer.local.envTexture;
    const intensityChanged = state.model?.userData.lastEnvMapIntensity !== environmentMapIntensity;
    
    if (envTexture && (intensityChanged || !state.envMap)) {
      updateEnvMapFromWebGL(
        state,
        envTexture.gl,
        envTexture.webglTexture,
        envTexture.width,
        envTexture.height,
        environmentMapIntensity
      );
    }
  }

  let mouseX = 0, mouseY = 0, mouseRotX = 0, mouseRotY = 0, mouseLightX = 0, mouseLightY = 0;

  const trackMouse = layer.getProp('trackMouse');
  const rotationTracking = layer.getProp('rotationTracking');
  const lightTracking = layer.getProp('lightTracking');

  if (trackMouse != 0 || rotationTracking != 0 || lightTracking != 0) {
    const mouse = layer.local.mouse || { x: 0.5, y: 0.5 };
    const mouseOffsetX = mouse.x - 0.5;
    const mouseOffsetY = mouse.y - 0.5;

    if (trackMouse != 0) {
      mouseX = mouseOffsetX * trackMouse;
      mouseY = -mouseOffsetY * trackMouse;
    }
    if (rotationTracking != 0) {
      mouseRotX = -mouseOffsetY * rotationTracking;
      mouseRotY = -mouseOffsetX * rotationTracking;
    }
    if (lightTracking != 0) {
      mouseLightX = mouseOffsetX * lightTracking;
      mouseLightY = -mouseOffsetY * lightTracking;
    }
  }

  if (!state.camera.userData.dim) state.camera.userData.dim = {};
  if (state.camera.userData.dim.w !== w || state.camera.userData.dim.h !== h) {
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h, false);
    state.camera.userData.dim = { w, h };
  }

  const lp = state.scene.userData.lp = state.scene.userData.lp || {};
  const ambientLightIntensity = layer.getProp('ambientLightIntensity');
  const ambientLightColor = layer.getProp('ambientLightColor');
  const lightIntensity = layer.getProp('lightIntensity');
  const lightColor = layer.getProp('lightColor');
  const fillLightIntensity = layer.getProp('fillLightIntensity');
  const fillLightColor = layer.getProp('fillLightColor');
  
  if (state.ambientLight && (lp.ai !== ambientLightIntensity || lp.ac !== ambientLightColor)) {
    if (lp.ai !== ambientLightIntensity) state.ambientLight.intensity = (ambientLightIntensity ?? 0.75) * 2;
    if (lp.ac !== ambientLightColor) state.ambientLight.color.set(ambientLightColor || '#777777');
    lp.ai = ambientLightIntensity;
    lp.ac = ambientLightColor;
  }

  if (state.directionalLight && (lp.li !== lightIntensity || lp.lc !== lightColor)) {
    state.directionalLight.intensity = (lightIntensity ?? 0.2) * 5 * 2;
    state.directionalLight.color.set(lightColor || '#777777');
    lp.li = lightIntensity;
    lp.lc = lightColor;
  }
  
  if (state.fillLight && (lp.fli !== fillLightIntensity || lp.flc !== fillLightColor)) {
    state.fillLight.intensity = (fillLightIntensity ?? 0.2) * 5 * 2;
    state.fillLight.color.set(fillLightColor || '#777777');
    lp.fli = fillLightIntensity;
    lp.flc = fillLightColor;
  }

  const lightPosition = layer.getProp('lightPosition');
  const hasLightTracking = lightTracking != 0;
  
  if (state.directionalLight && lightPosition && (hasLightTracking || lp.lx !== lightPosition.x || lp.ly !== lightPosition.y || lp.lz !== lightPosition.z)) {
    const wx = (lightPosition.x + mouseLightX - 0.5) * 10;
    const wy = (lightPosition.y + mouseLightY - 0.5) * 10;
    const wz = (lightPosition.z - 0.5) * 10;
    state.directionalLight.position.set(wx, -wy, wz);
    state.fillLight.position.set(-wx * 0.8, wy * 0.8, -wz * 0.8);
    if (!hasLightTracking) {
      lp.lx = lightPosition.x;
      lp.ly = lightPosition.y;
      lp.lz = lightPosition.z;
    }
  }

  if (state.model) {
    const mp = state.model.userData.mp = state.model.userData.mp || {};
    
    const materialMetalness = layer.getProp('materialMetalness');
    const materialRoughness = layer.getProp('materialRoughness');
    
    if (mp.mm !== materialMetalness || mp.mr !== materialRoughness) {
      state.model.userData.materials?.forEach(m => {
        if (mp.mm !== materialMetalness && m.metalness !== undefined) {
          if (m.metalnessMap) { m.metalnessMap = null; m.needsUpdate = true; }
          m.metalness = materialMetalness;
        }
        if (mp.mr !== materialRoughness && m.roughness !== undefined) {
          if (m.roughnessMap) { m.roughnessMap = null; m.needsUpdate = true; }
          m.roughness = materialRoughness;
        }
      });
      mp.mm = materialMetalness;
      mp.mr = materialRoughness;
    }

    const colorMapScale = layer.getProp('colorMapScale');
    const colorMapPosition = layer.getProp('colorMapPosition');
    if (state.customColorMap && !layer.renderNormals && 
        (mp.cms !== colorMapScale || mp.cmpx !== colorMapPosition?.x || mp.cmpy !== colorMapPosition?.y)) {
      const scale = Math.max(0.001, colorMapScale);
      state.customColorMap.repeat.setScalar(scale);
      const offset = -(scale - 1) / 2;
      const posX = (colorMapPosition?.x ?? 0.5) - 0.5;
      const posY = (colorMapPosition?.y ?? 0.5) - 0.5;
      state.customColorMap.offset.set(offset + posX, offset + posY);
      state.model.userData.materials?.forEach(m => {
        if (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial) {
          m.needsUpdate = true;
        }
      });
      mp.cms = colorMapScale;
      mp.cmpx = colorMapPosition?.x;
      mp.cmpy = colorMapPosition?.y;
    }

    const normalMapScale = layer.getProp('normalMapScale');
    const normalMapPosition = layer.getProp('normalMapPosition');
    const normalMapIntensity = layer.getProp('normalMapIntensity');
    if (state.customNormalMap && !layer.renderNormals && 
        (mp.nms !== normalMapScale || mp.nmpx !== normalMapPosition?.x || mp.nmpy !== normalMapPosition?.y || mp.nmi !== normalMapIntensity)) {
      const scale = Math.max(0.001, normalMapScale);
      state.customNormalMap.repeat.setScalar(scale);
      const offset = -(scale - 1) / 2;
      const posX = (normalMapPosition?.x ?? 0.5) - 0.5;
      const posY = (normalMapPosition?.y ?? 0.5) - 0.5;
      state.customNormalMap.offset.set(offset + posX, offset + posY);
      const intensity = normalMapIntensity ?? 1;
      state.model.userData.materials?.forEach(m => {
        if (m.normalMap !== undefined && m.normalScale) {
          m.normalScale.set(intensity, -intensity);
          m.needsUpdate = true;
        }
      });
      mp.nms = normalMapScale;
      mp.nmpx = normalMapPosition?.x;
      mp.nmpy = normalMapPosition?.y;
      mp.nmi = normalMapIntensity;
    }

    if (state.customEnvMap && mp.emi !== environmentMapIntensity) {
      applyEnvMapToMaterials(state, state.customEnvMap, environmentMapIntensity);
      mp.emi = environmentMapIntensity;
    }

    const baseScale = state.model.userData.baseScale || 1;
    const pos = layer.getProp('pos');
    const scale = layer.getProp('scale');
    
    if (mp.s !== scale) {
      const s = scale * 10 * baseScale;
      state.model.scale.set(s, s, s);
      mp.s = scale;
    }

    const hasMouse = mouseX !== 0 || mouseY !== 0;
    if (pos && (hasMouse || mp.px !== pos.x || mp.py !== pos.y || mp.pz !== pos.z)) {
      const ox = (pos.x - 0.5 + mouseX) * 8;
      const oy = (pos.y - 0.5 + mouseY) * 8;
      const oz = (pos.z - 0.5) * 8;
      state.model.position.set(ox, -oy, oz);
      if (!hasMouse) {
        mp.px = pos.x;
        mp.py = pos.y;
        mp.pz = pos.z;
      }
    }

    const modelRotation = layer.getProp('modelRotation');
    const speed = layer.getProp('speed');
    const animationAxis = layer.getProp('animationAxis');
    const hasRotMouse = mouseRotX !== 0 || mouseRotY !== 0;
    const hasAnim = speed > 0 && layer.animating;
    
    if (modelRotation && (hasRotMouse || hasAnim || mp.rx !== modelRotation.x || mp.ry !== modelRotation.y || mp.rz !== modelRotation.z)) {
      let rx = (modelRotation.y - 0.5 + mouseRotX) * Math.PI * 2 + Math.PI;
      let ryOffset = state.model.userData.isSVGWrapper ? Math.PI : 0;
      let ry = (modelRotation.x - 0.5 + mouseRotY) * Math.PI * 2 + ryOffset;
      let rz = (modelRotation.z - 0.5) * Math.PI * 2;
      if (hasAnim) {
        const rs = speed * t * 0.001;
        if (animationAxis.x > 0) rx += rs * animationAxis.x;
        if (animationAxis.y > 0) ry += rs * animationAxis.y;
        if (animationAxis.z > 0) rz += rs * animationAxis.z;
      }
      state.model.rotation.set(rx, ry, rz);
      if (!hasRotMouse && !hasAnim) {
        mp.rx = modelRotation.x;
        mp.ry = modelRotation.y;
        mp.rz = modelRotation.z;
      }
    }
  }

  state.renderer.render(state.scene, state.camera);
  if (state.renderer.resetState) state.renderer.resetState();
}

export function dispose(layer) {
  const state = getState(layer);
  
  if (state.customColorMap) {
    state.customColorMap.dispose();
    state.customColorMap = null;
  }
  
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
  
  layerStates.delete(layer);
}
