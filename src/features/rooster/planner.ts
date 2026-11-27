import type { DragEvent } from "react";
import type { NeededInput, RosterShift, RosterShiftInput, Volunteer } from "../../types/dashboard";
import type { Lane } from "./roster";

/** What is being dragged: someone from the list of available people, or a planned shift. */
export type Drag = { kind: "person"; name: string } | { kind: "shift"; id: string };

export interface DropProps {
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/** Everything the week and the day view share: the data, what is being dragged and the changes. */
export interface Planner {
  roster: RosterShift[];
  /** One entry per person, by name. */
  persons: Volunteer[];
  person: (name: string) => Volunteer | undefined;
  /** First name, or the full name when two people share a first name. */
  shortName: (name: string) => string;
  lanesOn: (date: string) => Lane[];
  drag: Drag | null;
  /** Key of the drop target under the pointer. */
  over: string | null;
  startDrag: (e: DragEvent, drag: Drag) => void;
  endDrag: () => void;
  /** Props that make an element a drop target. */
  target: (key: string, onDrop: (drag: Drag) => void) => DropProps;
  /** Put what is dragged on this shift: plans a person, or moves a planned shift. */
  dropOn: (lane: Lane, drag: Drag) => void;
  assign: (name: string, lane: Lane) => void;
  save: (shift: RosterShiftInput) => void;
  remove: (id: string) => void;
  setNeeded: (entries: NeededInput[]) => void;
  openPerson: (name: string) => void;
}
