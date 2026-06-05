const supabaseUrl = "https://wvfqmbwazpjbiutijlqs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZnFtYndhenBqYml1dGlqbHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzgxNTQsImV4cCI6MjA5NTk1NDE1NH0.W7oh47HhgIVixJ0iZT4tKOa_MxTzwfsa0v4RlyQOgCs";
const whatsappNumber = "919538688780";
const storageBucket = "images";
const client = typeof supabase !== "undefined" ? supabase.createClient(supabaseUrl, supabaseKey) : null;
let currentLanguage = "en";


const services = [
  {
    name: "Web Development",
    desc: "Create modern, responsive, and high-performing websites that convert visitors into customers. We build professional digital experiences designed for growth and success.",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_eow0rdeow0rdeow0.png"
  },
  {
    name: "SEO Optimization",
    desc: "Improve search rankings, increase organic traffic, and drive more qualified leads to your website. Get discovered by customers actively searching for your services.",
    price: "$149",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_x6pd25x6pd25x6pd.png"
  },
  {
    name: "LinkedIn Growth",
    desc: "Transform your LinkedIn presence into a powerful networking and lead-generation machine. Grow your audience, increase engagement, and attract valuable business opportunities.",
    price: "$99",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_otmd3gotmd3gotmd.png"
  },
  {
    name: "Google Optimization",
    desc: "Enhance your visibility across Google Search, Maps, and business listings. Improve local discoverability and attract more customers through optimized online presence.",
    price: "$129",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_544yro544yro544y.png"
  },
  {
    name: "Personal Branding",
    desc: "Build a powerful personal brand that establishes authority, increases visibility, and creates opportunities. We help professionals stand out, grow influence, and become trusted industry leaders.",
    price: "$149",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_gu3yvvgu3yvvgu3y.png"
  },
  {
    name: "Social Media Growth",
    desc: "Expand your reach, engage your audience, and strengthen your online presence. Our growth strategies help businesses build communities and convert followers into customers.",
    price: "$129",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_6790op6790op6790.png"
  },
  {
    name: "Whatsapp Business and API",
    desc: "Turn conversations into conversions with WhatsApp Business solutions. Automate communication, engage customers instantly, and streamline your sales process for faster growth.",
    price: "$99",
    imagePath: "https://wvfqmbwazpjbiutijlqs.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_5ncw9k5ncw9k5ncw.png"
  }
];

// normalize and expose services to other scripts
for (let i = 0; i < services.length; i++) {
  if (!services[i].id) services[i].id = `local-${Date.now()}-${i}`;
  // normalize price to a number
  const raw = String(services[i].price || "0");
  services[i].price = Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

window.services = services;

function getServiceImageUrl(path) {
  if (!path) return "https://via.placeholder.com/600x400?text=Service+Image";
  if (/^https?:\/\//i.test(path)) return path;
  if (!client) return `https://via.placeholder.com/600x400?text=${encodeURIComponent(path)}`;
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  const { data, error } = client.storage.from(storageBucket).getPublicUrl(safePath);
  if (error) {
    console.warn("Supabase storage public URL error:", path, error);
    return "https://via.placeholder.com/600x400?text=Service+Image";
  }
  return data?.publicUrl || "https://via.placeholder.com/600x400?text=Service+Image";
}

function translate(key) {
  if (!window.TRANSLATIONS) return "";
  const parts = key.split(".");
  let value = window.TRANSLATIONS[currentLanguage];
  for (const part of parts) {
    if (value == null) return "";
    value = value[part];
  }
  return value || "";
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "en" ? "ltr" : "rtl";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const translation = translate(el.dataset.i18n);
    if (translation) el.textContent = translation;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const translation = translate(el.dataset.i18nPlaceholder);
    if (translation) el.placeholder = translation;
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.remove("active");
    const langCode = btn.getAttribute("onclick").match(/'([^']+)'/)?.[1];
    if (langCode === currentLanguage) {
      btn.classList.add("active");
    }
  });
}

function setLanguage(lang) {
  currentLanguage = lang;
  applyTranslations();
  renderLandingServices();
}

function getTranslatedService(service) {
  const serviceTranslations = window.SERVICE_TRANSLATIONS?.[service.name] || {};
  const translation = serviceTranslations[currentLanguage] || {};
  return {
    name: translation.name || service.name,
    desc: translation.desc || service.desc
  };
}

function renderLandingServices() {
  const grid = document.getElementById("services-grid");
  if (!grid) return;
  grid.innerHTML = "";
  window.services.forEach(s => {
    const imageUrl = s.img || getServiceImageUrl(s.imagePath);
    const translated = getTranslatedService(s);
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openModal(s);
    card.innerHTML = `
      <img src="${imageUrl}" alt="${translated.name} illustration" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=Service+Image';">
      <h3>${translated.name}</h3>
      <p>${translated.desc}</p>
    `;
    grid.appendChild(card);
  });
}

window.renderLandingServices = renderLandingServices;

window.upsertLocalService = function(service) {
  if (!service) return;
  if (!service.id) {
    service.id = `local-${Date.now()}`;
  }
  const idx = window.services.findIndex(s => s.id === service.id);
  if (idx >= 0) {
    window.services[idx] = Object.assign({}, window.services[idx], service);
  } else {
    window.services.push(service);
  }
  renderLandingServices();
};

window.deleteLocalService = function(id) {
  if (!id) return;
  window.services = window.services.filter(s => s.id !== id);
  renderLandingServices();
};

