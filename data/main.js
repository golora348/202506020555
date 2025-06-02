/**
 * KanjiVG 한자 사전
 *
 * 이 파일은 KanjiVG 한자 사전을 위한 메인 JavaScript 파일입니다.
 * KanjiVG 데이터를 사용하여 한자의 획순을 시각화하고 연습할 수 있습니다.
 *
 * 주요 기능:
 * - 한자 획순 시각화 및 애니메이션
 * - 사용자 직접 쓰기 연습
 * - JLPT, 한자검정 등 급수별 한자 학습
 * - 모바일/데스크탑 동기화 지원
 */

// ===== 상수 정의 =====
/**
 * 로컬 스토리지에 저장되는 노트의 키
 * @type {string}
 */
const NOTE_STORAGE_KEY = "kanjiPracticeNotesAdvanced";

// ===== 유틸리티 함수 =====
/**
 * 데스크탑과 모바일 버튼의 상태를 동기화합니다.
 * @param {string} desktopId - 데스크탑 버튼의 ID
 * @param {string} mobileId - 모바일 버튼의 ID
 */
function syncButtonStates(desktopId, mobileId) {
  const desktopBtn = document.getElementById(desktopId);
  const mobileBtn = document.getElementById(mobileId);
  if (desktopBtn && mobileBtn) {
    // Sync disabled state
    mobileBtn.disabled = desktopBtn.disabled;

    // Remove existing click handlers to prevent duplicates
    const newMobileBtn = mobileBtn.cloneNode(true);
    mobileBtn.parentNode.replaceChild(newMobileBtn, mobileBtn);

    // Add new click handler that simulates the desktop button's behavior
    newMobileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Get the current state
      const loaded = currentKanji !== "" && totalStrokes > 0;
      const animating = animationFrameId !== null || isAnimatingAll;

      // Only proceed if the button should be enabled
      if (!newMobileBtn.disabled) {
        // Execute the same logic as the desktop button
        if (desktopId === "prevStrokeBtn") {
          if (currentStrokeDisplayIndex >= 0) {
            currentStrokeDisplayIndex--;
            renderGuideStrokes();
            drawRadicalHighlight();
          }
        } else if (desktopId === "nextStrokeBtn") {
          if (currentStrokeDisplayIndex < totalStrokes - 1) {
            const strokeIdxToAnimate = currentStrokeDisplayIndex + 1;
            clearGuideCanvas();
            const currentStyle = RENDER_STYLES[currentRenderingStyle];

            for (let i = 0; i < strokeIdxToAnimate; i++) {
              const { color, style } = determineStrokeStyleAndColor(
                i,
                currentStyle,
                "render"
              );
              drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
            }

            if (strokeIdxToAnimate + 1 < totalStrokes) {
              const { color: hintColor, style: hintStyle } =
                determineStrokeStyleAndColor(
                  strokeIdxToAnimate + 1,
                  RENDER_STYLES["standard"],
                  "hint"
                );
              drawPath(
                guideCtx,
                strokesData[strokeIdxToAnimate + 1].d,
                hintColor,
                hintStyle,
                scaleFactor
              );
            }

            const strokeToAnimateData = strokesData[strokeIdxToAnimate];
            if (strokeToAnimateData && strokeToAnimateData.d) {
              const { color, style } = determineStrokeStyleAndColor(
                strokeIdxToAnimate,
                currentStyle,
                "animation"
              );
              animateSingleStroke(
                strokeToAnimateData.d,
                color,
                style,
                strokeIdxToAnimate
              );
            }
          }
        } else if (desktopId === "firstStrokeBtn") {
          if (currentStrokeDisplayIndex >= 0) {
            currentStrokeDisplayIndex = -1;
            renderGuideStrokes();
            drawRadicalHighlight();
          }
        } else if (desktopId === "revealAllBtn") {
          currentStrokeDisplayIndex = totalStrokes - 1;
          renderGuideStrokes();
          drawRadicalHighlight();
        } else if (desktopId === "animateStrokeBtn") {
          if (
            currentStrokeDisplayIndex >= 0 &&
            currentStrokeDisplayIndex < totalStrokes
          ) {
            const strokeIdxToAnimate = currentStrokeDisplayIndex;
            clearGuideCanvas();
            const currentStyle = RENDER_STYLES[currentRenderingStyle];

            for (let i = 0; i < strokeIdxToAnimate; i++) {
              const { color, style } = determineStrokeStyleAndColor(
                i,
                currentStyle,
                "render"
              );
              drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
            }

            if (strokeIdxToAnimate + 1 < totalStrokes) {
              const { color: hintColor, style: hintStyle } =
                determineStrokeStyleAndColor(
                  strokeIdxToAnimate + 1,
                  RENDER_STYLES["standard"],
                  "hint"
                );
              drawPath(
                guideCtx,
                strokesData[strokeIdxToAnimate + 1].d,
                hintColor,
                hintStyle,
                scaleFactor
              );
            }

            const strokeToAnimateData = strokesData[strokeIdxToAnimate];
            if (strokeToAnimateData && strokeToAnimateData.d) {
              const { color, style } = determineStrokeStyleAndColor(
                strokeIdxToAnimate,
                currentStyle,
                "animation"
              );
              animateSingleStroke(
                strokeToAnimateData.d,
                color,
                style,
                strokeIdxToAnimate
              );
            }
          }
        } else if (desktopId === "animateAllStrokesBtn") {
          isAnimatingAll = true;
          currentStrokeDisplayIndex = -1;
          currentAnimationStrokeIndex = 0;
          clearGuideCanvas();
          animateNextInSequence();
        } else if (desktopId === "clearUserDrawingBtn") {
          clearUserCanvas();
        }

        // Update button states after action
        updateButtonStates();
      }
    });
  }
}

/**
 * 모든 버튼의 상태를 동기화합니다.
 */
function syncAllButtons() {
  const btnMap = [
    ["firstStrokeBtn", "firstStrokeBtnMobile"],
    ["prevStrokeBtn", "prevStrokeBtnMobile"],
    ["animateStrokeBtn", "animateStrokeBtnMobile"],
    ["nextStrokeBtn", "nextStrokeBtnMobile"],
    ["revealAllBtn", "revealAllBtnMobile"],
    ["animateAllStrokesBtn", "animateAllStrokesBtnMobile"],
    ["clearUserDrawingBtn", "mobileClearUserDrawingBtn"],
  ];
  btnMap.forEach(([desktopId, mobileId]) =>
    syncButtonStates(desktopId, mobileId)
  );
}

/**
 * 설정값들을 동기화합니다.
 */
function syncSettings() {
  const settingsMap = [
    ["renderingStyleSelect", "mobileRenderingStyleSelect"],
    ["penColor", "mobilePenColor"],
    ["penWidthInput", "mobilePenWidthInput"],
    ["gridToggle", "mobileGridToggle"],
    ["animationSpeedInput", "mobileAnimationSpeedInput"],
  ];

  settingsMap.forEach(([desktopId, mobileId]) => {
    const desktopEl = document.getElementById(desktopId);
    const mobileEl = document.getElementById(mobileId);
    if (desktopEl && mobileEl) {
      // Initial sync
      mobileEl.value = desktopEl.value;
      mobileEl.checked = desktopEl.checked;

      // Sync from mobile to desktop
      mobileEl.addEventListener("change", (e) => {
        desktopEl.value = e.target.value;
        desktopEl.checked = e.target.checked;
        desktopEl.dispatchEvent(new Event("change"));
      });

      // Sync from desktop to mobile
      desktopEl.addEventListener("change", (e) => {
        mobileEl.value = e.target.value;
        mobileEl.checked = e.target.checked;
      });
    }
  });
}

/**
 * 정보 표시를 동기화합니다.
 */
function syncInfoDisplay() {
  const infoMap = [
    ["radicalInsertPoint", "mobileRadicalInsertPoint"],
    ["shapeInsertPoint", "mobileShapeInsertPoint"],
    ["strokeCountInfo", "mobileStrokeCountInfo"],
    ["unicodeInfo", "mobileUnicodeInfo"],
  ];

  infoMap.forEach(([desktopId, mobileId]) => {
    const desktopEl = document.getElementById(desktopId);
    const mobileEl = document.getElementById(mobileId);
    if (desktopEl && mobileEl) {
      // Clear existing content
      mobileEl.innerHTML = "";

      // Clone all child nodes from desktop to mobile
      Array.from(desktopEl.childNodes).forEach((node) => {
        const clonedNode = node.cloneNode(true);
        mobileEl.appendChild(clonedNode);
      });

      // Add event handlers for buttons
      mobileEl.querySelectorAll(".radical-button").forEach((btn) => {
        btn.onclick = () => showRadicalInfoModal(btn.textContent);
      });
    }
  });

  // Sync display states for rows
  const rows = [
    { desktop: ".radical-row", mobile: "#mobileInfoModal .radical-row" },
    { desktop: ".shape-row", mobile: "#mobileInfoModal .shape-row" },
    { desktop: ".kanji-meta-row", mobile: "#mobileInfoModal .kanji-meta-row" },
  ];

  rows.forEach(({ desktop, mobile }) => {
    const desktopRow = document.querySelector(desktop);
    const mobileRow = document.querySelector(mobile);
    if (desktopRow && mobileRow) {
      mobileRow.style.display = desktopRow.style.display;
    }
  });
}

/**
 * 의미 표시를 동기화합니다.
 */
function syncMeaningsDisplay() {
  const mobileMeanings = document.getElementById("mobileAllPageMeanings");
  const desktopMeanings = document.getElementById("allPageMeanings");
  if (mobileMeanings && desktopMeanings) {
    mobileMeanings.innerHTML = desktopMeanings.innerHTML;
  }
}

// ===== 데이터 구조 정의 =====
/**
 * JLPT 급수별 한자 데이터
 * @type {Object.<string, string[]>}
 */
