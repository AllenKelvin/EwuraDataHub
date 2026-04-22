export interface Product {
  id: string;
  network: "MTN" | "Telecel" | "AirtelTigo";
  type: "airtime" | "data";
  name: string;
  description: string;
  userPrice: number;
  agentPrice: number;
  value: string;
}

export const products: Product[] = [
  // ─── MTN Airtime ───
  { id: "mtn-airtime-1",   network: "MTN", type: "airtime", name: "GHS 1 Airtime",  description: "MTN GHS 1 Airtime",  userPrice: 1.00,  agentPrice: 0.92,  value: "1"   },
  { id: "mtn-airtime-2",   network: "MTN", type: "airtime", name: "GHS 2 Airtime",  description: "MTN GHS 2 Airtime",  userPrice: 2.00,  agentPrice: 1.84,  value: "2"   },
  { id: "mtn-airtime-5",   network: "MTN", type: "airtime", name: "GHS 5 Airtime",  description: "MTN GHS 5 Airtime",  userPrice: 5.00,  agentPrice: 4.60,  value: "5"   },
  { id: "mtn-airtime-10",  network: "MTN", type: "airtime", name: "GHS 10 Airtime", description: "MTN GHS 10 Airtime", userPrice: 10.00, agentPrice: 9.20,  value: "10"  },
  { id: "mtn-airtime-20",  network: "MTN", type: "airtime", name: "GHS 20 Airtime", description: "MTN GHS 20 Airtime", userPrice: 20.00, agentPrice: 18.40, value: "20"  },
  { id: "mtn-airtime-50",  network: "MTN", type: "airtime", name: "GHS 50 Airtime", description: "MTN GHS 50 Airtime", userPrice: 50.00, agentPrice: 46.00, value: "50"  },

  // ─── MTN Data ───
  { id: "mtn-data-100mb",  network: "MTN", type: "data", name: "100MB / 1 Day",    description: "MTN 100MB Data — 1 day validity",    userPrice: 0.50,  agentPrice: 0.44,  value: "100MB"  },
  { id: "mtn-data-500mb",  network: "MTN", type: "data", name: "500MB / 3 Days",   description: "MTN 500MB Data — 3 days validity",   userPrice: 1.80,  agentPrice: 1.60,  value: "500MB"  },
  { id: "mtn-data-1gb",    network: "MTN", type: "data", name: "1GB / 7 Days",     description: "MTN 1GB Data — 7 days validity",     userPrice: 4.20,  agentPrice: 3.80,  value: "1GB"    },
  { id: "mtn-data-2gb",    network: "MTN", type: "data", name: "2GB / 14 Days",    description: "MTN 2GB Data — 14 days validity",    userPrice: 7.50,  agentPrice: 6.75,  value: "2GB"    },
  { id: "mtn-data-3gb",    network: "MTN", type: "data", name: "3GB / 30 Days",    description: "MTN 3GB Data — 30 days validity",    userPrice: 10.00, agentPrice: 9.00,  value: "3GB"    },
  { id: "mtn-data-5gb",    network: "MTN", type: "data", name: "5GB / 30 Days",    description: "MTN 5GB Data — 30 days validity",    userPrice: 16.00, agentPrice: 14.40, value: "5GB"    },
  { id: "mtn-data-10gb",   network: "MTN", type: "data", name: "10GB / 30 Days",   description: "MTN 10GB Data — 30 days validity",   userPrice: 30.00, agentPrice: 27.00, value: "10GB"   },
  { id: "mtn-data-20gb",   network: "MTN", type: "data", name: "20GB / 30 Days",   description: "MTN 20GB Data — 30 days validity",   userPrice: 55.00, agentPrice: 49.50, value: "20GB"   },

  // ─── Telecel Airtime ───
  { id: "telecel-airtime-1",   network: "Telecel", type: "airtime", name: "GHS 1 Airtime",  description: "Telecel GHS 1 Airtime",  userPrice: 1.00,  agentPrice: 0.92,  value: "1"  },
  { id: "telecel-airtime-2",   network: "Telecel", type: "airtime", name: "GHS 2 Airtime",  description: "Telecel GHS 2 Airtime",  userPrice: 2.00,  agentPrice: 1.84,  value: "2"  },
  { id: "telecel-airtime-5",   network: "Telecel", type: "airtime", name: "GHS 5 Airtime",  description: "Telecel GHS 5 Airtime",  userPrice: 5.00,  agentPrice: 4.60,  value: "5"  },
  { id: "telecel-airtime-10",  network: "Telecel", type: "airtime", name: "GHS 10 Airtime", description: "Telecel GHS 10 Airtime", userPrice: 10.00, agentPrice: 9.20,  value: "10" },
  { id: "telecel-airtime-20",  network: "Telecel", type: "airtime", name: "GHS 20 Airtime", description: "Telecel GHS 20 Airtime", userPrice: 20.00, agentPrice: 18.40, value: "20" },
  { id: "telecel-airtime-50",  network: "Telecel", type: "airtime", name: "GHS 50 Airtime", description: "Telecel GHS 50 Airtime", userPrice: 50.00, agentPrice: 46.00, value: "50" },

  // ─── Telecel Data ───
  { id: "telecel-data-100mb",  network: "Telecel", type: "data", name: "100MB / 1 Day",   description: "Telecel 100MB Data — 1 day validity",   userPrice: 0.50,  agentPrice: 0.44,  value: "100MB" },
  { id: "telecel-data-500mb",  network: "Telecel", type: "data", name: "500MB / 3 Days",  description: "Telecel 500MB Data — 3 days validity",  userPrice: 1.80,  agentPrice: 1.60,  value: "500MB" },
  { id: "telecel-data-1gb",    network: "Telecel", type: "data", name: "1GB / 7 Days",    description: "Telecel 1GB Data — 7 days validity",    userPrice: 4.00,  agentPrice: 3.60,  value: "1GB"   },
  { id: "telecel-data-2gb",    network: "Telecel", type: "data", name: "2GB / 14 Days",   description: "Telecel 2GB Data — 14 days validity",   userPrice: 7.00,  agentPrice: 6.30,  value: "2GB"   },
  { id: "telecel-data-3gb",    network: "Telecel", type: "data", name: "3GB / 30 Days",   description: "Telecel 3GB Data — 30 days validity",   userPrice: 9.50,  agentPrice: 8.55,  value: "3GB"   },
  { id: "telecel-data-5gb",    network: "Telecel", type: "data", name: "5GB / 30 Days",   description: "Telecel 5GB Data — 30 days validity",   userPrice: 15.00, agentPrice: 13.50, value: "5GB"   },
  { id: "telecel-data-10gb",   network: "Telecel", type: "data", name: "10GB / 30 Days",  description: "Telecel 10GB Data — 30 days validity",  userPrice: 28.00, agentPrice: 25.20, value: "10GB"  },

  // ─── AirtelTigo Airtime ───
  { id: "at-airtime-1",   network: "AirtelTigo", type: "airtime", name: "GHS 1 Airtime",  description: "AirtelTigo GHS 1 Airtime",  userPrice: 1.00,  agentPrice: 0.92,  value: "1"  },
  { id: "at-airtime-2",   network: "AirtelTigo", type: "airtime", name: "GHS 2 Airtime",  description: "AirtelTigo GHS 2 Airtime",  userPrice: 2.00,  agentPrice: 1.84,  value: "2"  },
  { id: "at-airtime-5",   network: "AirtelTigo", type: "airtime", name: "GHS 5 Airtime",  description: "AirtelTigo GHS 5 Airtime",  userPrice: 5.00,  agentPrice: 4.60,  value: "5"  },
  { id: "at-airtime-10",  network: "AirtelTigo", type: "airtime", name: "GHS 10 Airtime", description: "AirtelTigo GHS 10 Airtime", userPrice: 10.00, agentPrice: 9.20,  value: "10" },
  { id: "at-airtime-20",  network: "AirtelTigo", type: "airtime", name: "GHS 20 Airtime", description: "AirtelTigo GHS 20 Airtime", userPrice: 20.00, agentPrice: 18.40, value: "20" },
  { id: "at-airtime-50",  network: "AirtelTigo", type: "airtime", name: "GHS 50 Airtime", description: "AirtelTigo GHS 50 Airtime", userPrice: 50.00, agentPrice: 46.00, value: "50" },

  // ─── AirtelTigo Data ───
  { id: "at-data-100mb",  network: "AirtelTigo", type: "data", name: "100MB / 1 Day",   description: "AirtelTigo 100MB Data — 1 day validity",   userPrice: 0.50,  agentPrice: 0.44,  value: "100MB" },
  { id: "at-data-500mb",  network: "AirtelTigo", type: "data", name: "500MB / 3 Days",  description: "AirtelTigo 500MB Data — 3 days validity",  userPrice: 1.80,  agentPrice: 1.60,  value: "500MB" },
  { id: "at-data-1gb",    network: "AirtelTigo", type: "data", name: "1GB / 7 Days",    description: "AirtelTigo 1GB Data — 7 days validity",    userPrice: 4.50,  agentPrice: 4.05,  value: "1GB"   },
  { id: "at-data-2gb",    network: "AirtelTigo", type: "data", name: "2GB / 14 Days",   description: "AirtelTigo 2GB Data — 14 days validity",   userPrice: 8.00,  agentPrice: 7.20,  value: "2GB"   },
  { id: "at-data-3gb",    network: "AirtelTigo", type: "data", name: "3GB / 30 Days",   description: "AirtelTigo 3GB Data — 30 days validity",   userPrice: 11.00, agentPrice: 9.90,  value: "3GB"   },
  { id: "at-data-5gb",    network: "AirtelTigo", type: "data", name: "5GB / 30 Days",   description: "AirtelTigo 5GB Data — 30 days validity",   userPrice: 17.00, agentPrice: 15.30, value: "5GB"   },
  { id: "at-data-10gb",   network: "AirtelTigo", type: "data", name: "10GB / 30 Days",  description: "AirtelTigo 10GB Data — 30 days validity",  userPrice: 32.00, agentPrice: 28.80, value: "10GB"  },
];