// SEO: Add structured data for services
function addServiceStructuredData() {
  const serviceData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": window.services.map((service, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Service",
        "name": service.name,
        "description": service.desc,
        "image": service.imagePath,
        "provider": {
          "@type": "Organization",
          "name": "AI Solutions Platform"
        },
        "offers": {
          "@type": "Offer",
          "priceCurrency": "USD",
          "price": service.price || "Contact for pricing"
        }
      }
    }))
  };
  
  // Add or update the structured data script tag
  let scriptTag = document.querySelector('script[type="application/ld+json"][data-services]');
  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.type = 'application/ld+json';
    scriptTag.setAttribute('data-services', 'true');
    document.head.appendChild(scriptTag);
  }
  scriptTag.textContent = JSON.stringify(serviceData);
}

window.addEventListener("load", () => {
  const logo = document.getElementById("site-logo");
  if (logo) {
    const logoPath = logo.dataset.path || "logo.png";
    logo.src = getServiceImageUrl(logoPath);
  }
  
  // Add structured data for services
  addServiceStructuredData();
  
  setLanguage("en");
});

// MODAL
function openModal(service) {
  let serviceText = "";
  if (typeof service === "object") {
    serviceText = getTranslatedService(service).name;
  } else if (service === "Consultation") {
    serviceText = translate("modal.consultation") || service;
  } else {
    serviceText = service;
  }

  const serviceInput = document.getElementById("service");
  const remarksInput = document.getElementById("remarks");
  const modal = document.getElementById("modal");
  
  if (serviceInput) serviceInput.value = serviceText;
  if (remarksInput) remarksInput.value = "";
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}

// Store current booking for success modal
let currentBookingData = null;
let currentWhatsappUrl = null;

function showSuccessModal(bookingData, whatsappUrl) {
  currentBookingData = bookingData;
  currentWhatsappUrl = whatsappUrl;
  
  // Populate success modal fields
  const successName = document.getElementById("success-name");
  const successEmail = document.getElementById("success-email");
  const successPhone = document.getElementById("success-phone");
  const successService = document.getElementById("success-service");
  const successDatetime = document.getElementById("success-datetime");
  const successRemarks = document.getElementById("success-remarks");
  
  if (successName) successName.textContent = bookingData.name || "";
  if (successEmail) successEmail.textContent = bookingData.email || "";
  if (successPhone) successPhone.textContent = bookingData.phone || "N/A";
  if (successService) successService.textContent = bookingData.service || "";
  if (successDatetime) {
    const dateStr = bookingData.bookingDate || "";
    const timeStr = bookingData.bookingTime || "";
    successDatetime.textContent = dateStr && timeStr ? `${dateStr} at ${timeStr}` : (dateStr || timeStr || "N/A");
  }
  if (successRemarks) successRemarks.textContent = bookingData.remarks || "N/A";
  
  // Redirect to WhatsApp immediately without showing modal
  if (whatsappUrl) {
    window.location.href = whatsappUrl;
  }
}

function proceedToWhatsApp() {
  if (currentWhatsappUrl) {
    window.location.href = currentWhatsappUrl;
  }
}

function closeSuccessModal() {
  const successModal = document.getElementById("success-modal");
  if (successModal) successModal.style.display = "none";
  currentBookingData = null;
  currentWhatsappUrl = null;
}

async function submitBooking() {
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const phoneEl = document.getElementById("phone");
  const serviceEl = document.getElementById("service");
  const dateEl = document.getElementById("booking-date");
  const timeEl = document.getElementById("booking-time");
  const remarksEl = document.getElementById("remarks");
  
  if (!nameEl || !emailEl || !serviceEl || !remarksEl) {
    alert("Form elements not found. Please refresh the page.");
    return;
  }
  
  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const phone = phoneEl ? phoneEl.value.trim() : "";
  const service = serviceEl.value.trim();
  const bookingDate = dateEl ? dateEl.value : "";
  const bookingTime = timeEl ? timeEl.value : "";
  const remarks = remarksEl.value.trim();

  if (!name || !email || !service) {
    alert("Please fill name, email, and service");
    return;
  }

  try {
    console.log("Submitting booking with data:", { name, email, service, remarks });

    if (!whatsappNumber || whatsappNumber === "YOUR_WHATSAPP_NUMBER") {
      alert("Please set your WhatsApp number in app.js before sending booking messages.");
      return;
    }

    const whatsappMessage = encodeURIComponent(
      `Hello! I would like to book the ${service} service.\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nPreferred Date: ${bookingDate}\nPreferred Time: ${bookingTime}\nRemarks: ${remarks}`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    if (!client) {
      showSuccessModal({ name, email, phone, service, bookingDate, bookingTime, remarks }, whatsappUrl);
      return;
    }

    const { data, error } = await client
      .from("bookings")
      .insert([
        {
          name,
          email,
          phone: phone || null,
          service,
          booking_date: bookingDate || null,
          booking_time: bookingTime || null,
          remarks: remarks || null,
          status: "pending",
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error("Supabase error:", error);
      console.error("Error message:", error.message);
      console.error("Error details:", error);
      alert(`Error: ${error.message || "Failed to submit booking"}`);
      return;
    }

    console.log("Booking submitted successfully:", data);
    showSuccessModal({ name, email, phone, service, bookingDate, bookingTime, remarks }, whatsappUrl);
    
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const serviceInput = document.getElementById("service");
    const dateInput = document.getElementById("booking-date");
    const timeInput = document.getElementById("booking-time");
    const remarksInput = document.getElementById("remarks");
    
    if (nameInput) nameInput.value = "";
    if (emailInput) emailInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (serviceInput) serviceInput.value = "";
    if (dateInput) dateInput.value = "";
    if (timeInput) timeInput.value = "";
    if (remarksInput) remarksInput.value = "";
    
    closeModal();
  } catch (err) {
    console.error("Error:", err);
    console.error("Error message:", err.message);
    alert("Error submitting booking: " + (err.message || "Unknown error"));
  }
}