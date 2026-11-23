import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg = window.EVENTS_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.includes("COLLE_") && !cfg.SUPABASE_ANON_KEY.includes("COLLE_");
const supabase = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const views = ["home-view","login-view","reset-password-view","dashboard-view","event-admin-view","public-view"];
let currentEvent = null;
let currentRsvps = [];

function showView(id) {
  views.forEach(v => $(v).classList.toggle("hidden", v !== id));
}
function feedback(id, message, error=false) {
  const el = $(id); if (!el) return;
  el.textContent = message; el.classList.toggle("error", error);
}
function requireConfig() {
  if (!configured) {
    alert("Il manque la configuration Supabase. Ouvrez config.js et ajoutez l'URL ainsi que la clé publique de votre projet.");
    return false;
  }
  return true;
}
function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70) || "evenement";
}
function dateLabel(s) {
  if (!s) return "Date à préciser";
  const d = new Date(`${s}T12:00:00`);
  return isNaN(d) ? s : new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(d);
}
function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function publicUrl(slug) {
  return `${location.origin}${location.pathname}?event=${encodeURIComponent(slug)}`;
}
function applyTheme(theme) {
  const card = document.querySelector(".invitation-card");
  if (!card) return;
  const palettes = {
    "blue-gold":["#edf7fd","#fffdf7","#e8dfc8"],
    "navy-gold":["#e9eef6","#fff","#c9b47b"],
    "pink-gold":["#fff0f5","#fff","#ead6c5"],
    "classic":["#f3f5f7","#fff","#d8dee5"]
  };
  const p = palettes[theme] || palettes["blue-gold"];
  card.style.background = `linear-gradient(145deg,${p[0]},${p[1]} 55%,#fffdf7)`;
  card.style.borderColor = p[2];
}
async function init() {
  const slug = new URLSearchParams(location.search).get("event");
  if (slug) await loadPublicEvent(slug);
  else showView("home-view");
  // Fallback visuel : un lien de récupération Supabase contient type=recovery dans le fragment.
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (hashParams.get("type") === "recovery") {
    showView("reset-password-view");
    feedback("reset-feedback", "Choisissez votre nouveau mot de passe.");
  }
}
async function loadPublicEvent(slug) {
  if (!requireConfig()) { showView("home-view"); return; }
  const {data,error} = await supabase.from("events").select("id,title,slug,event_date,event_time,location_label,description,theme,published").eq("slug",slug).eq("published",true).maybeSingle();
  if (error || !data) { showView("public-view"); $("public-title").textContent="Invitation indisponible"; $("public-description").textContent="Cet événement n'est pas disponible ou le lien est incorrect."; $("rsvp-form").classList.add("hidden"); return; }
  currentEvent = data;
  $("public-title").textContent = data.title;
  $("public-description").textContent = data.description || "";
  $("public-date").textContent = dateLabel(data.event_date);
  $("public-time").textContent = data.event_time || "À préciser";
  $("public-location").textContent = data.location_label || "Communiqué aux invités";
  applyTheme(data.theme);
  showView("public-view");
}
$("rsvp-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireConfig() || !currentEvent) return;
  const f = new FormData(e.currentTarget);
  const status = f.get("status");
  const payload = {
    event_id: currentEvent.id,
    full_name: String(f.get("full_name")).trim(),
    status,
    party_size: status === "absent" ? 0 : Number(f.get("party_size")),
    note: String(f.get("note") || "").trim()
  };
  if (!payload.full_name || !Number.isInteger(payload.party_size) || payload.party_size < 0 || payload.party_size > 20) {
    feedback("rsvp-feedback","Vérifiez le nom et le nombre de personnes.",true); return;
  }
  const btn = e.currentTarget.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Envoi…";
  const {error} = await supabase.from("rsvps").insert(payload);
  btn.disabled = false; btn.textContent = "Envoyer ma réponse";
  if (error) feedback("rsvp-feedback","Impossible d'envoyer la réponse. Réessayez ou contactez l'organisateur.",true);
  else { e.currentTarget.reset(); feedback("rsvp-feedback","Merci ! Votre réponse a bien été envoyée."); }
});

function openLogin() {
  showView("login-view");
  if (!configured) feedback("login-feedback","Configurez d'abord config.js avec les informations Supabase.",true);
}
$("admin-open").addEventListener("click",openLogin);
$("home-admin").addEventListener("click",openLogin);
$("back-home").addEventListener("click",()=>showView("home-view"));
$("login-form").addEventListener("submit",async e=>{
  e.preventDefault(); if (!requireConfig()) return;
  const f=new FormData(e.currentTarget);
  const {error}=await supabase.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
  if(error){feedback("login-feedback","Connexion impossible. Vérifiez l'adresse e-mail et le mot de passe.",true);return;}
  e.currentTarget.reset(); await loadDashboard();
});
// Supabase signale explicitement l'ouverture d'un lien de récupération.
supabase?.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    showView("reset-password-view");
    feedback("reset-feedback", "Choisissez votre nouveau mot de passe.");
  }
});

