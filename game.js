// ==========================================================================
// POPULI PLANNER GAME LAYER (game.js)
// XP, Leveling, and Progression derived purely from existing assignment data.
// Wrapped in an IIFE to eliminate shared scope pollution and duplicate globals.
// ==========================================================================

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // XP & ANTI-FARMING CONFIGURATION
  // ------------------------------------------------------------------------
  const XP_PER_ASSIGNMENT = 10;

  // Anti-farming boundary: Only assignments due on or after this date award XP.
  // Prevents imported past coursework / previous quarters from artificially inflating XP.
  // Default: First day of current academic quarter (Fall quarter: October 1, 2026).
  const XP_START_DATE = '2026-10-01';

  // ------------------------------------------------------------------------
  // LEVEL CURVE CONFIGURATION (Gentle progression, easy to edit in one place)
  // Level 1: 50 XP to reach Level 2 (5 assignments)
  // Level 2: 70 XP to reach Level 3 (7 assignments)
  // Level 3: 90 XP to reach Level 4 (9 assignments)
  // Level N -> N+1: BASE_LEVEL_XP + (N - 1) * LEVEL_XP_STEP
  // ------------------------------------------------------------------------
  const BASE_LEVEL_XP = 50;
  const LEVEL_XP_STEP = 20;

  function getXpRequiredForNextLevel(level) {
    if (level < 1) level = 1;
    return BASE_LEVEL_XP + (level - 1) * LEVEL_XP_STEP;
  }

  // ------------------------------------------------------------------------
  // PURE PROGRESSION COMPUTATION
  // ------------------------------------------------------------------------
  /**
   * Pure function to calculate current game progress from assignment records.
   * Does NOT mutate assignments or rely on external state.
   *
   * @param {Array} assignments - List of assignment records from storage.
   * @param {{ startDate?: string }} [options] - Optional custom start date override.
   * @returns {{
   *   totalXp: number,
   *   level: number,
   *   currentLevelXp: number,
   *   nextLevelXp: number,
   *   xpToNextLevel: number,
   *   percent: number,
   *   qualifyingCount: number
   * }}
   */
  function computeProgress(assignments, options = {}) {
    const effectiveStartDate = options.startDate || XP_START_DATE;
    const list = Array.isArray(assignments) ? assignments : [];

    let qualifyingCount = 0;

    for (const item of list) {
      if (!item) continue;
      const isCompleted = Boolean(item.completed || item.planned);
      if (!isCompleted) continue;

      // Validate dueDate format (YYYY-MM-DD)
      if (!item.dueDate || typeof item.dueDate !== 'string') continue;
      const due = item.dueDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) continue;

      // Anti-farming rule: Only count assignments due on or after effectiveStartDate
      if (due >= effectiveStartDate) {
        qualifyingCount++;
      }
    }

    const totalXp = qualifyingCount * XP_PER_ASSIGNMENT;

    // Determine current level and progress within level
    let level = 1;
    let remainingXp = totalXp;

    while (true) {
      const needed = getXpRequiredForNextLevel(level);
      if (remainingXp >= needed) {
        remainingXp -= needed;
        level++;
      } else {
        break;
      }
    }

    const nextLevelXp = getXpRequiredForNextLevel(level);
    const currentLevelXp = remainingXp;
    const xpToNextLevel = nextLevelXp - currentLevelXp;
    const percent = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));

    return {
      totalXp,
      level,
      currentLevelXp,
      nextLevelXp,
      xpToNextLevel,
      percent,
      qualifyingCount
    };
  }

  // ------------------------------------------------------------------------
  // UI & LEVEL-UP CELEBRATION STATE
  // ------------------------------------------------------------------------
  let lastRecordedLevel = null;
  let levelUpToastTimeout = null;

  function showLevelUpCelebration(newLevel) {
    const isReduced = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Subtle 300ms pop animation on level badge and XP card
    if (!isReduced) {
      const badge = document.getElementById('user-level-badge');
      const xpCard = document.getElementById('game-xp-card');

      if (badge) {
        badge.classList.remove('is-leveling-up');
        void badge.offsetWidth;
        badge.classList.add('is-leveling-up');
        setTimeout(() => badge.classList.remove('is-leveling-up'), 350);
      }

      if (xpCard) {
        xpCard.classList.remove('is-leveling-up');
        void xpCard.offsetWidth;
        xpCard.classList.add('is-leveling-up');
        setTimeout(() => xpCard.classList.remove('is-leveling-up'), 350);
      }
    }

    // 2. Level Up Toast notification
    const toast = document.getElementById('game-levelup-toast');
    const toastText = document.getElementById('game-levelup-toast-text');

    if (toast && toastText) {
      if (levelUpToastTimeout) {
        clearTimeout(levelUpToastTimeout);
        levelUpToastTimeout = null;
      }

      toastText.textContent = `Level Up! You reached Level ${newLevel}!`;
      toast.style.display = 'flex';
      toast.classList.remove('is-sliding-in');
      void toast.offsetWidth;
      toast.classList.add('is-sliding-in');

      levelUpToastTimeout = setTimeout(() => {
        toast.style.display = 'none';
        toast.classList.remove('is-sliding-in');
        levelUpToastTimeout = null;
      }, 4000);
    }
  }

  /**
   * Updates all game UI elements (Level badge, XP card, progress bars).
   * Safe to call on every render; only triggers level-up celebration when
   * level actually increases during interactive session.
   *
   * @param {Array} assignments - Current assignments array from storage.
   */
  function updateUI(assignments) {
    const progress = computeProgress(assignments);

    // 1. Update Top Bar Level Badge
    const badge = document.getElementById('user-level-badge');
    const badgeText = document.getElementById('level-badge-text');
    if (badge && badgeText) {
      badgeText.textContent = `Lv ${progress.level}`;
      badge.title = `Level ${progress.level} (${progress.currentLevelXp} / ${progress.nextLevelXp} XP)`;
      badge.setAttribute('aria-label', `Player Level ${progress.level}`);
    }

    // 2. Update Planner XP Card
    const xpTitle = document.getElementById('game-xp-level-title');
    const xpFraction = document.getElementById('game-xp-fraction');
    const xpTrack = document.getElementById('game-xp-bar');
    const xpFill = document.getElementById('game-xp-fill');

    if (xpTitle) {
      xpTitle.textContent = `Level ${progress.level}`;
    }
    if (xpFraction) {
      xpFraction.textContent = `${progress.currentLevelXp} / ${progress.nextLevelXp} XP`;
    }
    if (xpTrack) {
      xpTrack.setAttribute('aria-valuenow', String(progress.currentLevelXp));
      xpTrack.setAttribute('aria-valuemin', '0');
      xpTrack.setAttribute('aria-valuemax', String(progress.nextLevelXp));
      xpTrack.setAttribute('aria-valuetext', `Level ${progress.level}, ${progress.currentLevelXp} of ${progress.nextLevelXp} XP (${progress.percent}%)`);
    }
    if (xpFill) {
      xpFill.style.width = `${progress.percent}%`;
    }

    // 3. Level-up trigger: ONLY when level actually increases during session,
    // never on page load, tab switch, or normal re-renders
    if (lastRecordedLevel !== null && progress.level > lastRecordedLevel) {
      showLevelUpCelebration(progress.level);
    }
    lastRecordedLevel = progress.level;

    return progress;
  }

  function getXpStartDate() {
    return xpStartDate;
  }

  function setXpStartDate(dateStr) {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      xpStartDate = dateStr.trim();
    }
  }

  // ------------------------------------------------------------------------
  // PUBLIC API & EXPORTS
  // Expose ONLY window.PopuliGame and module.exports (no shared scope variables)
  // ------------------------------------------------------------------------
  const PopuliGameAPI = {
    XP_START_DATE,
    XP_PER_ASSIGNMENT,
    computeProgress,
    updateUI,
    getXpRequiredForNextLevel
  };

  if (typeof window !== 'undefined') {
    window.PopuliGame = PopuliGameAPI;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopuliGameAPI;
  }
})();
