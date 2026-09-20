import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import { getInspectionConfig, calculateCameraFraming } from '../config/inspectionConfig';
import { applyRuntimeSplits } from '../utils/geometrySplitter';

export function CarModel({
  onLoaded,
  onError,
  onSelectMesh,
  selectedMesh,
  inspectionConfig,
  onEnterInspection,
  onHoverComponent,
  onUnhoverComponent
}) {
  const { camera } = useThree();
  const gltf = useGLTF('/models/eon.glb');
  const highlightTimeoutRef = useRef(null);
  const originalHighlightStateRef = useRef([]);

  // Cache initial positions and materials for zero-drift restoration
  const originalPositionsRef = useRef(new Map());
  const originalMaterialsRef = useRef(new Map());

  // Apply runtime splits on scene load, construct tree & flat index, and record original positions
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    try {
      // 1. Execute runtime logical splitting of merged front wheel meshes
      // tyre front -> tyre-front-left + tyre-front-right
      // rim front   -> rim-front-left + rim-front-right
      applyRuntimeSplits(gltf.scene);

    const flatNodes = [];
    const nodeMap = new Map();
    let counter = 0;
    let meshCount = 0;
    let groupCount = 0;

    // Cache initial positions for all meshes and update exterior body paint to matte off-white / light-grey
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        originalPositionsRef.current.set(obj.uuid, obj.position.clone());
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m && m.name === 'Blue Body') {
              m.color.set('#e2e5e8');
              m.roughness = 0.6;
              m.metalness = 0.08;
            }
          });
        }
      }
    });

    // 2. Recursive traversal to build rich tree and node map
    function processNode(node, depth = 0, parentId = null, parentName = null, ancestorIds = []) {
      const currentIndex = counter++;
      const isMesh = !!node.isMesh;
      const isGroup = node.type === 'Group';

      if (isMesh) meshCount++;
      else if (isGroup) groupCount++;

      // Geometry details
      let geometryName = null;
      let geometryType = null;
      let vertexCount = 0;
      let triangleCount = 0;
      if (node.geometry) {
        geometryName = node.geometry.name || '(unnamed geom)';
        geometryType = node.geometry.type;
        vertexCount = node.geometry.attributes?.position?.count || 0;
        if (node.geometry.index) {
          triangleCount = node.geometry.index.count / 3;
        } else {
          triangleCount = vertexCount / 3;
        }
      }

      // Material details
      let materialName = 'None';
      let materialType = 'None';
      if (node.material) {
        if (Array.isArray(node.material)) {
          materialName = node.material.map((m) => m.name || m.type).join(', ');
          materialType = node.material.map((m) => m.type).join(', ');
        } else {
          materialName = node.material.name || '(unnamed mat)';
          materialType = node.material.type;
        }
      }

      const currentId = node.uuid;
      const nextAncestors = [...ancestorIds, currentId];

      const treeNode = {
        id: currentId,
        index: currentIndex,
        name: node.name || `Unnamed_${node.type}_${currentIndex}`,
        type: node.type,
        isMesh,
        isGroup,
        depth,
        parentId,
        parentName,
        ancestorIds,
        geometryName,
        geometryType,
        vertexCount,
        triangleCount: Math.round(triangleCount),
        materialName,
        materialType,
        children: [],
        objectRef: node,
        isRuntimeSplit: !!node.userData?.isRuntimeSplit,
        isSplitSource: !!node.userData?.isSplitSource
      };

      flatNodes.push(treeNode);
      nodeMap.set(currentId, treeNode);
      if (node.name) {
        nodeMap.set(node.name, treeNode);
        nodeMap.set(node.name.toLowerCase(), treeNode);
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          const childTreeNode = processNode(
            child,
            depth + 1,
            currentId,
            treeNode.name,
            nextAncestors
          );
          treeNode.children.push(childTreeNode);
        });
      }

      return treeNode;
    }

    const rootTree = processNode(gltf.scene, 0, null, null, []);

    // Formatted diagnostic console output
    console.group(
      '%c🚗 [Carma Scene Graph Hierarchy with Runtime Split Wheels]',
      'color: #a33b4a; font-weight: bold; font-size: 14px;'
    );
    console.log(
      `%cLoaded model with ${flatNodes.length} Object3D nodes. Front wheels successfully split into independent left/right components.`,
      'color: #94a3b8; font-style: italic;'
    );
    console.groupEnd();

    if (onLoaded) {
      onLoaded({
        rootTree,
        flatNodes,
        nodeMap,
        totalCount: flatNodes.length,
        meshCount,
        groupCount
      });
    }
  } catch (err) {
    console.error('[CarModel] Initialization error:', err);
    if (onError) {
      onError(err);
    }
  }
}, [gltf, onLoaded, onError]);

  // Restore any highlighted materials
  const restoreOriginalHighlights = () => {
    if (originalHighlightStateRef.current && originalHighlightStateRef.current.length > 0) {
      originalHighlightStateRef.current.forEach(({ savedMats }) => {
        savedMats.forEach((saved) => {
          if (!saved || !saved.material) return;
          if (saved.emissive && saved.material.emissive) {
            gsap.killTweensOf(saved.material);
            gsap.to(saved.material, {
              emissiveIntensity: saved.emissiveIntensity || 0,
              duration: 0.22,
              ease: 'power1.out',
              onComplete: () => {
                if (saved.material.emissive) {
                  saved.material.emissive.copy(saved.emissive);
                }
              }
            });
          }
          if (saved.color && saved.material.color) {
            saved.material.color.copy(saved.color);
          }
          if (saved.wireframe !== undefined && saved.material.wireframe !== undefined) {
            saved.material.wireframe = saved.wireframe;
          }
        });
      });
      originalHighlightStateRef.current = [];
    }
  };

