/**
 * Generic Vehicle Component Service History Data Store
 *
 * Data Model Architecture:
 * vehicle
 *   └── componentId
 *         ├── displayName
 *         ├── aliases: string[]
 *         └── records: ServiceRecord[]
 *               ├── id: string
 *               ├── date: string (YYYY-MM-DD)
 *               ├── mileage: number (km)
 *               ├── type: 'Replacement' | 'Inspection' | 'Repair' | 'Maintenance'
 *               ├── cost: number (INR)
 *               └── description: string
 */

export const VEHICLE_SERVICE_DATA = {
  vehicleId: 'veh-001',
  displayName: 'Vehicle Workspace',
  vin: 'MALAA51BLFM129841',
  components: {
    'tail-light': {
      componentId: 'tail-light',
      displayName: 'Tail Light',
      aliases: ['tail light', 'taillight', 'tail-light', 'Rear Combination Lamp', 'Tail Lamp', 'tail-lamp'],
      records: []
    },
    'rear-glass': {
      componentId: 'rear-glass',
      displayName: 'Back Glass',
      aliases: ['Rear Glass', 'back-glass', 'Rear Glass besel', 'back glass', 'windshield'],
      records: []
    },
    'tyre-front-right': {
      componentId: 'tyre-front-right',
      displayName: 'Front Right Tyre',
      aliases: ['tyre-front-right', 'Right Front Tyre', 'front-right-tyre', 'front right tyre'],
      records: []
    },
    'tyre-front-left': {
      componentId: 'tyre-front-left',
      displayName: 'Front Left Tyre',
      aliases: ['tyre-front-left', 'Left Front Tyre', 'front-left-tyre', 'front left tyre'],
      records: []
    },
    'tyre-rear-right': {
      componentId: 'tyre-rear-right',
      displayName: 'Rear Right Tyre',
      aliases: ['tyre-rear-right', 'Right Rear Tyre', 'rear-right-tyre', 'rear right tyre'],
      records: []
    },
    'tyre-rear-left': {
      componentId: 'tyre-rear-left',
      displayName: 'Rear Left Tyre',
      aliases: ['tyre-rear-left', 'Left Rear Tyre', 'rear-left-tyre', 'rear left tyre'],
      records: []
    },
    'headlight-right': {
      componentId: 'headlight-right',
      displayName: 'Right Headlight',
      aliases: [
        'Headlight Glass',
        'Headlight Reflector',
        'Headlight Bulb',
        'Headlight Bulb Ind',
        'headlight-right',
        'Right Headlight',
        'right headlight'
      ],
      records: []
    },
    'headlight-left': {
      componentId: 'headlight-left',
      displayName: 'Left Headlight',
      aliases: ['headlight-left', 'Left Headlight', 'left headlight'],
      records: []
    },
    'steering': {
      componentId: 'steering',
      displayName: 'Steering',
      aliases: ['Steering', 'Steering column', 'hyundai logo steering', 'steering'],
      records: []
    },
    'seat-front': {
      componentId: 'seat-front',
      displayName: 'Front Seat',
      aliases: ['Seat Front', 'Front Seat', 'seat-front', 'front seat'],
      records: []
    },
    'boot-lock': {
      componentId: 'boot-lock',
      displayName: 'Boot Lock',
      aliases: ['Boot Lock', 'boot-lock', 'boot lock'],
      records: []
    }
  }
};

export const SUPPORTED_COMPONENTS = [
  { id: 'tail-light', name: 'Tail Light' },
  { id: 'tyre-front-right', name: 'Front Right Tyre' },
  { id: 'tyre-front-left', name: 'Front Left Tyre' },
  { id: 'tyre-rear-right', name: 'Rear Right Tyre' },
  { id: 'tyre-rear-left', name: 'Rear Left Tyre' },
  { id: 'headlight-right', name: 'Right Headlight' },
  { id: 'headlight-left', name: 'Left Headlight' },
  { id: 'rear-glass', name: 'Back Glass' },
  { id: 'steering', name: 'Steering' },
  { id: 'seat-front', name: 'Front Seat' },
  { id: 'boot-lock', name: 'Boot Lock' }
];

/**
 * Format raw mesh name or identifier into a clean title
 */