const JLPT_KANJI = {};
if (typeof JLPT_KANJI_STRINGS !== "undefined") {
  for (const level in JLPT_KANJI_STRINGS) {
    JLPT_KANJI[level] = JLPT_KANJI_STRINGS[level]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("JLPT_KANJI_STRINGS is not defined.");
}
const KANKEN_KANJI = {};
if (typeof KANKEN_KANJI_STRINGS !== "undefined") {
  for (const level in KANKEN_KANJI_STRINGS) {
    KANKEN_KANJI[level] = KANKEN_KANJI_STRINGS[level]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("KANKEN_KANJI_STRINGS is not defined.");
}
const GAKUNEN_KANJI = {};
if (typeof GAKUNEN_KANJI_STRINGS !== "undefined") {
  for (const level in GAKUNEN_KANJI_STRINGS) {
    GAKUNEN_KANJI[level] = GAKUNEN_KANJI_STRINGS[level]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("GAKUNEN_KANJI_STRINGS is not defined.");
}
const KAKUSUU_KANJI = {};
if (typeof KAKUSUU_KANJI_STRINGS !== "undefined") {
  for (const level in KAKUSUU_KANJI_STRINGS) {
    KAKUSUU_KANJI[level] = KAKUSUU_KANJI_STRINGS[level]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("KAKUSUU_KANJI_STRINGS is not defined.");
}
const BUSHU_KANJI = {};
if (typeof BUSHU_KANJI_STRINGS !== "undefined") {
  for (const bushuName in BUSHU_KANJI_STRINGS) {
    BUSHU_KANJI[bushuName] = BUSHU_KANJI_STRINGS[bushuName]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("BUSHU_KANJI_STRINGS is not defined.");
}
const SHINBUN_KANJI = {};
if (typeof SHINBUN_KANJI_STRINGS !== "undefined") {
  for (const level in SHINBUN_KANJI_STRINGS) {
    SHINBUN_KANJI[level] = SHINBUN_KANJI_STRINGS[level]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("SHINBUN_KANJI_STRINGS is not defined.");
}
const JINMEIYOU_KANJI = {};
if (typeof JINMEIYOU_KANJI_STRINGS !== "undefined") {
  for (const level in JINMEIYOU_KANJI_STRINGS) {
    JINMEIYOU_KANJI[level] = JINMEIYOU_KANJI_STRINGS[level]
      .split(" ")
      .filter((kanji) => kanji.trim() !== "");
  }
} else {
  console.error("JINMEIYOU_KANJI_STRINGS is not defined.");
}

// ===== DOM 요소 참조 =====
/**
 * 메인 드로잉 패널 요소
 * @type {HTMLElement}
 */
const drawingPanelForScroll = document.getElementById("mainDrawingPanel");

/**
 * 활성화된 급수 링크들
 * @type {HTMLElement[]}
 */
let activeJlptLevelLink = null,
  activeKankenLevelLink = null,
  activeGakunenLevelLink = null,
  activeKakusuuLevelLink = null,
  activeBushuLevelLink = null,
  activeShinbunLevelLink = null,
  activeJinmeiyouLevelLink = null;

const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const mainSidebar = document.getElementById("mainSidebar");
const contentArea = document.getElementById("mainContentArea");
// Original kanjiInput and loadKanjiBtn are now in the modal, rename for clarity
// const kanjiInput = document.getElementById("kanjiInput"); // This ID is removed from main area
const searchKanjiBtn = document.getElementById("searchKanjiBtn");
// const loadKanjiBtn = document.getElementById("loadKanjiBtn"); // This ID is removed from main area

// New elements for the modal
const searchModal = document.getElementById("searchModal");
const closeSearchModalBtn = document.getElementById("closeSearchModalBtn");
const modalKanjiInput = document.getElementById("modalKanjiInput");
// The searchResults div retains its ID but is now in the modal
const searchResultsDiv = document.getElementById("searchResults"); // Renamed to avoid conflict if needed
const searchResultContentDiv = document.getElementById("searchResultContent"); // Renamed

const renderingStyleSelect = document.getElementById("renderingStyleSelect");
const firstStrokeBtn = document.getElementById("firstStrokeBtn");
const prevStrokeBtn = document.getElementById("prevStrokeBtn");
const nextStrokeBtn = document.getElementById("nextStrokeBtn");
const animateStrokeBtn = document.getElementById("animateStrokeBtn");
const animateAllStrokesBtn = document.getElementById("animateAllStrokesBtn");
const revealAllBtn = document.getElementById("revealAllBtn");
const resetKanjiBtn = document.getElementById("resetKanjiBtn");
const clearUserDrawingBtn = document.getElementById("clearUserDrawingBtn");
const gridCanvas = document.getElementById("gridCanvas");
const guideCanvas = document.getElementById("guideCanvas");
const radicalHighlightCanvas = document.getElementById(
  "radicalHighlightCanvas"
);
const userCanvas = document.getElementById("userCanvas");
let gridCtx, guideCtx, radicalHighlightCtx, userCtx;
const messageDiv = document.getElementById("message");
const penColorInput = document.getElementById("penColor");
const penWidthInput = document.getElementById("penWidthInput");
const gridToggle = document.getElementById("gridToggle");
const radicalInsertPoint = document.getElementById("radicalInsertPoint");
const saveToNoteBtn = document.getElementById("saveToNoteBtn");
const noteListUl = document.getElementById("noteList");
const hiddenSvgPathContainer = document.getElementById(
  "hiddenSvgPathContainer"
);
const animationSpeedInput = document.getElementById("animationSpeedInput");

// Remove sidebar-related variables and functions
let filteredKanjiData = null;

// Add these variables at the top with other global variables
const mainCategorySelect = document.getElementById("mainCategorySelect");
const subCategorySelect = document.getElementById("subCategorySelect");
let activeCategory = "all";
let activeSubCategory = "all";

// Define subcategories for each main category
const subCategories = {
  jlpt: ["N5", "N4", "N3", "N2", "N1"],
  kanken: [
    "10급",
    "9급",
    "8급",
    "7급",
    "6급",
    "5급",
    "4급",
    "3급",
    "준2급",
    "2급",
    "준1급",
    "1급",
  ],
  gakunen: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년", "중학생"],
  kakusuu: Array.from({ length: 20 }, (_, i) => `${i + 1}획`),
  bushu: Array.from({ length: 17 }, (_, i) => `${i + 1}획 부수`),
  shinbun: ["1순위", "2순위", "3순위", "4순위", "5순위"],
  jinmeiyou: ["통상 사용 한자", "제한 사용 한자"],
};

// Function to get subcategories from kanjiData
function getSubCategories(mainCategory) {
  if (!kanjiData) return [];

  const subCategories = new Set();

  // Iterate through all kanji data to collect unique subcategories
  Object.entries(kanjiData).forEach(([kanji, data]) => {
    if (data.all_categories) {
      data.all_categories.forEach((cat) => {
        if (typeof cat === "string") {
          const [type, value] = cat.split(":");
          if (type === mainCategory && value && value !== "None") {
            subCategories.add(value);
          }
        }
      });
    }
  });

  // Convert Set to Array and sort
  return Array.from(subCategories).sort((a, b) => {
    // Special sorting for different categories
    switch (mainCategory) {
      case "jlpt":
        return a.localeCompare(b); // N1, N2, N3, N4, N5
      case "kanken":
        // Sort by grade number
        const getGradeNum = (grade) => {
          if (grade.includes("준")) return 0.5;
          return parseInt(grade) || 0;
        };
        return getGradeNum(b) - getGradeNum(a); // Higher grade first
      case "gakunen":
        // Sort by grade number
        const getGradeNum2 = (grade) => {
          if (grade === "중학생") return 7;
          return parseInt(grade) || 0;
        };
        return getGradeNum2(a) - getGradeNum2(b); // Lower grade first
      case "kakusuu":
        // Sort by stroke count
        const getStrokeNum = (strokes) => parseInt(strokes) || 0;
        return getStrokeNum(a) - getStrokeNum(b);
      case "bushu":
        // Sort by radical stroke count
        const getRadicalNum = (radical) => parseInt(radical) || 0;
        return getRadicalNum(a) - getRadicalNum(b);
      case "shinbun":
        // Sort by rank number
        const getRankNum = (rank) => parseInt(rank) || 0;
        return getRankNum(a) - getRankNum(b);
      case "jinmeiyou":
        // Keep original order for jinmeiyou
        return 0;
      default:
        return a.localeCompare(b);
    }
  });
}

// Handle main category change
if (mainCategorySelect) {
  mainCategorySelect.addEventListener("change", (e) => {
    const selectedCategory = e.target.value;
    activeCategory = selectedCategory;
    activeSubCategory = "all"; // 서브카테고리를 '전체'로 초기화

    // Update subcategory select
    if (subCategorySelect) {
      if (selectedCategory === "all") {
        subCategorySelect.disabled = true;
        subCategorySelect.innerHTML = '<option value="all">전체</option>';
      } else {
        subCategorySelect.disabled = false;
        const options = getSubCategories(selectedCategory);
        subCategorySelect.innerHTML =
          '<option value="all">전체</option>' +
          options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("");
        subCategorySelect.value = "all"; // 서브카테고리 선택을 '전체'로 설정
      }
    }

    handleSearch(modalKanjiInput.value);
  });
}

// Handle subcategory change
if (subCategorySelect) {
  subCategorySelect.addEventListener("change", (e) => {
    activeSubCategory = e.target.value;
    handleSearch(modalKanjiInput.value);
  });
}

function showMessage(msg) {
  if (messageDiv) messageDiv.textContent = msg;
  else console.log("MSG:", msg);
}
function addMouseWheelControl(inputElement) {
  if (!inputElement || inputElement.dataset.wheelListenerAdded === "true")
    return;
  inputElement.dataset.wheelListenerAdded = "true";
  inputElement.addEventListener(
    "wheel",
    function (event) {
      if (
        inputElement.disabled ||
        (typeof animationFrameId !== "undefined" &&
          animationFrameId !== null) ||
        (typeof isAnimatingAll !== "undefined" && isAnimatingAll)
      ) {
        if (event.cancelable) event.preventDefault(); // Only prevent default if it's cancelable
        return;
      }
      if (event.cancelable) event.preventDefault(); // Prevent default scrolling behavior
      let val = parseFloat(inputElement.value);
      const step = parseFloat(inputElement.step) || 1;
      const min = parseFloat(inputElement.min);
      const max = parseFloat(inputElement.max);
      const stepStr = String(inputElement.step);
      const decimalPlaces = stepStr.includes(".")
        ? stepStr.split(".")[1].length
        : 0;
      if (event.deltaY < 0)
        val = Math.min(val + step, isNaN(max) ? Infinity : max);
      else if (event.deltaY > 0)
        val = Math.max(val - step, isNaN(min) ? -Infinity : min);
      if (decimalPlaces > 0) inputElement.value = val.toFixed(decimalPlaces);
      else inputElement.value = String(Math.round(val));
      inputElement.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      );
      inputElement.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true })
      );
    },
    { passive: false }
  ); // Explicitly set passive to false for wheel event if preventDefault is used
}

/**
 * 현재 선택된 한자
 * @type {string}
 */
let currentKanji = "";

/**
 * 획 데이터 배열
 * @type {Array<Object>}
 */
let strokesData = [];

/**
 * 현재 표시 중인 획 인덱스
 * @type {number}
 */
let currentStrokeDisplayIndex = -1;

/**
 * 총 획수
 * @type {number}
 */
let totalStrokes = 0;

/**
 * 사용자 그리기 상태
 * @type {boolean}
 */
let isUserDrawing = false;

/**
 * KanjiVG 기본 크기
 * @type {number}
 */
const KVG_SIZE = 109;

/**
 * 캔버스 크기와 스케일 팩터
 * @type {number}
 */
let canvasSize, scaleFactor;

/**
 * 애니메이션 프레임 ID
 * @type {number|null}
 */
let animationFrameId = null;

/**
 * 전체 애니메이션 상태
 * @type {boolean}
 */
let isAnimatingAll = false;

/**
 * 현재 애니메이션 중인 획 인덱스
 * @type {number}
 */
let currentAnimationStrokeIndex = 0;

/**
 * 강조된 요소
 * @type {string|null}
 */
let highlightedElement = null;

/**
 * 현재 렌더링 스타일
 * @type {string}
 */
let currentRenderingStyle = "standard";

/**
 * 애니메이션 속도 배수
 * @type {number}
 */
let animationSpeedMultiplier = 1.0;

/**
 * 렌더링 스타일 정의
 * @type {Object}
 */
const RENDER_STYLES = {
  "thin-pen": {
    baseLineWidth: 2,
    lineCap: "butt",
    lineJoin: "miter",
    animSpeedFactor: 1.0,
    taperFactor: 0.1,
    minWidthFactor: 0.8,
  },
  standard: {
    baseLineWidth: 4,
    lineCap: "round",
    lineJoin: "round",
    animSpeedFactor: 1.0,
    taperFactor: 0,
    minWidthFactor: 1.0,
  },
  "thick-brush": {
    baseLineWidth: 8,
    lineCap: "round",
    lineJoin: "round",
    animSpeedFactor: 1.3,
    taperFactor: 0.4,
    minWidthFactor: 0.5,
  },
};

function adjustSidebarAndButtonImmediately() {
  if (!mainSidebar || !sidebarToggleBtn || !contentArea) return;
  const isMobile = window.innerWidth <= 768;
  const sidebarIsOpen = !mainSidebar.classList.contains("closed");
  const currentSidebarWidth = sidebarIsOpen ? mainSidebar.offsetWidth : 0;
  sidebarToggleBtn.style.position = "fixed";
  sidebarToggleBtn.style.top = "10px";
  sidebarToggleBtn.style.right = "auto";
  if (isMobile) {
    contentArea.style.marginLeft = "0px";
    sidebarToggleBtn.style.left = sidebarIsOpen
      ? currentSidebarWidth + 10 + "px"
      : "10px";
  } else {
    contentArea.style.marginLeft = currentSidebarWidth + "px";
    sidebarToggleBtn.style.left = sidebarIsOpen
      ? currentSidebarWidth + 10 + "px"
      : "10px";
  }
  sidebarToggleBtn.textContent = sidebarIsOpen ? "☰ 메뉴 닫기" : "☰ 메뉴 열기";
}

function createSidebarMenu() {
  const sidebar = mainSidebar;
  if (!sidebar) return;
  const existingTitle = sidebar.querySelector("h3.menu-main-title");
  if (existingTitle) existingTitle.remove();
  sidebar.querySelectorAll(".menu-category").forEach((cat) => cat.remove());
  let menuTitle = document.createElement("h3");
  menuTitle.textContent = "학습 메뉴";
  menuTitle.className = "menu-main-title";
  sidebar.appendChild(menuTitle);

  function createMenuCategory(title, dataObject, levelsOrder, type) {
    if (
      typeof dataObject !== "undefined" &&
      Object.keys(dataObject).length > 0
    ) {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "menu-category";
      const header = document.createElement("h4");
      header.textContent = `${title} ►`;
      categoryDiv.appendChild(header);
      const list = document.createElement("ul");
      list.style.display = "none";
      header.onclick = () => {
        const isHidden = list.style.display === "none";
        list.style.display = isHidden ? "block" : "none";
        header.textContent = isHidden ? `${title} ▼` : `${title} ►`;
        requestAnimationFrame(adjustSidebarAndButtonImmediately);
      };
      levelsOrder.forEach((level) => {
        if (dataObject[level]) {
          const listItem = document.createElement("li");
          const link = document.createElement("a");
          link.href = "#";
          let linkText =
            level +
            (Array.isArray(dataObject[level])
              ? ` (${dataObject[level].length}자)`
              : "");
          link.textContent = linkText;
          link.dataset.level = level;
          link.dataset.type = type;
          link.onclick = (e) => {
            e.preventDefault();
            [
              activeJlptLevelLink,
              activeKankenLevelLink,
              activeGakunenLevelLink,
              activeKakusuuLevelLink,
              activeBushuLevelLink,
              activeShinbunLevelLink,
              activeJinmeiyouLevelLink,
            ].forEach((l) => {
              if (l && l !== link) l.classList.remove("active-level");
            });
            link.classList.add("active-level");
            if (type === "jlpt") activeJlptLevelLink = link;
            else activeJlptLevelLink = null; // 다른 타입이 선택되면 초기화
            if (type === "kanken") activeKankenLevelLink = link;
            else activeKankenLevelLink = null;
            if (type === "gakunen") activeGakunenLevelLink = link;
            else activeGakunenLevelLink = null;
            if (type === "kakusuu") activeKakusuuLevelLink = link;
            else activeKakusuuLevelLink = null;
            if (type === "bushu") activeBushuLevelLink = link;
            else activeBushuLevelLink = null;
            if (type === "shinbun") activeShinbunLevelLink = link;
            else activeShinbunLevelLink = null;
            if (type === "jinmeiyou") activeJinmeiyouLevelLink = link;
            else activeJinmeiyouLevelLink = null;
            displayKanjiList(level, type);
            if (
              window.innerWidth <= 768 &&
              sidebar &&
              !sidebar.classList.contains("closed")
            ) {
              mainSidebar.classList.add("closed");
              adjustSidebarAndButtonImmediately();
            }
          };
          listItem.appendChild(link);
          list.appendChild(listItem);
        }
      });
      categoryDiv.appendChild(list);
      sidebar.appendChild(categoryDiv);
    } else {
      console.warn(`Data for ${title} is not available or empty.`);
    }
  }
  createMenuCategory(
    "JLPT 급수별 한자",
    JLPT_KANJI,
    ["N5", "N4", "N3", "N2", "N1"],
    "jlpt"
  );
  createMenuCategory(
    "한자검정 급수별 한자",
    KANKEN_KANJI,
    [
      "10급",
      "9급",
      "8급",
      "7급",
      "6급",
      "5급",
      "4급",
      "3급",
      "준2급",
      "2급",
      "준1급",
      "1급",
    ],
    "kanken"
  );
  createMenuCategory(
    "학년별 배당 한자",
    GAKUNEN_KANJI,
    ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년", "중학생"],
    "gakunen"
  );
  createMenuCategory(
    "획수별 한자",
    KAKUSUU_KANJI,
    Object.keys(KAKUSUU_KANJI || {}).sort((a, b) => parseInt(a) - parseInt(b)),
    "kakusuu"
  );
  if (
    typeof BUSHU_KANJI !== "undefined" &&
    Object.keys(BUSHU_KANJI).length > 0
  ) {
    createMenuCategory(
      "부수별 한자",
      BUSHU_KANJI,
      Object.keys(BUSHU_KANJI).sort(),
      "bushu"
    );
  } else {
    console.warn("BUSHU_KANJI data is not available.");
  }
  if (
    typeof SHINBUN_KANJI !== "undefined" &&
    Object.keys(SHINBUN_KANJI).length > 0
  ) {
    const order = Object.keys(SHINBUN_KANJI).sort(
      (a, b) =>
        parseInt(a.match(/^(\d+)/)?.[1] || 0) -
        parseInt(b.match(/^(\d+)/)?.[1] || 0)
    );
    createMenuCategory(
      "신문 사용 빈도별 한자",
      SHINBUN_KANJI,
      order,
      "shinbun"
    );
  } else {
    console.warn("SHINBUN_KANJI data is not available.");
  }
  if (
    typeof JINMEIYOU_KANJI !== "undefined" &&
    Object.keys(JINMEIYOU_KANJI).length > 0
  ) {
    createMenuCategory(
      "일본 인명용 한자",
      JINMEIYOU_KANJI,
      Object.keys(JINMEIYOU_KANJI).sort(),
      "jinmeiyou"
    );
  } else {
    console.warn("JINMEIYOU_KANJI data is not available.");
  }
  requestAnimationFrame(adjustSidebarAndButtonImmediately);
}

function displayKanjiList(level, type) {
  const container = document.getElementById("kanjiListDisplayContainer");
  let kanjiListToShow,
    sourceName = "",
    levelName = level;
  if (type === "jlpt") {
    kanjiListToShow = JLPT_KANJI[level];
    sourceName = "JLPT";
  } else if (type === "kanken") {
    kanjiListToShow = KANKEN_KANJI[level];
    sourceName = "한자검정";
  } else if (type === "gakunen") {
    kanjiListToShow = GAKUNEN_KANJI[level];
    sourceName = "학년별";
  } else if (type === "kakusuu") {
    kanjiListToShow = KAKUSUU_KANJI[level];
    sourceName = "획수별";
    levelName = `${level}획`;
  } else if (type === "bushu") {
    kanjiListToShow = BUSHU_KANJI[level];
    sourceName = "부수";
  } else if (type === "shinbun") {
    kanjiListToShow = SHINBUN_KANJI[level];
    sourceName = "신문 빈도";
  } else if (type === "jinmeiyou") {
    kanjiListToShow = JINMEIYOU_KANJI[level];
    sourceName = "인명용";
  } else {
    if (container)
      container.innerHTML = `<p>알 수 없는 타입의 한자 목록입니다.</p>`;
    showMessage(`알 수 없는 타입의 한자 목록.`);
    return;
  }
  if (!container) return;
  if (!kanjiListToShow || kanjiListToShow.length === 0) {
    container.innerHTML = `<p>${sourceName ? sourceName + " " : ""
      }${levelName} 한자 목록이 없거나 준비되지 않았습니다.</p>`;
    showMessage(
      `${sourceName ? sourceName + " " : ""}${levelName} 한자 목록 없음.`
    );
    return;
  }
  container.innerHTML = "";
  const displayName = `${sourceName} ${levelName}`;
  showMessage(
    `${displayName} (${kanjiListToShow.length}자) 목록입니다. 연습할 한자를 선택하세요.`
  );
  kanjiListToShow.forEach((kanji) => {
    const btn = document.createElement("button");
    btn.textContent = kanji;
    btn.title = `한자 '${kanji}' 연습하기 (${displayName})`;
    btn.onclick = () => {
      // When a kanji is clicked in the sidebar list, set the value in the modal input
      // and open the modal for potential loading or refinement.
      // Or maybe just load it directly? Let's keep direct loading for sidebar clicks.
      // If direct load is preferred, we need to keep a main kanji input hidden or virtual.
      // For now, let's assume sidebar clicks load directly into the main practice area.
      // We need a mechanism to set the currentKanji and trigger load without the modal.
      // Let's introduce a hidden input or variable to hold the selected kanji for loading.
      // For now, let's revert this part to load directly.
      // Reverting this change for now, sidebar clicks should load directly.
      // Need to re-evaluate how kanjiInput and loadKanjiBtn are handled globally.
      // Temporarily commenting out the kanjiInput/loadKanjiBtn reference here.
      // This section needs refinement based on how the main kanji state is managed.
      // Let's put the original logic back, but it will need to interact with the *modal* input.
      // A better approach is to have the main canvas logic react to a global currentKanji variable.
      // Let's use a hidden input for the main kanji.

      // Option 1: Use a hidden input for the main kanji.
      let mainKanjiInputHidden = document.getElementById(
        "mainKanjiInputHidden"
      );
      if (!mainKanjiInputHidden) {
        mainKanjiInputHidden = document.createElement("input");
        mainKanjiInputHidden.type = "hidden";
        mainKanjiInputHidden.id = "mainKanjiInputHidden";
        document.body.appendChild(mainKanjiInputHidden);
      }
      mainKanjiInputHidden.value = kanji;
      // Trigger the load process
      loadKanjiData(kanji);
    };
    container.appendChild(btn);
  });
}

// Add these variables at the top with other global variables
let kanjiData = null;
let naverData = null;

// Add this function before loadKanjiData
function normalizeKanji(kanji) {
  // Normalize the kanji to handle full-width and half-width characters
  return kanji.normalize("NFKC");
}

// Add this function to load the data files
async function loadDataFiles() {
  try {
    // Wait for all required files to load
    const [naverResponse, kanjiDataResponse, mainJsResponse, stylesResponse] =
      await Promise.all([
        fetch("data/get_naver_hanja_details.json"),
        fetch("data/kanjiData.js"),
        fetch("data/main.js"),
        fetch("data/styles.css"),
      ]);

    // Check if all responses are ok
    if (
      !naverResponse.ok ||
      !kanjiDataResponse.ok ||
      !mainJsResponse.ok ||
      !stylesResponse.ok
    ) {
      throw new Error("One or more required files failed to load");
    }

    // Load the data
    naverData = await naverResponse.json();

    // Show loading message
    showMessage("데이터 로드 완료. 준비되었습니다.");
  } catch (error) {
    console.error("Error loading data files:", error);
    showMessage("데이터 파일 로드 중 오류가 발생했습니다.");
  }
}

// Add category filter click handlers
document.querySelectorAll(".category-filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    document
      .querySelectorAll(".category-filter")
      .forEach((f) => f.classList.remove("active"));
    filter.classList.add("active");
    activeCategory = filter.dataset.category;
    handleSearch(modalKanjiInput.value);
  });
});

