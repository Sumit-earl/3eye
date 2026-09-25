# 3eye — Product Requirements Document

**Status:** Draft  
**Version:** 0.1  
**Date:** 23 September 2026  
**Scope:** Product requirements only. This document intentionally excludes implementation choices, technology selection, and low-level engineering design.

---

## 1. Executive summary

**3eye** is a privacy-transparency and environment-intelligence product.

It gives individuals a clear picture of what an ordinary website can learn about their side. It explains what is directly visible, what is estimated, what requires permission, and what a website cannot access.

The same understanding can help organizations improve their products and customer experience. With the customer's authorization, 3eye can combine aggregated information about real-world usage environments with the organization's own customer information to identify compatibility problems, slow experiences, unsuitable recommendations, and segments that need attention.

The product has two connected experiences:

1. **Personal Internet Mirror** — an individual sees and understands their current internet-facing environment.
2. **Environment Intelligence** — an organization uses authorized, aggregated environmental insights to make better product and customer decisions, with or without merging the data with thier own as well as third party datasets.

The product promise is:

> **See what the internet can see, what it cannot, and what your environment means for your experience.**

3eye must remain understandable to a first-time visitor, useful to a technical expert, and trustworthy for organizations making decisions that affect people.

---

## 2. Problem statement

### 2.1 For individuals

People use phones, tablets, laptops, and other connected devices every day, but they usually cannot tell:

- What information a website can see automatically.
- Which details are only estimates.
- Which information requires their permission.
- Which private information websites cannot access.
- Why a website appears to know their location, device, language, or connection type.
- Whether a connection is likely to be private, secure, stable, or fast.
- Whether a website is identifying their browser or merely recognizing its general type.
- Whether a Pre-owned dataset can combine or not? The leaked stuff, Stolen/sold database.

The result is a privacy information gap. People either remain uninformed or rely on fear, jargon, and misleading claims.

### 2.2 For organizations

Organizations already know a great deal about their own customers, such as account activity, purchases, searches, support history, product usage, and engagement. They usually have less context about the environment in which those activities occur.

This can hide important differences between an average result and a specific segment. For example:

- A service may feel fast on average but be very slow for customers on particular networks.
- A streaming experience may buffer for a meaningful group of customers.
- A checkout may fail for customers with a particular device or browser combination.
- A campaign may promote an experience that some interested customers cannot use reliably.
- A new feature may create problems for a small but important customer segment.

Organizations need a trustworthy way to understand these conditions without collecting unnecessary personal information or making unsupported decisions about individuals.

### 2.3 The missing product

The market needs a trusted layer that:

- Makes environmental information visible and understandable.
- Separates facts from estimates and permissions.
- Explains uncertainty instead of hiding it.
- Supports both individual transparency and authorized organizational insight.
- Is useful for decisions rather than merely displaying data.
- Scales from a simple personal check to broad, aggregated business understanding.

---

## 3. Product vision

Make the boundary between a person, their connected environment, and an online service **visible, explainable, and actionable**.

3eye should help people answer:

- What can this website see about me right now?
- What does each piece of information mean?
- How reliable is each answer?
- What information is unavailable to the website?
- How does my environment affect the experience I receive?

And help organizations answer:

- Which customer environments are experiencing difficulty?
- Which segments can use a feature reliably?
- Where is performance or compatibility being lost?
- Which environmental patterns are associated with complaints, abandonment, or failure?
- What action should the organization take, and what evidence supports it?

The same underlying understanding should be presented at different levels of depth for different people. A simple visitor should see a clear answer; a specialist should be able to investigate the evidence behind it.

---

## 4. Product principles

### 4.1 Truth over completeness

It is better to show a partial answer with a clear limitation than to imply complete knowledge. The product must never make a signal look more certain or more revealing than it is.

### 4.2 Explain every result

Every important result must answer:

- What is being reported?
- How was it established?
- Is it observed, estimated, permission-based, or unavailable?
- How reliable is it?
- Why does it matter?
- What can the user or organization do next?

### 4.3 User control

People must know what is being checked, choose whether to grant optional permissions, understand what is remembered, and be able to delete or share information deliberately.

### 4.4 Progressive depth

The default experience should be simple. More detail is available when someone wants to learn, diagnose, compare, or investigate.

### 4.5 Correlation is not identity

