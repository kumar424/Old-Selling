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

// No backend/email service is configured. Prepare an email in the visitor's email app instead.
const contactForm = document.getElementById("contact-form");
contactForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const company = String(data.get("company") || "").trim();
  const message = String(data.get("message") || "").trim();
  const updates = data.get("updates") ? "Yes" : "No";
  const subject = encodeURIComponent("Website feedback / enquiry — Oldselling");
  const body = encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nCompany / product: ${company || "Not provided"}\nInterested in updates: ${updates}\n\nFeedback / requirement:\n${message}`
  );
  // Replace this placeholder with your real contact email before publishing.
  const contactEmail = "hello@oldselling.in";
  document.getElementById("form-note").textContent =
    `Opening your email app addressed to ${contactEmail}. Please review and send the message there.`;
  window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
});
