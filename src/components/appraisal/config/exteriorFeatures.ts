// src/components/appraisal/config/exteriorFeatures.ts

export const EXTERIOR_FEATURE_CONFIG: Record<
  string,
  { id: string; label: string; placeholder?: string }[]
> = {
  patio: [
    {
      id: "roofType",
      label: "Roof type",
      placeholder: "Gable, flat, insulated...",
    },
    {
      id: "paving",
      label: "Floor / paving",
      placeholder: "Pavers, concrete, composite deck...",
    },
    {
      id: "powerLighting",
      label: "Power / lighting",
      placeholder: "GPOs, lights, fans, heaters...",
    },
  ],

  alfresco: [
    {
      id: "alfrescoFinish",
      label: "Finish",
      placeholder: "Under main roof, tiled, paved...",
    },
    {
      id: "alfrescoConnection",
      label: "Connection to house",
      placeholder: "Stacker doors, bifolds, off kitchen...",
    },
  ],

  deck: [
    {
      id: "deckMaterial",
      label: "Deck material",
      placeholder: "Timber, composite, condition...",
    },
  ],

  shed: [
    {
      id: "shedPower",
      label: "Power",
      placeholder: "Powered / lights / 3-phase...",
    },
    {
      id: "shedAccess",
      label: "Access",
      placeholder: "Roller door, vehicle access...",
    },
  ],

  workshop: [
    {
      id: "workshopPower",
      label: "Power",
      placeholder: "Single / 3-phase, circuits...",
    },
    {
      id: "workshopFitout",
      label: "Fit-out",
      placeholder: "Benches, storage, mezzanine...",
    },
  ],

  garage: [
    {
      id: "garageDoors",
      label: "Doors",
      placeholder: "Auto door(s), extra height...",
    },
    {
      id: "garageAccess",
      label: "Access",
      placeholder: "Shoppers entry, rear roller door...",
    },
  ],

  carport: [
    {
      id: "carportCover",
      label: "Cover / height",
      placeholder: "Extra height, caravan suitable...",
    },
  ],

  pool: [
    {
      id: "poolType",
      label: "Pool type",
      placeholder: "Concrete, fibreglass, above-ground...",
    },
    {
      id: "poolHeating",
      label: "Heating",
      placeholder: "Solar, electric, gas...",
    },
    {
      id: "poolCompliance",
      label: "Fencing / compliance",
      placeholder: "Compliant fencing, condition...",
    },
  ],

  spa: [
    {
      id: "spaType",
      label: "Spa type",
      placeholder: "Standalone, built-in, heated...",
    },
  ],

  tank: [
    {
      id: "tankCapacity",
      label: "Capacity & use",
      placeholder: "Size, plumbed to house or garden...",
    },
  ],

  stable: [
    {
      id: "stableSetup",
      label: "Stable setup",
      placeholder: "Number of stalls, flooring, water...",
    },
  ],

  arena: [
    {
      id: "arenaSurface",
      label: "Surface",
      placeholder: "Sand, grass, purpose-built...",
    },
    {
      id: "arenaSize",
      label: "Approx size",
      placeholder: "20x40, 20x60, round yard, etc.",
    },
  ],

  driveway: [
    {
      id: "drivewayMaterial",
      label: "Material",
      placeholder: "Concrete, asphalt, gravel...",
    },
  ],

  other: [
    {
      id: "otherExteriorNotes",
      label: "Other notes",
      placeholder: "Describe the structure or feature...",
    },
  ],
};