Different observations may help distinguish one environment from another. That does not prove who a person is, where they live, or whether two sessions belong to the same person.

### 4.6 Business value before data collection

A signal should not be collected merely because it is interesting. It must answer a meaningful question and support a useful decision.

### 4.7 Privacy and safety are product features

Data minimization, transparency, consent, deletion, fair use, and responsible recommendations are requirements, not optional enhancements.

---

## 5. Goals and non-goals

### 5.1 Product goals

1. Give a first-time visitor a useful privacy and environment summary in less than one minute.
2. Make the difference between visible, estimated, permission-based, and inaccessible information unmistakable.
3. Provide plain-language explanations that can be explored at greater depth.
4. Help people compare environments deliberately and understand what changed.
5. Give developers and technical users a trustworthy diagnostic report.
6. Help organizations identify actionable customer-environment segments without unnecessary personal-data collection.
7. Support organization-specific questions while preserving clear limits on individual targeting.
8. Establish trust through provenance, evidence, uncertainty, user control, and deletion.
9. Create a product foundation that can grow from a personal check to a broad environment-intelligence offering.

### 5.2 Non-goals

3eye will not:

- Reveal SIM numbers, contacts, installed applications, private files, photos, passwords, Wi-Fi credentials, or other private device information.
- Secretly access a camera, microphone, location, notifications, or any other protected function.
- Claim to know a person's real identity from environmental signals.
- Promise perfect VPN, proxy, location, connection, or uniqueness detection.
- Provide a perfect anonymity or privacy score without a transparent, defensible method.
- Make high-impact decisions about a person without appropriate human oversight and safeguards.
- Support unauthorized surveillance, stalking, fraud, evasion, deanonymization, or malicious tracking.
- Replace a customer's complete business analytics system.
- Collect every possible signal before validating that it creates user or customer value.

---

## 6. Target users and jobs to be done

### 6.1 Individual personas

| Persona | Main question | Desired outcome | Default experience |
|---|---|---|---|
| **Everyday user** | What is the internet seeing about me? | A calm, understandable answer without jargon | Plain summary and short explanations |
| **Learner** | Why does a website know this about me? | To learn through examples and experiments | Guided explanations and comparisons |
| **Developer or IT professional** | What is causing this compatibility or performance issue? | A fast, detailed diagnostic view | Filterable report and exportable summary |
| **Advanced technical user** | What signals are available and how do they behave? | Transparent investigation and evidence | Detailed view, limitations, and raw observations where appropriate |
| **Privacy-focused or power user** | What could link or distinguish my environments? | A view of overlap, changes, and exposure | Comparison and consistency checks |
| **Organization decision-maker** | Which customer environments need attention? | Evidence for a product, marketing, support, or reliability decision | Aggregated segment reports and recommendations |

### 6.2 Organization roles

The organization experience should serve several roles without exposing all information to all users:

- **Product and experience teams:** identify segments with usability, compatibility, or performance problems.
- **Customer-support and operations teams:** understand recurring environmental causes of issues.
- **Marketing and growth teams:** find customers for whom a message or offer is relevant and realistic to use.
- **Engineering and quality teams:** validate whether a change improves the intended customer segments.
- **Data and analytics teams:** define questions, review evidence, and control access to insights.
- **Privacy, legal, and security teams:** verify that collection, retention, access, and use follow approved policy.

---

## 7. Core product concepts

### 7.1 Environment snapshot

An **environment snapshot** is a view of the conditions surrounding one visit or session. It may include a device, browser, network, language, time zone, permissions, and connection experience.

A snapshot is not a permanent profile. The same person may use different devices, networks, locations, and browsers over time.

### 7.2 Information status

Every result must use one of these statuses:

| Status | Meaning | Example language |
|---|---|---|
| **Visible** | Directly available to the website during the visit | "Your browser reports a mobile device." |
| **Estimated** | Calculated from available clues and not a direct fact | "This network may be a mobile connection." |
| **Permission required** | Available only after the person takes a deliberate action | "Exact location is not shared; you can choose to share it for this check." |
| **Variable by device or browser** | Availability or behavior changes by environment | "This capability may not be available on every device." |
| **Unavailable to websites** | The ordinary web experience cannot legitimately provide it | "A website cannot read your contacts or installed apps." |

### 7.3 Information categories

The first release should organize information into these categories:

1. **Device and platform** — broad device type, operating-system family, screen characteristics, touch support, and other clearly observable environment details.
2. **Browser and preferences** — browser family, language, time zone, online status, and visible capabilities.
3. **Internet connection** — public internet address, network organization, approximate region, likely connection type, and privacy-network likelihood.
4. **Connection experience** — responsiveness, rough connection quality, stability, and likely buffering risk, with clear measurement limitations.
5. **Permissions and capabilities** — whether location, camera, microphone, notifications, and storage functions are available, denied, unsupported, or permission-based. The product must not activate them without a user action.
6. **Privacy signals** — whether the connection is secure, what information could help distinguish a browser, and what storage or tracking-related capabilities are present.
7. **Unavailable information** — private device and account information that a website cannot legitimately access.

### 7.4 Shared understanding, different views

All views must use the same underlying meaning and status rules. The product may change the explanation, depth, and recommended action, but it must not change the underlying claim merely to suit an audience.

---

## 8. Product experiences

### 8.1 Personal Internet Mirror

**Purpose:** Give an ordinary visitor an immediate, reassuring, and useful summary.

The home experience should answer:

> “Here is what the internet can see about you right now.”

It should include:

- A one-screen summary of device, internet, approximate area, connection experience, and privacy posture.
- A visible distinction between direct information and estimates.
- Short explanations written in everyday language.
- A section explaining what the website cannot access.
- Optional deeper inspection.
- Clear controls for rerunning, deleting, and sharing.

The interface should not lead with technical values or frightening terminology.

### 8.2 Learn mode

**Purpose:** Help students and curious users understand why websites receive particular information.

Learn mode should provide:

- A plain-language explanation for each result.
- A short “why websites use this” explanation.
- A safe example of how the information could be used.
- A comparison between a basic visit and a visit with an optional permission.
- A clear distinction between a direct signal and a probabilistic guess.
- Optional experiments in which the user changes networks, browsers, or device conditions and checks what changes.

The experience should teach through observation rather than through unexplained scores.

### 8.3 Diagnostics view

**Purpose:** Help developers and IT professionals investigate a problem quickly.

It should provide:

- Grouped results by device, browser, network, connection, permissions, and privacy.
- Search and filtering.
- A summary of failures, missing information, and uncertainty.
- Copyable and downloadable reports.
- A record of when each observation was made.
- A clear list of what could not be measured and why.
- A concise recommended next step where one is justified.

The default presentation should remain readable; expert detail should be available on demand.

### 8.4 Advanced investigation view

**Purpose:** Let technically experienced users inspect the evidence behind a result.

It should provide:

- The individual observations behind each conclusion.
- Source, timing, confidence, and limitations.
- Cross-signal consistency and overlap.
- Differences between environments.
- A visible record of what was estimated rather than observed.
- A warning when a result is not reliable enough to support a conclusion.

This view must not imply access to information that the product does not have.

### 8.5 Environment comparison

**Purpose:** Help a person understand how two deliberate environments differ.

A comparison may show:

- Device and browser differences.
- Network organization and approximate region differences.
- Language and time-zone consistency.
- Screen and capability overlap.
- Connection experience changes.
- Signals that remain identical.
- Signals that could help distinguish the environments.

A comparison must be user initiated and must never claim that two environments belong to different people or that a person is anonymous or untraceable.

### 8.6 Organization workspace

**Purpose:** Help organizations turn environmental patterns into decisions.

The workspace should provide:

- A configurable observation profile describing what the organization wants to understand.
- Approved questions and segments.
- Aggregated results with sample size, time period, evidence, confidence, and limitations.
- Comparisons across customer groups, regions, devices, networks, or release periods.
- Reports that recommend an action without automatically taking a high-impact action.
- Customer-controlled access, sharing, retention, and deletion.
- A record of who viewed or exported an organization report.

---

## 9. Core user journeys

### 9.1 Everyday user journey

1. User opens 3eye and sees a short explanation of what will be checked.
2. User chooses to run a check.
3. The result opens with a summary and a calm privacy explanation.
4. User explores any category that interests them.
5. User sees both the available information and the information that websites cannot access.
6. User may choose an optional, clearly explained permission action.
7. User may rerun the check, save a report, share a redacted result, or delete the record.

### 9.2 Learner journey

