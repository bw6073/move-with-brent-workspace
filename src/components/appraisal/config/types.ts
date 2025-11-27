// src/components/appraisal/config/types.ts

export type Step =
  | 1 // Overview
  | 2 // Property basics
  | 3 // Interior
  | 4 // Exterior
  | 5 // Owner & occupancy
  | 6 // Motivation & expectations
  | 7 // Pricing & strategy
  | 8 // Presentation & marketing
  | 9; // Review

export type OccupancyType = "OWNER" | "TENANT" | "VACANT" | "HOLIDAY";

export type Room = {
  id: number;
  label: string;
  type: string;
  lengthMetres?: string;
  widthMetres?: string;
  conditionRating?: string;
  flooring?: string;
  heatingCooling?: string;
  specialFeatures?: string;
  extraFields?: Record<string, string>;
};

export type ExteriorArea = {
  id: number;
  label: string;
  type: string;
  lengthMetres?: string;
  widthMetres?: string;
  heightMetres?: string;
  conditionRating?: string;
  construction?: string;
  specialFeatures?: string;
  extraFields?: Record<string, string>;
};

export type NonPriceGoals = {
  bestPrice: number;
  speed: number;
  minimalDisruption: number;
  privacy: number;
  longSettlement: number;
};

export type FormState = {
  // Step 1 – overview
  appraisalTitle: string;
  streetAddress: string;
  suburb: string;
  postcode: string;
  state: string;
  appraisalDate: string;
  sourceOfEnquiry: string;
  firstContactNotes: string;
  linkedContactId: number | null;
  contactIds: number[];
  propertyId: number | null;

  // Step 2 – property basics
  propertyType: string;
  yearBuilt: string;
  construction: string;
  landArea: string;
  landAreaUnit: string;
  zoning: string;
  blockShape: string;
  slope: string;
  outlook: string;
  bedrooms: string;
  bathrooms: string;
  wcs: string;
  carSpaces: string;
  services: string[];
  outdoorFeatures: string[];

  // Step 3 – interior rooms
  overallCondition: string;
  styleTheme: string;
  rooms: Room[];

  // Step 4 – exterior & structures
  exteriorAreas: ExteriorArea[];
  landscapeSummary: string;

  // Step 5 – owner & occupancy
  ownerNames: string;
  ownerPhonePrimary: string;
  ownerPhoneSecondary: string;
  ownerEmail: string;
  postalAddress: string;
  sameAsProperty: boolean;
  occupancyType: OccupancyType;
  tenantName: string;
  leaseExpiry: string;
  currentRent: string;
  rentFrequency: string;
  tenantNotes: string;
  ownerHowLong: string;
  ownerNextMove: string;
  decisionMakers: string;
  decisionNotes: string;

  // Step 6 – motivation & expectations
  primaryReason: string;
  motivationDetail: string;
  idealTimeframe: string;
  datesToAvoid: string;
  hasPriceExpectation: boolean;
  expectationMin: string;
  expectationMax: string;
  expectationSource: string;
  expectationComments: string;
  nonPriceGoals: NonPriceGoals;
  otherGoalNotes: string;

  // Step 7 – pricing & strategy
  suggestedRangeMin: string;
  suggestedRangeMax: string;
  pricingStrategy: string;
  comparablesNotes: string;
  mustDoPrep: string;
  niceToHavePrep: string;
  feesDiscussed: boolean;
  proposedFee: string;
  agreementLikelihood: string;

  // Step 8 – presentation, marketing & follow-up
  presentationScore: string;
  presentationSummary: string;
  targetBuyerProfile: string;
  headlineIdeas: string;
  marketingChannels: string[];
  followUpActions: string;
  followUpDate: string;
};

export type MinimalContact = {
  id: number;
  name: string;
  email: string | null;
  phoneMobile: string | null;
};

export const EMPTY_FORM: FormState = {
  appraisalTitle: "",
  streetAddress: "",
  suburb: "",
  postcode: "",
  state: "WA",
  appraisalDate: new Date().toISOString().split("T")[0],
  sourceOfEnquiry: "",
  firstContactNotes: "",
  linkedContactId: null,
  contactIds: [],
  propertyId: null,

  propertyType: "house",
  yearBuilt: "",
  construction: "",
  landArea: "",
  landAreaUnit: "sqm",
  zoning: "",
  blockShape: "",
  slope: "",
  outlook: "",
  bedrooms: "",
  bathrooms: "",
  wcs: "",
  carSpaces: "",
  services: [],
  outdoorFeatures: [],

  overallCondition: "",
  styleTheme: "",
  rooms: [],

  exteriorAreas: [],
  landscapeSummary: "",

  ownerNames: "",
  ownerPhonePrimary: "",
  ownerPhoneSecondary: "",
  ownerEmail: "",
  postalAddress: "",
  sameAsProperty: false,
  occupancyType: "OWNER",
  tenantName: "",
  leaseExpiry: "",
  currentRent: "",
  rentFrequency: "pw",
  tenantNotes: "",
  ownerHowLong: "",
  ownerNextMove: "",
  decisionMakers: "",
  decisionNotes: "",

  primaryReason: "",
  motivationDetail: "",
  idealTimeframe: "",
  datesToAvoid: "",
  hasPriceExpectation: false,
  expectationMin: "",
  expectationMax: "",
  expectationSource: "",
  expectationComments: "",
  nonPriceGoals: {
    bestPrice: 3,
    speed: 3,
    minimalDisruption: 3,
    privacy: 3,
    longSettlement: 3,
  },
  otherGoalNotes: "",

  suggestedRangeMin: "",
  suggestedRangeMax: "",
  pricingStrategy: "",
  comparablesNotes: "",
  mustDoPrep: "",
  niceToHavePrep: "",
  feesDiscussed: false,
  proposedFee: "",
  agreementLikelihood: "",

  presentationScore: "5",
  presentationSummary: "",
  targetBuyerProfile: "",
  headlineIdeas: "",
  marketingChannels: [],
  followUpActions: "",
  followUpDate: "",
};