let activeSearchType = "all";

// Add search type filter click handlers
document.querySelectorAll(".search-type-filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    document
      .querySelectorAll(".search-type-filter")
      .forEach((f) => f.classList.remove("active"));
    filter.classList.add("active");
    activeSearchType = filter.dataset.type;
    handleSearch(modalKanjiInput.value);
  });
});

// Add these variables at the top with other global variables
let searchTimeout = null;
let currentSearchPage = 1;
const RESULTS_PER_PAGE = 20;

// Enhanced search function with debouncing and pagination
function handleSearch(input) {
  // Clear any existing timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Set a new timeout for debouncing
  searchTimeout = setTimeout(() => {
    const searchResults = document.getElementById("searchResults");
    const searchResultContent = document.getElementById("searchResultContent");

    if (!naverData) {
      searchResults.style.display = "none";
      return;
    }

    const searchLower = input.toLowerCase();
    let matches = Object.entries(naverData).filter(([kanji, data]) => {
      // 1. Category filters (both main and sub)
      if (activeCategory !== "all") {
        const categories = data.naver_data.additional_info || [];
        const hasCategory = categories.some((info) => {
          if (info.category === activeCategory) {
            // If subcategory is 'all', only check main category
            if (activeSubCategory === "all") return true;
            // Check subcategory
            return info.description.includes(activeSubCategory);
          }
          return false;
        });
        if (!hasCategory) return false;
      }

      // 2. Search term filter
      if (!input) return true;

      if (activeSearchType === "all") {
        return (
          kanji.includes(input) ||
          data.naver_data.basic_info.pronunciations.some((p) =>
            p.toLowerCase().includes(searchLower)
          ) ||
          data.naver_data.basic_info.hun_meanings.some((h) =>
            h.toLowerCase().includes(searchLower)
          ) ||
          data.naver_data.basic_search_meanings.some((m) =>
            m.toLowerCase().includes(searchLower)
          )
        );
      } else if (activeSearchType === "kanji") {
        return kanji.includes(input);
      } else if (activeSearchType === "on") {
        return data.naver_data.basic_info.pronunciations.some((p) =>
          p.toLowerCase().includes(searchLower)
        );
      } else if (activeSearchType === "kun") {
        return data.naver_data.basic_info.hun_meanings.some((h) =>
          h.toLowerCase().includes(searchLower)
        );
      } else if (activeSearchType === "meaning") {
        return data.naver_data.basic_search_meanings.some((m) =>
          m.toLowerCase().includes(searchLower)
        );
      }
      return false;
    });

    const totalResults = matches.length;

    // Create or update results count display outside of search results
    let resultsCountDiv = document.getElementById("searchResultsCount");
    if (!resultsCountDiv) {
      resultsCountDiv = document.createElement("div");
      resultsCountDiv.id = "searchResultsCount";
      resultsCountDiv.style.textAlign = "center";
      resultsCountDiv.style.padding = "10px 0";
      resultsCountDiv.style.color = "#666";
      resultsCountDiv.style.borderBottom = "1px solid #eee";
      resultsCountDiv.style.marginBottom = "10px";
      // Insert before search results
      searchResults.parentNode.insertBefore(resultsCountDiv, searchResults);
    }
    resultsCountDiv.textContent = `검색 결과: ${totalResults}개`;

    if (matches.length === 0) {
      searchResults.style.display = "block";
      searchResultContent.innerHTML =
        '<p style="text-align: center; color: #777;">검색 결과가 없습니다.</p>';
      return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(matches.length / RESULTS_PER_PAGE);
    const startIndex = (currentSearchPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    const currentPageResults = matches.slice(startIndex, endIndex);

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    // Add results
    currentPageResults.forEach(([kanji, data]) => {
      const categories = data.naver_data.additional_info || [];
      const pronunciations =
        data.naver_data.basic_info.pronunciations.join(", ");
      const hunMeanings = data.naver_data.basic_info.hun_meanings.join(", ");
      const meanings = data.naver_data.basic_search_meanings.join(", ");

      const resultDiv = document.createElement("div");
      resultDiv.className = "search-result-item";
      resultDiv.onclick = () => selectKanji(kanji);
      resultDiv.innerHTML = `
            <div class="search-result-header">
              <div class="kanji-display">${kanji}</div>
              <div class="kanji-info">
                <div class="kanji-pronunciation">음독: ${pronunciations}</div>
                <div class="kanji-pronunciation">훈독: ${hunMeanings}</div>
                <div class="kanji-meaning">의미: ${meanings}</div>
                <div class="kanji-categories">
                  ${categories
          .map((info) => {
            if (info.description === "None") return "";
            const typeName =
              info.category === "jlpt"
                ? "JLPT"
                : info.category === "kanken"
                  ? "일본한자능력검정시험"
                  : info.category === "gakunen"
                    ? ""
                    : info.category === "kakusuu"
                      ? ""
                      : info.category === "bushu"
                        ? "부수: "
                        : info.category === "shinbun"
                          ? "신문 사용 빈도: "
                          : info.category === "jinmeiyou"
                            ? ""
                            : info.category;
            return `<span class="category-tag ${info.category}">${typeName} ${info.description}</span>`;
          })
          .filter((tag) => tag !== "")
          .join("")}
                </div>
              </div>
            </div>
          `;
      fragment.appendChild(resultDiv);
    });

    // Clear and update the content
    searchResultContent.innerHTML = "";
    searchResultContent.appendChild(fragment);
    searchResults.style.display = "block";

    // Scroll search results to top
    searchResults.scrollTop = 0;

    // Remove existing pagination if any
    const existingPagination = document.querySelector(".pagination-container");
    if (existingPagination) {
      existingPagination.remove();
    }

    // Create and add pagination container after search results
    if (totalPages > 1) {
      const paginationContainer = document.createElement("div");
      paginationContainer.className = "pagination-container";
      paginationContainer.style.textAlign = "center";
      paginationContainer.style.padding = "15px 0";
      paginationContainer.style.borderTop = "1px solid #eee";
      paginationContainer.style.marginTop = "15px";

      // Previous page button (항상 표시, 첫 페이지면 비활성화)
      const prevBtn = document.createElement("button");
      prevBtn.textContent = "이전";
      prevBtn.disabled = currentSearchPage <= 1;
      prevBtn.style.margin = "8px";
      prevBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentSearchPage > 1) {
          currentSearchPage--;
          handleSearch(input);
        }
      };
      paginationContainer.appendChild(prevBtn);

      // Page input
      const pageInput = document.createElement("input");
      pageInput.type = "number";
      pageInput.min = 1;
      pageInput.max = totalPages;
      pageInput.value = currentSearchPage;
      const digitCount = String(totalPages).length;
      pageInput.style.width = digitCount * 18 + 36 + "px"; // 스핀 아이콘까지 고려해 넉넉하게
      pageInput.style.minWidth = "60px";
      pageInput.style.maxWidth = "90px";
      pageInput.style.fontFamily = "monospace";
      pageInput.style.textAlign = "center";
      pageInput.style.fontWeight = "bold";
      pageInput.style.fontSize = "1.1em";
      pageInput.style.boxSizing = "border-box";
      pageInput.style.margin = "0"; // margin 제거

      // 모바일 환경에서는 입력 시 바로 갱신하지 않고, 키보드 확인 버튼을 통해 갱신
      if (window.innerWidth <= 768) {
        // 모바일에서는 oninput 이벤트 제거
        pageInput.oninput = null;

        // 포커스아웃 시에도 갱신하지 않음
        pageInput.onblur = null;

        // 마우스 휠 이벤트도 제거
        pageInput.removeEventListener("wheel", null);

        // 엔터키(키보드 확인 버튼)로만 갱신
        pageInput.onkeydown = (e) => {
          if (e.key === "Enter") {
            let val = parseInt(pageInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > totalPages) val = totalPages;
            currentSearchPage = val;
            handleSearch(input);
          }
        };
      } else {
        // 데스크탑에서는 입력할 때마다 갱신
        pageInput.oninput = () => {
          let val = parseInt(pageInput.value, 10);
          if (isNaN(val) || val < 1) val = 1;
          if (val > totalPages) val = totalPages;
          currentSearchPage = val;
          handleSearch(input);
        };

        // 엔터키로도 갱신
        pageInput.onkeydown = (e) => {
          if (e.key === "Enter") {
            let val = parseInt(pageInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > totalPages) val = totalPages;
            currentSearchPage = val;
            handleSearch(input);
          }
        };

        // 포커스아웃 시에도 갱신
        pageInput.onblur = () => {
          let val = parseInt(pageInput.value, 10);
          if (isNaN(val) || val < 1) val = 1;
          if (val > totalPages) val = totalPages;
          currentSearchPage = val;
          handleSearch(input);
        };

        // 마우스 휠로 페이지 조절
        pageInput.addEventListener(
          "wheel",
          function (event) {
            event.preventDefault();
            let val = parseInt(pageInput.value, 10) || 1;
            if (event.deltaY < 0) val = Math.min(val + 1, totalPages); // up
            else if (event.deltaY > 0) val = Math.max(val - 1, 1); // down
            pageInput.value = val;
            currentSearchPage = val;
            handleSearch(input);
          },
          { passive: false }
        );
      }
      paginationContainer.appendChild(pageInput);

      // Total pages
      const totalSpan = document.createElement("span");
      totalSpan.textContent = ` / ${totalPages}`;
      totalSpan.style.margin = "0"; // margin 제거
      paginationContainer.appendChild(totalSpan);

      // Next page button (항상 표시, 마지막 페이지면 비활성화)
      const nextBtn = document.createElement("button");
      nextBtn.textContent = "다음";
      nextBtn.disabled = currentSearchPage >= totalPages;
      nextBtn.style.margin = "8px";
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentSearchPage < totalPages) {
          currentSearchPage++;
          handleSearch(input);
        }
      };
      paginationContainer.appendChild(nextBtn);

      // Add pagination container after search results
      searchResults.parentNode.insertBefore(
        paginationContainer,
        searchResults.nextSibling
      );
    }
  }, 300); // 300ms debounce delay
}