1. User completes a check.
2. User selects “Explain this” on a result.
3. User sees a basic explanation, the evidence behind it, and its limitations.
4. User changes one condition, such as network or browser.
5. User reruns the check.
6. User compares the two snapshots and sees what changed and what remained consistent.

### 9.3 Developer or support journey

1. User runs or receives a diagnostic report.
2. User filters results by the affected environment.
3. User identifies missing, uncertain, or incompatible information.
4. User copies or downloads a report with timestamps and limitations.
5. User follows a recommended verification step.
6. User records whether the diagnosis resolved the issue.

### 9.4 Organization journey

1. Organization defines a business question and chooses an approved profile.
2. Organization confirms the purpose, permitted data, retention, and access rules with its users and administrators.
3. Organization receives an aggregated view of relevant customer environments.
4. Organization compares segments or time periods.
5. Organization reviews evidence, confidence, sample size, and limitations.
6. Organization chooses an action, records the decision, and monitors the result.
7. Organization can revise or delete the profile and associated data.

---

## 10. Functional requirements

### 10.1 Personal Mirror requirements

- **PM-01 — Clear introduction:** The first screen must state what the product checks, what it cannot check, and that the result is a snapshot rather than an identity.
- **PM-02 — One-click check:** A visitor must be able to complete the basic check without creating an account.
- **PM-03 — Summary first:** The result must open with a concise summary before detailed information.
- **PM-04 — Visible status:** Every result must show whether it is visible, estimated, permission-based, variable, or unavailable.
- **PM-05 — Explanation:** Every visible or estimated result must include a plain-language explanation and a “why it matters” note.
- **PM-06 — Unavailable list:** The product must explicitly explain common private information that websites cannot access.
- **PM-07 — No surprise permissions:** The product must not request location, camera, microphone, notifications, or other sensitive access without a clear user action.
- **PM-08 — Rerun:** The user must be able to rerun the check when conditions change.
- **PM-09 — Redacted sharing:** Any shareable result must hide sensitive details by default and require deliberate confirmation before revealing them.
- **PM-10 — Delete and control:** The user must be able to understand what is saved and request deletion of saved results.
- **PM-11 — Graceful limitations:** Missing or failed measurements must be shown as incomplete, not silently replaced with guesses.
- **PM-12 — Accessible use:** The basic experience must work on common phones, tablets, and laptops and remain understandable for users with different levels of technical knowledge.

### 10.2 Explanation and learning requirements

- **ED-01 — Three levels of explanation:** Each important result should offer a simple summary, a fuller explanation, and the evidence and limitations behind it.
- **ED-02 — Vocabulary support:** Technical terms must include a plain-language definition when they are necessary.
- **ED-03 — Honest uncertainty:** Estimated results must display confidence or a qualitative reliability label.
- **ED-04 — Use-case context:** Explanations should describe legitimate uses such as compatibility, performance, fraud prevention, and personalization without implying that every use is acceptable.
- **ED-05 — Safe experimentation:** Experiments must be optional, understandable, and designed not to collect more than the selected topic requires.

### 10.3 Comparison requirements

- **CP-01 — User initiated:** A comparison begins only when the user chooses to create one.
- **CP-02 — Same categories:** Both snapshots must use the same categories and comparable status definitions.
- **CP-03 — Change summary:** The comparison must clearly show changed, unchanged, unavailable, and newly available information.
- **CP-04 — Correlation language:** The product must use terms such as “overlap,” “similarity,” and “distinguishing signals,” not “identity” or “anonymity guarantees.”
- **CP-05 — No public history by default:** Snapshots must not become a public activity profile.

### 10.4 Organization requirements

- **OB-01 — Business-question setup:** An organization must be able to define the question it wants to answer before viewing results.
- **OB-02 — Approved profiles:** Organization users may select only approved information categories and collection settings.
- **OB-03 — Authorized association:** An organization may combine its own information with 3eye insights only for an approved purpose and with appropriate user notice and controls.
- **OB-04 — Aggregate-first business view:** Organization reports must prioritize groups and patterns rather than exposing individual environment histories.
- **OB-05 — Evidence panel:** Every segment insight must show sample size, time period, evidence, confidence, and limitations.
- **OB-06 — Action recommendations:** Recommendations must be framed as suggested next steps and must identify the evidence behind them.
- **OB-07 — Time comparison:** Organizations must be able to compare a launch, campaign, incident, or product change across relevant periods.
- **OB-08 — Custom questions:** Authorized organizations should be able to ask approved questions about their own customer environments without creating an unrelated product for every industry.
- **OB-09 — Access control:** Only approved organization members may view or export organization insights.
- **OB-10 — Isolation:** One organization must never see another organization's customer information or reports.
- **OB-11 — Retention and deletion:** Organizations must be able to set retention choices and request deletion of their data.
- **OB-12 — Auditability:** The organization must be able to see who accessed, exported, changed, or deleted a report.
- **OB-13 — Fair-use boundaries:** Organization plans must prohibit sensitive-attribute targeting, unlawful discrimination, and use of 3eye data for unrelated purposes.
- **OB-14 — Human oversight:** High-impact decisions must require an appropriate human review and must not be made from a single uncertain signal alone.

