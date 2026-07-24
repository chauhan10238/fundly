# Premium NRI Property Site – Three-Step Questionnaire

This package is based on the latest premium white-and-saffron website and replaces the single-step service selector with a smart three-step questionnaire.

## Questionnaire flow

### Step 1 — Service

The visitor selects:

- Property Management
- Sell Property
- Buy Property
- Where to Invest
- Inherited Property
- Legal / Tax Support
- Other / Multiple

### Step 2 — Dynamic property questions

Every visitor is asked:

- Country where they are based
- Current city
- Preferred timeline

The remaining questions adapt to the selected service.

#### Sell, manage or inherited property

- Where the property is located
- Property type
- Current situation or additional details

#### Buy or investment guidance

- Preferred Indian location
- Approximate budget
- Investment objective or additional details

#### Legal, tax or other

- Property location, if relevant
- Preferred location, if buying
- Explanation of the issue

### Step 3 — Contact details

- Name
- Email
- Phone or WhatsApp
- Preferred contact method

## Response positioning

The questionnaire highlights:

- Response target within 30 minutes during business hours
- Fast routing to the relevant property, legal or tax professional
- “Results in days, not weeks”

This wording uses a response target rather than an unconditional guarantee.

## Files

Replace all files from the ZIP. The main change is:

```text
components/SituationRouter.tsx
```

and new questionnaire CSS is included in:

```text
app/globals.css
```

## Submission

The component posts the completed questionnaire to:

```text
/api/enquiry
```

The existing API route currently logs the enquiry in Vercel. Connect it to your email, CRM or database before launch.