function getHighlightColor() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return isLight ? '#6B1F2A' : '#A33B4A';
}

  // Highlight an object (subtle, restrained accent without harsh neon effects)
  const applyHighlight = (targetObject, duration = 3000, isHover = false) => {
    restoreOriginalHighlights();
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    if (!targetObject) return;

    const meshesToHighlight = [];
    if (targetObject.isMesh) {
      meshesToHighlight.push(targetObject);
    } else {
      targetObject.traverse((child) => {
        if (child.isMesh && child.visible) {
          meshesToHighlight.push(child);
        }
      });
    }

    if (meshesToHighlight.length === 0) return;

    const targetIntensity = isHover ? 0.35 : 0.45;
    const highlightColor = getHighlightColor();
    const newOriginalStates = [];
    meshesToHighlight.forEach((mesh) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const savedMats = mats.map((m) => {
        if (!m) return null;
        return {
          material: m,
          emissive: m.emissive ? m.emissive.clone() : null,
          emissiveIntensity: m.emissiveIntensity !== undefined ? m.emissiveIntensity : 0,
          color: m.color ? m.color.clone() : null,
          wireframe: m.wireframe
        };
      });

      newOriginalStates.push({ mesh, savedMats });

      mats.forEach((m) => {
        if (!m) return;
        if (m.emissive) {
          m.emissive.set(highlightColor);
          gsap.killTweensOf(m);
          gsap.to(m, {
            emissiveIntensity: targetIntensity,
            duration: 0.18,
            ease: 'power1.out'
          });
        } else if (m.color) {
          m.color.set(highlightColor);
        }
      });
    });

    originalHighlightStateRef.current = newOriginalStates;

    if (duration > 0) {
      highlightTimeoutRef.current = setTimeout(() => {
        restoreOriginalHighlights();
      }, duration);
    }
  };

  // React to selectedMesh changes
  useEffect(() => {
    if (selectedMesh) {
      applyHighlight(selectedMesh);
    }
  }, [selectedMesh]);

  // Handle Inspection Mode: Dimming rest of vehicle & Exploded-view offsets
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    if (inspectionConfig) {
      // ENTERING INSPECTION MODE
      const activeMeshNames = [
        inspectionConfig.targetMeshName,
        ...inspectionConfig.associatedMeshNames
      ];

      // 1. Dim the rest of the vehicle smoothly to 0.12 opacity, focus target component
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.visible) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          const isTargetAssembly = activeMeshNames.includes(child.name);

          mats.forEach((m) => {
            if (!m) return;

            if (!originalMaterialsRef.current.has(m.uuid)) {
              originalMaterialsRef.current.set(m.uuid, {
                transparent: m.transparent,
                opacity: m.opacity !== undefined ? m.opacity : 1.0,
                depthWrite: m.depthWrite !== undefined ? m.depthWrite : true
              });
            }

            if (!isTargetAssembly) {
              m.transparent = true;
              m.depthWrite = false;
              gsap.killTweensOf(m);
              gsap.to(m, {
                opacity: 0.12,
                duration: 0.6,
                ease: 'power2.out',
                onUpdate: () => {
                  m.needsUpdate = true;
                }
              });
            } else {
              m.transparent = false;
              m.depthWrite = true;
              gsap.killTweensOf(m);
              gsap.to(m, {
                opacity: 1.0,
                duration: 0.4,
                ease: 'power2.out',
                onUpdate: () => {
                  m.needsUpdate = true;
                }
              });
              if (m.emissive) {
                m.emissive.set(getHighlightColor());
                gsap.to(m, {
                  emissiveIntensity: 0.18,
                  duration: 0.4,
                  ease: 'power2.out'
                });
              }
            }
          });
        }
      });

      // 2. Exploded-view separation
      const offsets = inspectionConfig.getExplodedOffsets();
      Object.entries(offsets).forEach(([meshName, offset]) => {
        const mesh = gltf.scene.getObjectByName(meshName);
        if (mesh) {
          const originalPos = originalPositionsRef.current.get(mesh.uuid) || mesh.position.clone();
          gsap.killTweensOf(mesh.position);
          gsap.to(mesh.position, {
            x: originalPos.x + offset[0],
            y: originalPos.y + offset[1],
            z: originalPos.z + offset[2],
            duration: 0.85,
            ease: 'power2.out'
          });
        }
      });
    } else {
      // EXITING INSPECTION MODE -> Restore positions & opacities
      originalPositionsRef.current.forEach((origPos, uuid) => {
        const mesh = gltf.scene.getObjectByProperty('uuid', uuid);
        if (mesh) {
          gsap.killTweensOf(mesh.position);
          gsap.to(mesh.position, {
            x: origPos.x,
            y: origPos.y,
            z: origPos.z,
            duration: 0.85,
            ease: 'power2.inOut'
          });
        }
      });

      originalMaterialsRef.current.forEach((saved, uuid) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh && child.visible) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m && m.uuid === uuid) {
                gsap.killTweensOf(m);
                gsap.to(m, {
                  opacity: saved.opacity,
                  duration: 0.6,
                  ease: 'power2.inOut',
                  onComplete: () => {
                    m.transparent = saved.transparent;
                    m.depthWrite = saved.depthWrite;
                    if (m.emissive) {
                      m.emissive.set('#000000');
                      m.emissiveIntensity = 0;
                    }
                    m.needsUpdate = true;
                  }
                });
              }
            });
          }
        });
      });
    }
  }, [inspectionConfig, gltf]);

  // Hover detection: highlight inspectable meshes on hover
  const handlePointerOver = (e) => {
    e.stopPropagation();
    const mesh = e.object;
    if (!mesh || !mesh.visible) return;

    const config = getInspectionConfig(mesh.name);
    if (config) {
      document.body.style.cursor = 'pointer';
      if (!inspectionConfig) {
        applyHighlight(mesh, 0, true);
        if (onHoverComponent) {
          onHoverComponent(config.title || mesh.name, mesh.name);
        }
      }
    }
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    if (!inspectionConfig && !selectedMesh) {
      restoreOriginalHighlights();
    }
    if (onUnhoverComponent) {
      onUnhoverComponent();
    }
  };

  // Click handler on 3D objects
  const handleClick = (e) => {
    e.stopPropagation();

    const clickedMesh = e.object;
    if (!clickedMesh || !clickedMesh.visible) return;

    console.log(
      '%c🎯 [Clicked Mesh Object]',
      'color: #a33b4a; font-weight: bold; font-size: 13px;'
    );
    console.log(`Name: "%c${clickedMesh.name}%c"`, 'color: #a33b4a; font-weight: bold;', '');
    console.log('Type:', clickedMesh.type);
    console.log('Parent:', clickedMesh.parent?.name || '(root)');

    // Check if this component has an inspection mode configuration
    const config = getInspectionConfig(clickedMesh.name);
    if (config && onEnterInspection) {
      // Calculate dynamic camera framing derived from current camera position
      const cameraFraming = calculateCameraFraming(clickedMesh, camera.position, camera.fov);
      onEnterInspection(config, cameraFraming);
    } else {
      applyHighlight(clickedMesh);
    }

    if (onSelectMesh) {
      onSelectMesh(clickedMesh);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      restoreOriginalHighlights();
    };
  }, []);

  return (
    <primitive
      object={gltf.scene}
      onClick={handleClick}
      onPointerDown={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}

// Preload the model
useGLTF.preload('/models/eon.glb');
