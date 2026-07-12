// English strings (#18) — the source voice: calm, plain, never bureaucratic.
import type { Dictionary } from './dictionary'
import { pluralEn } from './plural'

export const en: Dictionary = {
  common: {
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    saving: 'Saving…',
    preparing: 'Preparing…',
    restoring: 'Restoring…',
    keepThisMemory: 'Keep this memory',
    seeAllMemories: 'see all memories',
    goToTodaysWord: "Go to today's word",
    allMemories: 'All memories',
    backToAllMemories: 'Back to all memories',
    backToTodaysWord: "Back to today's word",
    memoryNotFoundTitle: "This memory isn't here",
    memoryNotFoundDescription: 'It may have been deleted, or the link is old.',
    findingPage: 'Finding that page…',
    people: 'People',
    places: 'Places',
    tags: 'Tags',
    placeholderIRemember: 'I remember…',
    errorSaving: (error) => `Something went wrong saving. ${error}`,
    byteUnits: ['B', 'KB', 'MB', 'GB', 'TB'],
  },
  nav: {
    mainNavigation: 'Main navigation',
    today: 'Today',
    memories: 'Memories',
    search: 'Search',
    graph: 'Graph',
    export: 'Export',
    settings: 'Settings',
  },
  today: {
    wordSuffix: "— today's word",
    opening: "Opening today's page…",
    errorOpening: (error) => `Something went wrong opening today's page. ${error}`,
    writeSectionLabel: "Write today's memory",
    savedTodaySectionLabel: 'Saved today',
    textareaLabel: 'A memory this word brings back',
    textareaHint: 'A few sentences are plenty. There is no wrong way to remember.',
    openFullForm: 'More to add? Open the full form',
    keptTodayPrefix: 'Kept today —',
    whenToggle: 'When was this, roughly?',
  },
  memories: {
    loading: 'Turning the pages…',
    errorLoading: (error) => `Something went wrong loading your memories. ${error}`,
    emptyTitle: 'No memories yet',
    emptyDescription: "Today's word is waiting on the first page.",
    title: 'Memories',
    description: 'Everything you have kept, newest first.',
    writeAction: 'Write a memory',
  },
  memoryForm: {
    titleLabel: 'Title',
    titleHint: 'Optional — a few words to find this memory by later.',
    storyLabel: 'The memory',
    storyHint: 'There is no wrong way to remember.',
    approxAgeLabel: 'About how old were you?',
    approxYearLabel: 'Around what year?',
    approxHint: 'Optional — a rough guess is fine.',
    peopleHint: 'Names separated by commas, e.g. Mom, Aunt Vera.',
    placesHint: 'Separated by commas.',
    tagsHint: 'Separated by commas.',
    storyRequired: 'A memory needs at least a few words.',
    ageRange: 'If you give an age, make it a whole number between 0 and 120.',
    yearFourDigit: 'If you give a year, make it a four-digit year.',
  },
  memoryDetail: {
    errorOpening: (error) => `Something went wrong opening this memory. ${error}`,
    untitled: 'A memory',
    description: (writtenDate, editedDate, wordCitation) =>
      `Written ${writtenDate}${editedDate ? `, last edited ${editedDate}` : ''}${wordCitation ? ` — inspired by the word "${wordCitation}"` : ''}`,
    whenLabel: 'When',
    aroundAge: (age) => `around age ${age}`,
    aroundYear: (year) => `around ${year}`,
    versionHistory: 'Version history',
    deleteWarning: 'This removes the memory and its whole history.',
    deleteThisMemory: 'Delete this memory',
    keepIt: 'Keep it',
  },
  memoryEdit: {
    title: 'Edit memory',
    description: (word) =>
      `Every save is kept — the earlier versions stay in this memory's history.${word ? ` Inspired by the word "${word}".` : ''}`,
    saveChanges: 'Save changes',
  },
  memoryNew: {
    opening: 'Opening a fresh page…',
    errorOpening: (error) => `Something went wrong opening a fresh page. ${error}`,
    title: 'New memory',
    description: (word) =>
      `Inspired by today's word — "${word}". Only the story itself is needed; the rest can wait.`,
  },
  versionHistory: {
    loading: 'Leafing back…',
    errorOpening: (error) => `Something went wrong opening this history. ${error}`,
    title: 'Version history',
    description:
      'Every saved version of this memory, newest first. Past versions are kept as written — they can be read here, never changed.',
    backToMemory: 'Back to the memory',
    versionNumber: (n) => `Version ${n}`,
    current: '— current',
    savedOn: (date) => `Saved ${date}`,
  },
  settings: {
    title: 'Settings',
    yourDataTitle: 'Your data',
    yourDataDescription:
      'Everything you write is stored in this browser, on this device — it never leaves it.',
    storageProtectionLabel: 'Storage protection',
    spaceUsedLabel: 'Space used',
    checking: 'Checking…',
    unknown: "This browser doesn't say.",
    protectionOn:
      'On — this browser has agreed to keep your memories through its storage cleanups.',
    protectionNotGranted:
      'Not granted yet — this browser may reclaim the space if the device runs low.',
    spaceUsedOf: (used, quota) => `${used} of ${quota} available`,
    suggestionTitle: 'A gentle suggestion',
    suggestionPrefix:
      "Since this browser hasn't promised to keep the data forever, an occasional backup from the",
    suggestionLinkText: 'Export page',
    suggestionSuffix: 'is a good habit. No rush — whenever it crosses your mind.',
    dismissSuggestion: 'Okay, noted',
    languageTitle: 'Language',
    languageDescription:
      "Menus, buttons, and new prompt words follow this choice. Memories you've already written keep the words they were written with.",
    languageEnglish: 'English',
    languageRussian: 'Русский',
  },
  exportPage: {
    title: 'Export',
    description: 'Your memories are yours — take them with you in open formats.',
    printBlocked: 'The print view was blocked — allow pop-ups for this site and try again.',
    jsonTitle: 'JSON backup',
    jsonDescription:
      'Everything, losslessly — every memory, its full version history, people, places, tags, and photos in one file. This is the file the restore below reads.',
    downloadJson: 'Download JSON',
    markdownTitle: 'Markdown',
    markdownDescription:
      'One readable text file, oldest memory first — opens in any editor, today and in thirty years.',
    downloadMarkdown: 'Download Markdown',
    pdfTitle: 'PDF',
    pdfDescription:
      'A printable copy. Your browser\'s print dialog opens — choose "Save as PDF" there.',
    openPrintView: 'Open print view',
  },
  importBackup: {
    title: 'Restore a backup',
    description:
      'Bring a JSON backup made above back into an empty app — every memory, its full version history, people, places, tags, and photos, exactly as exported.',
    chooseBackupFile: 'Choose backup file',
    restoreThisBackup: 'Restore this backup',
    nothingWrittenYet: 'Nothing has been written yet.',
    restoredMessage: (summary) => `Backup restored — ${summary} are back.`,
    seeYourMemories: 'See your memories',
    pendingSummary: (filename, date, summary) =>
      `${filename}, exported on ${date}, holds ${summary}.`,
    photosWithoutBytesNote: (n) =>
      ` ${pluralEn(n, { one: 'photo was', many: 'photos were' })} already missing image data when this backup was made.`,
    counts: {
      memories: (n) => `${n} ${pluralEn(n, { one: 'memory', many: 'memories' })}`,
      memoryVersionsOfHistory: (n) =>
        `${n} ${pluralEn(n, { one: 'version', many: 'versions' })} of their history`,
      people: (n) => `${n} ${pluralEn(n, { one: 'person', many: 'people' })}`,
      places: (n) => `${n} ${pluralEn(n, { one: 'place', many: 'places' })}`,
      tags: (n) => `${n} ${pluralEn(n, { one: 'tag', many: 'tags' })}`,
      photos: (n) => `${n} ${pluralEn(n, { one: 'photo', many: 'photos' })}`,
      promptWords: (n) => `${n} ${pluralEn(n, { one: 'prompt word', many: 'prompt words' })}`,
    },
  },
  notFound: {
    title: "There's no page here",
    description: "The address may be mistyped, or it may point to a page that doesn't exist yet.",
  },
  searchPage: {
    title: 'Search',
  },
  graphPage: {
    title: 'Memory Graph',
  },
  placeholder: {
    comingSoon: 'Coming in a future epic.',
  },
}
