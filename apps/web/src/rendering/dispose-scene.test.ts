import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
} from "three";
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

it("also releases geometry and materials owned by trajectory preview lines", () => {
  const geometry = new BoxGeometry();
  const material = new LineBasicMaterial();
  const geometryDisposal = vi.spyOn(geometry, "dispose");
  const materialDisposal = vi.spyOn(material, "dispose");
  disposeScene(new Line(geometry, material));
  expect(geometryDisposal).toHaveBeenCalledTimes(1);
  expect(materialDisposal).toHaveBeenCalledTimes(1);
});

it("releases instance buffers used by the dotted trajectory display", () => {
  const dots = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), 16);
  const dispose = vi.spyOn(dots, "dispose");
  disposeScene(dots);
  expect(dispose).toHaveBeenCalledOnce();
});