### 10.5 Reporting requirements

Every consumer or organization report must include:

- A title and purpose.
- Date and time of the observation.
- The scope of the check.
- The status of each result.
- A concise explanation of the result.
- Evidence or basis for derived and inferred results.
- Confidence or reliability language.
- Limitations and unavailable information.
- Recommended next steps where appropriate.
- Clear sharing and deletion controls.

A report must not contain a claim that cannot be traced to an observation, an approved estimate, or a clearly labelled prediction.

---

## 11. Organization use cases

### 11.1 Ecommerce and retail

**Questions:**

- Which customer environments have checkout problems?
- Which device or network groups experience degraded product pages?
- Which interested customers may not be able to use a promoted experience reliably?
- Which product improvements would have the greatest reach?
- Where should low-bandwidth or low-capability experiences be prioritized?

**Outputs:**

- Checkout and product-page issue segments.
- Experience compatibility segments.
- Product and content opportunities.
- Evidence-backed optimization recommendations.

**Boundary:** 3eye may provide evidence and segmentation. It must not automatically label a person as a buyer, exclude a person from an opportunity, or make an advertising decision based on sensitive or uncertain information.

### 11.2 Software services

**Questions:**

- Which environments experience slow dashboards or workflow failures?
- Which browser or device groups need compatibility attention?
- Which network conditions are associated with support issues?
- Which releases improve or worsen particular customer segments?

**Outputs:**

- Problem segments.
- Affected customer counts and confidence ranges.
- Before-and-after comparisons.
- Prioritized investigation areas.

### 11.3 Video and live streaming

**Questions:**

- Which environments can reliably support the advertised quality?
- Where is buffering concentrated?
- Which combinations of device, browser, and connection produce poor playback?
- Which quality recommendation is realistic for a customer segment?

**Outputs:**

- Experience-quality segments.
- Buffering and stability patterns.
- Quality recommendations by environment.
- Evidence for content or delivery improvements.

### 11.4 Gaming and interactive experiences

**Questions:**

- Where are response delays and connection instability concentrated?
- Which environments experience connection failures?
- Which device or browser combinations create compatibility problems?
- Which experiences should be adjusted for a particular segment?

**Outputs:**

- Stability and responsiveness patterns.
- Failure segments.
- Compatibility findings.
- Prioritized testing and improvement areas.

### 11.5 Marketing and communications

**Questions:**

- Which broad environment groups are most relevant to a campaign?
- Which proposed experiences are likely to be usable by a segment?
- Where might a message create an unrealistic expectation?
- How do environmental patterns differ by region or season?

**Outputs:**

- Aggregate reach and suitability views.
- Context for message and offer design.
- Warnings about privacy, fairness, and unsupported inference.

**Boundary:** The product is not designed to target sensitive personal characteristics or to enable covert cross-site tracking.

### 11.6 Future industry profiles

Additional profiles may be developed for education, financial services, customer support, and other industries only after a clear decision, permitted data set, and responsible-use review are defined.

---

## 12. Privacy, safety, and trust requirements

These are mandatory product requirements:

