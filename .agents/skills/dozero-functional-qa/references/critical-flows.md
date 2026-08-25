# Fluxos críticos do DOZERO

Select the smallest flow intersecting the change.

## Startup and navigation

- Landing/app loads without uncaught console errors.
- Main toolbar, widget hub, command palette and modal close paths work.
- Keyboard focus is visible and Escape closes the active dismissible layer.

## Auth and campaigns

- Login/logout and restored session state.
- Create/select campaign, invite/join path and correct master/player controls.
- Offline or Supabase error presents a recoverable message.

## Tabletop

- Scene loads, map pans/zooms and token selection/drag completes.
- Fog, measurement or drawing change reaches the shared store.
- Mobile viewport retains access to essential controls.

## Wiki and worldbuilding

- Search opens an article; typed filters and sorting change results.
- Connection editor saves a relation; graph filters and shortest path work.
- Private relations remain hidden from unauthorized views.

## Chronos

- Advancing across the last day of a variable-length month reaches the next month.
- Calendar preset/custom configuration clamps invalid dates.
- Creating/removing an event updates the visible timeline/calendar state.

## Audio and live collaboration

- Audio controls communicate playing/muted/stopped state.
- Voice/screen-share permissions fail safely when denied.
- Remote-sync features are tested with at least two clients when the change depends on real concurrency.

