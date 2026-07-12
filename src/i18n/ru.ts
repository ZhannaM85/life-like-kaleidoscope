// Russian strings (#18) — translated for tone, not word-for-word: the same
// quiet, unhurried voice as the English original, not a bureaucratic register.
import type { Dictionary } from './dictionary'
import { pluralRu } from './plural'

export const ru: Dictionary = {
  common: {
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Изменить',
    saving: 'Сохраняем…',
    preparing: 'Готовим…',
    restoring: 'Восстанавливаем…',
    keepThisMemory: 'Сохранить воспоминание',
    seeAllMemories: 'все воспоминания',
    goToTodaysWord: 'К слову дня',
    allMemories: 'Все воспоминания',
    backToAllMemories: 'Назад ко всем воспоминаниям',
    backToTodaysWord: 'Назад к слову дня',
    memoryNotFoundTitle: 'Такого воспоминания здесь нет',
    memoryNotFoundDescription: 'Возможно, оно было удалено, или ссылка устарела.',
    findingPage: 'Ищем эту страницу…',
    people: 'Люди',
    places: 'Места',
    tags: 'Теги',
    placeholderIRemember: 'Я помню…',
    errorSaving: (error) => `Не получилось сохранить. ${error}`,
    byteUnits: ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'],
  },
  nav: {
    mainNavigation: 'Основная навигация',
    today: 'Сегодня',
    memories: 'Воспоминания',
    search: 'Поиск',
    graph: 'Граф',
    export: 'Экспорт',
    settings: 'Настройки',
  },
  today: {
    wordSuffix: '— слово дня',
    opening: 'Открываем страницу дня…',
    errorOpening: (error) => `Не получилось открыть страницу дня. ${error}`,
    writeSectionLabel: 'Записать воспоминание дня',
    savedTodaySectionLabel: 'Сохранено сегодня',
    textareaLabel: 'Воспоминание, которое приходит вместе с этим словом',
    textareaHint: 'Достаточно нескольких предложений. Неправильно вспоминать не бывает.',
    openFullForm: 'Хотите добавить больше? Откройте полную форму',
    keptTodayPrefix: 'Сохранено сегодня —',
    whenToggle: 'Когда это было, примерно?',
  },
  memories: {
    loading: 'Перелистываем страницы…',
    errorLoading: (error) => `Не получилось загрузить воспоминания. ${error}`,
    emptyTitle: 'Пока нет воспоминаний',
    emptyDescription: 'Слово дня ждёт свою первую запись.',
    title: 'Воспоминания',
    description: 'Всё, что вы сохранили, — сначала самое новое.',
    writeAction: 'Написать воспоминание',
  },
  memoryForm: {
    titleLabel: 'Заголовок',
    titleHint: 'Необязательно — несколько слов, чтобы потом легче найти это воспоминание.',
    storyLabel: 'Воспоминание',
    storyHint: 'Неправильно вспоминать не бывает.',
    approxAgeLabel: 'Сколько вам было лет, примерно?',
    approxYearLabel: 'Примерно в каком году?',
    approxHint: 'Необязательно — приблизительно тоже подойдёт.',
    peopleHint: 'Имена через запятую, например: мама, тётя Вера.',
    placesHint: 'Через запятую.',
    tagsHint: 'Через запятую.',
    storyRequired: 'Воспоминанию нужно хотя бы несколько слов.',
    ageRange: 'Если указываете возраст, пусть это будет целое число от 0 до 120.',
    yearFourDigit: 'Если указываете год, пусть это будут четыре цифры.',
  },
  memoryDetail: {
    errorOpening: (error) => `Не получилось открыть это воспоминание. ${error}`,
    untitled: 'Воспоминание',
    description: (writtenDate, editedDate, wordCitation) =>
      `Записано ${writtenDate}${editedDate ? `, последнее изменение — ${editedDate}` : ''}${wordCitation ? ` — по слову «${wordCitation}»` : ''}`,
    whenLabel: 'Когда',
    aroundAge: (age) => `примерно в ${age} ${pluralRu(age, { one: 'год', few: 'года', many: 'лет' })}`,
    aroundYear: (year) => `примерно в ${year} году`,
    versionHistory: 'История версий',
    deleteWarning: 'Это удалит воспоминание и всю его историю.',
    deleteThisMemory: 'Удалить это воспоминание',
    keepIt: 'Оставить',
  },
  memoryEdit: {
    title: 'Изменить воспоминание',
    description: (word) =>
      `Каждое сохранение остаётся — прежние версии хранятся в истории этого воспоминания.${word ? ` По слову «${word}».` : ''}`,
    saveChanges: 'Сохранить изменения',
  },
  memoryNew: {
    opening: 'Открываем новую страницу…',
    errorOpening: (error) => `Не получилось открыть новую страницу. ${error}`,
    title: 'Новое воспоминание',
    description: (word) =>
      `По слову дня — «${word}». Нужна только сама история — остальное может подождать.`,
  },
  versionHistory: {
    loading: 'Листаем назад…',
    errorOpening: (error) => `Не получилось открыть эту историю. ${error}`,
    title: 'История версий',
    description:
      'Каждая сохранённая версия этого воспоминания, сначала самая новая. Прежние версии хранятся как есть — их можно прочитать, но нельзя изменить.',
    backToMemory: 'Назад к воспоминанию',
    versionNumber: (n) => `Версия ${n}`,
    current: '— текущая',
    savedOn: (date) => `Сохранено ${date}`,
  },
  settings: {
    title: 'Настройки',
    yourDataTitle: 'Ваши данные',
    yourDataDescription:
      'Всё, что вы пишете, хранится в этом браузере, на этом устройстве, — и никуда с него не уходит.',
    storageProtectionLabel: 'Защита хранилища',
    spaceUsedLabel: 'Занято места',
    checking: 'Проверяем…',
    unknown: 'Браузер не сообщает об этом.',
    protectionOn:
      'Включена — браузер согласился сохранять ваши воспоминания при очистке хранилища.',
    protectionNotGranted:
      'Пока не включена — при нехватке места браузер может освободить эту память.',
    spaceUsedOf: (used, quota) => `${used} из ${quota}`,
    suggestionTitle: 'Небольшой совет',
    suggestionPrefix:
      'Раз браузер не обещал хранить данные вечно, время от времени стоит делать резервную копию на странице',
    suggestionLinkText: 'Экспорт',
    suggestionSuffix: '— это хорошая привычка. Не к спеху — когда будет удобно.',
    dismissSuggestion: 'Хорошо, понятно',
    languageTitle: 'Язык',
    languageDescription:
      'От этого выбора зависят меню, кнопки и новые слова дня. Уже написанные воспоминания сохраняют те слова, с которыми были написаны.',
    languageEnglish: 'English',
    languageRussian: 'Русский',
  },
  exportPage: {
    title: 'Экспорт',
    description: 'Ваши воспоминания принадлежат вам — заберите их с собой в открытых форматах.',
    printBlocked: 'Окно печати заблокировано — разрешите всплывающие окна для этого сайта и попробуйте снова.',
    jsonTitle: 'Резервная копия JSON',
    jsonDescription:
      'Всё без потерь — каждое воспоминание, вся история его версий, люди, места, теги и фотографии в одном файле. Именно этот файл читает восстановление ниже.',
    downloadJson: 'Скачать JSON',
    markdownTitle: 'Markdown',
    markdownDescription:
      'Один читаемый текстовый файл, сначала самое старое воспоминание — открывается в любом редакторе, сегодня и через тридцать лет.',
    downloadMarkdown: 'Скачать Markdown',
    pdfTitle: 'PDF',
    pdfDescription:
      'Копия для печати. Откроется диалог печати браузера — выберите там «Сохранить как PDF».',
    openPrintView: 'Открыть вид для печати',
  },
  importBackup: {
    title: 'Восстановить из копии',
    description:
      'Верните JSON-копию, сделанную выше, в пустое приложение — каждое воспоминание, всю историю его версий, людей, места, теги и фотографии, в точности как при экспорте.',
    chooseBackupFile: 'Выбрать файл копии',
    restoreThisBackup: 'Восстановить эту копию',
    nothingWrittenYet: 'Пока ничего не записано.',
    restoredMessage: (summary) => `Копия восстановлена — вернулись: ${summary}.`,
    seeYourMemories: 'Смотреть воспоминания',
    pendingSummary: (filename, date, summary) =>
      `${filename}, экспортирован ${date}, содержит: ${summary}.`,
    photosWithoutBytesNote: (n) =>
      ` Ещё ${n} ${pluralRu(n, { one: 'фотография', few: 'фотографии', many: 'фотографий' })} были без данных изображения уже на момент создания этой копии.`,
    counts: {
      memories: (n) => `${n} ${pluralRu(n, { one: 'воспоминание', few: 'воспоминания', many: 'воспоминаний' })}`,
      memoryVersionsOfHistory: (n) =>
        `${n} ${pluralRu(n, { one: 'версия', few: 'версии', many: 'версий' })} их истории`,
      people: (n) => `${n} ${pluralRu(n, { one: 'человек', few: 'человека', many: 'человек' })}`,
      places: (n) => `${n} ${pluralRu(n, { one: 'место', few: 'места', many: 'мест' })}`,
      tags: (n) => `${n} ${pluralRu(n, { one: 'тег', few: 'тега', many: 'тегов' })}`,
      photos: (n) => `${n} ${pluralRu(n, { one: 'фотография', few: 'фотографии', many: 'фотографий' })}`,
      promptWords: (n) => `${n} ${pluralRu(n, { one: 'слово дня', few: 'слова дня', many: 'слов дня' })}`,
    },
  },
  notFound: {
    title: 'Такой страницы нет',
    description: 'Возможно, адрес введён неверно, или страница ещё не создана.',
  },
  searchPage: {
    title: 'Поиск',
  },
  graphPage: {
    title: 'Граф памяти',
  },
  placeholder: {
    comingSoon: 'Скоро появится в одном из будущих обновлений.',
  },
}
