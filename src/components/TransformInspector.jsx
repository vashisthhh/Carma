import React, { useState, useMemo } from 'react';
import { extractTransformData } from '../utils/transformData';
import {
  Copy,
  Check,
  Compass,
  Box,
  Layers,
  AlertTriangle,
  ChevronRight,
  Maximize2
} from 'lucide-react';

export function TransformInspector({
  selectedMesh,
  rootTree,
  flatNodes = [],
  onSelectNode
}) {
  const [copied, setCopied] = useState(false);
  const [wheelCopied, setWheelCopied] = useState(false);

  // Transform data of currently selected object
  const transformData = useMemo(() => {
    if (!selectedMesh) return null;
    return extractTransformData(selectedMesh);
  }, [selectedMesh]);

  // Transform data for the four wheel objects
  const wheelObjectsData = useMemo(() => {
    const wheelNames = ['tyre front', 'rim front', 'tyre rear', 'rim rear'];
    return wheelNames.map((name) => {
      const node = flatNodes.find((n) => n.name === name);
      if (!node || !node.objectRef) {
        return { name, found: false };
      }
      return {
        ...extractTransformData(node.objectRef),
        found: true,
        nodeRef: node
      };
    });
  }, [flatNodes]);

  const handleCopyCurrent = () => {
    if (!transformData) return;
    navigator.clipboard.writeText(JSON.stringify(transformData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWheels = () => {
    navigator.clipboard.writeText(JSON.stringify(wheelObjectsData, null, 2));
    setWheelCopied(true);
    setTimeout(() => setWheelCopied(false), 2000);
  };

  return (
    <div className="transform-inspector-container">
      {/* SECTION 1: Active Object Transform Inspector */}
      <div className="inspector-section">
        <div className="inspector-section-header">
          <div className="section-title">
            <Compass size={15} color="#38bdf8" />
            <span>Active Selection Transform</span>
          </div>
          {transformData && (
            <button
              className="copy-btn"
              onClick={handleCopyCurrent}
              title="Copy Transform Data as JSON"
            >
              {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
              <span>{copied ? 'Copied JSON!' : 'Copy Transform Data'}</span>
            </button>
          )}
        </div>

        {transformData ? (
          <div className="transform-details-card">
            {/* Object Basic Info */}
            <div className="transform-header-row">
              <div className="object-main-name">
                <span className="name-label">Object:</span>
                <span className="name-value">{transformData.name}</span>
              </div>
              <span className="badge badge-cyan">{transformData.type}</span>
            </div>

            <div className="transform-meta-grid">
              <div>
                <strong>Parent:</strong> {transformData.parentName}
              </div>
              <div>
                <strong>UUID:</strong>{' '}
                <span className="mono-subtle">{transformData.uuid}</span>
              </div>
              <div>
                <strong>Children:</strong> {transformData.childrenCount}
              </div>
              <div>
                <strong>Descendant Meshes:</strong> {transformData.descendantMeshCount}
              </div>
              {transformData.vertexCount > 0 && (
                <>
                  <div>
                    <strong>Geometry:</strong> {transformData.geometryName} ({transformData.geometryType})
                  </div>
                  <div>
                    <strong>Material:</strong> {transformData.materialName}
                  </div>
                  <div>
                    <strong>Vertices:</strong> {transformData.vertexCount.toLocaleString()}
                  </div>
                  <div>
                    <strong>Triangles:</strong> {transformData.triangleCount.toLocaleString()}
                  </div>
                </>
              )}
            </div>

            {/* Local vs World Transforms Comparison */}
            <div className="transform-grid-2col">
              {/* Local Transforms */}
              <div className="transform-box">
                <div className="transform-box-title">LOCAL TRANSFORMS</div>
                <div className="vector-row">
                  <span className="vector-label">Position:</span>
                  <span className="vector-val">
                    [{transformData.localPosition.x}, {transformData.localPosition.y}, {transformData.localPosition.z}]
                  </span>
                </div>
                <div className="vector-row">
                  <span className="vector-label">Rotation (deg):</span>
                  <span className="vector-val">
                    [{transformData.localRotation.deg.x}°, {transformData.localRotation.deg.y}°, {transformData.localRotation.deg.z}°]
                  </span>
                </div>
                <div className="vector-row">
                  <span className="vector-label">Rotation (rad):</span>
                  <span className="vector-val">
                    [{transformData.localRotation.rad.x}, {transformData.localRotation.rad.y}, {transformData.localRotation.rad.z}]
                  </span>
                </div>
                <div className="vector-row">
                  <span className="vector-label">Scale:</span>
                  <span className="vector-val">
                    [{transformData.localScale.x}, {transformData.localScale.y}, {transformData.localScale.z}]
                  </span>
                </div>
              </div>

              {/* World Transforms */}
              <div className="transform-box">
                <div className="transform-box-title">WORLD TRANSFORMS</div>
                <div className="vector-row">
                  <span className="vector-label">Position:</span>
                  <span className="vector-val">
                    [{transformData.worldPosition.x}, {transformData.worldPosition.y}, {transformData.worldPosition.z}]
                  </span>
                </div>
                <div className="vector-row">
                  <span className="vector-label">Rotation (deg):</span>
                  <span className="vector-val">
                    [{transformData.worldRotation.deg.x}°, {transformData.worldRotation.deg.y}°, {transformData.worldRotation.deg.z}°]
                  </span>
                </div>
                <div className="vector-row">
                  <span className="vector-label">Rotation (rad):</span>
                  <span className="vector-val">
                    [{transformData.worldRotation.rad.x}, {transformData.worldRotation.rad.y}, {transformData.worldRotation.rad.z}]
                  </span>
                </div>
                <div className="vector-row">
                  <span className="vector-label">Scale:</span>
                  <span className="vector-val">
                    [{transformData.worldScale.x}, {transformData.worldScale.y}, {transformData.worldScale.z}]
                  </span>
                </div>
              </div>
            </div>

            {/* Bounding Box Information */}
            <div className="transform-box" style={{ marginTop: '8px' }}>
              <div className="transform-box-title">BOUNDING BOX (WORLD)</div>
              <div className="vector-row">
                <span className="vector-label">Min (X, Y, Z):</span>
                <span className="vector-val">
                  [{transformData.boundingBox.min.x}, {transformData.boundingBox.min.y}, {transformData.boundingBox.min.z}]
                </span>
              </div>
              <div className="vector-row">
                <span className="vector-label">Max (X, Y, Z):</span>
                <span className="vector-val">
                  [{transformData.boundingBox.max.x}, {transformData.boundingBox.max.y}, {transformData.boundingBox.max.z}]
                </span>
              </div>
              <div className="vector-row">
                <span className="vector-label">Center (X, Y, Z):</span>
                <span className="vector-val highlight-val">
                  [{transformData.boundingBox.center.x}, {transformData.boundingBox.center.y}, {transformData.boundingBox.center.z}]
                </span>
              </div>
              <div className="vector-row">
                <span className="vector-label">Size (W, H, D):</span>
                <span className="vector-val highlight-val">
                  [{transformData.boundingBox.size.x}, {transformData.boundingBox.size.y}, {transformData.boundingBox.size.z}]
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="inspector-empty-state">
            Select an object in the 3D scene or hierarchy tree to inspect its local/world transforms and bounding box.
          </div>
        )}
      </div>

      {/* SECTION 2: Wheel Objects Side-by-Side Comparison */}
      <div className="inspector-section" style={{ marginTop: '14px' }}>
        <div className="inspector-section-header">
          <div className="section-title">
            <Box size={15} color="#4ade80" />
            <span>Wheel Assemblies Comparison</span>
          </div>
          <button
            className="copy-btn"
            onClick={handleCopyWheels}
            title="Copy all 4 wheel objects transform data as JSON"
          >
            {wheelCopied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
            <span>{wheelCopied ? 'Copied Wheels!' : 'Copy 4 Wheels JSON'}</span>
          </button>
        </div>

        {/* Diagnostic Alert about Merged Left/Right Wheels */}
        <div className="diagnostic-alert-card">
          <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div className="alert-content">
            <strong>Key Topology Finding:</strong> Each wheel object (`tyre front`, `tyre rear`, `rim front`, `rim rear`) is a <em>single mesh</em> containing <strong>BOTH the Left and Right wheels</strong> merged together.
            <div className="alert-subtext">
              Notice that their Bounding Box Center is <code>Z: 0.0000</code> and Z-size is <code>~1.53m</code> (spanning across the entire car width from -0.76m to +0.76m with 0 vertices in the center).
            </div>
          </div>
        </div>

        {/* Side-by-Side / 2x2 Wheel Cards */}
        <div className="wheel-comparison-grid">
          {wheelObjectsData.map((wheel) => {
            if (!wheel.found) {
              return (
                <div key={wheel.name} className="wheel-card not-found">
                  <div className="wheel-card-name">{wheel.name}</div>
                  <div className="wheel-card-status">Not found in model</div>
                </div>
              );
            }

            const isSelected = selectedMesh && selectedMesh.name === wheel.name;

            return (
              <div
                key={wheel.name}
                className={`wheel-card ${isSelected ? 'selected' : ''}`}
                onClick={() => wheel.nodeRef && onSelectNode && onSelectNode(wheel.nodeRef)}
                title={`Click to select & highlight "${wheel.name}"`}
              >
                <div className="wheel-card-header">
                  <span className="wheel-card-name">{wheel.name}</span>
                  <span className="node-tag tag-mesh">Mesh</span>
                </div>

                <div className="wheel-card-specs">
                  <div className="spec-row">
                    <span className="spec-name">Geometry:</span>
                    <span className="spec-data">{wheel.geometryName}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Material:</span>
                    <span className="spec-data">{wheel.materialName}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Vertices:</span>
                    <span className="spec-data">{wheel.vertexCount.toLocaleString()}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Children:</span>
                    <span className="spec-data">{wheel.childrenCount} (Leaf Mesh)</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Descendant Meshes:</span>
                    <span className="spec-data">{wheel.descendantMeshCount}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Local Pos:</span>
                    <span className="spec-data">[{wheel.localPosition.x}, {wheel.localPosition.y}, {wheel.localPosition.z}]</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">BB Center:</span>
                    <span className="spec-data highlight-val">[{wheel.boundingBox.center.x}, {wheel.boundingBox.center.y}, {wheel.boundingBox.center.z}]</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">BB Size (X,Y,Z):</span>
                    <span className="spec-data highlight-val">[{wheel.boundingBox.size.x}, {wheel.boundingBox.size.y}, {wheel.boundingBox.size.z}]</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Z Span:</span>
                    <span className="spec-data" style={{ color: '#f59e0b' }}>
                      {wheel.boundingBox.min.z} to +{wheel.boundingBox.max.z} (Both Sides)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
