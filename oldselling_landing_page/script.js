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

const SUPABASE_URL = "https://rfrqyrswgszcjcdqriwb.supabase.co";
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