function formatDisplayName(identifier) {
  if (!identifier) return 'Unknown Component';
  return identifier
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Retrieve service history records for a given component identifier or mesh name.
 * 
 * @param {string} identifier - Component ID or 3D mesh name (e.g. 'Rear Glass', 'tyre-front-right', 'steering')
 * @returns {{ componentId: string, displayName: string, records: Array<object> }}
 */
export function getComponentServiceHistory(identifier) {
  if (!identifier) {
    return {
      componentId: 'unknown',
      displayName: 'Unknown Component',
      records: []
    };
  }

  const raw = String(identifier).trim();
  const normalized = raw.toLowerCase().replace(/[\s_]+/g, '-');

  // 1. Direct match on componentId
  if (VEHICLE_SERVICE_DATA.components[normalized]) {
    return VEHICLE_SERVICE_DATA.components[normalized];
  }

  // 2. Direct match on key in components
  for (const [key, comp] of Object.entries(VEHICLE_SERVICE_DATA.components)) {
    if (key.toLowerCase() === normalized) {
      return comp;
    }
    // Check aliases
    if (comp.aliases && comp.aliases.some((alias) => {
      const normAlias = alias.toLowerCase().replace(/[\s_]+/g, '-');
      return normAlias === normalized || alias.toLowerCase() === raw.toLowerCase();
    })) {
      return comp;
    }
  }

  // 3. Graceful fallback for any other vehicle component
  return {
    componentId: normalized,
    displayName: formatDisplayName(raw),
    records: []
  };
}

/**
 * Add a new service record to a component in memory for the current session.
 * 
 * @param {string} identifier - Component ID or 3D mesh name
 * @param {object} record - Record data: { type, date, mileage, cost, description }
 * @returns {object} The created record with unique ID
 */
export function addServiceRecord(identifier, record) {
  if (!identifier) return null;

  const raw = String(identifier).trim();
  const normalized = raw.toLowerCase().replace(/[\s_]+/g, '-');

  // Find existing component or resolve target
  let targetComponent = null;

  if (VEHICLE_SERVICE_DATA.components[normalized]) {
    targetComponent = VEHICLE_SERVICE_DATA.components[normalized];
  } else {
    for (const [key, comp] of Object.entries(VEHICLE_SERVICE_DATA.components)) {
      if (key.toLowerCase() === normalized) {
        targetComponent = comp;
        break;
      }
      if (comp.aliases && comp.aliases.some((alias) => {
        const normAlias = alias.toLowerCase().replace(/[\s_]+/g, '-');
        return normAlias === normalized || alias.toLowerCase() === raw.toLowerCase();
      })) {
        targetComponent = comp;
        break;
      }
    }
  }

  // If component does not exist yet in VEHICLE_SERVICE_DATA, create and register it
  if (!targetComponent) {
    targetComponent = {
      componentId: normalized,
      displayName: formatDisplayName(raw),
      aliases: [raw],
      records: []
    };
    VEHICLE_SERVICE_DATA.components[normalized] = targetComponent;
  }

  const uniqueId = `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const newRecord = {
    id: record.id || uniqueId,
    date: record.date || new Date().toISOString().split('T')[0],
    mileage: Number(record.mileage) || 0,
    type: record.type || 'Inspection',
    cost: Number(record.cost) || 0,
    description: record.description || 'Service performed',
    document: record.document ? {
      name: record.document.name,
      type: record.document.type,
      size: record.document.size,
      url: record.document.url,
      file: record.document.file || null
    } : null
  };

  // Prepend to display newest record first
  targetComponent.records.unshift(newRecord);

  return newRecord;
}

/**
 * Get all service records across all components for a vehicle, sorted chronologically (newest first).
 * 
 * @param {string} [vehicleId] - Optional vehicle ID
 * @returns {Array<object>} Chronological list of service records with component metadata
 */
export function getAllServiceRecords(vehicleId) {
  const allRecords = [];

  for (const [componentKey, comp] of Object.entries(VEHICLE_SERVICE_DATA.components)) {
    if (Array.isArray(comp.records)) {
      for (const rec of comp.records) {
        allRecords.push({
          ...rec,
          componentId: comp.componentId || componentKey,
          componentDisplayName: comp.displayName || formatDisplayName(componentKey)
        });
      }
    }
  }

  // Sort chronologically descending (newest date first)
  allRecords.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return (b.mileage || 0) - (a.mileage || 0);
  });

  return allRecords;
}

/**
 * Dynamically calculate documented history summary metrics for a vehicle.
 * 
 * @param {string} [vehicleId] - Optional vehicle ID
 * @returns {{ totalRecords: number, documentCount: number, totalSpend: number, records: Array<object> }}
 */
export function getVehicleServiceSummary(vehicleId) {
  const records = getAllServiceRecords(vehicleId);

  const totalRecords = records.length;
  const documentCount = records.filter((r) => Boolean(r.document)).length;
  const totalSpend = records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  return {
    totalRecords,
    documentCount,
    totalSpend,
    records
  };
}

