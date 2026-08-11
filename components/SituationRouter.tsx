"use client"

import { FormEvent, useMemo, useState } from "react"

type ServiceId =
  | "manage"
  | "sell"
  | "buy"
  | "invest"
  | "inherit"
  | "legal"
  | "other"

type FormState = {
  service: ServiceId | ""
  basedIn: string
  basedCity: string
  propertyLocation: string
  preferredLocation: string
  propertyType: string
  timeline: string
  budget: string
  notes: string
  name: string
  email: string
  phone: string
  contactPreference: string
}

const services: Array<{
  id: ServiceId
  icon: string
  title: string
  subtitle: string
}> = [
  {
    id: "manage",
    icon: "🏠",
    title: "Property Management",
    subtitle: "Tenant, rent, inspection, maintenance",
  },
  {
    id: "sell",
    icon: "🏷️",
    title: "Sell Property",
    subtitle: "Valuation, buyers, tax, repatriation",
  },
  {
    id: "buy",
    icon: "🏢",
    title: "Buy Property",
    subtitle: "Shortlisting, verification, registration",
  },
  {
    id: "invest",
    icon: "📈",
    title: "Where to Invest",
    subtitle: "Location, rental demand, growth, exit",
  },
  {
    id: "inherit",
    icon: "📜",
    title: "Inherited Property",
    subtitle: "Ownership, mutation, co-owner support",
  },
  {
    id: "legal",
    icon: "⚖️",
    title: "Legal / Tax Support",
    subtitle: "PoA, TDS, capital gains, remittance",
  },
  {
    id: "other",
    icon: "💼",
    title: "Other / Multiple",
    subtitle: "Not sure or several requirements",
  },
]

const countries = [
  "Australia",
  "New Zealand",
  "United Arab Emirates",
  "United States",
  "United Kingdom",
  "France",
  "Italy",
  "India",
  "Other",
]

const initialState: FormState = {
  service: "",
  basedIn: "",
  basedCity: "",
  propertyLocation: "",
  preferredLocation: "",
  propertyType: "",
  timeline: "",
  budget: "",
  notes: "",
  name: "",
  email: "",
  phone: "",
  contactPreference: "WhatsApp",
}

function serviceLabel(service: ServiceId | "") {
  return services.find((item) => item.id === service)?.title || ""
}

