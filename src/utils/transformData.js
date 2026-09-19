import * as THREE from 'three';

const radToDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Extracts complete transform, hierarchy, and bounding box data for an Object3D
 */
export function extractTransformData(object) {
  if (!object) return null;

  // Ensure world matrices are up to date
  object.updateMatrixWorld(true);

  // Local transforms
  const localPosition = {
    x: Number(object.position.x.toFixed(4)),
    y: Number(object.position.y.toFixed(4)),
    z: Number(object.position.z.toFixed(4))
  };

  const localRotationRad = {
    x: Number(object.rotation.x.toFixed(4)),
    y: Number(object.rotation.y.toFixed(4)),
    z: Number(object.rotation.z.toFixed(4))
  };

  const localRotationDeg = {
    x: Number(radToDeg(object.rotation.x).toFixed(2)),
    y: Number(radToDeg(object.rotation.y).toFixed(2)),
    z: Number(radToDeg(object.rotation.z).toFixed(2))
  };

  const localScale = {
    x: Number(object.scale.x.toFixed(4)),
    y: Number(object.scale.y.toFixed(4)),
    z: Number(object.scale.z.toFixed(4))
  };

  // World transforms
  const worldPos = new THREE.Vector3();
  object.getWorldPosition(worldPos);

  const worldQuat = new THREE.Quaternion();
  object.getWorldQuaternion(worldQuat);
  const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

  const worldScale = new THREE.Vector3();
  object.getWorldScale(worldScale);

  const worldPosition = {
    x: Number(worldPos.x.toFixed(4)),
    y: Number(worldPos.y.toFixed(4)),
    z: Number(worldPos.z.toFixed(4))
  };

  const worldRotationRad = {
    x: Number(worldEuler.x.toFixed(4)),
    y: Number(worldEuler.y.toFixed(4)),
    z: Number(worldEuler.z.toFixed(4))
  };

  const worldRotationDeg = {
    x: Number(radToDeg(worldEuler.x).toFixed(2)),
    y: Number(radToDeg(worldEuler.y).toFixed(2)),
    z: Number(radToDeg(worldEuler.z).toFixed(2))
  };

  const worldScaleData = {
    x: Number(worldScale.x.toFixed(4)),
    y: Number(worldScale.y.toFixed(4)),
    z: Number(worldScale.z.toFixed(4))
  };

  // Bounding box
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  const boundingBox = {
    min: {
      x: Number(box.min.x.toFixed(4)),
      y: Number(box.min.y.toFixed(4)),
      z: Number(box.min.z.toFixed(4))
    },
    max: {
      x: Number(box.max.x.toFixed(4)),
      y: Number(box.max.y.toFixed(4)),
      z: Number(box.max.z.toFixed(4))
    },
    center: {
      x: Number(center.x.toFixed(4)),
      y: Number(center.y.toFixed(4)),
      z: Number(center.z.toFixed(4))
    },
    size: {
      x: Number(size.x.toFixed(4)),
      y: Number(size.y.toFixed(4)),
      z: Number(size.z.toFixed(4))
    }
  };

  // Hierarchy & Children details
  const childrenCount = object.children ? object.children.length : 0;
  let descendantMeshCount = 0;
  object.traverse((child) => {
    if (child !== object && child.isMesh) {
      descendantMeshCount++;
    }
  });

  // Mesh & Geometry details
  let geometryName = 'N/A';
  let geometryType = 'N/A';
  let vertexCount = 0;
  let triangleCount = 0;

  if (object.geometry) {
    geometryName = object.geometry.name || '(unnamed)';
    geometryType = object.geometry.type;
    vertexCount = object.geometry.attributes?.position?.count || 0;
    triangleCount = object.geometry.index
      ? Math.round(object.geometry.index.count / 3)
      : Math.round(vertexCount / 3);
  }

  // Material details
  let materialName = 'N/A';
  if (object.material) {
    if (Array.isArray(object.material)) {
      materialName = object.material.map((m) => m.name || m.type).join(', ');
    } else {
      materialName = object.material.name || object.material.type || 'N/A';
    }
  }

  return {
    name: object.name || '(unnamed)',
    uuid: object.uuid,
    type: object.type,
    parentName: object.parent?.name || '(root)',
    childrenCount,
    descendantMeshCount,
    geometryName,
    geometryType,
    materialName,
    vertexCount,
    triangleCount,
    localPosition,
    localRotation: {
      deg: localRotationDeg,
      rad: localRotationRad
    },
    localScale,
    worldPosition,
    worldRotation: {
      deg: worldRotationDeg,
      rad: worldRotationRad
    },
    worldScale: worldScaleData,
    boundingBox
  };
}