- **PR-01 — Notice before collection:** Tell people what will be checked before a check begins.
- **PR-02 — Explicit permission:** Ask for sensitive access only in response to a clear user action and explain the purpose.
- **PR-03 — Data minimization:** Collect only information tied to a stated purpose.
- **PR-04 — No hidden collection:** Do not collect signals solely because they are available.
- **PR-05 — Clear provenance:** Preserve whether each result is visible, estimated, permission-based, variable, or unavailable.
- **PR-06 — Retention transparency:** Show what is retained, for how long, and how to delete it.
- **PR-07 — User deletion:** Provide a straightforward deletion path for personal results.
- **PR-08 — Customer control:** Let organizations choose permitted purposes, categories, retention, and access.
- **PR-09 — Aggregation thresholds:** Hide small groups and avoid reports that could identify an individual.
- **PR-10 — Fairness review:** Review recommendations for exclusion, sensitive-attribute use, and unequal impact.
- **PR-11 — Separation of duties:** Separate people who approve a data purpose from people who use the resulting reports where the organization's risk level requires it.
- **PR-12 — No identity claims:** Never describe environmental overlap as proof of identity, anonymity, or untraceability.
- **PR-13 — No secret use:** Do not use a person's environment for a purpose they were not informed about.
- **PR-14 — Safety review:** Review dual-use features before release and restrict uses that could enable harm.

The product must be designed to answer:

> “What environment is interacting with this service?”

It must not be designed to answer:

> “How can we secretly learn everything about this person?”

---

## 13. Prohibited uses and abuse prevention

The product, customer workspace, and reports must not be used for:

- Identifying or tracking people without authorization.
- Revealing a person's identity, contacts, private files, accounts, or device data.
- Stalking, intimidation, doxxing, or deanonymization.
- Credential theft or unauthorized access.
- Fraud, spam, evasion, or bypassing controls.
- Creating hidden advertising profiles from uncertain signals.
- Discriminating against people or groups.
- Selling or redistributing personal information.
- Making a high-impact decision solely from an estimate or a single environmental signal.

Suspicious activity, abuse, or attempted misuse must be reviewable and actionable by the responsible organization.

---

## 14. MVP definition

### 14.1 MVP name

**Personal Internet Mirror — Public MVP**

### 14.2 MVP objective

Answer one question clearly and safely:

> **If I visit an ordinary website right now, what can it learn about me without asking me for anything?**

### 14.3 MVP in scope

The public MVP must provide:

1. A clear introduction and consent notice.
2. A check that works without requiring an account.
3. A summary of:
   - Broad device and platform information.
   - Browser family and language.
   - Time zone.
   - Screen characteristics.
   - Public internet address, masked in the default view.
   - Network organization and approximate region.
   - Likely connection type, clearly labelled as an estimate.
   - Secure-connection status.
   - Basic connection responsiveness and stability, with limitations.
   - Availability and status of common permissions and capabilities.
   - A simple summary of signals that could help distinguish a browser.
4. A separate list of information that websites cannot access.
5. Plain-language explanations for every displayed result.
6. Visible status, source, timestamp, and reliability information.
7. A rerun action.
8. A redacted share action.
9. A delete/control action.
10. A mobile-friendly, accessible basic experience.

### 14.4 MVP explicitly out of scope

The public MVP will not:

- Request exact location by default.
- Activate or test the camera, microphone, or notifications without a separate user action.
- Reveal SIM numbers, SIM operators, contacts, installed apps, photos, files, passwords, or Wi-Fi credentials.
- Claim a unique browser identity.
- Claim certainty about VPN, proxy, Tor, exact location, or network type when the evidence is incomplete.
- Publish a public history or permanent public report by default.
- Build organization dashboards or connect customer records.
- Make personalized advertising or high-impact recommendations.
- Show an unexplained overall privacy, anonymity, or trust score.

### 14.5 MVP validation questions

The MVP is successful only if users can answer the following correctly after one visit:

- What can the website see automatically?
- Which details are estimates?
- What would require permission?
- What cannot the website access?
- Why should I trust or question this result?

### 14.6 MVP exit criteria

Proceed to the next release only when:

- Every displayed result has a status, explanation, source, and timestamp.
- No unavailable private data is represented as obtainable.
- No sensitive permission is requested without a deliberate user action.
- Usability testing demonstrates that first-time users understand the basic summary.
- False-claim and correction reviews show no unresolved material trust issues.
- The product works across the agreed common device and connection environments.
- Users can delete or redact their information without assistance.

---

## 15. Limited organization pilot

After the public MVP demonstrates comprehension and trust, run a closed pilot with a small number of design partners.

### 15.1 Pilot scope

The pilot may support one or two initial profiles, such as:

- Ecommerce experience.
- Software-service compatibility and performance.
- Streaming quality.
- Gaming connection experience.

