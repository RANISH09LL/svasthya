import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { DUMMY_POSTS, SYMPTOM_REPORTS } from "./dummyPosts.js";
import { parseHealthMetrics, hasHealthMetrics } from "./utils/metricParser.js";
import { simplifyMedicalText, READING_LEVELS, factCheckHealthClaim, scrubPII, generateCaseStudy, transcribeAudio, extractSymptomsFromTranscript, chatWithAvatar } from "./utils/groq.js";

/* ════════════════════════════════════════════════════════════════
   GLOBAL CSS
════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}

:root{
  --bg:#f8fafc;
  --surface:#ffffff;
  --surface2:#f1f5f9;
  --border:#e2e8f0;
  --border2:#cbd5e1;
  --teal:#3b82f6; /* Changing primary color to a premium tech blue */
  --teal2:#2563eb;
  --teal-bg:rgba(59,130,246,0.08);
  --teal-bg2:rgba(59,130,246,0.14);
  --blue:#6366f1;
  --coral:#ef4444;
  --gold:#f59e0b;
  --text:#0f172a;
  --text2:#475569;
  --text3:#94a3b8;
  --font-d:'Outfit',sans-serif; /* Moving away from serif to a modern geometric sans */
  --font-b:'Inter',sans-serif;
  --r:16px;
  --r2:24px;
  --r3:32px;
  --shadow:0 4px 20px rgba(0,0,0,0.03),0 1px 3px rgba(0,0,0,0.02);
  --shadow2:0 10px 40px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.03);
  --shadow3:0 30px 80px rgba(0,0,0,0.1),0 10px 30px rgba(0,0,0,0.04);
  --bg-blur:rgba(255,255,255,0.8);
  --tip-card-bg:rgba(255,255,255,0.8);
  --disclaimer-text:#c2410c;
}

html,body{height:100%;width:100%;margin:0;padding:0;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
#root{height:100%;width:100%}

::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:6px}

@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes heartPop{0%{transform:scale(1)}40%{transform:scale(1.4)}70%{transform:scale(0.85)}100%{transform:scale(1)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes notifBounce{0%{transform:scale(0) rotate(-15deg)}60%{transform:scale(1.3) rotate(5deg)}100%{transform:scale(1) rotate(0)}}

.fu{animation:fadeUp .6s cubic-bezier(0.16, 1, 0.3, 1) both}
.fi{animation:fadeIn .4s ease both}
.si{animation:scaleIn .5s cubic-bezier(0.16, 1, 0.3, 1) both}
.sl{animation:slideLeft .5s cubic-bezier(0.16, 1, 0.3, 1) both}
.s1{animation-delay:.05s}.s2{animation-delay:.10s}.s3{animation-delay:.15s}
.s4{animation-delay:.20s}.s5{animation-delay:.25s}.s6{animation-delay:.30s}

/* ── Layout shells ── */
.app-shell{display:flex;height:100vh;overflow:hidden}
.left-rail{width:280px;flex-shrink:0;border-right:1px solid var(--border);background:var(--surface);display:flex;flex-direction:column;overflow-y:auto;z-index:10;padding-top:10px}
.center-col{flex:1;overflow-y:auto;min-width:0}
.right-rail{width:320px;flex-shrink:0;border-left:1px solid var(--border);background:var(--surface);overflow-y:auto;overflow-x:hidden;padding:24px 20px}

/* ── Nav items ── */
.nav-item{display:flex;align-items:center;gap:14px;padding:12px 18px;border-radius:14px;font-size:15px;font-weight:600;color:var(--text2);cursor:pointer;border:none;background:transparent;width:100%;text-align:left;transition:all .25s ease;position:relative;}
.nav-item:hover{background:var(--surface2);color:var(--text);transform:translateX(4px)}
.nav-item.active{background:var(--teal-bg2);color:var(--teal);font-weight:700}
.nav-item.active .ni-dot{display:block}
.ni-dot{display:none;position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:4px;height:24px;background:var(--teal);border-radius:0 4px 4px 0}

/* ── Post cards ── */
.post-card{background:var(--surface);border:1px solid var(--border);border-radius:28px;padding:24px;transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);position:relative;overflow:hidden;box-shadow:var(--shadow)}
.post-card:hover{border-color:rgba(59,130,246,0.3);box-shadow:var(--shadow2);transform:translateY(-2px)}

/* ── Action buttons ── */
.action-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:50px;border:none;background:transparent;cursor:pointer;font-size:13px;font-weight:600;color:var(--text3);transition:all .2s;position:relative;overflow:hidden}
.action-btn:hover{background:var(--surface2);color:var(--text)}
.action-btn.liked{color:var(--coral);background:rgba(239,68,68,0.1)}
.action-btn.liked svg{fill:var(--coral)}
.action-btn.saved{color:var(--gold);background:rgba(245,158,11,0.1)}

/* ── Primary button ── */
.btn-p{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;border:none;cursor:pointer;font-weight:600;font-size:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);border-radius:50px;padding:12px 24px;box-shadow:0 10px 20px rgba(59,130,246,0.2)}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(59,130,246,0.3)}
.btn-p:active{transform:translateY(0);box-shadow:0 4px 10px rgba(59,130,246,0.2)}
.btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}

/* ── Ghost button ── */
.btn-g{background:var(--surface);border:1px solid var(--border2);color:var(--text2);cursor:pointer;font-weight:600;font-size:13.5px;display:inline-flex;align-items:center;gap:8px;border-radius:50px;transition:all .2s;padding:10px 20px;box-shadow:0 2px 4px rgba(0,0,0,0.02)}
.btn-g:hover{border-color:var(--border);color:var(--text);background:var(--surface2);box-shadow:0 4px 12px rgba(0,0,0,0.05)}

/* ── Input ── */
.inp{width:100%;background:var(--surface2);border:1px solid transparent;color:var(--text);font-size:15px;outline:none;transition:all .25s ease;border-radius:16px;padding:14px 18px}
.inp::placeholder{color:var(--text3)}
.inp:focus{border-color:var(--teal);background:var(--surface);box-shadow:0 0 0 4px rgba(59,130,246,0.1)}

