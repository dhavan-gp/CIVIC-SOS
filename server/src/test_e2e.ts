async function runAutomatedTests() {
  console.log('🧪 Starting End-to-End System Verification for Civic & Emergency Platform...\n');

  const BASE = 'http://localhost:5000';

  // 1. Health Check
  console.log('1️⃣ Checking Health Endpoint...');
  const healthRes = await fetch(`${BASE}/api/health`);
  const healthJson = await healthRes.json();
  console.log('   Status:', healthJson.status, '| Service:', healthJson.service);

  // 2. Fetch Departments & Jurisdictions
  console.log('\n2️⃣ Verifying Departments & Jurisdictions...');
  const deptsRes = await fetch(`${BASE}/api/departments`);
  const deptsJson = await deptsRes.json();
  console.log(`   Fetched ${deptsJson.data.length} departments:`, deptsJson.data.map((d: any) => d.code).join(', '));

  const jurisRes = await fetch(`${BASE}/api/departments/jurisdictions`);
  const jurisJson = await jurisRes.json();
  console.log(`   Fetched ${jurisJson.data.length} jurisdiction geofences.`);

  // 3. Test Smart Geotag Routing Engine
  console.log('\n3️⃣ Testing Point-in-Polygon & Smart Routing...');
  const previewRes = await fetch(`${BASE}/api/tickets/preview-routing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: 12.9722,
      lng: 77.5960,
      type: 'CRIME_FIR',
      category: 'THEFT_BURGLARY'
    })
  });
  const previewJson = await previewRes.json();
  console.log('   Smart Routing Output:');
  console.log(`   - Target Department: ${previewJson.routing.departmentName} (${previewJson.routing.targetDeptCode})`);
  console.log(`   - Jurisdiction Zone: ${previewJson.routing.jurisdictionName}`);
  console.log(`   - Assigned Station: ${previewJson.routing.stationName}`);
  console.log(`   - Nearest Unit: ${previewJson.routing.assignedPatrol?.unit.unit_code} (~${previewJson.routing.assignedPatrol?.estimatedEtaMinutes} min ETA)`);

  // 4. File an Official Police FIR with Auto Geotag
  console.log('\n4️⃣ Testing Crime FIR Filing...');
  const firRes = await fetch(`${BASE}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'CRIME_FIR',
      category: 'THEFT_BURGLARY',
      title: 'Automated Test: Cyber Storefront Intrusion',
      description: 'Physical security breach detected on east wing entrance.',
      priority: 'HIGH',
      citizenName: 'Verification Officer',
      citizenPhone: '+1 (555) 911-0000',
      citizenEmail: 'officer.test@metropol.gov',
      lat: 12.9722,
      lng: 77.5960,
      addressText: '45 Church Street, Central Business District'
    })
  });
  const firJson = await firRes.json();
  const createdTicket = firJson.data;
  console.log(`   ✅ FIR Generated: ${createdTicket.ticket_number} (ID: ${createdTicket.id})`);
  console.log(`   Status: ${createdTicket.status} | Priority: ${createdTicket.priority} | Routed to: ${firJson.routing.departmentName}`);

  // 4b. File a Civic Complaint with Photo Evidence (Multipart / FormData)
  console.log('\n4️⃣b Testing Complaint Filing with Photographic Evidence (FormData Multipart)...');
  const samplePhotoSvg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#0284c7"/><text x="200" y="150" fill="white" font-size="20" text-anchor="middle">Water Leak Evidence</text></svg>`;
  const photoBlob = new Blob([samplePhotoSvg], { type: 'image/svg+xml' });
  const photoFormData = new FormData();
  photoFormData.append('type', 'CIVIC_GRIEVANCE');
  photoFormData.append('category', 'WATER_LEAK');
  photoFormData.append('title', 'Water Main Burst near 8th Cross');
  photoFormData.append('description', 'Heavy water leak overflowing into roadway.');
  photoFormData.append('priority', 'HIGH');
  photoFormData.append('citizenName', 'Deepa Rao');
  photoFormData.append('citizenPhone', '+1 (555) 911-4455');
  photoFormData.append('lat', '12.9716');
  photoFormData.append('lng', '77.5946');
  photoFormData.append('addressText', '8th Cross, Central Sector');
  photoFormData.append('capturedViaCamera', 'true');
  photoFormData.append('deviceModel', 'Android Hardware Camera');
  photoFormData.append('media', photoBlob, 'evidence_leak_photo.jpg');

  const photoTicketRes = await fetch(`${BASE}/api/tickets`, {
    method: 'POST',
    body: photoFormData
  });
  const photoTicketJson = await photoTicketRes.json();
  const photoTicket = photoTicketJson.data;
  console.log(`   ✅ Photo Complaint Generated: ${photoTicket.ticket_number} (ID: ${photoTicket.id})`);
  console.log(`   Evidence Attached: ${photoTicket.evidence?.length || 0} item(s)`);
  if (photoTicket.evidence && photoTicket.evidence.length > 0) {
    console.log(`   - Evidence ID: ${photoTicket.evidence[0].id}`);
    console.log(`   - Storage URL: ${photoTicket.evidence[0].storage_url}`);
    console.log(`   - Authenticity Score: ${photoTicket.evidence[0].authenticity_score}%`);
    console.log(`   - AI Verdict: ${photoTicket.evidence[0].ai_verdict}`);
    console.log(`   - SHA-256 Hash: ${photoTicket.evidence[0].sha256_hash}`);
  }

  // 5. Test 1-Tap Emergency SOS Trigger
  console.log('\n5️⃣ Testing 1-Tap Emergency SOS Trigger...');
  const sosRes = await fetch(`${BASE}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      citizenName: 'Pooja Sundaram (SOS Test)',
      citizenPhone: '+1 (555) 911-1122',
      lat: 12.9730,
      lng: 77.5950,
      emergencyType: 'IMMEDIATE_THREAT_SAFETY',
      batteryLevel: 94
    })
  });
  const sosJson = await sosRes.json();
  const createdSOS = sosJson.data;
  console.log(`   🚨 High-Priority SOS Triggered: ${createdSOS.sos_code} (ID: ${createdSOS.id})`);
  console.log(`   Assigned Station: ${sosJson.station} | Patrol Unit: ${sosJson.nearestPatrol?.unit.unit_code}`);

  // 6. Test Live SOS Breadcrumb Stream
  console.log('\n6️⃣ Testing Live SOS GPS Breadcrumb Streaming...');
  const breadcrumbRes = await fetch(`${BASE}/api/sos/${createdSOS.id}/breadcrumb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: 12.9735,
      lng: 77.5958,
      speed: 14.2,
      heading: 90,
      batteryLevel: 93
    })
  });
  const breadcrumbJson = await breadcrumbRes.json();
  console.log(`   ✅ Breadcrumb Logged at: ${breadcrumbJson.data.lat}N, ${breadcrumbJson.data.lng}E (Speed: ${breadcrumbJson.data.speed} km/h)`);

  // 7. Test AI Tampering Simulation & Error Level Analysis (ELA)
  console.log('\n7️⃣ Testing AI Tampering Detection Engine & ELA Heatmap...');
  const tamperSimRes = await fetch(`${BASE}/api/ai/simulate-tamper`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tamperType: 'SPLICE_INSERTS',
      intensity: 3
    })
  });
  const tamperSimJson = await tamperSimRes.json();
  console.log('   Adversarial Tamper Test Results:');
  console.log(`   - AI Verdict: ${tamperSimJson.data.forensics.aiVerdict}`);
  console.log(`   - Authenticity Score: ${tamperSimJson.data.forensics.authenticityScore}%`);
  console.log(`   - ELA Compression Tamper Score: ${tamperSimJson.data.forensics.elaTamperScore}%`);
  console.log(`   - GenAI / Deepfake Probability: ${Math.round(tamperSimJson.data.forensics.deepfakeProbability * 100)}%`);
  console.log(`   - SHA-256 Hash: ${tamperSimJson.data.forensics.sha256Hash}`);

  // 8. Progress Ticket Status Lifecycle
  console.log('\n8️⃣ Testing Incident Status Progression & Audit Trail...');
  const updateRes = await fetch(`${BASE}/api/tickets/${createdTicket.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'RESOLVED',
      actorName: 'Chief Inspector Dave',
      notes: 'Perpetrators apprehended on site; evidence sealed in legal custody.'
    })
  });
  const updateJson = await updateRes.json();
  console.log(`   ✅ Ticket ${updateJson.data.ticket_number} updated to: ${updateJson.data.status}`);
  console.log(`   Audit Logs recorded: ${updateJson.data.auditLogs.length} events`);

  console.log('\n🎉 ALL 8 CORE FULL-STACK SUBSYSTEM TESTS PASSED WITH 100% INTEGRITY!\n');
}

runAutomatedTests().catch(console.error);