The first pilot should focus on one decision per organization rather than a complete intelligence product.

### 15.2 Pilot in scope

- Organization-specific question setup.
- Approved environment categories.
- Aggregate segment reports.
- Authorized association with the organization's own customer information.
- Before-and-after comparisons for a product launch, campaign, incident, or release.
- Evidence, confidence, sample size, and limitations.
- Organization-controlled access, export, retention, and deletion.
- Human-reviewed recommendations.

### 15.3 Pilot out of scope

- Individual-level surveillance.
- Automatic advertising decisions.
- Sensitive-attribute profiling.
- Cross-organization benchmarking without permission.
- Guaranteed business outcomes.
- Arbitrary unrestricted questions about individuals.
- A general-purpose replacement for customer analytics.

### 15.4 Pilot success criteria

An organization should be able to identify at least one concrete, evidence-backed opportunity or risk and agree on a next action. Success is not measured by the amount of data collected.

---

## 16. Release plan

### Phase 0 — Validate the problem

**Outcome:** Confirm which questions matter to individuals and organizations.

Deliverables:

- Clear problem interviews.
- Capability and limitation inventory in plain language.
- Consumer comprehension tests.
- Initial organization use-case selection.
- Privacy, safety, and responsible-use review.

Exit criteria: A prioritized set of valuable questions with evidence that users understand and trust the proposed answers.

### Phase 1 — Personal Internet Mirror

**Outcome:** Deliver the public MVP.

Exit criteria: All MVP acceptance and exit criteria are met.

### Phase 2 — Learn and compare

**Outcome:** Help curious users understand changes between deliberate checks.

Features:

- Guided explanations.
- Safe experiments.
- User-created comparisons.
- Redacted history controlled by the user.
- Improved educational content.

Exit criteria: Users can explain what changed, what remained consistent, and why.

### Phase 3 — Organization pilot

**Outcome:** Prove value for a small number of clearly defined organization decisions.

Features:

- Approved profiles.
- Aggregate reports.
- Authorized first-party data association.
- Time-period comparisons.
- Organization controls and audit records.

Exit criteria: Each pilot organization identifies an accepted action or a documented reason not to act.

### Phase 4 — Industry profiles

**Outcome:** Support repeatable decisions across selected industries.

Features:

- Ecommerce, software, streaming, and gaming profiles.
- Configurable questions and segments.
- Alerts for important changes.
- Reusable report formats.

Exit criteria: Profiles produce useful decisions without creating unnecessary collection or targeting.

### Phase 5 — Self-service scale

**Outcome:** Allow approved organizations to configure, analyze, and act without custom work for every use case.

Features:

- Self-service organization workspaces.
- Flexible approved questions.
- Scheduled reporting.
- Greater historical and aggregate analysis.
- Broader geographic and language coverage.

Exit criteria: Organizations can operate independently while retaining control, trust, and data boundaries.

### Phase 6 — Responsible advanced intelligence

**Outcome:** Provide deeper explanations and controlled experimentation.

Features:

- Pattern discovery.
- Before-and-after experiments.
- Root-cause suggestions.
- Natural-language business questions.
- Evidence-backed predictions clearly separated from observations.

Exit criteria: Advanced conclusions are explainable, uncertainty is visible, and human review remains appropriate for consequential actions.

---

## 17. Success measures

The following are proposed initial targets. They should be validated during the first pilot and adjusted based on evidence.

### 17.1 Consumer measures

| Measure | Initial target | Why it matters |
|---|---:|---|
| Check completion | At least 85% of started checks reach a result | The core promise is fast and understandable |
| First-result time | Under 60 seconds for most users | People should get value without a long wait |
| Basic comprehension | At least 80% of tested users can identify one visible item and one inaccessible item after viewing the result | The product must teach, not merely display |
| Explanation engagement | At least 35% of users open at least one explanation | Explanations should be discoverable and useful |
| Redacted sharing | 100% of default shares hide the full public internet address | Sharing must be safe by default |
| Result completeness | 100% of displayed items include status, explanation, source, and time | Truth and provenance are mandatory |
| Deletion success | At least 95% of deletion requests complete without support | User control must work |

### 17.2 Organization pilot measures

