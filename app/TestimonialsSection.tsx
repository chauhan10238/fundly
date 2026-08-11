const testimonials = [
  {
    quote:
      "The biggest value was having one accountable team in Australia and India. We finally had clarity on our property, tenant position and the steps required before making a sale decision.",
    name: "Rajiv Mehta",
    role: "Property Owner",
    location: "Sydney / Delhi NCR",
    service: "Property Management",
  },
  {
    quote:
      "We were not looking for a sales pitch. We wanted someone to compare locations, explain the risks and coordinate with the lawyer and accountant. The process felt structured and transparent.",
    name: "Neha Sharma",
    role: "NRI Investor",
    location: "Melbourne / Uttar Pradesh",
    service: "Investment Guidance",
  },
  {
    quote:
      "Managing maintenance from overseas had become stressful. Regular updates, local inspections and a clear point of contact made the property much easier to manage.",
    name: "Amit Verma",
    role: "Overseas Landlord",
    location: "Brisbane / Uttarakhand",
    service: "Property Management",
  },
  {
    quote:
      "The team helped us understand the realistic sale value, organise the documentation and coordinate with local buyers. We felt informed throughout the process.",
    name: "Pooja Arora",
    role: "Property Seller",
    location: "Perth / Punjab",
    service: "Property Sale",
  },
  {
    quote:
      "We needed independent guidance before purchasing. The comparison of locations, project quality, rental demand and future resale potential was extremely helpful.",
    name: "Sandeep Batra",
    role: "Property Buyer",
    location: "Sydney / Haryana",
    service: "Property Purchase",
  },
  {
    quote:
      "Having the legal team, Chartered Accountant and property professionals coordinated through one relationship removed a lot of confusion for our family.",
    name: "Ritika Malhotra",
    role: "NRI Property Owner",
    location: "Adelaide / Rajasthan",
    service: "Legal & Tax Coordination",
  },
  {
    quote:
      "Our holiday property required regular inspections and maintenance. The local team provided photos, updates and clear expense information.",
    name: "Vikram Kapoor",
    role: "Holiday Home Owner",
    location: "Melbourne / Himachal Pradesh",
    service: "Property Management",
  },
  {
    quote:
      "The team explained both the investment opportunity and the risks. We appreciated that they did not pressure us into purchasing the first project shown.",
    name: "Anjali Khanna",
    role: "NRI Investor",
    location: "Canberra / Noida",
    service: "Investment Guidance",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="section testimonials-section" id="testimonials">
      <div className="testimonial-heading-row">
        <div className="section-heading">
          <p className="eyebrow">Client experiences</p>
          <h2>Trusted by overseas property owners and investors.</h2>
          <p>
            Real experiences from clients using our property management,
            sale, purchase and investment support services.
          </p>
        </div>

        <div className="testimonial-trust-note">
          <span>★★★★★</span>
          <strong>Trusted cross-border support</strong>
          <small>Australia and India</small>
        </div>
      </div>

      <div className="testimonial-slider">
        <div className="testimonial-track">
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <article
              className="testimonial-card"
              key={`${testimonial.name}-${index}`}
            >
              <div className="testimonial-stars">★★★★★</div>

              <blockquote>“{testimonial.quote}”</blockquote>

              <div className="testimonial-client">
                <div className="testimonial-avatar">
                  {testimonial.name
                    .split(" ")
                    .map((name) => name[0])
                    .join("")}
                </div>

                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                  <small>{testimonial.location}</small>
                </div>
              </div>

              <div className="testimonial-service">
                {testimonial.service}
              </div>
            </article>
          ))}
        </div>
      </div>

      <p className="testimonial-disclaimer">
        Replace these development placeholders with verified, customer-approved
        testimonials before public launch.
      </p>
    </section>
  )
}
