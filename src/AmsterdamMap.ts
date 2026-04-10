export type Direction = 'N' | 'S' | 'E' | 'W';
export type SideFill  = 'canal' | 'building' | 'open' | 'park' | 'plaza';
export type EnvType   = 'boulevard' | 'canal_street' | 'alley' | 'bridge' | 'plaza';

/**
 * One outgoing option at a route junction.
 * `direction` is relative to the cyclist's current heading at the junction.
 */
export interface JunctionOption {
  label:             string;
  direction:         'left' | 'straight' | 'right';
  nextTemplateIndex: number;
}

export interface StreetSegment {
  name:          string;        // e.g. "Herengracht (east)"
  startX:        number;        // world X of segment start
  startZ:        number;        // world Z of segment start
  endX:          number;        // world X of segment end
  endZ:          number;        // world Z of segment end
  direction:     Direction;     // travel direction along this segment
  environment:   EnvType;       // affects World.ts rendering style
  leftSide:      SideFill;      // what's to the LEFT of the cyclist
  rightSide:     SideFill;      // what's to the RIGHT of the cyclist
  landmark?:     string;        // optional — e.g. "Anne Frank House"
  landmarkT?:    number;        // 0–1, fractional position along segment
}

export const AMSTERDAM_ROUTE: StreetSegment[] = [
  // --- Damrak (Heading North from Dam Square) ---
  {
    name: "Damrak", startX: 0, startZ: 0, endX: 0, endZ: -150,
    direction: 'N', environment: 'boulevard', leftSide: 'building', rightSide: 'canal',
    landmark: "De Bijenkorf", landmarkT: 0.5
  },
  {
    name: "Damrak", startX: 0, startZ: -150, endX: 0, endZ: -300,
    direction: 'N', environment: 'boulevard', leftSide: 'building', rightSide: 'canal'
  },

  // --- Prins Hendrikkade (Heading West near Centraal Station) ---
  {
    name: "Prins Hendrikkade", startX: 0, startZ: -300, endX: -100, endZ: -300,
    direction: 'W', environment: 'boulevard', leftSide: 'canal', rightSide: 'building',
    landmark: "Centraal Station", landmarkT: 0.5
  },
  {
    name: "Prins Hendrikkade", startX: -100, startZ: -300, endX: -250, endZ: -300,
    direction: 'W', environment: 'boulevard', leftSide: 'canal', rightSide: 'building'
  },

  // --- Singel (Heading South) ---
  {
    name: "Singel", startX: -250, startZ: -300, endX: -250, endZ: -150,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Singel", startX: -250, startZ: -150, endX: -250, endZ: 0,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },

  // --- Raadhuisstraat (Heading West across the inner canals) ---
  {
    name: "Raadhuisstraat", startX: -250, startZ: 0, endX: -400, endZ: 0,
    direction: 'W', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },
  {
    name: "Raadhuisstraat (Bridge)", startX: -400, startZ: 0, endX: -550, endZ: 0,
    direction: 'W', environment: 'bridge', leftSide: 'open', rightSide: 'open'
  },
  {
    name: "Raadhuisstraat", startX: -550, startZ: 0, endX: -700, endZ: 0,
    direction: 'W', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },

  // --- Prinsengracht (Heading South along the outer canal) ---
  {
    name: "Prinsengracht", startX: -700, startZ: 0, endX: -700, endZ: 150,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building',
    landmark: "Anne Frank House", landmarkT: 0.7
  },
  {
    name: "Prinsengracht", startX: -700, startZ: 150, endX: -700, endZ: 350,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building',
    landmark: "Westerkerk", landmarkT: 0.2
  },
  {
    name: "Prinsengracht", startX: -700, startZ: 350, endX: -700, endZ: 500,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Prinsengracht", startX: -700, startZ: 500, endX: -700, endZ: 650,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Prinsengracht", startX: -700, startZ: 650, endX: -700, endZ: 800,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Prinsengracht", startX: -700, startZ: 800, endX: -700, endZ: 950,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },

  // --- Leidsestraat (Heading East back towards the center) ---
  {
    name: "Leidsestraat", startX: -700, startZ: 950, endX: -550, endZ: 950,
    direction: 'E', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },
  {
    name: "Leidsestraat", startX: -550, startZ: 950, endX: -400, endZ: 950,
    direction: 'E', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },

  // --- Keizersgracht (Heading North) ---
  {
    name: "Keizersgracht", startX: -400, startZ: 950, endX: -400, endZ: 800,
    direction: 'N', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Keizersgracht", startX: -400, startZ: 800, endX: -400, endZ: 600,
    direction: 'N', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Keizersgracht", startX: -400, startZ: 600, endX: -400, endZ: 450,
    direction: 'N', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },

  // --- De 9 Straatjes / Runstraat (Heading East) ---
  {
    name: "De 9 Straatjes", startX: -400, startZ: 450, endX: -250, endZ: 450,
    direction: 'E', environment: 'alley', leftSide: 'building', rightSide: 'building'
  },

  // --- Herengracht (Heading South) ---
  {
    name: "Herengracht", startX: -250, startZ: 450, endX: -250, endZ: 600,
    direction: 'S', environment: 'canal_street', leftSide: 'building', rightSide: 'canal'
  },
  {
    name: "Herengracht", startX: -250, startZ: 600, endX: -250, endZ: 800,
    direction: 'S', environment: 'canal_street', leftSide: 'building', rightSide: 'canal'
  },
  {
    name: "Herengracht", startX: -250, startZ: 800, endX: -250, endZ: 950,
    direction: 'S', environment: 'canal_street', leftSide: 'building', rightSide: 'canal'
  },

  // --- Vijzelstraat (Heading East) ---
  {
    name: "Vijzelstraat", startX: -250, startZ: 950, endX: -100, endZ: 950,
    direction: 'E', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },
  {
    name: "Vijzelstraat", startX: -100, startZ: 950, endX: 50, endZ: 950,
    direction: 'E', environment: 'boulevard', leftSide: 'building', rightSide: 'building',
    landmark: "Stadsarchief", landmarkT: 0.5
  },

  // --- Reguliersgracht (Heading North, famous for its line of bridges) ---
  {
    name: "Reguliersgracht", startX: 50, startZ: 950, endX: 50, endZ: 800,
    direction: 'N', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },
  {
    name: "Reguliersgracht", startX: 50, startZ: 800, endX: 50, endZ: 650,
    direction: 'N', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },

  // --- Rembrandtplein Area (Heading East) ---
  {
    name: "Rembrandtplein", startX: 50, startZ: 650, endX: 200, endZ: 650,
    direction: 'E', environment: 'plaza', leftSide: 'plaza', rightSide: 'building',
    landmark: "Rembrandt Statue", landmarkT: 0.5
  },
  {
    name: "Amstelstraat", startX: 200, startZ: 650, endX: 300, endZ: 650,
    direction: 'E', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },

  // --- Amstel / Stopera Area (Heading North) ---
  {
    name: "Amstel", startX: 300, startZ: 650, endX: 300, endZ: 500,
    direction: 'N', environment: 'canal_street', leftSide: 'building', rightSide: 'canal',
    landmark: "Nationale Opera & Ballet", landmarkT: 0.8
  },
  
  // --- Rokin / Nes area (Heading North) ---
  {
    name: "Rokin (South)", startX: 300, startZ: 500, endX: 300, endZ: 300,
    direction: 'N', environment: 'boulevard', leftSide: 'building', rightSide: 'canal'
  },

  // --- Spui Area (Heading West) ---
  {
    name: "Spui", startX: 300, startZ: 300, endX: 150, endZ: 300,
    direction: 'W', environment: 'plaza', leftSide: 'plaza', rightSide: 'building'
  },
  {
    name: "Spui", startX: 150, startZ: 300, endX: 0, endZ: 300,
    direction: 'W', environment: 'plaza', leftSide: 'plaza', rightSide: 'building'
  },

  // --- Rokin / Return to Dam (Heading North) ---
  {
    name: "Rokin (North)", startX: 0, startZ: 300, endX: 0, endZ: 150,
    direction: 'N', environment: 'boulevard', leftSide: 'building', rightSide: 'building'
  },
  {
    name: "Dam Square", startX: 0, startZ: 150, endX: 0, endZ: 0,
    direction: 'N', environment: 'plaza', leftSide: 'plaza', rightSide: 'plaza',
    landmark: "Royal Palace", landmarkT: 0.8
  },

  // ─── Branch 1: IJ Waterfront (templates 36–38) ────────────────────────────
  // Splits after template 1 (Damrak ends at 0,−300).
  // Goes straight north past the waterfront, then rejoins Singel (template 4) at (−250,−300).
  {
    name: "IJ Waterfront North", startX: 0, startZ: -300, endX: 0, endZ: -450,
    direction: 'N', environment: 'boulevard', leftSide: 'building', rightSide: 'canal'
  },
  {
    name: "Westerdokseiland", startX: 0, startZ: -450, endX: -250, endZ: -450,
    direction: 'W', environment: 'canal_street', leftSide: 'canal', rightSide: 'building',
    landmark: "Eye Filmmuseum", landmarkT: 0.6
  },
  {
    name: "Haarlemmer Houttuinen", startX: -250, startZ: -450, endX: -250, endZ: -300,
    direction: 'S', environment: 'alley', leftSide: 'building', rightSide: 'building'
  },

  // ─── Branch 2: Jordaan scenic loop (templates 39–40) ─────────────────────
  // Splits after template 5 (Singel ends at −250,0).
  // Continues south on Leidsegracht, cuts west, then rejoins Prinsengracht
  // at template 11 (−700,350).
  {
    name: "Leidsegracht", startX: -250, startZ: 0, endX: -250, endZ: 350,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building',
    landmark: "Jordaan District", landmarkT: 0.5
  },
  {
    name: "Leidsekade shortcut", startX: -250, startZ: 350, endX: -700, endZ: 350,
    direction: 'W', environment: 'canal_street', leftSide: 'canal', rightSide: 'building'
  },

  // ─── Branch 3: Museumplein loop (templates 41–43) ─────────────────────────
  // Splits after template 14 (bottom of Prinsengracht at −700,950).
  // Continues south past Leidseplein and through Museumplein, then rejoins
  // Keizersgracht at template 17 (−400,950).
  {
    name: "Leidsekade South", startX: -700, startZ: 950, endX: -700, endZ: 1100,
    direction: 'S', environment: 'canal_street', leftSide: 'canal', rightSide: 'building',
    landmark: "Leidseplein", landmarkT: 0.3
  },
  {
    name: "Museumstraat", startX: -700, startZ: 1100, endX: -400, endZ: 1100,
    direction: 'E', environment: 'plaza', leftSide: 'plaza', rightSide: 'building',
    landmark: "Rijksmuseum", landmarkT: 0.4
  },
  {
    name: "Van Baerlestraat", startX: -400, startZ: 1100, endX: -400, endZ: 950,
    direction: 'N', environment: 'boulevard', leftSide: 'building', rightSide: 'building',
    landmark: "Van Gogh Museum", landmarkT: 0.6
  },
];

/**
 * Route graph — keyed by the index of the just-generated template.
 *
 * A single-option entry is an automatic continuation (no player choice).
 * A multi-option entry pauses generation and waits for `chooseBranch()`.
 *
 * Direction labels are relative to the cyclist's heading at the junction:
 * - 'left'     → the street turns left from the current heading
 * - 'straight' → the street continues in the same heading
 * - 'right'    → the street turns right from the current heading
 */
export const ROUTE_JUNCTIONS: Record<number, JunctionOption[]> = {
  // After 2nd Damrak segment (heading N, (0,−300)):
  //   turn LEFT onto Prins Hendrikkade (W) — or go STRAIGHT on IJ Waterfront (N)
  1: [
    { label: 'Prins Hendrikkade', direction: 'left',     nextTemplateIndex: 2  },
    { label: 'IJ Waterfront',     direction: 'straight', nextTemplateIndex: 36 },
  ],
  // After 2nd Singel segment (heading S, (−250,0)):
  //   turn RIGHT onto Raadhuisstraat (W) — or go STRAIGHT into Jordaan (S)
  5: [
    { label: 'Raadhuisstraat',    direction: 'right',    nextTemplateIndex: 6  },
    { label: 'Jordaan (scenic)',  direction: 'straight', nextTemplateIndex: 39 },
  ],
  // After 6th Prinsengracht segment (heading S, (−700,950)):
  //   turn LEFT onto Leidsestraat (E) — or go STRAIGHT via Museumplein (S)
  14: [
    { label: 'Leidsestraat',      direction: 'left',     nextTemplateIndex: 15 },
    { label: 'Museumplein',       direction: 'straight', nextTemplateIndex: 41 },
  ],
  // Auto-continuations (single option — no player input needed):
  35: [{ label: 'Damrak',         direction: 'straight', nextTemplateIndex: 0  }], // loop
  38: [{ label: 'Singel',         direction: 'straight', nextTemplateIndex: 4  }], // IJ branch rejoins
  40: [{ label: 'Prinsengracht',  direction: 'straight', nextTemplateIndex: 11 }], // Jordaan rejoins
  43: [{ label: 'Keizersgracht',  direction: 'straight', nextTemplateIndex: 17 }], // Museumplein rejoins
};