# UTM Keeper

## What It Is

UTM Keeper is a lightweight WordPress plugin that preserves marketing attribution parameters as visitors move through a website and eventually click a conversion link.

For example, a visitor arrives from an ad:

`example.com/?utm_source=google&utm_campaign=summer`

They browse several pages and later click:

`Book Appointment`

UTM Keeper can preserve the original campaign information and pass it to the booking or destination URL.

---

## Why Build It

Marketing parameters can easily disappear during a visitor's journey.

A visitor may arrive with UTM parameters, browse several pages, and then click an external booking system, contact form, checkout, or another conversion destination.

By that point, the original attribution information may be lost.

This makes it harder for businesses to understand where a lead originally came from.

UTM Keeper solves one specific problem:

> Preserve campaign parameters until the visitor reaches the conversion destination.

---

## Target Users

The plugin is mainly useful for:

- Small businesses running ads
- Marketing agencies
- Freelancers managing client websites
- Landing pages
- Lead-generation websites
- Businesses using external booking systems
- Websites sending visitors to external checkout or signup services

It is especially useful when WordPress is only the first part of the conversion journey.

---

## Core Idea

A visitor arrives at:

`example.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=summer`

UTM Keeper stores the selected parameters.

The visitor then navigates to:

`example.com/services/`

The URL can remain clean.

Later they click:

`booking.example.com/appointment`

UTM Keeper changes the destination to:

`booking.example.com/appointment?utm_source=facebook&utm_medium=cpc&utm_campaign=summer`

The attribution survives the journey.

---

## MVP Features

The first version should remain small.

- Capture UTM parameters from incoming URLs
- Store them temporarily in the visitor's browser
- Preserve standard parameters:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_term`
  - `utm_content`
- Optional support for parameters such as `gclid` and `fbclid`
- Choose which parameters should be preserved
- Configure destination domains
- Automatically append stored parameters to matching links
- Option to target links using a CSS class
- Avoid overwriting parameters already present in the destination URL
- Clear/reset stored attribution
- Configurable retention period

---

## Example Configuration

### Parameters to Preserve

```text
☑ utm_source
☑ utm_medium
☑ utm_campaign
☑ utm_term
☑ utm_content
☐ gclid
☐ fbclid
```

### Destination Domains

```text
booking.example.com
checkout.example.com
```

Or developers could explicitly mark a link:

```html
<a href="https://booking.example.com" class="utm-keeper">
    Book Appointment
</a>
```

UTM Keeper would append the stored attribution parameters when the visitor clicks it.

---

## Important Behavior

The plugin should be predictable.

If a visitor arrives with new campaign parameters, the plugin needs a clear rule for whether the new attribution replaces the existing attribution.

For the MVP, one simple strategy should be selected and documented clearly.

The plugin should also avoid modifying every external link by default. Site owners should explicitly choose destination domains or targeted links.

---

## Privacy

UTM Keeper should not become a tracking or analytics system.

It should:

- Store only configured campaign parameters
- Avoid storing personal information
- Avoid sending data to an external service
- Perform its work locally
- Provide a clear retention policy

The plugin preserves attribution data. It does not analyze visitors.

---

## What It Should Not Become

UTM Keeper should not become:

- Google Analytics replacement
- Conversion analytics platform
- Tag manager
- Advertising dashboard
- CRM
- Link shortener
- Affiliate management system
- Cookie consent platform

Its job should remain simple:

> Capture marketing parameters and pass them to the links that need them.

---

## Possible Future Features

After the MVP is validated:

- First-touch vs. last-touch attribution modes
- Custom query parameters
- Form-field population
- WooCommerce integration
- Popular form-plugin integrations
- Booking-plugin integrations
- JavaScript API
- PHP helper functions
- Import/export settings
- Debug mode for developers

---

## Positioning

Possible one-line description:

> Preserve UTM parameters across WordPress and pass them to your conversion links.

A simpler alternative:

> Keep your campaign attribution when visitors leave your WordPress site.

Another user-focused version:

> Don't lose UTM parameters before your visitors book, buy, or sign up.

The first version is probably the clearest for the WordPress.org listing because it directly explains what the plugin does.

---

## Main Principle

UTM Keeper should follow the same philosophy as ButtonFlow and HoursFlow:

**One specific problem, solved well, with very little overhead.**

No analytics dashboard, no SaaS account, no external tracking service, and no unnecessary frontend weight.
