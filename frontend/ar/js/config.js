window.ARDigitalPassportConfig = {
  appName: "AR Digital Passport",
  apiBaseUrl: "http://localhost:8000/api",
  assets: [
    {
      id: "ASSET-001",
      name: "Generator Unit A-17",
      category: "Power Equipment",
      location: "North Plant",
      status: "Operational",
      description: "High-capacity generator unit supporting the main production line.",
      lastMaintenance: "2026-09-10",
      nextMaintenance: "2026-12-10",
      markerId: "marker-001"
    },
    {
      id: "ASSET-002",
      name: "Valve Control B-22",
      category: "Infrastructure",
      location: "Mechanical Bay",
      status: "Needs Inspection",
      description: "Flow control valve with a recent maintenance recommendation.",
      lastMaintenance: "2026-08-12",
      nextMaintenance: "2026-10-18",
      markerId: "marker-002"
    },
    {
      id: "ASSET-003",
      name: "Conveyor System C-09",
      category: "Logistics",
      location: "Packing Zone",
      status: "Operational",
      description: "Packaging conveyor with continuous throughput monitoring.",
      lastMaintenance: "2026-07-20",
      nextMaintenance: "2026-11-20",
      markerId: "marker-003"
    }
  ],
  targetDefinitions: [
    { index: 0, markerId: "marker-001", label: "Marker 1" },
    { index: 1, markerId: "marker-002", label: "Marker 2" },
    { index: 2, markerId: "marker-003", label: "Marker 3" }
  ],
  mindarTargetPath: "./assets/targets/placeholder-target.mind"
};
