# Technica LMS — reference-platform portfolio workflow alignment
Date: 22 November 2026

## Reference interpretation
The nine screenshots supplied by the owner show a City & Guilds Learning Assistant / SHEilds portfolio for ProQual RPL Level 6 Diploma in OHSP, reference 603/3106/9. They are **functional UX references**, not files to import or user identities to copy.

The reference flow is:
- **Programme / Unit**: Unit intro, Outcome navigation, Activity status, Gap Analysis linking each official Assessment Criterion.
- **Evidence Folder**: source-filtered evidence with stable reference, title, type, upload date, usage mapping, evidence wizard and downloadable showcase.
- **Registration**: learner record with Personal, Professional, Certificate, General and Funding groups plus an enrolment declaration.
- **Contact**: dated contact diary separate from actual graded review feedback.
- **Metrics**: date, description, OJT / Off-job training minutes; progress bar across started, completed, expected plus Assessor / Verifier and start/end.

This reference is an **enrolled** Portfolio. A source-only Qualifications preview in Technica must remain distinct and read-only until centre release and an actual learner enrolment. The same UX applies across current OTHM and ProQual programme editions, each tied to its own exact Unit/Outcome/Criteria records.

## Implemented (live backend, Technica UI, no copied branding)
1. **Course** is the initial Portfolio tab; "Overview" remains optional. Unit selector, previous/next controls, Unit activity and outcomes, Gap Analysis, official criteria and source material all remain.
2. **Programme status ribbon** on every tab, computed from live outcome states, dates and assigned reviewer names. Expected % is elapsed programme timeline, not achieved assessment credit.
3. **Evidence** has search, evidence-type filter, sorting and source ID prefix. File upload/written evidence, evidence-to-criteria mapping, showcase export and review decisions are unchanged. Reviewers see only evidence disclosed in their authorised submitted snapshots, not private learner drafts.
4. **Registration** includes learner-only, private saved form with the five reference sections plus the existing official declaration and issued-certificate controls. Only relevant low-sensitivity contact, professional, awarding-body registration and funding fields are stored. DOB, UK NI number, home address, personal identity images are **not** collected in this phase; these require documented need, purpose, security and retention.
5. **Contact** has persistent role-scoped programme messages/meeting notes plus assessor/verifier feedback history. It does **not** send an email, create notification or export externally.
6. **Metrics** tracks true evidence and submitted decisions, per-unit outcome completion and an append-only learner-reported OJT/Off-job diary. Learner-entered hours are **not** automatically verified, graded, or claimed as official funding/CPD credit.
7. Responsive CSS uses Technica's existing premium navy/blue surface and cards; reference-site logos and colours are not copied.

## Production migrations
- `202611220009_qualification_contact_diary.sql`
- `202611220010_qualification_candidate_registration.sql`
- `202611220011_qualification_training_metrics.sql`

These were applied to the Technica production Supabase project `klmwiivitgbyjbynxwbg` and verified for RLS enabled, no direct anonymous/authenticated table grants and no anonymous function execution. They do not create real enrolments, approve competence, or issue certificates.

## Permissions
| Action | Learner | Assigned Assessor | Assigned Verifier | Centre Admin |
|---|---|---|---|---|
| Read submitted evidence | Self | Submitted snapshots only | Submitted snapshots only | Existing governed access |
| Edit own candidate profile | Yes (before completion) | No | No | No through learner form |
| Read candidate profile | Self | No | No | Yes, authorised centre admin RPC |
| Read/write Contact Diary | Yes | Yes | Yes | Not unless assigned |
| Add OJT/Off-job entry | Yes | No | No | No |
| View recorded training entries | Yes | Yes | Yes | Not unless assigned |
| Approve Unit brief / release programme | No | No | No | Yes, controlled separately |
| Grade/verify submissions | No | Submitted-only authorised stages | Authorised verification stages | Not via admin role alone |

## Follow-up acceptance testing
- CI build + static routing/security regression must pass.
- Run end-to-end with **real authorised test accounts, but no fake accreditation approval**: learner registers, logs OJT time, adds evidence, maps criteria, submits; assigned assessor reviews; verifier verifies; learner and reviewer exchange Contact Diary notes; unauthorised user cannot view another enrolment.
- When the centre confirms its retention and data requirements, decide whether to implement additional sensitive registration fields and file-level approval workflows.
- Enhancements still outside this first implementation: Evidence Duplication Wizard, verified OJT hour sign-off, contact notifications / calendar, separate identity-document upload and centre-managed registration form corrections.

## Source integrity
Never copy names, contact details, photos, dates or actual evidence from the reference screenshots into the production LMS. The ProQual qualification content already in Technica comes from its separately imported source specifications.