// Reset search page when input changes
if (modalKanjiInput) {
  modalKanjiInput.addEventListener("input", (e) => {
    currentSearchPage = 1; // Reset to first page on new search
    handleSearch(e.target.value);
  });
}

// Add scroll to top when category changes
if (mainCategorySelect) {
  mainCategorySelect.addEventListener("change", (e) => {
    const selectedCategory = e.target.value;
    activeCategory = selectedCategory;
    currentSearchPage = 1; // Reset to first page

    // Update subcategory select
    if (subCategorySelect) {
      if (selectedCategory === "all") {
        subCategorySelect.disabled = true;
        subCategorySelect.innerHTML = '<option value="all">전체</option>';
      } else {
        subCategorySelect.disabled = false;
        const options = getSubCategories(selectedCategory);
        subCategorySelect.innerHTML =
          '<option value="all">전체</option>' +
          options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("");
        subCategorySelect.value = "all"; // 서브카테고리 선택을 '전체'로 설정
      }
    }

    handleSearch(modalKanjiInput.value);
  });
}

// Add scroll to top when subcategory changes
if (subCategorySelect) {
  subCategorySelect.addEventListener("change", (e) => {
    activeSubCategory = e.target.value;
    currentSearchPage = 1; // Reset to first page
    handleSearch(modalKanjiInput.value);
  });
}

// Add scroll to top when search type changes
document.querySelectorAll(".search-type-filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    document
      .querySelectorAll(".search-type-filter")
      .forEach((f) => f.classList.remove("active"));
    filter.classList.add("active");
    activeSearchType = filter.dataset.type;
    currentSearchPage = 1; // Reset to first page
    handleSearch(modalKanjiInput.value);
  });
});

// Modify window.onload to remove sidebar initialization
window.onload = async () => {
  await loadDataFiles();
  setupCanvases();

  // Initialize pen settings
  if (userCtx) {
    userCtx.strokeStyle = penColorInput ? penColorInput.value : "#FF0000";
    userCtx.lineWidth = penWidthInput ? parseFloat(penWidthInput.value) : 3.0;
  }

  updateButtonStates();
  if (animationSpeedInput) addMouseWheelControl(animationSpeedInput);
  if (penWidthInput) addMouseWheelControl(penWidthInput);

  // Trigger initial search when page loads
  handleSearch("");

  // Ensure radical info modal is hidden on page load
  const radicalInfoModal = document.getElementById("radicalInfoModal");
  if (radicalInfoModal) {
    radicalInfoModal.style.display = "none";
  }
};

// Remove sidebar-related event listeners and functions
window.addEventListener("resize", () => {
  setupCanvases();
});

// Add input event listener for kanjiInput
if (modalKanjiInput) {
  modalKanjiInput.addEventListener("input", (e) => {
    handleSearch(e.target.value);
  });
}

function setupCanvases() {
  resizeCanvasContainer();
  gridCtx = gridCanvas ? gridCanvas.getContext("2d") : null;
  guideCtx = guideCanvas ? guideCanvas.getContext("2d") : null;
  radicalHighlightCtx = radicalHighlightCanvas
    ? radicalHighlightCanvas.getContext("2d")
    : null;
  userCtx = userCanvas ? userCanvas.getContext("2d") : null;

  // Initialize pen settings when setting up canvases
  if (userCtx) {
    userCtx.lineCap = "round";
    userCtx.lineJoin = "round";
    userCtx.strokeStyle = penColorInput ? penColorInput.value : "#FF0000";
    userCtx.lineWidth = penWidthInput ? parseFloat(penWidthInput.value) : 3.0;
  }

  if (guideCtx) {
    guideCtx.lineCap = "round";
    guideCtx.lineJoin = "round";
  }
  if (radicalHighlightCtx) {
    radicalHighlightCtx.lineCap = "round";
    radicalHighlightCtx.lineJoin = "round";
  }

  scaleFactor = canvasSize / KVG_SIZE;
  updatePenStyle();

  // Ensure grid state is properly initialized
  if (gridToggle && gridCtx) {
    // Force the grid toggle to be checked by default
    gridToggle.checked = true;
    // Draw the grid
    drawGrid();
  }

  if (
    currentKanji &&
    strokesData.length > 0 &&
    !animationFrameId &&
    !isAnimatingAll
  ) {
    renderGuideStrokes();
    drawRadicalHighlight();
  }
}

// --- Canvas resizing for 1:1 ratio and controls always visible ---
function resizeCanvasContainer() {
  const drawingPanel = document.getElementById("mainDrawingPanel");
  const canvasContainer = document.getElementById("canvasContainer");
  const controls = drawingPanel.querySelector(".drawing-controls");
  if (!drawingPanel || !canvasContainer || !controls) return;

  // Calculate total height of controls including margins and padding
  const controlsStyle = window.getComputedStyle(controls);
  const controlsTotalHeight =
    controls.offsetHeight +
    parseFloat(controlsStyle.marginTop) +
    parseFloat(controlsStyle.marginBottom) +
    parseFloat(controlsStyle.paddingTop) +
    parseFloat(controlsStyle.paddingBottom);

  // Get the available space in the drawing panel
  const panelRect = drawingPanel.getBoundingClientRect();
  const availableHeight = panelRect.height - controlsTotalHeight - 36; // 36px margin
  const availableWidth = panelRect.width - 20; // 20px margin

  // Calculate the size that maintains aspect ratio and fits in available space
  const size = Math.min(availableWidth, availableHeight);

  // Set minimum size to prevent canvas from becoming too small
  const minSize = 200;
  const finalSize = Math.max(minSize, size);

  // Update canvas container size
  canvasContainer.style.width = `${finalSize}px`;
  canvasContainer.style.height = `${finalSize}px`;
  canvasContainer.style.minWidth = `${finalSize}px`;
  canvasContainer.style.minHeight = `${finalSize}px`;
  canvasContainer.style.maxWidth = `${finalSize}px`;
  canvasContainer.style.maxHeight = `${finalSize}px`;
  canvasSize = finalSize;

  // Update all canvases
  const canvases = [
    "gridCanvas",
    "guideCanvas",
    "radicalHighlightCanvas",
    "userCanvas",
  ];

  canvases.forEach((id) => {
    const canvas = document.getElementById(id);
    if (canvas) {
      // Set canvas dimensions
      canvas.width = finalSize;
      canvas.height = finalSize;

      // Set canvas style dimensions
      canvas.style.width = `${finalSize}px`;
      canvas.style.height = `${finalSize}px`;
      canvas.style.minWidth = `${finalSize}px`;
      canvas.style.minHeight = `${finalSize}px`;
      canvas.style.maxWidth = `${finalSize}px`;
      canvas.style.maxHeight = `${finalSize}px`;
    }
  });

  // Redraw content if there's an active kanji
  if (currentKanji && strokesData.length > 0) {
    if (gridToggle && gridToggle.checked) drawGrid();
    renderGuideStrokes();
    drawRadicalHighlight();
  }
}

