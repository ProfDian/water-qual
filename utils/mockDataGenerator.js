// Generate realistic sensor data
function generateMockReading() {
  return {
    timestamp: new Date(),
    inlet: {
      ph: (6.5 + Math.random() * 2).toFixed(2), // 6.5-8.5
      tds: Math.floor(400 + Math.random() * 300), // 400-700 ppm
      turbidity: Math.floor(100 + Math.random() * 200), // 100-300 NTU
      temperature: (26 + Math.random() * 4).toFixed(1), // 26-30°C
    },
    outlet: {
      ph: (7.0 + Math.random() * 1).toFixed(2), // 7.0-8.0
      tds: Math.floor(250 + Math.random() * 150), // 250-400 ppm (reduced)
      turbidity: Math.floor(50 + Math.random() * 80), // 50-130 NTU (reduced)
      temperature: (25 + Math.random() * 3).toFixed(1),
    },
  };
}
