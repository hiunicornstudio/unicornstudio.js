import { GLTFLoader as le, SVGLoader as re, THREE as l } from "./three-bundle.js";
const ce = new le(), pe = new re(), me = new l.TextureLoader(), se = new l.MeshNormalMaterial(), O = /* @__PURE__ */ new WeakMap();
function _(e) {
  return O.has(e) || O.set(e, {
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
    customColorMap: null
  }), O.get(e);
}
function ue(e) {
  const t = new l.MeshStandardMaterial();
  return t.color.copy(e.color), t.map = e.map, t.normalMap = e.normalMap, t.emissiveMap = e.emissiveMap, t.aoMap = e.aoMap, t.emissive.copy(e.emissive || new l.Color(0, 0, 0)), t.opacity = e.opacity ?? 1, t.transparent = e.transparent ?? !1, t.side = e.side ?? l.FrontSide, e.userData || (e.userData = {}), t.userData = e.userData, t.userData.converted = !0, t;
}
function de(e, t) {
  e.renderer && (e.renderer.toneMapping = t ? l.ACESFilmicToneMapping : l.NoToneMapping, e.renderer.toneMappingExposure = t ? 1.5 : 1, e.renderer.physicallyCorrectLights = t);
}
function W(e, t = !1, n = !1) {
  return new Promise((a) => {
    me.load(e, (i) => {
      t ? (i.mapping = l.EquirectangularReflectionMapping, i.colorSpace = l.SRGBColorSpace, i.minFilter = l.LinearFilter, i.magFilter = l.LinearFilter, i.generateMipmaps = !1) : (i.wrapS = i.wrapT = l.RepeatWrapping, i.flipY = !0), a(i);
    });
  });
}
function j(e, t, n, a, i = "map", f = 1, d = 1) {
  t.repeat.setScalar(n);
  const v = -(n - 1) / 2, x = ((a == null ? void 0 : a.x) ?? 0.5) - 0.5, p = ((a == null ? void 0 : a.y) ?? 0.5) - 0.5;
  t.offset.set(v + x, v + p), e.model.traverse((M) => {
    M.isMesh && (Array.isArray(M.material) ? M.material : [M.material]).forEach((r) => {
      (r.isMeshStandardMaterial || r.isMeshPhongMaterial || r.isMeshLambertMaterial) && (i === "map" ? (r.map = t, r.color && r.color.setScalar(d)) : i === "normalMap" && r.normalMap !== void 0 && (r.normalMap = t, r.normalScale && r.normalScale.set(f, -f)), r.needsUpdate = !0);
    });
  });
}
function q(e, t, n) {
  var a;
  !t || !e.model || (a = e.model.userData.materials) == null || a.forEach((i) => {
    (i.isMeshStandardMaterial || i.isMeshPhysicalMaterial) && (i.envMap = t, i.envMapIntensity = n, i.needsUpdate = !0);
  });
}
function ge(e, t, n) {
  const a = new l.Group();
  for (let i = 0; i < e.length; i++) {
    const f = e[i], d = f.userData.style.fill;
    if (d !== void 0 && d !== "none") {
      const v = new l.MeshStandardMaterial({
        color: new l.Color().setStyle(d),
        metalness: n.getProp("materialMetalness") ?? 0.5,
        roughness: n.getProp("materialRoughness") ?? 0.5,
        side: l.DoubleSide
      }), x = re.createShapes(f);
      for (let p = 0; p < x.length; p++) {
        const M = x[p], m = new l.ExtrudeGeometry(M, t), r = m.attributes.position, h = m.attributes.uv;
        m.computeBoundingBox();
        const g = m.boundingBox.min, c = m.boundingBox.max, o = c.x - g.x, w = c.y - g.y, I = (z, X, V) => {
          for (let P = z; P < z + X; P++) {
            let U = P;
            if (m.index && (U = m.index.getX(P)), V) {
              const R = h.getX(U), B = h.getY(U), k = 1 / Math.max(o, w);
              h.setXY(U, R * k, B * k);
            } else {
              const R = r.getX(U), B = r.getY(U);
              h.setXY(U, (R - g.x) / o, (B - g.y) / w);
            }
          }
        };
        m.groups && m.groups.length > 0 ? m.groups.forEach((z) => {
          I(z.start, z.count, z.materialIndex === 1);
        }) : I(0, m.index ? m.index.count : r.count, !1), h.needsUpdate = !0;
        const E = new l.Mesh(m, v);
        E.scale.set(1, -1, 1), a.add(E);
      }
    }
  }
  return a;
}
function fe(e, t, n, a, i, f) {
  var d, v, x;
  if (!n || !t) {
    (v = (d = e.model) == null ? void 0 : d.userData.materials) == null || v.forEach((p) => {
      p.envMap && (p.envMap = null, p.needsUpdate = !0);
    });
    return;
  }
  if (e.envMap)
    e.model.userData.lastEnvMapIntensity !== f && ((x = e.model.userData.materials) == null || x.forEach((p) => {
      (p.isMeshStandardMaterial || p.isMeshPhysicalMaterial) && (p.envMapIntensity = f);
    }), e.model.userData.lastEnvMapIntensity = f);
  else {
    e.envMap = new l.Texture(), e.envMap.mapping = l.EquirectangularReflectionMapping, e.envMap.colorSpace = l.SRGBColorSpace, e.envMap.minFilter = l.LinearFilter, e.envMap.magFilter = l.LinearFilter, e.envMap.generateMipmaps = !1, e.envMap.flipY = !1, e.envMap.image = { width: a, height: i };
    const p = e.renderer.properties.get(e.envMap);
    p.__webglTexture = n, p.__webglInit = !0;
    const M = e.renderer.info.memory;
    M && M.textures++, q(e, e.envMap, f);
  }
}
function he(e, t) {
  const n = _(t), a = e.canvas ? e.canvas.width : e.drawingBufferWidth, i = e.canvas ? e.canvas.height : e.drawingBufferHeight;
  if (a === 0 || i === 0) return;
  n.scene = new l.Scene(), n.camera = new l.PerspectiveCamera(35, a / i, 0.1, 100), n.camera.position.set(0, 0, 5), n.renderer = new l.WebGLRenderer({
    canvas: e.canvas,
    context: e,
    alpha: !0,
    preserveDrawingBuffer: !1,
    premultipliedAlpha: !0,
    logarithmicDepthBuffer: !0,
    antialias: t.quality === "high"
  }), n.renderer.setClearColor(0, 0), n.renderer.outputColorSpace = l.SRGBColorSpace, de(n, t.quality === "high"), n.renderer.setPixelRatio(1), n.renderer.setSize(a, i, !1);
  const f = t.getProp("ambientLightColor"), d = t.getProp("ambientLightIntensity"), v = t.getProp("lightColor"), x = t.getProp("lightIntensity"), p = t.getProp("fillLightColor"), M = t.getProp("fillLightIntensity"), m = t.getProp("lightPosition");
  n.ambientLight = new l.AmbientLight(f || "#777777", (d ?? 0.75) * 2), n.scene.add(n.ambientLight), n.directionalLight = new l.DirectionalLight(v || "#777777", (x ?? 0.2) * 5 * 2), n.scene.add(n.directionalLight), n.fillLight = new l.DirectionalLight(p || "#777777", (M ?? 0.2) * 5 * 2), n.scene.add(n.fillLight);
  const r = (m.x - 0.5) * 10, h = (m.y - 0.5) * 10, g = (m.z - 0.5) * 10;
  n.directionalLight && n.directionalLight.position.set(r, -h, g), n.fillLight && n.fillLight.position.set(-r * 0.8, h * 0.8, -g * 0.8);
}
function ve(e) {
  const t = _(e);
  e.local.modelLoaded = !1, e.local.modelLoading = !1, e.modelUrl.split("?")[0].toLowerCase().endsWith(".svg") ? pe.load(
    e.modelUrl,
    (a) => {
      var h, g;
      const i = a.paths, f = {
        depth: e.getProp("extrudeDepth") ?? 10,
        bevelEnabled: e.getProp("bevelEnabled") ?? !1,
        bevelThickness: e.getProp("bevelThickness") ?? 1,
        bevelSize: e.getProp("bevelSize") ?? 1,
        bevelSegments: e.getProp("bevelSegments") ?? 2
      }, d = ge(i, f, e);
      t.model = d, t.model.userData.isSVG = !0, t.model.userData.svgPaths = i;
      const v = new l.Box3().setFromObject(t.model), x = v.getCenter(new l.Vector3());
      t.model.position.copy(x).multiplyScalar(-1);
      const p = v.getSize(new l.Vector3()), M = Math.max(p.x, p.y, p.z), m = M > 0 ? 1 / M : 1, r = new l.Group();
      r.add(t.model), t.model = r, t.model.userData.baseScale = m, t.model.userData.isSVGWrapper = !0, t.model.userData.materials = [], t.model.userData.textureMaterials = [], t.model.userData.meshes = [], t.model.traverse((c) => {
        c.isMesh && (t.model.userData.meshes.push(c), t.model.userData.materials.push(c.material), t.model.userData.textureMaterials.push(c.material), c.material.userData || (c.material.userData = {}), c.material.userData.originalMap = null, c.material.userData.originalNormalMap = null);
      }), e.renderNormals && t.model.userData.meshes && t.model.userData.meshes.forEach((c) => {
        c.userData.originalMaterial || (c.userData.originalMaterial = c.material, c.material = se);
      }), (h = e.colorMapUrl) != null && h.trim() && !e.renderNormals && W(e.colorMapUrl, !1).then((c) => {
        const o = Math.max(1e-3, e.getProp("colorMapScale") ?? 1), w = e.getProp("colorMapIntensity") ?? 1;
        j(t, c, o, e.getProp("colorMapPosition"), "map", 1, w), t.customColorMap = c;
      }), (g = e.normalMapUrl) != null && g.trim() && !e.renderNormals && W(e.normalMapUrl, !1, !0).then((c) => {
        const o = Math.max(1e-3, e.getProp("normalMapScale") ?? 1);
        j(t, c, o, e.getProp("normalMapPosition"), "normalMap", e.getProp("normalMapIntensity")), t.customNormalMap = c;
      }), t.customEnvMap && e.environmentMapIntensity > 0 && q(t, t.customEnvMap, e.environmentMapIntensity), t.scene.add(t.model), e.handleModelLoaded();
    },
    (a) => {
      console.log(a.loaded / a.total * 100 + "% loaded");
    },
    (a) => {
      console.error("An error occurred while loading the SVG:", a), e.local.modelLoading = !1;
    }
  ) : ce.load(
    e.modelUrl,
    (a) => {
      var m;
      t.model = a.scene;
      const i = new l.Box3().setFromObject(t.model), f = i.getCenter(new l.Vector3());
      t.model.position.copy(f).multiplyScalar(-1);
      const d = i.getSize(new l.Vector3()), v = Math.max(d.x, d.y, d.z), x = v > 0 ? 1 / v : 1, p = new l.Group();
      p.add(t.model), t.model = p, t.model.userData.baseScale = x, t.model.userData.materials = [], t.model.traverse((r) => {
        if (r.isMesh) {
          const h = Array.isArray(r.material) ? r.material : [r.material], g = e.getProp("materialMetalness"), c = e.getProp("materialRoughness");
          h.forEach((o, w) => {
            var I;
            if ((o.isMeshPhongMaterial || o.isMeshLambertMaterial) && !((I = o.userData) != null && I.converted)) {
              const E = ue(o);
              Array.isArray(r.material) ? r.material[w] = E : r.material = E, o = E;
            }
            t.model.userData.materials.push(o), o.metalness !== void 0 && (o.metalnessMap && (o.metalnessMap = null, o.needsUpdate = !0), o.metalness = g ?? o.metalness), o.roughness !== void 0 && (o.roughnessMap && (o.roughnessMap = null, o.needsUpdate = !0), o.roughness = c ?? o.roughness), (o.isMeshStandardMaterial || o.isMeshPhysicalMaterial) && (o.envMapIntensity = o.envMapIntensity ?? 1);
          }), e.renderNormals && (r.material = se);
        }
      }), e.colorMapUrl && !e.renderNormals && (t.model.traverse((r) => {
        r.isMesh && (Array.isArray(r.material) ? r.material : [r.material]).forEach((g) => {
          (g.isMeshStandardMaterial || g.isMeshPhongMaterial || g.isMeshLambertMaterial) && (g.map = null, g.needsUpdate = !0);
        });
      }), W(e.colorMapUrl, !1).then((r) => {
        t.customColorMap = r;
        const h = e.getProp("colorMapIntensity") ?? 1;
        j(t, r, Math.max(1e-3, e.getProp("colorMapScale")), e.getProp("colorMapPosition"), "map", 1, h);
      })), e.normalMapUrl && !e.renderNormals && W(e.normalMapUrl, !1, !0).then((r) => {
        t.customNormalMap = r, j(t, r, Math.max(1e-3, e.getProp("normalMapScale")), e.getProp("normalMapPosition"), "normalMap", e.getProp("normalMapIntensity"));
      });
      const M = e.getProp("environmentMapIntensity");
      M > 0 && ((m = e.environmentMapUrl) != null && m.trim()) && W(e.environmentMapUrl, !0).then((r) => {
        t.customEnvMap = r, q(t, t.customEnvMap, M);
      }), t.scene.add(t.model), e.handleModelLoaded();
    },
    void 0,
    (a) => {
      console.error("An error occurred while loading the model:", a);
    }
  ), e.local.modelLoading = !0;
}
function Le(e) {
  return e.local.modelLoading && !e.local.modelLoaded;
}
function Se(e, t, n) {
  var R, B, k, ee, te;
  const a = _(n);
  if (!n.local.modelLoaded) return;
  if (!a.renderer || !a.renderer.getContext() || a.renderer.getContext().isContextLost()) {
    console.warn("Three.js renderer context lost, reinitializing..."), n.local.initialized = !1;
    return;
  }
  const i = e.canvas ? e.canvas.width : e.drawingBufferWidth, f = e.canvas ? e.canvas.height : e.drawingBufferHeight;
  if (i === 0 || f === 0) return;
  const d = n.getProp("environmentMapIntensity");
  if (d > 0 && !((R = n.environmentMapUrl) != null && R.trim())) {
    const s = n.local.envTexture, D = ((B = a.model) == null ? void 0 : B.userData.lastEnvMapIntensity) !== d;
    s && (D || !a.envMap) && fe(
      a,
      s.gl,
      s.webglTexture,
      s.width,
      s.height,
      d
    );
  }
  let v = 0, x = 0, p = 0, M = 0, m = 0, r = 0;
  const h = n.getProp("trackMouse"), g = n.getProp("rotationTracking"), c = n.getProp("lightTracking");
  if (h != 0 || g != 0 || c != 0) {
    const s = n.local.mouse || { x: 0.5, y: 0.5 }, D = s.x - 0.5, b = s.y - 0.5;
    h != 0 && (v = D * h, x = -b * h), g != 0 && (p = -b * g, M = -D * g), c != 0 && (m = D * c, r = -b * c);
  }
  a.camera.userData.dim || (a.camera.userData.dim = {}), (a.camera.userData.dim.w !== i || a.camera.userData.dim.h !== f) && (a.camera.aspect = i / f, a.camera.updateProjectionMatrix(), a.renderer.setSize(i, f, !1), a.camera.userData.dim = { w: i, h: f });
  const o = a.scene.userData.lp = a.scene.userData.lp || {}, w = n.getProp("ambientLightIntensity"), I = n.getProp("ambientLightColor"), E = n.getProp("lightIntensity"), z = n.getProp("lightColor"), X = n.getProp("fillLightIntensity"), V = n.getProp("fillLightColor");
  a.ambientLight && (o.ai !== w || o.ac !== I) && (o.ai !== w && (a.ambientLight.intensity = (w ?? 0.75) * 2), o.ac !== I && a.ambientLight.color.set(I || "#777777"), o.ai = w, o.ac = I), a.directionalLight && (o.li !== E || o.lc !== z) && (a.directionalLight.intensity = (E ?? 0.2) * 5 * 2, a.directionalLight.color.set(z || "#777777"), o.li = E, o.lc = z), a.fillLight && (o.fli !== X || o.flc !== V) && (a.fillLight.intensity = (X ?? 0.2) * 5 * 2, a.fillLight.color.set(V || "#777777"), o.fli = X, o.flc = V);
  const P = n.getProp("lightPosition"), U = c != 0;
  if (a.directionalLight && P && (U || o.lx !== P.x || o.ly !== P.y || o.lz !== P.z)) {
    const s = (P.x + m - 0.5) * 10, D = (P.y + r - 0.5) * 10, b = (P.z - 0.5) * 10;
    a.directionalLight.position.set(s, -D, b), a.fillLight.position.set(-s * 0.8, D * 0.8, -b * 0.8), U || (o.lx = P.x, o.ly = P.y, o.lz = P.z);
  }
  if (a.model) {
    const s = a.model.userData.mp = a.model.userData.mp || {}, D = n.getProp("materialMetalness"), b = n.getProp("materialRoughness");
    (s.mm !== D || s.mr !== b) && ((k = a.model.userData.materials) == null || k.forEach((u) => {
      s.mm !== D && u.metalness !== void 0 && (u.metalnessMap && (u.metalnessMap = null, u.needsUpdate = !0), u.metalness = D), s.mr !== b && u.roughness !== void 0 && (u.roughnessMap && (u.roughnessMap = null, u.needsUpdate = !0), u.roughness = b);
    }), s.mm = D, s.mr = b);
    const H = n.getProp("colorMapScale"), L = n.getProp("colorMapPosition"), Q = n.getProp("colorMapIntensity");
    if (a.customColorMap && !n.renderNormals && (s.cms !== H || s.cmpx !== (L == null ? void 0 : L.x) || s.cmpy !== (L == null ? void 0 : L.y) || s.cmi !== Q)) {
      const u = Math.max(1e-3, H);
      a.customColorMap.repeat.setScalar(u);
      const y = -(u - 1) / 2, A = ((L == null ? void 0 : L.x) ?? 0.5) - 0.5, F = ((L == null ? void 0 : L.y) ?? 0.5) - 0.5;
      a.customColorMap.offset.set(y + A, y + F);
      const G = Q ?? 1;
      (ee = a.model.userData.materials) == null || ee.forEach((C) => {
        (C.isMeshStandardMaterial || C.isMeshPhongMaterial || C.isMeshLambertMaterial) && (C.color && C.color.setScalar(G), C.needsUpdate = !0);
      }), s.cms = H, s.cmpx = L == null ? void 0 : L.x, s.cmpy = L == null ? void 0 : L.y, s.cmi = Q;
    }
    const Z = n.getProp("normalMapScale"), S = n.getProp("normalMapPosition"), J = n.getProp("normalMapIntensity");
    if (a.customNormalMap && !n.renderNormals && (s.nms !== Z || s.nmpx !== (S == null ? void 0 : S.x) || s.nmpy !== (S == null ? void 0 : S.y) || s.nmi !== J)) {
      const u = Math.max(1e-3, Z);
      a.customNormalMap.repeat.setScalar(u);
      const y = -(u - 1) / 2, A = ((S == null ? void 0 : S.x) ?? 0.5) - 0.5, F = ((S == null ? void 0 : S.y) ?? 0.5) - 0.5;
      a.customNormalMap.offset.set(y + A, y + F);
      const G = J ?? 1;
      (te = a.model.userData.materials) == null || te.forEach((C) => {
        C.normalMap !== void 0 && C.normalScale && (C.normalScale.set(G, -G), C.needsUpdate = !0);
      }), s.nms = Z, s.nmpx = S == null ? void 0 : S.x, s.nmpy = S == null ? void 0 : S.y, s.nmi = J;
    }
    a.customEnvMap && s.emi !== d && (q(a, a.customEnvMap, d), s.emi = d);
    const ie = a.model.userData.baseScale || 1, N = n.getProp("pos"), K = n.getProp("scale");
    if (s.s !== K) {
      const u = K * 10 * ie;
      a.model.scale.set(u, u, u), s.s = K;
    }
    const ae = v !== 0 || x !== 0;
    if (N && (ae || s.px !== N.x || s.py !== N.y || s.pz !== N.z)) {
      const u = (N.x - 0.5 + v) * 8, y = (N.y - 0.5 + x) * 8, A = (N.z - 0.5) * 8;
      a.model.position.set(u, -y, A), ae || (s.px = N.x, s.py = N.y, s.pz = N.z);
    }
    const T = n.getProp("modelRotation"), ne = n.getProp("speed"), Y = n.getProp("animationAxis"), oe = p !== 0 || M !== 0, $ = ne > 0 && n.animating;
    if (T && (oe || $ || s.rx !== T.x || s.ry !== T.y || s.rz !== T.z)) {
      let u = (T.y - 0.5 + p) * Math.PI * 2 + Math.PI, y = a.model.userData.isSVGWrapper ? Math.PI : 0, A = (T.x - 0.5 + M) * Math.PI * 2 + y, F = (T.z - 0.5) * Math.PI * 2;
      if ($) {
        const G = ne * t * 1e-3;
        Y.x > 0 && (u += G * Y.x), Y.y > 0 && (A += G * Y.y), Y.z > 0 && (F += G * Y.z);
      }
      a.model.rotation.set(u, A, F), !oe && !$ && (s.rx = T.x, s.ry = T.y, s.rz = T.z);
    }
  }
  a.renderer.render(a.scene, a.camera), a.renderer.resetState && a.renderer.resetState();
}
function xe(e) {
  const t = _(e);
  t.customColorMap && (t.customColorMap.dispose(), t.customColorMap = null), t.customNormalMap && (t.customNormalMap.dispose(), t.customNormalMap = null), t.customEnvMap && (t.customEnvMap.dispose(), t.customEnvMap = null), t.envMap && (t.envMap.dispose(), t.envMap = null), t.model && (t.model.traverse((n) => {
    n.isMesh && (n.geometry && n.geometry.dispose(), Array.isArray(n.material) ? n.material.forEach((a) => a.dispose()) : n.material && n.material.dispose());
  }), t.scene && t.scene.remove(t.model), t.model = null), t.renderer && (t.renderer.dispose(), t.renderer = null), t.scene = null, t.camera = null, t.ambientLight = null, t.directionalLight = null, t.fillLight = null, O.delete(e);
}
export {
  xe as dispose,
  Se as draw,
  he as initialize,
  Le as isLoading,
  ve as loadModel
};