// Add resize observer to handle container size changes
const resizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    if (entry.target.id === "mainDrawingPanel") {
      resizeCanvasContainer();
    }
  }
});

// Start observing the drawing panel
const drawingPanel = document.getElementById("mainDrawingPanel");
if (drawingPanel) {
  resizeObserver.observe(drawingPanel);
}

// Also keep the window resize handler
window.addEventListener("resize", resizeCanvasContainer);

function drawGrid() {
  if (!gridCtx || !canvasSize) return;
  gridCtx.clearRect(0, 0, canvasSize, canvasSize);
  gridCtx.strokeStyle = "#e0e0e0";
  gridCtx.lineWidth = 1;
  gridCtx.strokeRect(0.5, 0.5, canvasSize - 1, canvasSize - 1);
  gridCtx.beginPath();
  gridCtx.moveTo(canvasSize / 2, 0);
  gridCtx.lineTo(canvasSize / 2, canvasSize);
  gridCtx.moveTo(0, canvasSize / 2);
  gridCtx.lineTo(canvasSize, canvasSize / 2);
  gridCtx.stroke();
  gridCtx.strokeStyle = "#f0f0f0";
  gridCtx.setLineDash([4, 4]);
  gridCtx.beginPath();
  gridCtx.moveTo(0, 0);
  gridCtx.lineTo(canvasSize, canvasSize);
  gridCtx.moveTo(canvasSize, 0);
  gridCtx.lineTo(0, canvasSize);
  gridCtx.stroke();
  gridCtx.setLineDash([]);
}

