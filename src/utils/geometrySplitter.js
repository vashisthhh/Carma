import * as THREE from 'three';

/**
 * Splits an indexed or non-indexed BufferGeometry along an axis (default 'z')
 * into two independent BufferGeometries for coordinates > threshold and < threshold.
 */
export function splitGeometryByAxis(geometry, axis = 'z', threshold = 0) {
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;
  const uv2Attr = geometry.attributes.uv2;

  const isIndexed = !!geometry.index;
  const indices = isIndexed ? geometry.index.array : null;

  // Vertex indices & attribute builders for Left (> threshold) and Right (< threshold)
  const leftIndices = [];
  const rightIndices = [];

  const leftOldToNew = new Map();
  const rightOldToNew = new Map();

  const leftPositions = [];
  const leftNormals = normAttr ? [] : null;
  const leftUVs = uvAttr ? [] : null;
  const leftUV2s = uv2Attr ? [] : null;

  const rightPositions = [];
  const rightNormals = normAttr ? [] : null;
  const rightUVs = uvAttr ? [] : null;
  const rightUV2s = uv2Attr ? [] : null;

  function getCoord(idx) {
    if (axis === 'x') return posAttr.getX(idx);
    if (axis === 'y') return posAttr.getY(idx);
    return posAttr.getZ(idx);
  }

  function getOrAddVertex(oldIdx, isLeft) {
    const map = isLeft ? leftOldToNew : rightOldToNew;
    if (map.has(oldIdx)) return map.get(oldIdx);

    const newIdx = map.size;
    map.set(oldIdx, newIdx);

    const posList = isLeft ? leftPositions : rightPositions;
    posList.push(posAttr.getX(oldIdx), posAttr.getY(oldIdx), posAttr.getZ(oldIdx));

    if (normAttr) {
      const normList = isLeft ? leftNormals : rightNormals;
      normList.push(normAttr.getX(oldIdx), normAttr.getY(oldIdx), normAttr.getZ(oldIdx));
    }
    if (uvAttr) {
      const uvList = isLeft ? leftUVs : rightUVs;
      uvList.push(uvAttr.getX(oldIdx), uvAttr.getY(oldIdx));
    }
    if (uv2Attr) {
      const uv2List = isLeft ? leftUV2s : rightUV2s;
      uv2List.push(uv2Attr.getX(oldIdx), uv2Attr.getY(oldIdx));
    }

    return newIdx;
  }

  if (isIndexed) {
    const triangleCount = indices.length / 3;
    for (let t = 0; t < triangleCount; t++) {
      const i0 = indices[t * 3];
      const i1 = indices[t * 3 + 1];
      const i2 = indices[t * 3 + 2];

      const c0 = getCoord(i0);
      const c1 = getCoord(i1);
      const c2 = getCoord(i2);
      const avg = (c0 + c1 + c2) / 3;

      const isLeft = avg > threshold;

      const n0 = getOrAddVertex(i0, isLeft);
      const n1 = getOrAddVertex(i1, isLeft);
      const n2 = getOrAddVertex(i2, isLeft);

      if (isLeft) {
        leftIndices.push(n0, n1, n2);
      } else {
        rightIndices.push(n0, n1, n2);
      }
    }
  } else {
    // Non-indexed: vertices are in triplets
    const vertexCount = posAttr.count;
    for (let i = 0; i < vertexCount; i += 3) {
      const c0 = getCoord(i);
      const c1 = getCoord(i + 1);
      const c2 = getCoord(i + 2);
      const avg = (c0 + c1 + c2) / 3;

      const isLeft = avg > threshold;

      const n0 = getOrAddVertex(i, isLeft);
      const n1 = getOrAddVertex(i + 1, isLeft);
      const n2 = getOrAddVertex(i + 2, isLeft);

      if (isLeft) {
        leftIndices.push(n0, n1, n2);
      } else {
        rightIndices.push(n0, n1, n2);
      }
    }
  }

  function buildBufferGeometry(positions, normals, uvs, uv2s, indicesList) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals) geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    if (uvs) geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (uv2s) geom.setAttribute('uv2', new THREE.Float32BufferAttribute(uv2s, 2));

    if (indicesList.length > 65535) {
      geom.setIndex(new THREE.Uint32BufferAttribute(indicesList, 1));
    } else {
      geom.setIndex(new THREE.Uint16BufferAttribute(indicesList, 1));
    }

    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    return geom;
  }

  const leftGeom = buildBufferGeometry(leftPositions, leftNormals, leftUVs, leftUV2s, leftIndices);
  const rightGeom = buildBufferGeometry(rightPositions, rightNormals, rightUVs, rightUV2s, rightIndices);

  return { leftGeom, rightGeom };
}

