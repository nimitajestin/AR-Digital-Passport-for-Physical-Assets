window.ARDigitalPassportConfig = {
  appName: "AR Digital Passport",
  apiBaseUrl: (window.ENV && window.ENV.API_BASE_URL) ? window.ENV.API_BASE_URL : "/api",
  assets: [
    {
      id: "AST-001",
      name: "Projector",
      category: "AV Equipment",
      location: "CL-6",
      status: "operational",
      description: "Classroom projector used for lectures, presentations, and live demonstrations.",
      imageUrl: "",
      modelUrl: "",
      lastMaintenance: "2026-09-18",
      nextMaintenance: "2026-12-18",
      markerId: "projector-marker"
    },
    {
      id: "AST-002",
      name: "Air Purifier",
      category: "Facilities",
      location: "Lab-2",
      status: "operational",
      description: "High-efficiency air purifier supporting ventilation and indoor air quality.",
      imageUrl: "",
      modelUrl: "",
      lastMaintenance: "2026-08-27",
      nextMaintenance: "2026-11-27",
      markerId: "purifier-marker"
    },
    {
      id: "AST-003",
      name: "3D Printer",
      category: "Maker Lab",
      location: "Workshop A",
      status: "maintenance",
      description: "Prototype fabrication unit used for rapid model building and testing.",
      imageUrl: "",
      modelUrl: "",
      lastMaintenance: "2026-09-03",
      nextMaintenance: "2026-10-20",
      markerId: "printer-marker"
    }
  ],
  targetDefinitions: [
    { index: 0, markerId: "projector-marker", label: "Projector" },
    { index: 1, markerId: "purifier-marker", label: "Air Purifier" },
    { index: 2, markerId: "printer-marker", label: "3D Printer" }
  ],
  mindarTargetPath: "./assets/targets/placeholder-target.mind"
};
