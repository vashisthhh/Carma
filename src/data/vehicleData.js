/**
 * Generic Vehicle Data Store
 * 
 * Supports vehicle-agnostic architecture:
 * - Generic vehicle object schema
 * - Associated 3D model path (GLB)
 * - Vehicle-level compliance & ownership documents (Insurance, PUC)
 * - Scalable to multiple vehicles
 */

export const VEHICLES = [
  {
    id: 'veh-001',
    make: 'Hyundai',
    model: 'Eon',
    variant: 'D-Lite+',
    year: 2019,
    odometer: 61240,
    registrationNumber: 'MH-01-AB-1234',
    vin: 'MALAA51BLFM129841',
    fuelType: 'Petrol',
    transmission: '5-Speed Manual',
    color: 'Sleek Silver',
    modelPath: '/eon.glb',
    documents: []
  }
];

export const DEFAULT_VEHICLE_ID = 'veh-001';
const STORAGE_KEY = 'carma_vehicle_profile';

/**
 * Get configured vehicle profile from localStorage if present
 */
export function getStoredVehicle() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.make || !parsed.model) return null;

    const base = VEHICLES[0];
    const isDemo =
      parsed.make.toLowerCase() === 'hyundai' &&
      parsed.model.toLowerCase() === 'eon';

    // Prioritize documents stored in localStorage
    const docs = Array.isArray(parsed.documents)
      ? parsed.documents
      : (Array.isArray(base.documents) ? base.documents : []);

    const merged = {
      ...base,
      ...parsed,
      id: parsed.id || base.id,
      year: parseInt(parsed.year, 10) || base.year,
      odometer: parseInt(parsed.odometer, 10) || base.odometer,
      modelPath: isDemo ? '/eon.glb' : null,
      documents: docs
    };

    VEHICLES[0] = merged;
    return merged;
  } catch (e) {
    console.warn('Error reading vehicle profile from localStorage:', e);
    return null;
  }
}

/**
 * Save or update vehicle profile in localStorage
 */
export function saveStoredVehicle(profileData) {
  try {
    const base = VEHICLES[0];
    const isDemo =
      (profileData.make || '').toLowerCase() === 'hyundai' &&
      (profileData.model || '').toLowerCase() === 'eon';

    // Retain existing documents from profileData, stored profile, or base
    let existingDocs = [];
    if (Array.isArray(profileData.documents)) {
      existingDocs = profileData.documents;
    } else {
      const stored = getStoredVehicle();
      if (stored && Array.isArray(stored.documents)) {
        existingDocs = stored.documents;
      } else if (Array.isArray(base.documents)) {
        existingDocs = base.documents;
      }
    }

    const vehicleObj = {
      id: base.id,
      ownerName: (profileData.ownerName || '').trim(),
      make: (profileData.make || 'Hyundai').trim(),
      model: (profileData.model || 'Eon').trim(),
      variant: profileData.variant || (isDemo ? base.variant : ''),
      year: parseInt(profileData.year, 10) || 2019,
      odometer: parseInt(profileData.odometer, 10) || 0,
      registrationNumber: (profileData.registrationNumber || '').trim(),
      vin: profileData.vin || base.vin,
      fuelType: profileData.fuelType || base.fuelType,
      transmission: profileData.transmission || base.transmission,
      color: profileData.color || base.color,
      modelPath: isDemo ? '/eon.glb' : null,
      documents: existingDocs
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicleObj));
    VEHICLES[0] = vehicleObj;
    return vehicleObj;
  } catch (e) {
    console.error('Error saving vehicle profile to localStorage:', e);
    return null;
  }
}

/**
 * Clear stored vehicle profile (e.g. for reset/testing)
 */
export function clearStoredVehicle() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Error clearing vehicle profile:', e);
  }
}

/**
 * Completely reset vehicle profile and documents to default state
 */
export function resetVehicleData() {
  clearStoredVehicle();
  VEHICLES[0] = {
    id: 'veh-001',
    make: 'Hyundai',
    model: 'Eon',
    variant: 'D-Lite+',
    year: 2019,
    odometer: 61240,
    registrationNumber: 'MH-01-AB-1234',
    vin: 'MALAA51BLFM129841',
    fuelType: 'Petrol',
    transmission: '5-Speed Manual',
    color: 'Sleek Silver',
    modelPath: '/eon.glb',
    documents: []
  };
}

