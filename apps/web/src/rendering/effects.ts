import type { Group } from "three";
import type { GameEvent, MatchState } from "../simulation/types";
import { createFractureBursts } from "./fracture-burst";
import { createReturnFlourishes } from "./return-flourish";

/** Presentation-only, pooled effects. Simulation and serve timing continue independently. */
export function createEffects(root: Group) {
  const bursts = createFractureBursts(root),
    returns = createReturnFlourishes(root);
  return {
    emit(event: GameEvent, reduced: boolean) {
      bursts.emit(event, reduced);
      returns.emit(event);
    },
    update(dt: number, reduced: boolean, state: MatchState) {
      bursts.update(dt, reduced);
      returns.update(dt, reduced, state);
    },
  };
}
