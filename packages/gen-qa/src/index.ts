/**
 * @tsumugu/gen-qa — reusable, data-free generation QA gate primitives.
 */

export {
  checkDefLevel,
  segmentDefText,
  decomposesIntoAllowList,
  resetDefLevelSegmenter,
  type DefLevelViolation,
  type CheckDefLevelResult,
  type CheckDefLevelOptions,
} from "./defLevel.js";

export {
  loadDefLevelIndex,
  tocflOrdinal,
  tocflBandFromOrdinal,
  resetDefLevelIndexCache,
  buildAllowList,
  allowListWords,
  resolveTokenBand,
  resolveDefFloorBand,
  freqRankToTocflBand,
  DEFAULT_DEF_FLOOR_BAND,
  type DefLevelIndex,
  type TocflRecord,
} from "./defLevelData.js";

export {
  verifyContent,
  hasUsableGlossaryGloss,
  type VerifyOptions,
  type VerifyReport,
  type DefLevelEntryStats,
} from "./verify.js";

export {
  verifyExamples,
  type ExampleEntryStats,
  type ExampleVerifyResult,
} from "./exampleVerify.js";

export {
  knownHanziFromStore,
  cacheBridges,
  crossSeedFromRegistry,
  bridgeSkeleton,
  type BridgeRecord,
  type CacheResult,
} from "./bridge.js";

export {
  assertMonolingualSeedLicenses,
  moedictByNdSeedFixture,
  type ProvenanceManifest,
  type ProvenanceSource,
  type LicenseAssertResult,
  type GenerationSeedLicense,
  type ProvenanceRole,
} from "./licenseAssert.js";

export { parseArgs, str, num, list, flag, type ParsedArgs } from "./args.js";

export {
  readText,
  readJson,
  writeJson,
  writeText,
  nfcTerm,
  encodingBasename,
  encodingFilename,
  slugify,
} from "./io.js";

export {
  exampleTargetCount,
  seedSharedExampleSlots,
  isFilledExample,
  isSharedExample,
  isOverlayExample,
  EXAMPLE_COUNT_MIN,
  EXAMPLE_COUNT_MAX,
  EXAMPLE_COUNT_DEFAULT,
} from "./examples.js";