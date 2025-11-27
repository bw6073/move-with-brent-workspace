// src/components/appraisal/config/roomFeatures.ts

export const ROOM_FEATURE_CONFIG: Record<
  string,
  { id: string; label: string; placeholder?: string }[]
> = {
  kitchen: [
    {
      id: "cooktopOven",
      label: "Cooktop / oven",
      placeholder: "Gas, electric, induction, 900mm, freestanding, etc.",
    },
    {
      id: "benchtops",
      label: "Benchtops",
      placeholder: "Stone, laminate, timber...",
    },
    {
      id: "sink",
      label: "Sink",
      placeholder: "Single, double, deep, undermount...",
    },
    {
      id: "dishwasher",
      label: "Dishwasher",
      placeholder: "Yes / brand / integrated...",
    },
    {
      id: "pantry",
      label: "Pantry",
      placeholder: "Built-in, walk-in, corner, etc.",
    },
  ],

  bedroom: [
    { id: "robe", label: "Robe", placeholder: "Built-in, walk-in, none..." },
    {
      id: "ceilingFan",
      label: "Ceiling fan",
      placeholder: "Yes / no / type...",
    },
    {
      id: "windowTreatment",
      label: "Window treatments",
      placeholder: "Blinds, curtains, shutters...",
    },
  ],

  bathroom: [
    {
      id: "showerBath",
      label: "Shower / bath",
      placeholder: "Shower only, shower over bath, separate bath...",
    },
    {
      id: "vanity",
      label: "Vanity",
      placeholder: "Single / double, storage, condition...",
    },
    {
      id: "toilet",
      label: "Toilet",
      placeholder: "In room / separate, condition...",
    },
    {
      id: "tiles",
      label: "Tiling",
      placeholder: "Floor to ceiling, half height, updated, original...",
    },
  ],

  ensuite: [
    {
      id: "ensuiteLayout",
      label: "Layout / fixtures",
      placeholder: "Shower, vanity, WC, etc.",
    },
    {
      id: "ensuiteCondition",
      label: "Condition",
      placeholder: "Original, updated, renovated...",
    },
  ],

  family: [
    {
      id: "familyFeatures",
      label: "Key features",
      placeholder: "Open plan, fireplace, outlook, etc.",
    },
  ],

  lounge: [
    {
      id: "loungeFeatures",
      label: "Key features",
      placeholder: "Formal, airy, fireplace, outlook, etc.",
    },
  ],

  theatre: [
    {
      id: "theatreFeatures",
      label: "Theatre details",
      placeholder: "Darkened room, speakers, projector wiring...",
    },
  ],

  study: [
    {
      id: "studyFeatures",
      label: "Study setup",
      placeholder: "Built-in desk, storage, nook, etc.",
    },
  ],

  laundry: [
    {
      id: "laundryStorage",
      label: "Storage / bench",
      placeholder: "Overhead cupboards, linen, bench space...",
    },
    {
      id: "laundryAccess",
      label: "External access",
      placeholder: "Direct to yard / drying area...",
    },
  ],

  meals: [
    {
      id: "mealsFeatures",
      label: "Meals area",
      placeholder: "Open to kitchen, outlook, size notes...",
    },
  ],

  other: [
    {
      id: "otherNotes",
      label: "Room notes",
      placeholder: "Use, key features, flexibility, etc.",
    },
  ],
};
