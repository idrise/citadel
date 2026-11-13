import { createEliminationBursts } from "./elimination-burst";
import type { Group } from "three";
import type { GameEvent, MatchState } from "../simulation/types";
import { createImpactFeedback } from "./impact-feedback";
import { createFractureBursts } from "./fracture-burst";
import { createReturnFlourishes } from "./return-flourish";

/** Presentation-only, pooled effects. Simulation and serve timing continue independently. */
export function createEffects(root: Group) {
  const impacts = createImpactFeedback(root);
  const eliminations = createEliminationBursts(root);
  const bursts = createFractureBursts(root),
    returns = createReturnFlourishes(root);
  return {
    reset() {
      impacts.reset();
      eliminations.reset();
      bursts.reset();
      returns.reset();
    },
    emit(event: GameEvent, reduced: boolean, shards = 10, sparks = 6, state?: MatchState) {
      if (event.type !== "elimination") impacts.emit(event, reduced, sparks, state);
      eliminations.emit(event);
      bursts.emit(event, reduced, shards);
      returns.emit(event);
    },
    update(dt: number, reduced: boolean, state: MatchState, shards = 10, sparks = 6) {
      impacts.update(dt, reduced, sparks);
      eliminations.update(dt, reduced, shards);
      bursts.update(dt, reduced, shards);
      returns.update(dt, reduced, state);
    },
  };
}