export function getVehicleById(id = DEFAULT_VEHICLE_ID) {
  const stored = getStoredVehicle();
  if (stored && stored.id === id) return stored;
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

export function getDefaultVehicle() {
  return getStoredVehicle() || VEHICLES[0];
}

/**
 * Get all vehicle documents
 */
export function getVehicleDocuments(vehicleId = DEFAULT_VEHICLE_ID) {
  const vehicle = getVehicleById(vehicleId);
  return vehicle ? (vehicle.documents || []) : [];
}

/**
 * Dynamically calculate expiry status and days remaining
 *
 * Rules:
 * > 30 days: Active
 * 1–30 days: Expiring soon
 * <= 0 days: Expired
 */
export function calculateExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) {
    return {
      status: 'Unknown',
      badgeClass: 'badge-status-unknown',
      label: 'No expiry date',
      daysUntilExpiry: null,
      isExpired: false
    };
  }

  // Normalize date parsing (handles 'YYYY-MM-DD', 'DD Mon YYYY', etc.)
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      status: 'Unknown',
      badgeClass: 'badge-status-unknown',
      label: expiryDateStr,
      daysUntilExpiry: null,
      isExpired: false
    };
  }

  expiry.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry > 30) {
    return {
      status: 'Active',
      badgeClass: 'badge-status-active',
      label: `${daysUntilExpiry} days remaining`,
      daysUntilExpiry,
      isExpired: false
    };
  } else if (daysUntilExpiry >= 1 && daysUntilExpiry <= 30) {
    return {
      status: 'Expiring soon',
      badgeClass: 'badge-status-warning',
      label: `${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} remaining`,
      daysUntilExpiry,
      isExpired: false
    };
  } else {
    const daysAgo = Math.abs(daysUntilExpiry);
    return {
      status: 'Expired',
      badgeClass: 'badge-status-expired',
      label: daysAgo === 0 ? 'Expires today' : `Expired ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`,
      daysUntilExpiry,
      isExpired: true
    };
  }
}

/**
 * Update or add a vehicle statutory document (Insurance / PUC)
 * Ensures no duplicates are created for the same category.
 */
export function updateVehicleDocument(vehicleId = DEFAULT_VEHICLE_ID, documentCategory, docData) {
  let vehicle = getStoredVehicle() || VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
  if (!vehicle) return null;

  const currentDocs = Array.isArray(vehicle.documents) ? [...vehicle.documents] : [];

  const categoryNorm = (documentCategory || '').toLowerCase();
  const isPuc = categoryNorm === 'puc';
  const docType = isPuc ? 'PUC' : 'Insurance';

  // Find existing document for this category (case-insensitive check)
  const existingIndex = currentDocs.findIndex(
    (d) => (d.type || '').toLowerCase() === (isPuc ? 'puc' : 'insurance')
  );

  const newDoc = {
    id: existingIndex >= 0 ? currentDocs[existingIndex].id : `doc-${isPuc ? 'puc' : 'ins'}-${Date.now()}`,
    title: docData.title || (isPuc ? 'Pollution Under Control (PUC)' : 'Motor Vehicle Insurance'),
    type: docType,
    issuer: docData.issuer || (isPuc ? 'Authorized Testing Centre' : 'Insurance Provider'),
    policyNumber: !isPuc ? (docData.policyNumber || null) : null,
    certificateNumber: isPuc ? (docData.certificateNumber || null) : null,
    registrationNumber: docData.registrationNumber || vehicle.registrationNumber,
    startDate: docData.startDate || null,
    expiryDate: docData.expiryDate || null,
    document: docData.document
      ? {
          name: docData.document.name,
          type: docData.document.type,
          size: docData.document.size,
          url: docData.document.url || null
        }
      : null,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    currentDocs[existingIndex] = newDoc;
  } else {
    currentDocs.push(newDoc);
  }

  // Update vehicle object
  const updatedVehicle = {
    ...vehicle,
    documents: currentDocs
  };

  // Persist to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let profileToSave = updatedVehicle;
    if (raw) {
      const parsed = JSON.parse(raw);
      profileToSave = {
        ...parsed,
        documents: currentDocs
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileToSave));
    vehicle = profileToSave;
  } catch (err) {
    console.error('Failed to save updated vehicle document to localStorage:', err);
  }

  // Update in-memory VEHICLES[0]
  VEHICLES[0] = updatedVehicle;

  // Return both doc properties and reference to updatedVehicle for callers
  return {
    ...newDoc,
    savedDoc: newDoc,
    updatedVehicle
  };
}
