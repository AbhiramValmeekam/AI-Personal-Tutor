import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Seeded RNG so the shelves look identical on every render
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const BOOK_COLORS_DARK = [
  "#8c3b2e", "#274156", "#c9a227", "#5b6e3f", "#6e3f5b",
  "#a3642f", "#2e6b62", "#7a2e2e", "#3f5a7a", "#8a6d3b",
  "#4f4a3a", "#93392b",
];
const BOOK_COLORS_LIGHT = [
  "#e8a2b0", "#a2c8e0", "#b5d8b0", "#f2d38a", "#c3aee0",
  "#f0b48a", "#9ad0c2", "#e8b8d8", "#a8bce0", "#d8c48a",
  "#b0d8d0", "#e0a890",
];

const WOOD = "#4a3220";
const WOOD_DARK = "#38271a";
const WOOD_LIGHT = "#c9a87f";
const WOOD_LIGHT_DARK = "#a98f6e";

// Shelf unit placements: [x, z, rotY]
const SHELVES = [
  [-4.2, -5.0, 0],
  [-1.4, -5.0, 0],
  [1.4, -5.0, 0],
  [4.2, -5.0, 0],
  [-8.2, -1.6, Math.PI / 2],
  [8.2, -1.6, -Math.PI / 2],
];

const INNER_W = 2.6; // interior width of a shelf unit
const ROW_H = 0.85; // height per book row
const ROWS = 4;
const BASE_Y = 0.35; // plinth height

const toWorld = (sx, sz, ry, lx, lz) => [
  sx + lx * Math.cos(ry) + lz * Math.sin(ry),
  sz - lx * Math.sin(ry) + lz * Math.cos(ry),
];

// Build every book transform once (shared by the InstancedMeshes below)
const buildBooks = () => {
  const books = [];
  const push = (o) => books.push({ rotZ: 0, flat: false, ...o });
  SHELVES.forEach(([sx, sz, ry], si) => {
    // All books use the dark palette; walls stay light
    const palette = BOOK_COLORS_DARK;
    for (let row = 0; row < ROWS; row++) {
      const rand = mulberry32(si * 100 + row * 7 + 1);
      const baseY = BASE_Y + row * ROW_H;
      let x = -INNER_W / 2;
      while (x < INNER_W / 2 - 0.1) {
        // Occasional empty gap on the shelf
        if (rand() < 0.08) {
          x += 0.15 + rand() * 0.3;
          continue;
        }
        // Occasional horizontal stack of flat books
        if (rand() < 0.1 && x < INNER_W / 2 - 1.0) {
          const stackW = 0.45 + rand() * 0.25;
          const layers = 3 + Math.floor(rand() * 3);
          let sy = baseY + 0.002;
          for (let l = 0; l < layers; l++) {
            const h = 0.09 + rand() * 0.04;
            const w = stackW * (0.92 + rand() * 0.08);
            const d = 0.32 + rand() * 0.06;
            const [wx, wz] = toWorld(sx, sz, ry, x + stackW / 2, 0.02);
            push({
              pos: [wx, sy + h / 2, wz],
              rotY: ry + (rand() - 0.5) * 0.12,
              scale: [w, h, d],
              color: palette[Math.floor(rand() * palette.length)],
              flat: true,
            });
            sy += h + 0.005;
          }
          x += stackW + 0.06;
          continue;
        }
        const w = 0.09 + rand() * 0.08;
        const h = 0.5 + rand() * 0.22;
        const d = 0.3 + rand() * 0.1;
        if (x + w > INNER_W / 2) break;
        // A few books lean against their neighbour
        const lean = rand() < 0.06 ? (rand() - 0.5) * 0.22 : 0;
        const [wx, wz] = toWorld(sx, sz, ry, x + w / 2, 0.02);
        push({
          pos: [wx, baseY + 0.002 + h / 2 + (Math.abs(Math.sin(lean)) * w) / 2, wz],
          rotY: ry + (rand() - 0.5) * 0.04,
          rotZ: lean,
          scale: [w, h, d],
          color: palette[Math.floor(rand() * palette.length)],
        });
        x += w + 0.008;
      }
    }
  });
  return books;
};