| Measure | Initial target | Why it matters |
|---|---:|---|
| Time to first useful insight | Within one working day of approved setup | 3eye must create value quickly |
| Reports leading to an accepted action | At least 50% of pilot reports | Insights must be actionable |
| Reports with complete evidence | 100% | Business decisions require context |
| Small-group protection | 100% of reports below the agreed privacy threshold are hidden or aggregated | Individual safety is non-negotiable |
| Cross-organization access incidents | Zero confirmed incidents | Customer separation is mandatory |
| Deletion and access requests | Completed within the published customer commitment | Organizations need dependable control |

### 17.3 Trust and safety measures

- Number and severity of incorrect or overconfident claims.
- Number of complaints about unexpected permission requests.
- Number of data-access or sharing incidents.
- Percentage of users who can explain the difference between an estimate and a fact.
- Organization reviews completed for fairness, purpose, and retention.
- Prohibited-use reports and resolution time.

### 17.4 Long-term measures

- Repeat use by people who find the explanation valuable.
- Percentage of organization reports that lead to measured improvement.
- Reduction in identified compatibility, buffering, latency, or failure segments.
- Customer willingness to trust 3eye with an approved, limited observation profile.
- Cost and operational burden relative to the value created.
- Coverage across regions, languages, devices, and connection conditions.

---

## 18. Acceptance criteria for a release

A release is not complete until it passes the following checks:

### Consumer experience

- A new visitor understands the purpose before starting.
- The basic result is understandable without prior technical knowledge.
- Every claim is labelled by status and reliability.
- Every unavailable category is stated accurately.
- Optional permissions are clearly explained and user initiated.
- Results can be refreshed, redacted, shared, and deleted.
- The experience remains usable on common mobile and desktop environments.
- The product does not present correlation as identity.

### Organization experience

- Every organization has a named purpose for its profile.
- Only approved categories and purposes are available.
- Reports include sample size, time period, evidence, confidence, and limitations.
- Small groups are protected.
- Organization administrators can control access, retention, export, and deletion.
- Recommendations are advisory and reviewable.
- One organization cannot access another organization's information.

### Trust and safety

- No secret access to private device information.
- No unsupported claims of exact location, identity, anonymity, or provider.
- No automatic high-impact decision based on a single uncertain result.
- No use outside the stated purpose.
- All identified issues have an owner, severity, and resolution path.

---

## 19. Open questions and decisions required

1. Which countries and languages should the first public release support?
2. Should the MVP include any optional, user-initiated location test?
3. What retention period is appropriate for each result type and organization profile?
4. Which environment categories are necessary for the first organization pilot?
5. Which organization questions can be answered responsibly with aggregated information?
6. Should the product provide an overall exposure summary, or only explain individual results?
7. If a summary score is offered, what methodology, evidence, and limitations will be shown?
8. How much information should be retained for comparison, and who controls it?
9. What customer actions are allowed for high-value, low-confidence segments?
10. Which privacy, legal, and fairness reviews are required before launch?
11. What pricing and packaging support a free consumer product and paid organization use?
12. How will corrections to estimates and environment classifications be communicated to affected users and customers?

---

## 20. Glossary in plain language

**Environment snapshot:** A picture of the conditions surrounding one visit or session.

**Public internet address:** The address that identifies a connection when it communicates with a website.

**Approximate region:** A broad location estimate based on limited clues. It is not an exact address.

**Estimate:** A conclusion calculated from available clues, not a directly reported fact.

**Permission-based:** Information that is shared only after a person deliberately allows it.

**Unavailable to websites:** Information that an ordinary website cannot legitimately access.

**Environment segment:** A group of visits or customers with a meaningful shared pattern.

**Distinguishing signal:** A detail that may help tell one browser or environment apart from another. It does not prove a person's identity.

**Correlation:** A relationship between observations. It does not prove that one observation caused another.

**Environment Intelligence:** Turning authorized environmental patterns into understandable business decisions.

---

## 21. Final product statement

3eye is not a secret surveillance system and not a promise of complete anonymity.

It is a transparent mirror and decision-support product that helps people understand their internet-facing environment and helps organizations respond to the real conditions in which their products are used.

The product is successful when it is:

- **Truthful** about what it knows and does not know.
- **Understandable** to people with different levels of knowledge.
- **Controllable** by the people and organizations involved.
- **Useful** for real decisions rather than impressive-looking data.
- **Safe** against misuse and uncertainty.
- **Honest** about correlation, inference, limitations, and scale.
