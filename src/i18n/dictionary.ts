// The typed string dictionary (#18). A minimal hand-written module rather
// than a framework — the string surface is small (a dozen screens), and a
// typed interface makes a missing Russian key a compile error instead of a
// silent fallback.
export interface Dictionary {
  common: {
    cancel: string
    delete: string
    edit: string
    saving: string
    preparing: string
    restoring: string
    keepThisMemory: string
    seeAllMemories: string
    goToTodaysWord: string
    allMemories: string
    backToAllMemories: string
    backToTodaysWord: string
    memoryNotFoundTitle: string
    memoryNotFoundDescription: string
    findingPage: string
    people: string
    places: string
    tags: string
    placeholderIRemember: string
    errorSaving: (error: string) => string
    /** Byte-size unit abbreviations, smallest to largest: B, KB, MB, GB, TB. */
    byteUnits: readonly [string, string, string, string, string]
  }
  nav: {
    mainNavigation: string
    today: string
    memories: string
    search: string
    graph: string
    export: string
    settings: string
  }
  today: {
    wordSuffix: string
    opening: string
    errorOpening: (error: string) => string
    writeSectionLabel: string
    savedTodaySectionLabel: string
    textareaLabel: string
    textareaHint: string
    openFullForm: string
    keptTodayPrefix: string
    whenToggle: string
  }
  memories: {
    loading: string
    errorLoading: (error: string) => string
    emptyTitle: string
    emptyDescription: string
    title: string
    description: string
    writeAction: string
  }
  memoryForm: {
    titleLabel: string
    titleHint: string
    storyLabel: string
    storyHint: string
    approxAgeLabel: string
    approxYearLabel: string
    approxHint: string
    peopleHint: string
    placesHint: string
    tagsHint: string
    storyRequired: string
    ageRange: string
    yearFourDigit: string
  }
  memoryDetail: {
    errorOpening: (error: string) => string
    untitled: string
    description: (writtenDate: string, editedDate: string | null, wordCitation: string | null) => string
    whenLabel: string
    aroundAge: (age: number) => string
    aroundYear: (year: number) => string
    versionHistory: string
    deleteWarning: string
    deleteThisMemory: string
    keepIt: string
  }
  memoryEdit: {
    title: string
    description: (word: string | undefined) => string
    saveChanges: string
  }
  memoryNew: {
    opening: string
    errorOpening: (error: string) => string
    title: string
    description: (word: string) => string
  }
  versionHistory: {
    loading: string
    errorOpening: (error: string) => string
    title: string
    description: string
    backToMemory: string
    versionNumber: (n: number) => string
    current: string
    savedOn: (date: string) => string
  }
  settings: {
    title: string
    yourDataTitle: string
    yourDataDescription: string
    storageProtectionLabel: string
    spaceUsedLabel: string
    checking: string
    unknown: string
    protectionOn: string
    protectionNotGranted: string
    spaceUsedOf: (used: string, quota: string) => string
    suggestionTitle: string
    suggestionPrefix: string
    suggestionLinkText: string
    suggestionSuffix: string
    dismissSuggestion: string
    languageTitle: string
    languageDescription: string
    languageEnglish: string
    languageRussian: string
  }
  exportPage: {
    title: string
    description: string
    printBlocked: string
    jsonTitle: string
    jsonDescription: string
    downloadJson: string
    markdownTitle: string
    markdownDescription: string
    downloadMarkdown: string
    pdfTitle: string
    pdfDescription: string
    openPrintView: string
  }
  importBackup: {
    title: string
    description: string
    chooseBackupFile: string
    restoreThisBackup: string
    nothingWrittenYet: string
    restoredMessage: (summary: string) => string
    seeYourMemories: string
    pendingSummary: (filename: string, date: string, summary: string) => string
    photosWithoutBytesNote: (n: number) => string
    counts: {
      memories: (n: number) => string
      memoryVersionsOfHistory: (n: number) => string
      people: (n: number) => string
      places: (n: number) => string
      tags: (n: number) => string
      photos: (n: number) => string
      promptWords: (n: number) => string
    }
  }
  notFound: {
    title: string
    description: string
  }
  searchPage: {
    title: string
  }
  graphPage: {
    title: string
  }
  placeholder: {
    comingSoon: string
  }
}
