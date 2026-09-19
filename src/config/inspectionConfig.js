import * as THREE from 'three';

/**
 * Calculates dynamic camera framing based on the object's actual world-space bounding box
 * AND the user's CURRENT camera position, preserving the user's viewing angle.
 * 
 * @param {THREE.Object3D} object - The component being inspected
 * @param {THREE.Vector3|Array<number>} currentCameraPos - User's current world-space camera position
 * @param {number} fov - Camera field of view in degrees (default 42)
 */
export function calculateCameraFraming(object, currentCameraPos = null, fov = 42) {
  if (!object) return null;

  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z, 0.4);
  const fovRad = (fov * Math.PI) / 180;
  // Frame object comfortably with 1.5x padding
  const distance = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.5;

  // Calculate viewing direction from current camera position towards component center
  const viewDir = new THREE.Vector3();

  if (currentCameraPos) {
    if (Array.isArray(currentCameraPos)) {
      viewDir.set(
        currentCameraPos[0] - center.x,
        currentCameraPos[1] - center.y,
        currentCameraPos[2] - center.z
      );
    } else if (currentCameraPos.isVector3) {
      viewDir.subVectors(currentCameraPos, center);
    }
  }

  // If viewDir is degenerate (too close to component center or camera position not provided)
  if (viewDir.lengthSq() < 0.01) {
    // Fallback direction: from vehicle center towards component, or lateral
    const lateralSign = center.z >= 0 ? 1 : -1;
    viewDir.set(center.x < 0 ? -0.4 : 0.4, 0.25, lateralSign).normalize();
  } else {
    viewDir.normalize();
    // Maintain a slight minimum elevation angle so camera doesn't dip underground
    if (viewDir.y < 0.08) {
      viewDir.y = 0.08;
      viewDir.normalize();
    }
  }

  // Camera inspection position placed along the user's current viewing line
  const targetCamPos = center.clone().addScaledVector(viewDir, distance);

  const target = [
    Number(center.x.toFixed(4)),
    Number(center.y.toFixed(4)),
    Number(center.z.toFixed(4))
  ];

  const cameraPos = [
    Number(targetCamPos.x.toFixed(4)),
    Number(targetCamPos.y.toFixed(4)),
    Number(targetCamPos.z.toFixed(4))
  ];

  return {
    target,
    cameraPos,
    boundingBox: {
      center: [Number(center.x.toFixed(4)), Number(center.y.toFixed(4)), Number(center.z.toFixed(4))],
      size: [Number(size.x.toFixed(4)), Number(size.y.toFixed(4)), Number(size.z.toFixed(4))]
    }
  };
}

/**
 * Modular Component Inspection Configuration for Independently Addressable Components
 */
export const INSPECTION_CONFIGS = {
  // Left Front Wheel Components
  'tyre-front-left': {
    id: 'tyre-front-left',
    title: 'FRONT LEFT TYRE',
    subtitle: 'Front-Left Wheel Assembly',
    targetMeshName: 'tyre-front-left',
    associatedMeshNames: ['rim-front-left'],
    side: 'left',
    
    // Exploded offsets: rim moves outward along wheel's lateral direction (+Z), tyre remains near original position
    getExplodedOffsets: () => ({
      'tyre-front-left': [0, 0, 0.04],  // stays near original position
      'rim-front-left': [0, 0, 0.25]    // moves outward along lateral +Z
    }),

    info: {
      status: 'No service records',
      description: 'No maintenance records have been added yet.',
      buttonLabel: '+ Add Service Record',
      metadata: [
        { label: 'Component', value: 'Front-Left Tyre' },
        { label: 'Associated Rim', value: 'rim-front-left' },
        { label: 'Side', value: 'Left (Driver)' },
        { label: 'Axle', value: 'Front' }
      ]
    }
  },

  'rim-front-left': {
    id: 'rim-front-left',
    title: 'FRONT LEFT RIM',
    subtitle: 'Front-Left Wheel Assembly',
    targetMeshName: 'rim-front-left',
    associatedMeshNames: ['tyre-front-left'],
    side: 'left',

    getExplodedOffsets: () => ({
      'rim-front-left': [0, 0, 0.25],
      'tyre-front-left': [0, 0, 0.04]
    }),

    info: {
      status: 'No service records',
      description: 'No maintenance records have been added yet.',
      buttonLabel: '+ Add Service Record',
      metadata: [
        { label: 'Component', value: 'Front-Left Rim' },
        { label: 'Associated Tyre', value: 'tyre-front-left' },
        { label: 'Side', value: 'Left (Driver)' },
        { label: 'Axle', value: 'Front' }
      ]
    }
  },

  // Right Front Wheel Components
  'tyre-front-right': {
    id: 'tyre-front-right',
    title: 'FRONT RIGHT TYRE',
    subtitle: 'Front-Right Wheel Assembly',
    targetMeshName: 'tyre-front-right',
    associatedMeshNames: ['rim-front-right'],
    side: 'right',

    // Exploded offsets: rim moves outward along wheel's lateral direction (-Z), tyre remains near original position
    getExplodedOffsets: () => ({
      'tyre-front-right': [0, 0, -0.04], // stays near original position
      'rim-front-right': [0, 0, -0.25]   // moves outward along lateral -Z
    }),

    info: {
      status: 'No service records',
      description: 'No maintenance records have been added yet.',
      buttonLabel: '+ Add Service Record',
      metadata: [
        { label: 'Component', value: 'Front-Right Tyre' },
        { label: 'Associated Rim', value: 'rim-front-right' },
        { label: 'Side', value: 'Right (Passenger)' },
        { label: 'Axle', value: 'Front' }
      ]
    }
  },

  'rim-front-right': {
    id: 'rim-front-right',
    title: 'FRONT RIGHT RIM',
    subtitle: 'Front-Right Wheel Assembly',
    targetMeshName: 'rim-front-right',
    associatedMeshNames: ['tyre-front-right'],
    side: 'right',

    getExplodedOffsets: () => ({
      'rim-front-right': [0, 0, -0.25],
      'tyre-front-right': [0, 0, -0.04]
    }),

    info: {
      status: 'No service records',
      description: 'No maintenance records have been added yet.',
      buttonLabel: '+ Add Service Record',
      metadata: [
        { label: 'Component', value: 'Front-Right Rim' },
        { label: 'Associated Tyre', value: 'tyre-front-right' },
        { label: 'Side', value: 'Right (Passenger)' },
        { label: 'Axle', value: 'Front' }
      ]
    }
  }
};

export function getInspectionConfig(meshName) {
  if (!meshName) return null;
  if (INSPECTION_CONFIGS[meshName]) {
    return INSPECTION_CONFIGS[meshName];
  }

  // Generic inspection configuration for any component in the model
  return {
    id: meshName,
    title: meshName.toUpperCase(),
    subtitle: 'Vehicle Component',
    targetMeshName: meshName,
    associatedMeshNames: [],
    getExplodedOffsets: () => ({}),
    info: {
      status: 'No service records',
      description: 'No maintenance records have been added yet.',
      buttonLabel: '+ Add Service Record',
      metadata: [
        { label: 'Component', value: meshName }
      ]
    }
  };
}