/* ── Badge ── */
.badge-doc{display:inline-flex;align-items:center;gap:6px;background:var(--teal-bg2);border:1px solid transparent;color:var(--teal2);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.badge-pat{display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,.1);border:1px solid transparent;color:#d97706;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}

/* ── Tag ── */
.tag{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.tag-t{background:var(--surface2);color:var(--teal2);border:1px solid transparent}
.tag-t:hover{background:var(--teal-bg2);color:var(--teal2)}
.tag-b{background:var(--surface2);color:#1558b0;border:1px solid transparent}
.tag-b:hover{background:rgba(26,115,232,.1)}
.tag-c{background:var(--surface2);color:#c03030;border:1px solid transparent}
.tag-g{background:var(--surface2);color:var(--text2);border:1px solid transparent}

/* ── Modal ── */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:300;padding:20px;animation:fadeIn .3s ease}
.modal-box{background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:32px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow3);animation:scaleIn .4s cubic-bezier(0.16, 1, 0.3, 1)}

/* ── Composer ── */
.composer{background:rgba(255,255,255,0.7);backdrop-filter:blur(20px);border:1px solid var(--border);padding:24px;position:sticky;top:0;z-index:20;border-top:none;border-radius:0 0 32px 32px;box-shadow:0 10px 30px rgba(0,0,0,0.02)}

/* ── Trend card ── */
.trend-card{padding:16px;border-radius:20px;background:var(--surface);border:1px solid var(--border);transition:all .25s ease;cursor:pointer;box-shadow:var(--shadow)}
.trend-card:hover{border-color:rgba(59,130,246,0.3);box-shadow:var(--shadow2);transform:translateY(-2px)}

/* ── Profile header ── */
.profile-cover{height:180px;background:linear-gradient(135deg,var(--teal) 0%,#8b5cf6 100%);position:relative;overflow:hidden}
.profile-cover::after{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}

/* ── Skeleton ── */
.skeleton{background:linear-gradient(90deg,var(--surface2) 0%,var(--border) 50%,var(--surface2) 100%);background-size:400px 100%;animation:shimmer 1.5s infinite;border-radius:8px}

/* ── Search page ── */
.hashtag-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;border:1px solid transparent;background:var(--surface2);transition:all .25s ease;color:var(--text2)}
.hashtag-pill:hover{background:var(--surface);border-color:var(--border);color:var(--text);box-shadow:var(--shadow)}
.hashtag-pill.active{background:var(--text);color:var(--surface);box-shadow:0 8px 24px rgba(0,0,0,0.15)}

/* ── Login ── */
.login-wrap{min-height:100vh;width:100%;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 50%,#e2e8f0 100%);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:20px;box-sizing:border-box}
.login-card{background:rgba(255,255,255,0.9);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.5);border-radius:32px;padding:50px 48px;width:100%;max-width:480px;box-shadow:var(--shadow3);position:relative;z-index:1;box-sizing:border-box}

/* ── Composer textarea ── */
.compose-area{border:none;outline:none;resize:none;background:transparent;font-size:16px;color:var(--text);width:100%;line-height:1.7}
.compose-area::placeholder{color:var(--text3)}

/* ── Responsive ── */
@media(max-width:900px){.right-rail{display:none}}
@media(max-width:680px){
  .left-rail{display:none !important}
  .app-shell{flex-direction:column}
  .center-col{padding-bottom:72px}
  
  /* ── Mobile Bottom Nav ── */
  .mobile-bottom-nav{display:flex !important;position:fixed;bottom:0;left:0;right:0;height:64px;background:var(--surface);border-top:1px solid var(--border);z-index:200;align-items:stretch;justify-content:space-around;padding:0 4px;box-shadow:0 -4px 20px rgba(0,0,0,0.06)}
  .mobile-nav-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex:1;border:none;background:transparent;cursor:pointer;color:var(--text3);font-size:10px;font-weight:600;padding:6px 2px;position:relative;transition:color .2s}
  .mobile-nav-btn.active{color:var(--teal)}
  .mobile-nav-btn.active::before{content:'';position:absolute;top:0;left:25%;right:25%;height:3px;background:var(--teal);border-radius:0 0 4px 4px}
  .mobile-nav-btn svg{width:20px;height:20px}
  
  /* ── Mobile Menu Overlay ── */
  .mobile-menu-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(6px);z-index:250;animation:fadeIn .2s ease}
  .mobile-menu-drawer{position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-radius:24px 24px 0 0;z-index:260;padding:16px 16px 32px;max-height:75vh;overflow-y:auto;animation:slideUp .35s cubic-bezier(0.16,1,0.3,1);box-shadow:0 -10px 40px rgba(0,0,0,0.15)}
  .mobile-menu-handle{width:40px;height:4px;background:var(--border2);border-radius:4px;margin:0 auto 16px}
  .mobile-menu-drawer .nav-item{border-radius:14px;margin-bottom:2px}
  .mobile-menu-drawer .nav-item span{display:inline !important}
  
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  
  /* ── Cards & Post ── */
  .post-card{border-radius:18px;padding:16px;margin-bottom:8px !important}
  .composer{border-radius:0 0 18px 18px;padding:16px}
  .ai-card{padding:18px 16px;border-radius:18px}
  
  /* ── Modal ── */
  .overlay{padding:10px;align-items:flex-end}
  .modal-box{border-radius:24px 24px 8px 8px;max-height:85vh}
  
  /* ── Login ── */
  .login-card{padding:32px 24px;border-radius:24px;max-width:100%}
  
  /* ── AI Page ── */
  .ai-page{padding:0 12px 80px}
  
  /* ── Profile ── */
  .profile-cover{height:130px}
  
  /* ── Forms ── */
  .edit-profile-form{padding:20px 18px}
  .slot-btn{padding:12px 16px;border-radius:14px}
  
  /* ── Dashboard ── */
  .dash-table{font-size:12px}
  .dash-table th,.dash-table td{padding:10px 10px}
  
  /* ── Symptom input ── */
  .symptom-input-row{flex-direction:column;gap:8px}
  .symptom-input-row .btn-p{width:100%}
  
  /* ── Account cards ── */
  .account-row{flex-direction:column;gap:8px}
  .account-row-icon{width:32px;height:32px;border-radius:8px}
  
  /* ── Doc banner ── */
  .doc-banner{padding:12px 14px;border-radius:16px;gap:10px}
  
  /* ── Trend card ── */
  .trend-card{padding:12px;border-radius:14px}
  
  /* ── Hide desktop-only ── */
  .nav-logo-text{display:none}
}

/* ── Tablet tweaks ── */
@media(min-width:681px) and (max-width:900px){
  .left-rail{width:80px}
  .nav-item span{display:none}
  .nav-logo-text{display:none}
}

/* ── Hide mobile nav on desktop ── */
.mobile-bottom-nav{display:none}
@media(max-width:680px){
  .mobile-bottom-nav{display:flex !important}
}

/* ── Doctor only banner ── */
.doc-banner{background:linear-gradient(135deg,rgba(59,130,246,0.06),rgba(99,102,241,0.04));border:1px solid rgba(59,130,246,0.15);border-radius:24px;padding:18px 24px;display:flex;align-items:center;gap:16px}

/* ── Notification dot ── */
.notif{width:10px;height:10px;background:var(--coral);border-radius:50%;border:2px solid var(--surface);position:absolute;top:6px;right:6px;animation:notifBounce .5s cubic-bezier(0.16, 1, 0.3, 1);box-shadow:0 2px 6px rgba(239,68,68,0.4)}

/* ── Comment thread ── */
.thread-line{position:absolute;left:21px;top:48px;bottom:-10px;width:2px;background:var(--border)}
.comment-item{position:relative;padding-left:48px;margin-bottom:20px}

/* ── AI Feature Cards ── */
@keyframes progressFill{from{width:0}to{width:var(--pw,0%)}}
@keyframes pulseGlow{0%,100%{opacity:1;box-shadow:0 0 10px rgba(99,102,241,0.4)}50%{opacity:.6;box-shadow:0 0 20px rgba(99,102,241,0.6)}}

.ai-page{max-width:700px;margin:0 auto;padding:0 20px 80px}
.ai-page-header{position:sticky;top:0;z-index:19;background:rgba(248,250,252,0.85);backdrop-filter:blur(20px);padding:24px 0 16px;border-bottom:1px solid var(--border);margin-bottom:24px}

.ai-card{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:28px 32px;margin-bottom:16px;transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);position:relative;overflow:hidden;box-shadow:var(--shadow)}
.ai-card:hover{border-color:rgba(59,130,246,0.2);box-shadow:var(--shadow2);transform:translateY(-2px)}
.ai-card::before{content:'';position:absolute;top:0;left:0;width:6px;height:100%;border-radius:6px 0 0 6px}
.ai-card.accent-teal::before{background:linear-gradient(180deg,var(--teal),var(--teal2))}
.ai-card.accent-blue::before{background:linear-gradient(180deg,var(--blue),#4f46e5)}
.ai-card.accent-coral::before{background:linear-gradient(180deg,var(--coral),#dc2626)}
.ai-card.accent-gold::before{background:linear-gradient(180deg,var(--gold),#d97706)}
.ai-card.accent-purple::before{background:linear-gradient(180deg,#8b5cf6,#7c3aed)}

.symptom-chips{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.symptom-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:50px;font-size:14px;font-weight:600;background:var(--surface2);color:var(--text);border:1px solid transparent;animation:scaleIn .3s cubic-bezier(0.16, 1, 0.3, 1);transition:all .2s}
.symptom-chip:hover{background:var(--teal-bg2);color:var(--teal)}
.symptom-chip button{background:none;border:none;cursor:pointer;color:inherit;display:flex;align-items:center;padding:0;opacity:.5;transition:opacity .2s}
.symptom-chip button:hover{opacity:1}

.symptom-input-row{display:flex;gap:12px;align-items:center}
.symptom-input-row .inp{flex:1;border-radius:50px;padding:14px 24px;font-size:15px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow)}
.symptom-input-row .inp:focus{border-color:var(--teal);box-shadow:0 0 0 4px rgba(59,130,246,0.1)}

.progress-bar{height:12px;background:var(--surface2);border-radius:8px;overflow:hidden;position:relative}
.progress-fill{height:100%;border-radius:8px;animation:progressFill 1s cubic-bezier(0.16, 1, 0.3, 1) both;transition:width .5s}

.region-row{padding:16px 20px;border-radius:16px;transition:all .25s ease;cursor:default;border:1px solid transparent;background:var(--surface)}
.region-row:hover{background:var(--surface2);border-color:var(--border);transform:translateX(4px);box-shadow:var(--shadow)}

.pulse-dot{width:12px;height:12px;border-radius:50%;background:var(--blue);animation:pulseGlow 2s ease-in-out infinite;flex-shrink:0}

.alert-banner{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:16px;font-size:14px;font-weight:600;animation:scaleIn .4s cubic-bezier(0.16, 1, 0.3, 1);margin-bottom:16px}
.alert-banner.danger{background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.2);color:#b91c1c}
.alert-banner.safe{background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.2);color:#15803d}

.ai-result-box{background:var(--surface);border:1px solid var(--border);border-radius:28px;padding:32px;animation:fadeUp .5s cubic-bezier(0.16, 1, 0.3, 1);box-shadow:var(--shadow2)}

.misinfo-col{flex:1;min-width:0;padding:24px;border-radius:24px;border:1px solid transparent;background:var(--surface2)}
.misinfo-col.bad{background:rgba(239,68,68,.03);border-color:rgba(239,68,68,.15)}
.misinfo-col.good{background:rgba(34,197,94,.03);border-color:rgba(34,197,94,.15)}
.misinfo-col.case{background:rgba(59,130,246,.03);border-color:rgba(59,130,246,.15)}

.duration-btn{padding:8px 18px;border-radius:50px;border:1px solid transparent;background:var(--surface2);cursor:pointer;font-size:13px;font-weight:600;color:var(--text2);transition:all .25s ease}
.duration-btn:hover{background:var(--surface);border-color:var(--border);color:var(--text);box-shadow:var(--shadow)}
.duration-btn.active{background:var(--text);color:var(--surface);box-shadow:0 8px 24px rgba(0,0,0,0.15)}

.ai-loading{display:flex;flex-direction:column;align-items:center;gap:16px;padding:60px 0}
.ai-loading-bar{width:240px;height:6px;background:var(--surface2);border-radius:6px;overflow:hidden;position:relative}
.ai-loading-bar::after{content:'';position:absolute;top:0;left:-50%;width:50%;height:100%;background:linear-gradient(90deg,transparent,var(--teal),transparent);animation:shimmer 1.2s infinite}

/* ── Appointment Modal ── */
@keyframes checkPop{0%{transform:scale(0) rotate(-45deg);opacity:0}50%{transform:scale(1.2) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}

.slot-btn{width:100%;padding:16px 24px;border-radius:20px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:15px;font-weight:600;color:var(--text);transition:all .25s ease;display:flex;align-items:center;justify-content:space-between;box-shadow:var(--shadow)}
.slot-btn:hover{border-color:var(--teal);background:var(--surface);color:var(--teal);transform:translateX(6px);box-shadow:var(--shadow2)}
.slot-btn.booked{border-color:transparent;background:var(--surface2);color:var(--text3);pointer-events:none;box-shadow:none}

.confirm-check{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#34d399,#059669);display:flex;align-items:center;justify-content:center;animation:checkPop .6s cubic-bezier(0.16, 1, 0.3, 1);box-shadow:0 16px 40px rgba(16,185,129,0.3)}

/* ── Dashboard table ── */
.dash-table{width:100%;border-collapse:separate;border-spacing:0 8px}
.dash-table th{text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);padding:10px 18px}
.dash-table td{padding:16px 18px;font-size:14px;color:var(--text);background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border);transition:all .2s ease}
.dash-table td:first-child{border-left:1px solid var(--border);border-radius:16px 0 0 16px}
.dash-table td:last-child{border-right:1px solid var(--border);border-radius:0 16px 16px 0}
.dash-table tr:hover td{background:var(--surface2);border-color:var(--border2)}

.triage-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.triage-high{background:rgba(239,68,68,.08);color:#b91c1c;border:1px solid transparent}
.triage-medium{background:rgba(245,158,11,.08);color:#b45309;border:1px solid transparent}
.triage-low{background:rgba(34,197,94,.08);color:#15803d;border:1px solid transparent}

/* ── Chart bars ── */
.chart-bar-h{height:32px;border-radius:8px;transition:width 1s cubic-bezier(0.16, 1, 0.3, 1);position:relative;display:flex;align-items:center;padding-left:12px;font-size:12px;font-weight:700;color:#fff;min-width:36px}

/* ── Profile Photo Upload ── */
.profile-pic-upload{position:relative;cursor:pointer;display:inline-block}
.profile-pic-upload:hover .pic-overlay{opacity:1;backdrop-filter:blur(4px)}
.pic-overlay{position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;opacity:0;transition:all .3s ease;color:#fff}
.profile-pic-img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:4px solid var(--surface);box-shadow:var(--shadow2)}

/* ── Edit Profile Modal ── */
.edit-profile-form{display:flex;flex-direction:column;gap:24px;padding:32px 36px}
.edit-profile-form label{font-size:12.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:8px}
.edit-profile-form .inp{width:100%}
.edit-photo-area{display:flex;align-items:center;gap:24px}
.photo-preview{width:96px;height:96px;border-radius:50%;position:relative;overflow:hidden;flex-shrink:0;border:4px solid var(--surface2);box-shadow:var(--shadow)}
.photo-preview img{width:100%;height:100%;object-fit:cover}
.photo-preview .initials-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--text);font-size:32px;background:var(--surface2)}
.photo-actions{display:flex;flex-direction:column;gap:10px}

/* ── Account Details Card ── */
.account-card{background:var(--surface);border:1px solid var(--border);border-radius:24px;overflow:hidden;margin-bottom:20px;box-shadow:var(--shadow)}
.account-card-header{padding:18px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--surface2)}
.account-card-header h3{font-size:15px;font-weight:700;color:var(--text)}
.account-row{display:flex;align-items:flex-start;gap:16px;padding:18px 24px;border-bottom:1px solid var(--border);transition:background .2s ease}
.account-row:last-child{border-bottom:none}
.account-row:hover{background:var(--surface2)}
.account-row-icon{width:40px;height:40px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.02)}
.account-row-content{flex:1;min-width:0}
.account-row-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:4px}
.account-row-value{font-size:15px;font-weight:500;color:var(--text);word-break:break-all}

/* ── Dark Mode (Completely Overhauled to deeper elegant tech blues/blacks) ── */
.dark{
  --bg:#020617; /* Slate 950 */
  --surface:#0f172a; /* Slate 900 */
  --surface2:#1e293b; /* Slate 800 */
  --border:#334155; /* Slate 700 */
  --border2:#475569; /* Slate 600 */
  --teal:#3b82f6;
  --teal2:#60a5fa;
  --teal-bg:rgba(59,130,246,0.1);
  --teal-bg2:rgba(59,130,246,0.15);
  --blue:#818cf8;
  --coral:#f87171;
  --gold:#fbbf24;
  --text:#f8fafc;
  --text2:#94a3b8;
  --text3:#64748b;
  --shadow:0 10px 30px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.3);
  --shadow2:0 20px 50px rgba(0,0,0,0.6),0 8px 16px rgba(0,0,0,0.4);
  --shadow3:0 40px 100px rgba(0,0,0,0.7),0 20px 40px rgba(0,0,0,0.5);
  --bg-blur:rgba(2,6,23,0.85);
  --tip-card-bg:rgba(15,23,42,0.8);
  --disclaimer-text:#fbbf24;
}
.dark .login-wrap{background:linear-gradient(135deg,#020617 0%,#0f172a 50%,#1e293b 100%)}
.dark .login-card{background:rgba(15,23,42,0.8);border-color:rgba(255,255,255,0.05);box-shadow:var(--shadow3)}
.dark .badge-doc{background:rgba(59,130,246,.15);color:var(--teal2)}
.dark .badge-pat{background:rgba(251,191,36,.15);color:#fbbf24}
.dark .composer{background:rgba(15,23,42,0.8);border-color:rgba(255,255,255,0.05)}
.dark .btn-p{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 10px 20px rgba(37,99,235,0.3)}
.dark .overlay{background:rgba(0,0,0,0.8)}
.dark .modal-box{border-color:rgba(255,255,255,0.05)}
.dark .inp{background:rgba(0,0,0,0.2);border-color:rgba(255,255,255,0.05)}
.dark .inp:focus{background:var(--surface);border-color:var(--teal);box-shadow:0 0 0 4px rgba(59,130,246,0.2)}
.dark .ai-page-header{background:rgba(2,6,23,0.85)}
.dark .slot-btn{background:rgba(0,0,0,0.2);border-color:rgba(255,255,255,0.05)}
.dark .profile-cover{background:linear-gradient(135deg,#1e3a8a 0%,#312e81 100%)}
.dark .hashtag-pill{background:rgba(0,0,0,0.2);border-color:rgba(255,255,255,0.05)}
.dark .hashtag-pill:hover{background:var(--surface2)}
.dark .hashtag-pill.active{background:var(--teal);color:#fff}
.dark .post-card,.dark .ai-card,.dark .account-card,.dark .trend-card{border-color:rgba(255,255,255,0.05)}
.dark .post-card:hover,.dark .trend-card:hover{border-color:rgba(59,130,246,0.4)}
.dark .dash-table td{border-top-color:rgba(255,255,255,0.05);border-bottom-color:rgba(255,255,255,0.05)}
.dark .dash-table td:first-child{border-left-color:rgba(255,255,255,0.05)}
.dark .dash-table td:last-child{border-right-color:rgba(255,255,255,0.05)}
.dark .dash-table tr:hover td{background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.1)}

/* ── Theme toggle ── */
.theme-toggle{display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:14px;border:1px solid transparent;background:var(--surface2);cursor:pointer;transition:all .25s ease;font-size:14px;font-weight:600;color:var(--text2);width:100%}
.theme-toggle:hover{background:var(--surface);border-color:var(--border);color:var(--text);transform:translateY(-2px);box-shadow:var(--shadow)}

/* ── Health Metric Visualizer ── */
.metric-panel{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);animation:fadeUp .4s cubic-bezier(0.16,1,0.3,1)}
.metric-panel-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:12px}
.metric-card{background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:14px 12px;text-align:center;transition:all .25s ease;position:relative;overflow:hidden}
.metric-card:hover{transform:translateY(-2px);box-shadow:var(--shadow2);border-color:rgba(59,130,246,0.25)}
.metric-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:3px 3px 0 0}
.metric-card.status-normal::before{background:linear-gradient(90deg,#22c55e,#16a34a)}
.metric-card.status-high::before{background:linear-gradient(90deg,#ef4444,#dc2626)}
.metric-card.status-low::before{background:linear-gradient(90deg,#f59e0b,#d97706)}
.metric-status-pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;margin-top:4px}
.status-normal .metric-status-pill{background:rgba(34,197,94,.1);color:#15803d}
.status-high .metric-status-pill{background:rgba(239,68,68,.1);color:#b91c1c}
.status-low .metric-status-pill{background:rgba(245,158,11,.1);color:#b45309}
.metric-range-bar{height:8px;background:var(--border);border-radius:8px;overflow:visible;position:relative;margin:8px 0 4px}
.metric-range-track{position:absolute;top:0;left:20%;right:20%;height:100%;background:linear-gradient(90deg,#22c55e88,#22c55e);border-radius:8px}
.metric-range-marker{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);transition:left .5s cubic-bezier(0.16,1,0.3,1)}

/* ── Jargon Translator ── */
.translator-panel{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);animation:fadeUp .4s cubic-bezier(0.16,1,0.3,1)}
.reading-level-tabs{display:flex;gap:6px;margin-bottom:12px;background:var(--surface2);padding:4px;border-radius:50px}
.level-tab{flex:1;padding:7px 10px;border-radius:50px;border:none;background:transparent;cursor:pointer;font-size:12px;font-weight:700;color:var(--text3);transition:all .2s;font-family:var(--font-b)}
.level-tab.active{background:var(--surface);color:var(--text);box-shadow:var(--shadow)}
.translator-result{background:linear-gradient(135deg,rgba(59,130,246,0.04),rgba(99,102,241,0.03));border:1px solid rgba(59,130,246,0.15);border-radius:16px;padding:16px 18px}
.translator-loading{display:flex;align-items:center;gap:10px;padding:14px;color:var(--text3);font-size:13px}
.translator-dot{width:6px;height:6px;border-radius:50%;background:var(--teal);animation:pulseGlow 1s ease-in-out infinite}
.translator-dot:nth-child(2){animation-delay:.15s}
.translator-dot:nth-child(3){animation-delay:.3s}

/* ── Fact Check Badge ── */
.fact-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;cursor:default;transition:all .3s}
.fact-badge.safe{background:rgba(34,197,94,.1);color:#15803d;border:1px solid rgba(34,197,94,.25)}
.fact-badge.unverified{background:rgba(245,158,11,.1);color:#b45309;border:1px solid rgba(245,158,11,.25)}
.fact-badge.caution{background:rgba(239,68,68,.08);color:#b91c1c;border:1px solid rgba(239,68,68,.2)}
.fact-check-bar{display:flex;align-items:flex-start;gap:10px;margin-top:10px;padding:10px 14px;border-radius:12px;font-size:12.5px;border:1px solid transparent;animation:fadeUp .3s cubic-bezier(0.16,1,0.3,1)}
.fact-check-bar.safe{background:rgba(34,197,94,.05);border-color:rgba(34,197,94,.2)}
.fact-check-bar.unverified{background:rgba(245,158,11,.05);border-color:rgba(245,158,11,.2)}
.fact-check-bar.caution{background:rgba(239,68,68,.04);border-color:rgba(239,68,68,.18)}

/* ── Case Study Modal ── */
.case-study-modal{max-width:760px;width:100%}
.case-panel{flex:1;min-width:0;padding:20px 22px;border-radius:20px;max-height:60vh;overflow-y:auto}
.case-panel.original{background:rgba(239,68,68,.03);border:1px solid rgba(239,68,68,.15)}
.case-panel.result{background:rgba(59,130,246,.03);border:1px solid rgba(59,130,246,.15)}
.case-step{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:600}
.case-step.done{background:rgba(34,197,94,.08);color:#15803d}
.case-step.active{background:rgba(59,130,246,.08);color:var(--teal);animation:pulseGlow 1.5s ease-in-out infinite}
.case-step.pending{background:var(--surface2);color:var(--text3)}

/* ── Voice Log Page ── */
.voice-btn{width:72px;height:72px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 24px rgba(0,0,0,.15)}
.voice-btn.idle{background:linear-gradient(135deg,#ec4899,#be185d)}
.voice-btn.recording{background:linear-gradient(135deg,#ef4444,#b91c1c);animation:pulseGlow 1s ease-in-out infinite}
.voice-btn.processing{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
.voice-wave{display:flex;align-items:center;gap:3px;height:32px}
.voice-bar{width:4px;border-radius:4px;background:var(--teal);animation:voiceWave 1s ease-in-out infinite}
.voice-bar:nth-child(2){animation-delay:.1s}.voice-bar:nth-child(3){animation-delay:.2s}.voice-bar:nth-child(4){animation-delay:.3s}.voice-bar:nth-child(5){animation-delay:.4s}
@keyframes voiceWave{0%,100%{height:8px}50%{height:28px}}
.timeline-node{display:flex;gap:14px;align-items:flex-start;padding-bottom:20px;position:relative}
.timeline-node::before{content:'';position:absolute;left:19px;top:40px;bottom:0;width:2px;background:var(--border)}
.timeline-node:last-child::before{display:none}
.timeline-dot{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;border:2px solid var(--border)}
.timeline-card{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;transition:all .25s}
.timeline-card:hover{box-shadow:var(--shadow2);transform:translateY(-1px)}
.urgency-badge{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.urgency-routine{background:rgba(34,197,94,.1);color:#15803d}
.urgency-soon{background:rgba(245,158,11,.1);color:#b45309}
.urgency-urgent{background:rgba(239,68,68,.1);color:#b91c1c;animation:pulseGlow 2s ease-in-out infinite}

/* ── Empathetic Avatar ── */
.avatar-fab{position:fixed;bottom:80px;right:22px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#00a896,#007a6e);box-shadow:0 4px 20px rgba(0,168,150,.4);display:flex;align-items:center;justify-content:center;z-index:200;transition:all .25s}
.avatar-fab:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(0,168,150,.5)}
.avatar-drawer{position:fixed;bottom:148px;right:22px;width:360px;background:var(--surface);border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow2);z-index:200;display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .3s cubic-bezier(0.16,1,0.3,1);max-height:520px}
.avatar-header{background:linear-gradient(135deg,#00a896,#007a6e);padding:16px 18px;display:flex;align-items:center;gap:12px}
.avatar-face{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid rgba(255,255,255,.3)}
.chat-messages{flex:1;overflow-y:auto;padding:14px 14px;display:flex;flex-direction:column;gap:10px;max-height:320px}
.chat-bubble{max-width:85%;padding:10px 14px;border-radius:18px;font-size:13.5px;line-height:1.55;animation:fadeUp .25s ease}
.chat-bubble.ai{background:var(--surface2);border:1px solid var(--border);align-self:flex-start;border-bottom-left-radius:4px}
.chat-bubble.user{background:linear-gradient(135deg,#00a896,#007a6e);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.chat-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border)}
.chat-input{flex:1;border:1px solid var(--border);border-radius:50px;padding:9px 14px;font-size:13px;background:var(--surface2);color:var(--text);outline:none;font-family:var(--font-b)}
.chat-input:focus{border-color:var(--teal);background:var(--surface)}
`;


/* ════════════════════════════════════════════════════════════════
   DATA + CONTEXT
════════════════════════════════════════════════════════════════ */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const USERS = [
  {id:1,name:"Dr. Priya Sharma",email:"priya@doc.com",password:"1234",role:"doctor",avatar:"PS",specialty:"General Physician",location:"Mumbai, Maharashtra",consultFee:500,bio:"MBBS, MD. 12 years of clinical practice. Passionate about community health education.",followers:1240,following:89,online:true},
  {id:2,name:"Dr. Arjun Mehta",email:"arjun@doc.com",password:"1234",role:"doctor",avatar:"AM",specialty:"Neurologist",location:"Delhi, NCR",consultFee:800,bio:"DM Neurology. Headaches, migraines, epilepsy specialist. Love explaining complex conditions simply.",followers:980,following:62,online:false},
  {id:5,name:"Dr. Ananya Desai",email:"ananya@doc.com",password:"1234",role:"doctor",avatar:"AD",specialty:"Dermatologist",location:"Bengaluru, Karnataka",consultFee:650,bio:"MD Dermatology. Specializing in acne, hair loss, and anti-aging treatments. Believes in science-backed skin care.",followers:1520,following:112,online:true},
  {id:6,name:"Dr. Rohan Gupta",email:"rohan@doc.com",password:"1234",role:"doctor",avatar:"RG",specialty:"Cardiologist",location:"Hyderabad, Telangana",consultFee:1000,bio:"DM Cardiology. Preventative heart care advocate. Focuses on lifestyle modifications for heart health.",followers:2100,following:45,online:true},
  {id:7,name:"Dr. Neha Ali",email:"neha@doc.com",password:"1234",role:"doctor",avatar:"NA",specialty:"Pediatrician",location:"Chennai, Tamil Nadu",consultFee:700,bio:"MD Pediatrics. Dedicated to newborn care and child development. Here to answer your parenting questions.",followers:850,following:150,online:false},
  {id:3,name:"Rahul Verma",email:"rahul@patient.com",password:"1234",role:"patient",avatar:"RV",address:"123 Park Street, Kolkata",isAnonymous:false,bio:"Just trying to stay healthy. Father of two, software engineer.",followers:34,following:120,online:true},
  {id:4,name:"Sneha Kapoor",email:"sneha@patient.com",password:"1234",role:"patient",avatar:"SK",address:"45 Seaface Road, Mumbai",isAnonymous:true,bio:"Fitness enthusiast learning to navigate the healthcare system.",followers:67,following:210,online:false},
  {id:8,name:"Amit Singh",email:"amit@patient.com",password:"1234",role:"patient",avatar:"AS",address:"78 Jubilee Hills, Hyderabad",isAnonymous:false,bio:"Avid runner. Recovering from a recent sports injury.",followers:120,following:300,online:true},
  {id:9,name:"Kavita Reddy",email:"kavita@patient.com",password:"1234",role:"patient",avatar:"KR",address:"12 Marina Breach, Chennai",isAnonymous:false,bio:"Working mom of three. Always looking for quick, healthy recipes.",followers:45,following:80,online:false},
  {id:10,name:"Anonymous Patient",email:"anon2@patient.com",password:"1234",role:"patient",avatar:"AP",address:"Delhi",isAnonymous:true,bio:"Prefer to ask questions privately.",followers:12,following:5,online:true},
];

const HASHTAGS = ["#fever","#headache","#skinproblem","#mentalhealth","#dengue","#migraine","#allergy","#hearthealth","#diabetes","#nutrition","#sleep","#anxiety"];

const now = () => new Date().toISOString();
const minsAgo = n => new Date(Date.now()-n*60000).toISOString();

const POSTS_INIT = [
  {id:1,userId:3,userName:"Rahul Verma",avatar:"RV",role:"patient",type:"patient_post",
   content:"Having severe throbbing headache on the right side for 3 days now 😔 Also feeling dizzy when I stand up quickly. Took paracetamol but only helps for 2 hours. Should I be concerned? Has anyone experienced this? #headache #migraine",
   tags:["#headache","#migraine"],likes:23,liked:false,saved:false,
   createdAt:minsAgo(180),comments:[
     {id:101,userId:1,userName:"Dr. Priya Sharma",avatar:"PS",role:"doctor",specialty:"General Physician",
      content:"Hi Rahul! The unilateral throbbing headache with postural dizziness is worth taking seriously. This pattern fits migraine but we should rule out blood pressure changes. Please check your BP. Avoid bright screens, stay hydrated, rest in a dark room. If you develop fever or stiff neck, go to emergency immediately. Follow up with a doctor if it persists beyond 5 days.",
      likes:18,liked:false,createdAt:minsAgo(160)},
   ]},
  {id:2,userId:4,userName:"Sneha Kapoor",avatar:"SK",role:"patient",type:"patient_post",
   content:"Red itchy bumps appeared on my forearm after I tried shrimp for the first time yesterday 🦐 The rash is spreading a little. Should I take antihistamine or go to the doctor? Really worried. #allergy #skinproblem",
   tags:["#allergy","#skinproblem"],likes:15,liked:false,saved:false,
   createdAt:minsAgo(300),comments:[
     {id:102,userId:2,userName:"Dr. Arjun Mehta",avatar:"AM",role:"doctor",specialty:"Neurologist",
      content:"Sneha, this sounds like an allergic urticaria (hives) reaction to shellfish. Take cetirizine 10mg if available — should reduce itching within 30 minutes. Avoid shrimp and all shellfish until you see an allergist. IMPORTANT: If you notice throat tightening, swelling of lips/tongue, or difficulty breathing — call emergency services immediately. Those are signs of anaphylaxis.",
      likes:22,liked:false,createdAt:minsAgo(280)},
   ]},
  {id:3,userId:3,userName:"Rahul Verma",avatar:"RV",role:"patient",type:"patient_post",
   content:"Chest tightness every time I climb more than 2 flights of stairs for the past week. Goes away after resting. I'm 34, occasional smoker, and my dad had a heart attack at 52. This feels different from usual breathlessness. #hearthealth",
   tags:["#hearthealth"],likes:41,liked:false,saved:true,
   createdAt:minsAgo(1440),comments:[]},
  {id:4,userId:1,userName:"Dr. Priya Sharma",avatar:"PS",role:"doctor",type:"doctor_post",specialty:"General Physician",
   content:"🔴 IMPORTANT: Understanding Dengue Fever Early Signs\n\nWith monsoon season, dengue cases are rising. Here's what to watch for:\n\n• Sudden high fever (103–104°F)\n• Severe headache & pain behind eyes\n• Joint & muscle pain\n• Skin rash 3–4 days after fever\n\nWhen to go to hospital immediately:\n→ Platelet count drops below 100,000\n→ Severe abdominal pain\n→ Bleeding from gums/nose\n→ Difficulty breathing\n\nRemember: Never take aspirin or ibuprofen for dengue. Paracetamol only. #dengue #fever",
   tags:["#dengue","#fever"],likes:156,liked:false,saved:false,
   createdAt:minsAgo(720),comments:[]},
  {id:5,userId:2,userName:"Dr. Arjun Mehta",avatar:"AM",role:"doctor",type:"doctor_post",specialty:"Neurologist",
   content:"📊 Migraine vs Tension Headache — Quick Reference Guide\n\nTension Headache:\n• Band-like pressure, both sides\n• Mild–moderate, doesn't throb\n• 30 min – 7 days\n• No nausea typically\n\nMigraine:\n• Pulsating, usually one side\n• Moderate–severe, disabling\n• 4–72 hours\n• Nausea, light/sound sensitivity\n• May have visual aura\n\n🚨 Red flags requiring urgent care:\n→ Worst headache of your life (thunderclap)\n→ Headache + fever + stiff neck\n→ New headache after age 50\n→ Neurological symptoms #headache #migraine #neurology",
   tags:["#headache","#migraine"],likes:203,liked:false,saved:true,
   createdAt:minsAgo(2880),comments:[]},
  {id:6,userId:5,userName:"Dr. Ananya Desai",avatar:"AD",role:"doctor",type:"doctor_post",specialty:"Dermatologist",
   content:"✨ Skincare Myth Busting! ✨\n\nMyth: You don't need sunscreen indoors or on cloudy days.\nFact: UV rays can penetrate windows and clouds! Even if you are indoors, you are exposed to UVA rays which cause premature aging.\n\nAlways wear a broad-spectrum SPF 30+ daily, regardless of the weather. Reapply every 2 hours if you're directly in the sun. Simple steps prevent long-term damage!\n\n#skincare #dermatology #preventativecare",
   tags:["#skinproblem","#prevention"],likes:342,liked:false,saved:false,
   createdAt:minsAgo(420),comments:[]},
  {id:7,userId:8,userName:"Amit Singh",avatar:"AS",role:"patient",type:"patient_post",
   content:"I've been experiencing a sharp pain in my lower back radiating down my right leg. It gets worse when I sneeze or cough. Any advice? 🏃‍♂️🤕 #backpain #injury",
   tags:["#pain","#injury"],likes:12,liked:false,saved:false,
   createdAt:minsAgo(120),comments:[
     {id:103,userId:2,userName:"Dr. Arjun Mehta",avatar:"AM",role:"doctor",specialty:"Neurologist",
      content:"Amit, this sounds highly suspicious for a herniated disc pressing on a nerve root (sciatica). The worsening with sneezing/coughing is a classic sign. Please avoid heavy lifting and bending. You need a clinical evaluation, possibly an MRI. Do not try to exercise through the pain.",
      likes:45,liked:false,createdAt:minsAgo(90)}
   ]},
  {id:8,userId:6,userName:"Dr. Rohan Gupta",avatar:"RG",role:"doctor",type:"doctor_post",specialty:"Cardiologist",
   content:"❤️ Heart Health 101: The role of sleep.\n\nDid you know that consistently getting less than 6 hours of sleep a night increases your risk of heart attacks and strokes? Sleep is when your body repairs itself, and your heart rate and blood pressure drop.\n\nPrioritize 7-8 hours of quality sleep for a healthier heart. It's not a luxury; it's a necessity. #hearthealth #sleep #cardiology",
   tags:["#hearthealth","#sleep"],likes:512,liked:false,saved:true,
   createdAt:minsAgo(1440),comments:[]},
  {id:9,userId:10,userName:"Anonymous Patient",avatar:"AP",role:"patient",type:"patient_post",isAnonymous:true,
   content:"Is it normal to feel completely exhausted all the time even when I sleep 9 hours? I also feel cold constantly. #fatigue #health",
   tags:["#fatigue","#health"],likes:8,liked:false,saved:false,
   createdAt:minsAgo(50),comments:[
     {id:104,userId:1,userName:"Dr. Priya Sharma",avatar:"PS",role:"doctor",specialty:"General Physician",
      content:"Feeling cold and exhausted despite adequate sleep are common signs of hypothyroidism (underactive thyroid) or anemia. I highly recommend getting a basic blood workup, specifically checking your TSH levels and a complete blood count.",
      likes:12,liked:false,createdAt:minsAgo(20)}
   ]},
  {id:10,userId:9,userName:"Kavita Reddy",avatar:"KR",role:"patient",type:"patient_post",
   content:"My 4-year-old has had a mild fever (100F) for two days now and a runny nose. No other symptoms, eating okay. Should I be worried? 🤒🧒 #fever #parenting",
   tags:["#fever","#kids"],likes:19,liked:false,saved:false,
   createdAt:minsAgo(200),comments:[
     {id:105,userId:7,userName:"Dr. Neha Ali",avatar:"NA",role:"doctor",specialty:"Pediatrician",
      content:"Kavita, a mild fever for 2 days with a runny nose and normal eating is usually a viral upper respiratory infection. Keep the child hydrated. If the fever spikes above 102F, lasts more than 3 days, or if the child stops drinking fluids, please see a pediatrician.",
      likes:34,liked:false,createdAt:minsAgo(150)}
   ]}
];

// Merge dummy posts into initial data
const ALL_POSTS_INIT = [...POSTS_INIT, ...DUMMY_POSTS];

/* ════════════════════════════════════════════════════════════════
   ICONS (inline SVG)
════════════════════════════════════════════════════════════════ */
const IC = {
  home:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  search:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  steth:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><circle cx="18" cy="17" r="3"/><path d="M16 14a6 6 0 0 1-6 6"/></svg>,
  user:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  heart:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  heartF:<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  msg:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  share:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  bm:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  bmF:<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  plus:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  img:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  hash:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  shield:<svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  alert:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  send:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  close:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trend:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  check:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  dot:<svg width="5" height="5" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.5" fill="#22c55e"/></svg>,
  spark:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  brain:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 3 3h1a4 4 0 0 0 6 0h1a3 3 0 0 0 3-3v-1a3 3 0 0 0 0-6v-1a3 3 0 0 0-3-3V6a4 4 0 0 0-4-4z"/><path d="M12 2v20"/></svg>,
  mapPin:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  shield2:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  trash:<svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  clipboard:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
  activity:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  camera:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  edit:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  mail:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  calendar:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  badge:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15l-2 5 2-1 2 1-2-5z"/><circle cx="12" cy="8" r="6"/></svg>,
  phone:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
};

/* ════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════ */
const ago = d => {
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if(m<1) return "just now";
  if(m<60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h<24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
};

const AV_G = [
  "linear-gradient(135deg,#00a896,#007a6e)",
  "linear-gradient(135deg,#1a73e8,#1558b0)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#ec4899,#be185d)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
];
const avColor = s => AV_G[(s||"A").charCodeAt(0)%AV_G.length];

const Av = ({init="?",sz=38,ring=false,dot=false,onClick,pic=null}) => (
  <div onClick={onClick} style={{width:sz,height:sz,borderRadius:"50%",background:pic?"transparent":avColor(init),display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.33,fontWeight:800,fontFamily:"var(--font-b)",flexShrink:0,color:"#fff",position:"relative",cursor:onClick?"pointer":undefined,boxShadow:ring?"0 0 0 2.5px #fff,0 0 0 4px var(--teal)":undefined,transition:"transform .18s",overflow:"hidden"}}>
    {pic ? <img src={pic} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/> : init.slice(0,2).toUpperCase()}
    {dot&&<span style={{position:"absolute",bottom:1,right:1,width:9,height:9,background:"#22c55e",borderRadius:"50%",border:"2px solid #fff"}}/>}
  </div>
);

const Spinner = () => <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>;

/* ════════════════════════════════════════════════════════════════
   HEALTH METRIC VISUALIZER COMPONENT
════════════════════════════════════════════════════════════════ */
const RangeBar = ({ value, min, max, color, status }) => {
  if (min === null || max === null) return null;
  const range = max - min;
  // Marker position: clamp value to [min - 20%, max + 20%] of the bar width
  const barMin = min - range * 0.3;
  const barMax = max + range * 0.3;
  const pct = Math.max(0, Math.min(100, ((value - barMin) / (barMax - barMin)) * 100));
  const normalLeft = ((min - barMin) / (barMax - barMin)) * 100;
  const normalRight = 100 - ((barMax - max) / (barMax - barMin)) * 100;
  const markerColor = status === 'normal' ? '#22c55e' : status === 'high' ? '#ef4444' : '#f59e0b';

  return (
    <div className="metric-range-bar">
      <div className="metric-range-track" style={{ left: `${normalLeft}%`, right: `${100 - normalRight}%` }} />
      <div className="metric-range-marker" style={{ left: `${pct}%`, background: markerColor }} />
    </div>
  );
};

const MetricCard = ({ metric }) => {
  const statusLabel = { normal: '✓ Normal', high: '↑ High', low: '↓ Low' };
  return (
    <div className={`metric-card status-${metric.status}`}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{metric.label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: metric.color || 'var(--text)', lineHeight: 1 }}>
        {metric.display}
      </p>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{metric.unit}</p>
      {metric.min !== null && (
        <RangeBar value={metric.value} min={metric.min} max={metric.max} color={metric.color} status={metric.status} />
      )}
      <span className="metric-status-pill">
        {statusLabel[metric.status] || metric.status}
      </span>
      {metric.min !== null && (
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Ref: {metric.min}–{metric.max}</p>
      )}
    </div>
  );
};

const BPCard = ({ metric }) => {
  return (
    <div style={{ gridColumn: 'span 2' }}>
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: '3px 3px 0 0' }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Blood Pressure</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{metric.values[0].value}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>Systolic</p>
            <RangeBar value={metric.values[0].value} min={metric.values[0].min} max={metric.values[0].max} status={metric.values[0].status} />
            <span className={`metric-status-pill status-${metric.values[0].status}`} style={{ display: 'inline-flex', marginTop: 2 }}>
              {metric.values[0].status === 'normal' ? '✓ Normal' : metric.values[0].status === 'high' ? '↑ High' : '↓ Low'}
            </span>
          </div>
          <div style={{ fontSize: 24, color: 'var(--text3)', fontWeight: 300 }}>/</div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#f97316', lineHeight: 1 }}>{metric.values[1].value}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>Diastolic</p>
            <RangeBar value={metric.values[1].value} min={metric.values[1].min} max={metric.values[1].max} status={metric.values[1].status} />
            <span className={`metric-status-pill status-${metric.values[1].status}`} style={{ display: 'inline-flex', marginTop: 2 }}>
              {metric.values[1].status === 'normal' ? '✓ Normal' : metric.values[1].status === 'high' ? '↑ High' : '↓ Low'}
            </span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>Reference</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>90–120 / 60–80 mmHg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const HealthMetricVisualizer = ({ text }) => {
  const [open, setOpen] = useState(false);
  const metrics = open ? parseHealthMetrics(text) : [];

  return (
    <>
      <button
        className="action-btn"
        onClick={() => setOpen(o => !o)}
        style={{ color: open ? 'var(--teal)' : undefined, background: open ? 'var(--teal-bg)' : undefined }}
        title="Visualize health metrics"
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span style={{ fontSize: 11 }}>Visualize</span>
      </button>
      {open && metrics.length > 0 && (
        <div className="metric-panel fi">
          <div className="metric-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,var(--teal),var(--teal2))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Health Metrics</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 20 }}>{metrics.length} detected</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="metric-grid">
            {metrics.map((m, i) =>
              m.type === 'bp'
                ? <BPCard key={i} metric={m} />
                : <MetricCard key={i} metric={m} />
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Reference ranges are for adults. Consult a doctor for personal interpretation.
          </p>
        </div>
      )}
      {open && metrics.length === 0 && (
        <div className="metric-panel fi" style={{ padding: '12px 0', color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
          No structured metrics detected in this post.
        </div>
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   JARGON TRANSLATOR COMPONENT
════════════════════════════════════════════════════════════════ */
const JargonTranslator = ({ text }) => {
  const [open, setOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState('patient');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasKey = !!import.meta.env.VITE_GROQ_API_KEY && import.meta.env.VITE_GROQ_API_KEY !== 'your_groq_api_key_here';

  const translate = async (level) => {
    setActiveLevel(level);
    if (!open) setOpen(true);
    if (results[level]) return; // cached
    setLoading(true);
    setError(null);
    try {
      const result = await simplifyMedicalText(text, level);
      setResults(r => ({ ...r, [level]: result }));
    } catch (e) {
      setError(e.message?.includes('VITE_GROQ_API_KEY') ? 'Add your Groq API key to .env to enable AI translation.' : 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      translate(activeLevel);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        className="action-btn"
        onClick={handleOpen}
        style={{ color: open ? '#8b5cf6' : undefined, background: open ? 'rgba(139,92,246,0.1)' : undefined }}
        title="Simplify medical language"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
        <span style={{ fontSize: 11 }}>Simplify</span>
      </button>
      {open && (
        <div className="translator-panel fi">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>AI Simplifier</span>
              {!hasKey && <span style={{ fontSize: 10, color: '#b45309', background: 'rgba(245,158,11,.1)', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>API Key needed</span>}
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="reading-level-tabs">
            {Object.entries(READING_LEVELS).map(([key, lvl]) => (
              <button key={key} className={`level-tab ${activeLevel === key ? 'active' : ''}`}
                onClick={() => translate(key)}>
                {lvl.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="translator-loading">
              <div className="translator-dot" /><div className="translator-dot" /><div className="translator-dot" />
              <span>Translating medical language…</span>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#b45309' }}>
              ⚠️ {error}
            </div>
          ) : results[activeLevel] ? (
            <div className="translator-result">
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                {READING_LEVELS[activeLevel]?.desc}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{results[activeLevel]}</p>
            </div>
          ) : null}
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            AI-generated simplification. Always consult a qualified doctor.
          </p>
        </div>
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   CASE STUDY SYNTHESIZER
════════════════════════════════════════════════════════════════ */
const CaseStudySynthesizer = ({ post }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=idle, 1=scrubbing, 2=generating, 3=done
  const [scrubbed, setScrubbed] = useState(null);
  const [caseStudy, setCaseStudy] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setOpen(true);
    if (caseStudy) return; // already generated
    setStep(1); setError(null);
    try {
      const anon = await scrubPII(post.content);
      setScrubbed(anon);
      setStep(2);
      const cs = await generateCaseStudy(anon);
      setCaseStudy(cs);
      setStep(3);
    } catch (e) {
      setError('Generation failed: ' + (e.message || 'Unknown error'));
      setStep(0);
    }
  };

  const copyForTeaching = () => {
    if (!caseStudy) return;
    navigator.clipboard.writeText(caseStudy).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const stepLabels = ['Anonymizing PII…', 'Structuring case study…', 'Complete'];
  const stepIcons = ['🔒', '📋', '✅'];

  return (
    <>
      <button
        className="action-btn"
        onClick={run}
        title="Generate anonymized case study (doctors only)"
        style={{ color: '#1558b0', background: 'rgba(26,115,232,.08)' }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span style={{ fontSize: 11 }}>Case Study</span>
      </button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal-box case-study-modal" onClick={e => e.stopPropagation()} style={{ padding: 0 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1a73e8,#1558b0)', padding: '20px 24px', borderRadius: '28px 28px 0 0', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📋</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>Privacy-First Case Study Synthesizer</p>
                  <p style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>2-pass AI pipeline: PII scrub → educational case study</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Progress steps */}
              {step > 0 && step < 3 && (
                <div style={{ marginBottom: 16 }}>
                  {stepLabels.map((label, i) => (
                    <div key={i} className={`case-step ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'pending'}`}>
                      <span>{stepIcons[i]}</span>
                      <span>Step {i + 1}: {label}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: 14, color: '#b91c1c', fontSize: 13 }}>⚠️ {error}</div>
              )}

              {/* Two-panel view */}
              {step === 3 && (
                <div style={{ display: 'flex', gap: 14 }} className="fi">
                  <div className="case-panel original">
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>🔒 Anonymized Source</p>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{scrubbed}</p>
                  </div>
                  <div className="case-panel result">
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>📋 Educational Case Study</p>
                    <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{caseStudy}</p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {(step === 1 || step === 2) && (
                <div style={{ textAlign: 'center', padding: '40px 0' }} className="fi">
                  <div className="ai-loading">
                    <div className="ai-loading-bar" />
                    <p style={{ fontSize: 13, color: 'var(--text3)' }}>{step === 1 ? '🔒 Detecting and scrubbing PII…' : '📋 Generating educational case study…'}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {step === 3 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-g" onClick={() => { setScrubbed(null); setCaseStudy(null); setStep(0); run(); }} style={{ padding: '9px 18px', fontSize: 13 }}>🔄 Regenerate</button>
                  <button className="btn-p" onClick={copyForTeaching} style={{ padding: '9px 20px', borderRadius: 50, fontSize: 13 }}>
                    {copied ? '✓ Copied!' : '📋 Copy for Teaching'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   POST CARD COMPONENT
════════════════════════════════════════════════════════════════ */
const PostCard = ({post, idx=0, onHashtagClick, onProfileClick}) => {
  const {user, toggleLike, toggleSave, addComment, deletePost} = useApp();
  const [showComments, setShowComments] = useState(false);
  const [cmnt, setCmnt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shared, setShared] = useState(false);
  const isDoc = user?.role==="doctor";

  const renderContent = (txt) => {
    return txt.split(/(\#\w+)/g).map((part,i)=>
      part.startsWith("#")
        ? <span key={i} onClick={()=>onHashtagClick&&onHashtagClick(part)}
            style={{color:"var(--teal2)",fontWeight:600,cursor:"pointer",transition:"color .15s"}}
            onMouseEnter={e=>e.target.style.color="#00a896"}
            onMouseLeave={e=>e.target.style.color="var(--teal2)"}>{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  const doComment = async () => {
    if(!cmnt.trim()||!isDoc) return;
    setSubmitting(true);
    await new Promise(r=>setTimeout(r,500));
    addComment(post.id, cmnt.trim());
    setCmnt(""); setSubmitting(false);
  };

  const doShare = () => {
    setShared(true);
    setTimeout(()=>setShared(false),2000);
  };

  return (
    <div className={`post-card fu s${Math.min(idx+1,6)}`}
      style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:13}}>
        <Av init={(post.isAnonymous || USERS.find(u=>u.id===post.userId)?.isAnonymous) ? "?" : post.avatar} sz={42} dot={post.userId===user?.id}
          onClick={()=>{if(!(post.isAnonymous || USERS.find(u=>u.id===post.userId)?.isAnonymous)) onProfileClick&&onProfileClick(post.userId)}} />
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
            <span onClick={()=>{if(!(post.isAnonymous || USERS.find(u=>u.id===post.userId)?.isAnonymous)) onProfileClick&&onProfileClick(post.userId)}}
              style={{fontFamily:"var(--font-b)",fontWeight:700,fontSize:14.5,color:"var(--text)",cursor:(post.isAnonymous || USERS.find(u=>u.id===post.userId)?.isAnonymous)?"default":"pointer"}}
              onMouseEnter={e=>{if(!(post.isAnonymous || USERS.find(u=>u.id===post.userId)?.isAnonymous)) e.target.style.textDecoration="underline"}}
              onMouseLeave={e=>e.target.style.textDecoration="none"}>
              {(post.isAnonymous || USERS.find(u=>u.id===post.userId)?.isAnonymous) ? (post.userId===user?.id ? "Anonymous Patient (You)" : "Anonymous Patient") : post.userName}
            </span>
            {post.role==="doctor"
              ? <span className="badge-doc">{IC.shield} Dr · {post.specialty}</span>
              : <span className="badge-pat">Patient</span>}
            {post.type==="doctor_post" && (
              <span style={{fontSize:10,fontFamily:"var(--font-b)",fontWeight:700,color:"#1558b0",background:"rgba(26,115,232,.08)",border:"1px solid rgba(26,115,232,.2)",padding:"2px 7px",borderRadius:20,letterSpacing:".04em",textTransform:"uppercase"}}>Knowledge</span>
            )}
          </div>
          <span style={{fontSize:11.5,color:"var(--text3)"}}>{ago(post.createdAt)}</span>
        </div>
        {post.userId === user?.id && (
          <button onClick={() => deletePost(post.id)} title="Delete Post" style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:4}}>
            {IC.trash}
          </button>
        )}
      </div>

      <p style={{fontSize:14.5,lineHeight:1.7,color:"var(--text)",marginBottom:12,whiteSpace:"pre-wrap"}}>
        {renderContent(post.content)}
      </p>

      {post.image && (
        <div style={{marginBottom:12,borderRadius:14,overflow:"hidden",border:"1px solid var(--border)"}}>
          <img src={post.image} alt="Post attachment" style={{width:"100%",maxHeight:360,objectFit:"cover",display:"block",transition:"transform .3s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
        </div>
      )}

      {post.tags?.length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {post.tags.map((t,i)=>(
            <span key={t} className={`tag ${["tag-t","tag-b","tag-c","tag-g"][i%4]}`}
              onClick={()=>onHashtagClick&&onHashtagClick(t)}>
              {IC.hash}&nbsp;{t.replace("#","")}
            </span>
          ))}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:2,paddingTop:10,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
        <button className={`action-btn ${post.liked?"liked":""}`}
          onClick={()=>toggleLike(post.id)}
          style={{animation:post.liked?"heartPop .4s cubic-bezier(.22,1,.36,1)":undefined}}>
          {post.liked ? IC.heartF : IC.heart}
          <span>{post.likes}</span>
        </button>
        <button className="action-btn" onClick={()=>setShowComments(!showComments)}>
          {IC.msg}
          <span>{post.comments.length}</span>
        </button>
        <button className="action-btn" onClick={doShare} style={shared?{color:"var(--teal)"}:{}}>
          {shared ? IC.check : IC.share}
          <span style={{fontSize:11}}>{shared?"Copied!":"Share"}</span>
        </button>
        {hasHealthMetrics(post.content) && <HealthMetricVisualizer text={post.content} />}
        <JargonTranslator text={post.content} />
        {isDoc && post.role==="patient" && <CaseStudySynthesizer post={post} />}
        <button className={`action-btn ${post.saved?"saved":""}`}
          onClick={()=>toggleSave(post.id)} style={{marginLeft:"auto"}}>
          {post.saved ? IC.bmF : IC.bm}
        </button>
      </div>

      {showComments && (
        <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)"}} className="fi">
          {post.comments.length===0 && (
            <p style={{fontSize:13,color:"var(--text3)",textAlign:"center",padding:"16px 0"}}>
              👨‍⚕️ No doctor responses yet.
            </p>
          )}
          {post.comments.map((c,ci)=>(
            <div key={c.id} className="comment-item" style={{position:"relative",paddingLeft:44,marginBottom:14}}>
              {ci<post.comments.length-1 && <div className="thread-line"/>}
              <div style={{position:"absolute",left:0,top:0}}><Av init={c.avatar} sz={32} ring={c.role==="doctor"}/></div>
              <div style={{background:"var(--surface2)",borderRadius:14,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{c.userName}</span>
                  {c.role==="doctor"&&<span className="badge-doc">{IC.shield} {c.specialty}</span>}
                  <span style={{fontSize:11,color:"var(--text3)",marginLeft:"auto"}}>{ago(c.createdAt)}</span>
                </div>
                <p style={{fontSize:13.5,lineHeight:1.65,color:"var(--text2)"}}>{c.content}</p>
                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8}}>
                  <button className="action-btn" style={{padding:"3px 8px",fontSize:11.5}}>
                    {IC.heart}<span>{c.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {isDoc ? (
            <div style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:8}}>
              <Av init={user.avatar} sz={34}/>
              <div style={{flex:1,display:"flex",gap:8,alignItems:"flex-end"}}>
                <textarea className="compose-area inp" value={cmnt}
                  onChange={e=>setCmnt(e.target.value)}
                  placeholder="Share your medical guidance…"
                  rows={2} style={{flex:1,resize:"none",padding:"10px 13px",fontSize:13}}/>
                <button onClick={doComment} disabled={!cmnt.trim()||submitting}
                  className="btn-p" style={{padding:"10px 14px",borderRadius:12,flexShrink:0}}>
                  {submitting?<Spinner/>:IC.send}
                </button>
              </div>
            </div>
          ):(
            <p style={{fontSize:12,color:"var(--text3)",textAlign:"center",padding:"6px 0",}}>
              Only verified doctors can respond to patient posts.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   COMPOSER
════════════════════════════════════════════════════════════════ */
const Composer = ({defaultType, placeholder}) => {
  const {user, addPost} = useApp();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [factCheck, setFactCheck] = useState(null); // {verdict, reason, suggestion}
  const [factChecking, setFactChecking] = useState(false);
  const factCheckTimer = useRef(null);
  const imgInputRef = useRef(null);
  const textRef = useRef(null);
  const maxChars = 500;

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeImage = () => setImgPreview(null);

  const insertTag = (tag) => {
    const suffix = text.endsWith(" ") || text === "" ? tag + " " : " " + tag + " ";
    const newText = (text + suffix).slice(0, maxChars);
    setText(newText);
    setShowTagPicker(false);
    textRef.current?.focus();
  };

  // Debounced fact-check: fires 1.8s after user stops typing, min 80 chars
  const handleTextChange = (val) => {
    setText(val.slice(0, maxChars));
    if (factCheckTimer.current) clearTimeout(factCheckTimer.current);
    if (val.trim().length < 80) { setFactCheck(null); return; }
    factCheckTimer.current = setTimeout(async () => {
      setFactChecking(true);
      try {
        const result = await factCheckHealthClaim(val);
        setFactCheck(result);
      } catch { /* silently fail */ }
      setFactChecking(false);
    }, 1800);
  };

  const submit = async () => {
    if(!text.trim() && !imgPreview) return;
    setSubmitting(true);
    await new Promise(r=>setTimeout(r,600));
    const tags = [...text.matchAll(/#\w+/g)].map(m=>m[0]);
    addPost({content:text.trim(), tags, type:defaultType||"patient_post", image:imgPreview||null});
    setText(""); setImgPreview(null); setFocused(false); setSubmitting(false); setShowTagPicker(false); setFactCheck(null);
  };

  const pct = text.length/maxChars;
  const circumference = 2*Math.PI*10;

  return (
    <div className="composer">
      <div style={{display:"flex",gap:13,alignItems:"flex-start"}}>
        <Av init={user?.avatar||"?"} sz={42} dot/>
        <div style={{flex:1}}>
          <textarea ref={textRef} className="compose-area"
            value={text} onChange={e=>handleTextChange(e.target.value)}
            onFocus={()=>setFocused(true)}
            placeholder={placeholder||(user?.role==="doctor"?"Share medical knowledge or advice…":"Describe your symptoms or ask a health question…")}
            rows={focused||text?3:1}
            style={{transition:"all .2s",paddingTop:4}}/>
          {/* Fact-check badge */}
          {(factChecking || factCheck) && (
            <div className={`fact-check-bar ${factCheck?.verdict || 'unverified'} fi`}>
              {factChecking ? (
                <><div className="translator-dot"/><div className="translator-dot"/><div className="translator-dot"/>
                <span style={{fontSize:12,color:'var(--text3)'}}>Checking claim accuracy…</span></>
              ) : factCheck ? (
                <>
                  <span className={`fact-badge ${factCheck.verdict}`}>
                    {factCheck.verdict==='safe'?'✓ Verified':factCheck.verdict==='caution'?'⚠ Caution':'? Unverified'}
                  </span>
                  <div style={{flex:1}}>
                    <p style={{fontSize:12.5,color:'var(--text)',fontWeight:600,marginBottom:2}}>{factCheck.reason}</p>
                    {factCheck.suggestion && <p style={{fontSize:11.5,color:'var(--text3)'}}>{factCheck.suggestion}</p>}
                  </div>
                </>
              ) : null}
            </div>
          )}
          {imgPreview && (
            <div className="fi" style={{position:"relative",marginTop:10,borderRadius:14,overflow:"hidden",border:"1px solid var(--border)"}}>
              <img src={imgPreview} alt="Preview" style={{width:"100%",maxHeight:240,objectFit:"cover",display:"block"}}/>
              <button onClick={removeImage}
                style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.8)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.6)"}>
                {IC.close}
              </button>
            </div>
          )}
          {(focused||text||imgPreview) && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)"}} className="fi">
              <div style={{display:"flex",gap:6,position:"relative"}}>
                <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{display:"none"}}/>
                <button className="action-btn" style={{padding:"6px 10px",color:"var(--teal2)"}}
                  onClick={()=>imgInputRef.current?.click()}>
                  {IC.img}<span style={{fontSize:12}}>Image</span>
                </button>
                <button className="action-btn" style={{padding:"6px 10px",color:"var(--teal2)"}}
                  onClick={()=>setShowTagPicker(!showTagPicker)}>
                  {IC.hash}<span style={{fontSize:12}}>Tag</span>
                </button>
                {showTagPicker && (
                  <div className="si" style={{position:"absolute",top:"100%",left:0,marginTop:6,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"10px 12px",boxShadow:"var(--shadow2)",zIndex:30,width:260,maxHeight:180,overflowY:"auto"}}>
                    <p style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>Insert Hashtag</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {HASHTAGS.map(h=>(
                        <button key={h} onClick={()=>insertTag(h)}
                          style={{padding:"4px 10px",borderRadius:20,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"var(--font-b)",color:"var(--text2)",transition:"all .15s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="var(--teal-bg)";e.currentTarget.style.color="var(--teal)";e.currentTarget.style.borderColor="var(--teal)"}}
                          onMouseLeave={e=>{e.currentTarget.style.background="var(--surface2)";e.currentTarget.style.color="var(--text2)";e.currentTarget.style.borderColor="var(--border)"}}>
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <svg width="24" height="24" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border)" strokeWidth="2.5"/>
                  <circle cx="12" cy="12" r="10" fill="none"
                    stroke={pct>.9?"#ef4444":pct>.7?"#f59e0b":"var(--teal)"}
                    strokeWidth="2.5" strokeDasharray={circumference}
                    strokeDashoffset={circumference*(1-pct)} strokeLinecap="round"
                    style={{transition:"all .2s"}}/>
                </svg>
                <span style={{fontSize:11.5,color:pct>.9?"#ef4444":"var(--text3)"}}>{maxChars-text.length}</span>
                <button className="btn-p" onClick={submit} disabled={(!text.trim()&&!imgPreview)||submitting}
                  style={{padding:"8px 20px",fontSize:13}}>
                  {submitting?<Spinner/>:user?.role==="doctor"?"Publish":"Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════
   VOICE-TO-STRUCTURED-LOG PAGE
════════════════════════════════════════════════════════════════ */
const URGENCY_META = {
  routine: { emoji: '🟢', label: 'Routine', cls: 'urgency-routine', dotBg: 'rgba(34,197,94,.15)', dotColor: '#15803d' },
  soon:    { emoji: '🟡', label: 'Soon',    cls: 'urgency-soon',    dotBg: 'rgba(245,158,11,.15)', dotColor: '#b45309' },
  urgent:  { emoji: '🔴', label: 'Urgent',  cls: 'urgency-urgent',  dotBg: 'rgba(239,68,68,.15)',  dotColor: '#b91c1c' },
};
const TONE_EMOJI = { anxious:'😰', calm:'😌', distressed:'😟', hopeful:'🌟', neutral:'😐' };

const VoiceLogPage = ({ onShareLog }) => {
  const { addPost, user } = useApp();
  const [recState, setRecState] = useState('idle'); // idle|recording|processing|done
  const [transcript, setTranscript] = useState('');
  const [logData, setLogData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecState('processing');
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const tx = await transcribeAudio(blob);
          setTranscript(tx);
          const data = await extractSymptomsFromTranscript(tx);
          setLogData(data);
          setRecState('done');
        } catch (e) {
          setError(e.message || 'Transcription failed');
          setRecState('idle');
        }
      };
      mediaRef.current = mr;
      mr.start();
      setRecState('recording');
    } catch (e) {
      setError('Microphone access denied. Please allow mic permissions.');
    }
  };

  const stopRecording = () => { mediaRef.current?.stop(); };

  const saveLog = () => {
    if (!logData) return;
    const entry = { id: Date.now(), transcript, logData, createdAt: new Date().toLocaleTimeString() };
    setLogs(prev => [entry, ...prev]);
    setLogData(null); setTranscript(''); setRecState('idle');
  };

  const shareToFeed = (entry) => {
    const urgMeta = URGENCY_META[entry.logData.urgency] || URGENCY_META.routine;
    const content = `🎙️ Voice Health Log\n\n📋 Summary: ${entry.logData.summary}\n\n🤒 Symptoms: ${entry.logData.symptoms.join(', ')}\n⏱ Duration: ${entry.logData.duration}\n📊 Severity: ${entry.logData.severity}\n${urgMeta.emoji} Urgency: ${urgMeta.label}\n\n#voicelog #symptoms`;
    addPost({ content, tags: ['#voicelog', '#symptoms'], type: 'patient_post', image: null });
  };

  const recBtn = recState === 'recording' ? 'recording' : recState === 'processing' ? 'processing' : 'idle';
  const recLabel = { idle: '🎙️ Tap to Record', recording: '⏹ Stop Recording', processing: 'Transcribing…', done: '✅ Log Ready' };

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#ec4899,#be185d)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(236,72,153,.3)', fontSize: 18 }}>🎙️</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-d)' }}>Voice Health Log</h1>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Speech → Whisper → AI metrics → Interactive timeline</p>
          </div>
        </div>
      </div>

      {/* Recorder */}
      <div className="ai-card fu" style={{ textAlign: 'center', padding: '32px 20px', marginBottom: 16 }}>
        {recState === 'recording' && (
          <div className="voice-wave" style={{ justifyContent: 'center', marginBottom: 20 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="voice-bar" style={{ animationDelay: `${(i-1)*0.1}s` }}/>)}
          </div>
        )}
        <button
          className={`voice-btn ${recBtn}`}
          onClick={recState === 'idle' || recState === 'done' ? startRecording : recState === 'recording' ? stopRecording : undefined}
          style={{ margin: '0 auto 16px' }}
          disabled={recState === 'processing'}
        >
          {recState === 'recording' ? (
            <svg width="26" height="26" fill="#fff" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : recState === 'processing' ? (
            <svg width="26" height="26" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" style={{animation:'spin .8s linear infinite'}}/></svg>
          ) : (
            <svg width="26" height="26" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          )}
        </button>
        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{recLabel[recState]}</p>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>Describe your symptoms, how long, how severe</p>
        {error && <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 10 }}>⚠️ {error}</p>}
      </div>

      {/* Transcript + Extracted Data */}
      {logData && (
        <div className="ai-card accent-teal fu" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>📝 Transcript</p>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 16 }}>"{transcript}"</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Severity', val: logData.severity },
              { label: 'Duration', val: logData.duration },
              { label: 'Mood', val: `${TONE_EMOJI[logData.emotionalTone] || '😐'} ${logData.emotionalTone}` },
              { label: 'Urgency', val: `${URGENCY_META[logData.urgency]?.emoji} ${logData.urgency}` },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', marginTop: 2 }}>{val}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Detected Symptoms</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {(logData.symptoms || []).map(s => <span key={s} className="symptom-chip">{s}</span>)}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65, borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 14 }}>
            <strong>AI Summary:</strong> {logData.summary}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-g" onClick={saveLog} style={{ flex: 1, padding: '10px', fontSize: 13 }}>💾 Save to Timeline</button>
            <button className="btn-p" onClick={() => shareToFeed({ transcript, logData, id: Date.now(), createdAt: '' })} style={{ flex: 1, padding: '10px', borderRadius: 50, fontSize: 13 }}>📤 Share to Feed</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {logs.length > 0 && (
        <div className="ai-card fu">
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 18 }}>📅 Health Timeline</p>
          {logs.map((entry) => {
            const meta = URGENCY_META[entry.logData.urgency] || URGENCY_META.routine;
            return (
              <div key={entry.id} className="timeline-node">
                <div className="timeline-dot" style={{ background: meta.dotBg, borderColor: meta.dotColor }}>
                  {TONE_EMOJI[entry.logData.emotionalTone] || '😐'}
                </div>
                <div className="timeline-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{entry.logData.summary}</p>
                    <span className={`urgency-badge ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {(entry.logData.symptoms || []).map(s => <span key={s} className="symptom-chip" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>⏱ {entry.logData.duration} · {entry.createdAt}</p>
                    <button className="action-btn" onClick={() => shareToFeed(entry)} style={{ fontSize: 11, padding: '4px 10px' }}>📤 Share</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {logs.length === 0 && recState === 'idle' && !logData && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🎙️</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No voice logs yet</p>
          <p style={{ fontSize: 13 }}>Record your symptoms and build your personal health timeline</p>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   EMPATHETIC AVATAR (Floating Chat)
════════════════════════════════════════════════════════════════ */
const EmpathicAvatar = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! 👋 I\'m Svasthya AI. I can help you understand health terms, draft posts, or guide you through the community. What\'s on your mind?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const history = messages.filter(m => m.role !== 'ai' || messages.indexOf(m) > 0)
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const reply = await chatWithAvatar(history, msg);
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      // Browser TTS for accessibility
      if ('speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(reply);
        utt.rate = 0.95; utt.pitch = 1.05;
        utt.onstart = () => setSpeaking(true);
        utt.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utt);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I had trouble connecting. Please try again in a moment.' }]);
    }
    setLoading(false);
  };

  const stopSpeech = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  return (
    <>
      {/* FAB */}
      <button className="avatar-fab" onClick={() => setOpen(o => !o)} title="Chat with Svasthya AI" style={{ bottom: open ? 'calc(148px + 520px + 12px)' : undefined }}>
        {open ? (
          <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="avatar-drawer">
          {/* Header */}
          <div className="avatar-header">
            <div className="avatar-face" style={{ position: 'relative' }}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="16" r="10" fill="rgba(255,255,255,.9)"/>
                <circle cx="16" cy="15" r="2" fill="#007a6e"/>
                <circle cx="24" cy="15" r="2" fill="#007a6e"/>
                <path d="M15 20 Q20 24 25 20" stroke="#007a6e" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                <circle cx="20" cy="30" r="8" fill="rgba(255,255,255,.7)"/>
              </svg>
              {speaking && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: '#22c55e', borderRadius: '50%', border: '2px solid white', animation: 'pulseGlow .8s infinite' }}/>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Svasthya AI</p>
              <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 11 }}>{loading ? 'Thinking…' : speaking ? '🔊 Speaking…' : 'Your health companion'}</p>
            </div>
            {speaking && (
              <button onClick={stopSpeech} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: 11 }}>⏹ Stop</button>
            )}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble ai">
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <div className="translator-dot"/><div className="translator-dot"/><div className="translator-dot"/>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about symptoms, terms, or how to post…"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#00a896,#007a6e)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() || loading ? .5 : 1 }}
            >
              <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>

          <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '0 12px 8px' }}>
            Not a substitute for medical advice · Emergency: 112
          </p>
        </div>
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   LEFT SIDEBAR
════════════════════════════════════════════════════════════════ */
const LeftSidebar = ({activePage, setPage}) => {
  const {user, logout, theme, toggleTheme} = useApp();
  const isDoc = user?.role==="doctor";

  const navItems = [
    {id:"feed",   label:"Home Feed",    icon:IC.home},
    {id:"search", label:"Search / Tags",icon:IC.search},
    {id:"doctors",label:"Doctors Only", icon:IC.steth},
    ...(isDoc ? [] : [{id:"consult",label:"AI Summariser",icon:IC.brain}]),
    {id:"outbreak",label:"Outbreak Map",icon:IC.mapPin},
    ...(isDoc ? [] : [{id:"tests",label:"Book Tests",icon:IC.calendar}]),
    ...(isDoc ? [{id:"dashboard",label:"Dashboard",icon:IC.clipboard}] : []),
    {id:"trends",label:"Health Trends",icon:IC.trend},
    {id:"voicelog",label:"Voice Log",icon:(
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    )},
    {id:"profile",label:"My Profile",   icon:IC.user},
  ];

  return (
    <div className="left-rail">
      <div style={{padding:"22px 20px 14px",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#00a896,#007a6e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,168,150,0.3)"}}>
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <span className="nav-logo-text" style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:20,fontWeight:400,color:"var(--text)",letterSpacing:"-.01em",}}>Svasthya</span>
        </div>
      </div>
      <nav style={{padding:"12px 12px",flex:1}}>
        {navItems.map(item=>(
          <button key={item.id} className={`nav-item ${activePage===item.id?"active":""}`}
            onClick={()=>setPage(item.id)}>
            <div className="ni-dot"/>
            <span style={{flexShrink:0}}>{item.icon}</span>
            <span>{item.label}</span>
            {item.id==="doctors"&&isDoc&&(
              <span style={{marginLeft:"auto",fontSize:10,background:"var(--teal)",color:"#fff",padding:"1px 6px",borderRadius:20,fontWeight:700}}>MD</span>
            )}
          </button>
        ))}
      </nav>
      <div style={{padding:"14px 14px",borderTop:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:14,background:"var(--surface2)",marginBottom:8}}>
          <Av init={user?.avatar||"?"} sz={36} dot={user?.online}/>
          <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <p style={{fontWeight:700,fontSize:13,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</p>
            <p style={{fontSize:11,color:isDoc?"var(--teal2)":"#b45309"}}>{isDoc?`🩺 ${user.specialty||"Doctor"}`:"🧑 Patient"}</p>
          </div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} style={{marginBottom:8}}>
          {theme==="dark" ? (
            <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>Light Mode</span></>
          ) : (
            <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark Mode</span></>
          )}
        </button>
        <button className="nav-item" onClick={logout} style={{color:"#ef4444",borderRadius:12}}>
          <span style={{flexShrink:0}}>{IC.logout}</span>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
════════════════════════════════════════════════════════════════ */
const MobileBottomNav = ({activePage, setPage}) => {
  const {user, logout, theme, toggleTheme} = useApp();
  const [showMore, setShowMore] = useState(false);
  const isDoc = user?.role==="doctor";

  const primaryNav = [
    {id:"feed", label:"Home", icon:IC.home},
    {id:"search", label:"Search", icon:IC.search},
    ...(isDoc ? [{id:"doctors", label:"Doctors", icon:IC.steth}] : [{id:"consult", label:"AI", icon:IC.brain}]),
    {id:"profile", label:"Profile", icon:IC.user},
  ];

  const moreItems = [
    ...(isDoc ? [] : [{id:"doctors", label:"Doctors Only", icon:IC.steth}]),
    {id:"outbreak", label:"Outbreak Map", icon:IC.mapPin},
    ...(isDoc ? [] : [{id:"tests", label:"Book Tests", icon:IC.calendar}]),
    ...(isDoc ? [{id:"dashboard", label:"Dashboard", icon:IC.clipboard}] : []),
    {id:"trends", label:"Health Trends", icon:IC.trend},
  ];

  return (
    <>
      <div className="mobile-bottom-nav">
        {primaryNav.map(item=>(
          <button key={item.id} className={`mobile-nav-btn ${activePage===item.id?"active":""}`}
            onClick={()=>{setPage(item.id);setShowMore(false);}}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <button className={`mobile-nav-btn ${showMore?"active":""}`}
          onClick={()=>setShowMore(!showMore)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
          <span>More</span>
        </button>
      </div>
      {showMore && (
        <>
          <div className="mobile-menu-overlay" onClick={()=>setShowMore(false)}/>
          <div className="mobile-menu-drawer">
            <div className="mobile-menu-handle"/>
            {moreItems.map(item=>(
              <button key={item.id} className={`nav-item ${activePage===item.id?"active":""}`}
                onClick={()=>{setPage(item.id);setShowMore(false);}}>
                <span style={{flexShrink:0}}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <div style={{borderTop:"1px solid var(--border)",margin:"10px 0",padding:"10px 0"}}>
              <button className="theme-toggle" onClick={toggleTheme} style={{marginBottom:8}}>
                {theme==="dark" ? (
                  <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>Light Mode</span></>
                ) : (
                  <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark Mode</span></>
                )}
              </button>
              <button className="nav-item" onClick={()=>{logout();setShowMore(false);}} style={{color:"#ef4444",borderRadius:12}}>
                <span style={{flexShrink:0}}>{IC.logout}</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   RIGHT SIDEBAR
════════════════════════════════════════════════════════════════ */
const RightSidebar = ({onHashtagClick}) => {
  const {posts} = useApp();

  const trendLabels = ["🔥 Hot","📈 Rising","💬 Active","⚡ Trending","🌊 Surging","✨ Popular"];
  const trendColors = ["#ef4444","#f59e0b","#00a896","#8b5cf6","#1a73e8","#ec4899"];

  const trending = HASHTAGS.map(h=>{
    const realCount = posts.filter(p=>p.tags?.includes(h)||p.content.toLowerCase().includes(h.replace("#",""))).length;
    return {tag:h, count:realCount};
  }).sort((a,b)=>b.count-a.count).slice(0,6);

  const maxTrend = Math.max(...trending.map(t=>t.count),1);

  const tips = [
    {icon:"💧",text:"Drink 8 glasses of water daily"},
    {icon:"🚶",text:"30 minutes of walking reduces heart disease risk by 30%"},
    {icon:"😴",text:"7–9 hours of sleep boosts immunity significantly"},
    {icon:"🥦",text:"Eat 5 servings of fruits/vegetables daily"},
  ];

  return (
    <div className="right-rail">
      <div style={{position:"relative",marginBottom:20}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}>{IC.search}</span>
        <input className="inp" placeholder="Search Svasthya…" style={{paddingLeft:40,fontSize:13}}/>
      </div>
      <div style={{background:"var(--surface2)",borderRadius:18,border:"1px solid var(--border)",marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
          {IC.trend}
          <span style={{fontFamily:"var(--font-b)",fontWeight:800,fontSize:14,color:"var(--text)"}}>Trending Topics</span>
        </div>
        {trending.map((t,i)=>(
          <div key={t.tag} className="trend-card" style={{borderRadius:0,border:"none",borderBottom:"1px solid var(--border)"}}
            onClick={()=>onHashtagClick&&onHashtagClick(t.tag)}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <p style={{fontSize:11,color:"var(--text3)"}}>#{i+1} · Health</p>
              <span style={{fontSize:10,fontWeight:700,color:trendColors[i],background:`${trendColors[i]}15`,padding:"2px 7px",borderRadius:10}}>{trendLabels[i]}</span>
            </div>
            <p style={{fontWeight:700,fontSize:13.5,color:"var(--text)",marginBottom:5}}>{t.tag}</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:4,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                <div style={{width:`${(t.count/maxTrend)*100}%`,height:"100%",background:`linear-gradient(90deg,${trendColors[i]},${trendColors[i]}88)`,borderRadius:4,transition:"width .6s"}}/>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:trendColors[i],minWidth:28,textAlign:"right"}}>{t.count} posts</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"linear-gradient(135deg,rgba(0,168,150,.06),rgba(26,115,232,.04))",borderRadius:16,border:"1px solid rgba(0,168,150,.2)",padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
          {IC.spark}
          <span style={{fontFamily:"var(--font-b)",fontWeight:800,fontSize:13,color:"var(--text)"}}>Daily Health Tips</span>
        </div>
        {tips.map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10,padding:"8px 10px",background:"var(--tip-card-bg)",borderRadius:10}}>
            <span style={{fontSize:18,flexShrink:0}}>{t.icon}</span>
            <p style={{fontSize:12.5,color:"var(--text2)",lineHeight:1.5}}>{t.text}</p>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,padding:"10px 12px",background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:12,display:"flex",gap:7,alignItems:"flex-start"}}>
        {IC.alert}
        <p style={{fontSize:11.5,color:"var(--disclaimer-text)",lineHeight:1.5}}>Svasthya is for informational guidance only and does not replace professional medical advice.</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   FEED PAGE
════════════════════════════════════════════════════════════════ */
const FeedPage = ({onHashtagClick, onProfileClick}) => {
  const {user, posts} = useApp();
  const feedPosts = posts.filter(p=>p.type!=="doctor_post"||user?.role==="doctor");

  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:"0 16px 80px"}}>
      <div style={{position:"sticky",top:0,zIndex:19,background:"var(--bg-blur)",backdropFilter:"blur(12px)",padding:"14px 0 10px",borderBottom:"1px solid var(--border)",marginBottom:0}}>
        <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Home Feed</h1>
        <p style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{feedPosts.length} posts from your community</p>
      </div>
      <Composer/>
      {user?.role==="doctor"&&(
        <div className="doc-banner fu" style={{margin:"12px 0"}}>
          <span style={{fontSize:24}}>🩺</span>
          <div>
            <p style={{fontWeight:700,fontSize:13.5,color:"var(--teal2)"}}>Welcome, Dr. {user.name.split(" ").slice(-1)[0]}</p>
            <p style={{fontSize:12,color:"var(--text2)",marginTop:2}}>Expand posts below to leave verified medical guidance. Your expertise helps thousands of patients.</p>
          </div>
        </div>
      )}
      <div style={{marginTop:12}}>
        {feedPosts.map((p,i)=>(
          <PostCard key={p.id} post={p} idx={i}
            onHashtagClick={onHashtagClick}
            onProfileClick={onProfileClick}/>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   SEARCH / HASHTAG PAGE
════════════════════════════════════════════════════════════════ */
const SearchPage = ({initialTag, onProfileClick}) => {
  const {posts} = useApp();
  const [query, setQuery] = useState(initialTag||"");
  const [activeTag, setActiveTag] = useState(initialTag||null);

  const filtered = posts.filter(p=>{
    const q = (activeTag||query).toLowerCase();
    if(!q) return true;
    return p.content.toLowerCase().includes(q) || p.tags?.some(t=>t.toLowerCase().includes(q.replace("#","")));
  });

  const selectTag = (t) => {
    setActiveTag(t===activeTag?null:t);
    setQuery("");
  };

  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:"0 16px 80px"}}>
      <div style={{position:"sticky",top:0,zIndex:19,background:"var(--bg-blur)",backdropFilter:"blur(12px)",padding:"14px 0 12px",borderBottom:"1px solid var(--border)"}}>
        <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",marginBottom:12}}>Search</h1>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}>{IC.search}</span>
          <input className="inp" value={query} onChange={e=>{setQuery(e.target.value);setActiveTag(null);}}
            placeholder="Search posts, symptoms, hashtags…"
            style={{paddingLeft:44,background:"var(--surface)",borderRadius:50}}/>
          {query&&<button onClick={()=>setQuery("")} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}>{IC.close}</button>}
        </div>
      </div>
      <div style={{padding:"16px 0",borderBottom:"1px solid var(--border)",marginBottom:16}}>
        <p style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:10}}>Popular Topics</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {HASHTAGS.map(h=>(
            <button key={h} className={`hashtag-pill ${activeTag===h?"active":""}`}
              onClick={()=>selectTag(h)}>
              <span style={{fontSize:13}}>#</span>{h.replace("#","")}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <p style={{fontSize:13,color:"var(--text2)"}}>
          {activeTag||query
            ? <><strong style={{color:"var(--text)"}}>{filtered.length}</strong> results for <strong style={{color:"var(--teal2)"}}>{activeTag||query}</strong></>
            : <><strong style={{color:"var(--text)"}}>{filtered.length}</strong> total posts</>
          }
        </p>
        {(activeTag||query)&&<button className="btn-g" style={{padding:"5px 12px",fontSize:12}} onClick={()=>{setActiveTag(null);setQuery("")}}>Clear</button>}
      </div>
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"64px 32px",color:"var(--text3)"}}>
          <div style={{fontSize:48,marginBottom:14,animation:"float 3s ease-in-out infinite"}}>🔍</div>
          <p style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:20,color:"var(--text2)",marginBottom:6}}>No results found</p>
          <p style={{fontSize:13}}>Try a different search term or hashtag</p>
        </div>
      ):(
        filtered.map((p,i)=><PostCard key={p.id} post={p} idx={i} onProfileClick={onProfileClick}
          onHashtagClick={t=>{setActiveTag(t);setQuery("")}}/>)
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   DOCTORS ONLY PAGE
════════════════════════════════════════════════════════════════ */
const DoctorsPage = ({onHashtagClick, onProfileClick}) => {
  const {user, posts} = useApp();
  const isDoc = user?.role==="doctor";
  const docPosts = posts.filter(p=>p.type==="doctor_post");

  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:"0 16px 80px"}}>
      <div style={{position:"sticky",top:0,zIndex:19,background:"var(--bg-blur)",backdropFilter:"blur(12px)",padding:"14px 0 10px",borderBottom:"1px solid var(--border)",marginBottom:0}}>
        <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Knowledge Hub</h1>
        <p style={{fontSize:12,color:"var(--text3)",marginTop:2}}>Medical knowledge shared by verified doctors</p>
      </div>
      <div style={{margin:"16px 0",background:"linear-gradient(135deg,rgba(0,168,150,.08),rgba(26,115,232,.05))",border:"1.5px solid rgba(0,168,150,.2)",borderRadius:16,padding:"18px 20px",display:"flex",gap:14,alignItems:"flex-start"}} className="fu">
        <div style={{width:44,height:44,background:"linear-gradient(135deg,#00a896,#007a6e)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🩺</div>
        <div>
          <p style={{fontFamily:"var(--font-b)",fontWeight:800,fontSize:14,color:"var(--teal2)",marginBottom:4}}>
            {isDoc ? "Doctors-Only Knowledge Feed" : "Medical Knowledge Base"}
          </p>
          <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.55}}>
            {isDoc
              ? "Share evidence-based medical knowledge with the community. Your posts will be marked as verified physician content."
              : "Read verified medical content from our network of doctors. Only verified physicians can post here."}
          </p>
          {!isDoc&&<p style={{fontSize:12,color:"var(--text3)",marginTop:6,}}>💡 Patients can read and bookmark but cannot post in this section.</p>}
        </div>
      </div>
      {isDoc&&<Composer defaultType="doctor_post" placeholder="Share medical knowledge, disease info, prevention tips…"/>}
      <div style={{marginTop:12}}>
        {docPosts.length===0?(
          <div style={{textAlign:"center",padding:"64px 32px",color:"var(--text3)"}}>
            <div style={{fontSize:48,marginBottom:14,animation:"float 3s ease-in-out infinite"}}>📚</div>
            <p style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:20,color:"var(--text2)",marginBottom:6}}>No knowledge posts yet</p>
            {isDoc&&<p style={{fontSize:13}}>Be the first to share medical knowledge!</p>}
          </div>
        ):(
          docPosts.map((p,i)=><PostCard key={p.id} post={p} idx={i}
            onHashtagClick={onHashtagClick} onProfileClick={onProfileClick}/>)
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   EDIT PROFILE MODAL
════════════════════════════════════════════════════════════════ */
const EditProfileModal = ({profileUser, onClose, onSave, currentData}) => {
  const fileRef = useRef(null);
  const [name, setName] = useState(currentData.name || profileUser?.name || "");
  const [bio, setBio] = useState(currentData.bio || profileUser?.bio || "");
  const [specialty, setSpecialty] = useState(currentData.specialty || profileUser?.specialty || "");
  const [phone, setPhone] = useState(currentData.phone || "");
  const [pic, setPic] = useState(currentData.profilePic || null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isDoc = profileUser?.role === "doctor";

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPic(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const removePic = () => setPic(null);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave({ name: name.trim() || profileUser?.name, bio: bio.trim(), specialty: specialty.trim(), phone: phone.trim(), profilePic: pic });
    setSaving(false);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ padding: 0, maxWidth: 500 }}>
        <div style={{ background: "linear-gradient(135deg,#00a896,#007a6e)", padding: "20px 28px", borderRadius: "28px 28px 0 0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {IC.edit}
            <span style={{ fontSize: 18, fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",  fontWeight: 300 }}>Edit Profile</span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{IC.close}</button>
        </div>

        <div className="edit-profile-form">
          {/* Profile Photo */}
          <div>
            <label>Profile Photo</label>
            <div className="edit-photo-area"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}>
              <div className="photo-preview" style={{ border: dragOver ? "3px solid var(--teal)" : undefined }}>
                {pic
                  ? <img src={pic} alt="Profile" />
                  : <div className="initials-fallback" style={{ background: avColor(profileUser?.avatar || "?") }}>
                      {(profileUser?.avatar || "?").slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              <div className="photo-actions">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleInputChange} style={{ display: "none" }} />
                <button className="btn-p" onClick={() => fileRef.current?.click()} style={{ padding: "8px 16px", fontSize: 12, borderRadius: 50 }}>
                  {IC.camera} Upload Photo
                </button>
                {pic && (
                  <button className="btn-g" onClick={removePic} style={{ padding: "6px 14px", fontSize: 12 }}>
                    {IC.trash} Remove
                  </button>
                )}
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.4 }}>JPG, PNG under 2MB. Drag & drop supported.</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label>Full Name</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>

          {/* Specialty (doctors only) */}
          {isDoc && (
            <div>
              <label>Specialty</label>
              <input className="inp" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Cardiologist, Neurologist" />
            </div>
          )}

          {/* Bio */}
          <div>
            <label>Bio</label>
            <textarea className="inp" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community about yourself…" rows={3} style={{ resize: "none" }} />
          </div>

          {/* Phone */}
          <div>
            <label>Phone Number (optional)</label>
            <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <button className="btn-g" onClick={onClose} style={{ padding: "10px 20px" }}>Cancel</button>
            <button className="btn-p" onClick={save} disabled={saving} style={{ padding: "10px 24px", borderRadius: 50, fontSize: 13.5 }}>
              {saving ? <><Spinner /> Saving…</> : <>{IC.check} Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   PROFILE PAGE
════════════════════════════════════════════════════════════════ */
const ProfilePage = ({profileUserId, onHashtagClick}) => {
  const {user, posts, bookAppointment, getProfileData, updateProfile, toggleFollow, isFollowing} = useApp();
  const baseUser = USERS.find(u=>u.id===profileUserId) || user;
  const profileData = getProfileData ? getProfileData(baseUser?.id) : {};
  const profileUser = {...baseUser, ...profileData, avatar: baseUser?.avatar};
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const isDoc = profileUser?.role==="doctor";
  const isOwnProfile = profileUser?.id===user?.id;
  const profilePic = profileData?.profilePic || null;

  const userPosts = posts.filter(p=>p.userId===profileUser?.id);
  const savedPosts = posts.filter(p=>p.saved);
  const patientReports = SYMPTOM_REPORTS.filter(r=>r.patientId===profileUser?.id);
  const totalUpvotes = userPosts.reduce((sum, post) => sum + (post.likes || 0), 0);

  const handleSaveProfile = (data) => {
    if (updateProfile) updateProfile(baseUser?.id, data);
  };

  // Get current user's profile pic for display
  const getProfilePic = (userId) => {
    if (getProfileData) {
      const pd = getProfileData(userId);
      return pd?.profilePic || null;
    }
    return null;
  };

  const joinedDate = "January 2024"; // simulated since no real backend

  return (
    <div style={{maxWidth:600,margin:"0 auto",paddingBottom:80}}>
      <div className="profile-cover fu">
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:.15}}>
          <svg viewBox="0 0 200 200" style={{width:200,height:200}}><path fill="white" d="M100 0C44.8 0 0 44.8 0 100s44.8 100 100 100 100-44.8 100-100S155.2 0 100 0zm0 30c16.5 0 30 13.5 30 30s-13.5 30-30 30-30-13.5-30-30 13.5-30 30-30zm0 142c-25 0-47.2-12.5-60.8-31.7C52.3 124.3 74.5 118 100 118s47.7 6.3 60.8 22.3C147.2 159.5 125 172 100 172z"/></svg>
        </div>
      </div>
      <div style={{padding:"0 20px",background:"var(--surface)",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:-24,marginBottom:14}}>
          <div style={{boxShadow:"0 0 0 4px #fff",borderRadius:"50%",position:"relative"}}>
            <Av init={profileUser?.avatar||"?"} sz={72} ring={isDoc} pic={profilePic}/>
            {isOwnProfile && (
              <div onClick={()=>setShowEditModal(true)}
                style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:"var(--teal)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
                <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            {isDoc && !isOwnProfile && bookAppointment && (
              <button className="btn-p" onClick={()=>bookAppointment(profileUser.id)} style={{padding:"8px 18px",borderRadius:50}}>📅 Book Appointment</button>
            )}
            {isOwnProfile
              ? <button className="btn-g" onClick={()=>setShowEditModal(true)} style={{padding:"7px 18px"}}>{IC.edit} Edit Profile</button>
              : <button className="btn-p" onClick={()=>toggleFollow(profileUser.id)}
                  style={{padding:"8px 20px",background:isFollowing(profileUser.id)?"transparent":undefined,border:isFollowing(profileUser.id)?"1.5px solid var(--teal)":undefined,color:isFollowing(profileUser.id)?"var(--teal)":undefined}}>
                  {isFollowing(profileUser.id)?"Following ✓":"Follow"}
                </button>
            }
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:4}}>
            <h2 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)"}}>{profileUser?.name}</h2>
            {isDoc&&<span className="badge-doc">{IC.shield} Verified MD</span>}
          </div>
          {isDoc&&<p style={{fontSize:13,color:"var(--teal2)",marginBottom:4}}>🩺 {profileUser?.specialty}{profileUser?.location ? ` · 📍 ${profileUser.location}` : ""}</p>}
          <p style={{fontSize:14,color:"var(--text2)",lineHeight:1.55,marginBottom:10}}>{profileUser?.bio}</p>
          <div style={{display:"flex",gap:20,marginBottom:12}}>
            {[["Posts",userPosts.length],["Followers",profileUser?.followers||0],["Following",profileUser?.following||0], ...(isDoc ? [["Upvotes", totalUpvotes]] : [])].map(([l,v])=>(
              <div key={l}>
                <span style={{fontWeight:800,fontSize:16,color:"var(--text)"}}>{typeof v==="number"&&v>999?`${(v/1000).toFixed(1)}k`:v}</span>
                <span style={{fontSize:12.5,color:"var(--text3)",marginLeft:4}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:0,borderTop:"1px solid var(--border)"}}>
          {[["posts","Posts"],["account","Account"],["saved","Saved"],["history","History"]].map(([id,label])=>(
            <button key={id} onClick={()=>setActiveTab(id)}
              style={{flex:1,padding:"12px 0",background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"var(--font-b)",color:activeTab===id?"var(--teal)":"var(--text3)",borderBottom:`2px solid ${activeTab===id?"var(--teal)":"transparent"}`,transition:"all .2s"}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 16px"}}>
        {activeTab==="posts"&&(
          userPosts.length===0
            ? <div style={{textAlign:"center",padding:"48px",color:"var(--text3)"}}><div style={{fontSize:40,marginBottom:12}}>📝</div><p style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:18,color:"var(--text2)"}}>No posts yet</p></div>
            : userPosts.map((p,i)=><PostCard key={p.id} post={p} idx={i} onHashtagClick={onHashtagClick}/>)
        )}
        {activeTab==="account"&&(
          <div className="fu">
            <div className="account-card si">
              <div className="account-card-header">
                <span style={{fontSize:18}}>👤</span>
                <h3>Account Details</h3>
              </div>
              <div className="account-row">
                <div className="account-row-icon" style={{background:"var(--teal-bg)"}}>{IC.user}</div>
                <div className="account-row-content">
                  <div className="account-row-label">Full Name</div>
                  <div className="account-row-value">{profileUser?.name}</div>
                </div>
              </div>
              <div className="account-row">
                <div className="account-row-icon" style={{background:"rgba(26,115,232,.08)"}}>{IC.mail}</div>
                <div className="account-row-content">
                  <div className="account-row-label">Email Address</div>
                  <div className="account-row-value">{profileUser?.email || "—"}</div>
                </div>
              </div>
              <div className="account-row">
                <div className="account-row-icon" style={{background:"rgba(245,158,11,.08)"}}>{IC.badge}</div>
                <div className="account-row-content">
                  <div className="account-row-label">Role</div>
                  <div className="account-row-value" style={{display:"flex",alignItems:"center",gap:8}}>
                    {isDoc
                      ? <span className="badge-doc">{IC.shield} Verified Doctor</span>
                      : <span className="badge-pat">Patient</span>
                    }
                  </div>
                </div>
              </div>
              {isDoc && (
                <div className="account-row">
                  <div className="account-row-icon" style={{background:"var(--teal-bg)"}}>{IC.steth}</div>
                  <div className="account-row-content">
                    <div className="account-row-label">Specialty</div>
                    <div className="account-row-value">{profileUser?.specialty || "—"}</div>
                  </div>
                </div>
              )}
              {profileData?.phone && (
                <div className="account-row">
                  <div className="account-row-icon" style={{background:"rgba(139,92,246,.08)"}}>{IC.phone}</div>
                  <div className="account-row-content">
                    <div className="account-row-label">Phone</div>
                    <div className="account-row-value">{profileData.phone}</div>
                  </div>
                </div>
              )}
              <div className="account-row">
                <div className="account-row-icon" style={{background:"rgba(236,72,153,.08)"}}>{IC.calendar}</div>
                <div className="account-row-content">
                  <div className="account-row-label">Joined</div>
                  <div className="account-row-value">{joinedDate}</div>
                </div>
              </div>
              <div className="account-row">
                <div className="account-row-icon" style={{background:"rgba(34,197,94,.08)"}}>{IC.activity}</div>
                <div className="account-row-content">
                  <div className="account-row-label">Activity</div>
                  <div className="account-row-value">{userPosts.length} posts · {profileUser?.followers||0} followers</div>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <div style={{background:"linear-gradient(135deg,rgba(0,168,150,.06),rgba(26,115,232,.04))",borderRadius:16,border:"1px solid rgba(0,168,150,.2)",padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}} className="fu s2">
                <span style={{fontSize:24}}>💡</span>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,fontSize:13,color:"var(--teal2)",marginBottom:3}}>Keep your profile updated</p>
                  <p style={{fontSize:12.5,color:"var(--text2)",lineHeight:1.5}}>Upload a profile picture and complete your details to build trust with the community.</p>
                </div>
                <button className="btn-p" onClick={()=>setShowEditModal(true)} style={{padding:"8px 16px",borderRadius:50,fontSize:12,flexShrink:0}}>
                  {IC.edit} Edit
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab==="saved"&&(
          savedPosts.length===0
            ? <div style={{textAlign:"center",padding:"48px",color:"var(--text3)"}}><div style={{fontSize:40,marginBottom:12}}>🔖</div><p style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:18,color:"var(--text2)"}}>Nothing saved yet</p><p style={{fontSize:13,marginTop:6}}>Bookmark posts to read them later</p></div>
            : savedPosts.map((p,i)=><PostCard key={p.id} post={p} idx={i} onHashtagClick={onHashtagClick}/>)
        )}
        {activeTab==="history"&&(
          patientReports.length===0
            ? <div style={{textAlign:"center",padding:"48px",color:"var(--text3)"}}><div style={{fontSize:40,marginBottom:12}}>📋</div><p style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:18,color:"var(--text2)"}}>No medical history yet</p></div>
            : patientReports.map((r,i)=>(
              <div key={r.id} className={`ai-card fu s${Math.min(i+1,6)}`} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span className={`triage-badge triage-${r.triage}`}>{r.triage} priority</span>
                    <span style={{fontSize:12,color:"var(--text3)"}}>{r.city}</span>
                  </div>
                  <span style={{fontSize:11,color:"var(--text3)"}}>{ago(r.createdAt)}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {r.symptoms.map(s=><span key={s} className="symptom-chip">{s}</span>)}
                </div>
                <p style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:4}}>Severity: {r.severity} · Duration: {r.duration}</p>
                <div className="ai-card accent-blue" style={{marginTop:8,marginBottom:r.doctorNotes?8:0}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#1558b0",textTransform:"uppercase",marginBottom:4}}>AI Summary</p>
                  <p style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.aiSummary}</p>
                </div>
                {r.doctorNotes && (
                  <div className="ai-card accent-gold">
                    <p style={{fontSize:11,fontWeight:700,color:"#b45309",textTransform:"uppercase",marginBottom:4}}>Doctor Notes</p>
                    <p style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.doctorNotes}</p>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
      {showEditModal && (
        <EditProfileModal
          profileUser={baseUser}
          currentData={profileData}
          onClose={()=>setShowEditModal(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   AI CONSULTATION SUMMARIZER
════════════════════════════════════════════════════════════════ */
const AI_DB = {
  "fever":{diag:"Possible viral/bacterial infection",tests:"CBC, blood culture, chest X-ray if persistent"},
  "cough":{diag:"Upper/lower respiratory tract involvement",tests:"Chest X-ray, sputum culture, pulmonary function test"},
  "headache":{diag:"Could indicate tension headache, migraine, or secondary cause",tests:"BP monitoring, neurological exam, CT scan if severe"},
  "chest pain":{diag:"Cardiac or musculoskeletal origin to be evaluated",tests:"ECG, Troponin levels, chest X-ray, echocardiogram"},
  "fatigue":{diag:"Systemic cause — anemia, thyroid, infection, or lifestyle",tests:"CBC, thyroid panel (TSH, T3, T4), vitamin D & B12 levels"},
  "dizziness":{diag:"Vestibular, cardiovascular, or neurological etiology",tests:"BP monitoring (orthostatic), audiometry, MRI if persistent"},
  "nausea":{diag:"GI disturbance, hepatobiliary, or medication side effect",tests:"Liver function tests, abdominal ultrasound, H. pylori test"},
  "rash":{diag:"Dermatological — allergic, infectious, or autoimmune",tests:"Skin patch test, IgE levels, biopsy if chronic"},
  "joint pain":{diag:"Inflammatory or degenerative joint disease",tests:"ESR, CRP, Rheumatoid factor, X-ray of affected joint"},
  "breathing difficulty":{diag:"Pulmonary or cardiac compromise",tests:"Pulse oximetry, chest X-ray, spirometry, ABG analysis"},
  "sore throat":{diag:"Pharyngitis — viral or streptococcal",tests:"Rapid strep test, throat culture, CBC"},
  "stomach pain":{diag:"GI origin — gastritis, ulcer, or functional",tests:"Abdominal ultrasound, H. pylori breath test, endoscopy if chronic"},
  "back pain":{diag:"Musculoskeletal or spinal pathology",tests:"X-ray spine, MRI if neurological symptoms, ESR"},
  "insomnia":{diag:"Sleep disorder — primary or secondary to anxiety/depression",tests:"Sleep diary assessment, thyroid panel, mental health screening"},
};

const ConsultationPage = () => {
  const {user} = useApp();
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("3 days");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if(!description.trim()) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,1800));
    
    // Extract keywords
    const extractedSymptoms = [];
    const textLower = description.toLowerCase();
    
    Object.keys(AI_DB).forEach(k => {
      if(textLower.includes(k)) extractedSymptoms.push(k);
    });
    
    if(extractedSymptoms.length === 0) {
      extractedSymptoms.push("general discomfort");
    }

    const matches = extractedSymptoms.map(s=>{
      const key = Object.keys(AI_DB).find(k=>s.includes(k));
      return key ? {symptom:s,...AI_DB[key]} : {symptom:s,diag:"Requires clinical evaluation",tests:"General physical examination recommended"};
    });
    
    const diagSet = [...new Set(matches.map(m=>m.diag))];
    const testSet = [...new Set(matches.flatMap(m=>m.tests.split(", ")))];
    
    setResult({
      symptoms: extractedSymptoms,
      duration,
      diagnoses: diagSet,
      tests: testSet,
      urgency: textLower.includes("chest")||textLower.includes("breathing")||textLower.includes("severe") ? "high" : extractedSymptoms.length>=3 ? "moderate" : "low"
    });
    setLoading(false);
  };

  const copyResult = () => {
    if(!result) return;
    const txt = `PATIENT CONSULTATION SUMMARY\n\nSymptoms (${result.duration}):\n${result.symptoms.map(s=>`• ${s}`).join("\n")}\n\nAI Assessment:\n${result.diagnoses.map(d=>`→ ${d}`).join("\n")}\n\nRecommended Tests:\n${result.tests.map(t=>`• ${t}`).join("\n")}\n\nUrgency: ${result.urgency.toUpperCase()}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const durations = ["1 day","3 days","1 week","2 weeks","1 month","Recurring"];

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(139,92,246,0.3)"}}>{IC.brain}</div>
          <div>
            <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>AI Summariser</h1>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:1}}>Structured symptom summary for doctors</p>
          </div>
        </div>
      </div>

      <div className="ai-card accent-purple fu">
        <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16}}>
          <span style={{fontSize:28}}>🩺</span>
          <div>
            <p style={{fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:4}}>Describe Your Problem</p>
            <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.55}}>Describe everything you're experiencing in detail. The AI will extract key symptoms and create a summary for your doctor.</p>
          </div>
        </div>

        <div style={{marginTop:8}}>
          <textarea className="inp" value={description} onChange={e=>{setDescription(e.target.value);setResult(null);}}
            placeholder="e.g. I have been having a severe throbbing headache since yesterday morning and feeling a bit nauseous..."
            rows={4} style={{resize:"vertical",lineHeight:1.6}}/>
        </div>

        <div style={{marginTop:16}}>
          <p style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>Duration</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {durations.map(d=>(
              <button key={d} className={`duration-btn ${duration===d?"active":""}`}
                onClick={()=>setDuration(d)}>{d}</button>
            ))}
          </div>
        </div>

        <button className="btn-p" onClick={generate}
          disabled={!description.trim()||loading}
          style={{marginTop:18,padding:"12px 28px",fontSize:14,width:"100%",borderRadius:50}}>
          {loading ? <><Spinner/> Analyzing problem…</> : <>🧠 Generate AI Summary</>}
        </button>
      </div>

      {loading && (
        <div className="ai-loading fi">
          <div className="ai-loading-bar"/>
          <p style={{fontSize:13,color:"var(--text3)",fontWeight:600}}>AI is analyzing your symptoms…</p>
        </div>
      )}

      {result && !loading && (
        <div className="ai-result-box fu">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>📋</span>
              <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:19,fontWeight:400}}>Consultation Summary</h3>
            </div>
            <button className="btn-g" onClick={copyResult} style={{padding:"6px 14px",fontSize:12}}>
              {copied ? <>{IC.check} Copied!</> : <>{IC.clipboard} Copy</>}
            </button>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",padding:"3px 10px",borderRadius:20,
              background:result.urgency==="high"?"rgba(239,68,68,.1)":result.urgency==="moderate"?"rgba(245,158,11,.1)":"rgba(34,197,94,.1)",
              color:result.urgency==="high"?"#dc2626":result.urgency==="moderate"?"#b45309":"#15803d",
              border:`1px solid ${result.urgency==="high"?"rgba(239,68,68,.3)":result.urgency==="moderate"?"rgba(245,158,11,.3)":"rgba(34,197,94,.3)"}`
            }}>
              {result.urgency==="high"?"🔴 High Urgency":result.urgency==="moderate"?"🟡 Moderate":"🟢 Low Urgency"}
            </span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Duration: {result.duration}</span>
          </div>

          <div className="ai-card accent-teal" style={{marginBottom:12}}>
            <p style={{fontWeight:800,fontSize:13,color:"var(--teal2)",marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>Patient Symptoms</p>
            {result.symptoms.map(s=>(
              <div key={s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{color:"var(--teal)",fontSize:8}}>●</span>
                <span style={{fontSize:14,color:"var(--text)",textTransform:"capitalize"}}>{s}</span>
              </div>
            ))}
          </div>

          <div className="ai-card accent-blue" style={{marginBottom:12}}>
            <p style={{fontWeight:800,fontSize:13,color:"#1558b0",marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>AI Summary for Doctor</p>
            {result.diagnoses.map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
                <span style={{color:"#1a73e8",flexShrink:0,marginTop:2}}>{IC.spark}</span>
                <span style={{fontSize:14,color:"var(--text)",lineHeight:1.55}}>{d}</span>
              </div>
            ))}
          </div>

          <div className="ai-card accent-gold">
            <p style={{fontWeight:800,fontSize:13,color:"#b45309",marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>Recommended Tests</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {result.tests.map((t,i)=>(
                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,fontSize:12.5,fontWeight:600,fontFamily:"var(--font-b)",background:"rgba(245,158,11,.08)",color:"#92400e",border:"1px solid rgba(245,158,11,.2)"}}>
                  {IC.check} {t}
                </span>
              ))}
            </div>
          </div>

          <div style={{marginTop:14,padding:"10px 14px",background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:12,display:"flex",gap:8,alignItems:"flex-start"}}>
            {IC.alert}
            <p style={{fontSize:11.5,color:"#92400e",lineHeight:1.5}}>This AI summary is for informational guidance only. Always consult a qualified healthcare professional for proper diagnosis and treatment.</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   OUTBREAK DETECTION
════════════════════════════════════════════════════════════════ */
const REGIONS_INIT = [
  {city:"Kolkata",state:"West Bengal"},
  {city:"Delhi",state:"NCT Delhi"},
  {city:"Mumbai",state:"Maharashtra"},
  {city:"Chennai",state:"Tamil Nadu"},
  {city:"Bangalore",state:"Karnataka"},
  {city:"Hyderabad",state:"Telangana"},
  {city:"Pune",state:"Maharashtra"},
  {city:"Lucknow",state:"Uttar Pradesh"},
];

const OutbreakPage = () => {
  const [regions] = useState(()=>
    REGIONS_INIT.map(r=>{
      const fever = Math.floor(Math.random()*300)+20;
      const cough = Math.floor(Math.random()*250)+15;
      const diarrhea = Math.floor(Math.random()*100)+5;
      const rash = Math.floor(Math.random()*60)+3;
      const headache = Math.floor(Math.random()*180)+10;
      return {...r, fever, cough, diarrhea, rash, headache, total:fever+cough+diarrhea+rash+headache,
        spiked: (fever>200 && cough>150)};
    })
  );

  const maxTotal = Math.max(...regions.map(r=>r.total));
  const spikedRegions = regions.filter(r=>r.spiked);
  const symptomTotals = {
    fever:regions.reduce((a,r)=>a+r.fever,0),
    cough:regions.reduce((a,r)=>a+r.cough,0),
    headache:regions.reduce((a,r)=>a+r.headache,0),
    diarrhea:regions.reduce((a,r)=>a+r.diarrhea,0),
    rash:regions.reduce((a,r)=>a+r.rash,0),
  };
  const topSymptom = Object.entries(symptomTotals).sort((a,b)=>b[1]-a[1])[0];

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#ff5c5c,#c03030)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(255,92,92,0.3)"}}>{IC.activity}</div>
          <div>
            <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Outbreak Detection</h1>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:1}}>Real-time symptom pattern analysis across regions</p>
          </div>
        </div>
      </div>

      {spikedRegions.map(r=>(
        <div key={r.city} className="alert-banner danger fu">
          <div className="pulse-dot"/>
          <div>
            <span style={{fontWeight:800}}>⚠️ Possible flu outbreak detected in {r.city}</span>
            <p style={{fontSize:12,fontWeight:400,color:"#92400e",marginTop:2}}>Fever ({r.fever}) + Cough ({r.cough}) reports significantly above baseline</p>
          </div>
        </div>
      ))}

      {spikedRegions.length===0 && (
        <div className="alert-banner safe fu">
          <span style={{fontSize:18}}>✅</span>
          <span>No outbreak alerts detected. All regions within normal parameters.</span>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {label:"Total Reports",value:regions.reduce((a,r)=>a+r.total,0),icon:"📊",color:"var(--teal)"},
          {label:"Regions Monitored",value:regions.length,icon:"📍",color:"#1a73e8"},
          {label:"Active Alerts",value:spikedRegions.length,icon:"🔴",color:spikedRegions.length>0?"#dc2626":"#15803d"},
        ].map(s=>(
          <div key={s.label} className="ai-card fu" style={{textAlign:"center",padding:"18px 14px"}}>
            <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
            <p style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:"var(--font-b)"}}>{s.value.toLocaleString()}</p>
            <p style={{fontSize:11.5,color:"var(--text3)",fontWeight:600,marginTop:2}}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="ai-card accent-coral fu" style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          {IC.trend}
          <p style={{fontWeight:800,fontSize:14,color:"var(--text)"}}>Top Trending Symptom</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,92,92,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🤒</div>
          <div>
            <p style={{fontSize:20,fontWeight:800,color:"var(--text)",textTransform:"capitalize"}}>{topSymptom[0]}</p>
            <p style={{fontSize:13,color:"var(--text2)"}}>{topSymptom[1].toLocaleString()} reports across all regions</p>
          </div>
        </div>
      </div>

      <div className="ai-card accent-teal fu">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {IC.mapPin}
            <p style={{fontWeight:800,fontSize:14,color:"var(--text)"}}>Regional Breakdown</p>
          </div>
          <span style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>Sorted by total reports</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"120px 1fr 60px",gap:0,fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".04em",padding:"0 16px 8px",borderBottom:"1px solid var(--border)"}}>
          <span>Region</span><span>Symptoms Distribution</span><span style={{textAlign:"right"}}>Total</span>
        </div>

        {[...regions].sort((a,b)=>b.total-a.total).map((r,i)=>{
          const barColors = [{key:"fever",color:"#ef4444",val:r.fever},{key:"cough",color:"#f59e0b",val:r.cough},{key:"headache",color:"#8b5cf6",val:r.headache},{key:"diarrhea",color:"#1a73e8",val:r.diarrhea},{key:"rash",color:"#ec4899",val:r.rash}];
          return (
            <div key={r.city} className={`region-row fu s${Math.min(i+1,6)}`}>
              <div style={{display:"grid",gridTemplateColumns:"120px 1fr 60px",gap:0,alignItems:"center"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontWeight:700,fontSize:13.5,color:"var(--text)"}}>{r.city}</span>
                    {r.spiked && <div className="pulse-dot" style={{width:7,height:7}}/>}
                  </div>
                  <span style={{fontSize:11,color:"var(--text3)"}}>{r.state}</span>
                </div>
                <div style={{display:"flex",height:10,borderRadius:6,overflow:"hidden",background:"var(--surface2)"}}>
                  {barColors.map(b=>(
                    <div key={b.key} style={{width:`${(b.val/r.total)*100}%`,background:b.color,transition:"width .6s",minWidth:b.val>0?2:0}}
                      title={`${b.key}: ${b.val}`}/>
                  ))}
                </div>
                <span style={{textAlign:"right",fontWeight:800,fontSize:14,color:r.spiked?"#dc2626":"var(--text)"}}>{r.total}</span>
              </div>
            </div>
          );
        })}

        <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)"}}>
          {[{label:"Fever",color:"#ef4444"},{label:"Cough",color:"#f59e0b"},{label:"Headache",color:"#8b5cf6"},{label:"Diarrhea",color:"#1a73e8"},{label:"Rash",color:"#ec4899"}].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--text2)",fontWeight:600}}>
              <span style={{width:8,height:8,borderRadius:2,background:l.color,flexShrink:0}}/>{l.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:14,padding:"10px 14px",background:"rgba(26,115,232,.06)",border:"1px solid rgba(26,115,232,.2)",borderRadius:12,display:"flex",gap:8,alignItems:"flex-start"}}>
        {IC.alert}
        <p style={{fontSize:11.5,color:"#1558b0",lineHeight:1.5}}>Data is simulated for demonstration. In production, this would aggregate anonymized symptom reports from Svasthya users to detect real outbreak patterns.</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   FIGHT MISINFORMATION
════════════════════════════════════════════════════════════════ */
const MISINFO_DB = {
  "fever":{
    bad:"You might have malaria, dengue, typhoid, or COVID! Some blogs say fever above 100°F can cause brain damage! Take antibiotics immediately!",
    good:"Fever is the body's natural immune response. Most fevers under 103°F in adults resolve in 2-3 days. Use paracetamol (not aspirin for children). Stay hydrated. See a doctor if fever persists >3 days, exceeds 103°F, or is accompanied by stiff neck or rash.",
    case:"Presenting symptom: Fever. Duration to be assessed. Recommend: temperature log, CBC, and clinical correlation."
  },
  "headache":{
    bad:"Headaches could be a brain tumor or aneurysm! You need an MRI immediately! Some say cell phone radiation causes chronic headaches!",
    good:"Most headaches are tension-type or migraine, both manageable conditions. Red flags requiring urgent care: sudden worst-ever headache, headache with fever/stiff neck, or new headache after age 50. OTC pain relief and hydration help most cases.",
    case:"Presenting symptom: Headache. Assess: character, location, duration, associated symptoms. Rule out red flags. Consider: tension vs migraine vs secondary causes."
  },
  "chest pain":{
    bad:"You're having a heart attack! Chest pain always means cardiac emergency! Take aspirin and rush to ER immediately no matter what!",
    good:"Chest pain has many causes — muscular strain, acid reflux, anxiety, and cardiac issues. Seek emergency care if: pain radiates to jaw/arm, accompanied by shortness of breath or sweating, or feels like pressure/squeezing. Many cases are non-cardiac.",
    case:"Presenting symptom: Chest pain. PRIORITY ASSESSMENT. Rule out: ACS, PE, pneumothorax. ECG and troponin recommended. Assess risk factors."
  },
  "cough":{
    bad:"A cough lasting more than a week is definitely TB or lung cancer! Don't go near anyone, you're highly contagious! Take cough suppressants immediately!",
    good:"Most coughs are viral and self-limiting (2-3 weeks). Post-nasal drip, asthma, and GERD are common chronic causes. Seek medical advice if: coughing blood, cough >3 weeks, progressive shortness of breath, or unexplained weight loss.",
    case:"Presenting symptom: Cough. Assess: productive vs dry, duration, triggers. Consider: viral URI, post-nasal drip, asthma, GERD. Chest X-ray if >3 weeks."
  },
  "rash":{
    bad:"A skin rash means you have a serious autoimmune disease! It could be lupus or skin cancer! Apply random herbal creams immediately!",
    good:"Rashes are very common with diverse causes — allergies, contact dermatitis, viral infections, eczema. Most are benign and treatable. Seek urgent care if: rash + fever, rapidly spreading, painful blisters, or signs of anaphylaxis (breathing difficulty).",
    case:"Presenting symptom: Rash. Document: distribution, morphology, onset, associated symptoms. Consider: allergic, infectious, autoimmune etiologies. Dermatological evaluation if persistent."
  },
};

const MisinfoPage = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const addSymptom = () => {
    const s = input.trim().toLowerCase();
    if(s && !symptoms.includes(s)){
      setSymptoms([...symptoms, s]);
      setInput("");
      setResult(null);
    }
  };

  const removeSymptom = (s) => {
    setSymptoms(symptoms.filter(x=>x!==s));
    setResult(null);
  };

  const check = async () => {
    if(symptoms.length===0) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,1800));
    const entries = symptoms.map(s=>{
      const key = Object.keys(MISINFO_DB).find(k=>s.includes(k));
      return key
        ? {symptom:s,...MISINFO_DB[key]}
        : {symptom:s,
           bad:`${s} could be life-threatening according to random health blogs! You might need surgery! Take these unverified supplements immediately!`,
           good:`"${s}" should be evaluated by a qualified healthcare professional. Avoid self-diagnosis from unverified sources. Track symptom duration, severity, and triggers to provide useful information to your doctor.`,
           case:`Presenting symptom: ${s}. Requires clinical assessment. Recommend comprehensive history and physical examination.`
          };
    });
    setResult(entries);
    setLoading(false);
  };

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#00a896,#007a6e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,168,150,0.3)"}}>{IC.shield2}</div>
          <div>
            <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Fight Misinformation</h1>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:1}}>AI-filtered credible health information</p>
          </div>
        </div>
      </div>

      <div className="ai-card accent-teal fu">
        <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:6}}>
          <span style={{fontSize:28}}>🛡️</span>
          <div>
            <p style={{fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:4}}>Stop Googling Symptoms Blindly</p>
            <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.55}}>Enter your symptoms below. We'll show you what random blogs say vs. what credible medical sources recommend — plus a structured case summary for your doctor.</p>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 18px",background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.15)",borderRadius:12,margin:"14px 0",fontSize:13,color:"#92400e"}}>
          <span style={{fontSize:18}}>⚠️</span>
          <div>
            <span style={{fontWeight:700}}>The problem: </span>
            <span>Google symptom → Read random blogs → Get scared or misdiagnose</span>
          </div>
        </div>

        <div className="symptom-input-row">
          <input className="inp" value={input} onChange={e=>setInput(e.target.value)}
            placeholder="e.g. fever, headache, rash…"
            onKeyDown={e=>{if(e.key==="Enter")addSymptom()}}/>
          <button className="btn-p" onClick={addSymptom} disabled={!input.trim()}
            style={{padding:"10px 18px",borderRadius:50,flexShrink:0}}>
            {IC.plus} Add
          </button>
        </div>

        {symptoms.length>0 && (
          <div className="symptom-chips">
            {symptoms.map(s=>(
              <span key={s} className="symptom-chip">
                {s}
                <button onClick={()=>removeSymptom(s)}>{IC.trash}</button>
              </span>
            ))}
          </div>
        )}

        <button className="btn-p" onClick={check}
          disabled={symptoms.length===0||loading}
          style={{marginTop:16,padding:"12px 28px",fontSize:14,width:"100%"}}>
          {loading ? <><Spinner/> Filtering information…</> : <>🛡️ Check Now</>}
        </button>
      </div>

      {loading && (
        <div className="ai-loading fi">
          <div className="ai-loading-bar"/>
          <p style={{fontSize:13,color:"var(--text3)",fontWeight:600}}>AI is filtering credible sources…</p>
        </div>
      )}

      {result && !loading && result.map((entry,idx)=>(
        <div key={idx} className="ai-result-box fu" style={{marginBottom:16,animationDelay:`${idx*0.1}s`}}>
          <p style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:18,marginBottom:16,color:"var(--text)"}}>
            Results for: <span style={{color:"var(--teal2)",textTransform:"capitalize"}}>{entry.symptom}</span>
          </p>

          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div className="misinfo-col bad">
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                <span style={{fontSize:16}}>❌</span>
                <p style={{fontWeight:800,fontSize:12.5,color:"#dc2626",textTransform:"uppercase",letterSpacing:".04em"}}>What Google Might Say</p>
              </div>
              <p style={{fontSize:13,color:"#92400e",lineHeight:1.6,textDecoration:"line-through",opacity:.7}}>{entry.bad}</p>
              <div style={{marginTop:10,padding:"6px 10px",background:"rgba(239,68,68,.08)",borderRadius:8,fontSize:11,color:"#dc2626",fontWeight:700}}>⚠️ Unreliable / Misleading</div>
            </div>

            <div className="misinfo-col good">
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                <span style={{fontSize:16}}>✅</span>
                <p style={{fontWeight:800,fontSize:12.5,color:"#15803d",textTransform:"uppercase",letterSpacing:".04em"}}>AI-Filtered Credible Info</p>
              </div>
              <p style={{fontSize:13,color:"var(--text)",lineHeight:1.6}}>{entry.good}</p>
              <div style={{marginTop:10,padding:"6px 10px",background:"rgba(0,168,150,.08)",borderRadius:8,fontSize:11,color:"var(--teal2)",fontWeight:700}}>✓ Evidence-Based</div>
            </div>

            <div className="misinfo-col case">
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                <span style={{fontSize:16}}>📋</span>
                <p style={{fontWeight:800,fontSize:12.5,color:"#1558b0",textTransform:"uppercase",letterSpacing:".04em"}}>Structured Case for Doctor</p>
              </div>
              <p style={{fontSize:13,color:"var(--text)",lineHeight:1.6,fontFamily:"var(--font-b)"}}>{entry.case}</p>
              <div style={{marginTop:10,padding:"6px 10px",background:"rgba(26,115,232,.08)",borderRadius:8,fontSize:11,color:"#1558b0",fontWeight:700}}>📄 Ready to Share</div>
            </div>
          </div>
        </div>
      ))}

      {result && !loading && (
        <div style={{padding:"10px 14px",background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:12,display:"flex",gap:8,alignItems:"flex-start"}}>
          {IC.alert}
          <p style={{fontSize:11.5,color:"#92400e",lineHeight:1.5}}>This tool helps filter credible information but does not replace professional medical advice. Always consult a qualified doctor for diagnosis and treatment.</p>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   LOGIN PAGE — Multi-step registration
════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════
   MEDICAL TEST PAGE
════════════════════════════════════════════════════════════════ */
const MedicalTestPage = () => {
  const [step, setStep] = useState(1);
  const [lab, setLab] = useState(null);
  const [file, setFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [timeSlot, setTimeSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef(null);

  const LABS = [
    {id:1, name:"Dr. Lal PathLabs", rating:4.8, distance:"1.2 km"},
    {id:2, name:"SRL Diagnostics", rating:4.6, distance:"2.5 km"},
    {id:3, name:"Thyrocare", rating:4.5, distance:"3.0 km"},
    {id:4, name:"Metropolis", rating:4.7, distance:"4.1 km"},
    {id:5, name:"Apollo Diagnostics", rating:4.9, distance:"5.5 km"}
  ];

  const TESTS = [
    "Complete Blood Count (CBC)", "Lipid Profile", "Liver Function Test", 
    "MRI Scan", "X-Ray", "Sugar-Fasting", "Thyroid Profile (T3, T4, TSH)", "Vitamin D"
  ];

  const SLOTS = ["Tomorrow, 8:00 AM - 9:00 AM", "Tomorrow, 10:00 AM - 11:00 AM", "Tomorrow, 4:00 PM - 5:00 PM", "Tomorrow, 6:00 PM - 7:00 PM"];

  const handleFile = async (e) => {
    if(e.target.files?.[0]){
      setFile(URL.createObjectURL(e.target.files[0]));
      setVerifying(true);
      await new Promise(r=>setTimeout(r, 1500));
      setVerifying(false);
      setVerified(true);
    }
  };

  const toggleTest = (t) => {
    setSelectedTests(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t]);
  };

  if(confirmed) {
    return (
      <div className="ai-page">
        <div style={{padding:"60px 20px",textAlign:"center"}} className="fi">
          <div className="confirm-check" style={{margin:"0 auto 20px"}}>
            <svg width="36" height="36" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:26,color:"var(--text)",marginBottom:12}}>Booking Confirmed!</h2>
          <p style={{fontSize:15,color:"var(--text2)",marginBottom:6}}>Your tests are scheduled at <strong>{lab.name}</strong></p>
          <p style={{fontSize:16,fontWeight:800,color:"var(--teal2)",marginBottom:20}}>{timeSlot}</p>
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:16,display:"inline-block",textAlign:"left"}}>
            <p style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",marginBottom:8}}>Tests Booked:</p>
            <ul style={{margin:0,paddingLeft:20,fontSize:14,color:"var(--text)",lineHeight:1.6}}>
              {selectedTests.map(t=><li key={t}>{t}</li>)}
            </ul>
          </div>
          <div style={{marginTop:30}}>
            <button className="btn-p" onClick={()=>{setStep(1);setConfirmed(false);setLab(null);setFile(null);setVerified(false);setSelectedTests([]);setTimeSlot(null);}} style={{padding:"12px 28px",borderRadius:50}}>Book Another Test</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#00a896,#007a6e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,168,150,0.3)",color:"#fff"}}>{IC.clipboard}</div>
          <div>
            <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Book Medical Tests</h1>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:1}}>Schedule lab tests and health checkups</p>
          </div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        {[1,2,3,4].map(s=>(
          <div key={s} style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:step>=s?"var(--teal)":"var(--surface2)",color:step>=s?"#fff":"var(--text3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,border:step>=s?"1px solid var(--teal)":"1px solid var(--border)",transition:"all .2s"}}>
              {step>s?IC.check:s}
            </div>
            {s<4 && <div style={{flex:1,height:2,background:step>s?"var(--teal)":"var(--border)",transition:"all .2s"}}/>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="fi">
          <p style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:14}}>Step 1: Choose a Laboratory</p>
          <div style={{display:"grid",gap:12}}>
            {LABS.map(l=>(
              <div key={l.id} className="ai-card" style={{margin:0,padding:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14,border:lab?.id===l.id?"1.5px solid var(--teal)":"1px solid var(--border)",background:lab?.id===l.id?"var(--teal-bg)":"var(--surface)"}} onClick={()=>setLab(l)}>
                <div style={{width:40,height:40,borderRadius:10,background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏥</div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:800,fontSize:15,color:"var(--text)"}}>{l.name}</p>
                  <p style={{fontSize:12.5,color:"var(--text2)",marginTop:2}}>⭐ {l.rating} · 📍 {l.distance}</p>
                </div>
                <div style={{width:20,height:20,borderRadius:"50%",border:lab?.id===l.id?"5px solid var(--teal)":"2px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"center"}}>{lab?.id===l.id && <div style={{width:10,height:10,borderRadius:"50%",background:"var(--teal)"}}/>}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,textAlign:"right"}}>
            <button className="btn-p" disabled={!lab} onClick={()=>setStep(2)} style={{padding:"10px 24px",borderRadius:50}}>Next Step &rarr;</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fi">
          <p style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:14}}>Step 2: Upload Prescription</p>
          <div className="ai-card" style={{padding:24,textAlign:"center"}}>
            {!file ? (
              <div style={{padding:20,border:"2px dashed var(--border)",borderRadius:12}}>
                <div style={{fontSize:32,marginBottom:10}}>📄</div>
                <p style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:4}}>Upload your doctor's prescription</p>
                <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>JPG, PNG or PDF formats</p>
                <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*,.pdf" style={{display:"none"}}/>
                <button className="btn-g" onClick={()=>fileInputRef.current?.click()}>Choose File</button>
              </div>
            ) : verifying ? (
              <div className="ai-loading">
                <div style={{fontSize:24}}>🔍</div>
                <p style={{fontWeight:700,fontSize:14,color:"var(--text)",marginTop:8}}>Verifying prescription using AI...</p>
                <div className="ai-loading-bar" style={{marginTop:8}}></div>
              </div>
            ) : verified ? (
              <div className="fi" style={{padding:20,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",borderRadius:12}}>
                <div style={{fontSize:36,color:"#22c55e",marginBottom:10}}>✅</div>
                <p style={{fontSize:18,fontWeight:800,color:"#15803d",marginBottom:4}}>Verification Approved</p>
                <p style={{fontSize:13,color:"#15803d",opacity:.8}}>Your prescription has been successfully validated.</p>
              </div>
            ) : null}
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button className="btn-g" onClick={()=>setStep(1)}>Back</button>
            <button className="btn-p" disabled={!verified} onClick={()=>setStep(3)} style={{padding:"10px 24px",borderRadius:50}}>Next Step &rarr;</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fi">
          <p style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:14}}>Step 3: Select Test Types</p>
          <div className="ai-card" style={{padding:20}}>
            <p style={{fontSize:13,color:"var(--text2)",marginBottom:14}}>Select all the tests recommended by your doctor:</p>
            <div style={{display:"grid",gap:10}}>
              {TESTS.map(t=>(
                <label key={t} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:selectedTests.includes(t)?"var(--teal-bg)":"var(--surface2)",border:selectedTests.includes(t)?"1px solid var(--teal)":"1px solid var(--border)",borderRadius:10,cursor:"pointer",transition:"all .2s"}}>
                  <input type="checkbox" checked={selectedTests.includes(t)} onChange={()=>toggleTest(t)} style={{width:16,height:16,accentColor:"var(--teal)"}}/>
                  <span style={{fontSize:14.5,fontWeight:600,color:selectedTests.includes(t)?"var(--teal2)":"var(--text)"}}>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button className="btn-g" onClick={()=>setStep(2)}>Back</button>
            <button className="btn-p" disabled={selectedTests.length===0} onClick={()=>setStep(4)} style={{padding:"10px 24px",borderRadius:50}}>Next Step &rarr;</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fi">
          <p style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:14}}>Step 4: Select Time Slot</p>
          <div className="ai-card" style={{padding:20}}>
             <div style={{display:"grid",gap:10}}>
              {SLOTS.map(s=>(
                <button key={s} className="slot-btn" onClick={()=>setTimeSlot(s)} style={{borderColor:timeSlot===s?"var(--teal)":"var(--border2)",background:timeSlot===s?"var(--teal-bg)":"var(--surface)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:timeSlot===s?800:600,color:timeSlot===s?"var(--teal2)":"var(--text)"}}>{s}</span>
                  {timeSlot===s&&<span style={{color:"var(--teal)"}}>{IC.check}</span>}
                </button>
              ))}
             </div>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button className="btn-g" onClick={()=>setStep(3)}>Back</button>
            <button className="btn-p" disabled={!timeSlot} onClick={()=>setConfirmed(true)} style={{padding:"10px 24px",borderRadius:50}}>Confirm Booking</button>
          </div>
        </div>
      )}

    </div>
  );
};

const LoginPage = ({onLogin}) => {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState(1); // 1=email/pw, 2=role, 3=details
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(null); // "doctor" | "patient"
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Patient fields
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [anonDefault, setAnonDefault] = useState(false);

  // Doctor fields
  const [license, setLicense] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("");
  const [qualification, setQualification] = useState("");
  const [hospital, setHospital] = useState("");
  const [shortBio, setShortBio] = useState("");

  const submitLogin = async () => {
    setLoading(true); setErr("");
    await new Promise(r=>setTimeout(r,700));
    const u = USERS.find(u=>u.email===email&&u.password===pw);
    if(u) onLogin(u);
    else { setErr("Invalid email or password."); setLoading(false); }
  };

  const submitRegister = async () => {
    setLoading(true); setErr("");
    await new Promise(r=>setTimeout(r,800));
    const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"U";
    const newUser = {
      id: Date.now(),
      name,
      email,
      password: pw,
      role,
      avatar: initials,
      bio: role==="doctor" ? (shortBio||`${qualification}. ${specialty} specialist.`) : `Svasthya community member.`,
      specialty: role==="doctor" ? specialty : undefined,
      location: role==="doctor" ? hospital : undefined,
      address: role==="patient" ? address : undefined,
      isAnonymous: role==="patient" ? anonDefault : false,
      consultFee: role==="doctor" ? 500 : undefined,
      followers: 0,
      following: 0,
      online: true,
    };
    onLogin(newUser);
  };

  const labelSt = {fontSize:11.5,fontWeight:700,color:"var(--text2)",fontFamily:"var(--font-b)",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".04em"};
  const totalSteps = 3;
  const progress = mode==="register" ? (step/totalSteps)*100 : 0;

  return (
    <div className="login-wrap">
      {[[{w:500,c:"rgba(0,168,150,0.12)",t:-80,l:-80},{w:400,c:"rgba(26,115,232,0.08)",b:-60,r:-60},{w:250,c:"rgba(245,158,11,0.06)",t:"40%",r:"25%"}]].flat().map((o,i)=>(
        <div key={i} style={{position:"absolute",width:o.w,height:o.w,borderRadius:"50%",background:`radial-gradient(circle,${o.c},transparent)`,top:o.t,left:o.l,bottom:o.b,right:o.r,animation:`orb ${10+i*3}s ease-in-out infinite`,pointerEvents:"none",animationDelay:`${i*3}s`}}/>
      ))}
      <div className="login-card fu" style={{maxWidth: mode==="register"&&step===3?480:440}}>
        {/* Progress bar for registration */}
        {mode==="register" && (
          <div style={{display:"flex",gap:6,marginBottom:24}}>
            {[1,2,3].map(s=>(
              <div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=step?"var(--teal)":"var(--border)",transition:"background .3s"}}/>
            ))}
          </div>
        )}

        {/* Back button for registration */}
        {mode==="register" && step>1 && (
          <button onClick={()=>setStep(step-1)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"var(--teal2)",fontFamily:"var(--font-b)",marginBottom:16,padding:0}}>
            ← Back
          </button>
        )}

        {/* LOGIN MODE */}
        {mode==="login" && (
          <>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{width:60,height:60,background:"linear-gradient(135deg,#00a896,#007a6e)",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 12px 40px rgba(0,168,150,0.3)"}}>
                <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:30,fontWeight:400,color:"var(--text)",letterSpacing:"-.01em"}}>Svasthya</h1>
              <p style={{color:"var(--text3)",fontSize:13.5,marginTop:5}}>Community healthcare, together</p>
            </div>
            {err&&(
              <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.25)",color:"#dc2626",borderRadius:12,padding:"10px 14px",fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:8}} className="fi">
                {IC.alert}{err}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={labelSt}>Email</label>
                <input className="inp" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
              <div>
                <label style={labelSt}>Password</label>
                <input className="inp" type="password" value={pw} onChange={e=>setPw(e.target.value)}
                  placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submitLogin()}/>
              </div>
              <button className="btn-p" onClick={submitLogin} disabled={loading||!email||!pw}
                style={{padding:"13px",borderRadius:50,fontSize:14,marginTop:6,width:"100%"}}>
                {loading?<><Spinner/> Signing in…</>:"Sign In →"}
              </button>
            </div>
            <div style={{textAlign:"center",marginTop:18}}>
              <p style={{fontSize:13,color:"var(--text3)"}}>Don't have an account? <button onClick={()=>{setMode("register");setStep(1);setErr("");}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--teal2)",fontWeight:700,fontSize:13,fontFamily:"var(--font-b)"}}>Sign Up</button></p>
            </div>
            <div style={{marginTop:20,paddingTop:18,borderTop:"1px solid var(--border)"}}>
              <p style={{textAlign:"center",fontSize:12.5,color:"var(--text3)",marginBottom:12,fontWeight:600}}>— DEMO ACCOUNTS —</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{label:"🩺 Doctor",email:"priya@doc.com",pw:"1234"},{label:"🧑 Patient",email:"rahul@patient.com",pw:"1234"}].map(d=>(
                  <button key={d.email} onClick={()=>{setEmail(d.email);setPw(d.pw);}}
                    style={{padding:"10px 12px",borderRadius:12,border:"1.5px solid var(--border2)",background:"var(--surface2)",cursor:"pointer",transition:"all .18s",fontFamily:"var(--font-b)",fontSize:12.5,fontWeight:600,color:"var(--text2)"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--teal)";e.currentTarget.style.color="var(--teal2)"}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text2)"}}>
                    <div>{d.label}</div>
                    <div style={{fontSize:10.5,marginTop:2,color:"var(--text3)"}}>{d.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* REGISTER STEP 1: Name + Email + Password */}
        {mode==="register" && step===1 && (
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:50,height:50,background:"linear-gradient(135deg,#00a896,#007a6e)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:"0 8px 24px rgba(0,168,150,0.3)"}}>
                <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <h2 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:24,fontWeight:400,color:"var(--text)"}}>Create Account</h2>
              <p style={{color:"var(--text3)",fontSize:13,marginTop:4}}>Join the Svasthya community</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={labelSt}>Full Name</label>
                <input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul Verma"/>
              </div>
              <div>
                <label style={labelSt}>Email</label>
                <input className="inp" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
              </div>
              <div>
                <label style={labelSt}>Password</label>
                <input className="inp" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/>
              </div>
              <button className="btn-p" onClick={()=>{if(!name||!email||!pw){setErr("Please fill all fields");return;}setErr("");setStep(2);}} disabled={!name||!email||!pw}
                style={{padding:"13px",borderRadius:50,fontSize:14,marginTop:6,width:"100%"}}>
                Continue →
              </button>
            </div>
            <div style={{textAlign:"center",marginTop:16}}>
              <p style={{fontSize:13,color:"var(--text3)"}}>Already have an account? <button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--teal2)",fontWeight:700,fontSize:13,fontFamily:"var(--font-b)"}}>Sign In</button></p>
            </div>
          </>
        )}

        {/* REGISTER STEP 2: Role selection */}
        {mode==="register" && step===2 && (
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <h2 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:24,fontWeight:400,color:"var(--text)"}}>I am a…</h2>
              <p style={{color:"var(--text3)",fontSize:13,marginTop:4}}>Choose your role to personalize your experience</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {id:"patient",emoji:"🧑",title:"Patient",desc:"Ask health questions, track symptoms, get community support"},
                {id:"doctor",emoji:"🩺",title:"Doctor",desc:"Verify credentials, provide medical guidance, manage patients"},
              ].map(r=>(
                <button key={r.id} onClick={()=>{setRole(r.id);setStep(3);}}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"18px 20px",borderRadius:16,border:`2px solid ${role===r.id?"var(--teal)":"var(--border)"}`,background:role===r.id?"var(--teal-bg)":"var(--surface)",cursor:"pointer",transition:"all .2s",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--teal)";e.currentTarget.style.background="var(--teal-bg)"}}
                  onMouseLeave={e=>{if(role!==r.id){e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.background="var(--surface)"}}}>
                  <span style={{fontSize:32}}>{r.emoji}</span>
                  <div>
                    <p style={{fontWeight:800,fontSize:15,color:"var(--text)",fontFamily:"var(--font-b)"}}>{r.title}</p>
                    <p style={{fontSize:12,color:"var(--text3)",marginTop:3,fontFamily:"var(--font-b)"}}>{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* REGISTER STEP 3A: Patient Details */}
        {mode==="register" && step===3 && role==="patient" && (
          <>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:28}}>🧑</span>
              <div>
                <h2 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)"}}>Patient Details</h2>
                <p style={{color:"var(--text3)",fontSize:12,marginTop:2}}>Tell us a bit about yourself</p>
              </div>
            </div>
            <div style={{background:"var(--teal-bg)",border:"1px solid rgba(0,168,150,.2)",borderRadius:12,padding:"10px 14px",marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{name}</span>
              <span style={{fontSize:11,color:"var(--text3)"}}>· {email}</span>
              <span className="badge-pat" style={{marginLeft:"auto"}}>Patient</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelSt}>Address</label>
                <input className="inp" value={address} onChange={e=>setAddress(e.target.value)} placeholder="e.g. 123 Health Ave, Mumbai"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={labelSt}>Age</label>
                  <input className="inp" type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 28"/>
                </div>
                <div>
                  <label style={labelSt}>Gender</label>
                  <select className="inp" value={gender} onChange={e=>setGender(e.target.value)} style={{cursor:"pointer"}}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelSt}>Blood Group (Optional)</label>
                <select className="inp" value={bloodGroup} onChange={e=>setBloodGroup(e.target.value)} style={{cursor:"pointer"}}>
                  <option value="">Don't know / prefer not to say</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg=><option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Any Existing Conditions? (Optional)</label>
                <input className="inp" value={conditions} onChange={e=>setConditions(e.target.value)} placeholder="e.g. Diabetes, Hypertension, Asthma..."/>
              </div>
              <div>
                <label style={labelSt}>Current Medications (Optional)</label>
                <input className="inp" value={medications} onChange={e=>setMedications(e.target.value)} placeholder="e.g. Metformin, Lisinopril..."/>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"var(--surface2)",borderRadius:12,border:"1px solid var(--border)"}}>
                <div>
                  <p style={{fontWeight:700,fontSize:13.5,color:"var(--text)",fontFamily:"var(--font-b)"}}>Anonymous Profile</p>
                  <p style={{fontSize:11.5,color:"var(--text3)",marginTop:2}}>Hide your name/profile from patients & doctors</p>
                </div>
                <button onClick={()=>setAnonDefault(!anonDefault)} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:anonDefault?"var(--teal)":"var(--border2)",transition:"background .2s",position:"relative",flexShrink:0}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:anonDefault?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </button>
              </div>
              <button className="btn-p" onClick={submitRegister} disabled={loading}
                style={{padding:"14px",borderRadius:50,fontSize:14.5,marginTop:4,width:"100%"}}>
                {loading?<><Spinner/> Creating account…</>:"Join Svasthya 💚"}
              </button>
            </div>
          </>
        )}

        {/* REGISTER STEP 3B: Doctor Verification */}
        {mode==="register" && step===3 && role==="doctor" && (
          <>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:28}}>🩺</span>
              <div>
                <h2 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)"}}>Doctor Verification</h2>
                <p style={{color:"var(--text3)",fontSize:12,marginTop:2}}>Verify your medical credentials</p>
              </div>
            </div>
            <div style={{background:"var(--teal-bg)",border:"1px solid rgba(0,168,150,.2)",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{name}</span>
              <span style={{fontSize:11,color:"var(--text3)"}}>· {email}</span>
              <span className="badge-doc" style={{marginLeft:"auto"}}>{IC.shield} Doctor</span>
            </div>
            <div style={{background:"rgba(26,115,232,.06)",border:"1px solid rgba(26,115,232,.2)",borderRadius:12,padding:"12px 14px",marginBottom:18,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:16}}>🔵</span>
              <div>
                <p style={{fontWeight:700,fontSize:12.5,color:"#1558b0",fontFamily:"var(--font-b)"}}>Verified Doctor Badge</p>
                <p style={{fontSize:11.5,color:"var(--text2)",marginTop:2,lineHeight:1.5}}>Once submitted, your credentials will be reviewed. Your posts will display the "✓ Verified" badge visible to all patients.</p>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelSt}>Medical License Number</label>
                <input className="inp" value={license} onChange={e=>setLicense(e.target.value)} placeholder="e.g. MCI-1234-5-2019"/>
              </div>
              <div>
                <label style={labelSt}>Specialization</label>
                <select className="inp" value={specialty} onChange={e=>setSpecialty(e.target.value)} style={{cursor:"pointer"}}>
                  <option value="">Select your specialty...</option>
                  {["General Physician","Cardiologist","Neurologist","Dermatologist","Orthopedic","Pediatrician","Psychiatrist","ENT Specialist","Gynecologist","Ophthalmologist","Pulmonologist","Gastroenterologist","Endocrinologist","Oncologist","Other"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={labelSt}>Years of Experience</label>
                  <input className="inp" type="number" value={experience} onChange={e=>setExperience(e.target.value)} placeholder="e.g. 8"/>
                </div>
                <div>
                  <label style={labelSt}>Qualification</label>
                  <input className="inp" value={qualification} onChange={e=>setQualification(e.target.value)} placeholder="e.g. MBBS, MD"/>
                </div>
              </div>
              <div>
                <label style={labelSt}>Hospital / Clinic (Optional)</label>
                <input className="inp" value={hospital} onChange={e=>setHospital(e.target.value)} placeholder="e.g. Apollo Hospital, Mumbai"/>
              </div>
              <div>
                <label style={labelSt}>Short Bio (Optional)</label>
                <textarea className="compose-area inp" value={shortBio} onChange={e=>setShortBio(e.target.value)} placeholder="Tell patients about your expertise..." rows={2} style={{resize:"none",padding:"10px 14px",fontSize:13}}/>
              </div>
              <button className="btn-p" onClick={submitRegister} disabled={loading||!license||!specialty}
                style={{padding:"14px",borderRadius:50,fontSize:14.5,marginTop:4,width:"100%"}}>
                {loading?<><Spinner/> Verifying…</>:"Join Svasthya 💚"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   APPOINTMENT BOOKING MODAL
════════════════════════════════════════════════════════════════ */
const AppointmentModal = ({doctor, onClose}) => {
  const [bookedSlot, setBookedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const slots = [
    {time:"10:00 AM — 10:30 AM",label:"Morning"},
    {time:"2:00 PM — 2:30 PM",label:"Afternoon"},
    {time:"5:30 PM — 6:00 PM",label:"Evening"},
  ];

  const book = (slot) => {
    setBookedSlot(slot);
    setTimeout(()=>setConfirmed(true),300);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()} style={{padding:0,maxWidth:480}}>
        <div style={{background:"linear-gradient(135deg,#00a896,#007a6e)",padding:"24px 28px",borderRadius:"28px 28px 0 0",color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:18,fontWeight:300,fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",}}>Book Appointment</span>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>{IC.close}</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av init={doctor.avatar} sz={52} ring/>
            <div style={{flex:1}}>
              <p style={{fontWeight:800,fontSize:16}}>{doctor.name}</p>
              <p style={{fontSize:13,opacity:.85}}>🩺 {doctor.specialty}{doctor.location ? ` · 📍 ${doctor.location}` : ""}</p>
            </div>
            {doctor.consultFee && (
              <div style={{background:"rgba(255,255,255,.18)",backdropFilter:"blur(8px)",borderRadius:14,padding:"8px 14px",textAlign:"center",border:"1px solid rgba(255,255,255,.25)"}}>
                <p style={{fontSize:10,fontWeight:700,opacity:.8,textTransform:"uppercase",letterSpacing:".05em"}}>Consult Fee</p>
                <p style={{fontSize:18,fontWeight:800}}>₹{doctor.consultFee}</p>
              </div>
            )}
          </div>
        </div>

        {!confirmed ? (
          <div style={{padding:"24px 28px"}}>
            {doctor.consultFee && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(0,168,150,.06)",border:"1px solid rgba(0,168,150,.18)",borderRadius:12,marginBottom:14}}>
                <span style={{fontSize:16}}>💰</span>
                <p style={{fontSize:12.5,color:"var(--teal2)",fontWeight:600}}>Consultation fee: <strong>₹{doctor.consultFee}</strong> per session</p>
              </div>
            )}
            <p style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:14}}>Available Slots — Tomorrow</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {slots.map(s=>(
                <button key={s.time} className={`slot-btn ${bookedSlot===s.time?"booked":""}`}
                  onClick={()=>book(s.time)}>
                  <div>
                    <p style={{fontWeight:700,fontSize:14}}>{s.time}</p>
                    <p style={{fontSize:12,color:"var(--text3)",fontWeight:400,marginTop:2}}>{s.label} slot</p>
                  </div>
                  {bookedSlot===s.time ? <span style={{color:"var(--teal)"}}>✓</span> : <span style={{fontSize:12,color:"var(--text3)"}}>Available</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{padding:"48px 28px",textAlign:"center"}} className="fi">
            <div className="confirm-check" style={{margin:"0 auto 20px"}}>
              <svg width="36" height="36" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,color:"var(--text)",marginBottom:8}}>Appointment Confirmed!</h3>
            <p style={{fontSize:14,color:"var(--text2)",marginBottom:4}}>With <strong>{doctor.name}</strong></p>
            <p style={{fontSize:15,fontWeight:700,color:"var(--teal2)"}}>{bookedSlot}</p>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:12}}>Tomorrow</p>
            <button className="btn-p" onClick={onClose} style={{marginTop:24,padding:"10px 28px",borderRadius:50}}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   DOCTOR DASHBOARD PAGE
════════════════════════════════════════════════════════════════ */
const DoctorDashboardPage = () => {
  const {user} = useApp();
  const [reports, setReports] = useState(SYMPTOM_REPORTS);
  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState("");
  const isDoc = user?.role==="doctor";

  const triageOrder = {high:0,medium:1,low:2};
  const sorted = [...reports].sort((a,b)=>triageOrder[a.triage]-triageOrder[b.triage]);

  const addNote = () => {
    if(!noteText.trim()||!selected) return;
    setReports(rs=>rs.map(r=>r.id!==selected.id?r:{...r,doctorNotes:noteText.trim(),doctorId:user.id}));
    setSelected({...selected,doctorNotes:noteText.trim(),doctorId:user.id});
    setNoteText("");
  };

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#1a73e8,#1558b0)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(26,115,232,0.3)"}}>{IC.clipboard}</div>
          <div>
            <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Doctor Dashboard</h1>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:1}}>{isDoc?"Patient cases with AI summaries":"View your medical reports"}</p>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {label:"Total Cases",value:reports.length,icon:"📋",color:"var(--teal)"},
          {label:"High Priority",value:reports.filter(r=>r.triage==="high").length,icon:"🔴",color:"#dc2626"},
          {label:"Reviewed",value:reports.filter(r=>r.doctorNotes).length,icon:"✅",color:"#15803d"},
        ].map(s=>(
          <div key={s.label} className="ai-card fu" style={{textAlign:"center",padding:"16px 12px"}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
            <p style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</p>
            <p style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="ai-card accent-blue fu">
        <p style={{fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:14}}>Patient Cases</p>
        <div style={{overflowX:"auto"}}>
          <table className="dash-table">
            <thead><tr><th>Patient</th><th>Symptoms</th><th>Triage</th><th>AI Summary</th></tr></thead>
            <tbody>
              {sorted.map(r=>(
                <tr key={r.id} onClick={()=>setSelected(r)} style={{cursor:"pointer"}}>
                  <td>
                    <div style={{fontWeight:700}}>{r.patientName}</div>
                    <div style={{fontSize:11,color:"var(--text3)"}}>Age {r.age} · {r.city}</div>
                  </td>
                  <td>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {r.symptoms.map(s=><span key={s} style={{fontSize:11,background:"var(--teal-bg)",color:"var(--teal2)",padding:"2px 8px",borderRadius:10,fontWeight:600}}>{s}</span>)}
                    </div>
                  </td>
                  <td><span className={`triage-badge triage-${r.triage}`}>{r.triage}</span></td>
                  <td style={{fontSize:12,color:"var(--text2)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.aiSummary.slice(0,60)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="overlay" onClick={()=>setSelected(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{padding:0,maxWidth:560}}>
            <div style={{background:"linear-gradient(135deg,#1a73e8,#1558b0)",padding:"20px 24px",borderRadius:"28px 28px 0 0",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:20,fontWeight:400}}>{selected.patientName}</h3>
                <p style={{fontSize:13,opacity:.8,marginTop:4}}>Age {selected.age} · {selected.city} · {selected.duration}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className={`triage-badge triage-${selected.triage}`} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff"}}>{selected.triage} priority</span>
                <button onClick={()=>setSelected(null)} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>{IC.close}</button>
              </div>
            </div>
            <div style={{padding:"20px 24px"}}>
              <div className="ai-card accent-teal" style={{marginBottom:12}}>
                <p style={{fontWeight:800,fontSize:12,color:"var(--teal2)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>Symptoms ({selected.severity} severity)</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {selected.symptoms.map(s=><span key={s} className="symptom-chip">{s}</span>)}
                </div>
              </div>
              <div className="ai-card accent-blue" style={{marginBottom:12}}>
                <p style={{fontWeight:800,fontSize:12,color:"#1558b0",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>AI Summary</p>
                <p style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>{selected.aiSummary}</p>
              </div>
              {selected.doctorNotes && (
                <div className="ai-card accent-gold" style={{marginBottom:12}}>
                  <p style={{fontWeight:800,fontSize:12,color:"#b45309",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>Doctor Notes</p>
                  <p style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>{selected.doctorNotes}</p>
                </div>
              )}
              {isDoc && (
                <div style={{marginTop:12}}>
                  <p style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>{selected.doctorNotes?"Update Notes":"Add Doctor Notes"}</p>
                  <textarea className="inp" value={noteText} onChange={e=>setNoteText(e.target.value)}
                    placeholder="Add diagnosis, confirm/reject AI suggestions…" rows={3}
                    style={{resize:"none",marginBottom:8}}/>
                  <button className="btn-p" onClick={addNote} disabled={!noteText.trim()} style={{padding:"10px 20px",borderRadius:50}}>
                    {IC.check} Save Notes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   HEALTH TRENDS DASHBOARD
════════════════════════════════════════════════════════════════ */
const HealthTrendsPage = () => {
  const {posts} = useApp();

  const symptomCounts = HASHTAGS.map(h=>({
    tag:h.replace("#",""),
    count: posts.filter(p=>p.tags?.includes(h)||p.content.toLowerCase().includes(h.replace("#",""))).length
  })).sort((a,b)=>b.count-a.count);

  const maxCount = Math.max(...symptomCounts.map(c=>c.count),1);
  const barColors = ["#00a896","#1a73e8","#f59e0b","#ef4444","#8b5cf6","#ec4899","#22c55e","#06b6d4","#f97316","#6366f1","#14b8a6","#e11d48"];

  const weeklyTrend = [
    {day:"Mon",value:Math.floor(Math.random()*40)+20},
    {day:"Tue",value:Math.floor(Math.random()*40)+20},
    {day:"Wed",value:Math.floor(Math.random()*40)+35},
    {day:"Thu",value:Math.floor(Math.random()*40)+25},
    {day:"Fri",value:Math.floor(Math.random()*40)+30},
    {day:"Sat",value:Math.floor(Math.random()*40)+15},
    {day:"Sun",value:Math.floor(Math.random()*40)+10},
  ];
  const maxWeek = Math.max(...weeklyTrend.map(d=>d.value));

  return (
    <div className="ai-page">
      <div className="ai-page-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#f59e0b,#d97706)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(245,158,11,0.3)"}}>{IC.trend}</div>
          <div>
            <h1 style={{fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"-0.02em",fontSize:22,fontWeight:400,color:"var(--text)",}}>Health Trends</h1>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:1}}>Community symptom analytics & patterns</p>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {label:"Total Posts",value:posts.length,icon:"📝",color:"var(--teal)"},
          {label:"Topics Tracked",value:HASHTAGS.length,icon:"#️⃣",color:"#1a73e8"},
          {label:"Top Symptom",value:symptomCounts[0]?.tag||"-",icon:"🔥",color:"#f59e0b",isText:true},
        ].map(s=>(
          <div key={s.label} className="ai-card fu" style={{textAlign:"center",padding:"16px 12px"}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
            <p style={{fontSize:s.isText?16:22,fontWeight:800,color:s.color,textTransform:"capitalize"}}>{s.isText?s.value:s.value}</p>
            <p style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="ai-card accent-gold fu" style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          {IC.trend}
          <p style={{fontWeight:800,fontSize:14,color:"var(--text)"}}>Symptom Frequency — All Posts</p>
        </div>
        {symptomCounts.map((s,i)=>(
          <div key={s.tag} className={`fu s${Math.min(i+1,6)}`} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text)",width:90,textTransform:"capitalize"}}>#{s.tag}</span>
            <div style={{flex:1}}>
              <div className="chart-bar-h" style={{width:`${(s.count/maxCount)*100}%`,background:barColors[i%barColors.length]}}>
                {s.count}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-card accent-blue fu">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          {IC.activity}
          <p style={{fontWeight:800,fontSize:14,color:"var(--text)"}}>Weekly Post Activity</p>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:140,padding:"0 10px"}}>
          {weeklyTrend.map((d,i)=>(
            <div key={d.day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}} className={`fu s${Math.min(i+1,6)}`}>
              <span style={{fontSize:11,fontWeight:700,color:"var(--text)"}}>{d.value}</span>
              <div style={{width:"100%",height:`${(d.value/maxWeek)*100}px`,background:`linear-gradient(180deg,#1a73e8,#1558b0)`,borderRadius:"6px 6px 0 0",transition:"height .6s",minHeight:8}}/>
              <span style={{fontSize:11,fontWeight:600,color:"var(--text3)"}}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-card accent-teal fu" style={{marginTop:16}}>
        <p style={{fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:12}}>Top Symptom Pairs</p>
        {[["fever","cough","Common cold / flu pattern"],["headache","nausea","Migraine indicator"],["chest pain","breathing difficulty","Urgent cardiac screening"],["fatigue","insomnia","Mental health screening recommended"]].map(([a,b,note],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:i%2===0?"var(--surface2)":"transparent",borderRadius:10,marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--teal2)",background:"var(--teal-bg)",padding:"3px 10px",borderRadius:20}}>{a}</span>
            <span style={{color:"var(--text3)"}}>+</span>
            <span style={{fontSize:12,fontWeight:700,color:"#1558b0",background:"rgba(26,115,232,.08)",padding:"3px 10px",borderRadius:20}}>{b}</span>
            <span style={{fontSize:12,color:"var(--text2)",marginLeft:"auto",}}>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   APP PROVIDER + ROOT
════════════════════════════════════════════════════════════════ */
export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [page, setPage] = useState("feed");
  const [posts, setPosts] = useState(()=>{
    try {
      const saved = localStorage.getItem("svasthya_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        // If parsed length is less than ALL_POSTS_INIT, it means we added new mock data
        // Let's just use ALL_POSTS_INIT to ensure new mock data is visible
        if (parsed.length < ALL_POSTS_INIT.length) return ALL_POSTS_INIT;
        return parsed;
      }
      return ALL_POSTS_INIT;
    } catch { return ALL_POSTS_INIT; }
  });
  const [profileId, setProfileId] = useState(null);
  const [searchTag, setSearchTag] = useState(null);
  const [appointmentDoc, setAppointmentDoc] = useState(null);

  // Follow state
  const [followedUsers, setFollowedUsers] = useState(()=>{
    try {
      const saved = localStorage.getItem("svasthya_follows");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Theme state
  const [theme, setTheme] = useState(()=>{
    try { return localStorage.getItem("svasthya_theme") || "light"; } catch { return "light"; }
  });

  // Apply theme class to root
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", theme==="dark");
    try { localStorage.setItem("svasthya_theme", theme); } catch {}
  },[theme]);

  // Save follows
  useEffect(()=>{
    try { localStorage.setItem("svasthya_follows", JSON.stringify(followedUsers)); } catch {}
  },[followedUsers]);

  const toggleFollow = useCallback((userId) => {
    setFollowedUsers(prev => prev.includes(userId) ? prev.filter(id=>id!==userId) : [...prev, userId]);
  },[]);

  const isFollowing = useCallback((userId) => followedUsers.includes(userId),[followedUsers]);

  const toggleTheme = useCallback(() => setTheme(t => t==="dark"?"light":"dark"),[]);

  // Profile data (pics, editable fields) stored in localStorage per user
  const [profileDataMap, setProfileDataMap] = useState(()=>{
    try {
      const saved = localStorage.getItem("svasthya_profiles");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Save posts to LocalStorage on change
  useEffect(()=>{
    try { localStorage.setItem("svasthya_posts", JSON.stringify(posts)); } catch {}
  },[posts]);

  // Save profile data to localStorage on change
  useEffect(()=>{
    try { localStorage.setItem("svasthya_profiles", JSON.stringify(profileDataMap)); } catch {}
  },[profileDataMap]);

  const getProfileData = useCallback((userId) => {
    return profileDataMap[userId] || {};
  },[profileDataMap]);

  const updateProfile = useCallback((userId, data) => {
    setProfileDataMap(prev => ({...prev, [userId]: {...(prev[userId]||{}), ...data}}));
    // Sync name/bio changes into authUser so sidebar & new posts reflect them
    if (data.name || data.bio) {
      setAuthUser(prev => {
        if (!prev || prev.id !== userId) return prev;
        const updated = {...prev};
        if (data.name) updated.name = data.name;
        if (data.bio) updated.bio = data.bio;
        return updated;
      });
    }
    // Sync name change into all existing posts & comments by this user
    if (data.name) {
      setPosts(ps => ps.map(p => {
        let post = p.userId === userId ? {...p, userName: data.name} : p;
        if (post.comments?.some(c => c.userId === userId)) {
          post = {...post, comments: post.comments.map(c =>
            c.userId === userId ? {...c, userName: data.name} : c
          )};
        }
        return post;
      }));
    }
  },[]);

  const toggleLike = useCallback((postId) => {
    setPosts(ps=>ps.map(p=>p.id!==postId?p:{...p,liked:!p.liked,likes:p.liked?p.likes-1:p.likes+1}));
  },[]);

  const toggleSave = useCallback((postId) => {
    setPosts(ps=>ps.map(p=>p.id!==postId?p:{...p,saved:!p.saved}));
  },[]);

  const deletePost = useCallback((postId) => {
    setPosts(ps=>ps.filter(p=>p.id!==postId));
  },[]);

  const addComment = useCallback((postId, content) => {
    setPosts(ps=>ps.map(p=>p.id!==postId?p:{
      ...p,
      comments:[...p.comments,{
        id:Date.now(),
        userId:authUser.id,userName:authUser.name,avatar:authUser.avatar,
        role:authUser.role,specialty:authUser.specialty||"Physician",
        content,likes:0,createdAt:now()
      }]
    }));
  },[authUser]);

  const addPost = useCallback((data) => {
    const newPost = {
      id:Date.now(),
      userId:authUser.id,userName:authUser.name,avatar:authUser.avatar,
      role:authUser.role,specialty:authUser.specialty,
      isAnonymous:authUser.isAnonymous,
      ...data,
      likes:0,liked:false,saved:false,
      createdAt:now(),comments:[]
    };
    setPosts(ps=>[newPost,...ps]);
  },[authUser]);

  const logout = useCallback(()=>{setAuthUser(null);setPage("feed");},[]);

  const goHashtag = (tag) => { setSearchTag(tag); setPage("search"); };
  const goProfile = (id) => { setProfileId(id); setPage("profile"); };
  const bookAppointment = (docId) => {
    const doc = USERS.find(u=>u.id===docId && u.role==="doctor");
    if(doc) setAppointmentDoc(doc);
  };

  const ctx = { user:authUser, posts, toggleLike, toggleSave, addComment, addPost, deletePost, logout, bookAppointment, getProfileData, updateProfile, toggleFollow, isFollowing, theme, toggleTheme };

  if(!authUser) return (
    <>
      <style>{CSS}</style>
      <LoginPage onLogin={u=>{setAuthUser(u);setPage("feed");}}/>
    </>
  );

  const renderPage = () => {
    switch(page) {
      case "feed":    return <FeedPage onHashtagClick={goHashtag} onProfileClick={goProfile}/>;
      case "search":  return <SearchPage initialTag={searchTag} onProfileClick={goProfile}/>;
      case "doctors": return <DoctorsPage onHashtagClick={goHashtag} onProfileClick={goProfile}/>;
      case "consult": return <ConsultationPage/>;
      case "outbreak": return <OutbreakPage/>;
      case "tests": return <MedicalTestPage/>;
      case "dashboard": return <DoctorDashboardPage/>;
      case "trends": return <HealthTrendsPage/>;
      case "voicelog": return <VoiceLogPage />;
      case "profile": return <ProfilePage profileUserId={profileId||authUser.id} onHashtagClick={goHashtag}/>;
      default:        return <FeedPage onHashtagClick={goHashtag} onProfileClick={goProfile}/>;
    }
  };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{CSS}</style>
      <div className="app-shell">
        <LeftSidebar activePage={page} setPage={p=>{
          if(p==="profile"){setProfileId(authUser.id);}
          setPage(p);
        }}/>
        <div className="center-col">
          {renderPage()}
        </div>
        <RightSidebar onHashtagClick={goHashtag}/>
      </div>
      <MobileBottomNav activePage={page} setPage={p=>{
        if(p==="profile"){setProfileId(authUser.id);}
        setPage(p);
      }}/>
      {appointmentDoc && <AppointmentModal doctor={appointmentDoc} onClose={()=>setAppointmentDoc(null)}/>}
      <EmpathicAvatar />
    </AppCtx.Provider>
  );
}