// ==========================================================================
// POPULI PLANNER THEME ENGINE & PALETTE PICKER (Stage 2)
// Plain data objects per theme with id, display name, mode, preview, and variables.
// Adding a new theme only requires appending a new object to THEMES array.
// ==========================================================================

const THEMES = [
  {
    "id": "pink-steel",
    "name": "Pink Steel",
    "mode": "dark",
    "preview": {
      "bg": "#0f0d12",
      "accent": "#e0b8c8",
      "text": "#ffffff"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#0f0d12",
      "--surface": "#1a1720",
      "--surface-subtle": "#221e29",
      "--surface-hover": "#262130",
      "--border": "#2e2937",
      "--border-subtle": "#25212c",
      "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4)",
      "--backdrop": "rgba(0, 0, 0, 0.75)",
      "--text": "#ffffff",
      "--text-muted": "#d4cdd9",
      "--text-dim": "#9a92a3",
      "--accent": "#e0b8c8",
      "--accent-hover": "#efcfdc",
      "--accent-text": "#e0b8c8",
      "--on-accent": "#1a1720",
      "--accent-subtle": "rgba(224, 184, 200, 0.12)",
      "--danger": "#fda4af",
      "--danger-bg": "#2a1218",
      "--danger-border": "#5c2030",
      "--danger-text": "#fda4af",
      "--success": "#6ee7b7",
      "--success-bg": "#0f2a22",
      "--success-border": "#1f5c46",
      "--success-text": "#6ee7b7",
      "--badge-changed-bg": "#2a2210",
      "--badge-changed-text": "#fcd34d",
      "--badge-changed-border": "#5c4a14",
      "--planned-card-bg": "#141218",
      "--course-tag-bg": "rgba(224, 184, 200, 0.12)",
      "--course-tag-text": "#e8c4d2",
      "--course-tag-border": "rgba(224, 184, 200, 0.3)",
      "--course-color-1": "#e07a9b",
      "--course-color-2": "#52ba85",
      "--course-color-3": "#e0a348",
      "--course-color-4": "#68a1db",
      "--course-color-5": "#b587db",
      "--course-color-6": "#4ec2a9",
      "--course-color-7": "#e08367",
      "--course-color-8": "#8e8bdb",
      "--on-course-color": "#121212"
    }
  },
  {
    "id": "default-light",
    "name": "Default (Light)",
    "mode": "light",
    "preview": {
      "bg": "#f8f9fa",
      "accent": "#e11d48",
      "text": "#111827"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#f8f9fa",
      "--surface": "#ffffff",
      "--surface-subtle": "#f1f3f5",
      "--surface-hover": "#e9ecef",
      "--border": "#e5e7eb",
      "--border-subtle": "#f0f2f5",
      "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
      "--backdrop": "rgba(17, 24, 39, 0.5)",
      "--text": "#111827",
      "--text-muted": "#4b5563",
      "--text-dim": "#6b7280",
      "--accent": "#e11d48",
      "--accent-hover": "#be123c",
      "--accent-text": "#be123c",
      "--on-accent": "#ffffff",
      "--accent-subtle": "rgba(225, 29, 72, 0.08)",
      "--danger": "#b91c1c",
      "--danger-bg": "#fef2f2",
      "--danger-border": "#fecaca",
      "--danger-text": "#b91c1c",
      "--success": "#047857",
      "--success-bg": "#ecfdf5",
      "--success-border": "#a7f3d0",
      "--success-text": "#047857",
      "--badge-changed-bg": "#fefce8",
      "--badge-changed-text": "#854d0e",
      "--badge-changed-border": "#fef08a",
      "--planned-card-bg": "#f3f4f6",
      "--course-tag-bg": "rgba(225, 29, 72, 0.08)",
      "--course-tag-text": "#be123c",
      "--course-tag-border": "rgba(225, 29, 72, 0.2)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "default-dark",
    "name": "Default Dark",
    "mode": "dark",
    "preview": {
      "bg": "#121212",
      "accent": "#fb7185",
      "text": "#f9fafb"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#121212",
      "--surface": "#1e1e1e",
      "--surface-subtle": "#262626",
      "--surface-hover": "#2e2e2e",
      "--border": "#333333",
      "--border-subtle": "#282828",
      "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.4)",
      "--backdrop": "rgba(0, 0, 0, 0.8)",
      "--text": "#f9fafb",
      "--text-muted": "#9ca3af",
      "--text-dim": "#6b7280",
      "--accent": "#fb7185",
      "--accent-hover": "#fda4af",
      "--accent-text": "#fb7185",
      "--on-accent": "#121212",
      "--accent-subtle": "rgba(251, 113, 133, 0.15)",
      "--danger": "#f87171",
      "--danger-bg": "#2b1414",
      "--danger-border": "#5c2020",
      "--danger-text": "#f87171",
      "--success": "#34d399",
      "--success-bg": "#0d2818",
      "--success-border": "#195c37",
      "--success-text": "#34d399",
      "--badge-changed-bg": "#2e2305",
      "--badge-changed-text": "#fde047",
      "--badge-changed-border": "#63500d",
      "--planned-card-bg": "#181818",
      "--course-tag-bg": "rgba(251, 113, 133, 0.12)",
      "--course-tag-text": "#fda4af",
      "--course-tag-border": "rgba(251, 113, 133, 0.25)",
      "--course-color-1": "#e07a9b",
      "--course-color-2": "#52ba85",
      "--course-color-3": "#e0a348",
      "--course-color-4": "#68a1db",
      "--course-color-5": "#b587db",
      "--course-color-6": "#4ec2a9",
      "--course-color-7": "#e08367",
      "--course-color-8": "#8e8bdb",
      "--on-course-color": "#121212"
    }
  },
  {
    "id": "matcha",
    "name": "Matcha",
    "mode": "light",
    "preview": {
      "bg": "#f4f1ea",
      "accent": "#606c38",
      "text": "#283618"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#f4f1ea",
      "--surface": "#ffffff",
      "--surface-subtle": "#ebe7dd",
      "--surface-hover": "#e2ded2",
      "--border": "#dcd6c8",
      "--border-subtle": "#e8e4dc",
      "--card-shadow": "0 1px 3px rgba(40, 54, 24, 0.08), 0 1px 2px rgba(40, 54, 24, 0.04)",
      "--backdrop": "rgba(40, 54, 24, 0.4)",
      "--text": "#283618",
      "--text-muted": "#4a5d35",
      "--text-dim": "#606c38",
      "--accent": "#606c38",
      "--accent-hover": "#4e572d",
      "--accent-text": "#4e572d",
      "--on-accent": "#ffffff",
      "--accent-subtle": "rgba(96, 108, 56, 0.12)",
      "--danger": "#b91c1c",
      "--danger-bg": "#fdf2f2",
      "--danger-border": "#fecaca",
      "--danger-text": "#b91c1c",
      "--success": "#2d6a4f",
      "--success-bg": "#e8f5e9",
      "--success-border": "#c8e6c9",
      "--success-text": "#2d6a4f",
      "--badge-changed-bg": "#fefce8",
      "--badge-changed-text": "#854d0e",
      "--badge-changed-border": "#fef08a",
      "--planned-card-bg": "#eeebe2",
      "--course-tag-bg": "rgba(96, 108, 56, 0.1)",
      "--course-tag-text": "#4e572d",
      "--course-tag-border": "rgba(96, 108, 56, 0.25)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "mint-chocolate",
    "name": "Mint Chocolate",
    "mode": "light",
    "preview": {
      "bg": "#E9EFE5",
      "accent": "#3EB58B",
      "text": "#5D3D2D"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#E9EFE5",
      "--surface": "#FFFFFF",
      "--surface-subtle": "#e0e9dc",
      "--surface-hover": "#d3e2cf",
      "--border": "#DCC08C",
      "--border-subtle": "#ebd9b7",
      "--card-shadow": "0 1px 3px rgba(93, 61, 45, 0.08), 0 1px 2px rgba(93, 61, 45, 0.04)",
      "--backdrop": "rgba(93, 61, 45, 0.4)",
      "--text": "#5D3D2D",
      "--text-muted": "#724e3c",
      "--text-dim": "#85604d",
      "--accent": "#3EB58B",
      "--accent-hover": "#2fa177",
      "--accent-text": "#1b6d51",
      "--on-accent": "#24160e",
      "--accent-subtle": "rgba(62, 181, 139, 0.15)",
      "--danger": "#b91c1c",
      "--danger-bg": "#fdf2f2",
      "--danger-border": "#fecaca",
      "--danger-text": "#b91c1c",
      "--success": "#1b6d51",
      "--success-bg": "#e9f7f1",
      "--success-border": "#9becbe",
      "--success-text": "#1b6d51",
      "--badge-changed-bg": "#fef9ee",
      "--badge-changed-text": "#7d4808",
      "--badge-changed-border": "#f0dbad",
      "--planned-card-bg": "#e2ebd9",
      "--course-tag-bg": "rgba(62, 181, 139, 0.12)",
      "--course-tag-text": "#1b6d51",
      "--course-tag-border": "rgba(62, 181, 139, 0.3)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "cafe-tiramisu",
    "name": "Cafe Tiramisu",
    "mode": "light",
    "preview": {
      "bg": "#FFF7ED",
      "accent": "#A58569",
      "text": "#5B3F32"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#FFF7ED",
      "--surface": "#F0E6D6",
      "--surface-subtle": "#e6d9c5",
      "--surface-hover": "#dccdb7",
      "--border": "#D9C7B0",
      "--border-subtle": "#e8dcce",
      "--card-shadow": "0 1px 3px rgba(91, 63, 50, 0.08), 0 1px 2px rgba(91, 63, 50, 0.04)",
      "--backdrop": "rgba(91, 63, 50, 0.4)",
      "--text": "#5B3F32",
      "--text-muted": "#6f4d3d",
      "--text-dim": "#85604d",
      "--accent": "#A58569",
      "--accent-hover": "#937357",
      "--accent-text": "#6e4b30",
      "--on-accent": "#26170f",
      "--accent-subtle": "rgba(165, 133, 105, 0.18)",
      "--danger": "#b91c1c",
      "--danger-bg": "#faebeb",
      "--danger-border": "#f5c6cb",
      "--danger-text": "#b91c1c",
      "--success": "#2d6a4f",
      "--success-bg": "#e8f2ea",
      "--success-border": "#b7dfc6",
      "--success-text": "#2d6a4f",
      "--badge-changed-bg": "#fcf5ea",
      "--badge-changed-text": "#7d4808",
      "--badge-changed-border": "#f0dbad",
      "--planned-card-bg": "#e9dcc9",
      "--course-tag-bg": "rgba(165, 133, 105, 0.15)",
      "--course-tag-text": "#6e4b30",
      "--course-tag-border": "rgba(165, 133, 105, 0.3)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "cafe-mocha",
    "name": "Cafe Mocha",
    "mode": "dark",
    "preview": {
      "bg": "#4B3728",
      "accent": "#DEC6B0",
      "text": "#F5E8E0"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#4B3728",
      "--surface": "#735540",
      "--surface-subtle": "#5d4432",
      "--surface-hover": "#806049",
      "--border": "#8c6b54",
      "--border-subtle": "#634935",
      "--card-shadow": "0 1px 3px rgba(35, 23, 16, 0.6), 0 1px 2px rgba(35, 23, 16, 0.4)",
      "--backdrop": "rgba(35, 23, 16, 0.75)",
      "--text": "#F5E8E0",
      "--text-muted": "#f7eee8",
      "--text-dim": "#dec6b0",
      "--accent": "#DEC6B0",
      "--accent-hover": "#ebdcd0",
      "--accent-text": "#ebdcd0",
      "--on-accent": "#2E1F14",
      "--accent-subtle": "rgba(222, 198, 176, 0.18)",
      "--danger": "#ffd8d3",
      "--danger-bg": "#411d1d",
      "--danger-border": "#783030",
      "--danger-text": "#ffd8d3",
      "--success": "#bbf7d0",
      "--success-bg": "#1d3d29",
      "--success-border": "#34784e",
      "--success-text": "#bbf7d0",
      "--badge-changed-bg": "#3e2e12",
      "--badge-changed-text": "#fde047",
      "--badge-changed-border": "#7a5c1a",
      "--planned-card-bg": "#594231",
      "--course-tag-bg": "rgba(222, 198, 176, 0.15)",
      "--course-tag-text": "#ebdcd0",
      "--course-tag-border": "rgba(222, 198, 176, 0.3)",
      "--course-color-1": "#f5a9bc",
      "--course-color-2": "#8fe3b8",
      "--course-color-3": "#fcd07e",
      "--course-color-4": "#9dc9f5",
      "--course-color-5": "#d9b3f7",
      "--course-color-6": "#7de8d1",
      "--course-color-7": "#fab29d",
      "--course-color-8": "#b8b5fa",
      "--on-course-color": "#2e1f14"
    }
  },
  {
    "id": "verstappen",
    "name": "Verstappen",
    "mode": "dark",
    "preview": {
      "bg": "#0c1022",
      "accent": "#f35b04",
      "text": "#ffffff"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#0c1022",
      "--surface": "#141c38",
      "--surface-subtle": "#1b254a",
      "--surface-hover": "#222f5c",
      "--border": "#253360",
      "--border-subtle": "#1c2648",
      "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.4)",
      "--backdrop": "rgba(6, 8, 18, 0.8)",
      "--text": "#ffffff",
      "--text-muted": "#b8c5e6",
      "--text-dim": "#7e8fae",
      "--accent": "#f35b04",
      "--accent-hover": "#ff7424",
      "--accent-text": "#ff7424",
      "--on-accent": "#0c1022",
      "--accent-subtle": "rgba(243, 91, 4, 0.15)",
      "--danger": "#f87171",
      "--danger-bg": "#330d14",
      "--danger-border": "#691724",
      "--danger-text": "#f87171",
      "--success": "#34d399",
      "--success-bg": "#0d2818",
      "--success-border": "#195c37",
      "--success-text": "#34d399",
      "--badge-changed-bg": "#33230a",
      "--badge-changed-text": "#fbbf24",
      "--badge-changed-border": "#6b4a11",
      "--planned-card-bg": "#0f162e",
      "--course-tag-bg": "rgba(243, 91, 4, 0.12)",
      "--course-tag-text": "#ff8b47",
      "--course-tag-border": "rgba(243, 91, 4, 0.3)",
      "--course-color-1": "#e07a9b",
      "--course-color-2": "#52ba85",
      "--course-color-3": "#e0a348",
      "--course-color-4": "#68a1db",
      "--course-color-5": "#b587db",
      "--course-color-6": "#4ec2a9",
      "--course-color-7": "#e08367",
      "--course-color-8": "#8e8bdb",
      "--on-course-color": "#121212"
    }
  },
  {
    "id": "mclaren",
    "name": "McLaren",
    "mode": "dark",
    "preview": {
      "bg": "#111111",
      "accent": "#ff8000",
      "text": "#ffffff"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#111111",
      "--surface": "#1c1c1c",
      "--surface-subtle": "#262626",
      "--surface-hover": "#2f2f2f",
      "--border": "#333333",
      "--border-subtle": "#242424",
      "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.7), 0 1px 2px rgba(0, 0, 0, 0.5)",
      "--backdrop": "rgba(0, 0, 0, 0.85)",
      "--text": "#ffffff",
      "--text-muted": "#cccccc",
      "--text-dim": "#888888",
      "--accent": "#ff8000",
      "--accent-hover": "#ff9933",
      "--accent-text": "#ff9426",
      "--on-accent": "#0a0a0a",
      "--accent-subtle": "rgba(255, 128, 0, 0.15)",
      "--danger": "#f87171",
      "--danger-bg": "#2a1215",
      "--danger-border": "#5e1c23",
      "--danger-text": "#f87171",
      "--success": "#34d399",
      "--success-bg": "#0d2818",
      "--success-border": "#195c37",
      "--success-text": "#34d399",
      "--badge-changed-bg": "#2b2108",
      "--badge-changed-text": "#fbbf24",
      "--badge-changed-border": "#59430e",
      "--planned-card-bg": "#161616",
      "--course-tag-bg": "rgba(255, 128, 0, 0.12)",
      "--course-tag-text": "#ffa347",
      "--course-tag-border": "rgba(255, 128, 0, 0.3)",
      "--course-color-1": "#e07a9b",
      "--course-color-2": "#52ba85",
      "--course-color-3": "#e0a348",
      "--course-color-4": "#68a1db",
      "--course-color-5": "#b587db",
      "--course-color-6": "#4ec2a9",
      "--course-color-7": "#e08367",
      "--course-color-8": "#8e8bdb",
      "--on-course-color": "#121212"
    }
  },
  {
    "id": "ferrari",
    "name": "Ferrari",
    "mode": "dark",
    "preview": {
      "bg": "#140406",
      "accent": "#e61528",
      "text": "#ffffff"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#140406",
      "--surface": "#240a0e",
      "--surface-subtle": "#310e14",
      "--surface-hover": "#3d131a",
      "--border": "#4a151d",
      "--border-subtle": "#330e14",
      "--card-shadow": "0 1px 3px rgba(10, 0, 2, 0.8), 0 1px 2px rgba(10, 0, 2, 0.6)",
      "--backdrop": "rgba(10, 2, 4, 0.85)",
      "--text": "#ffffff",
      "--text-muted": "#e6c2c6",
      "--text-dim": "#997378",
      "--accent": "#e61528",
      "--accent-hover": "#ff263b",
      "--accent-text": "#ff3b4e",
      "--on-accent": "#ffffff",
      "--accent-subtle": "rgba(230, 21, 40, 0.15)",
      "--danger": "#f87171",
      "--danger-bg": "#330d14",
      "--danger-border": "#691724",
      "--danger-text": "#f87171",
      "--success": "#facc15",
      "--success-bg": "#2d2407",
      "--success-border": "#63500d",
      "--success-text": "#facc15",
      "--badge-changed-bg": "#2d2407",
      "--badge-changed-text": "#facc15",
      "--badge-changed-border": "#63500d",
      "--planned-card-bg": "#1a070a",
      "--course-tag-bg": "rgba(230, 21, 40, 0.12)",
      "--course-tag-text": "#ff5264",
      "--course-tag-border": "rgba(230, 21, 40, 0.3)",
      "--course-color-1": "#e07a9b",
      "--course-color-2": "#52ba85",
      "--course-color-3": "#e0a348",
      "--course-color-4": "#68a1db",
      "--course-color-5": "#b587db",
      "--course-color-6": "#4ec2a9",
      "--course-color-7": "#e08367",
      "--course-color-8": "#8e8bdb",
      "--on-course-color": "#121212"
    }
  },
  {
    "id": "premium",
    "name": "Premium",
    "mode": "light",
    "preview": {
      "bg": "#faf8f5",
      "accent": "#b48325",
      "text": "#1c1917"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#faf8f5",
      "--surface": "#ffffff",
      "--surface-subtle": "#f3efe6",
      "--surface-hover": "#e9e3d5",
      "--border": "#e5ded2",
      "--border-subtle": "#eee9df",
      "--card-shadow": "0 1px 3px rgba(28, 25, 23, 0.08), 0 1px 2px rgba(28, 25, 23, 0.04)",
      "--backdrop": "rgba(28, 25, 23, 0.4)",
      "--text": "#1c1917",
      "--text-muted": "#57534e",
      "--text-dim": "#78716c",
      "--accent": "#b48325",
      "--accent-hover": "#996e1b",
      "--accent-text": "#876014",
      "--on-accent": "#1c1917",
      "--accent-subtle": "rgba(180, 131, 37, 0.12)",
      "--danger": "#b91c1c",
      "--danger-bg": "#fef2f2",
      "--danger-border": "#fecaca",
      "--danger-text": "#b91c1c",
      "--success": "#047857",
      "--success-bg": "#ecfdf5",
      "--success-border": "#a7f3d0",
      "--success-text": "#047857",
      "--badge-changed-bg": "#fef9ee",
      "--badge-changed-text": "#7d4808",
      "--badge-changed-border": "#f0dbad",
      "--planned-card-bg": "#f1ebe0",
      "--course-tag-bg": "rgba(180, 131, 37, 0.1)",
      "--course-tag-text": "#876014",
      "--course-tag-border": "rgba(180, 131, 37, 0.25)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "sakura",
    "name": "Sakura",
    "mode": "light",
    "preview": {
      "bg": "#fff5f7",
      "accent": "#d83a56",
      "text": "#4a1525"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#fff5f7",
      "--surface": "#ffffff",
      "--surface-subtle": "#fde8ec",
      "--surface-hover": "#fcd6de",
      "--border": "#fcd5dc",
      "--border-subtle": "#fae2e6",
      "--card-shadow": "0 1px 3px rgba(74, 21, 37, 0.08), 0 1px 2px rgba(74, 21, 37, 0.04)",
      "--backdrop": "rgba(74, 21, 37, 0.4)",
      "--text": "#4a1525",
      "--text-muted": "#7a2a40",
      "--text-dim": "#94455b",
      "--accent": "#d83a56",
      "--accent-hover": "#b82640",
      "--accent-text": "#b82640",
      "--on-accent": "#ffffff",
      "--accent-subtle": "rgba(216, 58, 86, 0.12)",
      "--danger": "#b91c1c",
      "--danger-bg": "#fef2f2",
      "--danger-border": "#fecaca",
      "--danger-text": "#b91c1c",
      "--success": "#15803d",
      "--success-bg": "#f0fdf4",
      "--success-border": "#bbf7d0",
      "--success-text": "#15803d",
      "--badge-changed-bg": "#fef9ee",
      "--badge-changed-text": "#7d4808",
      "--badge-changed-border": "#f0dbad",
      "--planned-card-bg": "#faedf0",
      "--course-tag-bg": "rgba(216, 58, 86, 0.1)",
      "--course-tag-text": "#b82640",
      "--course-tag-border": "rgba(216, 58, 86, 0.25)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "lavender",
    "name": "Lavender",
    "mode": "light",
    "preview": {
      "bg": "#f7f5fc",
      "accent": "#7c5295",
      "text": "#2b1f47"
    },
    "variables": {
      "--color-scheme": "light",
      "--bg": "#f7f5fc",
      "--surface": "#ffffff",
      "--surface-subtle": "#efeaf9",
      "--surface-hover": "#e5dcf4",
      "--border": "#e3def2",
      "--border-subtle": "#ede8f7",
      "--card-shadow": "0 1px 3px rgba(43, 31, 71, 0.08), 0 1px 2px rgba(43, 31, 71, 0.04)",
      "--backdrop": "rgba(43, 31, 71, 0.4)",
      "--text": "#2b1f47",
      "--text-muted": "#574878",
      "--text-dim": "#736494",
      "--accent": "#7c5295",
      "--accent-hover": "#66407d",
      "--accent-text": "#66407d",
      "--on-accent": "#ffffff",
      "--accent-subtle": "rgba(124, 82, 149, 0.12)",
      "--danger": "#b91c1c",
      "--danger-bg": "#fef2f2",
      "--danger-border": "#fecaca",
      "--danger-text": "#b91c1c",
      "--success": "#15803d",
      "--success-bg": "#f0fdf4",
      "--success-border": "#bbf7d0",
      "--success-text": "#15803d",
      "--badge-changed-bg": "#fef9ee",
      "--badge-changed-text": "#7d4808",
      "--badge-changed-border": "#f0dbad",
      "--planned-card-bg": "#eeeaf6",
      "--course-tag-bg": "rgba(124, 82, 149, 0.1)",
      "--course-tag-text": "#66407d",
      "--course-tag-border": "rgba(124, 82, 149, 0.25)",
      "--course-color-1": "#6b3e52",
      "--course-color-2": "#2d5045",
      "--course-color-3": "#5a452a",
      "--course-color-4": "#2d4560",
      "--course-color-5": "#4b365c",
      "--course-color-6": "#35534c",
      "--course-color-7": "#614035",
      "--course-color-8": "#3d3b5e",
      "--on-course-color": "#ffffff"
    }
  },
  {
    "id": "mainframe",
    "name": "Mainframe",
    "mode": "dark",
    "preview": {
      "bg": "#050d08",
      "accent": "#00e654",
      "text": "#52ff7e"
    },
    "variables": {
      "--color-scheme": "dark",
      "--bg": "#050d08",
      "--surface": "#0c1a11",
      "--surface-subtle": "#122519",
      "--surface-hover": "#173321",
      "--border": "#183b23",
      "--border-subtle": "#102a18",
      "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6)",
      "--backdrop": "rgba(2, 6, 4, 0.85)",
      "--text": "#52ff7e",
      "--text-muted": "#30b355",
      "--text-dim": "#1f803b",
      "--accent": "#00e654",
      "--accent-hover": "#2bf773",
      "--accent-text": "#00e654",
      "--on-accent": "#050d08",
      "--accent-subtle": "rgba(0, 230, 84, 0.15)",
      "--danger": "#ff5252",
      "--danger-bg": "#2d0a0a",
      "--danger-border": "#5c1818",
      "--danger-text": "#ff5252",
      "--success": "#00e654",
      "--success-bg": "#0c2415",
      "--success-border": "#195c33",
      "--success-text": "#00e654",
      "--badge-changed-bg": "#2e2e05",
      "--badge-changed-text": "#eab308",
      "--badge-changed-border": "#5c5c0a",
      "--planned-card-bg": "#08130c",
      "--course-tag-bg": "rgba(0, 230, 84, 0.12)",
      "--course-tag-text": "#3bf77e",
      "--course-tag-border": "rgba(0, 230, 84, 0.3)",
      "--course-color-1": "#e07a9b",
      "--course-color-2": "#52ba85",
      "--course-color-3": "#e0a348",
      "--course-color-4": "#68a1db",
      "--course-color-5": "#b587db",
      "--course-color-6": "#4ec2a9",
      "--course-color-7": "#e08367",
      "--course-color-8": "#8e8bdb",
      "--on-course-color": "#121212"
    }
  }
];

const THEME_STORAGE_KEY = 'populi_theme';
const DEFAULT_THEME_ID = 'pink-steel';

let transitionTimer = null;

function getThemes() {
  return THEMES;
}

function getThemeById(id) {
  if (!id) return THEMES.find(t => t.id === DEFAULT_THEME_ID) || THEMES[0];
  const found = THEMES.find(t => t.id === id);
  return found || THEMES.find(t => t.id === DEFAULT_THEME_ID) || THEMES[0];
}

function getCurrentThemeId() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!saved || !THEMES.some(t => t.id === saved)) {
      return DEFAULT_THEME_ID;
    }
    return saved;
  } catch (e) {
    return DEFAULT_THEME_ID;
  }
}

function getCurrentTheme() {
  return getThemeById(getCurrentThemeId());
}

/**
 * Applies a theme by setting data-theme and data-mode on <html> and writing CSS variables.
 * @param {string} themeId
 * @param {{ save?: boolean, transition?: boolean }} [options]
 */
function applyTheme(themeId, options = {}) {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  // Manage smooth 200ms theme transition unless explicitly disabled or prefers-reduced-motion
  if (options.transition !== false && typeof window !== 'undefined') {
    root.classList.add('theme-transitioning');
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
      transitionTimer = null;
    }, 250);
  }

  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-mode', theme.mode);
  root.style.colorScheme = theme.mode;

  // Apply all CSS variables dynamically so any new theme object works immediately
  if (theme.variables && typeof theme.variables === 'object') {
    Object.entries(theme.variables).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });
  }

  if (options.save !== false) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage:', e);
    }
  }

  // Dispatch custom event for components listening to theme changes
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('populi-theme-changed', {
        detail: { theme, isPreview: options.save === false }
      }));
    } catch (e) {}
  }

  return theme;
}

