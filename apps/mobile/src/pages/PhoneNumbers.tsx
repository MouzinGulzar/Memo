import { useState, useEffect } from "react";
import {
  getPhoneNumbers,
  addPhoneNumbers,
  deletePhoneNumber,
} from "../api/phoneNumbers";
import type { PhoneNumber } from "../api/phoneNumbers";
import "../styles/page.css";

export default function PhoneNumbers() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await getPhoneNumbers();
      setNumbers(data.phoneNumbers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      await addPhoneNumbers([
        { phone: phone.trim(), label: label.trim() || undefined },
      ]);
      setPhone("");
      setLabel("");
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "Failed to add number");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePhoneNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-screen">
      <header className="page-header">
        <h1>Phone Numbers</h1>
      </header>

      <div className="page-body">
        <form onSubmit={handleAdd} className="add-form">
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={adding}>
            {adding ? <span className="spinner" /> : "Add Number"}
          </button>
        </form>

        <div className="list">
          {loading ? (
            <div className="list-empty">
              <span className="spinner" />
            </div>
          ) : numbers.length === 0 ? (
            <div className="list-empty">
              <p>No phone numbers added yet</p>
            </div>
          ) : (
            numbers.map((n) => (
              <div key={n.id} className="list-item">
                <div className="list-item-info">
                  <span className="list-item-title">{n.phone}</span>
                  {n.label && <span className="list-item-sub">{n.label}</span>}
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(n.id)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