async function fetchKanjiVG(kanji) {
  if (!kanji || kanji.length !== 1) {
    showMessage("한 글자만 입력해주세요.");
    return null;
  }
  const unicodeHex = kanji.charCodeAt(0).toString(16).padStart(5, "0");
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${unicodeHex}.svg`;
  showMessage("한자 데이터 불러오는 중...");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`KanjiVG 데이터(${unicodeHex}) 없음.`);
    const svgText = await response.text();
    showMessage("데이터 로드 완료. 파싱 중...");
    return svgText;
  } catch (error) {
    console.error("Error fetching KanjiVG:", error);
    showMessage(error.message);
    return null;
  }
}

function parseSVG(svgText) {
  strokesData = [];
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
  const kvgNS = "http://kanjivg.tagaini.net";

  // getKvgAttr 함수 완전 개선: attributes 순회까지 포함
  function getKvgAttr(element, attrName) {
    let val =
      element.getAttributeNS &&
      element.getAttributeNS("http://kanjivg.tagaini.net", attrName);
    if (val) return val;
    val = element.getAttribute && element.getAttribute("kvg:" + attrName);
    if (val) return val;
    val = element.getAttribute && element.getAttribute(attrName);
    if (val) return val;
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr.name === "kvg:" + attrName) return attr.value;
        if (attr.name === attrName) return attr.value;
      }
    }
    return null;
  }

  // path의 부모 g를 타고 올라가며 가장 가까운 element/radical/part를 찾음
  function findClosestElementAndRadical(pathEl) {
    let el = null,
      radical = null,
      radicalType = null,
      part = null;
    let current = pathEl.parentElement;
    while (current && current.tagName !== "svg") {
      if (current.tagName === "g") {
        if (!el) el = getKvgAttr(current, "element");
        if (!radical) {
          const rad = getKvgAttr(current, "radical");
          if (rad && rad !== "nil") {
            radical = getKvgAttr(current, "element");
            radicalType = rad;
          }
        }
        if (!part) part = getKvgAttr(current, "part");
      }
      current = current.parentElement;
    }
    return { el, radical, radicalType, part };
  }

  const pathElements = Array.from(svgDoc.querySelectorAll("path[id]"));
  pathElements.sort((a, b) => {
    const aId = getKvgAttr(a, "id") || "";
    const bId = getKvgAttr(b, "id") || "";
    const aNumMatch = aId.match(/Stroke(\d+)(-|$)/) || aId.match(/s(\d+)(-|$)/);
    const bNumMatch = bId.match(/Stroke(\d+)(-|$)/) || bId.match(/s(\d+)(-|$)/);
    const aNum = aNumMatch ? parseInt(aNumMatch[1]) : Infinity;
    const bNum = bNumMatch ? parseInt(bNumMatch[1]) : Infinity;
    return aNum - bNum;
  });

  if (pathElements.length === 0 && svgDoc.querySelector("path[d]")) {
    pathElements.push(
      ...Array.from(svgDoc.querySelectorAll("svg > g > path[d], svg > path[d]"))
    );
  }

  pathElements.forEach((pathEl, index) => {
    const d = pathEl.getAttribute("d");
    if (!d) return;

    const pathId = getKvgAttr(pathEl, "id");
    const numMatch = pathId
      ? pathId.match(/Stroke(\d+)/) || pathId.match(/s(\d+)/)
      : null;
    let number = numMatch ? numMatch[1] : (index + 1).toString();

    // --- 상위 element 추적 ---
    let ancestors = [];
    let currentParentNode = pathEl.parentElement;
    while (currentParentNode && currentParentNode.tagName !== "svg") {
      if (currentParentNode.tagName === "g") {
        const elAttr = getKvgAttr(currentParentNode, "element");
        if (elAttr) ancestors.push(elAttr);
      }
      currentParentNode = currentParentNode.parentElement;
    }

    // 부모 g를 타고 올라가며 가장 가까운 element/radical/part를 찾음
    const { el, radical, radicalType, part } =
      findClosestElementAndRadical(pathEl);

    // Fallback to SVG root element attributes if not found in parent Gs
    let rootElement = getKvgAttr(svgDoc.documentElement, "element");

    strokesData.push({
      d: d,
      id: pathId || `path${index + 1}`,
      element: el || rootElement,
      radicalElement: radical,
      radicalType: radicalType,
      part: part,
      number: number,
      ancestors: ancestors,
    });
  });

  totalStrokes = strokesData.length;
  extractAndDisplayElements();
}

function extractAndDisplayElements() {
  const radicalRow = document.querySelector(".radical-row");
  const shapeRow = document.querySelector(".shape-row");
  const metaRow = document.querySelector(".kanji-meta-row");
  const strokeCountInfo = document.getElementById("strokeCountInfo");
  const unicodeInfo = document.getElementById("unicodeInfo");
  if (!radicalInsertPoint) return;
  radicalInsertPoint.innerHTML = "";
  const shapeInsertPoint = document.getElementById("shapeInsertPoint");
  if (shapeInsertPoint) shapeInsertPoint.innerHTML = "";

  // 한자 정보가 없으면 모두 숨김
  if (!currentKanji || !strokesData.length) {
    if (radicalRow) radicalRow.style.display = "none";
    if (shapeRow) shapeRow.style.display = "none";
    if (metaRow) metaRow.style.display = "none";
    if (strokeCountInfo) strokeCountInfo.innerHTML = "";
    if (unicodeInfo) unicodeInfo.innerHTML = "";
    return;
  }

  // 한자 정보가 있으면 표시
  if (radicalRow) radicalRow.style.display = "flex";
  if (metaRow) metaRow.style.display = "flex";
  // shapeRow는 아래에서 정보 있을 때만 flex로 바꿈
  if (strokeCountInfo)
    strokeCountInfo.innerHTML = `<span class="meta-label">총 획수:</span> ${strokesData.length}`;
  if (unicodeInfo)
    unicodeInfo.innerHTML = `<span class="meta-label">유니코드:</span> U+${currentKanji
      .codePointAt(0)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}`;

  // Get radical information from additional_info if available
  let radicalChar = null;
  let radicalDesc = null;
  let shapeParts = null;
  if (currentKanji && naverData && naverData[currentKanji]) {
    const additionalInfo = naverData[currentKanji].naver_data.additional_info;
    if (additionalInfo) {
      const radicalEntry = additionalInfo.find(
        (info) => info.category === "부수"
      );
      if (radicalEntry) {
        // Extract the kanji and the rest (meaning, strokes, etc)
        // e.g. "皮\n(가죽피, 5획)" or "皮 (가죽피, 5획)"
        const match = radicalEntry.description.match(/^([\S]+)[\s\n]*(.*)$/);
        radicalChar = match
          ? match[1]
          : radicalEntry.description.split(/[\s\n(]/)[0];
        radicalDesc = match && match[2] ? match[2].trim() : null;
      }
      // 모양자 처리
      const shapeEntry = additionalInfo.find(
        (info) => info.category === "모양자"
      );
      if (shapeEntry && shapeEntry.description) {
        // Split by +, trim each part
        shapeParts = shapeEntry.description
          .split("+")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  }

  // Create radical button
  if (radicalChar) {
    if (radicalRow) radicalRow.style.display = "flex";
    const radicalBtn = document.createElement("button");
    radicalBtn.className = "radical-button";
    radicalBtn.textContent = radicalChar;
    if (radicalDesc)
      radicalBtn.title = radicalDesc.replace(/^\(/, "").replace(/\)$/, "");
    radicalBtn.onclick = () => showRadicalInfoModal(radicalChar);
    radicalInsertPoint.appendChild(radicalBtn);
  } else {
    if (radicalRow) radicalRow.style.display = "flex";
    const noRadicalInfo = document.createElement("span");
    noRadicalInfo.className = "no-radical-info";
    noRadicalInfo.textContent = "부수 정보가 없습니다.";
    radicalInsertPoint.appendChild(noRadicalInfo);
  }

  // 모양자 버튼 생성
  if (shapeRow && shapeInsertPoint) {
    shapeInsertPoint.innerHTML = "";
    if (shapeParts && shapeParts.length > 0) {
      shapeRow.style.display = "flex";
      shapeParts.forEach((part, idx) => {
        if (idx > 0) {
          shapeInsertPoint.appendChild(document.createTextNode(" + "));
        }
        const btn = document.createElement("button");
        btn.className = "radical-button";
        // 괄호 앞 한자만 버튼에
        const charMatch = part.match(/^([^\(]+)/);
        const kanjiChar = charMatch ? charMatch[1].trim() : part.trim();
        btn.textContent = kanjiChar;
        // 괄호 안 설명이 있으면 툴팁으로
        const parenMatch = part.match(/\(([^)]+)\)/);
        if (parenMatch) btn.title = parenMatch[1];
        btn.onclick = () => showRadicalInfoModal(kanjiChar);
        shapeInsertPoint.appendChild(btn);
      });
    } else {
      shapeRow.style.display = "none";
    }
  }
}

// 하위 elementKey까지 모두 포함하는 함수 추가
function getAllRelatedElementKeys(targetKey) {
  const keys = new Set();
  strokesData.forEach((stroke) => {
    if (stroke.element === targetKey || stroke.radicalElement === targetKey) {
      if (stroke.element) keys.add(stroke.element);
      if (stroke.radicalElement) keys.add(stroke.radicalElement);
    }
  });
  keys.add(targetKey);
  return Array.from(keys);
}

function toggleElementHighlight(elementKeysStr) {
  const keys = elementKeysStr ? elementKeysStr.split(",") : [];
  if (
    highlightedElement &&
    Array.isArray(highlightedElement) &&
    highlightedElement.length === keys.length &&
    highlightedElement.every((k, i) => k === keys[i])
  ) {
    highlightedElement = null;
  } else {
    highlightedElement = keys;
  }

  radicalInsertPoint.querySelectorAll("button").forEach((b) => {
    const bKeys = b.dataset.elementKeys ? b.dataset.elementKeys.split(",") : [];
    b.classList.toggle(
      "active",
      highlightedElement &&
      Array.isArray(highlightedElement) &&
      highlightedElement.length === bKeys.length &&
      highlightedElement.every((k, i) => k === bKeys[i])
    );
  });

  drawRadicalHighlight();
  renderGuideStrokes();
}

function drawRadicalHighlight() {
  if (!radicalHighlightCtx || !canvasSize) return;
  radicalHighlightCtx.clearRect(0, 0, canvasSize, canvasSize);
}

// Original isStrokePartOfHighlighted function
function isStrokePartOfHighlighted(strokeData) {
  if (!highlightedElement || !strokeData) return false;
  if (Array.isArray(highlightedElement)) {
    // element/radicalElement/ancestors 중 하나라도 포함되면 강조
    return (
      highlightedElement.includes(strokeData.element) ||
      highlightedElement.includes(strokeData.radicalElement) ||
      (strokeData.ancestors &&
        strokeData.ancestors.some((a) => highlightedElement.includes(a)))
    );
  }
  return (
    strokeData.element === highlightedElement ||
    strokeData.radicalElement === highlightedElement ||
    (strokeData.ancestors && strokeData.ancestors.includes(highlightedElement))
  );
}

function determineStrokeStyleAndColor(
  strokeIndex,
  baseStyle,
  context = "render"
) {
  const strokeData = strokesData[strokeIndex];
  const isHighlighted = isStrokePartOfHighlighted(strokeData);
  let color = "";
  let style = { ...baseStyle };

  if (context === "animation") {
    color = isHighlighted ? "#007BFF" : "#333";
  } else if (context === "hint") {
    color = isHighlighted
      ? "#007BFF".replace(")", ", 0.6)").replace("rgb", "rgba")
      : "rgb(211,211,211)";
  } else {
    color = isHighlighted ? "#007BFF" : "black";
  }
  // baseLineWidth는 항상 baseStyle의 값만 사용 (곱하기, 나누기, 보정 없음)
  return { color, style };
}

function renderGuideStrokes() {
  if (!guideCtx) return;
  stopAllAnimations();
  clearGuideCanvas();
  const currentStyle = RENDER_STYLES[currentRenderingStyle];
  for (let i = 0; i < totalStrokes; i++) {
    if (i <= currentStrokeDisplayIndex) {
      const { color, style } = determineStrokeStyleAndColor(
        i,
        currentStyle,
        "render"
      );
      drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
    } else if (i === currentStrokeDisplayIndex + 1) {
      // Hint for the very next stroke
      const { color, style } = determineStrokeStyleAndColor(
        i,
        currentStyle, // Use current style instead of RENDER_STYLES["standard"]
        "hint"
      );
      drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
    }
  }
  updateButtonStates();
  if (currentKanji && totalStrokes > 0 && !isAnimatingAll) {
    if (currentStrokeDisplayIndex >= totalStrokes - 1)
      showMessage(`'${currentKanji}' - 모든 획 표시 완료 (${totalStrokes}획)`);
    else if (currentStrokeDisplayIndex === -1)
      showMessage(
        `'${currentKanji}' 로드 (${totalStrokes}획).`
      );
    else
      showMessage(
        `'${currentKanji}' - 획 ${currentStrokeDisplayIndex + 1
        } / ${totalStrokes} 다음 획 표시 중.`
      );
  } else if (!currentKanji) {
    showMessage("한자를 입력하거나 왼쪽 메뉴에서 선택하세요.");
  }
}

function stopAllAnimations() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  isAnimatingAll = false;
  updateButtonStates();
}

function animateSingleStroke(pathD, color, styleProps, strokeIdxToAnimate) {
  if (!guideCtx) return;
  updateButtonStates();

  // Draw a background/hint for the stroke being animated
  const backgroundStyle = { ...styleProps };
  let backgroundColor = "rgb(211,211,211)";
  if (isStrokePartOfHighlighted(strokesData[strokeIdxToAnimate])) {
    backgroundColor = "rgb(173,216,230)";
  }
  drawPath(guideCtx, pathD, backgroundColor, backgroundStyle, scaleFactor);

  if (!hiddenSvgPathContainer) {
    drawPath(guideCtx, pathD, color, styleProps, scaleFactor);
    currentStrokeDisplayIndex = Math.max(
      currentStrokeDisplayIndex,
      strokeIdxToAnimate
    );
    if (isAnimatingAll) {
      currentAnimationStrokeIndex++;
      animateNextInSequence();
    } else {
      renderGuideStrokes();
      drawRadicalHighlight();
    }
    return;
  }

  // Create SVG element with proper namespace
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  hiddenSvgPathContainer.innerHTML = "";
  hiddenSvgPathContainer.appendChild(svg);

  const pathElement = path;
  if (!pathElement || typeof pathElement.getTotalLength !== "function") {
    console.warn("Cannot animate stroke (invalid path element):", pathD);
    drawPath(guideCtx, pathD, color, styleProps, scaleFactor);
    currentStrokeDisplayIndex = Math.max(
      currentStrokeDisplayIndex,
      strokeIdxToAnimate
    );
    if (isAnimatingAll) {
      currentAnimationStrokeIndex++;
      animateNextInSequence();
    } else {
      renderGuideStrokes();
      drawRadicalHighlight();
    }
    return;
  }

  const totalLength = pathElement.getTotalLength();
  if (totalLength < 0.1) {
    console.warn("Cannot animate stroke (zero/invalid length):", pathD);
    drawPath(guideCtx, pathD, color, styleProps, scaleFactor);
    currentStrokeDisplayIndex = Math.max(
      currentStrokeDisplayIndex,
      strokeIdxToAnimate
    );
    if (isAnimatingAll) {
      currentAnimationStrokeIndex++;
      animateNextInSequence();
    } else {
      renderGuideStrokes();
      drawRadicalHighlight();
    }
    return;
  }

  let currentLength = 0;
  const baseDuration = 600;
  const duration =
    (baseDuration * (styleProps.animSpeedFactor || 1.0)) /
    animationSpeedMultiplier;
  let startTime = null;
  const segmentLength = Math.max(0.1, totalLength / 100); // Ensure minimum segment length

  function frame(timestamp) {
    if (!animationFrameId) return;
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const targetLength = Math.min(
      (elapsed / duration) * totalLength,
      totalLength
    );

    while (currentLength < targetLength) {
      const nextLength = Math.min(currentLength + segmentLength, targetLength);
      const currentPoint = pathElement.getPointAtLength(currentLength);
      const nextPoint = pathElement.getPointAtLength(nextLength);

      const progress = currentLength / totalLength;
      let dynamicLineWidth = styleProps.baseLineWidth;
      const taper = styleProps.taperFactor || 0;
      const minFactor = styleProps.minWidthFactor || 1.0;

      if (taper > 0 && totalLength > 0) {
        let widthFactor =
          progress < 0.5
            ? minFactor + (1 - minFactor) * (progress / 0.5)
            : minFactor + (1 - minFactor) * ((1 - progress) / 0.5);
        dynamicLineWidth =
          styleProps.baseLineWidth * Math.pow(widthFactor, taper * 2);
        dynamicLineWidth = Math.max(
          styleProps.baseLineWidth * minFactor * 0.5,
          dynamicLineWidth
        );
      }
      dynamicLineWidth = Math.max(0.1, dynamicLineWidth);

      guideCtx.beginPath();
      guideCtx.moveTo(
        currentPoint.x * scaleFactor,
        currentPoint.y * scaleFactor
      );
      guideCtx.lineTo(nextPoint.x * scaleFactor, nextPoint.y * scaleFactor);
      guideCtx.strokeStyle = color;
      guideCtx.lineCap = styleProps.lineCap;
      guideCtx.lineJoin = styleProps.lineJoin;
      guideCtx.lineWidth = dynamicLineWidth;
      guideCtx.stroke();

      currentLength = nextLength;
    }

    if (currentLength < totalLength) {
      animationFrameId = requestAnimationFrame(frame);
    } else {
      animationFrameId = null;
      currentStrokeDisplayIndex = Math.max(
        currentStrokeDisplayIndex,
        strokeIdxToAnimate
      );
      if (isAnimatingAll) {
        currentAnimationStrokeIndex++;
        animateNextInSequence();
      } else {
        renderGuideStrokes();
        drawRadicalHighlight();
      }
    }
  }
  animationFrameId = requestAnimationFrame(frame);
}

function animateNextInSequence() {
  if (!isAnimatingAll || currentAnimationStrokeIndex >= totalStrokes) {
    isAnimatingAll = false;
    if (currentAnimationStrokeIndex >= totalStrokes) {
      // Ensure display index is correct after full animation
      currentStrokeDisplayIndex = totalStrokes - 1;
    }
    renderGuideStrokes(); // Final render
    drawRadicalHighlight();
    updateButtonStates();
    return;
  }

  // Clear guide canvas partially or fully before animating next stroke.
  // For "animate all", we draw previous ones statically.
  clearGuideCanvas();
  const currentStyleProps = RENDER_STYLES[currentRenderingStyle];

  // Draw all previously animated strokes statically
  for (let i = 0; i < currentAnimationStrokeIndex; i++) {
    const { color, style } = determineStrokeStyleAndColor(
      i,
      currentStyleProps,
      "render" // Use render context for already drawn strokes
    );
    drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
  }

  // Optionally, draw a hint for the stroke AFTER the one currently being animated
  if (currentAnimationStrokeIndex + 1 < totalStrokes) {
    const { color: hintColor, style: hintStyle } = determineStrokeStyleAndColor(
      currentAnimationStrokeIndex + 1,
      currentStyleProps,
      "hint"
    );
    drawPath(
      guideCtx,
      strokesData[currentAnimationStrokeIndex + 1].d,
      hintColor,
      hintStyle,
      scaleFactor
    );
  }

  const strokeToAnimateData = strokesData[currentAnimationStrokeIndex];
  if (strokeToAnimateData && strokeToAnimateData.d) {
    const { color, style } = determineStrokeStyleAndColor(
      currentAnimationStrokeIndex,
      currentStyleProps,
      "animation" // Use animation context
    );
    // The animateSingleStroke function will call animateNextInSequence upon completion
    animateSingleStroke(
      strokeToAnimateData.d,
      color,
      style,
      currentAnimationStrokeIndex
    );
  } else {
    // Skip if stroke data is invalid and move to the next
    currentAnimationStrokeIndex++;
    animateNextInSequence();
  }
}

function getPathLength(pathD) {
  if (!hiddenSvgPathContainer) return 0;
  hiddenSvgPathContainer.innerHTML = `<path d="${pathD}"></path>`;
  const pathElement = hiddenSvgPathContainer.firstChild;
  return pathElement && typeof pathElement.getTotalLength === "function"
    ? pathElement.getTotalLength()
    : 0;
}

function clearGuideCanvas() {
  if (guideCtx && canvasSize) guideCtx.clearRect(0, 0, canvasSize, canvasSize);
}

function clearRadicalHighlightCanvas() {
  if (radicalHighlightCtx && canvasSize)
    radicalHighlightCtx.clearRect(0, 0, canvasSize, canvasSize);
}

function clearUserCanvas() {
  if (userCtx && canvasSize) userCtx.clearRect(0, 0, canvasSize, canvasSize);
}

function drawPath(
  ctx,
  pathData,
  color,
  styleProps,
  customScaleFactor = scaleFactor // Use provided scaleFactor or default
) {
  if (!ctx || !pathData) return;
  ctx.save();
  ctx.scale(customScaleFactor, customScaleFactor); // Apply scaling
  ctx.strokeStyle = color;
  ctx.lineCap = styleProps.lineCap;
  ctx.lineJoin = styleProps.lineJoin;
  // Ensure lineWidth is scaled correctly and is not zero
  ctx.lineWidth = Math.max(0.1, styleProps.baseLineWidth) / customScaleFactor;

  try {
    const p2d = new Path2D(pathData);
    ctx.stroke(p2d);
  } catch (e) {
    console.error("Error drawing path:", e, pathData);
  }
  ctx.restore(); // Restore context after scaling
}

// --- Event Listeners & Control Logic ---
if (clearUserDrawingBtn)
  clearUserDrawingBtn.addEventListener("click", clearUserCanvas);
if (gridToggle) {
  gridToggle.addEventListener("change", () => {
    if (gridCtx && canvasSize) {
      if (gridToggle.checked) drawGrid();
      else gridCtx.clearRect(0, 0, canvasSize, canvasSize);
    }
  });
}
if (renderingStyleSelect) {
  renderingStyleSelect.addEventListener("change", (e) => {
    currentRenderingStyle = e.target.value;
    if (
      currentKanji &&
      strokesData.length > 0 &&
      !animationFrameId &&
      !isAnimatingAll
    ) {
      renderGuideStrokes(); // Re-render with new style
      drawRadicalHighlight(); // Also re-render highlight
    }
  });
}
if (animationSpeedInput) {
  animationSpeedInput.addEventListener("input", (e) => {
    const speed = parseFloat(e.target.value);
    if (!isNaN(speed) && speed >= 0.1 && speed <= 10.0)
      animationSpeedMultiplier = speed;
    else e.target.value = animationSpeedMultiplier; // Reset if invalid
  });
}
if (penColorInput) penColorInput.addEventListener("change", updatePenStyle);
if (penWidthInput) {
  penWidthInput.addEventListener("input", (e) => {
    const width = parseFloat(e.target.value);
    if (!isNaN(width) && width >= 0.1 && width <= 10.0) updatePenStyle();
    else e.target.value = userCtx ? userCtx.lineWidth : 3.0; // Reset if invalid
  });
}
// ... existing code ...

if (resetKanjiBtn) {
  resetKanjiBtn.addEventListener("click", () => {
    if (animationFrameId || isAnimatingAll) return;
    if (currentKanji) {
      // Only reset if a kanji was loaded
      resetForNewKanji();
      if (modalKanjiInput) modalKanjiInput.value = "";
      setupCanvases(); // Clear canvases and redraw grid
    }
  });
}
if (firstStrokeBtn) {
  firstStrokeBtn.addEventListener("click", () => {
    if (
      animationFrameId ||
      isAnimatingAll ||
      !(currentKanji && totalStrokes > 0)
    )
      return;
    stopAllAnimations();
    currentStrokeDisplayIndex = -1; // Go to before the first stroke
    renderGuideStrokes();
    drawRadicalHighlight();
  });
}
if (prevStrokeBtn) {
  prevStrokeBtn.addEventListener("click", () => {
    if (
      animationFrameId ||
      isAnimatingAll ||
      currentStrokeDisplayIndex < 0 // Already at or before the first stroke
    )
      return;
    currentStrokeDisplayIndex--;
    renderGuideStrokes();
    drawRadicalHighlight();
  });
}

if (nextStrokeBtn) {
  nextStrokeBtn.addEventListener("click", () => {
    if (
      animationFrameId ||
      isAnimatingAll ||
      currentStrokeDisplayIndex >= totalStrokes - 1 // Already at the last stroke
    )
      return;

    const strokeIdxToAnimate = currentStrokeDisplayIndex + 1;
    // Clear guide canvas to redraw previous strokes statically, then animate the next one
    clearGuideCanvas();
    const currentStyle = RENDER_STYLES[currentRenderingStyle];

    // Redraw strokes before the one to be animated
    for (let i = 0; i < strokeIdxToAnimate; i++) {
      const { color, style } = determineStrokeStyleAndColor(
        i,
        currentStyle,
        "render"
      );
      drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
    }
    // Draw hint for the stroke after the one being animated (if exists)
    if (strokeIdxToAnimate + 1 < totalStrokes) {
      const { color: hintColor, style: hintStyle } =
        determineStrokeStyleAndColor(
          strokeIdxToAnimate + 1,
          RENDER_STYLES["standard"], // Hint is based on standard style
          "hint"
        );
      drawPath(
        guideCtx,
        strokesData[strokeIdxToAnimate + 1].d,
        hintColor,
        hintStyle,
        scaleFactor
      );
    }

    const strokeToAnimateData = strokesData[strokeIdxToAnimate];
    if (strokeToAnimateData && strokeToAnimateData.d) {
      const { color, style } = determineStrokeStyleAndColor(
        strokeIdxToAnimate,
        currentStyle,
        "animation" // Use animation context for styling
      );
      animateSingleStroke(
        strokeToAnimateData.d,
        color,
        style,
        strokeIdxToAnimate
      );
    } else {
      // Should not happen if data is valid, but as a fallback:
      currentStrokeDisplayIndex++; // Advance index
      renderGuideStrokes(); // And re-render
      drawRadicalHighlight();
    }
  });
}

if (animateStrokeBtn) {
  animateStrokeBtn.addEventListener("click", () => {
    if (
      animationFrameId ||
      isAnimatingAll ||
      currentStrokeDisplayIndex < 0 || // No current stroke selected
      currentStrokeDisplayIndex >= totalStrokes // Out of bounds
    )
      return;

    const strokeIdxToAnimate = currentStrokeDisplayIndex; // Animate the currently displayed stroke
    clearGuideCanvas();
    const currentStyle = RENDER_STYLES[currentRenderingStyle];

    // Redraw strokes before the one to be animated
    for (let i = 0; i < strokeIdxToAnimate; i++) {
      const { color, style } = determineStrokeStyleAndColor(
        i,
        currentStyle,
        "render"
      );
      drawPath(guideCtx, strokesData[i].d, color, style, scaleFactor);
    }
    // Draw hint for the stroke after the one being animated (if exists)
    if (strokeIdxToAnimate + 1 < totalStrokes) {
      const { color: hintColor, style: hintStyle } =
        determineStrokeStyleAndColor(
          strokeIdxToAnimate + 1,
          RENDER_STYLES["standard"],
          "hint"
        );
      drawPath(
        guideCtx,
        strokesData[strokeIdxToAnimate + 1].d,
        hintColor,
        hintStyle,
        scaleFactor
      );
    }

    const strokeToAnimateData = strokesData[strokeIdxToAnimate];
    if (strokeToAnimateData && strokeToAnimateData.d) {
      const { color, style } = determineStrokeStyleAndColor(
        strokeIdxToAnimate,
        currentStyle,
        "animation"
      );
      animateSingleStroke(
        strokeToAnimateData.d,
        color,
        style,
        strokeIdxToAnimate
      );
    } else {
      renderGuideStrokes(); // Fallback
      drawRadicalHighlight();
    }
  });
}

if (animateAllStrokesBtn) {
  animateAllStrokesBtn.addEventListener("click", () => {
    if (
      animationFrameId ||
      isAnimatingAll ||
      !(currentKanji && totalStrokes > 0)
    )
      return;
    stopAllAnimations(); // Ensure any existing animation is stopped
    isAnimatingAll = true;
    currentStrokeDisplayIndex = -1; // Reset display index
    currentAnimationStrokeIndex = 0; // Start animation from the first stroke
    clearGuideCanvas(); // Clear canvas before starting new animation sequence
    animateNextInSequence();
    updateButtonStates(); // Reflect animating state
  });
}
if (revealAllBtn) {
  revealAllBtn.addEventListener("click", () => {
    if (!(currentKanji && totalStrokes > 0)) return;
    stopAllAnimations();
    currentStrokeDisplayIndex = totalStrokes - 1; // Show all strokes
    renderGuideStrokes();
    drawRadicalHighlight();
  });
}

function resetForNewKanji() {
  stopAllAnimations();
  currentKanji = "";
  strokesData = [];
  currentStrokeDisplayIndex = -1;
  totalStrokes = 0;
  highlightedElement = null;
  if (radicalInsertPoint) radicalInsertPoint.innerHTML = "";
  const radicalRow = document.querySelector(".radical-row");
  const shapeRow = document.querySelector(".shape-row");
  const metaRow = document.querySelector(".kanji-meta-row");
  const strokeCountInfo = document.getElementById("strokeCountInfo");
  const unicodeInfo = document.getElementById("unicodeInfo");
  if (radicalRow) radicalRow.style.display = "flex";
  if (shapeRow) shapeRow.style.display = "none";
  if (metaRow) metaRow.style.display = "none";
  if (strokeCountInfo) strokeCountInfo.innerHTML = "";
  if (unicodeInfo) unicodeInfo.innerHTML = "";
  clearGuideCanvas();
  clearRadicalHighlightCanvas();
  clearUserCanvas();
  showMessage("한자를 입력하거나 왼쪽 메뉴에서 선택하세요.");
  updateButtonStates();
}
function updatePenStyle() {
  if (userCtx && penColorInput && penWidthInput) {
    userCtx.strokeStyle = penColorInput.value;
    userCtx.lineWidth = parseFloat(penWidthInput.value) || 3.0;
  }
}
function getMousePos(canvasEl, evt) {
  const rect = canvasEl.getBoundingClientRect();
  const t = evt.touches ? evt.touches[0] : evt;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}
function startUserDrawing(e) {
  if (e.cancelable) e.preventDefault();
  if (
    !currentKanji || // Can only draw if a kanji is loaded
    animationFrameId ||
    isAnimatingAll ||
    !userCtx ||
    !userCanvas
  )
    return;
  isUserDrawing = true;
  const pos = getMousePos(userCanvas, e);
  userCtx.beginPath();
  userCtx.moveTo(pos.x, pos.y);
}
function drawUserStroke(e) {
  if (e.cancelable) e.preventDefault();
  if (
    !isUserDrawing ||
    !currentKanji ||
    animationFrameId ||
    isAnimatingAll ||
    !userCtx ||
    !userCanvas
  )
    return;
  const pos = getMousePos(userCanvas, e);
  userCtx.lineTo(pos.x, pos.y);
  userCtx.stroke();
}
function stopUserDrawing(e) {
  if (e.cancelable && isUserDrawing) e.preventDefault(); // Prevent default only if drawing was active
  if (!isUserDrawing) return;
  isUserDrawing = false;
}
if (userCanvas) {
  userCanvas.addEventListener("mousedown", startUserDrawing, {
    passive: false,
  });
  userCanvas.addEventListener("touchstart", startUserDrawing, {
    passive: false,
  });
  userCanvas.addEventListener("mousemove", drawUserStroke, {
    passive: false,
  });
  userCanvas.addEventListener("touchmove", drawUserStroke, {
    passive: false,
  });
  userCanvas.addEventListener("mouseup", stopUserDrawing, {
    passive: false,
  });
  userCanvas.addEventListener("touchend", stopUserDrawing, {
    passive: false,
  });
  userCanvas.addEventListener("mouseleave", stopUserDrawing, {
    // Stop drawing if mouse leaves canvas
    passive: false,
  });
  userCanvas.addEventListener("touchcancel", stopUserDrawing, {
    // Handle touch cancel
    passive: false,
  });
}
function updateButtonStates() {
  const loaded = currentKanji !== "" && totalStrokes > 0;
  const animating = animationFrameId !== null || isAnimatingAll;

  // Buttons and inputs inside the modal are handled by modal display logic and their own states if needed,
  // but the main page buttons should be disabled during animations.
  if (searchKanjiBtn) searchKanjiBtn.disabled = animating;

  if (firstStrokeBtn)
    firstStrokeBtn.disabled =
      !loaded || animating || currentStrokeDisplayIndex === -1;
  if (prevStrokeBtn)
    prevStrokeBtn.disabled =
      !loaded || animating || currentStrokeDisplayIndex < 0;
  if (nextStrokeBtn)
    nextStrokeBtn.disabled =
      !loaded || animating || currentStrokeDisplayIndex >= totalStrokes - 1;
  if (animateStrokeBtn)
    animateStrokeBtn.disabled =
      !loaded ||
      animating ||
      currentStrokeDisplayIndex < 0 ||
      currentStrokeDisplayIndex >= totalStrokes;
  if (animateAllStrokesBtn)
    animateAllStrokesBtn.disabled = !loaded || animating;
  if (revealAllBtn) revealAllBtn.disabled = !loaded || animating;

  if (clearUserDrawingBtn) clearUserDrawingBtn.disabled = !loaded || animating;

  if (renderingStyleSelect) renderingStyleSelect.disabled = animating;
  if (animationSpeedInput) animationSpeedInput.disabled = animating;
  if (penColorInput) penColorInput.disabled = animating;
  if (penWidthInput) penWidthInput.disabled = animating;
  if (gridToggle) gridToggle.disabled = animating;
  if (saveToNoteBtn) saveToNoteBtn.disabled = !loaded || animating;

  // Disable all radical and shape buttons during animation
  if (radicalInsertPoint) {
    radicalInsertPoint
      .querySelectorAll("button")
      .forEach((btn) => (btn.disabled = animating));
  }

  // Disable shape buttons
  const shapeInsertPoint = document.getElementById("shapeInsertPoint");
  if (shapeInsertPoint) {
    shapeInsertPoint
      .querySelectorAll("button")
      .forEach((btn) => (btn.disabled = animating));
  }

  // Sync mobile buttons with desktop buttons
  syncAllButtons();
}

// Simplify the displayAllPageMeanings function to just return text
function displayAllPageMeanings(kanji) {
  const allPageMeaningsDiv = document.getElementById("allPageMeanings");
  if (!allPageMeaningsDiv) return;

  if (!naverData || !naverData[kanji]) {
    allPageMeaningsDiv.textContent = "상세 의미 정보가 없습니다.";
    return;
  }

  const meanings = naverData[kanji].naver_data.all_page_meanings;
  allPageMeaningsDiv.innerHTML = "";

  meanings.forEach((meaningGroup) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "meaning-group";

    const mainDiv = document.createElement("div");
    mainDiv.className = "main-meaning";
    mainDiv.textContent = meaningGroup.meaning;
    groupDiv.appendChild(mainDiv);

    if (meaningGroup.sub_meanings) {
      meaningGroup.sub_meanings.forEach((sub) => {
        const subDiv = document.createElement("div");
        subDiv.className = "sub-meaning";
        subDiv.textContent = sub.meaning;
        groupDiv.appendChild(subDiv);
      });
    }

    allPageMeaningsDiv.appendChild(groupDiv);
  });
}

// Modify loadKanjiData to use normalizeKanji
async function loadKanjiData(kanji) {
  if (animationFrameId || isAnimatingAll) return;
  if (!kanji) {
    showMessage("한자를 입력해주세요.");
    return;
  }
  resetForNewKanji();
  currentKanji = normalizeKanji(kanji);
  window.scrollTo(0, 0); // Scroll to top of window
  const contentArea = document.getElementById("mainContentArea");
  if (contentArea) contentArea.scrollTop = 0;
  const containerWrapper = document.getElementById("mainContainerWrapper");
  if (containerWrapper) containerWrapper.scrollTop = 0;

  // Display hun_meanings and all page meanings if available
  if (naverData && naverData[currentKanji]) {
    const hunMeaningsDiv = document.getElementById("hunMeanings");
    if (hunMeaningsDiv) {
      const hunMeanings =
        naverData[currentKanji].naver_data.basic_info.hun_meanings;
      hunMeaningsDiv.textContent =
        hunMeanings && hunMeanings.length > 0
          ? hunMeanings.join(", ")
          : "훈독 정보 없음";
    }
    displayAllPageMeanings(currentKanji);
  }

  const svgText = await fetchKanjiVG(currentKanji);
  if (svgText) {
    parseSVG(svgText);
    if (totalStrokes > 0) {
      currentStrokeDisplayIndex = totalStrokes - 1;
      setupCanvases();
    } else {
      showMessage(`'${currentKanji}' 획 정보 없음.`);
      setupCanvases();
    }
  } else {
    setupCanvases();
  }
  updateButtonStates();
}

// Handle Search button click to open modal
if (searchKanjiBtn) {
  searchKanjiBtn.addEventListener("click", () => {
    if (searchModal) {
      searchModal.style.display = "flex";
      // Trigger initial search when modal opens
      handleSearch("");
      // Focus the modal input only on desktop
      if (modalKanjiInput && window.innerWidth > 768) modalKanjiInput.focus();
    }
  });
}

// Handle Close Modal button click
if (closeSearchModalBtn) {
  closeSearchModalBtn.addEventListener("click", () => {
    if (searchModal) {
      searchModal.style.display = "none";
      // Clear modal input and results when closing
      if (modalKanjiInput) modalKanjiInput.value = "";
      if (searchResultContentDiv) searchResultContentDiv.innerHTML = "";
      if (searchResultsDiv) searchResultsDiv.style.display = "none";
    }
  });
}

// Handle input event listener for modalKanjiInput
if (modalKanjiInput) {
  modalKanjiInput.addEventListener("input", (e) => {
    handleSearch(e.target.value);
  });
}

// Modify selectKanji to work with the modal input and trigger modal load
// Note: This function is used by the search results in the modal.
window.selectKanji = function (kanji) {
  // Make it global if search results are inline HTML
  if (modalKanjiInput) modalKanjiInput.value = kanji;
  // Directly trigger loading and close modal
  loadKanjiData(kanji);
  if (searchModal) searchModal.style.display = "none";
  if (modalKanjiInput) modalKanjiInput.value = ""; // Clear input after selecting
  if (searchResultContentDiv) searchResultContentDiv.innerHTML = ""; // Clear results
  if (searchResultsDiv) searchResultsDiv.style.display = "none"; // Hide results div
};

// Add these variables at the top with other global variables
const radicalInfoModal = document.getElementById("radicalInfoModal");
const closeRadicalInfoModalBtn = document.getElementById(
  "closeRadicalInfoModalBtn"
);
const switchToKanjiBtn = document.getElementById("switchToKanjiBtn");
const cancelSwitchBtn = document.getElementById("cancelSwitchBtn");
let selectedRadicalKanji = null;

// Function to show radical/component info modal
function showRadicalInfoModal(kanji) {
  const normalizedKanji = normalizeKanji(kanji);
  if (!normalizedKanji || !naverData || !naverData[normalizedKanji]) return;

  selectedRadicalKanji = normalizedKanji;
  const data = naverData[normalizedKanji].naver_data;

  // Update modal content
  const kanjiDisplay = radicalInfoModal.querySelector(".kanji-display");
  const pronunciations = radicalInfoModal.querySelectorAll(
    ".kanji-pronunciation"
  );
  const meaning = radicalInfoModal.querySelector(".kanji-meaning");
  const categories = radicalInfoModal.querySelector(".kanji-categories");

  kanjiDisplay.textContent = kanji;

  // Set pronunciations
  if (data.basic_info.pronunciations.length > 0) {
    pronunciations[0].textContent = `음독: ${data.basic_info.pronunciations.join(
      ", "
    )}`;
  }
  if (data.basic_info.hun_meanings.length > 0) {
    pronunciations[1].textContent = `훈독: ${data.basic_info.hun_meanings.join(
      ", "
    )}`;
  }

  // Set meaning
  if (data.basic_search_meanings.length > 0) {
    meaning.textContent = `의미: ${data.basic_search_meanings.join(", ")}`;
  }

  // Set categories
  if (
    kanjiData &&
    kanjiData[normalizedKanji] &&
    kanjiData[normalizedKanji].all_categories
  ) {
    categories.innerHTML = kanjiData[normalizedKanji].all_categories
      .map((cat) => {
        const [type, level] = cat.split(":");
        if (level === "None") return "";
        const typeName =
          type === "jlpt"
            ? "JLPT"
            : type === "kanken"
              ? "일본한자능력검정시험"
              : type === "gakunen"
                ? ""
                : type === "kakusuu"
                  ? ""
                  : type === "bushu"
                    ? "부수: "
                    : type === "shinbun"
                      ? "신문 사용 빈도: "
                      : type === "jinmeiyou"
                        ? ""
                        : type;
        return `<span class="category-tag ${type}">${typeName} ${level}</span>`;
      })
      .filter((tag) => tag !== "")
      .join("");
  }

  // Show modal
  radicalInfoModal.style.display = "flex";
}

// Close modal handlers
if (closeRadicalInfoModalBtn) {
  closeRadicalInfoModalBtn.addEventListener("click", () => {
    radicalInfoModal.style.display = "none";
    selectedRadicalKanji = null;
  });
}

if (cancelSwitchBtn) {
  cancelSwitchBtn.addEventListener("click", () => {
    radicalInfoModal.style.display = "none";
    selectedRadicalKanji = null;
  });
}

// Switch to selected kanji handler
if (switchToKanjiBtn) {
  switchToKanjiBtn.addEventListener("click", () => {
    if (selectedRadicalKanji) {
      loadKanjiData(selectedRadicalKanji);
      radicalInfoModal.style.display = "none";
      selectedRadicalKanji = null;

      // 모바일 환경에서 추가 정보 모달 닫기
      if (window.innerWidth <= 768) {
        const mobileInfoModal = document.getElementById("mobileInfoModal");
        if (mobileInfoModal) {
          mobileInfoModal.style.display = "none";
          mobileInfoModal.classList.remove("active");
          document.body.classList.remove("modal-open");
          const mobileInfoBtn = document.getElementById("mobileInfoBtn");
          if (mobileInfoBtn) {
            mobileInfoBtn.classList.remove("active");
          }
        }
      }
    }
  });
}

// Add mobile-specific code at the end of the script
document.addEventListener("DOMContentLoaded", function () {
  // Mobile navigation buttons
  const mobileSearchBtn = document.getElementById("mobileSearchBtn");
  const mobileSettingsBtn = document.getElementById("mobileSettingsBtn");
  const mobileInfoBtn = document.getElementById("mobileInfoBtn");
  const mobileMeaningsBtn = document.getElementById("mobileMeaningsBtn");

  // Mobile modals
  const mobileSettingsModal = document.getElementById("mobileSettingsModal");
  const mobileInfoModal = document.getElementById("mobileInfoModal");
  const mobileMeaningsModal = document.getElementById("mobileMeaningsModal");

  // Close buttons
  const closeButtons = document.querySelectorAll(".mobile-modal .modal-close");

  // Function to close all mobile modals
  function closeAllMobileModals() {
    document.querySelectorAll(".mobile-modal").forEach((modal) => {
      modal.style.display = "none";
      modal.classList.remove("active");
    });
    document.querySelectorAll(".mobile-bottom-nav button").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.body.classList.remove("modal-open");
  }

  // Function to open a mobile modal
  function openMobileModal(modal) {
    closeAllMobileModals();
    modal.style.display = "block";
    setTimeout(() => {
      modal.classList.add("active");
    }, 10);
    document.body.classList.add("modal-open");
  }

  // Mobile Search button click handler
  mobileSearchBtn.addEventListener("click", () => {
    closeAllMobileModals();
    mobileSearchBtn.classList.add("active");
    if (searchModal) {
      searchModal.style.display = "flex";
      // Remove automatic focus for mobile
      handleSearch("");
    }
  });

  // Settings button click handler
  mobileSettingsBtn.addEventListener("click", () => {
    openMobileModal(mobileSettingsModal);
    mobileSettingsBtn.classList.add("active");
  });

  // Info button click handler
  mobileInfoBtn.addEventListener("click", () => {
    // Update desktop info first
    if (typeof extractAndDisplayElements === "function") {
      extractAndDisplayElements();
    }

    openMobileModal(mobileInfoModal);
    mobileInfoBtn.classList.add("active");

    // Sync info display
    syncInfoDisplay();
  });

  // Meanings button click handler
  mobileMeaningsBtn.addEventListener("click", () => {
    openMobileModal(mobileMeaningsModal);
    mobileMeaningsBtn.classList.add("active");
    syncMeaningsDisplay();
  });

  // Close button handlers
  closeButtons.forEach((button) => {
    button.addEventListener("click", closeAllMobileModals);
  });

  // Close modal when clicking outside
  document.querySelectorAll(".mobile-modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeAllMobileModals();
      }
    });
  });

  // Initialize settings sync
  syncSettings();

  // Modify extractAndDisplayElements to use syncInfoDisplay
  const originalExtractAndDisplayElements = extractAndDisplayElements;
  extractAndDisplayElements = function () {
    originalExtractAndDisplayElements();
    syncInfoDisplay();
  };

  // Modify displayAllPageMeanings to use syncMeaningsDisplay
  const originalDisplayAllPageMeanings = displayAllPageMeanings;
  displayAllPageMeanings = function (kanji) {
    originalDisplayAllPageMeanings(kanji);
    syncMeaningsDisplay();
  };

  // Add mobile pen width input handling
  const mobilePenWidthInput = document.getElementById("mobilePenWidthInput");
  if (mobilePenWidthInput) {
    // Remove input event listener to prevent real-time updates

    // Add change event listener for when user finishes editing
    mobilePenWidthInput.addEventListener("change", (e) => {
      let width = parseFloat(e.target.value);
      if (isNaN(width)) width = 3.0;
      width = Math.max(0.1, Math.min(10.0, width));
      e.target.value = width.toFixed(1);
      updatePenStyle();
    });

    // Add keydown event listener for Enter key
    mobilePenWidthInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission
        let width = parseFloat(e.target.value);
        if (isNaN(width)) width = 3.0;
        width = Math.max(0.1, Math.min(10.0, width));
        e.target.value = width.toFixed(1);
        updatePenStyle();
        e.target.blur(); // Remove focus after Enter
      }
    });
  }
});

// --- 모바일에서 canvasContainer를 정사각형으로 맞추는 코드 ---
function resizeCanvasContainerSquare() {
  if (window.innerWidth <= 768) {
    const panel = document.querySelector(".panel.drawing-panel");
    const container = document.getElementById("canvasContainer");
    const nav = document.querySelector(".mobile-bottom-nav");
    const flexCol = panel ? panel.querySelector(".canvas-flex-col") : null;
    const controls = panel ? panel.querySelector(".drawing-controls") : null;
    if (panel && container && nav && flexCol) {
      // flex-col의 높이에서 controls 높이 빼기
      const flexColRect = flexCol.getBoundingClientRect();
      const controlsHeight = controls ? controls.offsetHeight : 0;
      const availableHeight = flexColRect.height - controlsHeight;
      const availableWidth = flexColRect.width;
      const size = Math.max(0, Math.min(availableWidth, availableHeight));
      container.style.width = size + "px";
      container.style.height = size + "px";
    }
  } else {
    // 데스크탑에서는 스타일 초기화
    const container = document.getElementById("canvasContainer");
    if (container) {
      container.style.width = "";
      container.style.height = "";
    }
  }
}
window.addEventListener("resize", resizeCanvasContainerSquare);
window.addEventListener("orientationchange", resizeCanvasContainerSquare);
document.addEventListener("DOMContentLoaded", resizeCanvasContainerSquare);
// --- end ---

// JS 이벤트 연결 (window.onload 이후에 추가)
window.addEventListener("DOMContentLoaded", function () {
  // 모바일 버튼과 데스크탑 버튼 동기화
  const btnMap = [
    ["firstStrokeBtn", "firstStrokeBtnMobile"],
    ["prevStrokeBtn", "prevStrokeBtnMobile"],
    ["animateStrokeBtn", "animateStrokeBtnMobile"],
    ["nextStrokeBtn", "nextStrokeBtnMobile"],
    ["revealAllBtn", "revealAllBtnMobile"],
    ["animateAllStrokesBtn", "animateAllStrokesBtnMobile"],
    ["clearUserDrawingBtn", "mobileClearUserDrawingBtn"], // 추가
  ];
  btnMap.forEach(([desktopId, mobileId]) => {
    const desktopBtn = document.getElementById(desktopId);
    const mobileBtn = document.getElementById(mobileId);
    if (desktopBtn && mobileBtn) {
      // 클릭 이벤트 동기화
      mobileBtn.addEventListener("click", (e) => {
        desktopBtn.click();
      });
    }
  });
});
