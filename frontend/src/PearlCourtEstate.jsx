import { useState, useEffect, useCallback, useRef } from "react";

const fmt = (d) => d.toISOString().slice(0, 10);
const naira = (n) => `₦${Number(n).toLocaleString()}`;
const genCode = () => `PCE-${Math.floor(1000 + Math.random() * 9000)}`;
const isExpired = (expires) => new Date() > new Date(expires);
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / 86400000);
const daysSince = (dateStr) => Math.ceil((new Date() - new Date(dateStr)) / 86400000);
const today = new Date();
const ESTATE_EMAIL = "estatemanager@pearlcourt.ng";

// ─── EMAIL SIMULATION ──────────────────────────────────────────────────────────
let _emailInbox = [];
const sendEmailSim = (to, subject, body, tag = "general") => {
  const entry = { id: Date.now() + Math.random(), to, subject, body, tag, sentAt: new Date().toISOString(), read: false };
  _emailInbox = [entry, ..._emailInbox];
  return entry;
};

// ─── SEED DATA (clean — no history) ───────────────────────────────────────────
const seedUsers = [
  { id: 1, username: "admin", password: "admin123", role: "admin", name: "Estate Admin", apt: null, active: true, createdAt: "2026-01-01" },
  { id: 2, username: "security1", password: "gate123", role: "security", name: "Segun Badmus", apt: null, active: true, createdAt: "2026-01-05" },
  { id: 3, username: "accountant", password: "acct123", role: "accountant", name: "Mrs. Bola Adekunle", apt: null, active: true, createdAt: "2026-01-05" },
  { id: 4, username: "apt1a", password: "resident123", role: "resident", name: "Alhaji Musa Bello", apt: "Apt 1A", active: true, createdAt: "2026-01-10" },
  { id: 5, username: "apt2b", password: "resident123", role: "resident", name: "Mrs. Chioma Okafor", apt: "Apt 2B", active: true, createdAt: "2026-01-10" },
  { id: 6, username: "apt3c", password: "resident123", role: "resident", name: "Dr. Emeka Nwosu", apt: "Apt 3C", active: true, createdAt: "2026-01-10" },
  { id: 7, username: "apt4d", password: "resident123", role: "resident", name: "Mrs. Funmi Adeyemi", apt: "Apt 4D", active: true, createdAt: "2026-01-10" },
  { id: 8, username: "apt5e", password: "resident123", role: "resident", name: "Mr. Tunde Lawson", apt: "Apt 5E", active: true, createdAt: "2026-01-10" },
];
const seedResidents = [
  { id: 1, name: "Alhaji Musa Bello", apt: "Apt 1A", phone: "08012345678", email: "musa.bello@gmail.com", status: "active", duesOwed: false, suspendedSince: null },
  { id: 2, name: "Mrs. Chioma Okafor", apt: "Apt 2B", phone: "08023456789", email: "chioma.okafor@yahoo.com", status: "active", duesOwed: false, suspendedSince: null },
  { id: 3, name: "Dr. Emeka Nwosu", apt: "Apt 3C", phone: "08034567890", email: "emeka.nwosu@gmail.com", status: "active", duesOwed: false, suspendedSince: null },
  { id: 4, name: "Mrs. Funmi Adeyemi", apt: "Apt 4D", phone: "08045678901", email: "funmi.adeyemi@gmail.com", status: "active", duesOwed: false, suspendedSince: null },
  { id: 5, name: "Mr. Tunde Lawson", apt: "Apt 5E", phone: "08056789012", email: "tunde.lawson@outlook.com", status: "active", duesOwed: false, suspendedSince: null },
];
const seedVehicles = [
  { id: 1, plate: "KJA 123 LG", make: "Toyota Camry", owner: "Alhaji Musa Bello", apt: "Apt 1A" },
  { id: 2, plate: "LND 456 AB", make: "Honda CR-V", owner: "Mrs. Chioma Okafor", apt: "Apt 2B" },
  { id: 3, plate: "ABC 789 KJ", make: "Mercedes C300", owner: "Dr. Emeka Nwosu", apt: "Apt 3C" },
];
const seedActivities = [
  { id: 1, category: "Fire Extinguisher", description: "Annual inspection & recharge", lastDone: "2025-11-01", intervalDays: 365, nextDue: "2026-11-01", status: "ok" },
  { id: 2, category: "Generator Service", description: "Major overhaul – 500hr service", lastDone: "2026-03-15", intervalDays: 90, nextDue: "2026-06-13", status: "upcoming" },
  { id: 3, category: "Fumigation", description: "Estate-wide fumigation", lastDone: "2026-02-10", intervalDays: 90, nextDue: "2026-05-11", status: "overdue" },
  { id: 4, category: "Swimming Pool", description: "Filter cleaning & water treatment", lastDone: "2026-05-01", intervalDays: 14, nextDue: "2026-05-15", status: "overdue" },
  { id: 5, category: "Repairs", description: "Perimeter fence repainting", lastDone: "2025-10-01", intervalDays: 365, nextDue: "2026-10-01", status: "ok" },
];

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", roles: ["admin","security","accountant","resident"] },
  { id: "access", label: "Access Control", icon: "🔐", roles: ["admin","security","resident"] },
  { id: "dues", label: "Dues & Payments", icon: "💳", roles: ["admin","accountant","resident"] },
  { id: "activities", label: "Activities", icon: "🔧", roles: ["admin","accountant"] },
  { id: "accounts", label: "Estate Accounts", icon: "📊", roles: ["admin","accountant"] },
  { id: "meetings", label: "Meetings", icon: "🗓️", roles: ["admin","resident"] },
  { id: "residents", label: "Residents", icon: "👥", roles: ["admin","security"] },
  { id: "history", label: "History & Audit", icon: "📋", roles: ["admin","accountant"] },
  { id: "users", label: "User Management", icon: "🔑", roles: ["admin"] },
  { id: "email", label: "Email Inbox", icon: "📧", roles: ["admin","accountant"] },
];
const ROLE_COLORS = { admin: "#1a1a2e", security: "#1b5e3a", accountant: "#7c3a00", resident: "#2d3ea0" };
const ROLE_LABELS = { admin: "Admin", security: "Security", accountant: "Accountant", resident: "Resident" };

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#f0ede8}::-webkit-scrollbar-thumb{background:#c8b89055;border-radius:4px}
.sb-btn{display:flex;align-items:center;gap:10px;padding:10px 12px;border:none;background:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:500;color:#5a5a7a;border-radius:10px;transition:all 0.15s;width:100%;text-align:left}
.sb-btn:hover{background:#e8e2d866;color:#1a1a2e}
.sb-btn.active{background:linear-gradient(135deg,#1a1a2e,#2d2d5e);color:#f0ede8;font-weight:700}
.card{background:#fff;border-radius:16px;padding:20px;border:1px solid #e4dfd8;box-shadow:0 2px 10px #0000000a}
.card-dark{background:#1a1a2e;border-radius:16px;padding:20px;color:#f0ede8}
.btn{border:none;border-radius:10px;padding:9px 16px;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.15s}
.btn:hover{transform:translateY(-1px);opacity:0.88}
.btn-primary{background:linear-gradient(135deg,#1a1a2e,#2d2d5e);color:#f0ede8}
.btn-gold{background:linear-gradient(135deg,#c8a84b,#a07830);color:#fff}
.btn-green{background:linear-gradient(135deg,#2e7d52,#1b5e3a);color:#fff}
.btn-red{background:linear-gradient(135deg,#c0392b,#96281b);color:#fff}
.btn-orange{background:linear-gradient(135deg,#e67e22,#c05000);color:#fff}
.btn-outline{background:none;border:1.5px solid #1a1a2e22;color:#5a5a7a}
.btn-sm{padding:6px 12px;font-size:11.5px;border-radius:8px}
.inp{background:#f7f4f0;border:1.5px solid #e4dfd8;border-radius:10px;color:#1a1a2e;padding:9px 13px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none;transition:border 0.15s}
.inp:focus{border-color:#c8a84b88}
.sel{appearance:none;background:#f7f4f0 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a5a7a' fill='none' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right 11px center;border:1.5px solid #e4dfd8;border-radius:10px;color:#1a1a2e;padding:9px 30px 9px 13px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none}
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.3px;white-space:nowrap}
.b-ok{background:#e6f5ee;color:#1e6e42}.b-warn{background:#fef3e0;color:#a05c0a}.b-danger{background:#fde8e8;color:#b0291e}
.b-blue{background:#e6eeff;color:#2540a0}.b-grey{background:#f0f0f5;color:#6060a0}.b-gold{background:#fef6e0;color:#8a6e18}.b-purple{background:#f0e8ff;color:#5c20a0}
.trow{display:grid;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid #f0ece6}
.thead{display:grid;gap:10px;padding:7px 0;border-bottom:2px solid #e4dfd8;margin-bottom:2px}
.th{font-size:10px;font-weight:700;color:#9090b0;text-transform:uppercase;letter-spacing:0.9px}
.stat-val{font-family:'Playfair Display',serif;font-size:32px;font-weight:900;line-height:1}
.sec-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:700;color:#1a1a2e;margin-bottom:20px}
.modal-bg{position:fixed;inset:0;background:#00000068;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
.modal-box{background:#fff;border-radius:20px;padding:28px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px #00000030}
.modal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin-bottom:20px;color:#1a1a2e}
.frow{margin-bottom:13px}.flabel{font-size:10px;font-weight:700;color:#9090b0;text-transform:uppercase;letter-spacing:0.9px;margin-bottom:5px;display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp 0.3s ease}
@keyframes tIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
.toast{position:fixed;top:20px;right:20px;z-index:500;padding:12px 18px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px #00000022;animation:tIn 0.28s ease;max-width:340px}
.toast-success{background:#1a1a2e;color:#f0ede8}.toast-warn{background:#c8a84b;color:#fff}.toast-error{background:#c0392b;color:#fff}.toast-info{background:#2d3ea0;color:#fff}
.code-box{font-family:'DM Mono',monospace;font-size:28px;font-weight:500;letter-spacing:8px;background:#f7f4f0;border:2px dashed #c8a84b;border-radius:14px;padding:20px;text-align:center;color:#1a1a2e;margin:14px 0}
.alert-bar{border-radius:12px;padding:12px 16px;font-size:13px;margin-bottom:12px}
.alert-red{background:#fde8e8;border:1.5px solid #c0392b33;color:#c0392b}
.alert-gold{background:#fef3e0;border:1.5px solid #c8a84b44;color:#a05c0a}
.alert-green{background:#e6f5ee;border:1.5px solid #2e7d5244;color:#1e6e42}
.alert-blue{background:#e6eeff;border:1.5px solid #2d3ea044;color:#2d3ea0}
.tab-pill{padding:6px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all 0.15s}
.search-inp{background:#f7f4f0;border:1.5px solid #e4dfd8;border-radius:10px;color:#1a1a2e;padding:8px 12px;font-family:'DM Sans',sans-serif;font-size:12px;outline:none;width:200px}
.email-preview{background:#f7f4f0;border-radius:10px;padding:14px;font-size:12px;color:#5a5a7a;font-family:'DM Mono',monospace;white-space:pre-wrap;max-height:200px;overflow-y:auto;line-height:1.6}
.number-tag{background:#c8a84b;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:4px}
`;

export default function PearlCourtEstate() {
  const [users, setUsers] = useState(seedUsers);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [residents, setResidents] = useState(seedResidents);
  const [vehicles, setVehicles] = useState(seedVehicles);
  const [accessCodes, setAccessCodes] = useState([]);
  const [gateLog, setGateLog] = useState([]);
  const [dues, setDues] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState(seedActivities);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [dieselLog, setDieselLog] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [emails, setEmails] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const emailsRef = useRef(emails);
  emailsRef.current = emails;
const API_BASE = "https://pearl-court-backend.onrender.com/api";

const [cloudReady, setCloudReady] = useState(false);
const [cloudStatus, setCloudStatus] = useState("Connecting to cloud...");

const loadCollection = async (name, fallback) => {
  try {
    const response = await fetch(`${API_BASE}/data/${name}`);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return data;
    }

    await fetch(`${API_BASE}/data/${name}/replace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fallback),
    });

    return fallback;
  } catch (error) {
    console.error(`Failed to load ${name}:`, error);
    return fallback;
  }
};

const saveCollection = async (name, data) => {
  try {
    await fetch(`${API_BASE}/data/${name}/replace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`Failed to save ${name}:`, error);
  }
};

useEffect(() => {
  const hydrateFromCloud = async () => {
    try {
      setCloudStatus("Loading cloud data...");

      const [
        cloudUsers,
        cloudResidents,
        cloudVehicles,
        cloudAccessCodes,
        cloudGateLog,
        cloudDues,
        cloudTransactions,
        cloudActivities,
        cloudMaintenanceHistory,
        cloudDieselLog,
        cloudMeetings,
        cloudActivityLog,
        cloudEmails,
      ] = await Promise.all([
        loadCollection("users", seedUsers),
        loadCollection("residents", seedResidents),
        loadCollection("vehicles", seedVehicles),
        loadCollection("accessCodes", []),
        loadCollection("gateLogs", []),
        loadCollection("dues", []),
        loadCollection("transactions", []),
        loadCollection("activities", seedActivities),
        loadCollection("maintenanceHistory", []),
        loadCollection("dieselLog", []),
        loadCollection("meetings", []),
        loadCollection("activityLog", []),
        loadCollection("emails", []),
      ]);

      setUsers(cloudUsers);
      setResidents(cloudResidents);
      setVehicles(cloudVehicles);
      setAccessCodes(cloudAccessCodes);
      setGateLog(cloudGateLog);
      setDues(cloudDues);
      setTransactions(cloudTransactions);
      setActivities(cloudActivities);
      setMaintenanceHistory(cloudMaintenanceHistory);
      setDieselLog(cloudDieselLog);
      setMeetings(cloudMeetings);
      setActivityLog(cloudActivityLog);
      setEmails(cloudEmails);

      setCloudReady(true);
      setCloudStatus("Cloud sync active");
    } catch (error) {
      console.error("Cloud hydration failed:", error);
      setCloudStatus("Cloud sync failed; using local state");
      setCloudReady(true);
    }
  };

  hydrateFromCloud();
}, []);
useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("users", users), 1200);
  return () => clearTimeout(t);
}, [users, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("residents", residents), 1200);
  return () => clearTimeout(t);
}, [residents, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("vehicles", vehicles), 1200);
  return () => clearTimeout(t);
}, [vehicles, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("accessCodes", accessCodes), 1200);
  return () => clearTimeout(t);
}, [accessCodes, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("gateLogs", gateLog), 1200);
  return () => clearTimeout(t);
}, [gateLog, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("dues", dues), 1200);
  return () => clearTimeout(t);
}, [dues, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("transactions", transactions), 1200);
  return () => clearTimeout(t);
}, [transactions, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("activities", activities), 1200);
  return () => clearTimeout(t);
}, [activities, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(
    () => saveCollection("maintenanceHistory", maintenanceHistory),
    1200
  );
  return () => clearTimeout(t);
}, [maintenanceHistory, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("dieselLog", dieselLog), 1200);
  return () => clearTimeout(t);
}, [dieselLog, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("meetings", meetings), 1200);
  return () => clearTimeout(t);
}, [meetings, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("activityLog", activityLog), 1200);
  return () => clearTimeout(t);
}, [activityLog, cloudReady]);

useEffect(() => {
  if (!cloudReady) return;
  const t = setTimeout(() => saveCollection("emails", emails), 1200);
  return () => clearTimeout(t);
}, [emails, cloudReady]);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  // Auto-send maintenance alerts on load
  useEffect(() => {
    const toSend = [];
    seedActivities.forEach(a => {
      const d = daysUntil(a.nextDue);
      if (d <= 14) {
        const e = sendEmailSim(ESTATE_EMAIL, `⚠️ Maintenance Alert: ${a.category}`, `Dear Estate Manager,\n\nAutomated Reminder:\n\n📌 Activity: ${a.category}\n📋 Description: ${a.description}\n📅 Due Date: ${a.nextDue}\n⏱ Status: ${d < 0 ? `Overdue by ${Math.abs(d)} days` : `Due in ${d} days`}\n\nPlease schedule this maintenance immediately.\n\n— Pearl Court EMS (Auto-generated)`, "maintenance");
        toSend.push(e);
      }
    });
    if (toSend.length) setEmails([...toSend]);
  }, []);

  // Auto-check access codes for expiry registration via email subject pattern
  useEffect(() => {
    const interval = setInterval(() => {
      // Check emails for unregistered PCE codes
      emailsRef.current.forEach(em => {
        if (em.tag === "access-request" && !em.processed) {
          const match = em.subject.match(/PCE-\d{4}/);
          if (match) {
            const code = match[0];
            setAccessCodes(prev => {
              if (prev.find(c => c.code === code)) return prev;
              const entry = { code, residentId: 0, apt: "Email", visitorName: em.from || "Email Visitor", purpose: "General", created: new Date().toISOString(), expires: new Date(Date.now() + 15 * 60000).toISOString(), used: false, direction: "in", source: "email-auto" };
              return [entry, ...prev];
            });
            setEmails(es => es.map(e => e.id === em.id ? { ...e, processed: true } : e));
          }
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const logAction = useCallback((user, action, detail) => {
    setActivityLog(al => [{ id: Date.now(), datetime: new Date().toISOString(), user: user.username, action, detail }, ...al]);
  }, []);

  const dispatchEmail = useCallback((to, subject, body, tag = "general") => {
    const e = sendEmailSim(to, subject, body, tag);
    setEmails(prev => [e, ...prev]);
    return e;
  }, []);

  const handleLogin = (username, password) => {
    const u = users.find(x => x.username === username && x.password === password && x.active);
    if (!u) { setLoginError("Invalid username or password."); return; }
    setCurrentUser(u); setLoginError(""); setTab("dashboard");
    setActivityLog(al => [{ id: Date.now(), datetime: new Date().toISOString(), user: u.username, action: "Logged in", detail: `${ROLE_LABELS[u.role]} — ${u.name}` }, ...al]);
  };
  const handleLogout = () => {
    logAction(currentUser, "Logged out", `${currentUser.name} signed out`);
    setCurrentUser(null); setTab("dashboard");
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} error={loginError} />;

  const role = currentUser.role;
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const overdueCount = dues.filter(d => d.status === "overdue").length;
  const overdueActivities = activities.filter(a => a.status !== "ok").length;
  const isRestricted = (residentId) => {
    const r = residents.find(x => x.id === residentId);
    if (!r || !r.duesOwed || !r.suspendedSince) return false;
    return daysSince(r.suspendedSince) >= 15;
  };
  const restrictedApts = residents.filter(r => r.duesOwed && r.suspendedSince && daysSince(r.suspendedSince) >= 15);
  const unreadEmails = emails.filter(e => !e.read).length;
  const visibleTabs = TABS.filter(t => t.roles.includes(role));

  const sharedProps = { residents, setResidents, vehicles, setVehicles, accessCodes, setAccessCodes, gateLog, setGateLog, dues, setDues, transactions, setTransactions, activities, setActivities, maintenanceHistory, setMaintenanceHistory, dieselLog, setDieselLog, meetings, setMeetings, users, setUsers, activityLog, setActivityLog, notify, logAction, dispatchEmail, clock, isRestricted, restrictedApts, currentUser, setCurrentUser, setModal };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "#f0ede8", color: "#1a1a2e" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{CSS}</style>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      {modal && <ModalRouter modal={modal} closeModal={() => setModal(null)} {...sharedProps} />}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{ width: 218, background: "#faf8f4", borderRight: "1px solid #e4dfd8", display: "flex", flexDirection: "column", padding: "18px 10px", position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "0 6px 16px", borderBottom: "1px solid #e4dfd8", marginBottom: 12 }}>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 15, color: "#1a1a2e" }}>PEARL COURT</div>
            <div style={{ fontSize: 9, color: "#9090b0", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Estate Management</div>
            <div style={{ fontSize: 10, color: "#b0a890", marginTop: 2 }}>12/14 Oladipo Bateye St, GRA Ikeja</div>
            <div style={{ fontSize: 10, color: "#2e7d52", marginTop: 6, fontWeight: 700 }}>
  {cloudStatus}
</div>
          </div>
          <div style={{ background: ROLE_COLORS[role], borderRadius: 10, padding: "9px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#ffffff99", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{ROLE_LABELS[role]}</div>
            <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 700, marginTop: 2 }}>{currentUser.name}</div>
            {currentUser.apt && <div style={{ fontSize: 11, color: "#ffffff88" }}>{currentUser.apt}</div>}
          </div>
          {restrictedApts.length > 0 && (role === "admin" || role === "security") && (
            <div style={{ background: "#fde8e8", border: "1px solid #c0392b44", borderRadius: 10, padding: "7px 10px", marginBottom: 10, fontSize: 11, color: "#c0392b", fontWeight: 700 }}>⛔ {restrictedApts.length} apt(s) restricted</div>
          )}
          {visibleTabs.map(t => (
            <button key={t.id} className={`sb-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span style={{ flex: 1 }}>{t.label}</span>
              {t.id === "email" && unreadEmails > 0 && <span className="number-tag">{unreadEmails}</span>}
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: "14px 6px 0", borderTop: "1px solid #e4dfd8" }}>
            <div style={{ fontFamily: "DM Mono", fontSize: 17, fontWeight: 500, color: "#1a1a2e" }}>{clock.toTimeString().slice(0, 8)}</div>
            <div style={{ fontSize: 10, color: "#9090b0" }}>{clock.toDateString()}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button className="btn btn-sm btn-outline" style={{ flex: 1, fontSize: 11 }} onClick={() => setModal({ type: "change-password", data: {} })}>🔒 Pwd</button>
              <button className="btn btn-sm btn-red" style={{ flex: 1, fontSize: 11 }} onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: "22px", overflowY: "auto" }}>
          {tab === "dashboard" && <Dashboard {...sharedProps} balance={balance} overdueCount={overdueCount} overdueActivities={overdueActivities} setTab={setTab} role={role} />}
          {tab === "access" && <AccessControl {...sharedProps} role={role} />}
          {tab === "dues" && <DuesPayments {...sharedProps} role={role} />}
          {tab === "activities" && <Activities {...sharedProps} role={role} />}
          {tab === "accounts" && <Accounts {...sharedProps} balance={balance} totalIncome={totalIncome} totalExpense={totalExpense} role={role} />}
          {tab === "meetings" && <Meetings {...sharedProps} role={role} />}
          {tab === "residents" && <ResidentsTab {...sharedProps} role={role} />}
          {tab === "history" && <HistoryAudit {...sharedProps} />}
          {tab === "users" && role === "admin" && <UserManagement {...sharedProps} />}
          {tab === "email" && <EmailInbox emails={emails} setEmails={setEmails} />}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, error }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [show, setShow] = useState(false);
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "linear-gradient(135deg,#1a1a2e 0%,#2d2d5e 60%,#1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Playfair+Display:wght@900&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.inp2{background:#f7f4f0;border:1.5px solid #e4dfd8;border-radius:10px;color:#1a1a2e;padding:10px 13px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none}`}</style>
      <div style={{ background: "#fff", borderRadius: 24, padding: "36px 32px", width: "100%", maxWidth: 400, boxShadow: "0 32px 80px #00000040" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 24, color: "#1a1a2e" }}>PEARL COURT</div>
          <div style={{ fontSize: 10, color: "#9090b0", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>Estate Management System</div>
          <div style={{ fontSize: 11, color: "#b0a890", marginTop: 5 }}>12/14 Oladipo Bateye St, GRA Ikeja</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#9090b0", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 5, display: "block" }}>Username</label>
          <input className="inp2" placeholder="Enter your username" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key === "Enter" && onLogin(u, p)} autoComplete="off" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#9090b0", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 5, display: "block" }}>Password</label>
          <div style={{ position: "relative" }}>
            <input className="inp2" type={show ? "text" : "password"} placeholder="Enter your password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === "Enter" && onLogin(u, p)} style={{ paddingRight: 40 }} autoComplete="current-password" />
            <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9090b0" }}>{show ? "🙈" : "👁️"}</button>
          </div>
        </div>
        {error && <div style={{ background: "#fde8e8", border: "1px solid #c0392b33", borderRadius: 10, padding: "10px 13px", fontSize: 12.5, color: "#c0392b", marginBottom: 14, fontWeight: 600 }}>⚠️ {error}</div>}
        <button onClick={() => onLogin(u, p)} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#1a1a2e,#2d2d5e)", color: "#f0ede8", border: "none", borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Sign In →</button>
        <div style={{ marginTop: 16, fontSize: 11, color: "#c0b898", textAlign: "center" }}>Contact your estate admin if you've forgotten your credentials.</div>
      </div>
    </div>
  );
}

// ─── EMAIL INBOX ───────────────────────────────────────────────────────────────
function EmailInbox({ emails, setEmails }) {
  const [sel, setSel] = useState(null);
  const tagColors = { maintenance: "b-warn", dues: "b-danger", invoice: "b-ok", access: "b-blue", general: "b-grey", "access-request": "b-purple" };
  const markRead = (id) => setEmails(es => es.map(e => e.id === id ? { ...e, read: true } : e));
  return (
    <div className="fade-up">
      <div className="sec-title">📧 Email Inbox <span style={{ fontSize: 14, color: "#9090b0" }}>— {ESTATE_EMAIL}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
        <div>
          {emails.length === 0 && <div className="card" style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: 30 }}>📭 No emails yet</div>}
          {emails.map(e => (
            <div key={e.id} className="card" style={{ marginBottom: 8, cursor: "pointer", border: sel?.id === e.id ? "2px solid #1a1a2e" : "1px solid #e4dfd8", opacity: e.read ? 0.7 : 1 }} onClick={() => { setSel(e); markRead(e.id); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  {!e.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d3ea0", display: "inline-block", marginRight: 6 }} />}
                  <span style={{ fontWeight: e.read ? 500 : 700, fontSize: 12.5 }}>{e.subject}</span>
                  <div style={{ fontSize: 11, color: "#9090b0", marginTop: 3 }}>To: {e.to}</div>
                  <div style={{ fontSize: 10, color: "#c0b898" }}>{e.sentAt.replace("T", " ").slice(0, 16)}</div>
                </div>
                <span className={`badge ${tagColors[e.tag] || "b-grey"}`}>{e.tag}</span>
              </div>
            </div>
          ))}
        </div>
        {sel ? (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{sel.subject}</div>
            <div style={{ fontSize: 11, color: "#9090b0", marginBottom: 4 }}>To: <b>{sel.to}</b></div>
            <div style={{ fontSize: 11, color: "#9090b0", marginBottom: 16 }}>Sent: {sel.sentAt.replace("T", " ").slice(0, 16)}</div>
            <div className="email-preview">{sel.body}</div>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#c0b898" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 40 }}>📧</div><div style={{ fontSize: 13, marginTop: 8 }}>Select an email to read</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ residents, dues, gateLog, activities, balance, overdueCount, overdueActivities, setTab, restrictedApts, role, currentUser }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const myDue = role === "resident" ? dues.find(d => d.apt === currentUser.apt && d.status === "overdue") : null;
  const stats = role === "resident" ? [
    { label: "My Dues Status", value: myDue ? "OVERDUE" : "CLEAR", color: myDue ? "#c0392b" : "#2e7d52", tab: "dues", icon: "💳" },
    { label: "Gate Access", value: restrictedApts.some(r => r.apt === currentUser.apt) ? "Restricted" : "Active", color: restrictedApts.some(r => r.apt === currentUser.apt) ? "#c0392b" : "#2e7d52", tab: "access", icon: "🔐" },
  ] : [
    { label: "Account Balance", value: naira(balance), color: "#2e7d52", tab: "accounts", icon: "💰" },
    { label: "Dues Overdue", value: overdueCount, sub: "apartments", color: "#c0392b", tab: "dues", icon: "⚠️" },
    { label: "Maint. Alerts", value: overdueActivities, sub: "due/overdue", color: "#b7640a", tab: "activities", icon: "🔧" },
    { label: "Restricted Apts", value: restrictedApts.length, sub: "no gate access", color: "#7c3a00", tab: "residents", icon: "🚫" },
  ];
  const recentGate = [...gateLog].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 4);
  const alertActivities = activities.filter(a => a.status !== "ok");
  const currentDues = dues.filter(d => d.status === "overdue").slice(0, 5);
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Playfair Display", fontSize: 24, fontWeight: 900 }}>{greeting}, {currentUser.name.split(" ")[0]} 👋</div>
        <div style={{ color: "#9090b0", fontSize: 13, marginTop: 3 }}>Pearl Court Estate — GRA Ikeja</div>
      </div>
      {restrictedApts.length > 0 && (role === "admin" || role === "security") && (
        <div className="alert-bar alert-red" style={{ fontWeight: 700 }}>⛔ SECURITY ALERT — {restrictedApts.length} apt(s) RESTRICTED: {restrictedApts.map(r => r.apt).join(", ")} — No gate access & Generator cut</div>
      )}
      {role === "resident" && restrictedApts.some(r => r.apt === currentUser.apt) && (
        <div className="alert-bar alert-red" style={{ fontWeight: 700 }}>⛔ Your apartment is restricted due to overdue dues. Visitors are not permitted and generator may be suspended.</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 14, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ cursor: "pointer", borderTop: `4px solid ${s.color}` }} onClick={() => setTab(s.tab)}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div className="stat-val" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, color: "#9090b0" }}>{s.sub}</div>}
          </div>
        ))}
      </div>
      {role !== "resident" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔐 Recent Gate Activity</div>
            {recentGate.length === 0 && <div style={{ fontSize: 12, color: "#9090b0" }}>No gate activity yet.</div>}
            {recentGate.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f0ece6" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: l.result === "granted" ? "#2e7d52" : "#c0392b", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12 }}><div style={{ fontWeight: 600 }}>{l.event} — {l.person}</div><div style={{ color: "#9090b0" }}>{l.date} {l.time} · {l.apt}</div></div>
                <span className={`badge ${l.result === "granted" ? "b-ok" : "b-danger"}`}>{l.result}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔧 Maintenance Alerts</div>
            {alertActivities.length === 0 && <div style={{ fontSize: 12, color: "#9090b0" }}>✅ All maintenance up to date</div>}
            {alertActivities.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f0ece6" }}>
                <div style={{ flex: 1, fontSize: 12 }}><div style={{ fontWeight: 600 }}>{a.category}</div><div style={{ color: "#9090b0" }}>Due: {a.nextDue}</div></div>
                <span className={`badge ${a.status === "overdue" ? "b-danger" : "b-warn"}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {dues.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>💳 Outstanding Dues</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
            {(role === "resident" ? dues.filter(d => d.apt === currentUser.apt) : currentDues).map(d => (
              <div key={d.id} style={{ background: "#f7f4f0", borderRadius: 10, padding: "10px 12px", borderLeft: `4px solid ${d.status === "paid" ? "#2e7d52" : "#c0392b"}` }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{d.apt}</div>
                <div style={{ fontSize: 11, color: "#9090b0" }}>{d.quarter} {d.year}</div>
                <div style={{ fontSize: 11, fontFamily: "DM Mono", color: "#1a1a2e", marginTop: 3 }}>{naira(d.amount)}</div>
                <span className={`badge ${d.status === "paid" ? "b-ok" : "b-danger"}`} style={{ marginTop: 5 }}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ACCESS CONTROL ────────────────────────────────────────────────────────────
function AccessControl({ residents, vehicles, accessCodes, setAccessCodes, gateLog, setGateLog, setModal, role, clock, isRestricted, currentUser, restrictedApts, dispatchEmail, logAction, notify }) {
  const [codeInput, setCodeInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [subTab, setSubTab] = useState("verify");

  const verifyCode = () => {
    const code = accessCodes.find(c => c.code === codeInput.trim().toUpperCase());
    if (!code) { setVerifyResult({ ok: false, msg: "❌ Code not found in system." }); return; }
    if (isExpired(code.expires)) { setVerifyResult({ ok: false, msg: "⏱ Code has expired (15-min limit)." }); return; }
    if (code.used) { setVerifyResult({ ok: false, msg: "🚫 Code already used." }); return; }
    if (code.residentId && isRestricted(code.residentId)) { setVerifyResult({ ok: false, msg: `⛔ Access DENIED — ${code.apt} dues overdue >15 days. Do NOT open gate.` }); return; }
    const r = code.residentId ? residents.find(r => r.id === code.residentId) : null;
    // Mark as used
    setAccessCodes(cs => cs.map(c => c.code === code.code ? { ...c, used: true } : c));
    // Log gate entry
    const entry = { id: Date.now(), time: clock.toTimeString().slice(0, 5), date: fmt(new Date()), event: `Visitor ${code.direction.toUpperCase()}`, person: code.visitorName, code: code.code, gate: "Main Gate", result: "granted", apt: code.apt };
    setGateLog(l => [entry, ...l]);
    logAction(currentUser, "Verified gate code", `${code.code} — ${code.visitorName} → ${code.apt} (granted)`);
    setVerifyResult({ ok: true, msg: "✅ Access GRANTED", code, resident: r });
  };

  const canGenerate = role === "admin" || role === "resident";
  const myRestricted = role === "resident" && isRestricted(residents.find(r => r.apt === currentUser.apt)?.id);
  const activeCodes = role === "resident"
    ? accessCodes.filter(c => !isExpired(c.expires) && !c.used && c.apt === currentUser.apt)
    : accessCodes.filter(c => !isExpired(c.expires) && !c.used);
  const expiredCodes = accessCodes.filter(c => isExpired(c.expires) || c.used);

  const tabs = role === "security"
    ? [["verify", "Verify Code"], ["gatelog", "Gate Log"], ["vehicles", "Vehicles"]]
    : role === "resident"
    ? [["verify", "Verify"], ["active", "My Codes"]]
    : [["verify", "Verify"], ["active", "Active Codes"], ["expired", "Used/Expired"], ["gatelog", "Gate Log"], ["vehicles", "Vehicles"]];

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>🔐 Access Control</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canGenerate && !myRestricted && <button className="btn btn-gold" onClick={() => setModal({ type: "generate-code", data: {} })}>🔑 Generate Code</button>}
          {myRestricted && <div style={{ fontSize: 12, color: "#c0392b", fontWeight: 700, padding: "8px 12px", background: "#fde8e8", borderRadius: 10 }}>⛔ Code generation blocked</div>}
          {(role === "admin" || role === "security") && <button className="btn btn-primary" onClick={() => setModal({ type: "log-vehicle", data: {} })}>🚗 Log Vehicle</button>}
          {role === "admin" && <button className="btn btn-outline" onClick={() => setModal({ type: "register-vehicle", data: {} })}>+ Register Vehicle</button>}
        </div>
      </div>
      {restrictedApts.length > 0 && (role === "admin" || role === "security") && (
        <div className="alert-bar alert-red">⛔ <b>Restricted — No Gate Access & No Generator:</b> {restrictedApts.map(r => `${r.apt} (${r.name})`).join(", ")}</div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(([id, label]) => <button key={id} className="tab-pill" style={{ background: subTab === id ? "#1a1a2e" : "#fff", color: subTab === id ? "#f0ede8" : "#5a5a7a", border: "1px solid #e4dfd8" }} onClick={() => setSubTab(id)}>{label}</button>)}
      </div>

      {subTab === "verify" && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🔍 Gate Code Verification</div>
          <div className="alert-bar alert-blue" style={{ fontSize: 12, marginBottom: 14 }}>
            <b>How codes reach the gate:</b> Resident generates code in the app → shares with visitor (WhatsApp/SMS) → visitor presents code at gate → security enters here to verify.
            <br /><br />Residents may also email a code (e.g. <b>PCE-XXXX</b>) to <b>{ESTATE_EMAIL}</b>. The code is automatically registered and verifiable here.
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input className="inp" placeholder="Enter code e.g. PCE-4821" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} style={{ fontFamily: "DM Mono", letterSpacing: 3, fontSize: 15 }} onKeyDown={e => e.key === "Enter" && verifyCode()} />
            <button className="btn btn-primary" onClick={verifyCode}>Verify</button>
          </div>
          {verifyResult && (
            <div style={{ background: verifyResult.ok ? "#e6f5ee" : "#fde8e8", border: `1.5px solid ${verifyResult.ok ? "#2e7d52" : "#c0392b"}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: verifyResult.ok ? "#1e6e42" : "#c0392b", fontSize: 15, marginBottom: verifyResult.code ? 10 : 0 }}>{verifyResult.msg}</div>
              {verifyResult.code && <div style={{ fontSize: 13, color: "#5a5a7a", display: "grid", gap: 4 }}>
                <div>👤 Visitor: <b>{verifyResult.code.visitorName}</b></div>
                <div>🏠 Host Apartment: <b>{verifyResult.code.apt}</b>{verifyResult.resident ? ` — ${verifyResult.resident.name}` : ""}</div>
                <div>📋 Purpose: <b>{verifyResult.code.purpose}</b></div>
                <div>🚦 Direction: <b>{verifyResult.code.direction === "in" ? "ENTRY (IN)" : "EXIT (OUT)"}</b></div>
                <div style={{ fontSize: 11, color: "#2e7d52", marginTop: 4, fontWeight: 700 }}>✅ Code marked as used — gate logged automatically</div>
              </div>}
            </div>
          )}
        </div>
      )}

      {subTab === "active" && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Active Codes ({activeCodes.length})</div>
          {activeCodes.length === 0 && <div style={{ color: "#9090b0", fontSize: 13 }}>No active codes right now.</div>}
          <div className="thead" style={{ gridTemplateColumns: "110px 1fr 1fr 80px 90px 70px" }}>{["CODE", "VISITOR", "HOST", "DIR", "EXPIRES", "SRC"].map(h => <div key={h} className="th">{h}</div>)}</div>
          {activeCodes.map(c => { const mins = Math.max(0, Math.floor((new Date(c.expires) - new Date()) / 60000)); return (
            <div key={c.code} className="trow" style={{ gridTemplateColumns: "110px 1fr 1fr 80px 90px 70px" }}>
              <div style={{ fontFamily: "DM Mono", fontWeight: 500, color: "#c8a84b", fontSize: 13 }}>{c.code}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.visitorName}</div>
              <div style={{ fontSize: 12, color: "#5a5a7a" }}>{c.apt}</div>
              <span className="badge b-blue">{c.direction}</span>
              <span className={`badge ${mins < 5 ? "b-danger" : "b-warn"}`}>{mins}m left</span>
              <span className={`badge ${c.source === "email-auto" ? "b-purple" : "b-grey"}`}>{c.source || "app"}</span>
            </div>
          ); })}
        </div>
      )}
      {subTab === "expired" && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Used & Expired Codes ({expiredCodes.length})</div>
          {expiredCodes.length === 0 && <div style={{ color: "#9090b0", fontSize: 13 }}>None yet.</div>}
          <div className="thead" style={{ gridTemplateColumns: "110px 1fr 1fr 80px 80px" }}>{["CODE", "VISITOR", "HOST", "STATUS", "SRC"].map(h => <div key={h} className="th">{h}</div>)}</div>
          {expiredCodes.map(c => <div key={c.code} className="trow" style={{ gridTemplateColumns: "110px 1fr 1fr 80px 80px" }}><div style={{ fontFamily: "DM Mono", color: "#9090b0", fontSize: 12 }}>{c.code}</div><div style={{ fontSize: 13 }}>{c.visitorName}</div><div style={{ fontSize: 12, color: "#9090b0" }}>{c.apt}</div><span className={`badge ${c.used ? "b-grey" : "b-danger"}`}>{c.used ? "used" : "expired"}</span><span className="badge b-grey">{c.source || "app"}</span></div>)}
        </div>
      )}
      {subTab === "gatelog" && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Gate Log — All Time ({gateLog.length})</div>
          {gateLog.length === 0 && <div style={{ color: "#9090b0", fontSize: 13 }}>No gate activity yet.</div>}
          <div className="thead" style={{ gridTemplateColumns: "90px 60px 1fr 1fr 90px 90px" }}>{["DATE", "TIME", "EVENT", "PERSON", "APT", "RESULT"].map(h => <div key={h} className="th">{h}</div>)}</div>
          {[...gateLog].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map(l => <div key={l.id} className="trow" style={{ gridTemplateColumns: "90px 60px 1fr 1fr 90px 90px" }}><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{l.date}</div><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{l.time}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{l.event}</div><div style={{ fontSize: 12, color: "#5a5a7a" }}>{l.person}</div><div style={{ fontSize: 12, color: "#9090b0" }}>{l.apt}</div><span className={`badge ${l.result === "granted" ? "b-ok" : "b-danger"}`}>{l.result}</span></div>)}
        </div>
      )}
      {subTab === "vehicles" && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>🚗 Registered Vehicles ({vehicles.length})</div>
          <div className="thead" style={{ gridTemplateColumns: "1fr 1fr 1.2fr 90px" }}>{["PLATE", "VEHICLE", "OWNER", "UNIT"].map(h => <div key={h} className="th">{h}</div>)}</div>
          {vehicles.map(v => <div key={v.id} className="trow" style={{ gridTemplateColumns: "1fr 1fr 1.2fr 90px" }}><div style={{ fontFamily: "DM Mono", fontWeight: 500, fontSize: 13 }}>{v.plate}</div><div style={{ fontSize: 13 }}>{v.make}</div><div style={{ fontSize: 13, color: "#5a5a7a" }}>{v.owner}</div><span className="badge b-blue">{v.apt}</span></div>)}
        </div>
      )}
    </div>
  );
}

// ─── DUES & PAYMENTS ───────────────────────────────────────────────────────────
function DuesPayments({ residents, dues, setDues, setResidents, transactions, setTransactions, setModal, role, currentUser, restrictedApts, dispatchEmail, logAction, notify }) {
  const [qFilter, setQFilter] = useState("all");
  const quarters = ["all", ...Array.from(new Set(dues.map(d => `${d.quarter} ${d.year}`))).sort().reverse()];
  let viewDues = dues;
  if (role === "resident") viewDues = dues.filter(d => d.apt === currentUser.apt);
  if (qFilter !== "all") viewDues = viewDues.filter(d => `${d.quarter} ${d.year}` === qFilter);
  const paid = viewDues.filter(d => d.status === "paid");
  const overdue = viewDues.filter(d => d.status === "overdue");

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>💳 Dues & Payments</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(role === "admin" || role === "accountant") && <>
            <button className="btn btn-gold" onClick={() => setModal({ type: "send-notice", data: {} })}>📧 Demand Notices</button>
            <button className="btn btn-green" onClick={() => setModal({ type: "record-payment", data: {} })}>✅ Record Payment</button>
            <button className="btn btn-primary" onClick={() => setModal({ type: "new-quarter", data: {} })}>+ New Quarter</button>
          </>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        <div className="card" style={{ borderTop: "4px solid #2e7d52" }}><div className="stat-val" style={{ color: "#2e7d52", fontSize: 28 }}>{paid.length}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Paid</div><div style={{ fontSize: 11, color: "#9090b0" }}>{naira(paid.reduce((s, d) => s + d.amount, 0))} received</div></div>
        <div className="card" style={{ borderTop: "4px solid #c0392b" }}><div className="stat-val" style={{ color: "#c0392b", fontSize: 28 }}>{overdue.length}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Overdue</div><div style={{ fontSize: 11, color: "#9090b0" }}>{naira(overdue.reduce((s, d) => s + d.amount, 0))} outstanding</div></div>
        <div className="card" style={{ borderTop: "4px solid #c8a84b" }}><div className="stat-val" style={{ color: "#c8a84b", fontSize: 22 }}>{dues.length}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Total Records</div><div style={{ fontSize: 11, color: "#9090b0" }}>All quarters</div></div>
      </div>
      {overdue.length > 0 && (role === "admin" || role === "accountant") && (
        <div className="alert-bar alert-red" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⛔ Restrictions Active</div>
          {overdue.map(d => { const r = residents.find(x => x.id === d.residentId); const days = r?.suspendedSince ? daysSince(r.suspendedSince) : 0; return <div key={d.id} style={{ fontSize: 12, padding: "2px 0" }}>🚫 <b>{d.apt}</b> — {d.resident} · {days >= 15 ? "FULLY RESTRICTED (no gate, no generator)" : `Grace period: ${Math.max(0, 15 - days)} day(s) remaining`}</div>; })}
        </div>
      )}
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Filter:</span>
          {quarters.map(q => <button key={q} className="tab-pill" style={{ background: qFilter === q ? "#1a1a2e" : "#f7f4f0", color: qFilter === q ? "#f0ede8" : "#5a5a7a", border: "1px solid #e4dfd8" }} onClick={() => setQFilter(q)}>{q === "all" ? "All Quarters" : q}</button>)}
        </div>
        {viewDues.length === 0 && <div style={{ color: "#9090b0", fontSize: 13, padding: "20px 0", textAlign: "center" }}>No dues records yet. Use "+ New Quarter" to create dues.</div>}
        {viewDues.length > 0 && <>
          <div className="thead" style={{ gridTemplateColumns: "70px 1.4fr 90px 100px 90px 100px 130px" }}>{["APT", "RESIDENT", "QUARTER", "AMOUNT", "STATUS", "PAID DATE", "ACTIONS"].map(h => <div key={h} className="th">{h}</div>)}</div>
          {viewDues.map(d => (
            <div key={d.id} className="trow" style={{ gridTemplateColumns: "70px 1.4fr 90px 100px 90px 100px 130px" }}>
              <span className="badge b-blue">{d.apt}</span>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{d.resident}</div>
              <div style={{ fontSize: 11, color: "#5a5a7a" }}>{d.quarter} {d.year}</div>
              <div style={{ fontFamily: "DM Mono", fontSize: 12 }}>{naira(d.amount)}</div>
              <span className={`badge ${d.status === "paid" ? "b-ok" : "b-danger"}`}>{d.status}</span>
              <div style={{ fontSize: 12, color: "#9090b0" }}>{d.paidDate || "—"}</div>
              <div style={{ display: "flex", gap: 5 }}>
                {d.status === "overdue" && (role === "admin" || role === "accountant") && <button className="btn btn-sm btn-green" onClick={() => setModal({ type: "record-payment", data: d })}>💳 Pay</button>}
                {d.status === "paid" && <button className="btn btn-sm btn-outline" onClick={() => setModal({ type: "view-invoice", data: d })}>Invoice</button>}
              </div>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ─── ACTIVITIES ────────────────────────────────────────────────────────────────
function Activities({ activities, setActivities, maintenanceHistory, setMaintenanceHistory, dieselLog, setDieselLog, setModal, role, logAction, currentUser, dispatchEmail, notify }) {
  const [view, setView] = useState("maintenance");
  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>🔧 Estate Activities</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["maintenance", "diesel", "history"].map(v => <button key={v} className="tab-pill" style={{ background: view === v ? "#1a1a2e" : "#fff", color: view === v ? "#f0ede8" : "#5a5a7a", border: "1px solid #e4dfd8" }} onClick={() => setView(v)}>{v === "maintenance" ? "Maintenance" : v === "diesel" ? "Diesel Log" : "Service History"}</button>)}
          {role === "admin" && <button className="btn btn-sm btn-gold" onClick={() => setModal({ type: view === "diesel" ? "add-diesel" : view === "history" ? "add-maintenance-history" : "add-activity", data: {} })}>+ Add</button>}
          {role === "admin" && view === "maintenance" && <button className="btn btn-sm btn-green" onClick={() => setModal({ type: "mark-done", data: {} })}>✅ Mark Done</button>}
        </div>
      </div>
      {view === "maintenance" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
            {[{ l: "Overdue", k: "overdue", c: "#c0392b" }, { l: "Upcoming (≤14d)", k: "upcoming", c: "#b7640a" }, { l: "OK", k: "ok", c: "#2e7d52" }].map(s => <div key={s.k} className="card" style={{ borderTop: `4px solid ${s.c}` }}><div className="stat-val" style={{ color: s.c, fontSize: 26 }}>{activities.filter(a => a.status === s.k).length}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{s.l}</div></div>)}
          </div>
          <div className="card">
            <div className="thead" style={{ gridTemplateColumns: "1.2fr 2fr 1fr 1fr 90px 100px" }}>{["CATEGORY", "DESCRIPTION", "LAST DONE", "NEXT DUE", "DAYS", "STATUS"].map(h => <div key={h} className="th">{h}</div>)}</div>
            {activities.map(a => { const d = daysUntil(a.nextDue); return (
              <div key={a.id} className="trow" style={{ gridTemplateColumns: "1.2fr 2fr 1fr 1fr 90px 100px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{a.category}</div>
                <div style={{ fontSize: 12, color: "#5a5a7a" }}>{a.description}</div>
                <div style={{ fontSize: 12, color: "#9090b0" }}>{a.lastDone}</div>
                <div style={{ fontSize: 12, color: "#9090b0" }}>{a.nextDue}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: d < 0 ? "#c0392b" : d < 14 ? "#b7640a" : "#2e7d52" }}>{d < 0 ? `${Math.abs(d)}d over` : `in ${d}d`}</div>
                <span className={`badge ${a.status === "overdue" ? "b-danger" : a.status === "upcoming" ? "b-warn" : "b-ok"}`}>{a.status}</span>
              </div>
            ); })}
          </div>
        </>
      )}
      {view === "diesel" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
            <div className="card"><div className="stat-val" style={{ color: "#1a1a2e", fontSize: 24 }}>{dieselLog.reduce((s, d) => s + d.litres, 0)}L</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Total Diesel</div></div>
            <div className="card"><div className="stat-val" style={{ color: "#c8a84b", fontSize: 22 }}>{naira(dieselLog.reduce((s, d) => s + d.cost, 0))}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Total Cost</div></div>
            <div className="card"><div className="stat-val" style={{ color: "#2d3ea0", fontSize: 24 }}>{dieselLog.reduce((s, d) => s + d.hours, 0)}hrs</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Run Hours</div></div>
          </div>
          <div className="card">
            {dieselLog.length === 0 && <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No diesel records yet. Click "+ Add" to log.</div>}
            {dieselLog.length > 0 && <>
              <div className="thead" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 90px" }}>{["MONTH", "LITRES", "COST", "RUN HOURS", "₦/LITRE"].map(h => <div key={h} className="th">{h}</div>)}</div>
              {[...dieselLog].sort((a, b) => b.month.localeCompare(a.month)).map(d => <div key={d.id} className="trow" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 90px" }}><div style={{ fontSize: 13, fontWeight: 600 }}>{d.month}</div><div style={{ fontFamily: "DM Mono", fontSize: 12 }}>{d.litres}L</div><div style={{ fontFamily: "DM Mono", fontSize: 12 }}>{naira(d.cost)}</div><div style={{ fontFamily: "DM Mono", fontSize: 12 }}>{d.hours} hrs</div><div style={{ fontFamily: "DM Mono", fontSize: 12, color: "#9090b0" }}>₦{Math.round(d.cost / d.litres)}/L</div></div>)}
            </>}
          </div>
        </>
      )}
      {view === "history" && (
        <div className="card">
          {maintenanceHistory.length === 0 && <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No service history yet.</div>}
          {maintenanceHistory.length > 0 && <>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Service History ({maintenanceHistory.length} records)</div>
            <div className="thead" style={{ gridTemplateColumns: "1fr 1.4fr 100px 1.2fr 100px 1.4fr" }}>{["CATEGORY", "DESCRIPTION", "DATE", "CONTRACTOR", "COST", "NOTES"].map(h => <div key={h} className="th">{h}</div>)}</div>
            {[...maintenanceHistory].sort((a, b) => b.doneDate.localeCompare(a.doneDate)).map(m => <div key={m.id} className="trow" style={{ gridTemplateColumns: "1fr 1.4fr 100px 1.2fr 100px 1.4fr" }}><span className="badge b-purple">{m.category}</span><div style={{ fontSize: 12, fontWeight: 600 }}>{m.description}</div><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{m.doneDate}</div><div style={{ fontSize: 11, color: "#5a5a7a" }}>{m.completedBy}</div><div style={{ fontFamily: "DM Mono", fontSize: 12, color: "#c0392b" }}>{naira(m.cost)}</div><div style={{ fontSize: 11, color: "#9090b0" }}>{m.notes}</div></div>)}
          </>}
        </div>
      )}
    </div>
  );
}

// ─── ACCOUNTS ──────────────────────────────────────────────────────────────────
function Accounts({ transactions, balance, totalIncome, totalExpense, dues, setModal, role }) {
  const [filter, setFilter] = useState("all");
  let filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>📊 Estate Accounts</div>
        {(role === "admin" || role === "accountant") && <button className="btn btn-primary" onClick={() => setModal({ type: "add-transaction", data: {} })}>+ Add Transaction</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div className="card-dark"><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#c8a84b", textTransform: "uppercase", marginBottom: 6 }}>Balance</div><div style={{ fontFamily: "Playfair Display", fontSize: 22, fontWeight: 900 }}>{naira(balance)}</div></div>
        <div className="card" style={{ borderTop: "4px solid #2e7d52" }}><div style={{ fontSize: 10, color: "#9090b0", fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Income</div><div style={{ fontFamily: "DM Mono", fontSize: 18, color: "#2e7d52" }}>{naira(totalIncome)}</div></div>
        <div className="card" style={{ borderTop: "4px solid #c0392b" }}><div style={{ fontSize: 10, color: "#9090b0", fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Expenses</div><div style={{ fontFamily: "DM Mono", fontSize: 18, color: "#c0392b" }}>{naira(totalExpense)}</div></div>
        <div className="card" style={{ borderTop: "4px solid #b7640a" }}><div style={{ fontSize: 10, color: "#9090b0", fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Dues Owed</div><div style={{ fontFamily: "DM Mono", fontSize: 18, color: "#b7640a" }}>{naira(dues.filter(d => d.status === "overdue").reduce((s, d) => s + d.amount, 0))}</div></div>
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["all", "income", "expense"].map(f => <button key={f} className="tab-pill" style={{ background: filter === f ? "#1a1a2e" : "#f7f4f0", color: filter === f ? "#f0ede8" : "#5a5a7a", border: "1px solid #e4dfd8" }} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
        </div>
        {sorted.length === 0 && <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No transactions yet. Use "+ Add Transaction" to record.</div>}
        {sorted.length > 0 && <>
          <div className="thead" style={{ gridTemplateColumns: "100px 1fr 110px 130px 80px" }}>{["DATE", "DESCRIPTION", "CATEGORY", "AMOUNT", "TYPE"].map(h => <div key={h} className="th">{h}</div>)}</div>
          {sorted.map(t => <div key={t.id} className="trow" style={{ gridTemplateColumns: "100px 1fr 110px 130px 80px" }}><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{t.date}</div><div style={{ fontSize: 12 }}>{t.description}</div><span className="badge b-grey">{t.category}</span><div style={{ fontFamily: "DM Mono", fontSize: 12, fontWeight: 600, color: t.type === "income" ? "#1e6e42" : "#c0392b" }}>{t.type === "income" ? "+" : "-"}{naira(t.amount)}</div><span className={`badge ${t.type === "income" ? "b-ok" : "b-danger"}`}>{t.type}</span></div>)}
        </>}
      </div>
    </div>
  );
}

// ─── MEETINGS ──────────────────────────────────────────────────────────────────
function Meetings({ meetings, setModal, role }) {
  const [sel, setSel] = useState(null);
  const upcoming = meetings.filter(m => m.status === "upcoming");
  const held = meetings.filter(m => m.status === "held").sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>🗓️ Meetings</div>
        {role === "admin" && <button className="btn btn-primary" onClick={() => setModal({ type: "add-meeting", data: {} })}>+ Schedule Meeting</button>}
      </div>
      {meetings.length === 0 && <div className="card" style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: 30 }}>No meetings scheduled yet. Use "+ Schedule Meeting" to add one.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
        <div>
          {upcoming.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: "#9090b0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Upcoming</div>}
          {upcoming.map(m => <div key={m.id} className="card" style={{ marginBottom: 8, cursor: "pointer", border: sel?.id === m.id ? "2px solid #1a1a2e" : "1px solid #e4dfd8" }} onClick={() => setSel(m)}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div><div style={{ fontSize: 11, color: "#9090b0", marginTop: 3 }}>{m.date} · {m.time}</div><div style={{ fontSize: 11, color: "#9090b0" }}>{m.venue}</div></div><span className="badge b-gold">{m.status}</span></div></div>)}
          {held.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: "#9090b0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 14 }}>Past</div>}
          {held.map(m => <div key={m.id} className="card" style={{ marginBottom: 8, cursor: "pointer", border: sel?.id === m.id ? "2px solid #1a1a2e" : "1px solid #e4dfd8" }} onClick={() => setSel(m)}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div><div style={{ fontSize: 11, color: "#9090b0", marginTop: 3 }}>{m.date}</div></div><span className="badge b-ok">{m.status}</span></div></div>)}
        </div>
        {sel ? (
          <div className="card">
            <div style={{ fontFamily: "Playfair Display", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{sel.title}</div>
            <div style={{ fontSize: 12, color: "#9090b0", marginBottom: 14 }}>{sel.date} at {sel.time} — {sel.venue}</div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 7 }}>📋 Agenda</div>
            <ul style={{ paddingLeft: 18, marginBottom: 14 }}>{sel.agenda.map((a, i) => <li key={i} style={{ fontSize: 13, color: "#5a5a7a", padding: "2px 0" }}>{a}</li>)}</ul>
            {sel.deliverables.length > 0 && <><div style={{ fontWeight: 700, fontSize: 12, marginBottom: 7 }}>✅ Deliverables</div><ul style={{ paddingLeft: 18, marginBottom: 14 }}>{sel.deliverables.map((d, i) => <li key={i} style={{ fontSize: 13, color: "#5a5a7a", padding: "2px 0" }}>{d}</li>)}</ul></>}
            {sel.minutes && <><div style={{ fontWeight: 700, fontSize: 12, marginBottom: 7 }}>📝 Minutes</div><div style={{ fontSize: 13, color: "#5a5a7a", background: "#f7f4f0", borderRadius: 10, padding: 12 }}>{sel.minutes}</div></>}
          </div>
        ) : meetings.length > 0 && (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180, color: "#c0b898" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 36 }}>🗓️</div><div style={{ fontSize: 13, marginTop: 8 }}>Select a meeting</div></div></div>
        )}
      </div>
    </div>
  );
}

// ─── RESIDENTS ─────────────────────────────────────────────────────────────────
function ResidentsTab({ residents, vehicles, setModal, role, restrictedApts }) {
  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>👥 Residents Registry</div>
        {role === "admin" && <button className="btn btn-primary" onClick={() => setModal({ type: "add-resident", data: {} })}>+ Register Resident</button>}
      </div>
      {restrictedApts.length > 0 && <div className="alert-bar alert-red" style={{ marginBottom: 14 }}><b>⛔ Restricted (No Gate + No Generator):</b> {restrictedApts.map(r => `${r.apt} (${r.name})`).join(", ")}</div>}
      <div className="card">
        <div className="thead" style={{ gridTemplateColumns: "80px 1.4fr 1.1fr 1.4fr 90px 110px" }}>{["APT", "NAME", "PHONE", "EMAIL", "DUES", "ACCESS"].map(h => <div key={h} className="th">{h}</div>)}</div>
        {residents.map(r => { const restricted = restrictedApts.some(x => x.id === r.id); return (
          <div key={r.id} className="trow" style={{ gridTemplateColumns: "80px 1.4fr 1.1fr 1.4fr 90px 110px" }}>
            <span className="badge b-blue">{r.apt}</span>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#5a5a7a", fontFamily: "DM Mono" }}>{r.phone}</div>
            <div style={{ fontSize: 11, color: "#9090b0" }}>{r.email}</div>
            <span className={`badge ${r.duesOwed ? "b-danger" : "b-ok"}`}>{r.duesOwed ? "Overdue" : "Clear"}</span>
            <span className={`badge ${restricted ? "b-danger" : r.duesOwed ? "b-warn" : "b-ok"}`}>{restricted ? "Restricted" : r.duesOwed ? "Grace" : "Active"}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

// ─── HISTORY & AUDIT ───────────────────────────────────────────────────────────
function HistoryAudit({ gateLog, dues, transactions, maintenanceHistory, dieselLog, meetings, activityLog, residents }) {
  const [section, setSection] = useState("gate");
  const [search, setSearch] = useState("");
  const sections = [["gate", "Gate Log", gateLog.length], ["dues", "Dues", dues.length], ["transactions", "Transactions", transactions.length], ["audit", "Audit", activityLog.length]];
  const fs = (items, fields) => !search ? items : items.filter(i => fields.some(f => String(i[f] || "").toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="fade-up">
      <div className="sec-title">📋 History & Audit</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {sections.map(([id, label, count]) => <button key={id} className="tab-pill" style={{ background: section === id ? "#1a1a2e" : "#fff", color: section === id ? "#f0ede8" : "#5a5a7a", border: "1px solid #e4dfd8" }} onClick={() => { setSection(id); setSearch(""); }}>{label} <span style={{ marginLeft: 4, background: section === id ? "#ffffff33" : "#f0f0f5", color: section === id ? "#fff" : "#9090b0", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{count}</span></button>)}
      </div>
      <div style={{ marginBottom: 14 }}><input className="search-inp" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      {section === "gate" && (() => { const items = [...fs(gateLog, ["person", "apt", "event", "result"])].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)); return <div className="card">{items.length === 0 ? <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No gate records yet.</div> : <><div className="thead" style={{ gridTemplateColumns: "90px 60px 1fr 1fr 100px 90px" }}>{["DATE", "TIME", "EVENT", "PERSON", "APT", "RESULT"].map(h => <div key={h} className="th">{h}</div>)}</div>{items.map(l => <div key={l.id} className="trow" style={{ gridTemplateColumns: "90px 60px 1fr 1fr 100px 90px" }}><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{l.date}</div><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{l.time}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{l.event}</div><div style={{ fontSize: 12, color: "#5a5a7a" }}>{l.person}</div><div style={{ fontSize: 12, color: "#9090b0" }}>{l.apt}</div><span className={`badge ${l.result === "granted" ? "b-ok" : "b-danger"}`}>{l.result}</span></div>)}</>}</div>; })()}
      {section === "dues" && (() => { const items = [...fs(dues, ["resident", "apt", "quarter", "status"])].sort((a, b) => `${b.year}${b.quarter}`.localeCompare(`${a.year}${a.quarter}`)); return <div className="card">{items.length === 0 ? <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No dues records yet.</div> : <><div className="thead" style={{ gridTemplateColumns: "80px 1.4fr 1fr 70px 90px 110px" }}>{["APT", "RESIDENT", "QUARTER", "YEAR", "STATUS", "PAID DATE"].map(h => <div key={h} className="th">{h}</div>)}</div>{items.map(d => <div key={d.id} className="trow" style={{ gridTemplateColumns: "80px 1.4fr 1fr 70px 90px 110px" }}><span className="badge b-blue">{d.apt}</span><div style={{ fontSize: 12, fontWeight: 600 }}>{d.resident}</div><div style={{ fontSize: 11, color: "#5a5a7a" }}>{d.quarter}</div><div style={{ fontSize: 12, color: "#9090b0" }}>{d.year}</div><span className={`badge ${d.status === "paid" ? "b-ok" : "b-danger"}`}>{d.status}</span><div style={{ fontSize: 11, color: "#9090b0" }}>{d.paidDate || "—"}</div></div>)}</>}</div>; })()}
      {section === "transactions" && (() => { const items = [...fs(transactions, ["description", "category", "type"])].sort((a, b) => b.date.localeCompare(a.date)); return <div className="card">{items.length === 0 ? <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No transaction records yet.</div> : <><div className="thead" style={{ gridTemplateColumns: "100px 1fr 110px 130px 80px" }}>{["DATE", "DESCRIPTION", "CATEGORY", "AMOUNT", "TYPE"].map(h => <div key={h} className="th">{h}</div>)}</div>{items.map(t => <div key={t.id} className="trow" style={{ gridTemplateColumns: "100px 1fr 110px 130px 80px" }}><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{t.date}</div><div style={{ fontSize: 12 }}>{t.description}</div><span className="badge b-grey">{t.category}</span><div style={{ fontFamily: "DM Mono", fontSize: 12, fontWeight: 600, color: t.type === "income" ? "#1e6e42" : "#c0392b" }}>{t.type === "income" ? "+" : "-"}{naira(t.amount)}</div><span className={`badge ${t.type === "income" ? "b-ok" : "b-danger"}`}>{t.type}</span></div>)}</>}</div>; })()}
      {section === "audit" && (() => { const items = [...fs(activityLog, ["user", "action", "detail"])].sort((a, b) => b.datetime.localeCompare(a.datetime)); return <div className="card">{items.length === 0 ? <div style={{ color: "#9090b0", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No audit records yet.</div> : <><div className="thead" style={{ gridTemplateColumns: "150px 100px 150px 1fr" }}>{["DATE & TIME", "USER", "ACTION", "DETAIL"].map(h => <div key={h} className="th">{h}</div>)}</div>{items.map(l => <div key={l.id} className="trow" style={{ gridTemplateColumns: "150px 100px 150px 1fr" }}><div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#9090b0" }}>{l.datetime.replace("T", " ").slice(0, 16)}</div><div style={{ fontFamily: "DM Mono", fontSize: 12, fontWeight: 600 }}>@{l.user}</div><span className="badge b-grey">{l.action}</span><div style={{ fontSize: 12, color: "#5a5a7a" }}>{l.detail}</div></div>)}</>}</div>; })()}
    </div>
  );
}

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────────
function UserManagement({ users, setUsers, residents, setModal, notify, currentUser, logAction }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? users : users.filter(u => u.role === filter);
  const toggleActive = (id) => {
    if (id === currentUser.id) { notify("Cannot deactivate your own account", "warn"); return; }
    const u = users.find(x => x.id === id);
    setUsers(us => us.map(x => x.id === id ? { ...x, active: !x.active } : x));
    logAction(currentUser, u.active ? "Deactivated user" : "Reactivated user", `${u.name} (@${u.username})`);
    notify(`${u.name} ${u.active ? "deactivated" : "reactivated"}`);
  };
  const removeUser = (id) => {
    if (id === currentUser.id) { notify("Cannot remove your own account", "warn"); return; }
    const u = users.find(x => x.id === id);
    if (!window.confirm) { setUsers(us => us.filter(x => x.id !== id)); logAction(currentUser, "Removed user", `${u.name} (@${u.username})`); notify("User removed"); return; }
    setUsers(us => us.filter(x => x.id !== id));
    logAction(currentUser, "Removed user", `${u.name} (@${u.username})`);
    notify("User removed");
  };
  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="sec-title" style={{ marginBottom: 0 }}>🔑 User Management</div>
        <button className="btn btn-primary" onClick={() => setModal({ type: "create-user", data: {} })}>+ Create User</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {[{ l: "Total", v: users.length, c: "#1a1a2e" }, { l: "Active", v: users.filter(u => u.active).length, c: "#2e7d52" }, { l: "Inactive", v: users.filter(u => !u.active).length, c: "#c0392b" }, { l: "Residents", v: users.filter(u => u.role === "resident").length, c: "#2d3ea0" }].map(s => <div key={s.l} className="card" style={{ borderTop: `4px solid ${s.c}` }}><div className="stat-val" style={{ color: s.c, fontSize: 24 }}>{s.v}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{s.l}</div></div>)}
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["all", "admin", "security", "accountant", "resident"].map(f => <button key={f} className="tab-pill" style={{ background: filter === f ? "#1a1a2e" : "#f7f4f0", color: filter === f ? "#f0ede8" : "#5a5a7a", border: "1px solid #e4dfd8" }} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
        </div>
        <div className="thead" style={{ gridTemplateColumns: "1.2fr 1fr 100px 90px 80px 160px" }}>{["NAME", "USERNAME", "ROLE", "APT", "STATUS", "ACTIONS"].map(h => <div key={h} className="th">{h}</div>)}</div>
        {filtered.map(u => (
          <div key={u.id} className="trow" style={{ gridTemplateColumns: "1.2fr 1fr 100px 90px 80px 160px", opacity: u.active ? 1 : 0.55 }}>
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>{u.id === currentUser.id && <span style={{ fontSize: 10, color: "#c8a84b", fontWeight: 700 }}>● YOU</span>}</div>
            <div style={{ fontFamily: "DM Mono", fontSize: 12, color: "#5a5a7a" }}>@{u.username}</div>
            <span className="badge" style={{ background: ROLE_COLORS[u.role] + "22", color: ROLE_COLORS[u.role] }}>{ROLE_LABELS[u.role]}</span>
            <div style={{ fontSize: 12, color: "#9090b0" }}>{u.apt || "—"}</div>
            <span className={`badge ${u.active ? "b-ok" : "b-danger"}`}>{u.active ? "Active" : "Off"}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button className={`btn btn-sm ${u.active ? "btn-outline" : "btn-green"}`} style={{ fontSize: 10 }} onClick={() => toggleActive(u.id)}>{u.active ? "Deactivate" : "Activate"}</button>
              {u.id !== currentUser.id && <button className="btn btn-sm btn-red" style={{ fontSize: 10 }} onClick={() => removeUser(u.id)}>✕ Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODAL ROUTER ──────────────────────────────────────────────────────────────
function ModalRouter(props) {
  const { modal, closeModal } = props;
  const { type } = modal;
  if (type === "create-user") return <CreateUserModal {...props} />;
  if (type === "change-password") return <ChangePasswordModal {...props} />;
  if (type === "generate-code") return <GenerateCodeModal {...props} />;
  if (type === "add-resident") return <AddResidentModal {...props} />;
  if (type === "register-vehicle") return <SimpleFormModal title="Register Vehicle" fields={[{ key: "plate", label: "Plate Number", ph: "KJA 123 LG" }, { key: "make", label: "Make & Model", ph: "Toyota Camry 2022" }, { key: "owner", label: "Owner Name", ph: "Dr. Emeka Nwosu" }, { key: "apt", label: "Apartment", ph: "Apt 3C" }]} onSubmit={v => { props.setVehicles(vs => [...vs, { id: Date.now(), ...v }]); props.logAction(props.currentUser, "Registered vehicle", `${v.plate} – ${v.make}`); props.notify("Vehicle registered"); closeModal(); }} submitLabel="Register" closeModal={closeModal} />;
  if (type === "record-payment") return <RecordPaymentModal {...props} />;
  if (type === "send-notice") return <SendNoticeModal {...props} />;
  if (type === "view-invoice") return <InvoiceModal data={props.modal.data} closeModal={closeModal} />;
  if (type === "add-transaction") return <SimpleFormModal title="Add Transaction" fields={[{ key: "date", label: "Date", ph: fmt(new Date()), type: "date" }, { key: "type", label: "Type", ph: "", type: "select", options: ["income", "expense"] }, { key: "category", label: "Category", ph: "Generator / Dues / Repairs" }, { key: "description", label: "Description", ph: "Diesel – 200L" }, { key: "amount", label: "Amount (₦)", ph: "120000", type: "number" }]} onSubmit={v => { props.setTransactions(ts => [...ts, { id: Date.now(), ...v, amount: +v.amount, ref: `TXN-${Date.now()}` }]); props.logAction(props.currentUser, "Added transaction", `${v.type}: ${v.description} – ${naira(v.amount)}`); props.notify("Transaction recorded"); closeModal(); }} submitLabel="Save" closeModal={closeModal} />;
  if (type === "add-activity") return <SimpleFormModal title="Add Maintenance Activity" fields={[{ key: "category", label: "Category", ph: "Generator Service" }, { key: "description", label: "Description", ph: "500hr overhaul" }, { key: "lastDone", label: "Last Done", ph: fmt(new Date()), type: "date" }, { key: "intervalDays", label: "Interval (days)", ph: "90", type: "number" }]} onSubmit={v => { const nd = fmt(new Date(new Date(v.lastDone).getTime() + +v.intervalDays * 86400000)); const d = daysUntil(nd); props.setActivities(as => [...as, { id: Date.now(), ...v, intervalDays: +v.intervalDays, nextDue: nd, status: d < 0 ? "overdue" : d < 14 ? "upcoming" : "ok" }]); props.logAction(props.currentUser, "Added activity", `${v.category} – next due ${nd}`); if (d <= 14) props.dispatchEmail(ESTATE_EMAIL, `⚠️ Maintenance Alert: ${v.category}`, `Activity: ${v.category}\nDue: ${nd}\nStatus: ${d < 0 ? "OVERDUE" : `in ${d} days`}\n\n— Pearl Court EMS (Auto-generated)`, "maintenance"); props.notify("Activity added"); closeModal(); }} submitLabel="Add" closeModal={closeModal} />;
  if (type === "add-maintenance-history") return <SimpleFormModal title="Log Service Record" fields={[{ key: "category", label: "Category", ph: "Generator Service" }, { key: "description", label: "Description", ph: "500hr overhaul" }, { key: "doneDate", label: "Date Done", ph: fmt(new Date()), type: "date" }, { key: "completedBy", label: "Contractor", ph: "PowerGen Services" }, { key: "cost", label: "Cost (₦)", ph: "85000", type: "number" }, { key: "notes", label: "Notes", ph: "Work completed" }]} onSubmit={v => { props.setMaintenanceHistory(mh => [...mh, { id: Date.now(), ...v, cost: +v.cost }]); props.logAction(props.currentUser, "Logged service record", `${v.category} – ${v.doneDate}`); props.notify("Service record saved"); closeModal(); }} submitLabel="Save Record" closeModal={closeModal} />;
  if (type === "mark-done") return <MarkDoneModal {...props} />;
  if (type === "add-diesel") return <SimpleFormModal title="Log Diesel Usage" fields={[{ key: "month", label: "Month", ph: "June 2026" }, { key: "litres", label: "Litres", ph: "300", type: "number" }, { key: "cost", label: "Total Cost (₦)", ph: "180000", type: "number" }, { key: "hours", label: "Run Hours", ph: "200", type: "number" }]} onSubmit={v => { props.setDieselLog(dl => [...dl, { id: Date.now(), ...v, litres: +v.litres, cost: +v.cost, hours: +v.hours }]); props.logAction(props.currentUser, "Logged diesel", `${v.month} – ${v.litres}L`); props.notify("Diesel log saved"); closeModal(); }} submitLabel="Save" closeModal={closeModal} />;
  if (type === "add-meeting") return <AddMeetingModal {...props} />;
  if (type === "log-vehicle") return <LogVehicleModal {...props} />;
  if (type === "new-quarter") return <NewQuarterModal {...props} />;
  return null;
}

// ─── MODALS ────────────────────────────────────────────────────────────────────
function M({ title, children, closeModal, wide }) {
  return <div className="modal-bg" onClick={closeModal}><div className="modal-box" style={{ maxWidth: wide ? 560 : 480 }} onClick={e => e.stopPropagation()}><div className="modal-title">{title}</div>{children}</div></div>;
}

function CreateUserModal({ users, setUsers, residents, closeModal, notify, logAction, currentUser }) {
  const [f, setF] = useState({ name: "", username: "", password: "", confirm: "", role: "resident", apt: "" });
  const [showPw, setShowPw] = useState(false);
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  const create = () => {
    if (!f.name || !f.username || !f.password) { notify("Fill all required fields", "warn"); return; }
    if (f.password !== f.confirm) { notify("Passwords do not match", "error"); return; }
    if (f.password.length < 6) { notify("Password min 6 characters", "warn"); return; }
    if (users.some(u => u.username === f.username)) { notify("Username already exists", "error"); return; }
    if (f.role === "resident" && !f.apt) { notify("Select apartment for resident", "warn"); return; }
    const nu = { id: Date.now(), name: f.name, username: f.username, password: f.password, role: f.role, apt: f.role === "resident" ? f.apt : null, active: true, createdAt: fmt(new Date()) };
    setUsers(us => [...us, nu]);
    logAction(currentUser, "Created user", `${f.name} (@${f.username}) – ${ROLE_LABELS[f.role]}`);
    notify(`✅ User @${f.username} created successfully`);
    closeModal();
  };
  return <M title="🔑 Create New User" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Full Name *</label><input className="inp" placeholder="Mrs. Bola Adekunle" value={f.name} onChange={e => s("name", e.target.value)} /></div>
    <div className="frow"><label className="flabel">Username *</label><input className="inp" placeholder="apt6f" value={f.username} onChange={e => s("username", e.target.value.toLowerCase().replace(/\s/g, ""))} /></div>
    <div className="frow"><label className="flabel">Role *</label><select className="sel" value={f.role} onChange={e => s("role", e.target.value)}><option value="admin">Admin</option><option value="security">Security</option><option value="accountant">Accountant</option><option value="resident">Resident</option></select></div>
    {f.role === "resident" && <div className="frow"><label className="flabel">Apartment *</label><select className="sel" value={f.apt} onChange={e => s("apt", e.target.value)}><option value="">Select...</option>{residents.map(r => <option key={r.id} value={r.apt}>{r.apt} — {r.name}</option>)}</select></div>}
    <div className="frow"><label className="flabel">Default Password *</label>
      <div style={{ position: "relative" }}><input className="inp" type={showPw ? "text" : "password"} placeholder="Min. 6 characters" value={f.password} onChange={e => s("password", e.target.value)} style={{ paddingRight: 40 }} /><button onClick={() => setShowPw(x => !x)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9090b0" }}>{showPw ? "🙈" : "👁️"}</button></div>
    </div>
    <div className="frow"><label className="flabel">Confirm Password *</label><input className="inp" type="password" placeholder="Re-enter password" value={f.confirm} onChange={e => s("confirm", e.target.value)} /></div>
    <div className="alert-bar alert-blue" style={{ fontSize: 12, marginBottom: 14 }}>👤 Share the username and default password with the user. They can change it via the 🔒 Pwd button after login.</div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={create}>Create User</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function ChangePasswordModal({ currentUser, setCurrentUser, users, setUsers, closeModal, notify, logAction }) {
  const [f, setF] = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const change = () => {
    if (f.current !== currentUser.password) { notify("Current password incorrect", "error"); return; }
    if (f.newPw.length < 6) { notify("Min 6 characters", "warn"); return; }
    if (f.newPw !== f.confirm) { notify("Passwords do not match", "error"); return; }
    if (f.newPw === f.current) { notify("New password must differ from current", "warn"); return; }
    const updated = { ...currentUser, password: f.newPw };
    setCurrentUser(updated); setUsers(us => us.map(u => u.id === currentUser.id ? updated : u));
    logAction(currentUser, "Changed password", currentUser.name);
    notify("✅ Password changed successfully"); closeModal();
  };
  return <M title="🔒 Change Password" closeModal={closeModal}>
    <div style={{ background: "#f7f4f0", borderRadius: 12, padding: "10px 13px", marginBottom: 16, fontSize: 13 }}><b>{currentUser.name}</b> · @{currentUser.username} {currentUser.apt ? `· ${currentUser.apt}` : ""}</div>
    <div className="frow"><label className="flabel">Current Password</label><div style={{ position: "relative" }}><input className="inp" type={showPw ? "text" : "password"} placeholder="Current password" value={f.current} onChange={e => setF(x => ({ ...x, current: e.target.value }))} style={{ paddingRight: 40 }} /><button onClick={() => setShowPw(x => !x)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9090b0" }}>{showPw ? "🙈" : "👁️"}</button></div></div>
    <div className="frow"><label className="flabel">New Password</label><input className="inp" type="password" placeholder="Min. 6 characters" value={f.newPw} onChange={e => setF(x => ({ ...x, newPw: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Confirm New Password</label><input className="inp" type="password" placeholder="Re-enter new password" value={f.confirm} onChange={e => setF(x => ({ ...x, confirm: e.target.value }))} /></div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={change}>Change Password</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function GenerateCodeModal({ residents, accessCodes, setAccessCodes, isRestricted, currentUser, logAction, closeModal, notify, dispatchEmail }) {
  const eligible = residents.filter(r => !isRestricted(r.id));
  const defaultId = currentUser.role === "resident" ? String(residents.find(r => r.apt === currentUser.apt)?.id || "") : "";
  const [residentId, setResidentId] = useState(defaultId);
  const [visitorName, setVisitorName] = useState("");
  const [purpose, setPurpose] = useState("Social");
  const [direction, setDirection] = useState("in");
  const [generated, setGenerated] = useState(null);

  const generate = () => {
    if (!residentId || !visitorName.trim()) { notify("Fill all fields", "warn"); return; }
    if (isRestricted(+residentId)) { notify("Cannot generate — dues overdue >15 days!", "error"); return; }
    const resident = residents.find(r => r.id === +residentId);
    const code = genCode();
    const now = new Date(); const expires = new Date(now.getTime() + 15 * 60000).toISOString();
    setAccessCodes(cs => [{ code, residentId: +residentId, apt: resident.apt, visitorName: visitorName.trim(), purpose, created: now.toISOString(), expires, used: false, direction, source: "app" }, ...cs]);
    logAction(currentUser, "Generated visitor code", `${code} — ${visitorName} → ${resident.apt}`);
    dispatchEmail(ESTATE_EMAIL, `🔑 Visitor Code Generated — ${resident.apt}`, `Visitor Code: ${code}\nApartment: ${resident.apt} — ${resident.name}\nVisitor: ${visitorName}\nPurpose: ${purpose}\nDirection: ${direction.toUpperCase()}\nExpires: ${new Date(expires).toLocaleTimeString()}\n\nSecurity should verify this code at the gate.\nValid for 15 minutes only.\n\n— Pearl Court EMS (Auto-generated)`, "access");
    setGenerated({ code, apt: resident.apt, residentName: resident.name, expires });
    notify(`Code ${code} generated — valid 15 mins`);
  };

  return <M title="🔑 Generate Visitor Access Code" closeModal={closeModal}>
    {!generated ? (<>
      {currentUser.role === "resident"
        ? <div className="frow"><label className="flabel">Your Apartment</label><div className="inp" style={{ color: "#5a5a7a" }}>{currentUser.apt} — {currentUser.name}</div></div>
        : <div className="frow"><label className="flabel">Apartment</label><select className="sel" value={residentId} onChange={e => setResidentId(e.target.value)}><option value="">Select...</option>{eligible.map(r => <option key={r.id} value={r.id}>{r.apt} — {r.name}</option>)}</select></div>}
      <div className="frow"><label className="flabel">Visitor Name</label><input className="inp" placeholder="e.g. Tunde Adeyemi" value={visitorName} onChange={e => setVisitorName(e.target.value)} /></div>
      <div className="frow"><label className="flabel">Purpose</label><select className="sel" value={purpose} onChange={e => setPurpose(e.target.value)}>{["Social", "Delivery", "Maintenance", "Business", "Other"].map(p => <option key={p}>{p}</option>)}</select></div>
      <div className="frow"><label className="flabel">Direction</label><select className="sel" value={direction} onChange={e => setDirection(e.target.value)}><option value="in">Entry (IN)</option><option value="out">Exit (OUT)</option></select></div>
      <div className="alert-bar alert-blue" style={{ fontSize: 12, marginBottom: 14 }}>📧 Code auto-emailed to estate. Share code with your visitor via WhatsApp or SMS. Security verifies at gate. <b>Expires in 15 minutes.</b></div>
      <div style={{ display: "flex", gap: 10 }}><button className="btn btn-gold" style={{ flex: 1 }} onClick={generate}>Generate Code</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
    </>) : (<>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, color: "#5a5a7a", marginBottom: 4 }}>Share this code with your visitor:</div><div className="code-box">{generated.code}</div><div style={{ fontSize: 13, color: "#c0392b", fontWeight: 700, marginBottom: 12 }}>⏱ Expires in 15 minutes</div></div>
      <div className="alert-bar alert-green" style={{ fontSize: 12, marginBottom: 14 }}>✅ Code emailed to estate: {ESTATE_EMAIL}<br />Security will verify at the gate.</div>
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={closeModal}>Done</button>
    </>)}
  </M>;
}

function AddResidentModal({ residents, setResidents, logAction, currentUser, closeModal, notify, dispatchEmail }) {
  const [f, setF] = useState({ name: "", apt: "", phone: "", email: "" });
  const add = () => {
    if (!f.name || !f.apt || !f.phone || !f.email) { notify("All fields required", "warn"); return; }
    if (residents.find(r => r.apt.toLowerCase() === f.apt.toLowerCase())) { notify("Apartment already registered", "warn"); return; }
    const nr = { id: Date.now(), ...f, status: "active", duesOwed: false, suspendedSince: null };
    setResidents(rs => [...rs, nr]);
    logAction(currentUser, "Registered resident", `${f.name} – ${f.apt}`);
    dispatchEmail(f.email, "Welcome to Pearl Court Estate", `Dear ${f.name},\n\nWelcome to Pearl Court Estate!\n\nYour Apartment: ${f.apt}\nPhone on record: ${f.phone}\n\nYour system login will be created by the estate admin. Please contact the admin to receive your username and password.\n\nFor estate queries: ${ESTATE_EMAIL}\n\n— Pearl Court Estate Management`, "general");
    notify("Resident registered. Welcome email sent.");
    closeModal();
  };
  return <M title="👤 Register New Resident" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Full Name *</label><input className="inp" placeholder="Dr. Emeka Nwosu" value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Apartment Number *</label><input className="inp" placeholder="Apt 6F" value={f.apt} onChange={e => setF(x => ({ ...x, apt: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Phone Number *</label><input className="inp" placeholder="08012345678" value={f.phone} onChange={e => setF(x => ({ ...x, phone: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Email Address *</label><input className="inp" placeholder="emeka@gmail.com" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} /></div>
    <div className="alert-bar alert-blue" style={{ fontSize: 12, marginBottom: 14 }}>📧 A welcome email will be sent to the resident's email address automatically.</div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={add}>Register Resident</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function RecordPaymentModal({ modal, dues, setDues, residents, setResidents, transactions, setTransactions, closeModal, notify, currentUser, logAction, dispatchEmail }) {
  const data = modal?.data;
  const [selId, setSelId] = useState(data?.id ? String(data.id) : "");
  const [date, setDate] = useState(fmt(new Date()));
  const [amount, setAmount] = useState(data?.amount ? String(data.amount) : "");
  const overdue = dues.filter(d => d.status === "overdue");

  useEffect(() => {
    if (selId) { const d = dues.find(x => x.id === +selId); if (d) setAmount(String(d.amount)); }
  }, [selId]);

  const record = () => {
    const due = dues.find(d => d.id === +selId); if (!due) { notify("Select apartment", "warn"); return; }
    if (!amount || +amount <= 0) { notify("Enter valid amount", "warn"); return; }
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const finalAmount = +amount;
    setDues(ds => ds.map(d => d.id === +selId ? { ...d, status: "paid", paidDate: date, invoiceNo, amount: finalAmount } : d));
    setResidents(rs => rs.map(r => r.id === due.residentId ? { ...r, duesOwed: false, suspendedSince: null } : r));
    setTransactions(ts => [...ts, { id: Date.now(), date, type: "income", category: "Dues", description: `${due.quarter} ${due.year} Dues – ${due.apt} (${due.resident})`, amount: finalAmount, ref: invoiceNo }]);
    logAction(currentUser, "Recorded payment", `${due.apt} – ${due.quarter} ${due.year} – ${naira(finalAmount)}`);
    const r = residents.find(x => x.id === due.residentId);
    dispatchEmail(r?.email || ESTATE_EMAIL, `✅ Invoice ${invoiceNo} — Pearl Court Estate`, `Dear ${due.resident},\n\nPayment received. Thank you!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPEARL COURT ESTATE — OFFICIAL RECEIPT\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nInvoice No : ${invoiceNo}\nApartment  : ${due.apt}\nPeriod     : ${due.quarter} ${due.year}\nPaid Date  : ${date}\nAmount     : ${naira(finalAmount)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSTATUS: PAID ✅\n\nAll access restrictions have been lifted.\n\n— Pearl Court Estate Management\n${ESTATE_EMAIL}`, "invoice");
    notify(`✅ Payment recorded. Invoice ${invoiceNo} emailed to ${r?.email || "resident"}`);
    closeModal();
  };
  return <M title="✅ Record Dues Payment" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Apartment</label><select className="sel" value={selId} onChange={e => setSelId(e.target.value)}><option value="">Select...</option>{overdue.map(d => <option key={d.id} value={d.id}>{d.apt} — {d.resident} — {d.quarter} {d.year}</option>)}</select></div>
    <div className="frow"><label className="flabel">Amount Paid (₦) — Editable</label><input className="inp" type="number" placeholder="75000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
    <div className="frow"><label className="flabel">Payment Date</label><input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
    <div className="alert-bar alert-green" style={{ fontSize: 12, marginBottom: 14 }}>✅ On recording: Access restored · Official invoice auto-generated & emailed to resident · Transaction logged · Audit trail created</div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-green" style={{ flex: 1 }} onClick={record}>Confirm & Send Invoice</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function InvoiceModal({ data, closeModal }) {
  return <M title="" closeModal={closeModal}>
    <div style={{ fontFamily: "Playfair Display", fontSize: 22, fontWeight: 900, color: "#1a1a2e" }}>Pearl Court Estate</div>
    <div style={{ fontSize: 11, color: "#9090b0", marginBottom: 18 }}>12/14 Oladipo Bateye St, GRA Ikeja, Lagos · {ESTATE_EMAIL}</div>
    <div style={{ background: "#1a1a2e", borderRadius: 10, padding: "9px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between" }}><span style={{ color: "#c8a84b", fontWeight: 700, fontFamily: "DM Mono" }}>{data.invoiceNo}</span><span style={{ color: "#f0ede8", fontSize: 12 }}>OFFICIAL RECEIPT</span></div>
    {[["Resident", data.resident], ["Apartment", data.apt], ["Period", `${data.quarter} ${data.year}`], ["Payment Date", data.paidDate]].map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0ece6", fontSize: 13, color: "#5a5a7a" }}><span>{k}:</span><b style={{ color: "#1a1a2e" }}>{v}</b></div>)}
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontFamily: "DM Mono", fontSize: 17, fontWeight: 700 }}><span>AMOUNT PAID:</span><span style={{ color: "#1e6e42" }}>{naira(data.amount)}</span></div>
    <div className="alert-bar alert-green" style={{ textAlign: "center", fontWeight: 700, marginBottom: 14 }}>✅ PAYMENT CONFIRMED — DUES CLEARED</div>
    <button className="btn btn-primary" style={{ width: "100%" }} onClick={closeModal}>Close</button>
  </M>;
}

function SendNoticeModal({ dues, residents, closeModal, notify, currentUser, logAction, dispatchEmail }) {
  const overdue = dues.filter(d => d.status === "overdue");
  const [sent, setSent] = useState(false);
  const send = () => {
    if (overdue.length === 0) { notify("No overdue dues to send notices for", "warn"); return; }
    overdue.forEach(d => {
      const r = residents.find(x => x.id === d.residentId);
      dispatchEmail(r?.email || ESTATE_EMAIL, `⚠️ Demand Notice — Pearl Court Estate Dues`, `Dear ${d.resident},\n\nThis is a formal DEMAND NOTICE for outstanding estate dues.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nApartment : ${d.apt}\nPeriod    : ${d.quarter} ${d.year}\nAmount Due: ${naira(d.amount)}\nStatus    : OVERDUE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ IMPORTANT NOTICE:\nIf outstanding after 15 days:\n• Visitors will NOT be permitted gate entry\n• Generator supply SUSPENDED\n• Visitor code generation BLOCKED\n\nPlease pay immediately and notify the accountant.\n\n— Estate Management\n${ESTATE_EMAIL}`, "dues");
    });
    logAction(currentUser, "Sent demand notices", `${overdue.map(d => `${d.apt} (${d.quarter} ${d.year})`).join(", ")}`);
    setSent(true);
    notify(`📧 Demand notices sent to ${overdue.length} apartment(s)`);
  };
  return <M title="📧 Send Demand Notices" closeModal={closeModal}>
    {overdue.length === 0 && <div className="alert-bar alert-green">✅ No overdue dues at this time.</div>}
    {overdue.map(d => { const r = residents.find(x => x.id === d.residentId); return <div key={d.id} style={{ background: "#f7f4f0", borderRadius: 10, padding: "10px 13px", marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{d.apt} — {d.resident}</div><div style={{ fontSize: 11, color: "#9090b0" }}>📧 {r?.email} · {d.quarter} {d.year}</div><div style={{ fontSize: 12, color: "#c0392b", fontWeight: 700 }}>{naira(d.amount)} outstanding</div></div>; })}
    <div className="alert-bar alert-gold" style={{ fontSize: 12, marginBottom: 14 }}>📧 Notice includes restriction warning: no gate access & generator cut after 15 days of non-payment.</div>
    {sent ? <div className="alert-bar alert-green" style={{ textAlign: "center", fontWeight: 700 }}>✅ Notices sent to {overdue.length} apartment(s)</div> : <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={send} disabled={overdue.length === 0}>Send {overdue.length} Notice(s)</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>}
    {sent && <button className="btn btn-outline" style={{ width: "100%", marginTop: 8 }} onClick={closeModal}>Close</button>}
  </M>;
}

function LogVehicleModal({ vehicles, gateLog, setGateLog, residents, isRestricted, closeModal, notify, clock, currentUser, logAction }) {
  const [plate, setPlate] = useState(""); const [dir, setDir] = useState("in"); const [code, setCode] = useState("");
  const reg = vehicles.find(v => v.plate.toLowerCase() === plate.toLowerCase().trim());
  const resident = reg ? residents.find(r => r.apt === reg.apt) : null;
  const restricted = resident ? isRestricted(resident.id) : false;
  const logIt = () => {
    if (!plate.trim()) { notify("Enter plate number", "warn"); return; }
    let result = "granted";
    if (reg && restricted) result = "denied";
    else if (!reg && !code) result = "denied";
    const entry = { id: Date.now(), time: clock.toTimeString().slice(0, 5), date: fmt(new Date()), event: `Vehicle ${dir.toUpperCase()}`, person: reg ? `${reg.make} · ${plate.trim()}` : `Unregistered · ${plate.trim()}`, code: reg ? "Registered" : code || "None", gate: "Main Gate", result, apt: reg?.apt || "—" };
    setGateLog(l => [entry, ...l]);
    logAction(currentUser, "Logged vehicle", `${plate.trim()} ${dir.toUpperCase()} – ${result}`);
    notify(result === "granted" ? `✅ Vehicle logged ${dir.toUpperCase()}` : "⛔ Vehicle DENIED", result === "granted" ? "success" : "error");
    closeModal();
  };
  return <M title="🚗 Log Vehicle In / Out" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Plate Number</label><input className="inp" placeholder="KJA 123 LG" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} />
      {plate.trim() && <div style={{ fontSize: 11, marginTop: 5, fontWeight: 700, color: reg ? (restricted ? "#c0392b" : "#1e6e42") : "#b7640a" }}>{reg ? (restricted ? "⛔ Restricted — dues overdue >15 days" : `✅ Registered — ${reg.make} · ${reg.apt}`) : "⚠️ Not registered — access code required"}</div>}
    </div>
    <div className="frow"><label className="flabel">Direction</label><select className="sel" value={dir} onChange={e => setDir(e.target.value)}><option value="in">Entry (IN)</option><option value="out">Exit (OUT)</option></select></div>
    {!reg && plate.trim() && <div className="frow"><label className="flabel">Access Code (for unregistered vehicles)</label><input className="inp" placeholder="PCE-XXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ fontFamily: "DM Mono", letterSpacing: 3 }} /></div>}
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={logIt}>Log Vehicle</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function MarkDoneModal({ activities, setActivities, maintenanceHistory, setMaintenanceHistory, closeModal, notify, currentUser, logAction, dispatchEmail }) {
  const [selId, setSelId] = useState(""); const [doneDate, setDoneDate] = useState(fmt(new Date())); const [contractor, setContractor] = useState(""); const [cost, setCost] = useState(""); const [notes, setNotes] = useState("");
  const pending = activities.filter(a => a.status !== "ok");
  const markDone = () => {
    const act = activities.find(a => a.id === +selId); if (!act) { notify("Select an activity", "warn"); return; }
    const nd = fmt(new Date(new Date(doneDate).getTime() + act.intervalDays * 86400000)); const d = daysUntil(nd);
    setActivities(as => as.map(a => a.id === +selId ? { ...a, lastDone: doneDate, nextDue: nd, status: d < 0 ? "overdue" : d < 14 ? "upcoming" : "ok" } : a));
    setMaintenanceHistory(mh => [...mh, { id: Date.now(), category: act.category, description: act.description, doneDate, completedBy: contractor || "Estate Team", cost: +cost || 0, notes: notes || "Routine service completed" }]);
    logAction(currentUser, "Marked maintenance done", `${act.category} – ${doneDate}`);
    dispatchEmail(ESTATE_EMAIL, `✅ Maintenance Completed: ${act.category}`, `Maintenance completed:\n\nActivity: ${act.category}\nDescription: ${act.description}\nDate: ${doneDate}\nContractor: ${contractor || "Estate Team"}\nCost: ${naira(+cost || 0)}\nNotes: ${notes || "Routine service completed"}\n\nNext service due: ${nd}\n\n— Pearl Court EMS (Auto-generated)`, "maintenance");
    notify(`✅ ${act.category} marked done. Next due: ${nd}`);
    closeModal();
  };
  return <M title="✅ Mark Maintenance Done" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Activity</label><select className="sel" value={selId} onChange={e => setSelId(e.target.value)}><option value="">Select...</option>{pending.map(a => <option key={a.id} value={a.id}>{a.category} — {a.description}</option>)}</select></div>
    <div className="frow"><label className="flabel">Date Completed</label><input className="inp" type="date" value={doneDate} onChange={e => setDoneDate(e.target.value)} /></div>
    <div className="frow"><label className="flabel">Contractor / Done By</label><input className="inp" placeholder="PowerGen Services" value={contractor} onChange={e => setContractor(e.target.value)} /></div>
    <div className="frow"><label className="flabel">Cost (₦)</label><input className="inp" type="number" placeholder="85000" value={cost} onChange={e => setCost(e.target.value)} /></div>
    <div className="frow"><label className="flabel">Notes</label><input className="inp" placeholder="Work completed summary" value={notes} onChange={e => setNotes(e.target.value)} /></div>
    <div className="alert-bar alert-green" style={{ fontSize: 12, marginBottom: 14 }}>Next due date auto-calculated. Completion report emailed to estate automatically.</div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-green" style={{ flex: 1 }} onClick={markDone}>Confirm & Save</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function AddMeetingModal({ residents, meetings, setMeetings, closeModal, notify, currentUser, logAction, dispatchEmail }) {
  const [f, setF] = useState({ title: "", date: fmt(new Date()), time: "10:00", venue: "" });
  const [agendaInput, setAgendaInput] = useState("");
  const [agenda, setAgenda] = useState([]);
  const [delivInput, setDelivInput] = useState("");
  const [deliverables, setDeliverables] = useState([]);

  const addAgenda = () => { if (agendaInput.trim()) { setAgenda(a => [...a, agendaInput.trim()]); setAgendaInput(""); } };
  const addDeliv = () => { if (delivInput.trim()) { setDeliverables(d => [...d, delivInput.trim()]); setDelivInput(""); } };

  const create = () => {
    if (!f.title || !f.date || !f.venue) { notify("Fill required fields", "warn"); return; }
    const newMeeting = { id: Date.now(), ...f, agenda, deliverables, minutes: "", status: "upcoming" };
    setMeetings(ms => [...ms, newMeeting]);
    logAction(currentUser, "Scheduled meeting", `${f.title} – ${f.date}`);
    // Notify all residents
    residents.forEach(r => {
      dispatchEmail(r.email, `🗓️ Meeting Notice — ${f.title}`, `Dear ${r.name},\n\nYou are invited to the following estate meeting:\n\nTitle : ${f.title}\nDate  : ${f.date}\nTime  : ${f.time}\nVenue : ${f.venue}\n\nAgenda:\n${agenda.map((a, i) => `${i + 1}. ${a}`).join("\n") || "TBD"}\n\nPlease make every effort to attend.\n\n— Pearl Court Estate Management\n${ESTATE_EMAIL}`, "general");
    });
    notify(`Meeting scheduled. Notices emailed to ${residents.length} residents.`);
    closeModal();
  };
  return <M title="🗓️ Schedule Meeting" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Meeting Title *</label><input className="inp" placeholder="Q3 AGM 2026" value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Date *</label><input className="inp" type="date" value={f.date} onChange={e => setF(x => ({ ...x, date: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Time</label><input className="inp" placeholder="10:00" value={f.time} onChange={e => setF(x => ({ ...x, time: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Venue *</label><input className="inp" placeholder="Estate Multipurpose Hall" value={f.venue} onChange={e => setF(x => ({ ...x, venue: e.target.value }))} /></div>
    <div className="frow"><label className="flabel">Agenda Items</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><input className="inp" placeholder="Add agenda item..." value={agendaInput} onChange={e => setAgendaInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addAgenda()} /><button className="btn btn-sm btn-outline" onClick={addAgenda}>Add</button></div>
      {agenda.map((a, i) => <div key={i} style={{ fontSize: 12, color: "#5a5a7a", padding: "3px 0" }}>• {a} <button style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 11 }} onClick={() => setAgenda(x => x.filter((_, j) => j !== i))}>✕</button></div>)}
    </div>
    <div className="frow"><label className="flabel">Deliverables</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><input className="inp" placeholder="Add deliverable..." value={delivInput} onChange={e => setDelivInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addDeliv()} /><button className="btn btn-sm btn-outline" onClick={addDeliv}>Add</button></div>
      {deliverables.map((d, i) => <div key={i} style={{ fontSize: 12, color: "#5a5a7a", padding: "3px 0" }}>✅ {d} <button style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 11 }} onClick={() => setDeliverables(x => x.filter((_, j) => j !== i))}>✕</button></div>)}
    </div>
    <div className="alert-bar alert-blue" style={{ fontSize: 12, marginBottom: 14 }}>📧 Meeting invitation will be automatically emailed to all {residents.length} residents.</div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={create}>Schedule & Notify</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function NewQuarterModal({ residents, dues, setDues, setResidents, closeModal, notify, currentUser, logAction, dispatchEmail }) {
  const [quarter, setQuarter] = useState("Q3 (Jul–Sep)");
  const [year, setYear] = useState("2026");
  const [amount, setAmount] = useState("");
  const create = () => {
    if (!amount || +amount <= 0) { notify("Enter valid amount", "warn"); return; }
    if (dues.some(d => d.quarter === quarter && d.year === +year)) { notify(`Dues for ${quarter} ${year} already exist`, "warn"); return; }
    const nd = residents.map((r, i) => ({ id: Date.now() + i, residentId: r.id, apt: r.apt, resident: r.name, quarter, year: +year, amount: +amount, status: "overdue", paidDate: null, invoiceNo: null, noticeSent: fmt(new Date()) }));
    setDues(ds => [...ds, ...nd]);
    setResidents(rs => rs.map(r => ({ ...r, duesOwed: true, suspendedSince: r.suspendedSince || fmt(new Date()) })));
    residents.forEach(r => {
      dispatchEmail(r.email, `📋 ${quarter} ${year} Estate Dues — Pearl Court`, `Dear ${r.name},\n\nEstate dues for ${quarter} ${year} are now due.\n\nApartment : ${r.apt}\nPeriod    : ${quarter} ${year}\nAmount Due: ${naira(+amount)}\n\nKindly pay to the estate accountant and provide proof of payment.\n\nNon-payment after 15 days will result in:\n• Gate access restrictions\n• Generator supply suspension\n\nThank you.\n\n— Pearl Court Estate Management\n${ESTATE_EMAIL}`, "dues");
    });
    logAction(currentUser, "Created quarter dues", `${quarter} ${year} – ${residents.length} apts – ${naira(+amount)}`);
    notify(`📋 ${quarter} ${year} dues created. Demand notices sent to ${residents.length} apartments.`);
    closeModal();
  };
  return <M title="📋 Create New Quarter Dues" closeModal={closeModal}>
    <div className="frow"><label className="flabel">Quarter</label><select className="sel" value={quarter} onChange={e => setQuarter(e.target.value)}>{["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"].map(q => <option key={q}>{q}</option>)}</select></div>
    <div className="frow"><label className="flabel">Year</label><input className="inp" value={year} onChange={e => setYear(e.target.value)} /></div>
    <div className="frow"><label className="flabel">Amount per Apartment (₦) *</label><input className="inp" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount e.g. 75000" /></div>
    <div className="alert-bar alert-gold" style={{ fontSize: 12, marginBottom: 14 }}>Creates dues for all {residents.length} registered apartments. Amount is editable at time of payment. Demand notices emailed automatically.</div>
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={create}>Create & Send Notices</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}

function SimpleFormModal({ title, fields, onSubmit, closeModal, submitLabel }) {
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(f => [f.key, f.type === "date" ? fmt(new Date()) : ""])));
  return <M title={title} closeModal={closeModal}>
    {fields.map(f => (
      <div key={f.key} className="frow"><label className="flabel">{f.label}</label>
        {f.type === "select" ? <select className="sel" value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}><option value="">Select...</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
          : <input className="inp" type={f.type || "text"} placeholder={f.ph} value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))} />}
      </div>
    ))}
    <div style={{ display: "flex", gap: 10 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSubmit(vals)}>{submitLabel}</button><button className="btn btn-outline" onClick={closeModal}>Cancel</button></div>
  </M>;
}
