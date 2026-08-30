============================================================
FILE: agents/skills/frontend-conventions/SKILL.md
============================================================

---
name: frontend-conventions
description: >
  Frontend coding conventions for this React and TypeScript application.
  Apply when creating, editing, refactoring, or reviewing frontend pages,
  components, hooks, services, utilities, types, styling, or tests.
---

# Frontend Conventions

Follow these conventions whenever working on frontend code.

The goal is to keep the frontend simple, consistent, strongly typed,
maintainable, reusable, and easy to scale.

---

## 1. General Principles

- Write simple, readable, maintainable code.
- Prefer clarity over cleverness.
- Avoid duplication.
- Avoid over-engineering.
- Prefer generic and reusable solutions when they provide real value.
- Follow the existing frontend architecture and naming conventions.
- Preserve existing working behavior unless the task requires changing it.
- Make the smallest coherent change required to implement the task.
- Do not rewrite unrelated code.
- Do not add unnecessary dependencies.

Before creating something new, check whether an appropriate:

- component
- hook
- service
- type
- utility
- constant
- helper

already exists.

Reuse existing implementations when appropriate.

Do not create abstractions simply because they might theoretically
be useful in the future.

---

## 2. User-Facing Strings

Never hardcode user-facing strings directly inside:

- React components
- pages
- hooks
- services
- business logic

User-facing strings include:

- titles
- headings
- labels
- button text
- navigation labels
- placeholders
- empty states
- error messages
- success messages
- status labels
- tooltips
- modal text
- notification text
- descriptive UI text

Store user-facing strings in dedicated `strings.ts` files.

### Prefer feature-local strings

For example:

src/
  features/
    assignments/
      strings.ts

or the equivalent location in the project's existing architecture.

Shared strings may live in a shared location:

src/
  shared/
    strings/
      common.ts
      navigation.ts

Do not create one enormous global `strings.ts` file.

Keep strings close to the feature that owns them.

### Prefer organized objects

Example:

```ts
export const assignmentStrings = {
  title: "משימות",
  markComplete: "סימון כהושלם",
  details: "לפרטים",
  empty: "אין משימות",
} as const;
```

Use:

```tsx
<Button>{assignmentStrings.markComplete}</Button>
```

Do not use:

```tsx
<Button>סימון כהושלם</Button>
```

Technical/internal values that are never displayed to the user do not
need to be placed in `strings.ts`.

Do not move arbitrary technical strings, API paths, property names,
or identifiers into user-facing string files.

---

## 3. TypeScript

Use TypeScript strictly and intentionally.

- Avoid `any`.
- Use `any` only when there is no reasonable typed alternative.
- Never introduce `any` merely to silence a TypeScript error.
- Prefer existing domain types over creating duplicate types.
- Search for an existing compatible type before creating a new one.
- Keep component props strongly typed.
- Keep hook inputs and outputs typed.
- Keep service/API inputs and outputs typed.
- Prefer explicit domain models for domain data.
- Use unions or constants for finite repeated values when appropriate.
- Avoid unnecessary type assertions.
- Avoid non-null assertions when a safer solution is reasonable.
- Remove unused types and imports.

Do not create multiple nearly identical interfaces representing the
same domain concept.

Keep API/domain types separate from UI-only state when that distinction
is meaningful.

Do not weaken type safety just to make TypeScript errors disappear.

---

## 4. React Components

Keep React components focused and maintainable.

- Avoid large monolithic components.
- Prefer components with a clear responsibility.
- Extract components when a meaningful reusable concept exists.
- Extract components when doing so significantly improves readability.
- Do not fragment simple components into unnecessary tiny files.
- Prefer composition over large components with many unrelated branches.
- Keep feature-specific components close to their feature when appropriate.
- Avoid unnecessary state.
- Avoid storing values in state when they can be derived from existing state
  or props.
- Do not place large mock datasets inside components.

Before creating a reusable component, check whether an equivalent or
similar component already exists.

---

## 5. Reusability and Generic Code

Prefer reusable implementations when multiple parts of the application
share the same concept or behavior.

Good candidates include:

- cards
- status badges
- empty states
- loading states
- error states
- section headers
- form patterns
- filters
- formatting utilities
- common layouts
- repeated actions

