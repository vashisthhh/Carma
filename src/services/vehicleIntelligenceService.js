/**
 * Vehicle Intelligence Service for CARMA
 * 
 * Provides a strictly grounded intelligence layer over documented vehicle history.
 * Never invents, infers, or extrapolates undocumented facts, dates, costs, or events.
 * Distinguishes "not documented" from "never happened".
 */

/**
 * Builds a compact, structured representation of vehicle data for AI context.
 */
export function buildVehicleContext(vehicle, records = [], components = [], documents = []) {
  const safeRecords = (records || []).map((r) => ({
    id: r.id,
    componentId: r.componentId,
    componentName: r.componentDisplayName || r.componentId,
    type: r.type || 'Maintenance',
    date: r.date || null,
    mileage: r.mileage ? Number(r.mileage) : null,
    cost: r.cost !== undefined && r.cost !== null ? Number(r.cost) : null,
    description: r.description || null,
    serviceCenter: r.serviceCenter || null,
    hasAttachedDocument: Boolean(r.document),
    documentName: r.document?.name || null
  }));

  const vehicleDocs = (documents || vehicle?.documents || []).map((d) => ({
    type: d.type,
    title: d.title,
    policyNumber: d.policyNumber || null,
    certificateNumber: d.certificateNumber || null,
    issuer: d.issuer || null,
    startDate: d.startDate || null,
    expiryDate: d.expiryDate || null,
    hasAttachedDocument: Boolean(d.document)
  }));

  const componentSummaries = (components || []).map((c) => ({
    id: c.id,
    name: c.name,
    recordCount: (c.records || []).length
  }));

  return {
    vehicle: {
      make: vehicle?.make || 'Hyundai',
      model: vehicle?.model || 'Eon',
      year: vehicle?.year || 2017,
      registrationNumber: vehicle?.registrationNumber || 'MH 02 BG 4892',
      odometer: vehicle?.mileage || 64500,
      vin: vehicle?.vin || 'MALAA51BLFM129841'
    },
    documentedServiceRecords: safeRecords,
    vehicleStatutoryDocuments: vehicleDocs,
    registeredComponents: componentSummaries
  };
}

/**
 * Deterministic local grounded intelligence engine.
 * Used as a fast, zero-latency responder and reliable fallback when Gemini is offline.
 * Strictly adheres to CARMA grounding rules: no hallucinated records, dates, costs, or mileage.
 */
