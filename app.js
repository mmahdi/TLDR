const DATA_URL = "tldr.json";
const STORAGE_KEY = "tldr-read-ids";
const LIKED_KEY = "tldr-liked-ids";

const themesEl = document.getElementById("themes");
const lastUpdatedEl = document.getElementById("lastUpdated");
const unreadCountEl = document.getElementById("unreadCount");
const refreshButton = document.getElementById("refreshButton");
const toggleArchivedButton = document.getElementById("toggleArchived");
const themeTemplate = document.getElementById("themeTemplate");
const tileTemplate = document.getElementById("tileTemplate");

let showArchived = false;

const loadReadIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch (error) {
    return new Set();
  }
};

const loadLikedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
  } catch (error) {
    return new Set();
  }
};

const saveReadIds = (readIds) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readIds)));
};

const saveLikedIds = (likedIds) => {
  localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(likedIds)));
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const THEME_ORDER = [
  "Big Tech",
  "Startups",
  "AI",
  "Science",
  "World",
  "Business",
  "Tools",
  "Misc",
  "Quick Links",
];

const groupByTheme = (items) => {
  const map = new Map();
  items.forEach((item) => {
    const theme = item.theme || "General";
    if (!map.has(theme)) map.set(theme, []);
    map.get(theme).push(item);
  });
  return Array.from(map.entries());
};

const render = (data) => {
  const readIds = loadReadIds();
  const likedIds = loadLikedIds();
  const items = data.items || [];
  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;

  themesEl.innerHTML = "";
  unreadCountEl.textContent = `${unreadCount}`;
  lastUpdatedEl.textContent = data.updated_at ? formatDate(data.updated_at) : "—";

  const grouped = groupByTheme(items).sort((a, b) => {
    const aIndex = THEME_ORDER.indexOf(a[0]);
    const bIndex = THEME_ORDER.indexOf(b[0]);
    if (aIndex === -1 && bIndex === -1) return b[1].length - a[1].length;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (grouped.length === 0) {
    themesEl.innerHTML = "<p>No TLDR emails yet. Check back tomorrow.</p>";
    return;
  }

  grouped.forEach(([theme, themeItems], themeIndex) => {
    const themeNode = themeTemplate.content.cloneNode(true);
    const title = themeNode.querySelector(".theme__title");
    const count = themeNode.querySelector(".theme__count");
    const grid = themeNode.querySelector(".theme__grid");

    title.textContent = theme;
    count.textContent = `${themeItems.length} tiles`;

    themeItems.forEach((item, index) => {
      const tileNode = tileTemplate.content.cloneNode(true);
      const tile = tileNode.querySelector(".tile");
      const date = tileNode.querySelector(".tile__date");
      const tag = tileNode.querySelector(".tile__tag");
      const titleEl = tileNode.querySelector(".tile__title");
      const summary = tileNode.querySelector(".tile__summary");
      const button = tileNode.querySelector(".tile__action");
      const likeButton = tileNode.querySelector(".tile__like");

      tile.style.animationDelay = `${(themeIndex + index) * 0.03}s`;
      date.textContent = formatDate(item.date);
      tag.textContent = item.source || "TLDR";
      titleEl.textContent = item.title;
      summary.textContent = item.summary || "";

      const isRead = readIds.has(item.id);
      const isLiked = likedIds.has(item.id);
      if (isRead) {
        tile.classList.add("tile--archived");
        button.textContent = "Archived";
      }
      if (isLiked) {
        tile.classList.add("tile--liked");
        likeButton.textContent = "Liked";
      }

      button.addEventListener("click", () => {
        readIds.add(item.id);
        saveReadIds(readIds);
        render(data);
      });

      likeButton.addEventListener("click", () => {
        if (likedIds.has(item.id)) {
          likedIds.delete(item.id);
        } else {
          likedIds.add(item.id);
        }
        saveLikedIds(likedIds);
        render(data);
      });

      if (!showArchived && isRead) return;
      grid.appendChild(tileNode);
    });

    themesEl.appendChild(themeNode);
  });
};

const fetchData = async () => {
  const cacheBust = `?v=${Date.now()}`;
  const response = await fetch(`${DATA_URL}${cacheBust}`);
  if (!response.ok) {
    throw new Error("Unable to load tldr.json");
  }
  return response.json();
};

const load = async () => {
  themesEl.innerHTML = "<p>Loading TLDR tiles...</p>";
  try {
    const data = await fetchData();
    render(data);
  } catch (error) {
    themesEl.innerHTML = "<p>Could not load TLDR tiles. Run the Gmail sync.</p>";
  }
};

refreshButton.addEventListener("click", load);

toggleArchivedButton.addEventListener("click", () => {
  showArchived = !showArchived;
  toggleArchivedButton.textContent = showArchived ? "Hide archived" : "Show archived";
  load();
});

load();
