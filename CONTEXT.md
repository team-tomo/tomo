# Tomo

Invite-only product for people working together in Tomo. Login is not the person; the Profile is.

## Language

**User**:
The login record in auth (email and password). Auth only — not referenced by product tables.
_Avoid_: Account, person, member

**Profile**:
The person in Tomo. One Profile per User, same id. It exists from signup, possibly incomplete. Every product record that belongs to a person points at a Profile, not a User. Profiles are never deleted.
_Avoid_: User, account, member

**Active**:
A Profile still belongs in Tomo. Inactive means they left Tomo; the Profile stays and can be reactivated without a new Invitation Code. This is not team membership and not onboarding.
_Avoid_: Deleted, onboarded, team member

**Onboarding**:
A single form that fills the human fields of an existing Profile after signup, and may include choosing their Manager. Manager may be skipped if no eligible Profile exists yet and filled in later. Not the moment the Profile is created, and not a sequence of steps.
_Avoid_: Registration, signup (that is creating the User and the Profile row), onboarding step

**Onboarding Status**:
Whether that form has been submitted. Pending until they submit; then complete.
_Avoid_: Onboarding step

**Username**:
The unique directory handle (`@name`), unique ignoring case. Optional until onboarding fills it. Distinct from full name and job title.
_Avoid_: Alias, handle, nickname

**Role**:
The person's career band, stamped by the Invitation Code onto the Profile at signup. Not who manages this person. Values: Dev (platform builder), Executive (C8 and up), Lead (C9), IC (CL13–CL10), Support (platform/admin work, any career level). Not chosen by the person.
_Avoid_: Manager (that is who they report to), permission, title (that is job title), career level (Tomo stores Role, not the CL number)

**Invitation Code**:
A shareable one-time door key that grants signup with a Role. Sent privately by management or leads; not bound to an email. It is active until redeemed (used) or revoked.
_Avoid_: Invite, invitation (ambiguous), access code

**Invitation Redemption**:
The claim that a Profile used a specific Invitation Code. One code, one redemption; one Profile, one redemption.
_Avoid_: Use, claim (as the record name)

**Manager**:
The one Profile this person reports to. Must be an active Lead or Executive, and not themselves. May be empty after Onboarding; the person may set it while it is empty, and cannot change it once set. Dev, Executive, or Support change another Profile’s Manager from Manage Accounts. Required to file a Leave Request. Distinct from Role.
_Avoid_: Lead (that is a Role), supervisor, boss, reporting line, team lead

**Manage Accounts**:
The admin surface for Dev, Executive, and Support to operate on other Profiles, including changing a Profile’s Manager.
_Avoid_: User admin, people admin

**Workday**:
Nine hours. Leave duration is in Workdays: a full day is 1, a half-day is 0.5 (4.5 hours). This is not timesheet clock-in.
_Avoid_: Shift, business day, working day (that is the calendar date)

**Leave Type**:
The kind of Leave Request. Values: VL (vacation), SL (sick), EL (emergency), ML (maternity), PL (paternity).
_Avoid_: PTO, leave category, time-off type

**Leave Request**:
A Profile asking to be away on one date, with a Leave Type, marked as a whole Workday or a half-day, until it is decided. Three days away is three Leave Requests. Filing is blocked unless the Profile has an active Manager, and blocked if another pending or approved request already exists on that date (rejected and cancelled do not count). Status is pending until the Manager approves or rejects, or the filer cancels; no edits — cancel and file again. That Manager decides it while they are active. If they become inactive while a request is pending, any other Manager (Lead or Executive, not the filer) may decide it; the first decision wins. If Manage Accounts assigns a new Manager, pending requests move to that person. Leave does not affect timesheet clock-in in this pass. Half-day does not record morning vs afternoon; it is 0.5 Workday only.
_Avoid_: PTO, time-off, leave (the request is the thing)

**Momo**:
The personal assistant the person talks to in chat. Delegates live attendance questions to Toki. Not the time keeper.
_Avoid_: Toki (that is the time specialist), chatbot, copilot, Hari (retired)

**Toki**:
The time specialist behind Momo. Handles this Profile's attendance. The person does not talk to Toki directly.
_Avoid_: Hari (retired), Momo (that is the assistant), timesheet agent (that is the module)