Prefer data-driven rendering over repeated JSX.

Prefer:

```tsx
{items.map((item) => (
  <ItemCard key={item.id} item={item} />
))}
```

over manually repeating equivalent markup.

However, do not generalize prematurely.

A reusable abstraction should do at least one of the following:

- reduce meaningful duplication
- improve readability
- centralize meaningful shared behavior
- represent a genuine shared domain/UI concept

Do not build a generic abstraction solely because it may become useful later.

---

## 6. Mantine-First UI

Mantine Core is the primary and default UI component library.

Use Mantine components whenever Mantine provides an appropriate abstraction.

Prefer Mantine components such as:

- Button
- ActionIcon
- UnstyledButton
- Text
- Title
- Card
- Paper
- Badge
- Avatar
- Alert
- Progress
- Modal
- Tooltip
- Divider
- Skeleton

For layout, prefer:

- Stack
- Group
- Flex
- Grid
- SimpleGrid
- Box
- Container

For forms, prefer Mantine's appropriate:

- TextInput
- Textarea
- Select
- MultiSelect
- Checkbox
- Radio
- Switch
- NumberInput
- Date/time components when already available in the project

Avoid building UI primarily from raw HTML elements and custom CSS when
Mantine already provides a clean appropriate abstraction.

For example, prefer Mantine `Button` over a manually styled `<button>`.

However, raw HTML is NOT forbidden.

Use semantic HTML when it provides meaningful structure or accessibility.

Examples include:

- main
- nav
- section
- article
- header
- footer

Do not sacrifice semantic HTML or accessibility merely to avoid raw HTML.

Do not introduce another UI component library unless explicitly requested.

Do not mix Mantine with another UI library simply to implement a component
that Mantine can already provide.

---

## 7. Styling

Prefer Mantine's theme system and component props for:

- spacing
- colors
- typography
- border radius
- shadows
- responsive behavior
- layout

Avoid custom CSS when Mantine can express the requirement cleanly.

Custom CSS is acceptable when:

- Mantine does not support the requirement cleanly
- the styling is application-specific
- CSS provides a significantly clearer implementation
- advanced visual behavior requires it

Avoid arbitrary repeated styling values.

Prefer:

- existing theme tokens
- shared theme configuration
- existing project styling conventions

Do not introduce a second styling system without a clear reason.

Preserve the application's existing visual language unless the task
explicitly requests a redesign.

---

## 8. Responsive Design

New frontend UI should work reasonably across supported screen sizes.

When implementing responsive behavior:

- Prefer Mantine responsive props and breakpoints.
- Avoid unnecessary fixed widths.
- Avoid layouts that depend on one specific screen size.
- Check that content does not overflow unexpectedly.
- Keep touch targets usable on smaller screens.
- Preserve readability on mobile layouts.

Do not create separate duplicated desktop and mobile components when a
single responsive implementation is sufficient.

---

## 9. Business Logic

Keep presentation and business logic appropriately separated.

Presentational components should not contain unnecessary business logic.

When appropriate, prefer a flow such as:

UI
↓
hook / feature logic
↓
service
↓
API

Reusable presentational components should not know unnecessary API details.

Complex state transitions, transformations, and reusable business behavior
should generally live outside purely presentational components.

Do not extract trivial logic into hooks merely to follow a pattern.

Use separation when it improves readability, reuse, or testability.

---

## 10. API Communication

Keep API communication centralized and reusable.

Do not scatter raw API requests throughout UI components.

Prefer the project's existing service/API layer.

Before creating a new service, check whether an appropriate service already
exists.

Keep request and response types explicit.

Prefer:

Component
↓
Hook / feature logic
↓
Service
↓
API

when the complexity justifies the layers.

Do not duplicate the same API request implementation across components.

Do not silently replace real backend integration with mock data.

---

## 11. Mock Data

Do not place large hardcoded mock datasets directly inside components.

If mock data is required, keep it in the project's dedicated mock/data layer.

Mock data should use the same domain types expected by the real application
whenever practical.

Keep the distinction between mock data and production data clear.

When implementing a real backend integration, do not leave obsolete mock
implementations active unless they still have an intentional purpose.

---

## 12. Hooks

Use custom hooks for reusable stateful behavior or meaningful feature logic.

Good hook candidates include:

- reusable data fetching behavior
- shared UI state
- reusable business behavior
- complex state transitions

Do not create a custom hook merely to wrap one trivial line of code.

Hooks should have clear responsibilities and strongly typed inputs/outputs.

Reuse existing hooks before creating similar ones.

---

## 13. Constants

Avoid unexplained magic values when they represent meaningful reusable
configuration or domain concepts.

Use appropriately named constants when doing so improves clarity.

Do not move every primitive value into a constants file.

Keep feature-specific constants close to their feature.

Shared constants should only be shared when genuinely used across features.

---

## 14. Project Structure

Respect the existing frontend architecture.

- Keep feature-specific code close to the feature that owns it.
- Put genuinely shared code in shared locations.
- Do not move code into shared folders merely because it might be reused later.
- Reuse existing modules instead of creating duplicates.
- Respect existing path aliases.
- Do not introduce new folder structures without a clear architectural reason.
- Do not introduce new path aliases without updating configuration consistently.

Prefer locality until code is genuinely shared.

---

## 15. Imports

Keep imports clean and consistent.

- Remove unused imports.
- Reuse existing modules.
- Follow existing import conventions.
- Prefer configured project aliases when appropriate.
- Avoid circular dependencies.
- Do not import internal implementation details across features when a
  suitable public/shared abstraction exists.

Do not create duplicate helper modules just to avoid importing an existing one.

---

## 16. Accessibility and Semantics

Do not ignore accessibility.

When implementing interactive UI:

- Use the appropriate interactive element/component.
- Ensure buttons are actually actionable controls.
- Provide accessible labels where visual context is insufficient.
- Preserve keyboard usability.
- Do not rely only on color to communicate important state.
- Use semantic structure where appropriate.

Mantine is the primary UI library, but using Mantine does not replace the
need to think about semantics and accessibility.

---

## 17. Dependencies

Do not add a new frontend dependency unless it provides clear value and the
existing stack cannot reasonably solve the requirement.

Before adding a dependency:

1. Check whether the project already contains a solution.
2. Check whether Mantine provides the functionality.
3. Check whether an existing utility can solve it.
4. Consider whether a small implementation is simpler than another dependency.

Never introduce another UI library without explicit approval.

---

## 18. Biome

Biome is the formatter and linter for the project.

After modifying frontend code, ALWAYS run Biome.

Prefer the repository's existing Biome/package script.

For example, if the project defines:

```bash
npm run lint
```

or:

```bash
npm run biome
```

use the configured project command.

If Biome is configured but no appropriate script exists, use the appropriate
Biome command, for example:

```bash
npx biome check --write .
```

Run Biome from the appropriate project/workspace directory.

Do not introduce:

- ESLint
- Prettier
- another formatter
- another linter

when Biome already handles those responsibilities.

Fix Biome errors introduced by the changes before completing the task.

Do not change Biome configuration merely to suppress legitimate errors unless
explicitly requested.

---

## 19. Validation

Before considering a frontend coding task complete:

1. Run Biome.
2. Run the relevant TypeScript type check.
3. Run relevant automated tests if they exist.
4. Run/build the frontend when practical.
5. Fix errors introduced by the changes.
6. Remove unused code and imports.
7. Verify user-facing strings are not unnecessarily hardcoded.
8. Verify existing types/components/hooks/services were reused when appropriate.
9. Verify the implementation follows the existing architecture.
10. Verify the requested behavior actually works.

Do not claim a command passed unless it was actually executed successfully.

If a validation command cannot be run, explicitly state that it was not run
and why.

---

## 20. Scope Discipline

Stay focused on the requested task.

Do not:

- redesign unrelated screens
- rewrite unrelated modules
- change architecture unnecessarily
- add speculative features
- introduce speculative abstractions
- add unnecessary dependencies
- perform unrelated cleanup across the entire repository

If you notice an unrelated improvement, mention it rather than silently
expanding the task.

Small cleanup directly related to modified code is acceptable.

---

## 21. Completion Report

At the end of a frontend coding task, briefly report:

- what changed
- important implementation or architectural decisions
- which validation commands were actually run
- whether Biome passed
- whether TypeScript passed
- whether tests/build passed when applicable
- whether any relevant warnings or issues remain

Keep the completion report concise.