/**
 * Temporarily preview a theme without saving to localStorage.
 * @param {string} themeId
 */
function previewTheme(themeId) {
  return applyTheme(themeId, { save: false, transition: true });
}

/**
 * Reverts to the saved theme from localStorage.
 */
function revertTheme() {
  return applyTheme(getCurrentThemeId(), { save: false, transition: true });
}

/**
 * Initializes the theme on script execution.
 */
function initTheme() {
  const savedId = getCurrentThemeId();
  return applyTheme(savedId, { save: false, transition: false });
}

// ==========================================================================
// MONKEYTYPE-STYLE THEME PICKER COMPONENT
// ==========================================================================

let savedThemeOnOpen = null;
let visibleThemes = [];
let highlightedIndex = 0;
let lastFocusedElement = null;

function initThemePicker() {
  const pickerBtn = document.getElementById('btn-theme-picker');
  const dialog = document.getElementById('theme-picker-dialog');
  const searchInput = document.getElementById('theme-search-input');
  const optionsList = document.getElementById('theme-options-list');
  const emptyState = document.getElementById('theme-empty-state');
  const cancelBtn = document.getElementById('btn-theme-cancel');
  const selectBtn = document.getElementById('btn-theme-select');
  const closeBtn = document.getElementById('theme-picker-close-btn');

  if (!pickerBtn || !dialog || !searchInput || !optionsList) {
    return;
  }

  function renderList(query = '') {
    const q = query.trim().toLowerCase();
    visibleThemes = THEMES.filter(t => t.name.toLowerCase().includes(q));

    optionsList.innerHTML = '';

    if (visibleThemes.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const currentSaved = getCurrentThemeId();

    visibleThemes.forEach((theme, index) => {
      const li = document.createElement('li');
      li.id = `theme-opt-${theme.id}`;
      li.className = 'theme-option-row';
      li.setAttribute('role', 'option');
      li.setAttribute('data-theme-id', theme.id);
      li.setAttribute('data-index', String(index));

      const isCurrentActive = theme.id === currentSaved;
      li.setAttribute('aria-selected', isCurrentActive ? 'true' : 'false');
      if (isCurrentActive) {
        li.classList.add('is-active');
      }

      if (index === highlightedIndex) {
        li.classList.add('is-highlighted');
      }

      // Left column: checkmark icon + theme name
      const leftCol = document.createElement('div');
      leftCol.className = 'theme-row-left';

      const checkSpan = document.createElement('span');
      checkSpan.className = 'theme-check-icon';
      checkSpan.setAttribute('aria-hidden', 'true');
      checkSpan.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      leftCol.appendChild(checkSpan);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'theme-name';
      nameSpan.textContent = theme.name;
      leftCol.appendChild(nameSpan);

      li.appendChild(leftCol);

      // Right column: pill with 3 color dots (bg, accent, text)
      const pill = document.createElement('div');
      pill.className = 'theme-row-pill';
      pill.title = `${theme.name} colors`;
      pill.setAttribute('aria-hidden', 'true');

      const dotBg = document.createElement('span');
      dotBg.className = 'theme-dot theme-dot-bg';
      dotBg.style.backgroundColor = theme.preview.bg;

      const dotAccent = document.createElement('span');
      dotAccent.className = 'theme-dot theme-dot-accent';
      dotAccent.style.backgroundColor = theme.preview.accent;

      const dotText = document.createElement('span');
      dotText.className = 'theme-dot theme-dot-text';
      dotText.style.backgroundColor = theme.preview.text;

      pill.appendChild(dotBg);
      pill.appendChild(dotAccent);
      pill.appendChild(dotText);

      li.appendChild(pill);

      // Mouse hover / Pointer events for live preview
      li.addEventListener('pointerenter', () => {
        // Only trigger on real hover devices
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
          setHighlight(index, true);
        }
      });

      // Click / Tap event: selects and saves theme (or previews on touch device)
      li.addEventListener('click', () => {
        const isHoverDevice = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover)').matches;
        if (isHoverDevice) {
          selectAndSaveTheme(theme.id);
        } else {
          // Touch device (no hover): if already highlighted, tap confirms; otherwise, apply/preview
          if (highlightedIndex === index) {
            selectAndSaveTheme(theme.id);
          } else {
            setHighlight(index, true);
          }
        }
      });

      optionsList.appendChild(li);
    });
  }

  function setHighlight(index, preview = true) {
    if (visibleThemes.length === 0) return;
    if (index < 0) index = 0;
    if (index >= visibleThemes.length) index = visibleThemes.length - 1;

    highlightedIndex = index;
    const targetTheme = visibleThemes[highlightedIndex];

    const rows = optionsList.querySelectorAll('.theme-option-row');
    rows.forEach((r, idx) => {
      if (idx === highlightedIndex) {
        r.classList.add('is-highlighted');
        r.scrollIntoView({ block: 'nearest' });
      } else {
        r.classList.remove('is-highlighted');
      }
    });

    if (preview && targetTheme) {
      previewTheme(targetTheme.id);
    }
  }

  function selectAndSaveTheme(themeId) {
    applyTheme(themeId, { save: true, transition: true });
    closePicker(false);
  }

  function openPicker() {
    lastFocusedElement = document.activeElement;
    savedThemeOnOpen = getCurrentThemeId();

    searchInput.value = '';
    visibleThemes = [...THEMES];

    // Find index of currently saved theme
    const activeIdx = visibleThemes.findIndex(t => t.id === savedThemeOnOpen);
    highlightedIndex = activeIdx >= 0 ? activeIdx : 0;

    renderList('');

    pickerBtn.setAttribute('aria-expanded', 'true');
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    // Scroll active item into view
    setTimeout(() => {
      setHighlight(highlightedIndex, false);
      searchInput.focus();
    }, 20);
  }

  function closePicker(revert = false) {
    if (revert && savedThemeOnOpen) {
      applyTheme(savedThemeOnOpen, { save: false, transition: true });
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    pickerBtn.setAttribute('aria-expanded', 'false');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  // Button click to open
  pickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPicker();
  });

  // Search input typing
  searchInput.addEventListener('input', () => {
    highlightedIndex = 0;
    renderList(searchInput.value);
    setHighlight(0, true);
  });

  // Keyboard navigation inside search input and dialog
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleThemes.length === 0) return;
      const nextIdx = (highlightedIndex + 1) % visibleThemes.length;
      setHighlight(nextIdx, true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleThemes.length === 0) return;
      const prevIdx = (highlightedIndex - 1 + visibleThemes.length) % visibleThemes.length;
      setHighlight(prevIdx, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visibleThemes.length > 0 && visibleThemes[highlightedIndex]) {
        selectAndSaveTheme(visibleThemes[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePicker(true);
    } else if (e.key === 'Tab') {
      // Focus trapping inside modal dialog
      const focusables = dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const focusableArr = Array.from(focusables);
      if (focusableArr.length === 0) return;

      const first = focusableArr[0];
      const last = focusableArr[focusableArr.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closePicker(true);
    });
  }

  // Select button
  if (selectBtn) {
    selectBtn.addEventListener('click', () => {
      if (visibleThemes.length > 0 && visibleThemes[highlightedIndex]) {
        selectAndSaveTheme(visibleThemes[highlightedIndex].id);
      }
    });
  }

  // Close 'x' button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closePicker(true);
    });
  }

  // Native dialog cancel event (e.g. Esc press handled natively by browser)
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closePicker(true);
  });

  // Backdrop click to cancel
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closePicker(true);
    }
  });
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  initTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemePicker);
  } else {
    initThemePicker();
  }
}

// Export for browser globals and module environments
if (typeof window !== 'undefined') {
  window.PopuliThemes = {
    THEMES,
    getThemes,
    getThemeById,
    getCurrentThemeId,
    getCurrentTheme,
    applyTheme,
    previewTheme,
    revertTheme,
    initTheme,
    initThemePicker
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    THEMES,
    getThemes,
    getThemeById,
    getCurrentThemeId,
    getCurrentTheme,
    applyTheme,
    previewTheme,
    revertTheme,
    initTheme,
    initThemePicker
  };
}
