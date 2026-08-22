/**
 * Public surface of the parsing/scheduling core.
 *
 * Everything exported here is free of DOM and browser-only APIs (with the sole
 * exception of `MediaResolver`, which needs `Blob`/`URL`), so the core can be
 * exercised from Node tests and reused inside a Web Worker.
 */
export * from './types';
export { ZipArchive, ZipReadError } from './zip';
export { isZstd, zstdDecompress, maybeZstdDecompress } from './zstd';
export {
  configureSqlite,
  getSqlJs,
  openCollectionDb,
  patchUnicaseCollation,
  queryAll,
  queryOne,
  tableExists,
} from './sqlite';
export { decodeMessage, pbString, pbVarint, pbBytes, pbRepeated, pbHas } from './protobuf';
export { AnkiPackage, AnkiPackageError, FIELD_SEPARATOR } from './ankiPackage';
export {
  parseTemplate,
  renderCard,
  renderQuestion,
  renderAnswer,
  renderCloze,
  findClozes,
  clozeOrdinals,
  clozeOnly,
  stripHtml,
  notePreview,
  type CardSide,
  type RenderContext,
  type RenderResult,
  type TypeAnswerRequest,
} from './template';
export { MediaResolver, degradeLatex } from './media';
export {
  answerCard,
  buildQueue,
  dueNowCount,
  formatDelay,
  initialState,
  isUnseen,
  previewIntervals,
  queueCounts,
  DEFAULT_SCHEDULER_CONFIG,
  RATING_AGAIN,
  RATING_HARD,
  RATING_GOOD,
  RATING_EASY,
  type AnswerOutcome,
  type CardPhase,
  type CardState,
  type QueueCounts,
  type Rating,
  type SchedulerConfig,
  type StudyQueueOptions,
} from './scheduler';
