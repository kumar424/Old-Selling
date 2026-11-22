document.getElementById("year").textContent = new Date().getFullYear();

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.textContent = open ? "×" : "☰";
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.textContent = "☰";
}));

// This is a local-only demonstration poll. Votes are not sent to a server.
const pollNote = document.getElementById("poll-note");
document.querySelectorAll("[data-vote]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-vote]").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    const choice = button.dataset.vote === "good" ? "Good idea" : "Needs work";
    pollNote.textContent = `Thanks — you selected “${choice}”. This choice stays only in this browser and is not submitted to Oldselling.`;
  });
});

//***********************************database - supabase connection related code **************************************//

const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_ndUjcN5KgFWJb0txQAT-cQ_4SLXw0a3";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("contact-form");
const formNote = document.getElementById("form-note");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector(".submit-button");
  submitBtn.disabled = true;
  formNote.textContent = "Sending your feedback...";

  const formData = new FormData(form);
  const { error } = await db
    .from("feedback_submissions")
    .insert([{
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company") || null,
      message: formData.get("message"),
      updates: formData.get("updates") === "on",
    }]);

  if (error) {
    formNote.textContent = "Could not send feedback. Please try again.";
    console.error("Supabase insert error:", error);
  } else {
    formNote.textContent = "Thanks! Your feedback has been saved.";
    form.reset();
  }

  submitBtn.disabled = false;
});

// ================= GOOGLE PLACES & LOCATION STORAGE =================
(async () => {
  const locationInput = document.getElementById("location-input");
  const clearBtn = document.getElementById("clear-search");
  const searchBtn = document.getElementById("search-submit");
  const dropdown = document.getElementById("location-dropdown");
  const resultsList = document.getElementById("location-results");
  const footerBar = dropdown?.querySelector(".dropdown-footer-bar");

  if (!locationInput) return;

  // Add required Google attribution to dropdown footer
  if (footerBar) {
    footerBar.textContent = "Powered by Google";
  }

  // Restore last saved location in the input if user returns later
  const SAVED_LOCATION_KEY = "oldselling_selected_location";
  const previousLocation = JSON.parse(localStorage.getItem(SAVED_LOCATION_KEY) || "null");
  if (previousLocation?.name) {
    locationInput.value = previousLocation.name;
    clearBtn.hidden = false;
  }

  // Ensure Google Maps JS loader is present
  if (!window.google?.maps?.importLibrary) {
    console.error("Google Maps JS API loader is missing in index.html.");
    return;
  }

  const { AutocompleteSuggestion, AutocompleteSessionToken } =
    await google.maps.importLibrary("places");

  let sessionToken = new AutocompleteSessionToken();
  let debounceTimer = null;

  function parseAddressComponents(components = []) {
    const getComponent = (type) =>
      components.find((c) => c.types.includes(type))?.longText || null;

    return {
      city: getComponent("locality") || getComponent("administrative_area_level_2"),
      state: getComponent("administrative_area_level_1"),
      postal_code: getComponent("postal_code"),
    };
  }

  async function saveLocationData(placeData) {
    // 1. Save in browser localStorage for instant reuse
    localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(placeData));

    // Keep a history list of last 5 searched locations
    const history = JSON.parse(localStorage.getItem("oldselling_location_history") || "[]");
    const updatedHistory = [
      placeData,
      ...history.filter((item) => item.place_id !== placeData.place_id),
    ].slice(0, 5);
    localStorage.setItem("oldselling_location_history", JSON.stringify(updatedHistory));

    // 2. Save to Supabase `searched_locations` table
    const { error } = await db.from("searched_locations").insert([placeData]);
    if (error) {
      console.error("Supabase location save error:", error);
    }
  }

  async function fetchPredictions(query) {
    const trimmed = query.trim();
    clearBtn.hidden = trimmed.length === 0;

    if (trimmed.length < 2) {
      dropdown.hidden = true;
      resultsList.innerHTML = "";
      return;
    }

    try {
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken,
        includedRegionCodes: ["in"],
        language: "en",
      });

      resultsList.innerHTML = "";

      if (!suggestions || suggestions.length === 0) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "location-empty";
        emptyLi.textContent = `No locations found for "${trimmed}"`;
        resultsList.appendChild(emptyLi);
        dropdown.hidden = false;
        return;
      }

      suggestions.forEach((suggestion) => {
        const prediction = suggestion.placePrediction;
        if (!prediction) return;

        const mainText = prediction.mainText?.text || prediction.text.text;
        const secondaryText = prediction.secondaryText?.text || "";

        const li = document.createElement("li");
        li.className = "location-item";
        li.innerHTML = `
          <p class="location-title">${mainText}</p>
          <p class="location-subtitle">${secondaryText}</p>
        `;

        li.addEventListener("click", async () => {
          locationInput.value = mainText;
          dropdown.hidden = true;

          const place = prediction.toPlace();
          await place.fetchFields({
            fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"],
          });

          // Reset session token after place selection completes the billing session
          sessionToken = new AutocompleteSessionToken();

          const parsed = parseAddressComponents(place.addressComponents);
          const locationRecord = {
            place_id: place.id,
            name: place.displayName || mainText,
            formatted_address: place.formattedAddress || `${mainText}, ${secondaryText}`,
            city: parsed.city,
            state: parsed.state,
            postal_code: parsed.postal_code,
            latitude: place.location?.lat() ?? null,
            longitude: place.location?.lng() ?? null,
          };

          await saveLocationData(locationRecord);
        });

        resultsList.appendChild(li);
      });

      dropdown.hidden = false;
    } catch (err) {
      console.error("Google Places Autocomplete error:", err);
    }
  }

  locationInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchPredictions(e.target.value);
    }, 250);
  });

  clearBtn.addEventListener("click", () => {
    locationInput.value = "";
    clearBtn.hidden = true;
    dropdown.hidden = true;
    localStorage.removeItem(SAVED_LOCATION_KEY);
    locationInput.focus();
  });

  searchBtn.addEventListener("click", () => {
    if (locationInput.value.trim()) {
      fetchPredictions(locationInput.value);
    } else {
      locationInput.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      dropdown.hidden = true;
    }
  });
})();
// ================= END GOOGLE PLACES & LOCATION STORAGE =================