/**
 * Splits a mesh into two independent child meshes under the same parent,
 * hiding the original mesh to prevent duplicate rendering.
 */
export function splitMeshByAxis(mesh, axis = 'z', threshold = 0, leftName, rightName) {
  if (!mesh || !mesh.geometry) return null;

  const { leftGeom, rightGeom } = splitGeometryByAxis(mesh.geometry, axis, threshold);

  // Clone material or reuse original material
  const material = mesh.material;

  const leftMesh = new THREE.Mesh(leftGeom, material);
  leftMesh.name = leftName;
  leftMesh.position.copy(mesh.position);
  leftMesh.rotation.copy(mesh.rotation);
  leftMesh.scale.copy(mesh.scale);
  leftMesh.castShadow = mesh.castShadow;
  leftMesh.receiveShadow = mesh.receiveShadow;
  leftMesh.userData = {
    ...mesh.userData,
    isRuntimeSplit: true,
    sourceMeshName: mesh.name,
    side: 'left'
  };

  const rightMesh = new THREE.Mesh(rightGeom, material);
  rightMesh.name = rightName;
  rightMesh.position.copy(mesh.position);
  rightMesh.rotation.copy(mesh.rotation);
  rightMesh.scale.copy(mesh.scale);
  rightMesh.castShadow = mesh.castShadow;
  rightMesh.receiveShadow = mesh.receiveShadow;
  rightMesh.userData = {
    ...mesh.userData,
    isRuntimeSplit: true,
    sourceMeshName: mesh.name,
    side: 'right'
  };

  // Attach new meshes to the same parent as original mesh
  const parent = mesh.parent;
  if (parent) {
    parent.add(leftMesh);
    parent.add(rightMesh);
  }

  // Hide original source mesh
  mesh.visible = false;
  mesh.userData.isSplitSource = true;

  return { leftMesh, rightMesh };
}

/**
 * Modular split rules registry for vehicle models
 */
export const RUNTIME_SPLIT_RULES = [
  {
    sourceName: 'tyre front',
    axis: 'z',
    threshold: 0,
    leftName: 'tyre-front-left',
    rightName: 'tyre-front-right'
  },
  {
    sourceName: 'rim front',
    axis: 'z',
    threshold: 0,
    leftName: 'rim-front-left',
    rightName: 'rim-front-right'
  }
];

/**
 * Applies all registered runtime splits to a scene
 */
export function applyRuntimeSplits(scene, rules = RUNTIME_SPLIT_RULES) {
  if (!scene) return [];

  const createdComponents = [];

  rules.forEach(({ sourceName, axis, threshold, leftName, rightName }) => {
    // Avoid double-splitting if already performed
    if (scene.getObjectByName(leftName)) return;

    const sourceMesh = scene.getObjectByName(sourceName);
    if (sourceMesh && sourceMesh.isMesh) {
      const result = splitMeshByAxis(sourceMesh, axis, threshold, leftName, rightName);
      if (result) {
        createdComponents.push(result.leftMesh, result.rightMesh);
        console.log(
          `%c✂️ [Runtime Split Success] Split "${sourceName}" into "${leftName}" & "${rightName}"`,
          'color: #4ade80; font-weight: bold;'
        );
      }
    }
  });

  return createdComponents;
}