export default function SituationRouter() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const selectedService = useMemo(
    () => services.find((item) => item.id === form.service),
    [form.service],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function canContinueStepTwo() {
    if (!form.basedIn || !form.basedCity) return false

    if (form.service === "buy" || form.service === "invest") {
      return Boolean(form.preferredLocation || form.notes)
    }

    if (
      form.service === "sell" ||
      form.service === "manage" ||
      form.service === "inherit"
    ) {
      return Boolean(form.propertyLocation)
    }

    return Boolean(form.notes || form.propertyLocation || form.preferredLocation)
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (!form.name || !form.email || !form.phone) {
      setError("Please add your name, email and phone number.")
      return
    }

    setSubmitting(true)

    try {
      const body = new FormData()
      body.set("name", form.name)
      body.set("email", form.email)
      body.set("phone", form.phone)
      body.set("service", serviceLabel(form.service))
      body.set("basedIn", form.basedIn)
      body.set("basedCity", form.basedCity)
      body.set("propertyLocation", form.propertyLocation)
      body.set("preferredLocation", form.preferredLocation)
      body.set("propertyType", form.propertyType)
      body.set("timeline", form.timeline)
      body.set("budget", form.budget)
      body.set("contactPreference", form.contactPreference)
      body.set("message", form.notes)

      const response = await fetch("/api/enquiry", {
        method: "POST",
        body,
      })

      if (!response.ok && response.redirected === false) {
        throw new Error("Unable to submit enquiry")
      }

      setSubmitted(true)
      setStep(3)
    } catch {
      setError(
        "We could not submit the enquiry. Please use the WhatsApp button or try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="questionnaire-section" id="help-router">
      <div className="questionnaire-shell">
        <div className="questionnaire-topline">
          <div className="questionnaire-progress" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className={item <= step ? "active" : ""}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="response-promise">
            <span className="response-pulse" />
            <strong>Response within 30 minutes</strong>
            <small>during business hours</small>
          </div>
        </div>

        {!submitted && (
          <div className="questionnaire-header">
            <p>Three quick steps</p>
            <h2>
              {step === 1 && "What do you need help with?"}
              {step === 2 && "Tell us where you are and where the property is."}
              {step === 3 && "Where should we contact you?"}
            </h2>
            <span>
              {step === 1 &&
                "Choose the option closest to your situation. The next questions will adapt automatically."}
              {step === 2 &&
                "This helps us route your enquiry to the right local property, legal or tax professional."}
              {step === 3 &&
                "Leave your details and a member of our team will contact you, typically within 30 minutes during business hours."}
            </span>
          </div>
        )}

        {step === 1 && !submitted && (
          <>
            <div className="questionnaire-options">
              {services.map((service) => (
                <button
                  type="button"
                  key={service.id}
                  className={
                    form.service === service.id
                      ? "questionnaire-option selected"
                      : "questionnaire-option"
                  }
                  onClick={() => update("service", service.id)}
                >
                  <span className="questionnaire-icon">{service.icon}</span>
                  <span>
                    <strong>{service.title}</strong>
                    <small>{service.subtitle}</small>
                  </span>
                  <i>{form.service === service.id ? "✓" : ""}</i>
                </button>
              ))}
            </div>

            <div className="questionnaire-footer">
              <div className="speed-message">
                <strong>Results in days, not weeks.</strong>
                <span>
                  Clear next steps, local coordination and regular progress updates.
                </span>
              </div>

              <button
                type="button"
                className="questionnaire-primary"
                disabled={!form.service}
                onClick={() => setStep(2)}
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 2 && !submitted && (
          <>
            <div className="selected-service-summary">
              <span>{selectedService?.icon}</span>
              <div>
                <small>Your selected service</small>
                <strong>{selectedService?.title}</strong>
              </div>
              <button type="button" onClick={() => setStep(1)}>
                Change
              </button>
            </div>

            <div className="questionnaire-fields">
              <label>
                Where are you currently based?
                <select
                  value={form.basedIn}
                  onChange={(event) => update("basedIn", event.target.value)}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </select>
              </label>

              <label>
                Your current city
                <input
                  value={form.basedCity}
                  onChange={(event) => update("basedCity", event.target.value)}
                  placeholder="For example: Sydney, Dubai, London"
                />
              </label>

              {(form.service === "sell" ||
                form.service === "manage" ||
                form.service === "inherit") && (
                <>
                  <label>
                    Where is the property in India?
                    <input
                      value={form.propertyLocation}
                      onChange={(event) =>
                        update("propertyLocation", event.target.value)
                      }
                      placeholder="City, suburb or project name"
                    />
                  </label>

                  <label>
                    Property type
                    <select
                      value={form.propertyType}
                      onChange={(event) =>
                        update("propertyType", event.target.value)
                      }
                    >
                      <option value="">Select type</option>
                      <option>House / Villa</option>
                      <option>Apartment</option>
                      <option>Land / Plot</option>
                      <option>Commercial property</option>
                      <option>Holiday home</option>
                      <option>Other</option>
                    </select>
                  </label>
                </>
              )}

              {(form.service === "buy" || form.service === "invest") && (
                <>
                  <label>
                    Any location in mind?
                    <input
                      value={form.preferredLocation}
                      onChange={(event) =>
                        update("preferredLocation", event.target.value)
                      }
                      placeholder="For example: Noida, Gurgaon, Uttarakhand"
                    />
                  </label>

                  <label>
                    Approximate budget
                    <input
                      value={form.budget}
                      onChange={(event) => update("budget", event.target.value)}
                      placeholder="For example: ₹1.5 crore"
                    />
                  </label>
                </>
              )}

              {(form.service === "legal" || form.service === "other") && (
                <>
                  <label>
                    Property location, if relevant
                    <input
                      value={form.propertyLocation}
                      onChange={(event) =>
                        update("propertyLocation", event.target.value)
                      }
                      placeholder="City, state or project"
                    />
                  </label>

                  <label>
                    Preferred location, if buying
                    <input
                      value={form.preferredLocation}
                      onChange={(event) =>
                        update("preferredLocation", event.target.value)
                      }
                      placeholder="Any location you are considering"
                    />
                  </label>
                </>
              )}

              <label>
                Preferred timeline
                <select
                  value={form.timeline}
                  onChange={(event) => update("timeline", event.target.value)}
                >
                  <option value="">Select timeline</option>
                  <option>Immediately</option>
                  <option>Within 30 days</option>
                  <option>Within 3 months</option>
                  <option>Within 6 months</option>
                  <option>Researching only</option>
                </select>
              </label>

              <label className="questionnaire-full">
                Anything else we should know?
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Current tenant situation, ownership issue, target outcome or any concern."
                />
              </label>
            </div>

            <div className="questionnaire-footer">
              <button
                type="button"
                className="questionnaire-back"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>

              <button
                type="button"
                className="questionnaire-primary"
                disabled={!canContinueStepTwo()}
                onClick={() => setStep(3)}
              >
                Continue to contact details →
              </button>
            </div>
          </>
        )}

        {step === 3 && !submitted && (
          <form className="questionnaire-contact-form" onSubmit={submitForm}>
            <div className="questionnaire-fields">
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Phone / WhatsApp
                <input
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+61..."
                  required
                />
              </label>

              <label>
                Preferred contact method
                <select
                  value={form.contactPreference}
                  onChange={(event) =>
                    update("contactPreference", event.target.value)
                  }
                >
                  <option>WhatsApp</option>
                  <option>Phone call</option>
                  <option>Email</option>
                </select>
              </label>
            </div>

            <div className="thirty-minute-callout">
              <div>
                <span className="response-pulse" />
                <strong>We aim to contact you within 30 minutes</strong>
              </div>
              <p>
                During business hours. You will receive clear next steps and the
                right local specialist will be identified quickly.
              </p>
              <small>Fast response. Practical action. Results in days, not weeks.</small>
            </div>

            {error && <p className="questionnaire-error">{error}</p>}

            <div className="questionnaire-footer">
              <button
                type="button"
                className="questionnaire-back"
                onClick={() => setStep(2)}
              >
                ← Back
              </button>

              <button
                type="submit"
                className="questionnaire-primary"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Request my 30-minute response →"}
              </button>
            </div>
          </form>
        )}

        {submitted && (
          <div className="questionnaire-success">
            <div className="success-icon">✓</div>
            <p>Enquiry received</p>
            <h2>Thank you, {form.name}.</h2>
            <span>
              Your {serviceLabel(form.service).toLowerCase()} enquiry has been
              recorded. A member of our team will contact you using{" "}
              {form.contactPreference.toLowerCase()}, typically within 30 minutes
              during business hours.
            </span>

            <div className="success-promises">
              <article>
                <strong>30-minute response target</strong>
                <small>During business hours</small>
              </article>
              <article>
                <strong>Right expert identified</strong>
                <small>Property, legal or tax</small>
              </article>
              <article>
                <strong>Results in days</strong>
                <small>Not weeks of scattered calls</small>
              </article>
            </div>

            <a href="https://wa.me/61401362980" className="questionnaire-primary">
              Message us on WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
