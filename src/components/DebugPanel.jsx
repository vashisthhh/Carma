import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  FolderTree,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Compass
} from 'lucide-react';
import { TransformInspector } from './TransformInspector';

// Helper to highlight matching text in search
function HighlightMatch({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span>
      {before}
      <mark className="search-highlight">{match}</mark>
      {after}
    </span>
  );
}

// Recursive Tree Node Item
function TreeNodeItem({
  node,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelectNode,
  searchQuery,
  matchingIds
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isMatch = matchingIds ? matchingIds.has(node.id) : false;
  const rowRef = useRef(null);

  // Auto-scroll selected node into view
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div className="tree-node-wrapper">
      <div
        ref={rowRef}
        className={`tree-node-row ${isSelected ? 'selected' : ''} ${isMatch ? 'matching-search' : ''}`}
        style={{ paddingLeft: `${node.depth * 18 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node);
        }}
        title={`Click to select & highlight #${node.index} ${node.name}`}
      >
        {/* Expand / Collapse Caret */}
        {hasChildren ? (
          <button
            className="tree-caret-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="tree-caret-spacer" />
        )}

        {/* Unique Index Badge */}
        <span className="node-index-badge">#{node.index}</span>

        {/* Object Type Icon & Badge */}
        <span
          className={`node-tag ${
            node.isMesh
              ? 'tag-mesh'
              : node.isGroup
              ? 'tag-group'
              : 'tag-object'
          }`}
        >
          {node.isMesh ? 'Mesh' : node.isGroup ? 'Group' : node.type}
        </span>

        {/* Node Name */}
        <span className="tree-node-name">
          <HighlightMatch text={node.name} query={searchQuery} />
        </span>

        {/* Child Count Badge for Groups */}
        {hasChildren && (
          <span className="tree-child-count">
            {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
          </span>
        )}

        {/* Mesh Geometry & Material Badges */}
        {node.isMesh && (
          <div className="tree-mesh-meta">
            {node.geometryName && (
              <span className="meta-pill" title={`Geometry: ${node.geometryName} (${node.vertexCount} verts, ${node.triangleCount} tris)`}>
                {node.vertexCount.toLocaleString()}v
              </span>
            )}
            {node.materialName && node.materialName !== 'None' && (
              <span className="meta-pill meta-mat" title={`Material: ${node.materialName}`}>
                {node.materialName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Render Children if expanded */}
      {hasChildren && isExpanded && (
        <div className="tree-children-container">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              selectedId={selectedId}
              onSelectNode={onSelectNode}
              searchQuery={searchQuery}
              matchingIds={matchingIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DebugPanel({
  rootTree = null,
  flatNodes = [],
  nodeMap = new Map(),
  totalCount = 0,
  meshCount = 0,
  groupCount = 0,
  selectedMesh = null,
  onSelectNode
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(false);

  // Initialize root node expanded on first load
  useEffect(() => {
    if (rootTree) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(rootTree.id);
        // Also expand immediate children of root
        if (rootTree.children) {
          rootTree.children.forEach((c) => next.add(c.id));
        }
        return next;
      });
    }
  }, [rootTree]);

  // When selectedMesh changes (via 3D click or panel click), auto-expand all ancestors
  useEffect(() => {
    if (!selectedMesh) return;
    const targetNode = nodeMap.get(selectedMesh.uuid);
    if (targetNode && targetNode.ancestorIds && targetNode.ancestorIds.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        targetNode.ancestorIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [selectedMesh, nodeMap]);

  // Search logic: find matching nodes and their ancestors
  const { matchingIds, ancestorIdsOfMatches, matchCount } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return { matchingIds: null, ancestorIdsOfMatches: null, matchCount: 0 };
    }

    const matches = new Set();
    const ancestors = new Set();

    flatNodes.forEach((node) => {
      const matchName = node.name.toLowerCase().includes(q);
      const matchGeom = node.geometryName && node.geometryName.toLowerCase().includes(q);
      const matchMat = node.materialName && node.materialName.toLowerCase().includes(q);
      const matchType = node.type.toLowerCase().includes(q);

      if (matchName || matchGeom || matchMat || matchType) {
        matches.add(node.id);
        if (node.ancestorIds) {
          node.ancestorIds.forEach((id) => ancestors.add(id));
        }
      }
    });

    return {
      matchingIds: matches,
      ancestorIdsOfMatches: ancestors,
      matchCount: matches.size
    };
  }, [searchQuery, flatNodes]);

  // When search query changes, auto-expand all ancestor nodes to reveal matches
  useEffect(() => {
    if (ancestorIdsOfMatches && ancestorIdsOfMatches.size > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ancestorIdsOfMatches.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [ancestorIdsOfMatches]);

  // Toggle single node expansion
  const handleToggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all nodes
  const handleExpandAll = () => {
    const allIds = new Set(flatNodes.map((n) => n.id));
    setExpandedIds(allIds);
  };

  // Collapse all nodes except root
  const handleCollapseAll = () => {
    if (rootTree) {
      setExpandedIds(new Set([rootTree.id]));
    } else {
      setExpandedIds(new Set());
    }
  };

  // Active selected node details
  const selectedNodeInfo = useMemo(() => {
    if (!selectedMesh) return null;
    return (
      nodeMap.get(selectedMesh.uuid) || {
        index: '?',
        id: selectedMesh.uuid,
        name: selectedMesh.name || '(unnamed)',
        type: selectedMesh.type,
        parentName: selectedMesh.parent?.name || '(root)',
        materialName: selectedMesh.material?.name || selectedMesh.material?.type || 'N/A',
        geometryName: selectedMesh.geometry?.name || 'BufferGeometry',
        vertexCount: selectedMesh.geometry?.attributes?.position?.count || 0
      }
    );
  }, [selectedMesh, nodeMap]);

  // Copy UUID helper
  const handleCopyId = (id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'transform'

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          className="debug-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Open Scene Graph Tree & Transform Inspector"
        >
          <FolderTree size={16} color="#38bdf8" />
          <span>Inspector ({totalCount})</span>
        </button>
      )}

      {/* Collapsible Inspector Panel */}
      <aside className={`debug-panel ${isOpen ? '' : 'collapsed'}`}>
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-title-row">
            <div className="panel-tabs">
              <button
                className={`panel-tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
                onClick={() => setActiveTab('tree')}
              >
                <FolderTree size={14} />
                <span>Hierarchy Tree</span>
              </button>
              <button
                className={`panel-tab-btn ${activeTab === 'transform' ? 'active' : ''}`}
                onClick={() => setActiveTab('transform')}
              >
                <Compass size={14} />
                <span>Transform Inspector</span>
              </button>
            </div>
            <button
              className="panel-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          {activeTab === 'tree' && (
            <>
              {/* Quick Stats & Expand/Collapse Controls */}
              <div className="panel-stats-row">
                <div className="stat-card">
                  <span className="stat-label">Total Nodes</span>
                  <span className="stat-value">{totalCount}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Meshes</span>
                  <span className="stat-value" style={{ color: '#4ade80' }}>
                    {meshCount}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Groups</span>
                  <span className="stat-value" style={{ color: '#c084fc' }}>
                    {groupCount}
                  </span>
                </div>
              </div>

              {/* Tree Action Buttons */}
              <div className="tree-actions-row">
                <button
                  className="tree-action-btn"
                  onClick={handleExpandAll}
                  title="Expand all tree branches"
                >
                  <Maximize2 size={12} />
                  <span>Expand All</span>
                </button>
                <button
                  className="tree-action-btn"
                  onClick={handleCollapseAll}
                  title="Collapse all tree branches"
                >
                  <Minimize2 size={12} />
                  <span>Collapse All</span>
                </button>
              </div>
            </>
          )}
        </div>

        {activeTab === 'tree' ? (
          <>
            {/* Active Selection Details Card */}
            {selectedNodeInfo && (
              <div className="selection-card">
                <div className="selection-header">
                  <span className="selection-title">
                    <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Active Selection (#{selectedNodeInfo.index})
                  </span>
                  <span
                    className={`node-tag ${
                      selectedNodeInfo.isMesh
                        ? 'tag-mesh'
                        : selectedNodeInfo.isGroup
                        ? 'tag-group'
                        : 'tag-object'
                    }`}
                  >
                    {selectedNodeInfo.type}
                  </span>
                </div>

                <div className="selection-name" title={selectedNodeInfo.name}>
                  {selectedNodeInfo.name}
                </div>

                <div className="selection-details">
                  <div>
                    <strong>Parent:</strong> {selectedNodeInfo.parentName || '(root)'}
                  </div>
                  <div>
                    <strong>UUID:</strong>{' '}
                    <span
                      className="id-copy-span"
                      onClick={() => handleCopyId(selectedNodeInfo.id)}
                      title="Click to copy full UUID"
                    >
                      {selectedNodeInfo.id.slice(0, 8)}...
                      {copiedId ? <Check size={10} color="#4ade80" /> : <Copy size={10} />}
                    </span>
                  </div>
                  {selectedNodeInfo.isMesh && (
                    <>
                      <div>
                        <strong>Material:</strong> {selectedNodeInfo.materialName || 'N/A'}
                      </div>
                      <div>
                        <strong>Vertices:</strong> {selectedNodeInfo.vertexCount?.toLocaleString() || 0}
                      </div>
                      {selectedNodeInfo.geometryName && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <strong>Geometry:</strong> {selectedNodeInfo.geometryName} ({selectedNodeInfo.geometryType})
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search (wheel, door, brake, suspension, hood)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="panel-close-btn"
                    style={{ position: 'absolute', right: 8 }}
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Search Result Status */}
              {searchQuery.trim() && (
                <div className="search-result-count">
                  {matchCount > 0 ? (
                    <span>
                      Found <strong style={{ color: '#38bdf8' }}>{matchCount}</strong> matching object
                      {matchCount === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span style={{ color: '#f87171' }}>
                      No objects match "{searchQuery}" in this model
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Complete Collapsible Hierarchy Tree */}
            <div className="tree-scroll-container">
              {rootTree ? (
                <TreeNodeItem
                  node={rootTree}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  selectedId={selectedMesh?.uuid}
                  onSelectNode={onSelectNode}
                  searchQuery={searchQuery}
                  matchingIds={matchingIds}
                />
              ) : (
                <div className="empty-state">Loading scene graph hierarchy...</div>
              )}
            </div>
          </>
        ) : (
          /* Transform Inspector Tab */
          <TransformInspector
            selectedMesh={selectedMesh}
            rootTree={rootTree}
            flatNodes={flatNodes}
            onSelectNode={onSelectNode}
          />
        )}
      </aside>
    </>
  );
}
