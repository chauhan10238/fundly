"use client";

import { FormEvent, useState } from "react";

export default function EnquiryForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Request failed");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="enquiry-form" onSubmit={submitForm}>
      <div className="form-grid">
        <label>
          Full name
          <input name="name" required placeholder="Your name" />
        </label>
        <label>
          Email
          <input name="email" required type="email" placeholder="you@example.com" />
        </label>
        <label>
          Phone
          <input name="phone" placeholder="Australian or Indian number" />
        </label>
        <label>
          I need help with
          <select name="service" defaultValue="Buying property">
            <option>Buying property</option>
            <option>Holiday home / Airbnb</option>
            <option>Property management</option>
            <option>Selling property</option>
            <option>Tax and repatriation coordination</option>
          </select>
        </label>
      </div>
      <label>
        Tell us about your requirement
        <textarea name="message" rows={5} required placeholder="Location, budget, property type and your questions" />
      </label>
      <button className="button primary" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request a consultation"}
      </button>
      {status === "success" && <p className="form-message success">Thanks — your enquiry has been recorded.</p>}
      {status === "error" && <p className="form-message error">Unable to submit. Please try again.</p>}
      <p className="form-note">Demo form: connect the API route to Resend, SendGrid, HubSpot or your CRM before launch.</p>
    </form>
  );
}
