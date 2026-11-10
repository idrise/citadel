import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { expect, it, vi } from "vite-plus/test";
import { disposeScene } from "./dispose-scene";

it("releases shared GPU resources once, including nested meshes and material arrays", () => {
  const geometry = new BoxGeometry();
  const first = new MeshBasicMaterial();
  const second = new MeshBasicMaterial();
  const disposeGeometry = vi.spyOn(geometry, "dispose");
  const disposeFirst = vi.spyOn(first, "dispose");
  const disposeSecond = vi.spyOn(second, "dispose");
  const scene = new Group();
  const nested = new Group();
  nested.add(new Mesh(geometry, [first, second]));
  scene.add(new Mesh(geometry, first), nested);

  disposeScene(scene);

  expect(disposeGeometry).toHaveBeenCalledTimes(1);
  expect(disposeFirst).toHaveBeenCalledTimes(1);
  expect(disposeSecond).toHaveBeenCalledTimes(1);
});