const ShelfFrame = ({ x, z, rotY, dark }) => {
  const wood = dark ? WOOD : WOOD_LIGHT;
  const woodDark = dark ? WOOD_DARK : WOOD_LIGHT_DARK;
  const frameH = BASE_Y + ROWS * ROW_H + 0.12;
  const cy = frameH / 2;
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* sides */}
      <mesh position={[-INNER_W / 2 - 0.06, cy, 0]} castShadow>
        <boxGeometry args={[0.12, frameH, 0.55]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      <mesh position={[INNER_W / 2 + 0.06, cy, 0]} castShadow>
        <boxGeometry args={[0.12, frameH, 0.55]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {/* top + plinth + back */}
      <mesh position={[0, frameH - 0.06, 0]} castShadow>
        <boxGeometry args={[INNER_W + 0.24, 0.12, 0.55]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      <mesh position={[0, BASE_Y / 2, 0]}>
        <boxGeometry args={[INNER_W + 0.24, BASE_Y, 0.5]} />
        <meshStandardMaterial color={woodDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, cy, -0.26]}>
        <boxGeometry args={[INNER_W + 0.24, frameH, 0.06]} />
        <meshStandardMaterial color={woodDark} roughness={0.85} />
      </mesh>
      {/* inner shelves — start above the plinth so no two faces overlap */}
      {Array.from({ length: ROWS - 1 }).map((_, k) => (
        <mesh key={k + 1} position={[0, BASE_Y + (k + 1) * ROW_H - 0.03, 0]}>
          <boxGeometry args={[INNER_W, 0.06, 0.5]} />
          <meshStandardMaterial color={wood} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

const Books = ({ books }) => {
  const body = useRef();
  const pages = useRef();
  const bands = useRef();
  useLayoutEffect(() => {
    if (!body.current || !pages.current || !bands.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    books.forEach((b, i) => {
      const [w, h, d] = b.scale;
      e.set(0, b.rotY, b.rotZ || 0);
      q.setFromEuler(e);
      // Cover
      v.set(...b.pos);
      s.set(w, h, d);
      m.compose(v, q, s);
      body.current.setMatrixAt(i, m);
      body.current.setColorAt(i, c.set(b.color));
      // Page block — cream, inset on top and fore-edge so the cover overhangs
      v.set(
        b.pos[0] - 0.014 * Math.sin(b.rotY),
        b.pos[1] - 0.006,
        b.pos[2] - 0.014 * Math.cos(b.rotY)
      );
      s.set(Math.max(w - 0.03, 0.02), Math.max(h - 0.045, 0.03), Math.max(d - 0.035, 0.05));
      m.compose(v, q, s);
      pages.current.setMatrixAt(i, m);
      // Gold spine bands on upright books
      if (!b.flat) {
        [-0.26, 0.26].forEach((f, k) => {
          v.set(b.pos[0], b.pos[1] + h * f, b.pos[2]);
          s.set(w + 0.016, 0.04, d + 0.016);
          m.compose(v, q, s);
          bands.current.setMatrixAt(i * 2 + k, m);
        });
      } else {
        bands.current.setMatrixAt(i * 2, hide);
        bands.current.setMatrixAt(i * 2 + 1, hide);
      }
    });
    body.current.instanceMatrix.needsUpdate = true;
    pages.current.instanceMatrix.needsUpdate = true;
    bands.current.instanceMatrix.needsUpdate = true;
    if (body.current.instanceColor) body.current.instanceColor.needsUpdate = true;
  }, [books]);
  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, books.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={pages} args={[undefined, undefined, books.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#efe6d0" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={bands} args={[undefined, undefined, books.length * 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c9a227" roughness={0.35} metalness={0.6} />
      </instancedMesh>
    </group>
  );
};

const Lamp = () => (
  <group position={[3.6, 0, -1.4]}>
    {/* side table */}
    <mesh position={[0, 0.55, 0]} castShadow>
      <cylinderGeometry args={[0.45, 0.45, 0.06, 24]} />
      <meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.27, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.07, 0.55, 12]} />
      <meshStandardMaterial color={WOOD_LIGHT_DARK} roughness={0.7} />
    </mesh>
    {/* lamp base + stem + shade */}
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.12, 0.16, 0.05, 16]} />
      <meshStandardMaterial color="#2b2b2e" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.95, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.65, 10]} />
      <meshStandardMaterial color="#2b2b2e" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[0, 1.35, 0]}>
      <cylinderGeometry args={[0.22, 0.32, 0.35, 20, 1, true]} />
      <meshStandardMaterial
        color="#e8c88a"
        emissive="#ffb46b"
        emissiveIntensity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
    <pointLight position={[0, 1.3, 0]} color="#ffb46b" intensity={9} distance={9} decay={2} />
  </group>
);

export const Library = () => {
  const books = useMemo(buildBooks, []);
  return (
    <group>
      <color attach="background" args={["#efe0cd"]} />
      <fog attach="fog" args={["#efe0cd", 14, 30]} />

      {/* lighting — all local, no remote HDR so the scene never stalls */}
      <hemisphereLight args={["#ffe9c8", "#3a2a1a", 0.75]} />
      <ambientLight color="#ffe6c4" intensity={0.35} />
      <directionalLight
        position={[4, 6.5, 5]}
        color="#ffdfb0"
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-4}
      />
      <pointLight position={[-4, 4.5, 2]} color="#cfe0ff" intensity={4} distance={14} decay={2} />

      {/* floor — light oak to match the light walls */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[34, 34]} />
        <meshStandardMaterial color="#e3d3bd" roughness={0.8} />
      </mesh>
      {/* rug — neutral tone bridging both halves */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -0.6]} receiveShadow>
        <circleGeometry args={[2.5, 48]} />
        <meshStandardMaterial color="#a5787f" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.045, -0.6]} receiveShadow>
        <circleGeometry args={[1.7, 48]} />
        <meshStandardMaterial color="#c09a90" roughness={1} />
      </mesh>

      {/* walls — all light */}
      <mesh position={[-6.5, 4, -5.6]}>
        <boxGeometry args={[13, 8, 0.3]} />
        <meshStandardMaterial color="#f0e2d2" roughness={0.95} />
      </mesh>
      <mesh position={[6.5, 4, -5.6]}>
        <boxGeometry args={[13, 8, 0.3]} />
        <meshStandardMaterial color="#f0e2d2" roughness={0.95} />
      </mesh>
      <mesh position={[-10, 4, 2]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[20, 8, 0.3]} />
        <meshStandardMaterial color="#e8d5c4" roughness={0.95} />
      </mesh>
      <mesh position={[10, 4, 2]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[20, 8, 0.3]} />
        <meshStandardMaterial color="#e8d5c4" roughness={0.95} />
      </mesh>

      {/* shelves + books */}
      {SHELVES.map(([x, z, ry], i) => (
        <ShelfFrame key={i} x={x} z={z} rotY={ry} dark={false} />
      ))}
      <Books books={books} />

      <Lamp />
    </group>
  );
};
