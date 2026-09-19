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
  vehicleId: 'hyundai-eon-2015',
  displayName: 'Hyundai Eon (2015)',
  vin: 'MALAA51BLFM129841',
  components: {
    'rear-glass': {
      componentId: 'rear-glass',
      displayName: 'Back Glass',
      aliases: ['Rear Glass', 'back-glass', 'Rear Glass besel', 'back glass'],
      records: [
        {
          id: 'record-001',
          date: '2025-03-18',
          mileage: 31204,
          type: 'Replacement',
          cost: 4800,
          description: 'Rear glass replacement'
        }
      ]
    },
    'tyre-front-right': {
      componentId: 'tyre-front-right',
      displayName: 'Front Right Tyre',
      aliases: ['tyre-front-right', 'Right Front Tyre', 'front-right-tyre', 'front right tyre'],
      records: [
        {
          id: 'record-002',
          date: '2026-01-12',
          mileage: 42381,
          type: 'Replacement',
          cost: 8400,
          description: 'OEM tyre replacement (MRF ZVTS 155/70 R13)'
        }
      ]
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
      records: [
        {
          id: 'record-003',
          date: '2025-09-07',
          mileage: 36720,
          type: 'Replacement',
          cost: 3200,
          description: 'Right headlight assembly replacement and beam leveling'
        }
      ]
    },
    'steering': {
      componentId: 'steering',
      displayName: 'Steering',
      aliases: ['Steering', 'Steering column', 'hyundai logo steering', 'steering'],
      records: [
        {
          id: 'record-004',
          date: '2026-08-14',
          mileage: 61240,
          type: 'Inspection',
          cost: 500,
          description: 'Steering rack play inspection and column alignment check'
        }
      ]
    },
    'seat-front': {
      componentId: 'seat-front',
      displayName: 'Front Seat',
      aliases: ['Seat Front', 'Front Seat', 'seat-front', 'front seat'],
      records: [
        {
          id: 'record-005',
          date: '2024-11-05',
          mileage: 28450,
          type: 'Maintenance',
          cost: 1200,
          description: 'Seat slider mechanism lubrication and recline spring check'
        }
      ]
    },
    'boot-lock': {
      componentId: 'boot-lock',
      displayName: 'Boot Lock',
      aliases: ['Boot Lock', 'boot-lock', 'boot lock'],
      records: [
        {
          id: 'record-006',
          date: '2025-06-20',
          mileage: 34100,
          type: 'Repair',
          cost: 850,
          description: 'Tailgate latch alignment and lock striker adjustment'
        }
      ]
    }
  }
};

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

