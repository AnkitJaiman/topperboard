/* =====================================================================
   TopperBoard SETTINGS — sirf ye file bharni hai (only edit this file)
   Khaali ("") chhodoge to woh cheez band/hidden rahegi.
   ===================================================================== */
window.TB_CONFIG = {
  // Website address (GitHub Pages ya apna domain)
  SITE_URL: "https://ankitjaiman.github.io/topperboard/",

  // --- Database (Supabase > Project Settings > API) ---
  SUPABASE_URL: "",        // e.g. "https://abcd1234.supabase.co"
  SUPABASE_ANON_KEY: "",   // "anon public" key (NEVER the service_role key)

  // --- Payments ---
  RAZORPAY_KEY_ID: "",     // e.g. "rzp_live_xxxx" -> automatic payments
  UPI_ID: "",              // backup only, e.g. "name@okaxis" (manual approval)

  // --- Business details (legal pages, About, footer) — launch se pehle zaroori ---
  LEGAL_NAME: "Ankit Jaiman",          // e.g. "Ankit Jaiman" ya registered business name
  CITY: "Jaipur",                // e.g. "Dehradun"
  ADDRESS: "97 Goplapuri Sanganer, near Sector 3, Pratap Nagar, Jaipur, Rajasthan 302033",             // full postal address
  EMAIL: "ankitjaiman882@gmail.com",               // support + grievance email
  PHONE: "",               // support phone (optional)
  WHATSAPP: "",            // e.g. "919876543210" (country code, no +) (optional)
  GRIEVANCE_OFFICER: "Ankit Jaiman",   // Grievance Officer ka naam
  GSTIN: "",               // sirf agar GST registered ho
};

/* ---------------- Don't edit below this line ---------------- */
(function () {
  var C = window.TB_CONFIG;
  var missing = "[to be added]";
  function fill() {
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var v = C[el.getAttribute("data-cfg")];
      el.textContent = v || missing;
    });
    document.querySelectorAll("[data-cfg-mail]").forEach(function (el) {
      if (C.EMAIL) { el.href = "mailto:" + C.EMAIL + (el.getAttribute("data-cfg-mail") || ""); if (!el.textContent.trim()) el.textContent = C.EMAIL; }
      else { el.href = "contact.html"; if (!el.textContent.trim()) el.textContent = missing; }
    });
    document.querySelectorAll("[data-cfg-if]").forEach(function (el) {
      el.hidden = !C[el.getAttribute("data-cfg-if")];
    });
    document.querySelectorAll("[data-cfg-wa]").forEach(function (el) {
      if (C.WHATSAPP) el.href = "https://wa.me/" + C.WHATSAPP; else el.hidden = true;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})();
