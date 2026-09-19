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

export function getVehicleById(id = DEFAULT_VEHICLE_ID) {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

export function getDefaultVehicle() {
  return VEHICLES[0];
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
  const vehicle = getVehicleById(vehicleId);
  if (!vehicle) return null;

  if (!vehicle.documents) {
    vehicle.documents = [];
  }

  const categoryNorm = (documentCategory || '').toLowerCase();
  const isPuc = categoryNorm === 'puc';
  const docType = isPuc ? 'PUC' : 'Insurance';

  // Find existing document for this category
  const existingIndex = vehicle.documents.findIndex(
    (d) => (d.type || '').toLowerCase() === (isPuc ? 'puc' : 'insurance')
  );

  const newDoc = {
    id: existingIndex >= 0 ? vehicle.documents[existingIndex].id : `doc-${isPuc ? 'puc' : 'ins'}-${Date.now()}`,
    title: docData.title || (isPuc ? 'Pollution Under Control (PUC)' : 'Motor Vehicle Insurance'),
    type: docType,
    issuer: docData.issuer || (isPuc ? 'Authorized Testing Centre' : 'Insurance Provider'),
    policyNumber: !isPuc ? (docData.policyNumber || null) : null,
    certificateNumber: isPuc ? (docData.certificateNumber || null) : null,
    registrationNumber: docData.registrationNumber || vehicle.registrationNumber,
    startDate: docData.startDate || null,
    expiryDate: docData.expiryDate || null,
    document: docData.document || null,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    vehicle.documents[existingIndex] = newDoc;
  } else {
    vehicle.documents.push(newDoc);
  }

  return newDoc;
}
