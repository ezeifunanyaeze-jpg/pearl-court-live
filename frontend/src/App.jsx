import { useEffect, useState } from "react";
import { API } from "./api.js";
import "./App.css";

function App() {
  // =======================
  // STATE
  // =======================

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    apt: "",
    phone: "",
    email: "",
  });

  const [accessCodeForm, setAccessCodeForm] = useState({
    apt: "",
    visitorName: "",
    residentName: "",
  });

  const [generatedCode, setGeneratedCode] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState("");

  const [gateLogs, setGateLogs] = useState([]);

  // =======================
  // FETCH DATA
  // =======================

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await API.get("/residents");
      setResidents(res.data);
    } catch {
      setMessage("Failed to fetch residents");
    } finally {
      setLoading(false);
    }
  };

  const fetchGateLogs = async () => {
    try {
      const res = await API.get("/gate-logs");
      setGateLogs(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchResidents();
    fetchGateLogs();
  }, []);

  // =======================
  // HANDLERS
  // =======================

  const handleResidentChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addResident = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/residents", form);
      setResidents([res.data, ...residents]);
      setForm({ name: "", apt: "", phone: "", email: "" });
    } catch {
      setMessage("Failed to add resident");
    }
  };

  const handleAccessChange = (e) => {
    const { name, value } = e.target;
    setAccessCodeForm((prev) => ({ ...prev, [name]: value }));
  };

  const generateCode = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/access-codes", accessCodeForm);
      setGeneratedCode(res.data);

      setAccessCodeForm({
        apt: "",
        visitorName: "",
        residentName: "",
      });
    } catch {
      alert("Failed to generate code");
    }
  };

  const verifyAccess = async (e) => {
    e.preventDefault();

    try {
      await API.post("/access-codes/verify", { code: verifyCode });
      setVerifyResult("✅ Access Approved");
      fetchGateLogs();
    } catch (err) {
      setVerifyResult(
        err.response?.data?.error || "❌ Access Denied"
      );
    }
  };

  const payDues = async (resident) => {
    try {
      await API.post("/payments", {
        residentId: resident.id,
        apt: resident.apt,
        amount: 50000,
      });

      fetchResidents();
      alert("Payment recorded ✅");
    } catch {
      alert("Payment failed ❌");
    }
  };

  // =======================
  // UI
  // =======================

  return (
    <div className="app-container">
      <h1>Pearl Court Estate Management System</h1>

      {/* ================= RESIDENT FORM ================= */}

      <div className="card">
        <h2>Add Resident</h2>

        <form onSubmit={addResident} className="resident-form">
          <input name="name" placeholder="Name" value={form.name} onChange={handleResidentChange} />
          <input name="apt" placeholder="Apartment" value={form.apt} onChange={handleResidentChange} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleResidentChange} />
          <input name="email" placeholder="Email" value={form.email} onChange={handleResidentChange} />

          <button>Add Resident</button>
        </form>
      </div>

      {/* ================= RESIDENT TABLE ================= */}

      <div className="card">
        <h2>Residents Directory</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Apt</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Dues</th>
                <th>Access</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {residents.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.apt}</td>
                  <td>{r.phone}</td>
                  <td>{r.email}</td>

                  <td style={{ color: r.duesStatus === "clear" ? "green" : "red" }}>
                    {r.duesStatus || "pending"}
                  </td>

                  <td style={{ color: r.accessStatus === "active" ? "green" : "red" }}>
                    {r.accessStatus || "blocked"}
                  </td>

                  <td>
                    <button onClick={() => payDues(r)}>Pay</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= GENERATE CODE ================= */}

      <div className="card">
        <h2>Generate Visitor Code</h2>

        <form onSubmit={generateCode} className="resident-form">
          <input name="apt" placeholder="Apartment" value={accessCodeForm.apt} onChange={handleAccessChange} />
          <input name="visitorName" placeholder="Visitor Name" value={accessCodeForm.visitorName} onChange={handleAccessChange} />
          <input name="residentName" placeholder="Resident Name" value={accessCodeForm.residentName} onChange={handleAccessChange} />

          <button>Generate Code</button>
        </form>

        {generatedCode && (
          <p className="message">
            Code: <strong>{generatedCode.code}</strong> <br />
            Expires: {new Date(generatedCode.expiresAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* ================= VERIFY ================= */}

      <div className="card">
        <h2>Verify Visitor Code</h2>

        <form onSubmit={verifyAccess}>
          <input
            placeholder="Enter Code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
          />
          <button>Verify</button>
        </form>

        {verifyResult && <p className="message">{verifyResult}</p>}
      </div>

      {/* ================= GATE LOGS ================= */}

      <div className="card">
        <h2>Gate Logs</h2>

        {gateLogs.length === 0 ? (
          <p>No logs</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Apt</th>
                <th>Action</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {gateLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.visitorName}</td>
                  <td>{log.apt}</td>
                  <td>{log.action}</td>
                  <td>{new Date(log.time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
``