import type { Group } from "three";
import type { GameEvent, MatchState } from "../simulation/types";
import { createImpactFeedback } from "./impact-feedback";
import { createFractureBursts } from "./fracture-burst";
import { createReturnFlourishes } from "./return-flourish";

/** Presentation-only, pooled effects. Simulation and serve timing continue independently. */
export function createEffects(root: Group) {
  const impacts = createImpactFeedback(root);
  const bursts = createFractureBursts(root),
    returns = createReturnFlourishes(root);
  return {
    emit(event: GameEvent, reduced: boolean, shards = 10, sparks = 6, state?: MatchState) {
      impacts.emit(event, reduced, sparks, state);
      bursts.emit(event, reduced, shards);
      returns.emit(event);
    },
    update(dt: number, reduced: boolean, state: MatchState, shards = 10, sparks = 6) {
      impacts.update(dt, reduced, sparks);
      bursts.update(dt, reduced, shards);
      returns.update(dt, reduced, state);
    },
  };
}