$("forgot-password").addEventListener("click", async () => {
  if (!requireConfig()) return;
  const email = $("login-form").elements.email.value.trim();
  if (!email) {
    feedback("login-feedback", "Saisissez d'abord votre adresse e-mail, puis cliquez sur « Mot de passe oublié ? ».", true);
    return;
  }
  const redirectTo = `${location.origin}${location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) feedback("login-feedback", "Impossible d'envoyer le lien : " + error.message, true);
  else feedback("login-feedback", "Un lien de réinitialisation vient d'être envoyé. Consultez votre boîte mail.");
});

$("reset-password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireConfig()) return;
  const password = e.currentTarget.elements.password.value;
  const confirmation = e.currentTarget.elements.confirm_password.value;
  if (password.length < 6) {
    feedback("reset-feedback", "Le mot de passe doit contenir au moins 6 caractères.", true);
    return;
  }
  if (password !== confirmation) {
    feedback("reset-feedback", "Les deux mots de passe ne correspondent pas.", true);
    return;
  }
  const button = e.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Enregistrement…";
  const { error } = await supabase.auth.updateUser({ password });
  button.disabled = false;
  button.textContent = "Enregistrer le nouveau mot de passe";
  if (error) {
    feedback("reset-feedback", "Le changement a échoué : " + error.message + ". Demandez un nouveau lien si celui-ci a expiré.", true);
    return;
  }
  await supabase.auth.signOut();
  history.replaceState({}, document.title, location.pathname);
  e.currentTarget.reset();
  showView("login-view");
  feedback("login-feedback", "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.");
});
$("logout").addEventListener("click",async()=>{await supabase.auth.signOut();showView("home-view");});

async function loadDashboard() {
  if (!requireConfig()) return;
  const {data:events,error}=await supabase.from("events").select("*").order("created_at",{ascending:false});
  if(error){feedback("dashboard-feedback","Erreur de chargement : "+error.message,true);showView("dashboard-view");return;}
  const {data:rsvps}=await supabase.from("rsvps").select("id,event_id,status,party_size");
  const replies=rsvps||[];
  $("stat-events").textContent=events.length;
  $("stat-replies").textContent=replies.length;
  $("stat-people").textContent=replies.filter(r=>r.status==="present").reduce((n,r)=>n+Number(r.party_size||0),0);
  $("stat-absent").textContent=replies.filter(r=>r.status==="absent").length;
  const list=$("events-list");
  if(!events.length) list.innerHTML='<div class="event-card"><h3>Aucun événement pour le moment</h3><p>Créez votre premier événement avec le bouton ci-dessus.</p></div>';
  else list.innerHTML=events.map(ev=>{
    const count=replies.filter(r=>r.event_id===ev.id).length;
    return `<article class="event-card"><h3>${escapeHtml(ev.title)}</h3><p>${escapeHtml(dateLabel(ev.event_date))} · ${count} réponse(s)</p><p>${ev.published?'<span class="pill">Invitation publiée</span>':'<span class="pill absent">Invitation masquée</span>'}</p><button class="button button-primary" data-open-event="${ev.id}">Gérer cet événement</button></article>`;
  }).join("");
  list.querySelectorAll("[data-open-event]").forEach(b=>b.addEventListener("click",()=>openEvent(b.dataset.openEvent)));
  showView("dashboard-view");
}

$("new-event").addEventListener("click",()=>openEventDialog());
function openEventDialog(event=null) {
  const form=$("event-form"); form.reset();
  form.elements.id.value=event?.id||"";
  form.elements.title.value=event?.title||"";
  form.elements.event_date.value=event?.event_date||"";
  form.elements.event_time.value=event?.event_time||"";
  form.elements.location_label.value=event?.location_label||"";
  form.elements.description.value=event?.description||"";
  form.elements.theme.value=event?.theme||"blue-gold";
  form.elements.published.checked=event ? !!event.published : true;
  $("event-dialog-title").textContent=event?"Modifier l'événement":"Nouvel événement";
  feedback("event-form-feedback","");
  $("event-dialog").showModal();
}
$("close-event-dialog").addEventListener("click",()=>$("event-dialog").close());
$("event-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=e.currentTarget.elements;
  const title=f.title.value.trim();
  const payload={title,slug:slugify(title),event_date:f.event_date.value||null,event_time:f.event_time.value.trim(),location_label:f.location_label.value.trim(),description:f.description.value.trim(),theme:f.theme.value,published:f.published.checked};
  const id=f.id.value;
  const query=id?supabase.from("events").update(payload).eq("id",id):supabase.from("events").insert(payload);
  const {error}=await query;
  if(error){feedback("event-form-feedback","Enregistrement impossible : "+error.message,true);return;}
  $("event-dialog").close(); await loadDashboard();
});

async function openEvent(id) {
  const {data,error}=await supabase.from("events").select("*").eq("id",id).single();
  if(error){alert("Impossible d'ouvrir cet événement.");return;}
  currentEvent=data;
  $("manage-title").textContent=data.title;
  $("manage-meta").textContent=`${dateLabel(data.event_date)} · ${data.event_time||"Horaire à préciser"}`;
  $("share-url").textContent=publicUrl(data.slug);
  const {data:rsvps,error:rerr}=await supabase.from("rsvps").select("*").eq("event_id",id).order("created_at",{ascending:false});
  if(rerr){feedback("rsvp-admin-feedback","Erreur de chargement des réponses : "+rerr.message,true);return;}
  currentRsvps=rsvps||[];
  renderRsvps(); showView("event-admin-view");
}
function renderRsvps() {
  const present=currentRsvps.filter(r=>r.status==="present");
  const absent=currentRsvps.filter(r=>r.status==="absent");
  $("event-replies").textContent=currentRsvps.length;
  $("event-present").textContent=present.length;
  $("event-guests").textContent=present.reduce((n,r)=>n+Number(r.party_size||0),0);
  $("event-absent").textContent=absent.length;
  const tbody=$("rsvp-table");
  if(!currentRsvps.length){tbody.innerHTML='<tr><td colspan="5">Aucune réponse pour le moment.</td></tr>';return;}
  tbody.innerHTML=currentRsvps.map(r=>`<tr><td><strong>${escapeHtml(r.full_name)}</strong></td><td><span class="pill ${r.status==="absent"?"absent":""}">${r.status==="present"?"Présent(e)":"Absent(e)"}</span></td><td>${r.party_size}</td><td>${escapeHtml(r.note||"—")}</td><td><div class="inline-actions"><button class="button button-outline" data-edit-rsvp="${r.id}">Modifier</button><button class="button button-danger" data-delete-rsvp="${r.id}">Supprimer</button></div></td></tr>`).join("");
  tbody.querySelectorAll("[data-edit-rsvp]").forEach(b=>b.addEventListener("click",()=>openRsvpDialog(b.dataset.editRsvp)));
  tbody.querySelectorAll("[data-delete-rsvp]").forEach(b=>b.addEventListener("click",()=>deleteRsvp(b.dataset.deleteRsvp)));
}
$("copy-link").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(publicUrl(currentEvent.slug));$("copy-link").textContent="Lien copié !";setTimeout(()=>$("copy-link").textContent="Copier le lien",1800);}
  catch{feedback("rsvp-admin-feedback","Copiez le lien affiché manuellement.");}
});
$("back-dashboard").addEventListener("click",loadDashboard);
$("edit-event").addEventListener("click",()=>openEventDialog(currentEvent));
$("delete-event").addEventListener("click",async()=>{
  if(!confirm("Supprimer cet événement et toutes ses réponses ? Cette action est définitive."))return;
  const {error}=await supabase.from("events").delete().eq("id",currentEvent.id);
  if(error){feedback("rsvp-admin-feedback","Suppression impossible : "+error.message,true);return;}
  currentEvent=null; await loadDashboard();
});
function openRsvpDialog(id) {
  const r=currentRsvps.find(x=>x.id===id); if(!r)return;
  const f=$("rsvp-edit-form").elements;
  f.id.value=r.id;f.full_name.value=r.full_name;f.status.value=r.status;f.party_size.value=r.party_size;f.note.value=r.note||"";
  feedback("rsvp-edit-feedback","");$("rsvp-dialog").showModal();
}
$("close-rsvp-dialog").addEventListener("click",()=>$("rsvp-dialog").close());
$("rsvp-edit-form").addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget.elements;const status=f.status.value;
  const payload={full_name:f.full_name.value.trim(),status,party_size:status==="absent"?0:Number(f.party_size.value),note:f.note.value.trim(),updated_at:new Date().toISOString()};
  const {error}=await supabase.from("rsvps").update(payload).eq("id",f.id.value);
  if(error){feedback("rsvp-edit-feedback","Modification impossible : "+error.message,true);return;}
  $("rsvp-dialog").close();await openEvent(currentEvent.id);
});
async function deleteRsvp(id) {
  const r=currentRsvps.find(x=>x.id===id);
  if(!confirm(`Supprimer la réponse de ${r?.full_name||"cet invité"} ?`))return;
  const {error}=await supabase.from("rsvps").delete().eq("id",id);
  if(error){feedback("rsvp-admin-feedback","Suppression impossible : "+error.message,true);return;}
  await openEvent(currentEvent.id);
}

init();