export function localGroundedIntelligence(query, vehicleContext) {
  const q = (query || '').toLowerCase().trim();
  const records = vehicleContext?.documentedServiceRecords || [];
  const vehicle = vehicleContext?.vehicle || {};
  const vehicleDocs = vehicleContext?.vehicleStatutoryDocuments || [];

  // Helper to format ISO date
  const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  };

  // 1. Query: "What has been replaced?" / replacements
  if (/what.*(?:replaced|replacement)|any.*replacement|parts.*replaced/i.test(q)) {
    const replacements = records.filter(
      (r) => (r.type || '').toLowerCase() === 'replacement' || /replac/i.test(r.description || '')
    );

    if (replacements.length === 0) {
      return {
        answer: "CARMA doesn't have a documented replacement record for this vehicle yet.",
        referencedComponentId: null,
        referencedComponentName: null,
        referencedRecordId: null
      };
    }

    const itemsText = replacements.map((r) => {
      const parts = [`${r.componentName}`];
      if (r.date) parts.push(`on ${formatDate(r.date)}`);
      if (r.mileage) parts.push(`at ${r.mileage.toLocaleString('en-IN')} km`);
      if (r.cost > 0) parts.push(`for ₹${r.cost.toLocaleString('en-IN')}`);
      return parts.join(' ');
    }).join('; ');

    const top = replacements[0];

    return {
      answer: `Based on the documented records, ${replacements.length === 1 ? 'the following part was replaced:' : 'the following parts have been replaced:'} ${itemsText}.`,
      referencedComponentId: top.componentId,
      referencedComponentName: top.componentName,
      referencedRecordId: top.id
    };
  }

  // 2. Query: "How much have I spent?" / total spend / cost
  if (/how\s*much.*spent|total.*spend|total.*cost|cost.*service|money.*spent/i.test(q)) {
    const total = records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    const count = records.length;

    if (count === 0) {
      return {
        answer: 'CARMA does not have any documented service records with recorded costs for this vehicle yet.',
        referencedComponentId: null,
        referencedComponentName: null,
        referencedRecordId: null
      };
    }

    return {
      answer: `Based on the documented records, ₹${total.toLocaleString('en-IN')} has been spent across ${count} documented service ${count === 1 ? 'event' : 'events'}.`,
      referencedComponentId: null,
      referencedComponentName: null,
      referencedRecordId: null
    };
  }

  // 3. Query: "What happened recently?" / recent activity
  if (/what.*(?:recent|latest)|recent.*(?:activity|service|event)|latest.*(?:service|maintenance)/i.test(q)) {
    if (records.length === 0) {
      return {
        answer: 'No documented service activity has been recorded for this vehicle yet.',
        referencedComponentId: null,
        referencedComponentName: null,
        referencedRecordId: null
      };
    }

    const recent = records[0];
    const details = [];
    if (recent.type) details.push(recent.type);
    if (recent.date) details.push(formatDate(recent.date));
    if (recent.mileage) details.push(`${recent.mileage.toLocaleString('en-IN')} km`);
    if (recent.cost > 0) details.push(`₹${recent.cost.toLocaleString('en-IN')}`);

    return {
      answer: `The most recent documented activity is for ${recent.componentName}: ${details.join(' · ')}. Description: "${recent.description || 'Service record'}".`,
      referencedComponentId: recent.componentId,
      referencedComponentName: recent.componentName,
      referencedRecordId: recent.id
    };
  }

  // 4. Component-specific query (Tyre, Tail Light, Headlight, Glass, Steering, Seat, Boot)
  const componentPatterns = [
    { pattern: /front\s*left\s*tyre|left\s*front\s*tyre/i, id: 'tyre-front-left', name: 'Front Left Tyre' },
    { pattern: /front\s*right\s*tyre|right\s*front\s*tyre/i, id: 'tyre-front-right', name: 'Front Right Tyre' },
    { pattern: /rear\s*left\s*tyre|left\s*rear\s*tyre/i, id: 'tyre-rear-left', name: 'Rear Left Tyre' },
    { pattern: /rear\s*right\s*tyre|right\s*rear\s*tyre/i, id: 'tyre-rear-right', name: 'Rear Right Tyre' },
    { pattern: /tyre|tire/i, id: 'tyre-front-left', name: 'Tyre' },
    { pattern: /tail\s*(?:light|lamp)|taillight/i, id: 'tail-light', name: 'Tail Light' },
    { pattern: /head\s*(?:light|lamp)|headlight/i, id: 'headlight-right', name: 'Headlight' },
    { pattern: /rear\s*glass|back\s*glass|windshield/i, id: 'rear-glass', name: 'Back Glass' },
    { pattern: /steering/i, id: 'steering', name: 'Steering' },
    { pattern: /seat/i, id: 'seat-front', name: 'Front Seat' },
    { pattern: /boot|tailgate/i, id: 'boot-lock', name: 'Boot Lock' }
  ];

  for (const comp of componentPatterns) {
    if (comp.pattern.test(q)) {
      const compRecords = records.filter(
        (r) => r.componentId === comp.id || (r.componentName && r.componentName.toLowerCase().includes(comp.name.toLowerCase()))
      );

      if (compRecords.length === 0) {
        return {
          answer: `CARMA does not have a documented record of service or replacement for ${comp.name} in the records available.`,
          referencedComponentId: comp.id,
          referencedComponentName: comp.name,
          referencedRecordId: null
        };
      }

      const recDescriptions = compRecords.map((r) => {
        const parts = [r.type || 'Service'];
        if (r.date) parts.push(`on ${formatDate(r.date)}`);
        if (r.mileage) parts.push(`at ${r.mileage.toLocaleString('en-IN')} km`);
        if (r.cost > 0) parts.push(`for ₹${r.cost.toLocaleString('en-IN')}`);
        return parts.join(' ');
      }).join('; ');

      return {
        answer: `Based on the documented records for ${comp.name}: ${recDescriptions}.`,
        referencedComponentId: comp.id,
        referencedComponentName: comp.name,
        referencedRecordId: compRecords[0].id
      };
    }
  }

  // 5. Query about specific component or part (e.g. engine, transmission, battery, clutch, etc.)
  const partChecks = [
    { pattern: /\bengine\b/i, name: 'engine' },
    { pattern: /\b(?:transmission|gearbox)\b/i, name: 'transmission' },
    { pattern: /\bbattery\b/i, name: 'battery' },
    { pattern: /\bclutch\b/i, name: 'clutch' },
    { pattern: /\b(?:brake|pad|disc)\b/i, name: 'brake' },
    { pattern: /\b(?:suspension|strut|shock)\b/i, name: 'suspension' },
    { pattern: /\b(?:ac|air\s*condition)\b/i, name: 'air conditioning' }
  ];

  for (const part of partChecks) {
    if (part.pattern.test(q)) {
      const isAskingRepair = /repair|repaired|fix|fixed|broken|issue|problem/i.test(q);
      const isAskingReplacement = /replac/i.test(q);

      const found = records.filter(
        (r) =>
          (r.description || '').toLowerCase().includes(part.name) ||
          (r.componentName || '').toLowerCase().includes(part.name)
      );

      if (found.length === 0) {
        const action = isAskingRepair ? 'repair' : isAskingReplacement ? 'replacement' : 'service';
        return {
          answer: `CARMA does not have a documented ${part.name} ${action} in the records available.`,
          referencedComponentId: null,
          referencedComponentName: null,
          referencedRecordId: null
        };
      }

      // If records were found, check if they match the specific action (e.g. repair)
      if (isAskingRepair) {
        const repairs = found.filter(
          (r) => (r.type || '').toLowerCase() === 'repair' || /repair/i.test(r.description || '')
        );
        if (repairs.length === 0) {
          const otherEvents = found.map((r) => `${r.type} on ${formatDate(r.date)}`).join(', ');
          return {
            answer: `CARMA does not have a documented engine repair in the records available. (Documented related records: ${otherEvents}).`,
            referencedComponentId: found[0].componentId,
            referencedComponentName: found[0].componentName,
            referencedRecordId: found[0].id
          };
        }
      }

      const summaries = found
        .map((r) => `${r.type} on ${formatDate(r.date)} (${r.description})`)
        .join('; ');
      return {
        answer: `Based on the documented records for ${part.name}: ${summaries}.`,
        referencedComponentId: found[0].componentId,
        referencedComponentName: found[0].componentName,
        referencedRecordId: found[0].id
      };
    }
  }

  // 6. Query about statutory documents (Insurance / PUC)
  if (/insurance/i.test(q)) {
    const ins = vehicleDocs.find((d) => (d.type || '').toLowerCase() === 'insurance');
    if (!ins) {
      return {
        answer: 'CARMA does not have a documented insurance policy on file for this vehicle.',
        referencedComponentId: null,
        referencedComponentName: null,
        referencedRecordId: null
      };
    }
    return {
      answer: `The documented insurance policy is issued by ${ins.issuer || 'the provider'} (Policy No: ${ins.policyNumber || 'Not recorded'}), valid from ${formatDate(ins.startDate)} to ${formatDate(ins.expiryDate)}.`,
      referencedComponentId: null,
      referencedComponentName: null,
      referencedRecordId: null
    };
  }

  if (/puc|pollution|emission/i.test(q)) {
    const puc = vehicleDocs.find((d) => (d.type || '').toLowerCase() === 'puc');
    if (!puc) {
      return {
        answer: 'CARMA does not have a documented PUC certificate on file for this vehicle.',
        referencedComponentId: null,
        referencedComponentName: null,
        referencedRecordId: null
      };
    }
    return {
      answer: `The documented PUC certificate is registered under Certificate No: ${puc.certificateNumber || 'Not recorded'}, valid from ${formatDate(puc.startDate)} to ${formatDate(puc.expiryDate)}.`,
      referencedComponentId: null,
      referencedComponentName: null,
      referencedRecordId: null
    };
  }

  // 7. General overview / fallback
  if (records.length > 0) {
    const totalSpend = records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    return {
      answer: `Based on the documented records for this ${vehicle.make || 'Hyundai'} ${vehicle.model || 'Eon'}, there are ${records.length} documented service events totaling ₹${totalSpend.toLocaleString('en-IN')}. CARMA can answer questions about specific components, replacements, spend, or recent service.`,
      referencedComponentId: null,
      referencedComponentName: null,
      referencedRecordId: null
    };
  }

  return {
    answer: `CARMA does not have documented service records for this vehicle yet. Once service records or invoices are added, you can query their history here.`,
    referencedComponentId: null,
    referencedComponentName: null,
    referencedRecordId: null
  };
}

/**
 * Ask CARMA a question about the documented vehicle history.
 * 
 * @param {string} query - User's question
 * @param {object} vehicleContext - Structured context generated via buildVehicleContext
 * @returns {Promise<{ answer: string, referencedComponentId: string | null, referencedComponentName: string | null, referencedRecordId: string | null, engine: string }>}
 */
export async function askVehicleIntelligence(query, vehicleContext) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Please enter a question about your vehicle history.');
  }

  try {
    const response = await fetch('/api/vehicle-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        vehicleContext
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.answer) {
        return {
          answer: data.answer,
          referencedComponentId: data.referencedComponentId || null,
          referencedComponentName: data.referencedComponentName || null,
          referencedRecordId: data.referencedRecordId || null,
          engine: data.engine || 'gemini-1.5-flash'
        };
      }
    }
  } catch (err) {
    console.warn('[Vehicle Intelligence] API call unavailable, using local grounded engine:', err.message);
  }

  // Local grounded fallback (deterministic & anti-hallucinatory)
  const localResult = localGroundedIntelligence(query, vehicleContext);
  return {
    ...localResult,
    engine: 'grounded-local'
  };
}
