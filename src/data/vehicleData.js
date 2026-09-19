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
    documents: [
      {
        id: 'doc-ins-01',
        title: 'Comprehensive Motor Insurance',
        type: 'Insurance',
        status: 'Active',
        expiryDate: '15 Oct 2026',
        policyNumber: 'POL-2025-984210',
        issuer: 'HDFC ERGO General Insurance'
      },
      {
        id: 'doc-puc-01',
        title: 'Pollution Under Control (PUC)',
        type: 'PUC',
        status: 'Active',
        expiryDate: '04 Dec 2026',
        certificateNumber: 'PUC-MH01-2026-4412',
        issuer: 'Transport Dept. Authorized Centre'
      }
    ]
  }
];

export const DEFAULT_VEHICLE_ID = 'veh-001';

export function getVehicleById(id = DEFAULT_VEHICLE_ID) {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

export function getDefaultVehicle() {
  return VEHICLES[0];
}
